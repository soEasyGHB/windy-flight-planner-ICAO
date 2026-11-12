/** Build a user-clickable URL for Windy's native IFR route planner.
 *
 * Format tested interactively by the user in Windy:
 * https://www.windy.com/route-planner/ifr/LAT,LON;LAT,LON?YYYY-MM-DD-HH
 *
 * Current URL time uses a three-hour UTC forecast slot. The GPX file stores
 * the precise departure UTC independently; this URL does NOT carry exact minutes.
 * Unknown route gaps must never be bridged to make a single polyline.
 */
import {nm} from './navdb';
import type {ParsedRoute,RoutePoint} from './navdb';
import {departureIsoUtc} from './routeGpx';

export type WindyPlannerLink={
  url:string;
  requestedDepartureUtc:string;
  urlTimeUtc:string;
  roundedTime:boolean;
  partial:boolean;
  from:string;
  to:string;
  pointsSent:number;
};

const THREE_HOURS_MS=3*60*60*1000;
const MAX_URL_LENGTH=6000;
const valid=(p:RoutePoint)=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
const segmentDistance=(segment:RoutePoint[])=>segment.slice(1).reduce((sum,p,i)=>sum+nm(segment[i],p),0);
const coordinate=(x:number)=>{
  const rounded=Number(x.toFixed(5)).toString();
  return rounded.includes('.')?rounded:rounded+'.0';
};

/** Keep the longest verified continuous route fragment if there are gaps. */
export function buildWindyPlannerUrl(route:ParsedRoute,departureUtc:string):WindyPlannerLink {
  if(departureIsoUtc(departureUtc.slice(0,10),departureUtc.slice(11,16))!==departureUtc)
    throw Error('Некорректные дата/время вылета UTC');
  // Invalid coordinates invalidate a segment; do not filter points and bridge over them.
  const segments=route.segments.filter(segment=>segment.length>=2 && segment.every(valid));
  if(!segments.length)throw Error('Нет подтверждённого участка маршрута с двумя точками');
  const selected=segments.reduce((best,s)=>segmentDistance(s)>segmentDistance(best)?s:best,segments[0]);
  const requestedMs=Date.parse(departureUtc);
  const roundedMs=Math.round(requestedMs/THREE_HOURS_MS)*THREE_HOURS_MS;
  const urlTimeUtc=new Date(roundedMs).toISOString().slice(0,13).replace('T','-');
  const coords=selected.map(p=>`${coordinate(p.lat)},${coordinate(p.lon)}`).join(';');
  const url=`https://www.windy.com/route-planner/ifr/${coords}?${urlTimeUtc}`;
  if(url.length>MAX_URL_LENGTH)
    throw Error('Маршрут слишком длинный для URL Windy. Используй экспорт GPX.');
  return {
    url,requestedDepartureUtc:departureUtc,urlTimeUtc,roundedTime:roundedMs!==requestedMs,
    partial:route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||route.ambiguous.length>0||segments.length!==1,
    from:selected[0].ident,to:selected[selected.length-1].ident,pointsSent:selected.length
  };
}
