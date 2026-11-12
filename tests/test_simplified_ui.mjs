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
assert(src.includes('margin:0 auto 15px'), 'Center UTC input column');
assert(src.includes('prepareGpxPayload(parsed,{departureUtc,routeText})'), 'GPX must contain departure UTC');
assert(main.includes('on:click={sharePlannerGpx}>Скачать GPX</button>'),'Share GPX renamed to download');
assert(main.includes('on:click={openNativePlanner}>Открыть штатный планировщик Windy</button>'),'Native planner button');
assert.equal((main.match(/<button\b/g)||[]).length,5,'Route/clear, share GPX, native planner and route/UTC handoff buttons');
assert(main.includes('on:click={sendRouteAndUtcToPlanner}>Передать маршрут и UTC в Windy</button>'));
assert(main.includes('disabled={!gpxXml || !parsed}'));
assert(src.includes('buildNativePlannerHandoff(parsed,departureIsoUtc(etdDate,etdTime))'));
assert(src.includes("bcast.emit('rqstOpen','rplanner',handoff.params)"));
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
assert(src.includes("store.set('timestamp',target)"),'Sync selected UTC with Windy forecast timestamp on opening');
assert(!src.includes("store.set('overlay'"),'Do not modify Windy weather overlay');
assert(src.includes("bcast.emit('rqstOpen','rplanner');"),'Open Windy planner with no extra arguments');
assert(!src.includes('buildWindyPlannerRequest'),'Legacy route forwarding helper stays removed');
console.log('PASS: centered stacked departure UTC fields, GPX + native planner + route/UTC handoff; exactly two settings, removed offline/weather/planners');
