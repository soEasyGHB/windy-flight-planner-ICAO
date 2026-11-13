/** Experimental in-page route handoff.
 * Windy officially documents `store.set('timestamp', ms)` as a weather-map
 * operation and `redrawFinished` as a weather redraw event. Neither is a
 * public API for setting the built-in route planner's departure time.
 * The rplanner payload below is an internal, best-effort integration only.
 */
import type {ParsedRoute} from './navdb';
import {departureIsoUtc} from './routeGpx';
import {selectWindyRouteSegment} from './windyPlannerUrl';

export type NativePlannerHandoff={
  params:{coords:Array<{lat:number;lon:number}>;view:'ifr'};
  timestampMs:number;
  departureUtc:string;
  partial:boolean;
  verticesSent:number;
};

export function buildNativePlannerHandoff(route:ParsedRoute,departureUtc:string):NativePlannerHandoff {
  if(departureIsoUtc(departureUtc.slice(0,10),departureUtc.slice(11,16))!==departureUtc)
    throw Error('Некорректные дата/время вылета UTC');
  const {points,partial}=selectWindyRouteSegment(route);
  return {
    params:{coords:points.map(p=>({lat:p.lat,lon:p.lon})),view:'ifr'},
    timestampMs:Date.parse(departureUtc),departureUtc,partial,verticesSent:points.length
  };
}
