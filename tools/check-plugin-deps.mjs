import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'src', 'plugin.svelte');
if (!fs.existsSync(source)) {
  console.error('ERROR: src/plugin.svelte not found. Run at the project root.');
  process.exit(1);
}
const content = fs.readFileSync(source, 'utf8');
const imports = [...content.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]|\bimport\s*['"](\.[^'"]+)['"]/g)]
  .map(m => m[1] ?? m[2]);
const missing = [];
for (const specifier of new Set(imports)) {
  const stem = path.resolve(path.dirname(source), specifier);
  if (![stem, `${stem}.ts`, `${stem}.js`, `${stem}.svelte`, `${stem}.mjs`, path.join(stem, 'index.ts'), path.join(stem, 'index.js')].some(fs.existsSync)) {
    missing.push(specifier);
  }
}
if (missing.length) {
  console.error('Missing plugin.svelte dependencies:\n' + missing.map(x => '  ' + x).join('\n'));
  process.exit(1);
}
console.log('OK: All local module paths imported by src/plugin.svelte exist.');
console.log('Note: Existence does not verify named exports; run npm run build.');
