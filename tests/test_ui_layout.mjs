import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const plugin=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
const report=readFileSync(new URL('../src/offlineReport.ts',import.meta.url),'utf8');
const config=readFileSync(new URL('../src/pluginConfig.ts',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const markup=plugin.split('<script lang="ts">')[0];
const indices=['1. Ввод маршрута','2. Данные полёта','3. Слой погоды','4. Планировщик и экспорт']
  .map(label=>markup.indexOf(label));
assert(indices.every(x=>x>=0),'Missing a main section');
assert(indices.every((x,i)=>i===0||x>indices[i-1]),'Sections in wrong order');
assert.equal((markup.match(/class="fr-main-card"/g)||[]).length,4);
assert(markup.includes('<details class="fr-settings">'),'Settings should start folded');
assert(!markup.includes('<details class="fr-settings" open'),'Settings must not be open by default');
const main=markup.slice(markup.indexOf('<div class="fr-main-stack">'),markup.indexOf('  <details class="fr-settings">'));
const settings=markup.slice(markup.indexOf('<details class="fr-settings">'));
for(const handler of ['runRoute','clearRoute','openNativeRoutePlanner','downloadPlannerGpx','saveOfflineHtml','openOfflinePrint','openWeatherProfile']){
  assert(main.includes('on:click={'+handler+'}'),`${handler} not wired in main blocks`);
  assert(plugin.includes('function '+handler+'(')||plugin.includes('const '+handler+'='),`${handler} function missing`);
}
for(const section of ['Диагностика маршрута','Прогноз по маршруту и высотам','Навигационная база данных — Google Drive → GitHub'])
  assert(settings.includes(section),`Hidden settings omitted: ${section}`);
for(const ident of ['fr-route-input','fr-etd-date','fr-etd-time','fr-flight-level','fr-tas','fr-overlay','fr-report-shot'])
  assert.equal((markup.match(new RegExp(`id="${ident}"`,'g'))||[]).length,1,`ID duplicated: ${ident}`);
for(const overlay of ['thunder','rain','turbulence','radar']){
  assert(main.includes(`value="${overlay}"`),`Missing requested weather overlay ${overlay}`);
  assert(report.includes(`${overlay}:`),`Missing report overlay label ${overlay}`);
}
assert(markup.includes('bind:value={tas}'),'TAS field missing');
assert(plugin.includes('let tas=450'),'Default TAS changed');
assert(report.includes('const kind=labels[opt.overlay]'),'Report must use selected layer');
assert(plugin.includes('overlay:overlay as WeatherOverlayName'),'Offline report not synchronized with selected layer');
assert.equal(pkg.version,'0.8.1');
assert(config.includes("version: '0.8.1'"));
console.log('OK: 4 blocks, collapsed settings, preserved handlers, weather choices, default TAS 450, report layer, version 0.8.1');
