import assert from 'node:assert/strict';
import {loadDemo,importCsv,parseNamedFixRoute} from './generated/navdb.js';
import {buildWindyPlannerUrl} from './generated/windyPlannerUrl.js';

loadDemo();
importCsv('ident,latitude_deg,longitude_deg,type\nUNNT,55.0126,82.6507,AIRPORT\nABAGI,54.2,40.0,FIX\nKUDAS,40.1,45.0,FIX\nFSIA,-4.6743,55.5218,AIRPORT\n');

const route=parseNamedFixRoute('UUEE24C DCT UNNT25');
const exact=buildWindyPlannerUrl(route,'2026-11-16T18:00:00Z');
assert.equal(exact.url,
  'https://www.windy.com/route-planner/ifr/55.9726,37.4146;55.0126,82.6507?2026-11-16-18',
  'Keep confirmed route coordinates while carrying exact minutes experimentally');
assert.equal(exact.urlTimeUtc,'2026-11-16-18');
assert.equal(exact.experimentalTime,false);
assert.equal(exact.partial,false);
assert.equal(exact.from,'UUEE');
assert.equal(exact.to,'UNNT');
assert.equal(exact.pointsSent,2);

const minute=buildWindyPlannerUrl(route,'2026-11-16T05:01:00Z');
assert.equal(minute.urlTimeUtc,'2026-11-16-05:01');
assert.equal(minute.experimentalTime,true);
assert(minute.url.endsWith('?2026-11-16-05:01'),'Never round 05:01 UTC to a forecast slot');
assert.equal(minute.requestedDepartureUtc,'2026-11-16T05:01:00Z');
const after=buildWindyPlannerUrl(route,'2026-11-16T18:20:00Z');
assert.equal(after.urlTimeUtc,'2026-11-16-18:20');
const preMidnight=buildWindyPlannerUrl(route,'2026-11-16T23:50:00Z');
assert.equal(preMidnight.urlTimeUtc,'2026-11-16-23:50');
const zeroMinute=buildWindyPlannerUrl(route,'2026-11-16T20:00:00Z');
assert.equal(zeroMinute.urlTimeUtc,'2026-11-16-20:00');
assert.equal(zeroMinute.experimentalTime,true);
assert.throws(()=>buildWindyPlannerUrl(route,'2026-02-30T10:00:00Z'),/UTC/);
assert.throws(()=>buildWindyPlannerUrl(route,'2026-11-16T18:00:00+03:00'),/UTC/);

const partial=parseNamedFixRoute('UUEE24C DCT ABAGI UNKNOWNFIX KUDAS DCT FSIA31');
assert(partial.gaps.length>0);
const link=buildWindyPlannerUrl(partial,'2026-11-16T18:00:00Z');
assert(link.partial);
assert(link.pointsSent>=2);
assert(!link.url.includes('undefined'));
const selected=partial.segments.find(s=>s.length===link.pointsSent && s[0].ident===link.from && s.at(-1).ident===link.to);
assert(selected,'A partial route must use only a real, continuous, verified segment');
assert.throws(()=>buildWindyPlannerUrl(parseNamedFixRoute('UNKNOWNONE DCT UNKNOWNTWO'),'2026-11-16T18:00:00Z'),/подтверждённого/);
console.log('PASS: experimental minute-accurate URL with no rounding, partial-route continuity and input validation');
