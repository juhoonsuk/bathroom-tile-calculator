import { mkdir, copyFile } from 'node:fs/promises';

await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
await copyFile(
  new URL('./outputs/tile-calculator.html', import.meta.url),
  new URL('./dist/index.html', import.meta.url)
);
await copyFile(
  new URL('./outputs/tile-visualization.js', import.meta.url),
  new URL('./dist/tile-visualization.js', import.meta.url)
);
console.log('Built dist/index.html and tile-visualization.js');
