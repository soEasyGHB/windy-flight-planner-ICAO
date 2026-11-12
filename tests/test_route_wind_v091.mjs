import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROFILE_LEVELS,alongTrackWind,trueCourseDeg,buildRouteProfile} from './generated/profileChart.js';

// True track east, meteorological wind FROM west -> 50kt tailwind.
const eastCourse=trueCourseDeg({lat:0,lon:10},{lat:0,lon:11});
assert(eastCourse!==null && Math.abs(eastCourse-90)<0.01);
const westCourse=trueCourseDeg({lat:0,lon:11},{lat:0,lon:10});
assert(westCourse!==null && Math.abs(westCourse-270)<0.01);
assert.equal(trueCourseDeg({lat:0,lon:10},{lat:0,lon:10}),null);
assert.equal(alongTrackWind(eastCourse,270,50)?.signedKt,50);
assert.equal(alongTrackWind(eastCourse,270,50)?.kind,'tail');
assert.equal(alongTrackWind(eastCourse,90,50)?.signedKt,-50);
assert.equal(alongTrackWind(eastCourse,90,50)?.kind,'head');
// Pure crosswind 50kt: longitudinal component = 0kt.
assert.equal(alongTrackWind(eastCourse,0,50)?.signedKt,0);
assert.equal(alongTrackWind(eastCourse,0,50)?.kind,'cross');
assert.equal(alongTrackWind(eastCourse,180,50)?.signedKt,0);
// Approximate crosswind at 50kt, 5kt of tailwind, not 50.
assert.equal(alongTrackWind(eastCourse,354,50)?.signedKt,5);
assert.equal(alongTrackWind(eastCourse,354,50)?.crosswindKt,50);
assert.equal(alongTrackWind(eastCourse,6,50)?.signedKt,-5);
assert.equal(alongTrackWind(eastCourse,6,50)?.componentKt,5);
assert.equal(alongTrackWind(359,180,45)?.signedKt,45);
assert.equal(alongTrackWind(0,180,45)?.signedKt,45);
assert.equal(alongTrackWind(0,null,45),null);
assert.equal(alongTrackWind(null,270,50),null);
assert.equal(alongTrackWind(90,270,null),null);

const makeCell=(dir,speed)=>({temp:-41,rh:12,windKt:speed,windDir:dir,isaDeviationC:8,cape:0,cloud:0,indicators:[]});
const waypoint=(name,lat,lon,nm,dir,speed)=>({
  sample:{label:name,lat,lon,distanceNm:nm,eta:new Date(Date.UTC(2026,10,12,16)+nm/450*3600000)},
  flightLevels:Object.fromEntries(PROFILE_LEVELS.map(fl=>[fl,makeCell(dir,fl===390?speed+10:speed)])),
  tropopauseFL:360,levels:{},flPressure:250,atFl:makeCell(dir,speed),alerts:[]
});
const route=[waypoint('FIRST',0,10,0,354,50),waypoint('MID',0,11,60,270,50),waypoint('LAST',0,12,120,90,50)];
const chart=buildRouteProfile(route,360);
assert.equal(chart.selectedFl,360);
assert.equal(chart.components.length>0,true);
assert.equal(chart.waypointWinds.length,3);
assert.equal(chart.waypointWinds[0]?.signedKt,5);
assert.equal(chart.waypointWinds[0]?.kind,'tail');
assert.equal(chart.waypointWinds[1]?.signedKt,50);
assert.equal(chart.waypointWinds[2]?.signedKt,-50);
const middle=chart.components.filter(c=>c.level===360);
assert(middle.some(c=>c.kind==='tail'&&c.signedKt>0));
assert(middle.some(c=>c.kind==='head'&&c.signedKt<0));
assert.deepEqual(PROFILE_LEVELS,[390,380,370,360,350,340,330]);
assert.equal(buildRouteProfile([route[0]],360).waypointWinds[0],null, 'No route heading => no wind component');
const ui=readFileSync('src/plugin.svelte','utf8');
const visible=ui.slice(ui.indexOf('{#if profileOpen}'),ui.indexOf('<script lang="ts">'));
assert(visible.includes('profileViz.components'),'Graph must render along-route components');
assert(!visible.includes('profileViz.barbs'),'No north-referenced wind barbs must be drawn');
for(const token of ['fr-component-tail','fr-component-head','Попутная','Встречная','fr-wind-zero-dash'])
  assert(visible.includes(token),`Missing flight-route wind UI: ${token}`);
assert(ui.includes("let fl=360;"),'Keep FL360 default');
assert(ui.includes("let overlay='thunder';"),'Keep thunderstorm default');
console.log('PASS: along-track wind (tail/head/cross), 50kt nearly crosswind => 5kt, outbound/inbound headings, SVG arrows per FL330–390');
