import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file = readFileSync(new URL('../src/plugin.svelte', import.meta.url),'utf8');
const config = readFileSync(new URL('../src/pluginConfig.ts', import.meta.url),'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url),'utf8'));
const markup = file.split('<script lang="ts">')[0];
const start = markup.indexOf('<div class="fr-main-stack">');
const end = markup.indexOf('<details class="fr-settings">');
assert(start !== -1 && end > start, 'Main/settings separators are missing');
const main = markup.slice(start,end);
const settings = markup.slice(end,markup.indexOf('</section>',end));
const blocks = ['1. Ввод маршрута', '2. Данные полёта', '3. Слой погоды', '4. Планировщик и экспорт'];
assert.equal((main.match(/class="fr-main-card"/g)||[]).length,4);
let last = -1;
for (const b of blocks) {let i=main.indexOf(b);assert(i>last,`Block missing or not in order: ${b}`);last=i;}
for (const forbidden of ['class="warning"', 'class="info"', 'class="small"', 'class="disclaimer"', 'role="alert"','class="stats"']) {
 assert(!main.includes(forbidden),`Main pane has extra notices: ${forbidden}`);
}
assert(!main.includes('<p '),'Only four actionable blocks should be on the main pane');
for (const label of ['Сообщения, ошибки и ограничения','ETA по точкам','Диагностика маршрута','Модель, эшелон и время Windy','Офлайн-отчёт и снимок карты','Прогноз и таблицы FL300–FL400','Навигационная база данных']) assert(settings.includes(label),`Missing settings spoiler: ${label}`);
assert(markup.includes('<details class="fr-settings">'));
assert(!markup.includes('<details class="fr-settings" open'));
assert.equal((markup.match(/class="fr-settings-group"/g)||[]).length,7);
for(const snippet of ['{status}', '{altitudeStatus}', '{offlineStatus}', 'class="disclaimer"','class="warning"','timeWaypoints as wp','on:click={() => selectRouteWaypoint(i)}','id="fr-report-shot"']) {
  assert(settings.includes(snippet),`Hidden status/control missing: ${snippet}`);
  assert(!main.includes(snippet),`Hidden status/control leaked into main: ${snippet}`);
}
for(const handler of ['runRoute','clearRoute','setWeatherLayer','openNativeRoutePlanner','downloadPlannerGpx','saveOfflineHtml','openOfflinePrint','openWeatherProfile']) assert(main.includes('on:click={'+handler+'}'),`Handler lost: ${handler}`);
for(const bind of ['routeText','etdDate','etdTime','fl','tas','overlay']) assert(main.includes('bind:value={'+bind+'}'),`Binding lost: ${bind}`);
assert.equal(pkg.version,'0.8.2');
assert(config.includes("version: '0.8.2'"));
console.log('PASS: four compact blocks, warnings and logs hidden, seven collapsed settings groups, actions and inputs preserved, version 0.8.2');
