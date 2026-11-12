import assert from 'node:assert/strict';
import {loadGithubSnapshot,parseRoute,airwayCount,mapLabelPoints} from './generated/navdb.js';
const meta={status:'ready',airac_cycle:'2607',generated_utc:'2026-11-12T00:00:00Z'};
const csv={
 'manifest.json':JSON.stringify(meta),
 'points.csv':'ident,latitude_deg,longitude_deg,type\nFIRSTX,52.0,10.0,FIX\nLASTXX,53.0,14.0,FIX\n',
 'airways.csv':'airway,segment,seq,latitude_deg,longitude_deg\nA551,e1,0,52,10\nA551,e1,1,52.5,12\nA551,e1,2,53,14\n'
};
const original=globalThis.fetch;
globalThis.fetch=async input=>{
  const name=String(input).split('/').at(-1);
  return new Response(csv[name],{status:name in csv?200:404});
};
try{
 const result=await loadGithubSnapshot('https://github.com/soEasyGHB/windy-flight-planner-ICAO');
 assert.equal(result.cycle,'2607');
 assert.equal(result.airwayVertices,3);
 assert.equal(airwayCount(),1);
 const route=parseRoute('FIRSTX A551 LASTXX');
 assert.equal(route.gaps.length,0);
 assert.equal(route.expandedAirways[0],'A551');
 assert.deepEqual(mapLabelPoints(route).map(p=>p.ident),['FIRSTX','LASTXX']);
 console.log('PASS: GitHub manifest, CSV import, airway geometry and labels');
} finally {globalThis.fetch=original;}
