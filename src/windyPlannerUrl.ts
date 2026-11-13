/** Build a route URL for Windy's native IFR planner.
 *
 * The public Windy URL documentation describes 3-hour forecast slots, but the
 * user requested a separate nearest-HOUR experiment. This function produces
 * valid URL *syntax* (YYYY-MM-DD-HH), not a guarantee that arbitrary hours are
 * accepted as ETD by the native planner. Exact UTC is retained in GPX.
 * Never bridge gaps in unresolved navigation data.
 */
import {nm} from './navdb';
import type {ParsedRoute,RoutePoint} from './navdb';
import {departureIsoUtc} from './routeGpx';

export type WindyPlannerLink={
  url:string;
  requestedDepartureUtc:string;
  urlTimeUtc:string;
  roundedDepartureUtc:string;
  outsideDocumentedSlot:boolean;
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

/** Do not silently remove invalid points from a segment (would bridge a gap). */
export function selectWindyRouteSegment(route:ParsedRoute):{points:RoutePoint[];partial:boolean}{
  const segments=route.segments.filter(segment=>segment.length>=2&&segment.every(valid));
  if(!segments.length)throw Error('Нет подтверждённого участка маршрута с двумя точками');
  const selected=segments.reduce((best,s)=>segmentDistance(s)>segmentDistance(best)?s:best,segments[0]);
  const partial=route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||route.ambiguous.length>0||segments.length!==1;
  return {points:selected,partial};
}

export function buildWindyPlannerUrl(route:ParsedRoute,departureUtc:string):WindyPlannerLink {
  if(departureIsoUtc(departureUtc.slice(0,10),departureUtc.slice(11,16))!==departureUtc)
    throw Error('Некорректные дата/время вылета UTC');
  const {points,partial}=selectWindyRouteSegment(route);
  const millis=Date.parse(departureUtc);
  // Nearest full UTC hour: 05:01 -> 05:00, 05:31 -> 06:00;
  // rounding 23:31 crosses correctly into the next UTC calendar day.
  const roundedMillis=Math.floor((millis+30*60*1000)/(60*60*1000))*(60*60*1000);
  const roundedDepartureUtc=new Date(roundedMillis).toISOString();
  const urlTimeUtc=roundedDepartureUtc.slice(0,13).replace('T','-');
  const outsideDocumentedSlot=new Date(roundedMillis).getUTCHours()%3!==0;
  const coords=points.map(p=>`${coordinate(p.lat)},${coordinate(p.lon)}`).join(';');
  const url=`https://www.windy.com/route-planner/ifr/${coords}?${urlTimeUtc}`;
  if(url.length>MAX_URL_LENGTH)
    throw Error('Маршрут слишком длинный для URL Windy. Используй экспорт GPX.');
  return {
    url,requestedDepartureUtc:departureUtc,urlTimeUtc,roundedDepartureUtc,outsideDocumentedSlot,
    partial,from:points[0].ident,to:points[points.length-1].ident,pointsSent:points.length
  };
}
