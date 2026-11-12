import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const src=readFileSync('src/plugin.svelte','utf8');
const markup=src.split('<script lang="ts">')[0];
const main=markup.split('<details class="fr-settings">')[0];
const settings=markup.split('<details class="fr-settings">')[1];
assert.equal((main.match(/class="fr-card"/g)||[]).length,2,'Only route and GPX cards on home');
assert(main.includes('id="fr-section-route"'));
assert(main.includes('id="fr-section-export"'));
assert(main.includes('class="fr-etd-stack"'), 'Stacked centered UTC inputs');
assert(main.includes('id="fr-etd-date" type="date" bind:value={etdDate}'));
assert(main.includes('id="fr-etd-time" type="time" step="60" bind:value={etdTime}'));
assert(main.includes('on:change={departureInputChanged}'));
assert(src.includes('margin:0 auto 11px'), 'Center compact UTC input column');
assert(src.includes('prepareGpxPayload(parsed,{departureUtc,routeText})'), 'GPX must contain departure UTC');
assert(main.includes('on:click={sharePlannerGpx}>Скачать GPX</button>'),'Share GPX renamed to download');
assert(!main.includes('on:click={openNativePlanner}'),'Empty native planner button removed');
assert(!src.includes('function openNativePlanner()'),'Unused planner method removed');
assert(!src.includes("from '@windy/store'"),'Unused Windy store import removed');
assert.equal((main.match(/<button\b/g)||[]).length,4,'Route/clear, share GPX, disabled URL placeholder');
assert(main.includes('href={windyPlannerUrl} target="_blank"'), 'User-tested URL must be a regular anchor for iPad support');
assert(main.includes('on:click={noteWindyPlannerOpen}>Открыть маршрут с UTC в Windy</a>'));
assert(main.includes('<button type="button" class="fr-force-handoff" disabled>Открыть маршрут с UTC в Windy</button>'), 'No action until route has two confirmed points');
assert(src.includes('buildWindyPlannerUrl(parsed,departureUtc)'));
assert(!src.includes("bcast.emit('rqstOpen','rplanner',handoff.params)"), 'Do not call failed internal route handoff');
assert(!main.includes('download={gpxFileName}'),'No third GPX download link');
assert(!main.includes('disabled={busy}'),'GPX independent from database fetch');
assert(!main.includes('Частичный GPX готов'),'GPX status must not appear on home');
assert(!main.includes('gpxFeedback}'),'Move GPX status under diagnostic settings');
assert(settings.includes('class:fr-warning={gpxIsPartial}'),'GPX status in diagnostics');
assert.equal((settings.match(/class="fr-settings-group"/g)||[]).length,2,'Only database and warning settings');
assert(settings.includes('Навигационные базы данных'));
assert(settings.includes('Ошибки и предупреждения'));
assert(settings.includes('bind:checked={showDiagnostics}'));
assert(settings.includes('routeIssues(parsed)'));
for(const forbidden of [
 'fr-section-weather','fr-section-our-planner','fr-profile-panel',
 'Сохранить HTML','Открыть для PDF','Открыть маршрут в штатном планировщике Windy',
 'Получить профиль','Open-Meteo','Выбор слоя погоды','CSV отчёт','fr-report-shot',
 'showReportWeatherLayer','openWeatherProfile','loadWeather(','weatherFL','profileViz',
 'Windy Point Forecast','WINDY_POINT_FORECAST_KEY','setWeatherLayer','openNativeRoutePlanner'
])assert(!src.includes(forbidden),`Removed feature must not appear: ${forbidden}`);
for(const filename of readdirSync('src'))
 assert(!/^(?:offlineReport|weather|profileChart|tropopause|flightAltitude|windyDistanceLink|plannerPointNames|routePlanner)\.(?:ts|js)$/.test(filename),`Removed code found: ${filename}`);
assert(src.indexOf('prepareGpxDownload();',src.indexOf('function runRoute()')) < src.indexOf('new L.Polyline',src.indexOf('function runRoute()')),
 'GPX must not depend on map drawing');
assert(src.includes('clearGpxDownload();clearMap();'),'Revoke temporary GPX on destroy');
assert(!src.includes("store.set('overlay'"),'Do not modify Windy weather overlay');
assert(!src.includes('buildWindyPlannerRequest'),'Legacy route forwarding helper stays removed');
assert(main.includes('rows="8"'),'Route textarea doubled to 8 rows');
assert(src.includes('min-height:172px'),'Route textarea doubled in minimum height');
assert(src.includes('height:28px;min-height:28px;padding:2px 8px'),'Compact date/time controls');
assert(src.includes('font-size:12px;line-height:14px;margin-bottom:2px'),'Compact date/time labels');
assert(main.includes('on:click={noteWindyPlannerOpen}>Открыть маршрут с UTC в Windy</a>'),'Working Windy URL integration intact');
console.log('PASS: compact UTC inputs, taller route field, GPX + working IFR URL, no empty planner button');
