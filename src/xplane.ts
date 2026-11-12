/** X-Plane earth_fix / earth_nav / earth_awy parser, for off-line converter tests.
 * Production navdata ingestion is performed by tools/build_navdata.py.
 */
export interface XPlaneFix {ident:string;lat:number;lon:number;region:string;type:'FIX'|'NDB'|'VOR/DME'}
export interface XPlaneAirway {airway:string;from:string;to:string;fromLat:number;fromLon:number;toLat:number;toLon:number}
const valid=(lat:number,lon:number)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
const rows=(text:string)=>text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')&&!/^(I|A|99)$/.test(line))
  .filter(line=>!/^\d{3,4}\s+Version\b/i.test(line)).map(line=>line.split(/\s+/));
export function xplaneCycle(text:string):string|null {return text.match(/data\s+cycle\s+(\d{4})/i)?.[1]??null;}
export function assertMatchingCycles(texts:string[]):string|null {
  const cycles=texts.map(xplaneCycle).filter((v):v is string=>v!==null);
  if(new Set(cycles).size>1)throw Error('X-Plane navdata files have mismatched AIRAC cycles');
  return cycles[0]??null;
}
export function parseXPlaneFix(text:string):XPlaneFix[]{
  const result:XPlaneFix[]=[];
  for(const r of rows(text)){
    const lat=Number(r[0]),lon=Number(r[1]),ident=r[2]?.toUpperCase();
    if(!valid(lat,lon)||!ident||!/^[A-Z0-9]{2,8}$/.test(ident))continue;
    result.push({lat,lon,ident,region:r[3]??'',type:'FIX'});
  }
  return result;
}
export function parseXPlaneNav(text:string):XPlaneFix[]{
  const result:XPlaneFix[]=[];
  for(const r of rows(text)){
    const kind=Number(r[0]),lat=Number(r[1]),lon=Number(r[2]),ident=r[7]?.toUpperCase();
    if(![2,3,12,13].includes(kind)||!valid(lat,lon)||!ident||!/^[A-Z0-9]{2,8}$/.test(ident))continue;
    result.push({lat,lon,ident,region:r[8]??'',type:kind===2?'NDB':'VOR/DME'});
  }
  return result;
}
/** Compatible with the legacy X-Plane format with explicit coordinates. */
export function parseXPlaneAirways(text:string):XPlaneAirway[]{
  const result:XPlaneAirway[]=[];
  for(const r of rows(text)){
    if(r.length<10)continue;
    const fromLat=Number(r[1]),fromLon=Number(r[2]),toLat=Number(r[4]),toLon=Number(r[5]);
    if(!valid(fromLat,fromLon)||!valid(toLat,toLon))continue;
    for(const airway of (r[9]??'').split('-'))if(/^[A-Z0-9]{2,8}$/.test(airway))
      result.push({airway,from:r[0],to:r[3],fromLat,fromLon,toLat,toLon});
  }
  return result;
}
