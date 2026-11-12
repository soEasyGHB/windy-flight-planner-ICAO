import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROFILE_LEVELS,buildRouteProfile,yForFlightLevel,isaColor,windBarbGeometry,blendWind} from './generated/profileChart.js';

const makeCell=(windDir,windKt,isaDeviationC,temp=-42)=>({
  temp,rh:15,windKt,windDir,isaDeviationC,cape:0,cloud:10,indicators:[]
});
const sample=(i,d,topo)=>({
  sample:{lat:50+i,lon:30+i,label:['UUEE','ABAGI','NIMTA','OMDB'][i],distanceNm:d,eta:new Date(Date.UTC(2026,10,12,16)+d/450*3600_000)},
  flightLevels:Object.fromEntries(PROFILE_LEVELS.map(fl=>[fl,makeCell(350-i*5,10+8*i,12-i*3)])),
  tropopauseFL:topo,
  levels:{},flPressure:250,atFl:makeCell(270,35,5),alerts:[]
});
const mock=[sample(0,0,null),sample(1,160,355),sample(2,960,365),sample(3,1200,null)];
const profile=buildRouteProfile(mock,360);
assert.deepEqual(PROFILE_LEVELS,[390,380,370,360,350,340,330]);
assert.equal(profile.selectedFl,360);
assert.equal(profile.selectedY,yForFlightLevel(360));
assert.equal(profile.bands.length,7);
assert.equal(profile.totalNm,1200);
assert(profile.barbs.length>0);
assert(profile.waypoints[1].x-profile.waypoints[0].x < profile.waypoints[2].x-profile.waypoints[1].x,
  'waypoint spacing must reflect actual NM distance');
assert.equal(profile.tropopauseSegments.length,1);
assert.equal(profile.tropopauseSegments[0].length,2);
assert.equal(profile.tropopauseMarkers.length,2);
assert(profile.tropopauseMarkers.every(p=>p.y>=profile.top && p.y<=profile.bottom));
const noTopo=buildRouteProfile([sample(0,0,null),sample(1,100,410),sample(2,200,320)],360);
assert.equal(noTopo.hasTropopause,true,'a line crossing the visible FL band should be clipped and shown');
assert.equal(noTopo.tropopauseSegments.length,1);
assert(noTopo.tropopauseSegments[0].every(p=>p.y>=noTopo.top && p.y<=noTopo.bottom));
const onlyAbove=buildRouteProfile([sample(0,0,420),sample(1,100,430)],360);
assert.equal(onlyAbove.hasTropopause,false,'out-of-range tropopause must not be faked at upper edge');
assert.match(onlyAbove.tropopauseDescription,/выше FL390/);
assert.equal(buildRouteProfile([],360).barbs.length,0);
assert.deepEqual(windBarbGeometry(0).calm,true);
assert(windBarbGeometry(55).pennants.includes('Z'),'50kt is a pennant');
assert(windBarbGeometry(25).feathers.includes('L9'),'full 10kt feathers');
const vector=blendWind(makeCell(355,40,0),makeCell(5,40,0),.5);
assert(vector&& (vector.direction<20 || vector.direction>340),'wind direction must wrap through N, not S');
assert.notEqual(isaColor(-10),isaColor(10));

const ui=readFileSync('src/plugin.svelte','utf8');
for(const signature of ['buildRouteProfile(weather,weatherFL)','fr-profile-svg','fr-selected-fl-line',
  'fr-tropopause-line','fr-profile-flight-summary','fr-barb','fr-waypoint-target','Тропопауза≈'])
  assert(ui.includes(signature),`New graphical profile UI marker missing: ${signature}`);
const panel=ui.slice(ui.indexOf('{#if profileOpen && weather.length}'),ui.indexOf('<script lang="ts">'));
assert(!panel.includes('fr-profile-grid'),'Old table-based profile must be removed');
assert(!panel.includes('<table'),'Standalone profile must not render a table');
assert(!panel.includes('FL300'),'Profile should show only FL330 to FL390');
assert(!panel.includes('FL400'),'Profile should show only FL330 to FL390');
console.log('PASS: true SVG route cross-section FL330–390, selected FL360, ISA shading, meteorological barbs, real NM spacing, bounded tropopause');
