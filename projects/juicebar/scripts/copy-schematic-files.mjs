// Copies the non-TypeScript schematic files (collection.json, schema.json, and package.json, which keeps
// the compiled CommonJS schematics CommonJS inside the "type": "module" package) next to the compiled schematics.
import { cpSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(projectRoot, 'schematics');
const target = join(projectRoot, '../../dist/juicebar/schematics');

for (const file of walk(source)) {
  if (file.endsWith('.json')) {
    cpSync(file, join(target, relative(source, file)));
  }
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
