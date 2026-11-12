/** GPX export of verified portions of a user-supplied ICAO route. */
import type {ParsedRoute,RoutePoint} from './navdb';

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
/** Minimal GPX route export: only fixes named by the user, never airway vertices.
 * Separate <rte> elements keep disconnected verified legs from being linked.
 * Windy's import behavior is version-dependent; this is standard GPX 1.1.
 */
export function makeRouteGpx(route:ParsedRoute,options:{allowPartial?:boolean;acceptAmbiguous?:boolean}={}):string {
  const segments=verifiedSegments(route);
  if(!segments.length)throw Error('Нет подтверждённых участков маршрута для GPX');
  const partial=segments.length!==1||route.gaps.length>0||route.unresolved.length>0||route.airwayNames.length>0||route.ambiguous.length>0;
  if(partial&&!options.allowPartial)throw Error('Маршрут неполный; выбери частичный экспорт');
  if(route.ambiguous.length&&!options.acceptAmbiguous)throw Error('Неоднозначные координаты требуют проверки');
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const fmt=(n:number)=>n.toFixed(7);
  const namedSegments=segments.map(segment=>segment.filter(p=>p.showLabel && p.type!=='ATS' && !p.synthetic && valid(p))
    .filter((p,i,all)=>i===0 || p.ident!==all[i-1].ident || Math.abs(p.lat-all[i-1].lat)>1e-6 || Math.abs(p.lon-all[i-1].lon)>1e-6))
    .filter(s=>s.length>=2);
  if(!namedSegments.length)throw Error('Не найдено непрерывного участка с двумя именованными точками');
  const routes=namedSegments.map((segment,i)=>`<rte><name>${esc((partial?'PARTIAL - ':'')+`Flight route ${i+1}`)}</name>${segment.map(p=>`<rtept lat="${fmt(p.lat)}" lon="${fmt(p.lon)}"><name>${esc(p.ident)}</name></rtept>`).join('')}</rte>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Windy Flight Route Analyzer" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${partial?'PARTIAL - ':''}Flight route (named fixes only)</name><desc>${partial?'Incomplete segments are deliberately separate. ':''}Contains only user-named fixes, not ATS intermediate vertices. For weather visualization, not navigation.</desc></metadata>${routes}</gpx>`;
}
