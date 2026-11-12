/** Windy Distance & Planning handoff: URL uses the publicly documented
 * /distance/lat,lon;lat,lon syntax. No private Windy API, no file upload.
 * Never invent segments to bridge gaps in uncertain navdata.
 */
import type { ParsedRoute, RoutePoint } from './navdb';

export interface PlannerLink {
  url: string;
  verticesOriginal: number;
  verticesSent: number;
  maxDeviationNm: number;
}

const R = Math.PI / 180;
const rad = (d: number) => d * R;

function haversine(a: RoutePoint, b: RoutePoint): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 3440.065 * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
}
function bearing(a:RoutePoint,b:RoutePoint):number {
  const p1=rad(a.lat),p2=rad(b.lat),lon=rad(b.lon-a.lon);
  return Math.atan2(Math.sin(lon)*Math.cos(p2),
    Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(lon));
}
/** Cross-track shortest distance to the *finite* great-circle segment in NM. */
function segmentDistance(a:RoutePoint,b:RoutePoint,p:RoutePoint):number {
  const dab=haversine(a,b);
  if(dab<0.001) return haversine(a,p);
  const dap=haversine(a,p);
  const theta=bearing(a,p)-bearing(a,b);
  const xt=Math.asin(Math.max(-1,Math.min(1,Math.sin(dap/3440.065)*Math.sin(theta))));
  const cosXt=Math.cos(xt);
  const at=Math.acos(Math.max(-1,Math.min(1,Math.cos(dap/3440.065)/Math.max(1e-12,cosXt))))*3440.065;
  // Behind the start or beyond the end of this arc -> distance to endpoint.
  if(Math.cos(theta)<0) return dap;
  if(at>dab) return haversine(b,p);
  return Math.abs(xt)*3440.065;
}

/** Explain exactly what prevents the full route handoff. */
export function routeIssues(route:ParsedRoute):string[] {
  const issues:string[]=[];
  if(route.gaps.length)issues.push(`разрывы: ${route.gaps.map(g=>`${g.from} → ${g.to} (${g.reason})`).join('; ')}`);
  if(route.unresolved.length)issues.push(`неизвестные точки: ${route.unresolved.join(', ')}`);
  if(route.airwayNames.length)issues.push(`неподтверждённые трассы: ${route.airwayNames.join(', ')}`);
  if(route.ambiguous.length)issues.push(`неоднозначные идентификаторы: ${route.ambiguous.join(', ')}`);
  if(!route.segments.some(s=>s.length>=2))issues.push('отсутствует участок минимум с двумя координатами');
  return issues;
}
/** Single contiguous validated track. No silent continuation across gaps. */
export function verifiedTrack(route:ParsedRoute,acceptAmbiguous=false):RoutePoint[] {
  if(route.gaps.length || route.unresolved.length || route.airwayNames.length || (route.ambiguous.length && !acceptAmbiguous))
    throw Error('Полный маршрут не подтверждён: '+routeIssues(route).join(' | '));
  if(route.segments.length!==1 || route.segments[0].length<2)
    throw Error('Необходимо не менее двух точек одного подтверждённого непрерывного маршрута.');
  const points=route.segments[0];
  if(points.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180))
    throw Error('У точки маршрута неверные координаты.');
  return points;
}

/** RDP reduction for the URL, never removing a named OFP point. */
export function simplifyTrack(points:RoutePoint[], toleranceNm:number):{points:RoutePoint[],maxDeviationNm:number} {
  if(points.length<2) return {points:[...points],maxDeviationNm:0};
  const kept=new Set<number>([0,points.length-1]);
  for(let i=0;i<points.length;i++) if(points[i].showLabel)kept.add(i);
  const anchors=[...kept].sort((a,b)=>a-b);
  function recurse(begin:number,end:number):void {
    if(end-begin<2)return;
    let longest=-1,index=-1;
    for(let i=begin+1;i<end;i++) {
      const d=segmentDistance(points[begin],points[end],points[i]);
      if(d>longest){longest=d;index=i;}
    }
    if(index>=0&&longest>toleranceNm){kept.add(index);recurse(begin,index);recurse(index,end);}
  }
  for(let i=1;i<anchors.length;i++) recurse(anchors[i-1],anchors[i]);
  const indexes=[...kept].sort((a,b)=>a-b);
  let maxDeviationNm=0;
  for(let i=1;i<indexes.length;i++) {
    for(let j=indexes[i-1]+1;j<indexes[i];j++)
      maxDeviationNm=Math.max(maxDeviationNm,segmentDistance(points[indexes[i-1]],points[indexes[i]],points[j]));
  }
  return {points:indexes.map(i=>points[i]),maxDeviationNm};
}

function decimal(n:number):string {
  // A decimal is mandatory even for whole numbers in Windy's URL format.
  const x=n.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
  return x.includes('.')?x:x+'.0';
}

