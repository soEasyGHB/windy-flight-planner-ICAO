/** Build a user-clickable URL for Windy's native IFR route planner.
 *
 * Confirmed route-planner prefix: /route-planner/ifr/LAT,LON;LAT,LON.
 * The time suffix YYYY-MM-DD-HH:mm is EXPERIMENTAL, not user-verified.
 * Windy documents only three-hour UTC slots (YYYY-MM-DD-HH), so the
 * site may ignore or reject minute precision. GPX keeps the exact UTC.
 * Unknown route gaps must never be bridged to make a single polyline.
 */
import {nm} from './navdb';
import type {ParsedRoute,RoutePoint} from './navdb';
import {departureIsoUtc} from './routeGpx';

export type WindyPlannerLink={
  url:string;
  requestedDepartureUtc:string;
  urlTimeUtc:string;
  experimentalTime:boolean;
  partial:boolean;
  from:string;
  to:string;
  pointsSent:number;
};

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
  // Preserve the Windy-confirmed format for exact 3-hour slots. For all other
  // times, send the precise HH:mm experimentally; never round a user's ETD.
  const hours=Number(departureUtc.slice(11,13));
  const minutes=Number(departureUtc.slice(14,16));
  const experimentalTime=minutes!==0 || hours%3!==0;
  const urlTimeUtc=departureUtc.slice(0,experimentalTime?16:13).replace('T','-');
  const coords=selected.map(p=>`${coordinate(p.lat)},${coordinate(p.lon)}`).join(';');
  const url=`https://www.windy.com/route-planner/ifr/${coords}?${urlTimeUtc}`;
  if(url.length>MAX_URL_LENGTH)
    throw Error('Маршрут слишком длинный для URL Windy. Используй экспорт GPX.');
  return {
    url,requestedDepartureUtc:departureUtc,urlTimeUtc,experimentalTime,
    partial:route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||route.ambiguous.length>0||segments.length!==1,
    from:selected[0].ident,to:selected[selected.length-1].ident,pointsSent:selected.length
  };
}
