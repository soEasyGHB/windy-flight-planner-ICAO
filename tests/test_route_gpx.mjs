import assert from 'node:assert/strict';
import {loadDemo,importCsv,parseNamedFixRoute,mapLabelPoints,parseRoute} from './generated/navdb.js';
import {makeRouteGpx,routeIssues,departureIsoUtc} from './generated/routeGpx.js';
loadDemo();
const complete=parseNamedFixRoute('EHAM DCT EDDF DCT LTFM');
assert.equal(complete.segments.length,1);
assert.deepEqual(mapLabelPoints(complete).map(p=>p.ident),['EHAM','EDDF','LTFM']);
assert.equal(routeIssues(complete).length,0);
const xml=makeRouteGpx(complete);
assert.equal((xml.match(/<rtept /g)||[]).length,3);
assert.equal((xml.match(/<rte>/g)||[]).length,1);
assert(!xml.includes('<trkpt'), 'Never invent track geometry');
assert.equal(departureIsoUtc('2026-11-12','23:45'),'2026-11-12T23:45:00Z');
assert.equal(departureIsoUtc('2028-02-29','00:00'),'2028-02-29T00:00:00Z');
for(const [day,time] of [['2026-02-29','10:00'],['2026-13-01','10:00'],['2026-11-12','24:30'],['2026-11-12','12:60'],['2026-11-12',''],['2026-1-02','10:10']]) {
  assert.throws(()=>departureIsoUtc(day,time),/UTC/,`${day} ${time} must be rejected`);
}
const etdXml=makeRouteGpx(complete,{departureUtc:departureIsoUtc('2026-11-12','23:45')});
assert(etdXml.includes('<fr:plannedDepartureUtc>2026-11-12T23:45:00Z</fr:plannedDepartureUtc>'));
assert(etdXml.includes('Planned departure UTC: 2026-11-12T23:45:00Z'));
assert(!etdXml.includes('<time>'), 'Do not misrepresent ETD as GPX file-creation or waypoint-passing time');
assert.equal((etdXml.match(/<rtept /g)||[]).length,3);
assert.throws(()=>makeRouteGpx(complete,{departureUtc:'2026-02-30T12:00:00Z'}),/UTC/);

const incomplete=parseNamedFixRoute('EHAM DCT EDDF UNKNOWNFIX LTFM DCT OMDB');
assert(incomplete.unresolved.includes('UNKNOWNFIX'));
assert(routeIssues(incomplete).length>0);
assert.throws(()=>makeRouteGpx(incomplete),/неполный/i);
const partial=makeRouteGpx(incomplete,{allowPartial:true});
assert(partial.includes('PARTIAL'));
const partialEtd=makeRouteGpx(incomplete,{allowPartial:true,departureUtc:departureIsoUtc('2026-11-12','23:45')});
assert.equal((partialEtd.match(/<fr:plannedDepartureUtc>/g)||[]).length,1);
assert.equal((partial.match(/<rte>/g)||[]).length,2,'Do not bridge broken legs');
assert(!partial.includes('UNKNOWNFIX'));
const runway=parseRoute('UUEE24C DCT OMDB30R');
assert.deepEqual(mapLabelPoints(runway).map(p=>p.ident),['UUEE','OMDB']);
importCsv('ident,latitude_deg,longitude_deg,type\nEXTEST,51,10,FIX\n');

// Terminal SID/STAR with digits must not break a known flight plan.
importCsv('ident,latitude_deg,longitude_deg,type\nFSIA,-4.6743,55.5218,AIRPORT\nABAGI,54.2,40.0,FIX\nKUDAS,40.1,45.0,FIX\nSID9A,54.3,39.0,FIX\n');
const terminal=parseNamedFixRoute('UUEE24C FSIA31');
assert.deepEqual(mapLabelPoints(terminal).map(p=>p.ident),['UUEE','FSIA'],'Airport runway suffixes are stripped');
const withProcedures=parseNamedFixRoute('UUEE24C DEMO2A DCT ABAGI DCT KUDAS DCT ARR9C FSIA31');
assert.deepEqual(mapLabelPoints(withProcedures).map(p=>p.ident),['UUEE','ABAGI','KUDAS','FSIA']);
assert.equal(withProcedures.segments.length,1);
assert.deepEqual(withProcedures.gaps,[]);
assert.deepEqual(withProcedures.unresolved,[]);
assert(withProcedures.skipped.includes('Terminal SID/STAR omitted: DEMO2A'));
assert(withProcedures.skipped.includes('Terminal SID/STAR omitted: ARR9C'));
const knownDigitFix=parseNamedFixRoute('UUEE24C SID9A ABAGI FSIA31');
assert(mapLabelPoints(knownDigitFix).some(p=>p.ident==='SID9A'),'Known numeric FIX cannot be silently dropped');
const unknownMiddle=parseNamedFixRoute('UUEE24C ABAGI FIX9K KUDAS FSIA31');
assert(unknownMiddle.unresolved.includes('FIX9K'),'Unknown enroute FIX must create a gap');
assert(unknownMiddle.gaps.length>0);
const namedGpx=makeRouteGpx(withProcedures);
assert(!namedGpx.includes('DEMO2A') && !namedGpx.includes('ARR9C'));
for(const ident of ['UUEE','ABAGI','KUDAS','FSIA']){
  assert(namedGpx.includes(`<name>${ident}</name>`));
  assert(namedGpx.includes(`<cmt>${ident}</cmt>`));
}
assert.equal((namedGpx.match(/<wpt /g)||[]).length,4,'Named waypoints for GPX import');
assert.equal((namedGpx.match(/<rtept /g)||[]).length,4,'Named route points for GPX import');
assert(namedGpx.indexOf('<wpt ')<namedGpx.indexOf('<rte>'),'GPX order: wpt before rte');

console.log('PASS: named GPX waypoints, terminal SID/STAR, strict UTC ETD, no invented route or ETA');