/** Long URL => explicit error rather than silently truncating essential waypoints. */
export function buildWindyPlannerLink(route:ParsedRoute,limit=3500,acceptAmbiguous=false):PlannerLink {
  const original=verifiedTrack(route,acceptAmbiguous);
  for(const tolerance of [0,0.1,0.25,0.5,1]) {
    const simplified=simplifyTrack(original,tolerance);
    const coords=simplified.points.map(p=>`${decimal(p.lat)},${decimal(p.lon)}`).join(';');
    const url='https://www.windy.com/distance/'+coords;
    if(url.length<=limit) return {url,verticesOriginal:original.length,
      verticesSent:simplified.points.length,maxDeviationNm:simplified.maxDeviationNm};
  }
  throw Error('Маршрут слишком длинный для безопасной передачи по ссылке (лимит URL). Используй GPX; ни одна точка не была молча отброшена.');
}
/** Select the longest separately verified part; never join disconnected legs. */
export function longestAvailableSegment(route:ParsedRoute):RoutePoint[] {
  let best:RoutePoint[]=[];
  let bestNm=-1;
  for(const segment of route.segments){
    if(segment.length<2)continue;
    const dist=segment.slice(1).reduce((n,p,i)=>n+haversine(segment[i],p),0);
    if(dist>bestNm){bestNm=dist;best=segment;}
  }
  if(best.length<2)throw Error('Нет непрерывного подтверждённого участка минимум из двух точек: '+routeIssues(route).join(' | '));
  return best;
}
/** Deliberate partial handoff: one visible safe segment, never the entire broken route. */
export function buildPartialWindyPlannerLink(route:ParsedRoute,limit=3500,acceptAmbiguous=false):PlannerLink & {from:string;to:string} {
  if(route.ambiguous.length&&!acceptAmbiguous)
    throw Error('Сначала проверь координаты и подтверди неоднозначные точки: '+route.ambiguous.join(', '));
  const segment=longestAvailableSegment(route);
  const complete:{[K in keyof ParsedRoute]:ParsedRoute[K]}={...route,points:segment,segments:[segment],gaps:[],unresolved:[],airwayNames:[],ambiguous:[]};
  const link=buildWindyPlannerLink(complete,limit,true);
  return {...link,from:segment[0].ident,to:segment[segment.length-1].ident};
}
function escapeXML(s:string):string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export interface GpxOptions {
  /** Store separately validated legs as separate trkseg, never invent edges. */
  allowPartial?:boolean;
  /** Explicit user acknowledgement; does not validate alternative coordinates. */
  acceptAmbiguous?:boolean;
}
/** GPX keeps every verified vertex. Partial files contain separate trkseg elements
 * and prominently state they are NOT the whole route. */
export function makeRouteGpx(route:ParsedRoute,options:GpxOptions={}):string {
  const {allowPartial=false,acceptAmbiguous=false}=options;
  const full=route.gaps.length===0&&route.unresolved.length===0&&route.airwayNames.length===0&&route.segments.length===1;
  if(!allowPartial)verifiedTrack(route,acceptAmbiguous);
  if(route.ambiguous.length&&!acceptAmbiguous)
    throw Error('Проверь координаты и подтверди неоднозначные FIX: '+route.ambiguous.join(', '));
  const segments=allowPartial ? route.segments.filter(s=>s.length>=2) : [verifiedTrack(route,acceptAmbiguous)];
  if(!segments.length)throw Error('Нет ни одного подтверждённого отрезка для GPX. '+routeIssues(route).join(' | '));
  for(const s of segments)for(const p of s) {
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)
      throw Error('Некорректные координаты '+p.ident);
  }
  const partial=!full;
  const uncertain=route.ambiguous.length>0;
  const caution=partial||uncertain
    ?(partial?'PARTIAL: disconnected legs are NOT joined. ':'UNVERIFIED FIX coordinates. ')+routeIssues(route).join(' | ')
    :'Non-certified route visualization; verify AIRAC';
  const out=['<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Windy Flight Route Analyzer" xmlns="http://www.topografix.com/GPX/1/1">',
    `<metadata><name>${partial?'PARTIAL — ':uncertain?'UNVERIFIED — ':''}Flight Route Analyzer</name><desc>${escapeXML(caution)}</desc></metadata>`];
  // Keep isolated labeled fixes as waypoints, never connect them by a fictitious leg.
  if(allowPartial) {
    const inSegments=new Set(segments.flat());
    for(const p of route.points) if(p.showLabel&&!inSegments.has(p))
      out.push(`<wpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><name>${escapeXML(p.ident)}</name></wpt>`);
  }
  out.push(`<trk><name>${partial?'PARTIAL — ':uncertain?'UNVERIFIED — ':''}Flight route</name>`);
  for(const segment of segments) {
    out.push('<trkseg>');
    for(const p of segment)
      out.push(`  <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">${p.showLabel?`<name>${escapeXML(p.ident)}</name>`:''}</trkpt>`);
    out.push('</trkseg>');
  }
  out.push('</trk></gpx>');
  return out.join('\n');
}
