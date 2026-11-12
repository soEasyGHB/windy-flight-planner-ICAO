/** Browser-safe GPX delivery. Keep generation independent of Windy API and async data loading. */
import type {ParsedRoute} from './navdb';
import {makeRouteGpx} from './routeGpx';

export const GPX_MIME='application/gpx+xml';
export type GpxPayload={xml:string;filename:string;partial:boolean;pointCount:number;routeCount:number};

export function prepareGpxPayload(route:ParsedRoute):GpxPayload {
  const xml=makeRouteGpx(route,{allowPartial:true,acceptAmbiguous:true});
  const pointCount=(xml.match(/<rtept /g)||[]).length;
  const routeCount=(xml.match(/<rte>/g)||[]).length;
  const partial=route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||
    route.ambiguous.length>0||route.segments.filter(s=>s.length>=2).length!==1;
  return {xml,filename:partial?'windy-route-PARTIAL.gpx':'windy-flight-route.gpx',partial,pointCount,routeCount};
}

/** Use a stable Blob URL for a real anchor click. Do not create it inside an async callback. */
export function createGpxHref(item:GpxPayload, api:Pick<typeof URL,'createObjectURL'>=URL):string {
  try {
    return api.createObjectURL(new Blob([item.xml],{type:GPX_MIME+';charset=utf-8'}));
  } catch (_err) {
    // Rare embedded browsers disable object URLs. For small GPX files this
    // retains a direct user-clickable link without needing network access.
    return `data:${GPX_MIME};charset=utf-8,${encodeURIComponent(item.xml)}`;
  }
}

/** Optional explicit iPad sharing. Some embedded browsers don't support File or file sharing. */
export function makeGpxShareFile(item:GpxPayload):File|null {
  if(typeof File!=='function')return null;
  return new File([item.xml],item.filename,{type:GPX_MIME});
}

/** Direct download when Web Share is unavailable. Must be called during a user click. */
export function triggerGpxDownload(href:string,filename:string,doc:Document=document):void {
  if(!href || !filename)throw Error('GPX URL or filename is missing');
  const link=doc.createElement('a');
  link.href=href;
  link.download=filename;
  link.rel='noopener';
  link.style.display='none';
  doc.body.appendChild(link);
  try {link.click();} finally {link.remove();}
}
