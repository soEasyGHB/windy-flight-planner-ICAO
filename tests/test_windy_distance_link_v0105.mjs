import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDemo,parseNamedFixRoute,importCsv} from './generated/navdb.js';
import {buildWindyDistanceLink} from './generated/windyDistanceLink.js';

loadDemo();
const full=parseNamedFixRoute('EHAM DCT EDDF DCT LTFM');
const handoff=buildWindyDistanceLink(full);
assert.equal(handoff.partial,false);
assert.equal(handoff.verticesSent,3);
assert.equal(handoff.url,'https://www.windy.com/distance/52.3086,4.7639;50.0379,8.5622;41.2753,28.7519');
assert.equal(handoff.from,'EHAM');
assert.equal(handoff.to,'LTFM');
assert.equal(new URL(handoff.url).origin,'https://www.windy.com');
assert(!handoff.url.includes('?'),'Use documented /distance route path');

// Confirm numeric integer positions have a mandatory decimal point, including zeros.
importCsv('ident,latitude_deg,longitude_deg,type\nINTEG,50,0,FIX\nEXACT,51,1,FIX\n');
const integers=buildWindyDistanceLink(parseNamedFixRoute('INTEG DCT EXACT'));
assert.equal(integers.url,'https://www.windy.com/distance/50.0,0.0;51.0,1.0');

const partial=parseNamedFixRoute('EHAM DCT EDDF DCT UNKNOWNXX DCT LTFM DCT OMDB');
assert(partial.unresolved.length>0);
assert.throws(()=>buildWindyDistanceLink(partial),/Неполный маршрут/);
const confirmed=buildWindyDistanceLink(partial,true);
assert(confirmed.partial,'Partial route must be surfaced explicitly');
assert(confirmed.verticesSent>=2);
assert(!confirmed.url.includes('UNKNOWNXX'));
assert(!confirmed.url.includes(';;'));
assert(!confirmed.url.includes('undefined'));

assert.throws(()=>buildWindyDistanceLink(parseNamedFixRoute('EHAM DCT UNKNOWNXX DCT OMDB'),true),/участка/);
const longPoints=Array.from({length:500},(_,i)=>({ident:'P'+i,lat:50+i/10000,lon:10+i/10000,showLabel:true,type:'FIX',source:'test'}));
const longRoute={...full,points:longPoints,segments:[longPoints],unresolved:[],airwayNames:[],ambiguous:[],gaps:[]};
assert.throws(()=>buildWindyDistanceLink(longRoute),/слишком длинный/,'Never silently drop vertices to fit URL');

const svelte=readFileSync('src/plugin.svelte','utf8');
const main=svelte.split('<script lang="ts">')[0].split('<details class="fr-settings">')[0];
const nativeLink=main.match(/<a class="fr-gpx-download fr-native-route-link"([^>]+)>Открыть маршрут в штатном планировщике Windy<\/a>/);
assert(nativeLink,'Visible Windy link in main planner card');
assert(nativeLink[1].includes('href={windyPlannerHref}'),'Href comes from parsed route, not a fixed URL');
assert(nativeLink[1].includes('target="_blank"'),'Link opens Windy in a new tab on iPad/desktop');
assert(nativeLink[1].includes('rel="noopener noreferrer"'),'External link must not inherit opener');
assert(main.indexOf('fr-native-route-link')<main.indexOf('Скачать GPX файл маршрута'),'Direct transfer is primary');
assert(svelte.includes('prepareWindyRouteLink();'),'Build direct link when route parsed');
assert(svelte.includes('windyPlannerHref=\'\';windyPlannerFeedback=\'Маршрут изменён.'),'Stale URL must be invalidated on edits');
assert(main.includes('on:click={openNativeRoutePlanner}'),'Keep existing in-window route option as fallback');
console.log('PASS: documented Windy /distance URL, complete/partial/integer/oversize routes, safe real link UI');
