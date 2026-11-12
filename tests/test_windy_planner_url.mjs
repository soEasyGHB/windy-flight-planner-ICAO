import assert from 'node:assert/strict';
import {loadDemo,importCsv,parseNamedFixRoute} from './generated/navdb.js';
import {buildWindyPlannerUrl} from './generated/windyPlannerUrl.js';

loadDemo();
importCsv('ident,latitude_deg,longitude_deg,type\nUNNT,55.0126,82.6507,AIRPORT\nABAGI,54.2,40.0,FIX\nKUDAS,40.1,45.0,FIX\nFSIA,-4.6743,55.5218,AIRPORT\n');

const route=parseNamedFixRoute('UUEE24C DCT UNNT25');
const exact=buildWindyPlannerUrl(route,'2026-11-16T18:00:00Z');
assert.equal(exact.url,
  'https://www.windy.com/route-planner/ifr/55.9726,37.4146;55.0126,82.6507?2026-11-16-18',
  'Must match the route-planner/ifr URL which was actually confirmed by the user');
assert.equal(exact.urlTimeUtc,'2026-11-16-18');
assert.equal(exact.roundedTime,false);
assert.equal(exact.partial,false);
assert.equal(exact.from,'UUEE');
assert.equal(exact.to,'UNNT');
assert.equal(exact.pointsSent,2);

const roundDown=buildWindyPlannerUrl(route,'2026-11-16T18:20:00Z');
assert.equal(roundDown.urlTimeUtc,'2026-11-16-18');
assert.equal(roundDown.roundedTime,true);
assert.equal(roundDown.requestedDepartureUtc,'2026-11-16T18:20:00Z');
const roundUp=buildWindyPlannerUrl(route,'2026-11-16T20:00:00Z');
assert.equal(roundUp.urlTimeUtc,'2026-11-16-21');
const midnight=buildWindyPlannerUrl(route,'2026-11-16T23:50:00Z');
assert.equal(midnight.urlTimeUtc,'2026-11-17-00');
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
console.log('PASS: confirmed IFR URL, exact 18:00 UTC, 3-hour rounding, date rollover, partial route continuity and invalid input');
