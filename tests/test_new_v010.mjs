import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRouteProfile,recommendFlightLevels,buildIsaContours,PROFILE_LEVELS,yForFlightLevel} from './generated/profileChart.js';
import {normalizeForecastBaseUrl,parseWindyPoint,loadWindyWeather,WINDY_PRESSURES} from './generated/windyWeather.js';
import {estimateModelTropopauseFL} from './generated/tropopause.js';
const source=readFileSync('src/plugin.svelte','utf8');
const markup=source.split('<script lang="ts">')[0];
const main=markup.slice(markup.indexOf('<div class="fr-main-stack">'),markup.indexOf('<details class="fr-settings">'));
const graph=markup.slice(markup.indexOf('{#if profileOpen}'));
assert(main.indexOf('fr-section-our-planner')>0);
assert(main.indexOf('fr-section-export')>main.indexOf('fr-section-our-planner'));
assert.equal((main.match(/class="fr-main-card fr-main-card--light/g)||[]).length,5);
assert(!main.includes('id="fr-flight-level"'));
assert(!source.includes('fr-selected-fl-line'));
assert(graph.includes('fr-isa-contour')&&graph.includes('fr-tropopause-band'));
assert(graph.includes('fr-recommended-fl-line')&&graph.includes('fr-profile-recommendation'));
assert(source.includes('WINDY_POINT_FORECAST_KEY'));
assert(source.includes('loadWindyWeather(samples'));
assert(!source.includes('weather=await loadWeather('));
assert.deepEqual(WINDY_PRESSURES,[850,800,700,600,500,400,300,200,150]);
assert.equal(normalizeForecastBaseUrl('https://demo.vercel.app/'),'https://demo.vercel.app');
assert.throws(()=>normalizeForecastBaseUrl('http://other.vercel.app'),/HTTPS/);
assert.throws(()=>normalizeForecastBaseUrl('https://demo.vercel.app/api/windy-forecast'),/без \/api|адрес/);
const sample=(name,lon,distanceNm,topo,windFrom=270,speed=40)=>({
  sample:{label:name,lat:0,lon,distanceNm,eta:new Date('2026-11-12T10:00:00Z')},
  flightLevels:Object.fromEntries(PROFILE_LEVELS.map(fl=>[fl,{temp:-40,rh:25,windKt:speed,windDir:windFrom,cloud:null,cape:null,isaDeviationC:Math.round((fl-360)/3 + (lon-2)*5),indicators:[]}])),
  levels:{},flPressure:300,atFl:null,tropopauseFL:topo,alerts:[]
});
const route=[sample('A',0,0,410),sample('B',2,120,420),sample('C',5,300,435)];
const chart=buildRouteProfile(route);
assert.equal(chart.tropopauseSegments.length,2,'continuous full-route tropopause');
assert(chart.tropopauseSegments.flat().every(p=>p.y>=chart.tropopauseBandTop-1&&p.y<=chart.tropopauseBandBottom+1));
assert.equal(chart.tropopauseMarkers[0].fl,410);
assert(chart.hasTropopause&&chart.tropopauseLabel);
assert.equal(chart.recommendations.length,2,'both even and odd FL recommendations');
assert(chart.recommendations.every(c=>c.averageTailwindKt>0));
assert(chart.isaContours.some(c=>c.segments.length>0));
assert(chart.isaContours.some(c=>c.labels.some(l=>l.text.startsWith('ISA'))));
assert.equal(buildRouteProfile([sample('A',0,0,null),sample('B',2,120,null)]).hasTropopause,false);
// Eastbound with wind FROM 270: tailwind for all levels.
const east=[sample('A',0,0,350),sample('B',2,120,350)];
const recommended=recommendFlightLevels(east);
assert.equal(recommended.length,2);
assert(recommended.every(x=>x.averageTailwindKt===40));
// Missing winds cannot produce false advice.
east[1].flightLevels[340].windKt=null;
assert(!recommendFlightLevels(east).some(rec=>rec.fl===340));
const realisticColumn=[
  {heightM:5000,tempC:-19},{heightM:7000,tempC:-32},{heightM:9000,tempC:-45},
  {heightM:11000,tempC:-57},{heightM:12500,tempC:-58},{heightM:14200,tempC:-58},
  {heightM:16700,tempC:-56}
];
const topo=estimateModelTropopauseFL(realisticColumn);
assert(topo!==null&&topo>=350&&topo<=380,`derived tropopause at 11km, got ${topo}`);
assert.equal(estimateModelTropopauseFL([]),null);
const forecast=Object.fromEntries(WINDY_PRESSURES.flatMap(p=>[
  [`temp-${p}h`,[-40+273.15]], [`rh-${p}h`,[40]],
  [`wind_u-${p}h`,[20]], [`wind_v-${p}h`,[0]]
]));
const units=Object.fromEntries(WINDY_PRESSURES.flatMap(p=>[
  [`temp-${p}h`,'K'],[`rh-${p}h`,'%'],[`wind_u-${p}h`,'m*s-1'],[`wind_v-${p}h`,'m*s-1']
]));
const payload={ts:[Date.parse('2026-11-12T10:00:00Z')],units,...forecast};
const row=parseWindyPoint(payload,east[0].sample,360);
assert.equal(row.flightLevels[360].windDir,270);
assert(row.flightLevels[360].windKt>=38&&row.flightLevels[360].windKt<=40);
assert.equal(row.flightLevels[360].temp,-40);
assert.equal(row.tropopauseFL,null,'Windy must NOT fabricate tropopause');
assert.throws(()=>parseWindyPoint({...payload,ts:[Date.parse('2026-11-01T10:00:00Z')]},east[0].sample,360),/ETA/);
const prevFetch=globalThis.fetch;
try{
  const reqs=[];
  globalThis.fetch=async (url,options)=>{
    reqs.push({url,options});
    if(String(url).includes('open-meteo'))throw Error('tropopause offline');
    return {ok:true,json:async()=>payload};
  };
  const rows=await loadWindyWeather([east[0].sample,east[1].sample],360,'https://demo.vercel.app');
  assert.equal(rows.length,2);
  assert.equal(reqs.filter(r=>String(r.url).endsWith('/api/windy-forecast')).length,2);
  assert(reqs.filter(r=>String(r.url).includes('vercel')).every(r=>!r.options.body.includes('key')));
  assert(rows.every(r=>r.tropopauseFL===null),'failed tropopause fetch must not invent values');
}finally{globalThis.fetch=prevFetch;}
console.log('PASS v0.10.1 (v0.10.0 regression): new card ordering, no manual FL, continuous tropopause, ISA isolines, even/odd wind recommendation and Windy API units');
