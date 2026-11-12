import fs from 'node:fs';
import path from 'node:path';

const base = path.resolve('src');
const entries = ['plugin.svelte'];
const scanned = new Set();
const missing = [];
const extensions = ['', '.ts', '.js', '.svelte', '.json', '/index.ts', '/index.js'];
const importPattern = /(?:\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?|\bexport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+))['"](\.[^'"]+)['"]/g;
function resolveImport(from, request) {
  const candidate = path.resolve(path.dirname(from), request);
  return extensions.map(ext => candidate + ext).find(file => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
}
while (entries.length) {
  const name = entries.shift();
  const file = path.resolve(base, name);
  if (scanned.has(file) || !fs.existsSync(file)) continue;
  scanned.add(file);
  const content = fs.readFileSync(file, 'utf8');
  // Evaluate import/export statements on a per-line basis; Svelte components often contain
  // multiline import blocks so capture the completed statement up to a semicolon.
  const statements = content.match(/(?:import|export)\s+(?:type\s+)?[\s\S]*?;/g) ?? [];
  for (const statement of statements) {
    const match = statement.match(/\bfrom\s*['"](\.[^'"]+)['"]|\bimport\s*['"](\.[^'"]+)['"]/);
    if (!match) continue;
    const request = match[1] ?? match[2];
    const target = resolveImport(file, request);
    if (!target) missing.push(`${path.relative(process.cwd(), file)} → ${request}`);
    else if (target.startsWith(base + path.sep) && /\.(ts|js|svelte)$/.test(target)) entries.push(path.relative(base, target));
  }
}
if (missing.length) {
  console.error('Отсутствуют локальные модули:');
  for (const item of missing) console.error(`  ${item}`);
  process.exit(1);
}
console.log(`PASS: локальные импорты разрешаются (${scanned.size} файлов проверено).`);
