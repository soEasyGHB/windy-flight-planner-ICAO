/** Public Windy Distance & Planning URL handoff (no GPX upload, API key or server).
 * Source: https://community.windy.com/topic/77/windy-com-url-parameters
 * The URL accepts a single, ordered polyline only; gaps must never be joined.
 */
import type {ParsedRoute} from './navdb';
import {buildWindyPlannerRequest} from './routePlanner';

export interface WindyDistanceLink {
  url:string;
  partial:boolean;
  verticesSent:number;
  from:string;
  to:string;
}

function coordinate(value:number):string {
  if(!Number.isFinite(value))throw Error('Координата не является числом');
  // Windy requires a decimal part even for integer coordinates.
  const rounded=Number(value.toFixed(5)).toString();
  return rounded.includes('.') ? rounded : `${rounded}.0`;
}

/** Open only a verified contiguous segment, never pretend a partial route is full.
 * No arbitrary thinning: dropping vertices would change the flight path.
 */
export function buildWindyDistanceLink(route:ParsedRoute,allowPartial=false):WindyDistanceLink {
  const planner=buildWindyPlannerRequest(route,allowPartial);
  const coordinates=planner.params.coords;
  if(coordinates.length<2)throw Error('Недостаточно точек для открытия маршрута Windy');
  const url='https://www.windy.com/distance/'+coordinates
    .map(({lat,lon})=>`${coordinate(lat)},${coordinate(lon)}`).join(';');
  // Very large URL paths may be refused by browsers/proxies: do not silently omit fixes.
  if(url.length>6000)throw Error('Маршрут слишком длинный для ссылки Windy. Используй GPX или внутренний планировщик; точки не сокращались.');
  return {url,partial:planner.partial,verticesSent:coordinates.length,from:planner.from,to:planner.to};
}
