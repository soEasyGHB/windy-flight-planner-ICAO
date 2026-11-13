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
assert(main.includes('on:input={departureInputChanged} on:change={departureInputChanged}'), 'Capture both date/time events');
assert(src.includes('width:170px;max-width:100%;margin:0 auto 11px'), 'Center narrow UTC input column');
assert(src.includes('prepareGpxPayload(parsed,{departureUtc,routeText})'), 'GPX must contain departure UTC');
assert(main.includes('on:click={sharePlannerGpx}>Скачать GPX</button>'),'Share GPX renamed to download');
assert(!main.includes('on:click={openNativePlanner}'),'Empty native planner button removed');
assert(!src.includes('function openNativePlanner()'),'Unused planner method removed');
assert.equal((main.match(/<button\b/g)||[]).length,4,'Route/clear, GPX, and hourly URL only');
assert(main.includes('href={windyPlannerUrl} target="_blank"'), 'User-tested URL must be a regular anchor for iPad support');
assert(main.includes('on:click={generateWindyPlannerLink}'), 'Explicit hourly link generation');
assert(!main.includes('openExperimentalNativePlanner'),'Experimental control removed');
assert(main.includes('on:click={checkGeneratedLinkFreshness}'), 'An uncommitted iPad time change must block a stale link without mutating href');
assert(main.includes('id="fr-windy-generated-url"'), 'Visible URL for manual Safari verification');
assert(!main.includes('copyWindyPlannerLink')&&!src.includes('function copyWindyPlannerLink'), 'Remove Copy URL button and handler');
assert(main.includes('>Открыть планировщик</a>')); 
assert(main.includes('{#if windyPlannerUrl}'), 'Do not expose a stale link before manual generation');
assert(src.includes('buildWindyPlannerUrl(parsed,requestedUtc)'));
assert(!src.includes("bcast.emit('rqstOpen','rplanner',handoff.params)"),'Experimental handoff removed');
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
assert(src.includes('height:34px;min-height:34px;padding:0 6px;text-align:center;vertical-align:middle'),'Center the native UTC input contents vertically');
assert(src.includes('::-webkit-datetime-edit-fields-wrapper') && src.includes('display:flex;height:100%;align-items:center;justify-content:center'),'Center Safari date/time text vertically');
assert(src.includes('font-size:12px;line-height:14px;margin-bottom:2px'),'Compact date/time labels');
assert(main.includes('>Открыть планировщик</a>'),'Working Windy URL integration intact');
assert(!src.includes('anchor.href=link.url'), 'Never modify href in the click event');
assert(src.includes("document.getElementById('fr-etd-time')"), 'Generate from live input value');
assert(src.includes('const link=buildWindyPlannerUrl(parsed,requestedUtc)'), 'Build nearest-hour URL on click');
assert(src.includes("windyPlannerNote='Ссылка сформирована'"), 'Success status must be concise');
assert(src.includes("windyPlannerNote='Ссылка не сформирована'"), 'Failure status must be concise');
assert(!main.includes('В URL Windy:'), 'Remove verbose UTC time comparison from preview');
assert(!main.includes('Готовая ссылка (можно проверить или скопировать)'), 'Remove verbose link caption');
assert(main.includes('aria-label="Ссылка Windy"'), 'Generated URL input remains accessible');
assert(!main.includes('3-часового слота'), 'Remove slot warning from preview');
assert(main.includes('>Сформировать план</button>'),'Renamed plan action');
assert(!src.includes('nativePlannerHandoff')&&!src.includes('experimentBusy')&&!src.includes('experimentNote'),'Experiment implementation removed');
assert(src.includes('::-webkit-calendar-picker-indicator'),'Keep Safari picker indicator aligned');
assert(main.includes('>Маршрут из OFP</label>'),'Route input renamed');
assert(!main.includes('Маршрут OFP / ICAO'),'Old OFP label removed');
assert(settings.includes("'Проверить базу данных'"),'Exactly one database button');
assert(!settings.includes('Синхронизация Google Drive')&&!settings.includes('Загрузить базу через GitHub'),'Two deprecated database UI buttons removed');
assert.equal((settings.match(/<button\b/g)||[]).length,1,'Settings only contain one navdata button');
assert(settings.includes('Проверить базу данных'),'Database-check button retained');
for(const file of ['earth_fix.dat','earth_nav.dat','earth_awy.dat','navdata.zip','Windy-NAVDATA','https://drive.google.com/drive/folders/14eS_Ir19Uv7FPc2cVZWBR6_yKBvGTu5C'])
 assert(settings.includes(file),`AIRAC instructions missing: ${file}`);
assert(!/X-Plane|X.PLANE|\bGitHub\b|Гитхаб|github\.com|navdata-input\/|Custom Data\//.test(settings), 'User-facing navigation settings must not mention technical source systems');
assert(!src.includes('function openSyncWorkflow()')&&!src.includes('function openGitHubUpload()'),'Unused UI handlers removed');
console.log('PASS: one URL plan method, no exact-time experiment, GPX, centered compact layout');
