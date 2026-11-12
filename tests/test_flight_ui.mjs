import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
const before=source.split('<script lang="ts">')[0];
const code=source.slice(source.indexOf('<script lang="ts">'));
assert(before.includes('on:input={flightLevelChanged}'),'FL input must change map automatically');
assert(before.includes('on:change={flightInputsChanged}'),'ETD/TAS controls absent');
assert(before.includes('altitudeStatus'),'Missing altitude warning');
assert(before.includes('timeWaypoints as wp'),'Named ETA points not shown');
assert(before.includes('selectRouteWaypoint(i)'),'Waypoints cannot select map time');
for(const name of ['flightLevelChanged','refreshWaypointSchedule','selectRouteWaypoint','updateWindyAltitude','setWeatherLayer','openNativeRoutePlanner']) {
  assert(code.includes('function '+name+'('),'Missing '+name);
}
assert(code.includes("import {applyWindyAltitude, DEFAULT_CRUISE_FL} from './flightAltitude'"),'Windy altitude helper not connected');
assert(code.includes('syncWindyTimestamp(wp.eta)'),'Selecting point does not update timeline');
assert(code.includes('const samples=generateWaypointSamples(parsed.points,date,Number(tas))'),'Forecast no longer uses TAS/ETD per named point');
assert(code.includes("bcast.emit('rqstOpen','rplanner',request.params)"),'Existing native route planner action lost');
console.log('PASS: FL input, ETA/FL synchronization, named points, native planner compatibility');
