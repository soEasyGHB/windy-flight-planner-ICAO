import assert from 'node:assert/strict';
import {loadDemo,importCsv,parseNamedFixRoute} from './generated/navdb.js';
import {buildNativePlannerHandoff} from './generated/nativePlannerHandoff.js';
loadDemo();
const complete=parseNamedFixRoute('UUEE24C DCT EDDF DCT LTFM');
const request=buildNativePlannerHandoff(complete,'2026-11-13T01:20:00Z');
assert.equal(request.partial,false);
assert.equal(request.departureUtc,'2026-11-13T01:20:00Z');
assert.equal(request.timestampMs,Date.parse('2026-11-13T01:20:00Z'));
assert.equal(request.fallbackTimeUtc,'2026-11-13-00');
assert.equal(request.params.view,'ifr');
assert.equal(request.params.coords.length,3);
assert.deepEqual(Object.keys(request.params).sort(),['coords','view']);
assert(request.fallbackUrl.startsWith('https://www.windy.com/distance/55.9726,37.4146;'));
assert(request.fallbackUrl.includes('?2026-11-13-00,'));
assert(!request.fallbackUrl.includes('undefined'));
assert.equal(request.verticesSent,3);
assert.equal(request.from,'UUEE');
assert.equal(request.to,'LTFM');
const midnight=buildNativePlannerHandoff(complete,'2026-11-13T23:50:00Z');
assert.equal(midnight.fallbackTimeUtc,'2026-11-14-00','Windy three-hour rounding must handle date rollover');
assert.throws(()=>buildNativePlannerHandoff(complete,'2026-02-30T10:00:00Z'),/UTC/);
assert.throws(()=>buildNativePlannerHandoff(complete,'2026-11-13T01:20:00+03:00'),/UTC/);

importCsv('ident,latitude_deg,longitude_deg,type\nABAGI,54.2,40.0,FIX\nKUDAS,40.1,45.0,FIX\nFSIA,-4.6743,55.5218,AIRPORT\n');
const partial=parseNamedFixRoute('UUEE24C DCT ABAGI UNKNOWNFIX KUDAS DCT FSIA31');
assert(partial.gaps.length>0);
const partRequest=buildNativePlannerHandoff(partial,'2026-11-15T06:00:00Z');
assert.equal(partRequest.partial,true);
assert(partRequest.verticesSent>=2);
const actualSegments=partial.segments.filter(s=>s.length>=2);
assert(actualSegments.some(segment=>segment.length===partRequest.verticesSent &&
  segment.every((p,i)=>p.lat===partRequest.params.coords[i].lat && p.lon===partRequest.params.coords[i].lon)),
  'Handoff must use only a real continuous segment; must not bridge an unknown FIX');
assert.throws(()=>buildNativePlannerHandoff(parseNamedFixRoute('UNKNOWNONE DCT UNKNOWNTWO'),'2026-11-13T06:00:00Z'),/подтверждённого/);
console.log('PASS: route coords + UTC handoff, URL 3h forecast timing, no gap bridging, malformed dates');
