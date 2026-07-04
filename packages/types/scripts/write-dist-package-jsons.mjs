// The repo root has no "type" field, so plain .js under dist/ would default to
// CommonJS. These markers pin each output tree to its actual module format.
import { writeFileSync } from 'node:fs';

writeFileSync(
  new URL('../dist/esm/package.json', import.meta.url),
  JSON.stringify({ type: 'module' }) + '\n',
);
writeFileSync(
  new URL('../dist/cjs/package.json', import.meta.url),
  JSON.stringify({ type: 'commonjs' }) + '\n',
);
