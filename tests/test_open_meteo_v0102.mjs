import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadWeather,makeForecastUrl,OPEN_METEO_URL,MAX_FORECAST_WAYPOINTS,PRESSURES} from './generated/weather.js';
import {TROPOPAUSE_PRESSURES} from './generated/tropopause.js';

const sample=(label,minute=0)=>({label,lat:55.973,lon:37.412,distanceNm:minute*7.5,
  eta:new Date(Date.UTC(2026,10,12,12,minute))});
const samples=[sample('UUEE'),sample('ABAGI',30)];
const url=makeForecastUrl(samples);
assert.equal(url.origin+url.pathname,OPEN_METEO_URL);
assert.equal(url.searchParams.get('models'),'gfs_seamless');
assert.equal(url.searchParams.get('wind_speed_unit'),'kn');
assert.equal(url.searchParams.get('timezone'),'GMT');
assert.equal(url.searchParams.get('cell_selection'),'nearest');
assert.equal(url.searchParams.get('start_date'),'2026-11-12');
assert.equal(url.searchParams.get('end_date'),'2026-11-12');
assert(!url.searchParams.has('apikey'));
assert(!url.href.includes('windy.com'));
assert(url.searchParams.get('hourly').includes('geopotential_height_50hPa'));
assert(url.searchParams.get('hourly').includes('temperature_100hPa'));
assert.equal(MAX_FORECAST_WAYPOINTS,80);
assert.throws(()=>makeForecastUrl([{...sample('BAD'),lat:NaN}]),/координаты/);

const heights={700:3000,600:4300,500:5600,400:7200,300:9200,250:10400,
  200:11800,150:13600,100:16300,50:20500};
const temperatures={700:-5,600:-13,500:-20,400:-32,300:-45,250:-52,
  200:-56,150:-57,100:-56,50:-50,850:3};
const hourly={time:['2026-11-12T12:00','2026-11-12T13:00'],cape:[100,120]};
for(const p of PRESSURES){
  hourly[`temperature_${p}hPa`]=[temperatures[p],temperatures[p]+1];
  hourly[`relative_humidity_${p}hPa`]=[45,40];
  hourly[`wind_speed_${p}hPa`]=[42,40];
  hourly[`wind_direction_${p}hPa`]=[270,260];
  hourly[`cloud_cover_${p}hPa`]=[20,30];
}
for(const p of TROPOPAUSE_PRESSURES){
  hourly[`temperature_${p}hPa`]=[temperatures[p],temperatures[p]+1];
  hourly[`geopotential_height_${p}hPa`]=[heights[p],heights[p]+50];
}
const previousFetch=globalThis.fetch;
try {
  const requests=[];
  globalThis.fetch=async(request,options)=>{
    requests.push({url:new URL(request),options});
    return {ok:true,json:async()=>[{hourly},{hourly}]};
  };
  const progress=[];
  const rows=await loadWeather(samples,360,text=>progress.push(text));
  assert.equal(rows.length,2);
  assert.equal(requests.length,1,'weather and tropopause must share one request');
  assert.equal(requests[0].url.hostname,'api.open-meteo.com');
  assert(!requests[0].url.searchParams.has('apikey'));
  assert.equal(rows[0].flightLevels[360].windKt,42);
  assert.equal(rows[0].flightLevels[360].windDir,270);
  assert(rows[0].tropopauseFL!==null && rows[0].tropopauseFL>=350 && rows[0].tropopauseFL<=410);
  assert(rows[0].atFl?.temp!==null);
  assert(progress.some(t=>t.includes('Open-Meteo GFS')));
  // Without model-height data a tropopause must NOT be invented.
  const missingHeights=structuredClone(hourly);
  for(const p of TROPOPAUSE_PRESSURES)delete missingHeights[`geopotential_height_${p}hPa`];
  globalThis.fetch=async()=>({ok:true,json:async()=>[{hourly:missingHeights},{hourly:missingHeights}]});
  const incomplete=await loadWeather(samples,360);
  assert(incomplete.every(r=>r.tropopauseFL===null));
  // Do not query for >80 FIX/waypoints.
  await assert.rejects(()=>loadWeather(Array.from({length:81},(_,i)=>sample('A'+i)),360),/80/);
  globalThis.fetch=async()=>({ok:false,status:429,text:async()=>JSON.stringify({reason:'Rate limit exceeded'})});
  await assert.rejects(()=>loadWeather(samples,360),/Open-Meteo HTTP 429: Rate limit exceeded/);
  globalThis.fetch=async()=>{throw TypeError('Failed to fetch');};
  await assert.rejects(()=>loadWeather(samples,360),/Open-Meteo недоступен/);
} finally {globalThis.fetch=previousFetch;}
const ui=readFileSync('src/plugin.svelte','utf8');
assert(ui.includes('loadWeather(samples,Number(fl)'));
assert(ui.includes('Open-Meteo GFS: ${weather.length} точек'));
assert(!/windyApiBaseUrl|WINDY_POINT_FORECAST_KEY|loadWindyWeather/.test(ui));
const report=readFileSync('src/offlineReport.ts','utf8');
assert(report.includes('Open-Meteo NOAA GFS'));
console.log('PASS v0.10.2: automatic key-free Open-Meteo GFS, pressure profile and geopotential tropopause from one response, errors, rate limits and correct attribution');
