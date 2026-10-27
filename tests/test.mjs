import assert from 'node:assert/strict';
import {loadDemo,totalPoints,csvRows,importCsv,importAirwaysCsv,parseRoute,mapLabelPoints,nm,interpolate,airwayCount} from './generated/navdb.js';
loadDemo();
assert.ok(totalPoints()>=12);
assert.equal(parseRoute('EHAM DCT EDDF DCT LTFM').points.length,3);
assert.ok(parseRoute('EHAM DCT EDDF DCT LTFM').distanceNm>1000);
assert.deepEqual(csvRows('ident,name,lat,lon\nABC,"one, two",40,20\n')[1],['ABC','one, two','40','20']);
assert.equal(importCsv('ident,latitude_deg,longitude_deg,type\nAAAXX,52,10,FIX\nBBBYY,53,15,FIX\n'),2);
assert.equal(parseRoute('AAAXX BBBYY').points.length,2);
assert.deepEqual(parseRoute('EHAM QQZZZ EDDF').unresolved,['QQZZZ']);
assert.equal(parseRoute('EHAM DCT EDDF').unresolved.length,0);
assert.equal(parseRoute('EHAM N5200E01000 EDDF').points.length,3);
assert.ok(nm({lat:0,lon:0},{lat:0,lon:1})>59);
assert.ok(Math.abs(interpolate({ident:'A',lat:0,lon:0},{ident:'B',lat:0,lon:90},.5).lon-45)<1e-7);
const airway='airway,segment,seq,latitude_deg,longitude_deg\nUL980,leg1,0,52,10\nUL980,leg1,1,52.5,12\nUL980,leg1,2,53,15\n';
assert.equal(importAirwaysCsv(airway),3);
assert.equal(airwayCount(),1);
const r=parseRoute('AAAXX UL980 BBBYY');
assert.equal(r.airwayNames.length,0);
assert.equal(r.expandedAirways[0],'UL980');
assert.ok(r.points.length>=3);
assert.ok(r.distanceNm>0);
// Airway geometry keeps all vertices, but only genuine route fixes may have map labels.
assert.deepEqual(r.points.filter(p=>p.showLabel).map(p=>p.ident),['AAAXX','BBBYY']);
assert.deepEqual(mapLabelPoints(r).map(p=>p.ident),['AAAXX','BBBYY']);
assert.ok(mapLabelPoints(r).every(p=>p.type!=='ATS'));

assert.ok(r.points.some(p=>!p.showLabel && p.ident.startsWith('UL980-')));
assert.ok(r.points.some(p=>p.ident==='BBBYY' && p.showLabel), 'airway destination must keep its label even when an intermediate vertex shares its coordinates');
assert.equal(parseRoute('EHAM DCT EDDF').points.every(p=>p.showLabel),true);
console.log('PASS: parsing, CSV, route, airway expansion, great-circle geometry');
// Regression: an airway token with a same-named USA navaid is NOT a waypoint.
importCsv('ident,latitude_deg,longitude_deg,type\nTOGMO,50,40,FIX\nABAGI,50,42,FIX\nNIMTA,50,44,FIX\nMOLED,50,46,FIX\nLIDUS,50,48,FIX\nZG,50,50,FIX\nZG,40,-102,VOR\nITAKA,50,52,FIX\nN50,40,-100,VOR\nM56,41,-101,VOR\nB105,39,-99,VOR\nG242,37,-98,VOR\nUT54,36,-97,VOR\nSIV,50,54,FIX\nHISAR,50,56,FIX\n', 'local X-Plane');
const testAwys='airway,segment,seq,latitude_deg,longitude_deg\nM56,m56,0,50,40\nM56,m56,1,50,42\nB105,b105,0,50,42\nB105,b105,1,50,44\nN50,n50,0,50,46\nN50,n50,1,50,48\nG242,g242,0,50,48\nG242,g242,1,50,50\nUT54,ut54,0,50,54\nUT54,ut54,1,50,56\n';
importAirwaysCsv(testAwys);
const eurasia=parseRoute('TOGMO M56 ABAGI B105 NIMTA DCT MOLED N50 LIDUS G242 ZG DCT ITAKA DCT SIV UT54 HISAR');
assert.equal(eurasia.gaps.length,0);
assert.deepEqual(eurasia.ambiguous,[]);
assert.ok(eurasia.points.every(p=>p.lon>30 && p.lon<60));
assert.ok(eurasia.points.every(p=>!['M56','B105','N50','G242','UT54'].includes(p.ident)));
assert.ok(eurasia.distanceNm<1800);
assert.deepEqual(eurasia.points.filter(p=>p.showLabel).map(p=>p.ident),
  ['TOGMO','ABAGI','NIMTA','MOLED','LIDUS','ZG','ITAKA','SIV','HISAR']);
assert.deepEqual(mapLabelPoints(eurasia).map(p=>p.ident),
  ['TOGMO','ABAGI','NIMTA','MOLED','LIDUS','ZG','ITAKA','SIV','HISAR']);
assert.ok(eurasia.points.filter(p=>!p.showLabel).every(p=>p.type==='ATS'),
  'only ATS geometry vertices must be hidden from map labels');
const oceanJump=parseRoute('TOGMO DCT KJFK DCT ABAGI');
assert.equal(oceanJump.gaps.length,2);
assert.equal(oceanJump.segments.filter(s=>s.length>=2).length,0);
assert.ok(!oceanJump.distanceNm);
console.log('PASS: aviation airway/ident collisions; US detours rejected');

// Even a named endpoint on an isolated segment keeps its label for diagnosis.
const isolated=parseRoute('EHAM DCT KJFK DCT EDDF');
assert.ok(isolated.gaps.length>0);
assert.deepEqual(mapLabelPoints(isolated).map(p=>p.ident),['EHAM','KJFK','EDDF']);
console.log('PASS: map labels only explicitly named flight-plan fixes, including isolated endpoints');
