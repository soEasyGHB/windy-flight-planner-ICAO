#!/usr/bin/env node
// Check that every relative src import points to a file in the current checkout.
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('src');
if (!fs.existsSync(src)) {
  console.error('Не найдена папка src: запусти проверку из корня проекта.');
  process.exit(2);
}
const files = fs.readdirSync(src, {recursive:true}).filter(file=>/\.(?:ts|js|svelte)$/.test(file));
const missing = [];
for (const file of files) {
  const filename = path.join(src, file);
  if (!fs.statSync(filename).isFile()) continue;
  const content = fs.readFileSync(filename, 'utf8');
  const imports = content.matchAll(/\b(?:from\s*|import\s*\(|import\s*)["'](\.[^"']+)["']/g);
  for (const [,spec] of imports) {
    const resolved = path.resolve(path.dirname(filename), spec);
    const variants = [resolved, ...['.ts','.js','.svelte','.json','.css'].map(ext=>resolved+ext),
      ...['index.ts','index.js','index.svelte'].map(name=>path.join(resolved,name))];
    if (!variants.some(p=>fs.existsSync(p))) missing.push(`${path.relative('.',filename)} -> ${spec}`);
  }
}
if (missing.length) {
  console.error('Отсутствуют модули:\n' + missing.map(s=>'  '+s).join('\n'));
  process.exit(1);
}
console.log(`OK: проверено ${files.length} исходных файлов, отсутствующих локальных импортов не найдено.`);
