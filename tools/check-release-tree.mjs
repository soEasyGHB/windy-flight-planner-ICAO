import {existsSync,readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const required=[
  'package.json','rollup.config.js','svelte.config.js','tsconfig.json','.gitignore','LICENSE',
  'src/plugin.svelte','src/pluginConfig.ts','src/navdataConfig.ts','src/navdb.ts',
  'src/xplane.ts','src/routeGpx.ts','src/gpxDownload.ts','src/windyPlannerUrl.ts','src/nativePlannerHandoff.ts',
  'tools/check-plugin-deps.mjs','tools/check-plugin-exports.mjs','tools/fix-generated-imports.mjs','tools/check-release-tree.mjs',
  'tools/check-plugin-startup.mjs','tools/check-build-config.mjs','tools/verify-release.mjs',
  'tools/build_navdata.py','tools/sync_gdrive_navdata.py','tools/convert_icao_gpkg.py','tools/clean-legacy.mjs',
  '.github/workflows/publish-plugin.yml','.github/workflows/build-navdata.yml',
  '.github/workflows/sync-gdrive-navdata.yml',
  'public/index.html','public/navdata/.gitkeep','navdata-input/README.md',
  'tests/test.mjs','tests/test_xplane.mjs','tests/test_github_snapshot.mjs',
  'tests/test_route_gpx.mjs','tests/test_gpx_download.mjs','tests/test_windy_planner_url.mjs','tests/test_native_planner_handoff.mjs','tests/test_simplified_ui.mjs',
  'tests/test_navdata_converter.py','tests/test_release_cleanup.mjs','INSTALL-v1.2.2.md','AUDIT-v1.2.2.md','README.md','НАВИГАЦИОННАЯ-БАЗА-iPad.md'
];
for(const file of required)assert(existsSync(file),`Required release file missing: ${file}`);
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const config=readFileSync('src/pluginConfig.ts','utf8');
assert.equal(pkg.version,'1.2.2','Release must publish version 1.2.2');
assert.equal(config.match(/version:\s*['"]([^'"]+)/)?.[1],pkg.version,'Plugin version mismatch');
const filesInCode=(p)=>readdirSync(p).filter(n=>!n.startsWith('.'));
for(const p of ['src','tests','tools']){
  const allowed=new Set(required.filter(f=>f.startsWith(p+'/')).map(f=>f.slice(p.length+1)));
  for(const filename of filesInCode(p)){
    if(p==='tests'&&filename==='generated')continue; // produced by tests, not shipped
    assert(allowed.has(filename),`Legacy/unapproved project file found: ${p}/${filename}`);
  }
}
for(const filename of readdirSync('.'))
  assert(!(/^(?:AUDIT|INSTALL)-v\d+\.\d+(?:\.\d+)?(?:-iPad)?\.md$/.test(filename)&&
    filename!=='AUDIT-v1.2.2.md'&&filename!=='INSTALL-v1.2.2.md'),`Old release document remains: ${filename}`);
assert(!existsSync('vercel.json'),'Legacy Vercel configuration remains');
assert(!existsSync('api'),'Legacy API directory remains');
const source=readFileSync('src/plugin.svelte','utf8');
for(const module of ['navdb','navdataConfig','routeGpx','gpxDownload','pluginConfig'])
  assert(source.includes(`'./${module}'`),`Plugin does not import ${module}`);
const url=readFileSync('src/windyPlannerUrl.ts','utf8');
assert(url.includes('https://www.windy.com/route-planner/ifr/'),'Verified route planner URL removed');
assert(source.includes('generateWindyPlannerLink'),'UTC link preparation missing');
assert(source.includes('checkGeneratedLinkFreshness'),'Stale UTC protection missing');
assert(source.includes('sharePlannerGpx'),'GPX export missing');
assert(!/WINDY_POINT_FORECAST_KEY|Open-Meteo|Сохранить HTML|Открыть для PDF/.test(source),'Obsolete weather/offline controls remain');
console.log(`PASS: ${required.length} required release files, clean code tree, confirmed Windy UTC URL, version ${pkg.version}`);
