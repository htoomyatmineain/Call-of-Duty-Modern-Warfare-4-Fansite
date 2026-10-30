import { readFile, writeFile } from 'node:fs/promises';
import { Matrix4, Vector3, Quaternion, Box3 } from '../vendor/three.module.js';

// Extract this uncompressed GLB's geometry at build time. The browser bundle embeds
// the result so file:// pages need neither fetch nor external texture requests.
export async function prepareF35(root) {
  const file = await readFile(new URL('assets/f35.glb', root));
  if (file.readUInt32LE(0) !== 0x46546c67 || file.readUInt32LE(4) !== 2) throw Error('Expected GLB v2');
  const jsonLength = file.readUInt32LE(12);
  const gltf = JSON.parse(file.toString('utf8', 20, 20 + jsonLength));
  if (gltf.extensionsRequired?.length) throw Error('Unsupported compressed model extensions');
  const binary = file.subarray(28 + jsonLength);
  function accessor(id) {
    const a = gltf.accessors[id], view = gltf.bufferViews[a.bufferView];
    if (a.sparse || view.buffer !== 0 || a.normalized) throw Error('Unsupported accessor');
    const types = { 5121: ['readUInt8', 1], 5123: ['readUInt16LE', 2], 5125: ['readUInt32LE', 4], 5126: ['readFloatLE', 4] };
    const [read, size] = types[a.componentType] || [];
    if (!read) throw Error('Unsupported component type');
    const components = { SCALAR: 1, VEC3: 3 }[a.type];
    if (!components) throw Error('Unsupported accessor shape');
    const start = (view.byteOffset || 0) + (a.byteOffset || 0);
    const stride = view.byteStride || components * size;
    return Array.from({ length: a.count }, (_, i) => Array.from({ length: components }, (_, c) => binary[read](start + i * stride + c * size)));
  }
  const positions = [], indices = [];
  let meshCount = 0;
  const orient = new Matrix4().makeRotationY(Math.PI / 2);
  function visit(id, parent) {
    const node = gltf.nodes[id];
    // This asset contains both gear states; use the closed landing-bay variant.
    if (/landingOn/i.test(node.name || '')) return;
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(new Vector3().fromArray(node.translation || [0, 0, 0]), new Quaternion().fromArray(node.rotation || [0, 0, 0, 1]), new Vector3().fromArray(node.scale || [1, 1, 1]));
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        if ((primitive.mode ?? 4) !== 4) throw Error('Expected triangle primitive');
        const vertices = accessor(primitive.attributes.POSITION);
        const offset = positions.length / 3;
        const transform = orient.clone().multiply(world);
        for (const point of vertices) positions.push(...new Vector3().fromArray(point).applyMatrix4(transform).toArray());
        const triangles = primitive.indices === undefined ? vertices.map((_, i) => [i]) : accessor(primitive.indices);
        for (const [index] of triangles) {
          if (index >= vertices.length) throw Error('Model index out of bounds');
          indices.push(offset + index);
        }
        meshCount++;
      }
    }
    for (const child of node.children || []) visit(child, world);
  }
  for (const node of gltf.scenes[gltf.scene || 0].nodes) visit(node, new Matrix4());
  const bounds = new Box3();
  for (let i = 0; i < positions.length; i += 3) bounds.expandByPoint(new Vector3().fromArray(positions, i));
  const center = bounds.getCenter(new Vector3());
  const scale = 8 / Math.max(...bounds.getSize(new Vector3()).toArray());
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - center.x) * scale;
    positions[i + 1] = (positions[i + 1] - center.y) * scale;
    positions[i + 2] = (positions[i + 2] - center.z) * scale;
  }
  if (!positions.length || positions.some(p => !Number.isFinite(p))) throw Error('Invalid aircraft geometry');
  const output = Buffer.alloc(8 + positions.length * 4 + indices.length * 4);
  output.writeUInt32LE(positions.length / 3, 0);
  output.writeUInt32LE(indices.length, 4);
  positions.forEach((value, i) => output.writeFloatLE(value, 8 + i * 4));
  indices.forEach((value, i) => output.writeUInt32LE(value, 8 + positions.length * 4 + i * 4));
  await writeFile(new URL('assets/f35-geometry.bin', root), output);
  console.log(`Prepared F-35: ${meshCount} parts, ${indices.length / 3} triangles, ${(output.length / 1024).toFixed(0)} KB geometry`);
}
