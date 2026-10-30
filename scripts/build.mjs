import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { prepareF35 } from './prepare-f35.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
await prepareF35(new URL('../', import.meta.url));

// A classic-script bundle also runs when homePage.html is opened via file://.
await build({
  entryPoints: [path.join(root, 'f35-viewer.mjs')],
  outfile: path.join(root, 'f35-viewer.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'eof',
  loader: { '.bin': 'binary' },
});

for (const file of ['homePage.css', 'homePage.js', 'homePage.html', 'f35-viewer.js', 'vendor/THREE-LICENSE.txt', 'assets/F35-LICENSE.txt', 'images']) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}

// Retain the original page URL while also serving the homepage at /.
const homepage = await readFile(path.join(root, 'homePage.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), homepage.replaceAll('href="homePage.html"', 'href="./"'));
console.log('Built static website in dist/');
