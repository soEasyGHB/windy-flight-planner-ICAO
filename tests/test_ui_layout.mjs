import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const plugin=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
const report=readFileSync(new URL('../src/offlineReport.ts',import.meta.url),'utf8');
const config=readFileSync(new URL('../src/pluginConfig.ts',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const markup=plugin.split('<script lang="ts">')[0];
const start=markup.indexOf('<div class="fr-main-stack">'),end=markup.indexOf('<details class="fr-settings">');
assert(start>=0 && end>start, 'Main/settings layout not found');
const main=markup.slice(start,end),settings=markup.slice(end);
const labels=['Ввод маршрута','Ввод времени вылета UTC','Выбор слоя погоды','Планировщик полёта'];
let last=-1;
for(const label of labels){const i=main.indexOf(`<h3 id=`); const at=main.indexOf(`>${label}</h3>`);assert(at>last,`Missing or reordered main card: ${label}`);last=at;}
assert.equal((main.match(/class="fr-main-card fr-main-card--light"/g)||[]).length,4);
assert(markup.includes('<details class="fr-settings">') && !markup.includes('<details class="fr-settings" open'));
for(const name of ['runRoute','clearRoute','openNativeRoutePlanner','downloadPlannerGpx']){
 assert(main.includes('on:click={'+name+'}'),`Main handler missing: ${name}`);
 assert(plugin.includes('function '+name+'(')||plugin.includes('const '+name+'='),`Function missing: ${name}`);
}
for(const name of ['saveOfflineHtml','openOfflinePrint','openWeatherProfile']){
 assert(settings.includes('on:click={'+name+'}'),`Settings handler missing: ${name}`);
 assert(!main.includes('on:click={'+name+'}'),`Extra action still on main pane: ${name}`);
}
for(const label of ['Диагностика маршрута','Прогноз и таблицы FL300–FL400','Навигационная база данных','Дополнительные действия'])
 assert(settings.includes(label),`Missing settings section: ${label}`);
for(const id of ['fr-route-input','fr-etd-date','fr-etd-time','fr-flight-level','fr-tas','fr-overlay','fr-report-shot'])
 assert.equal((markup.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`Duplicate/missing field: ${id}`);
const overlays=[...main.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(overlays,['thunder','rain','turbulence','radar']);
for(const layer of overlays)assert(report.includes(`${layer}:`),`Report layer missing: ${layer}`);
const inputs=['fr-etd-date','fr-etd-time','fr-flight-level','fr-tas'].map(id=>main.indexOf(`id="${id}"`));
assert(inputs.every((i,n)=>i>=0&&(n===0||i>inputs[n-1])),'Flight inputs must be vertical in order');
assert(main.includes('fr-param-stack') && plugin.includes('grid-template-columns:1fr;gap:10px'));
assert(plugin.includes('background:#bcbcbc') && plugin.includes('background:#d7d7d7'),'Grey Windy cards/fields missing');
assert(main.includes('bind:value={tas}') && plugin.includes('let tas=450'));
assert(report.includes('const kind=labels[opt.overlay]'));
assert(plugin.includes('overlay:overlay as WeatherOverlayName'));
assert.equal(config.match(/version:\s*'([^']+)'/)?.[1],pkg.version);
console.log(`PASS: four grey main cards, date/time stacked, 4 overlays, export actions and hidden settings, version ${pkg.version}`);
