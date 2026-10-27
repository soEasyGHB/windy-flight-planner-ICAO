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

/** Single contiguous validated track. Callers must never hand off a route with gaps. */
export function verifiedTrack(route:ParsedRoute):RoutePoint[] {
  if(route.gaps.length || route.unresolved.length || route.airwayNames.length || route.ambiguous.length)
    throw Error('В маршруте есть разрывы, нераспознанные трассы или неоднозначные точки. Проверь их перед передачей в Windy.');
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
export function buildWindyPlannerLink(route:ParsedRoute,limit=3500):PlannerLink {
  const original=verifiedTrack(route);
  for(const tolerance of [0,0.1,0.25,0.5,1]) {
    const simplified=simplifyTrack(original,tolerance);
    const coords=simplified.points.map(p=>`${decimal(p.lat)},${decimal(p.lon)}`).join(';');
    const url='https://www.windy.com/distance/'+coords;
    if(url.length<=limit) return {url,verticesOriginal:original.length,
      verticesSent:simplified.points.length,maxDeviationNm:simplified.maxDeviationNm};
  }
  throw Error('Маршрут слишком длинный для безопасной передачи по ссылке (лимит URL). Используй GPX; ни одна точка не была молча отброшена.');
}
function escapeXML(s:string):string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
/** Full lossless geometry for Windy's built-in GPX importer. */
export function makeRouteGpx(route:ParsedRoute):string {
  const points=verifiedTrack(route);
  const out=['<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Windy Flight Route Analyzer" xmlns="http://www.topografix.com/GPX/1/1">',
    '<metadata><name>Flight Route Analyzer</name><desc>Non-certified route visualization; verify AIRAC</desc></metadata>',
    '<trk><name>Flight route</name><trkseg>'];
  for(const p of points) {
    out.push(`  <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">${p.showLabel?`<name>${escapeXML(p.ident)}</name>`:''}</trkpt>`);
  }
  out.push('</trkseg></trk></gpx>');
  return out.join('\n');
}
