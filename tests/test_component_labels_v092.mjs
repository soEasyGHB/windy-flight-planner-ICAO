import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('src/plugin.svelte','utf8');
const chart=src.slice(src.indexOf('{#if profileOpen && weather.length}'),src.indexOf('<script lang="ts">'));
assert(chart.length>1000);
assert(chart.includes('fr-component-tail'));
assert(chart.includes('fr-component-head'));
assert(!chart.includes('fr-component-cross')); // no zero/crosswind glyph
assert(chart.includes('→ Попутная {profileViz.waypointWinds[activeProfileIndex]?.componentKt}'));
assert(chart.includes('← Встречная {profileViz.waypointWinds[activeProfileIndex]?.componentKt}'));
assert(chart.includes('<text class="fr-component-amount" x="0" y="11" text-anchor="middle">{component.componentKt}</text>'));
assert(!chart.includes('>+{component.componentKt}</text>'), 'No plus sign next to graphical component');
assert(!chart.includes('Попутная +{'), 'No plus sign in selected waypoint component');
assert(!chart.includes('Попутная составляющая, kt'), 'No kt in legend');
assert(!chart.includes('Встречная составляющая, kt'), 'No kt in legend');
assert(chart.includes('fr-wind-zero-dash')); // selected-point empty/zero component is a dash
assert(chart.includes('fr-selected-fl-line'));
assert(chart.includes('fr-tropopause-line'));
assert(src.includes("let overlay='thunder';"));
assert(src.includes('let fl=360;'));
console.log('PASS: colored along-route components without signed labels or kt, zero wind hidden');
