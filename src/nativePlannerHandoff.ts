/** Best-effort handoff to Windy's built-in route planner.
 * The internal rplanner event is not a public GPX import API; only coordinates
 * and an IFR view are forwarded, as in this project's pre-v1.0 versions.
 * Windy forecast time is set separately through @windy/store.
 * A documented /distance URL is provided as a user-clickable backup.
 * Source: https://community.windy.com/topic/77/windy-com-url-parameters
 */
import {nm} from './navdb';
import type {ParsedRoute,RoutePoint} from './navdb';
import {departureIsoUtc} from './routeGpx';

export type WindyPlannerHandoff={
  params:{coords:Array<{lat:number;lon:number}>;view:'ifr'};
  timestampMs:number;
  departureUtc:string;
  fallbackUrl:string;
  fallbackTimeUtc:string;
  partial:boolean;
  from:string;
  to:string;
  verticesSent:number;
};
const valid=(p:{lat:number;lon:number})=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
const segNm=(points:RoutePoint[])=>points.slice(1).reduce((sum,p,i)=>sum+nm(points[i],p),0);
function coordinate(x:number):string {
  const rounded=Number(x.toFixed(5)).toString();
  return rounded.includes('.')?rounded:rounded+'.0';
}

/** Select the longest verified continuous part of a route (never bridge gaps).
 * A 3-hour UTC rounded URL time is only a Windy *forecast map* time, not the
 * exact planner ETD. The exact UTC is retained in the downloadable GPX.
 */
export function buildNativePlannerHandoff(route:ParsedRoute,departureUtc:string):WindyPlannerHandoff {
  if(departureIsoUtc(departureUtc.slice(0,10),departureUtc.slice(11,16))!==departureUtc)
    throw Error('Некорректные дата/время вылета UTC');
  const segments=route.segments.map(segment=>segment.filter(valid)).filter(segment=>segment.length>=2);
  if(!segments.length)throw Error('Нет подтверждённого участка маршрута с двумя точками');
  const selected=segments.reduce((best,s)=>segNm(s)>segNm(best)?s:best,segments[0]);
  const coords=selected.map(p=>({lat:p.lat,lon:p.lon}));
  const partial=route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||route.ambiguous.length>0||segments.length!==1;
  const timestampMs=Date.parse(departureUtc);
  const snapped=new Date(Math.round(timestampMs/(3*3600000))*(3*3600000));
  const fallbackTimeUtc=snapped.toISOString().slice(0,13).replace('T','-');
  const midpoint=selected[Math.floor(selected.length/2)];
  const pathname=coords.map(p=>`${coordinate(p.lat)},${coordinate(p.lon)}`).join(';');
  const fallbackUrl=`https://www.windy.com/distance/${pathname}?${fallbackTimeUtc},${coordinate(midpoint.lat)},${coordinate(midpoint.lon)},5`;
  // The backup link has a browser URL-length limit, but the in-page event does not.
  // Never refuse a valid internal handoff merely because the backup is too long.
  const safeFallbackUrl=fallbackUrl.length<=6000?fallbackUrl:'';
  return {params:{coords,view:'ifr'},timestampMs,departureUtc,fallbackUrl:safeFallbackUrl,fallbackTimeUtc,
    partial,from:selected[0].ident,to:selected[selected.length-1].ident,verticesSent:coords.length};
}
