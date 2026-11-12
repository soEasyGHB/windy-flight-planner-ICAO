import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
const before=source.split('<script lang="ts">')[0];
const code=source.slice(source.indexOf('<script lang="ts">'));
assert(before.includes('id="fr-flight-level"'),'FL input must be restored');
assert(!before.includes('id="fr-tas"'),'TAS input must be absent');
assert(before.includes('on:change={flightInputsChanged}'),'ETD controls absent');
assert(before.includes('altitudeStatus'),'Missing altitude warning');
assert(before.includes('timeWaypoints as wp'),'Named ETA points not shown');
assert(before.includes('selectRouteWaypoint(i)'),'Waypoints cannot select map time');
for(const name of ['refreshWaypointSchedule','selectRouteWaypoint','updateWindyAltitude','setWeatherLayer','openNativeRoutePlanner']) {
  assert(code.includes('function '+name+'('),'Missing '+name);
}
assert(code.includes("import {applyWindyAltitude} from './flightAltitude'"),'Windy altitude helper not connected');
assert(code.includes('let fl=360') && code.includes('let tas=450'),'Automatic flight parameters not fixed');
assert(code.includes('syncWindyTimestamp(wp.eta)'),'Selecting point does not update timeline');
assert(code.includes('const samples=generateWaypointSamples(parsed.points,date,Number(tas))'),'Forecast no longer uses TAS/ETD per named point');
assert(code.includes("bcast.emit('rqstOpen','rplanner',request.params)"),'Existing native route planner action lost');
console.log('PASS: FL360 default/TAS450, ETA/timeline, named points, native planner');
