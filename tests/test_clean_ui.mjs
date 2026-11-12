import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
const markup=file.split('<script lang="ts">')[0];
const start=markup.indexOf('<div class="fr-main-stack">'),end=markup.indexOf('<details class="fr-settings">');
assert(start>=0&&end>start);
const main=markup.slice(start,end),settings=markup.slice(end);
assert.equal((main.match(/class="fr-main-card fr-main-card--light/g)||[]).length,5);
for(const forbidden of ['class="warning"','class="info"','class="small"','class="disclaimer"','role="alert"','class="stats"'])
 assert(!main.includes(forbidden),`Unexpected message in main: ${forbidden}`);
assert(!main.includes('<p '),'Main should contain five action cards');
for(const label of ['Сообщения, ошибки и ограничения','ETA по точкам','Диагностика маршрута','Модель карты и время Windy','Источник данных Windy Point Forecast','Офлайн-отчёт и снимок карты','Прогноз и таблицы FL300–FL400','Дополнительные действия','Навигационная база данных'])
 assert(settings.includes(label),`Missing settings spoiler: ${label}`);
assert.equal((markup.match(/class="fr-settings-group"/g)||[]).length,9);
assert(!markup.includes('<details class="fr-settings" open'));
for(const snippet of ['{status}','{altitudeStatus}','{offlineStatus}','class="disclaimer"','class="warning"','timeWaypoints as wp','on:click={() => selectRouteWaypoint(i)}','id="fr-report-shot"']){
 assert(settings.includes(snippet),`Missing hidden status: ${snippet}`);
 assert(!main.includes(snippet),`Status leaked into main: ${snippet}`);
}
for(const h of ['runRoute','clearRoute','openNativeRoutePlanner','downloadPlannerGpx'])assert(main.includes('on:click={'+h+'}'),`Main action missing: ${h}`);
for(const h of ['saveOfflineHtml','openOfflinePrint','openWeatherProfile'])assert(settings.includes('on:click={'+h+'}'),`Settings action missing: ${h}`);
assert(main.includes('on:click={openWeatherProfile}')); 
for(const b of ['routeText','etdDate','etdTime','overlay'])assert(main.includes('bind:value={'+b+'}'),`Binding missing: ${b}`);
assert(!main.includes('fr-flight-level') && !main.includes('fr-tas'),'No manual FL/TAS inputs');
console.log('PASS: five cards with our planner ahead of native Windy, no manual FL, hidden extras');
