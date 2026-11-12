import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const required=[
  'package.json','rollup.config.js','svelte.config.js','tsconfig.json',
  'src/plugin.svelte','src/pluginConfig.ts','src/navdataConfig.ts','src/navdb.ts',
  'src/xplane.ts','src/routeGpx.ts','src/gpxDownload.ts','src/windyPlannerUrl.ts',
  'tools/check-plugin-deps.mjs','tools/check-plugin-exports.mjs',
  'tools/check-plugin-startup.mjs','tools/check-build-config.mjs','tools/verify-release.mjs',
  'tools/build_navdata.py','tools/sync_gdrive_navdata.py','tools/convert_icao_gpkg.py','tools/clean-legacy.mjs',
  '.github/workflows/publish-plugin.yml','.github/workflows/build-navdata.yml',
  '.github/workflows/sync-gdrive-navdata.yml',
  'public/index.html','public/navdata/.gitkeep','navdata-input/README.md',
  'tests/test.mjs','tests/test_xplane.mjs','tests/test_github_snapshot.mjs',
  'tests/test_route_gpx.mjs','tests/test_gpx_download.mjs','tests/test_windy_planner_url.mjs','tests/test_simplified_ui.mjs',
  'tests/test_navdata_converter.py','INSTALL-v1.0.3.md','AUDIT-v1.0.3.md','README.md'
];
for(const filename of required)assert(existsSync(filename),`Required release file missing: ${filename}`);
const obsolete=[
  'src/offlineReport.ts','src/weather.ts','src/tropopause.ts','src/flightAltitude.ts',
  'src/profileChart.ts','src/windyDistanceLink.ts','src/plannerPointNames.ts','src/routePlanner.ts',
  'src/windyWeather.ts','src/nativePlannerHandoff.ts','tests/test_native_planner_handoff.mjs','vercel.json','api/windy-forecast.js'
];
for(const filename of obsolete)assert(!existsSync(filename),`Deprecated feature/source must be removed: ${filename}`);
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const config=readFileSync('src/pluginConfig.ts','utf8');
assert.equal(config.match(/version:\s*['"]([^'"]+)/)?.[1],pkg.version,'Plugin version mismatch');
const source=readFileSync('src/plugin.svelte','utf8');
for(const module of ['navdb','navdataConfig','routeGpx','gpxDownload','pluginConfig'])
  assert(source.includes(`'./${module}'`),`Plugin must import ${module}`);
console.log(`PASS: ${required.length} required files, ${obsolete.length} obsolete modules absent; version ${pkg.version}`);
