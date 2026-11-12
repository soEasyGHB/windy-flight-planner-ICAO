import {existsSync,readFileSync,statSync} from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const source=readFileSync('src/pluginConfig.ts','utf8');
const version=source.match(/\bversion\s*:\s*['"]([^'"]+)['"]/)?.[1];
if(version!==pkg.version)throw Error(`Version mismatch: package ${pkg.version}, config ${version??'missing'}`);
if(!existsSync('dist/plugin.json'))throw Error('dist/plugin.json missing: run npm run build first');
const manifest=JSON.parse(readFileSync('dist/plugin.json','utf8'));
if(manifest.version!==pkg.version)throw Error(`Stale manifest: dist/plugin.json is ${manifest.version}, package.json is ${pkg.version}`);
for(const path of ['dist/plugin.js','dist/plugin.min.js'])
  if(!existsSync(path)||statSync(path).size<1024)throw Error(`${path} missing or unexpectedly small`);
console.log(`PASS: ready to publish version ${version}; build artifacts present`);
