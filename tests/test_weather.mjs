import assert from 'node:assert/strict';
import {standardAltitudeM,isaTemperatureC,isaDeviationC,estimateTropopauseFL,generateSamples,flLevel} from './generated/weather.js';
const approx=(a,b,delta=0.5)=>Math.abs(a-b)<delta;
assert.ok(approx(standardAltitudeM(1013.25),0,1));
assert.ok(approx(isaTemperatureC(1013.25),15,0.01));
assert.ok(approx(isaDeviationC(20,1013.25),5,0.01));
assert.equal(flLevel(350),250);
const dep=new Date('2026-10-28T07:15:00Z');
const s=generateSamples([{ident:'A',lat:0,lon:0},{ident:'B',lat:0,lon:5}],dep,450,3);
assert.ok(s.length>=2 && s.length<=3);
assert.ok(s[1].eta.getTime()>dep.getTime());
assert.ok(approx((s[1].eta-dep)/3600000,s[1].distanceNm/450,.00001));
const levels={};
for(const [p,z,t] of [[850,1500,5],[700,3000,-2],[600,4200,-10],[500,5600,-19],[400,7200,-30],[300,9200,-44],[250,10500,-53],[200,11800,-55],[150,13600,-56],[100,15800,-54],[70,17700,-51],[50,19400,-49]])
  levels[p]={geopotentialM:z,temp:t};
const estimated=estimateTropopauseFL(levels);
assert.ok(estimated!==null && estimated>300 && estimated<400,`Estimated tropopause ${estimated}`);
assert.equal(estimateTropopauseFL({}),null);
console.log('PASS: UTC sample ETA, 450 kt TAS, pressure ISA deviation and estimated tropopause');
// Offline forecast integration test: Open-Meteo response is mocked (no API calls).
const {loadWeather,PRESSURES}=await import('./generated/weather.js');
const pressureTemps={850:5,700:-2,600:-10,500:-19,400:-30,300:-44,250:-53,200:-55,150:-56,100:-54,70:-51,50:-49};
const heights={850:1500,700:3000,600:4200,500:5600,400:7200,300:9200,250:10500,200:11800,150:13600,100:15800,70:17700,50:19400};
const hourly={time:['2026-10-28T07:00','2026-10-28T08:00','2026-10-28T09:00'],cape:[0,0,0]};
for(const p of PRESSURES)for(const [name,scalar] of Object.entries({temperature:pressureTemps[p],relative_humidity:40,wind_speed:85,wind_direction:270,cloud_cover:10,geopotential_height:heights[p]}))
  hourly[`${name}_${p}hPa`]=[scalar,scalar,scalar];
const origFetch=globalThis.fetch;
globalThis.fetch=async url=> {
  const q=new URL(url);
  assert.ok(q.searchParams.get('hourly').includes('geopotential_height_200hPa'));
  return {ok:true,json:async()=>({hourly})};
};
try{
  const fetched=await loadWeather([{lat:52,lon:13,label:'A',distanceNm:0,eta:dep}],350);
  assert.equal(fetched.length,1);
  assert.equal(fetched[0].atFl.windKt,85);
  assert.ok(fetched[0].tropopauseFL>300);
  assert.ok(Number.isFinite(fetched[0].atFl.isaDeviationC));
  console.log('PASS: forecast response parsing, wind, ISA deviation and tropopause rows');
} finally {globalThis.fetch=origFetch;}
