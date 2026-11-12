import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const rollup=readFileSync('rollup.config.js','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const workflow=readFileSync('.github/workflows/publish-plugin.yml','utf8');
const entry=readFileSync('src/plugin.svelte','utf8');
const extensions=rollup.match(/resolve\(\{[^}]*extensions:\[([^\]]+)\]/)?.[1]??'';
for(const extension of ["'.js'","'.ts'","'.svelte'"])
  assert(extensions.includes(extension),`Rollup missing ${extension}`);
assert(pkg.scripts.build.includes('SERVE=false rollup -c'),'Real Rollup compilation must run');
assert(pkg.scripts.build.includes('cp package.json dist/package.json'),'dist/package.json must be included');
assert(workflow.includes('npm run build')&&workflow.includes('npm run verify:release'),'Publish workflow must verify artifacts');
assert(workflow.indexOf('npm run verify:release')<workflow.indexOf('Publish private Windy plugin'),'Build verification must precede publishing');
assert(entry.includes("import {prepareGpxPayload,createGpxHref,makeGpxShareFile,triggerGpxDownload} from './gpxDownload'"),'GPX entrypoint must be present');
assert(!/loadWeather|Open-Meteo|offlineReport|saveOfflineHtml|openOfflinePrint|WINDY_POINT_FORECAST_KEY/.test(entry),'Deprecated weather/offline feature still present');
assert(pkg.scripts.test.includes('npm run check:startup'),'Must test component startup');
console.log('PASS: Rollup, release gate, GPX entrypoint and streamlined feature scope');
