import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });

for (const file of ['homePage.css', 'homePage.js', 'homePage.html', 'images']) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}

// Retain the original page URL while also serving the homepage at /.
const homepage = await readFile(path.join(root, 'homePage.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), homepage.replaceAll('href="homePage.html"', 'href="./"'));
console.log('Built static website in dist/');
