import {readFileSync,existsSync} from 'node:fs';
const required = [
  'package.json','rollup.config.js','svelte.config.js','tsconfig.json',
  'src/plugin.svelte','src/pluginConfig.ts','src/navdb.ts','src/navdataConfig.ts',
  'src/flightAltitude.ts','src/routePlanner.ts','src/plannerPointNames.ts',
  'src/weather.ts','src/xplane.ts','src/offlineReport.ts',
  'tools/check-plugin-deps.mjs','tools/check-plugin-exports.mjs',
  'tools/build_navdata.py','tools/sync_gdrive_navdata.py','tools/verify-release.mjs',
  '.github/workflows/publish-plugin.yml','.github/workflows/build-navdata.yml',
  '.github/workflows/sync-gdrive-navdata.yml',
  'public/index.html','public/navdata/.gitkeep','navdata-input/README.md',
  'tests/test_release_v085.mjs','tests/test_navdata_converter.py',
  'INSTALL-v0.8.5-iPad.md','AUDIT-v0.8.5.md',
];
const missing=required.filter(path=>!existsSync(path));
if(missing.length)throw Error('Missing complete release files: '+missing.join(', '));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const config=readFileSync('src/pluginConfig.ts','utf8');
const match=config.match(/version:\s*['"]([^'"]+)['"]/);
if(pkg.version!==match?.[1])throw Error(`Version mismatch: package ${pkg.version} / plugin ${match?.[1]}`);
const ui=readFileSync('src/plugin.svelte','utf8');
for(const module of ['flightAltitude','plannerPointNames','routePlanner','offlineReport','weather','navdb'])
 if(!ui.includes(`'./${module}'`))throw Error(`Missing import ${module} from plugin.svelte`);
console.log(`PASS: ${required.length} core files found, version ${pkg.version} matches, plugin imports present`);
