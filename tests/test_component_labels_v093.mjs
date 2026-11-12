import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROFILE_LEVELS, buildRouteProfile, alongTrackWind} from './generated/profileChart.js';

const ui=readFileSync('src/plugin.svelte','utf8');
const chart=ui.slice(ui.indexOf('{#if profileOpen}'),ui.indexOf('<script lang="ts">'));
assert(chart.length>1000);
assert(!chart.includes('fr-component-cross'));
assert(!chart.includes('>0</text>'), 'Zero component should not be rendered');
assert(!chart.includes('Боковой ветер · продольная 0'));
assert(chart.includes('fr-wind-zero-dash'), 'Selected crosswind/unknown should show dash');
assert(chart.includes("component.kind==='tail'"));
assert(chart.includes('<text class="fr-component-amount" x="0" y="11" text-anchor="middle">{component.componentKt}</text>'));
assert(!chart.includes('>+{component.componentKt}</text>'));
assert(!chart.includes('>-{component.componentKt}</text>'));
assert(!chart.includes('Попутная +{'));
assert(!chart.includes('Встречная -{'));
// Full wind & ISA details are retained; kt is removed from on-graph component glyphs.
const glyphs=chart.slice(chart.indexOf('{#each profileViz.components as component'),chart.indexOf('{/each}',chart.indexOf('{#each profileViz.components as component'))+7);
assert(!glyphs.includes(' kt'), 'no kt within graph component glyph');

const cell=(direction,speed)=>({temp:-40,rh:10,windKt:speed,windDir:direction,isaDeviationC:4,cape:0,cloud:0,indicators:[]});
const point=(ident,lon,direction,speed,d)=>({
 sample:{label:ident,lat:0,lon,distanceNm:d,eta:new Date(Date.UTC(2026,10,12,16)+d/450*3600000)},
 flightLevels:Object.fromEntries(PROFILE_LEVELS.map(fl=>[fl,cell(direction,speed)])),
 tropopauseFL:null,levels:{},flPressure:250,atFl:cell(direction,speed),alerts:[]
});
// Course east 090°, winds FROM 000° are crosswind: rounded component 0; no glyphs.
const cross=[point('A',0,0,50,0),point('B',1,0,50,60)];
const crossChart=buildRouteProfile(cross,360);
assert.equal(crossChart.waypointWinds[0]?.kind,'cross');
assert.equal(crossChart.waypointWinds[0]?.componentKt,0);
assert.equal(crossChart.components.length,0,'no zero wind component glyph at any FL');
// Missing wind: empty graph.
const missing=[point('A',0,null,null,0),point('B',1,null,null,60)];
assert.equal(buildRouteProfile(missing,360).components.length,0);
assert.equal(buildRouteProfile([point('A',0,null,null,0),point('B',1,270,50,60)],360).components.length,0,
  'do not extrapolate wind components across a missing forecast point');
// Calm wind: empty graph.
const calm=[point('A',0,0,0,0),point('B',1,0,0,60)];
assert.equal(buildRouteProfile(calm,360).components.length,0);
// A 50 kt near-crosswind with +5 longitudinal should create green-only markers.
const nearCross=[point('A',0,354,50,0),point('B',1,354,50,60)];
const nearChart=buildRouteProfile(nearCross,360);
assert.equal(alongTrackWind(90,354,50)?.componentKt,5);
assert(nearChart.components.length>0);
assert(nearChart.components.every(c=>c.kind==='tail'&&c.componentKt===5));
const head=[point('A',0,6,50,0),point('B',1,6,50,60)];
const headChart=buildRouteProfile(head,360);
assert(headChart.components.some(c=>c.kind==='head'&&c.componentKt===5));
console.log('PASS: v0.9.3 no labels/signs/units for zero, no zero glyphs, ±5 components colored correctly');
