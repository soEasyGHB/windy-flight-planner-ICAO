/** Route export and best-effort handoff to the built-in Windy route planner. */
import {nm} from './navdb';
import type {ParsedRoute,RoutePoint} from './navdb';

export interface PlannerRequest {
  params:{coords:{lat:number;lon:number}[];view:'ifr'};
  mapPoints:{ident:string;lat:number;lon:number}[];
  verticesSent:number;partial:boolean;from:string;to:string;
}
const valid=(p:{lat:number;lon:number})=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
const verifiedSegments=(route:ParsedRoute):RoutePoint[][]=>route.segments
  .map(s=>s.filter(valid)).filter(s=>s.length>=2);
export function routeIssues(route:ParsedRoute):string[] {
  const issues:string[]=[];
  if(route.unresolved.length)issues.push('Неизвестные FIX: '+route.unresolved.join(', '));
  if(route.airwayNames.length)issues.push('ATS без подтверждённой геометрии: '+route.airwayNames.join(', '));
  for(const g of route.gaps)issues.push(`Разрыв ${g.from} → ${g.to}: ${g.reason}`);
  if(route.ambiguous.length)issues.push('Неоднозначные координаты: '+route.ambiguous.join(', '));
  if(!verifiedSegments(route).length)issues.push('Нет непрерывного участка с двумя точками');
  return issues;
}
export function buildWindyPlannerRequest(route:ParsedRoute,allowPartial=false):PlannerRequest {
  const segments=verifiedSegments(route);
  if(!segments.length)throw Error('Нет ни одного подтверждённого участка с двумя координатами');
  const partial=route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||
    route.ambiguous.length>0||segments.length!==1;
  if(partial&&!allowPartial)throw Error('Неполный маршрут. Разрешён только экспорт проверенных участков.');
  // Compare length in nautical miles, not vertex count.
  const length=(s:RoutePoint[])=>s.slice(1).reduce((a,p,i)=>a+nm(s[i],p),0);
  const chosen=segments.reduce((best,s)=>length(s)>length(best)?s:best,segments[0]);
  const named=route.points.filter(p=>p.showLabel&&p.type!=='ATS'&&valid(p));
  const seen=new Set<string>();
  const mapPoints=named.filter(p=>{const key=`${p.ident}:${p.lat.toFixed(5)}:${p.lon.toFixed(5)}`;
    if(seen.has(key))return false;seen.add(key);return true;})
    .map(p=>({ident:p.ident,lat:p.lat,lon:p.lon}));
  return {params:{coords:chosen.map(p=>({lat:p.lat,lon:p.lon})),view:'ifr'},mapPoints,
    verticesSent:chosen.length,partial,from:chosen[0].ident,to:chosen[chosen.length-1].ident};
}
export function makeRouteGpx(route:ParsedRoute,options:{allowPartial?:boolean;acceptAmbiguous?:boolean}={}):string {
  const segments=verifiedSegments(route);
  if(!segments.length)throw Error('Нет подтверждённых участков маршрута для GPX');
  const partial=segments.length!==1||route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||route.ambiguous.length>0;
  if(partial&&!options.allowPartial)throw Error('Маршрут неполный; выбери частичный экспорт');
  if(route.ambiguous.length&&!options.acceptAmbiguous)throw Error('Неоднозначные координаты требуют проверки');
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const f=(n:number)=>n.toFixed(7);
  const named=route.points.filter(p=>p.showLabel&&p.type!=='ATS'&&valid(p));
  const wpts=named.map(p=>`<wpt lat="${f(p.lat)}" lon="${f(p.lon)}"><name>${esc(p.ident)}</name></wpt>`).join('\n');
  const tracks=segments.map(segment=>`<trkseg>${segment.map(p=>`<trkpt lat="${f(p.lat)}" lon="${f(p.lon)}"><name>${esc(p.ident)}</name></trkpt>`).join('')}</trkseg>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Windy Flight Route Analyzer" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${partial?'PARTIAL — ':''}Flight Route</name><desc>${partial?'PARTIAL: unverified route legs omitted.':'Route geometry from imported navdata.'} Not for navigation.</desc></metadata>${wpts}<trk><name>${partial?'PARTIAL — ':''}Flight route</name>${tracks}</trk></gpx>`;
}
