import assert from 'node:assert/strict';
import {buildWindyPlannerLink,buildPartialWindyPlannerLink,makeRouteGpx,simplifyTrack,verifiedTrack,routeIssues} from './generated/routePlanner.js';
const point=(ident,lat,lon,showLabel=true)=>({ident,lat,lon,showLabel,type:'FIX',source:'test',index:0});
const a=point('TOGMO',55.1,36.2),b=point('M56-2',54.9,36.5,false),c=point('ABAGI',54.7,36.8),d=point('NIMTA',54.5,37.1);
const route={points:[a,b,c,d],segments:[[a,b,c,d]],gaps:[],unresolved:[],airwayNames:[],ambiguous:[],skipped:[],expandedAirways:['M56'],distanceNm:50};
const link=buildWindyPlannerLink(route);
assert(link.url.startsWith('https://www.windy.com/distance/55.1,36.2;'));
assert(link.url.includes('54.7,36.8'));
assert(link.verticesSent>=3);
assert(link.maxDeviationNm<=1);
const gpx=makeRouteGpx(route);
assert(gpx.includes('<trkpt lat="54.900000" lon="36.500000"></trkpt>'));
assert(gpx.includes('<name>ABAGI</name>'));
assert(!gpx.includes('<name>M56-2</name>'));
assert.equal((gpx.match(/<trkpt /g)||[]).length,4);
assert.throws(()=>buildWindyPlannerLink({...route,gaps:[{from:'A',to:'B',distanceNm:10,reason:'wrong'}]}),/разрывы/);
assert.throws(()=>makeRouteGpx({...route,airwayNames:['N50']}),/неподтверждённые трассы/);
assert.throws(()=>makeRouteGpx({...route,ambiguous:['ZG']}),/неоднозначные идентификаторы/);
assert.throws(()=>buildWindyPlannerLink(route,30),/слишком длинный/);
// Keep all named points even when aggressively simplifying a nearly straight track.
const collinear=[point('FIRST',40,20),...Array.from({length:250},(_,i)=>point('ATS-'+i,40+(i+1)*.0001,20+(i+1)*.0002,false)),point('MID',40.03,20.06),point('LAST',40.04,20.08)];
const compressed=simplifyTrack(collinear,1);
assert(compressed.points.some(p=>p.ident==='MID'));
assert(compressed.points.some(p=>p.ident==='LAST'));
// Hemisphere / dateline validation + escape output names.
const dd=point('A&B',10,179.9),ee=point('END',10.1,-179.8);
const dateline={...route,points:[dd,ee],segments:[[dd,ee]]};
assert(buildWindyPlannerLink(dateline).url.includes('179.9'));
assert(makeRouteGpx(dateline).includes('<name>A&amp;B</name>'));
console.log('Windy native planner handoff / GPX tests passed');

// Export partial geometry as independent GPX track segments without fake connecting legs.
const first=[a,b],last=[c,d];
const gapRoute={...route,points:[a,b,c,d],segments:[first,last],gaps:[{from:'M56-2',to:'ABAGI',distanceNm:55,reason:'ATS not confirmed'}],unresolved:['XWXYZ'],airwayNames:['B105']};
assert(routeIssues(gapRoute).some(s=>s.includes('M56-2 → ABAGI')));
assert.throws(()=>makeRouteGpx(gapRoute),/Полный маршрут не подтверждён/);
const partial=makeRouteGpx(gapRoute,{allowPartial:true});
assert.equal((partial.match(/<trkseg>/g)||[]).length,2,'partial GPX must have disconnected segments');
assert.equal((partial.match(/<trkpt /g)||[]).length,4);
assert(partial.includes('PARTIAL'));
assert(partial.includes('XWXYZ'));
const onlyPart=buildPartialWindyPlannerLink(gapRoute);
assert.equal(onlyPart.from,'ABAGI');
assert.equal(onlyPart.to,'NIMTA');
assert(!onlyPart.url.includes('55.1,36.2'),'must not connect unknown gap to previous segment');
// A duplicated identifier always needs deliberate acceptance by the pilot.
const ambiguity={...route,ambiguous:['ZG']};
assert.throws(()=>makeRouteGpx(ambiguity,{allowPartial:true}),/Проверь координаты/);
assert.equal((makeRouteGpx(ambiguity,{allowPartial:true,acceptAmbiguous:true}).match(/<trkseg>/g)||[]).length,1);
assert.equal(buildWindyPlannerLink(ambiguity,3500,true).verticesSent>=3,true);
assert.throws(()=>buildPartialWindyPlannerLink(ambiguity),/Сначала проверь координаты/);
// A broken route with no usable leg must not create a fictitious track.
const isolated={...route,segments:[[a],[d]],gaps:[{from:'TOGMO',to:'NIMTA',distanceNm:200,reason:'missing'}]};
assert.throws(()=>makeRouteGpx(isolated,{allowPartial:true}),/Нет ни одного подтверждённого отрезка/);
console.log('PASS: safe partial GPX, longest-segment planner link and explicit FIX acknowledgement');
