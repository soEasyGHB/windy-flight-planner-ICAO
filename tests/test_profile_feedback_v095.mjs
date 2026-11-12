import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadWeather} from './generated/weather.js';
const code=readFileSync('src/plugin.svelte','utf8');
const markup=code.split('<script lang="ts">')[0];
assert(markup.includes('{#if profileOpen}'), 'Profile panel must open even before data arrives');
assert(markup.includes('profileState===\'loading\''), 'Loading state not shown');
assert(markup.includes('profileState===\'error\''), 'Error state not shown');
assert(markup.includes('profileFeedback'), 'Profile feedback not shown');
assert(markup.includes('role="status"'), 'Accessible status not found');
assert(markup.includes('Повторить запрос'), 'Retry button is absent');
assert(code.includes("profileOpen=true;\n    profileState='loading'"), 'Panel not opened immediately');
assert(code.includes('const currentRoute=parsed;'), 'Forecast does not use newly parsed route');
assert(!code.slice(code.indexOf('async function analyze()'),code.indexOf('function downloadWeather()')).includes('if(!canExportRoute)'), 'Forecast still uses deferred canExportRoute flag');
const originalFetch=globalThis.fetch;
try {
  const samples=[
    {lat:55.97,lon:37.41,label:'UUEE',distanceNm:0,eta:new Date('2026-11-12T12:00:00Z')},
    {lat:48.15,lon:11.78,label:'POINT',distanceNm:450,eta:new Date('2026-11-12T13:00:00Z')}
  ];
  globalThis.fetch=async ()=>({ok:false,status:400,text:async ()=>JSON.stringify({reason:'Invalid hourly parameter'})});
  await assert.rejects(loadWeather(samples,360),/Open-Meteo HTTP 400: Invalid hourly parameter/);
  globalThis.fetch=async ()=>{throw TypeError('Failed to fetch');};
  await assert.rejects(loadWeather(samples,360),/Open-Meteo недоступен: TypeError: Failed to fetch/);
  const levels=[850,700,600,500,400,300,250,200,150];
  const hourly={time:['2026-11-12T12:00','2026-11-12T13:00'],cape:[100,120]};
  for(const p of levels) {
    hourly[`temperature_${p}hPa`]=[-45,-44];
    hourly[`relative_humidity_${p}hPa`]=[42,44];
    hourly[`wind_speed_${p}hPa`]=[40,35];
    hourly[`wind_direction_${p}hPa`]=[270,280];
    hourly[`cloud_cover_${p}hPa`]=[30,20];
  }
  const progress=[];
  globalThis.fetch=async (_url,{signal}={})=>{
    assert.equal(signal?.aborted,false);
    return {ok:true,json:async()=>[{hourly},{hourly}]};
  };
  const result=await loadWeather(samples,360,msg=>progress.push(msg));
  assert.equal(result.length,2);
  assert.equal(result[0].sample.label,'UUEE');
  assert(Number.isFinite(result[0].flightLevels[360].windKt));
  assert(progress.some(s=>s.includes('1–2 / 2')));
} finally {globalThis.fetch=originalFetch;}
console.log('PASS: profile opens immediately, shows real errors/retry, handles Open-Meteo HTTP/network failures and success');
