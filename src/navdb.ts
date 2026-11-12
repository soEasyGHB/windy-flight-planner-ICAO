// Sources: OurAirports (public domain), euvl/aviation-waypoints (MIT).
// ICAO licensed dataset is NOT bundled. Import licensed exports only where permitted.
export type NavPoint = { ident: string; lat: number; lon: number; type: string; source: string };
export type RoutePoint = NavPoint & { index: number; showLabel: boolean; synthetic?: boolean };
export type RouteGap = {from:string;to:string;reason:string;distanceNm:number};
export type ParsedRoute = { points: RoutePoint[]; segments: RoutePoint[][]; gaps: RouteGap[]; unresolved: string[]; skipped: string[]; airwayNames: string[]; expandedAirways: string[]; ambiguous: string[]; distanceNm: number };
export type AirwayVertex = { airway:string; segment:string; seq:number; lat:number; lon:number };
const AIRWAYS:Map<string,Map<string,AirwayVertex[]>>=new Map();
export function airwayCount():number {return AIRWAYS.size;}
const DB: Map<string, NavPoint[]> = new Map();
let sourcesLoaded = 0;
const loadedSourceNames = new Set<string>();
let userLoaded = 0;
const ROOT = 'https://raw.githubusercontent.com/';
const EXTERNAL = [
  { name: 'OurAirports airports', url: ROOT + 'davidmegginson/ourairports-data/main/airports.csv', kind: 'airports' },
  { name: 'OurAirports navaids', url: ROOT + 'davidmegginson/ourairports-data/main/navaids.csv', kind: 'navaids' },
  { name: 'Aviation waypoints (MIT)', url: ROOT + 'euvl/aviation-waypoints/master/waypoints.json', kind: 'waypoints' },
];
export const sourceList = EXTERNAL.map(x => x.name);
export function totalPoints(): number { return [...DB.values()].reduce((a, b) => a + b.length, 0); }
export function sourceCount(): number { return sourcesLoaded; }
export function userPointCount(): number { return userLoaded; }

function add(ident: unknown, lat: unknown, lon: unknown, type: unknown, source: string) {
  const name = String(ident ?? '').trim().toUpperCase();
  const a = Number(lat), b = Number(lon);
  if (!/^[A-Z0-9_-]{2,12}$/.test(name) || !Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return false;
  const arr = DB.get(name) ?? [];
  if (!arr.some(p => Math.abs(p.lat-a) < .005 && Math.abs(p.lon-b) < .005)) {
    arr.push({ ident:name, lat:a, lon:b, type:String(type || 'FIX'), source });
    DB.set(name, arr);
    return true;
  }
  return false;
}

// Minimal starting example, not an IFR database.
export function loadDemo(): void {
  [['EHAM',52.3086,4.7639],['EGLL',51.4700,-.4543],['LFPG',49.0097,2.5479],
  ['EDDF',50.0379,8.5622],['UUEE',55.9726,37.4146],['LTFM',41.2753,28.7519],
  ['OMDB',25.2528,55.3644],['KJFK',40.6413,-73.7781],['KLAX',33.9416,-118.4085],
  ['FAOR',-26.1392,28.2460],['VHHH',22.3080,113.9185],['WSSS',1.3644,103.9915]]
  .forEach(([id,lat,lon]) => add(id,lat,lon,'AIRPORT','demo (not for navigation)'));
}

// CSV reader handling quoted strings and embedded commas/newlines.
export function csvRows(s: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i=0;i<s.length;i++) {
    const c=s[i];
    if (c==='"') {
      if (quoted && s[i+1]==='"') { field+='"';i++; } else quoted=!quoted;
    } else if (c===',' && !quoted) { row.push(field);field=''; }
    else if ((c==='\n' || c==='\r') && !quoted) {
      if (c==='\r' && s[i+1]==='\n') i++;
      row.push(field);field='';
      if (row.some(v => v.trim())) rows.push(row);
      row=[];
    } else field+=c;
  }
  row.push(field);if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
function column(cols: string[], names: string[]): number {
  const normalized = cols.map(s => s.trim().toLowerCase().replace(/[ _-]/g,''));
  for(const name of names) { const idx=normalized.indexOf(name.replace(/[ _-]/g,''));if(idx>=0) return idx; }
  return -1;
}
export function importCsv(contents: string, source='CSV import'): number {
  const rows=csvRows(contents.replace(/^\uFEFF/,''));if (rows.length<2) throw Error('В CSV нет данных');
  const header=rows[0];
  const i=column(header,['ident','identifier','waypoint','designator','name','icao_code','gps_code','iata_code']);
  const j=column(header,['latitude_deg','latitude','lat','y','latitude_decimal']);
  const k=column(header,['longitude_deg','longitude','lon','long','x','longitude_decimal']);
  const t=column(header,['type','point_type','navaid_type']);
  const icao=column(header,['gps_code','icao_code','ident']);
  if (i<0 || j<0 || k<0) throw Error('Ожидаются столбцы ident/latitude_deg/longitude_deg (или ident/lat/lon). Для GeoPackage примените конвертер.');
  let n=0;
  for(const r of rows.slice(1)) {
    const main = (icao>=0 && r[icao] && /^[A-Z]{4}$/.test(r[icao].trim())) ? r[icao] : r[i];
    if (add(main,r[j],r[k],t>=0?r[t]:'FIX',source)) n++;
    if(main !== r[i] && r[i] && /^[A-Z0-9]{2,6}$/.test(r[i])) if(add(r[i],r[j],r[k],t>=0?r[t]:'FIX',source)) n++;
  }
  if (source==='user file') userLoaded+=n;
  return n;
}
export async function loadOpenSources(onProgress?: (s:string)=>void): Promise<void> {
  const results=await Promise.allSettled(EXTERNAL.map(async src => {
    onProgress?.('Загрузка ' + src.name);
    const res=await fetch(src.url,{cache:'force-cache'});
    if (!res.ok) throw Error(src.name + ': HTTP ' + res.status);
    const payload=await res.text();let count=0;
    if(src.kind==='waypoints') {
      const data=JSON.parse(payload);
      for(const p of data) {
        if(Array.isArray(p.coords) && add(p.name,p.coords[1],p.coords[0],p.type,src.name)) count++;
      }
    } else count=importCsv(payload,src.name);
    if(!loadedSourceNames.has(src.name)){loadedSourceNames.add(src.name);sourcesLoaded++;}
    onProgress?.(src.name + ': +' + count.toLocaleString('ru-RU'));
    return count;
  }));
  const err=results.filter(x => x.status==='rejected') as PromiseRejectedResult[];
  if(err.length) onProgress?.('Недоступны источники: ' + err.map(x=>String(x.reason)).join('; '));
  onProgress?.(`Готово: ${totalPoints().toLocaleString('ru-RU')} точек; источников ${sourcesLoaded}/${EXTERNAL.length}`);
}
/** Fetch static Vercel-hosted CSV snapshot, without any API proxy or server function. */
export async function loadHostedSnapshot(baseUrl: string):Promise<{points:number; airwayVertices:number; cycle:string; generated:string}> {
  const root=new URL(baseUrl.trim());
  if(root.protocol!=='https:')throw Error('Требуется HTTPS адрес сайта Vercel');
  const pathname=root.pathname.replace(/\/$/, '');
  // User should provide the Vercel domain root, not a full navdata file URL.
  if(pathname && pathname!=='/')throw Error('Укажите корень Vercel сайта, например https://my-navdata.vercel.app');
  const url=root.origin+'/navdata/';
  const [metaRes,pRes,aRes]=await Promise.all([
    fetch(url+'manifest.json',{cache:'no-store'}),
    fetch(url+'points.csv',{cache:'no-store'}),
    fetch(url+'airways.csv',{cache:'no-store'})
  ]);
  if(!metaRes.ok||!pRes.ok||!aRes.ok)throw Error('Файлы navdata недоступны на Vercel');
  const meta=await metaRes.json();
  if(meta.status!=='ready')throw Error('База ещё не подготовлена; загрузите earth_*.dat в GitHub');
  const [points,airways]=await Promise.all([pRes.text(),aRes.text()]);
  if(!points.startsWith('ident,latitude_deg,longitude_deg,type')||!airways.startsWith('airway,segment,seq,latitude_deg,longitude_deg'))
    throw Error('Неверный формат CSV. Обновление отменено');
  // Atomically downloaded before mutations. Repeated reloads replace hosted points/airways.
  for(const [key,arr] of DB) {
    const kept=arr.filter(p=>p.source!=='Vercel snapshot');
    if(kept.length)DB.set(key,kept);else DB.delete(key);
  }
  AIRWAYS.clear();
  const num=importCsv(points,'Vercel snapshot');
  const vertices=importAirwaysCsv(airways);
  return {points:num,airwayVertices:vertices,cycle:String(meta.airac_cycle||'не указан'),generated:String(meta.generated_utc||'')};
}

export function importAirwaysCsv(contents:string):number {
  const rows=csvRows(contents.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('CSV воздушных трасс пуст');
  const h=rows[0],ai=column(h,['airway','route','route_name','route_designator']),si=column(h,['segment','segment_id','part','line_id']),qi=column(h,['seq','sequence','order','vertex']),li=column(h,['latitude_deg','latitude','lat']),lo=column(h,['longitude_deg','longitude','lon']);
  if([ai,si,qi,li,lo].some(i=>i<0))throw Error('Требуются столбцы: airway,segment,seq,latitude_deg,longitude_deg');
  let n=0;
  for(const r of rows.slice(1)) {
    const name=String(r[ai]||'').trim().toUpperCase(),lat=Number(r[li]),lon=Number(r[lo]),seq=Number(r[qi]),segment=String(r[si]||'');
    if(!/^[A-Z0-9]{2,8}$/.test(name)||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(seq)||Math.abs(lat)>90||Math.abs(lon)>180||!segment)continue;
    const parts=AIRWAYS.get(name)??new Map<string,AirwayVertex[]>(),v=parts.get(segment)??[];
    v.push({airway:name,segment,seq,lat,lon});parts.set(segment,v);AIRWAYS.set(name,parts);n++;
  }
  for(const parts of AIRWAYS.values())for(const path of parts.values())path.sort((a,b)=>a.seq-b.seq);
  return n;
}
// Return intermediate airway vertices between endpoints. Refuse expansion unless both
// endpoints snap within 25 NM of airway geometry and a connected graph path exists.
function expandAirway(airway:string,from:NavPoint,to:NavPoint):NavPoint[]|null {
  const parts=AIRWAYS.get(airway);if(!parts)return null;
  const vertices=new Map<string,NavPoint>(),adj=new Map<string,Array<{to:string;d:number}>>();
  const key=(p:{lat:number;lon:number})=>p.lat.toFixed(3)+','+p.lon.toFixed(3);
  for(const segment of parts.values()) {
    for(let i=0;i<segment.length;i++) {
      const p=segment[i],k=key(p),v={ident:airway,lat:p.lat,lon:p.lon,type:'ATS',source:'airway CSV'};
      vertices.set(k,v);if(!adj.has(k))adj.set(k,[]);
      if(i>0){const prev=segment[i-1],pk=key(prev),d=nm(prev,p);
        if(d>0&&d<250) {adj.get(k)!.push({to:pk,d});adj.get(pk)!.push({to:k,d});}
      }
    }
  }
  if(!vertices.size)return null;
  const near=(anchor:NavPoint)=>[...vertices.keys()].map(k=>({k,d:nm(vertices.get(k)!,anchor)})).sort((a,b)=>a.d-b.d).slice(0,3);
  const fromOpts=near(from),toOpts=near(to);
  if(fromOpts[0].d>25 || toOpts[0].d>25)return null;
  let best:{dist:number;keys:string[]}|null=null;
  for(const start of fromOpts.filter(o=>o.d<=25)) {
    const target=new Set(toOpts.filter(o=>o.d<=25).map(o=>o.k));
    const dist=new Map<string,number>([[start.k,0]]),pred=new Map<string,string>();
    const queue:[number,string][]=[[0,start.k]];let end:string|null=null;
    while(queue.length){queue.sort((a,b)=>b[0]-a[0]);const [cost,k]=queue.pop()!;
      if(cost>(dist.get(k)??Infinity))continue;
      if(target.has(k)){end=k;break;}
      for(const edge of adj.get(k)??[]){const nd=cost+edge.d;
        if(nd<(dist.get(edge.to)??Infinity)){dist.set(edge.to,nd);pred.set(edge.to,k);queue.push([nd,edge.to]);}
      }
    }
    if(end){const keys=[end];while(keys[0]!==start.k)keys.unshift(pred.get(keys[0])!);
      const cost=dist.get(end)!+start.d+nm(vertices.get(end)!,to);
      if(!best||cost<best.dist)best={dist:cost,keys};
    }
  }
  if(!best)return null;
  const direct=nm(from,to);
  if(best.dist>direct*3+100)return null; // guard against wrong multi-continent route
  return best.keys.map((k,i)=>({...vertices.get(k)!,ident:airway+'-'+(i+1)}));
}
export function nm(a: {lat:number;lon:number}, b:{lat:number;lon:number}):number {
  const r=Math.PI/180, p1=a.lat*r, p2=b.lat*r, d=(b.lat-a.lat)*r, l=(b.lon-a.lon)*r;
  const h=Math.sin(d/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(l/2)**2;
  return 3440.065 * 2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function interpolate(a:NavPoint,b:NavPoint,t:number):NavPoint {
  // spherical great-circle interpolation
  const r=Math.PI/180, p1=a.lat*r,p2=b.lat*r,l1=a.lon*r,l2=b.lon*r;
  const v=(p:number,l:number)=>[Math.cos(p)*Math.cos(l),Math.cos(p)*Math.sin(l),Math.sin(p)];
  const u=v(p1,l1),w=v(p2,l2),dot=Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*w[i],0)));
  const d=Math.acos(dot),s=Math.sin(d);
  const aa=s<1e-8?1-t:Math.sin((1-t)*d)/s,bb=s<1e-8?t:Math.sin(t*d)/s;
  const x=aa*u[0]+bb*w[0],y=aa*u[1]+bb*w[1],z=aa*u[2]+bb*w[2];
  return { ident:`${a.ident}-${b.ident}`,lat:Math.atan2(z,Math.hypot(x,y))/r,lon:Math.atan2(y,x)/r,type:'SAMPLE',source:'great-circle' };
}
function coordFix(token:string):NavPoint|null {
  // ICAO degrees+minutes: 52N030E, 5230N03030E, N5230E03030
  let m=token.match(/^(\d{2})(\d{2})?([NS])(\d{3})(\d{2})?([EW])$/);
  if(m) {const lat=Number(m[1])+(Number(m[2]||0)/60),lon=Number(m[4])+(Number(m[5]||0)/60);return {ident:token,lat:m[3]==='S'?-lat:lat,lon:m[6]==='W'?-lon:lon,type:'COORD',source:'route'};}
  m=token.match(/^([NS])(\d{2})(\d{2})([EW])(\d{3})(\d{2})$/);
  if(m) {const lat=Number(m[2])+Number(m[3])/60,lon=Number(m[5])+Number(m[6])/60;return {ident:token,lat:m[1]==='S'?-lat:lat,lon:m[4]==='W'?-lon:lon,type:'COORD',source:'route'};}
  return null;
}
function normalizeRouteToken(token:string, airportPosition=false):string {
  let item=token.toUpperCase().trim();
  if(item.includes('/')) item=item.split('/')[0];
  item=item.replace(/^[,;:.]+|[,;:.]+$/g,'').replace(/[()]/g,'');
  const runway=item.match(/^([A-Z]{4})\d{1,2}[LRC]?$/);
  if(runway && airportPosition) return runway[1];
  return item;
}

/** Points to label are precisely the fixes named in the user's OFP. */
export function mapLabelPoints(route:ParsedRoute):RoutePoint[] {
  const seen = new Set<string>();
  return route.points.filter(p=>p.showLabel && p.type !== 'ATS' && !p.synthetic &&
    !seen.has(`${p.ident}/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`) &&
    (seen.add(`${p.ident}/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`),true));
}

/** Download a public, converted navdata snapshot from the given GitHub repository. */
export async function loadGithubSnapshot(repoUrl:string):Promise<{points:number;airwayVertices:number;cycle:string;generated:string}> {
  const repo=new URL(repoUrl);
  if(repo.protocol!=='https:'||repo.hostname!=='github.com')throw Error('Укажи HTTPS адрес репозитория GitHub');
  const parts=repo.pathname.split('/').filter(Boolean);
  if(parts.length!==2||!parts.every(v=>/^[A-Za-z0-9_.-]+$/.test(v)))throw Error('Ожидается ссылка github.com/owner/repository');
  const prefix=`https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/main/public/navdata/`;
  const [metaResponse,pointsResponse,airwayResponse]=await Promise.all([
    fetch(prefix+'manifest.json',{cache:'no-store'}),
    fetch(prefix+'points.csv',{cache:'no-store'}),
    fetch(prefix+'airways.csv',{cache:'no-store'})
  ]);
  if(!metaResponse.ok||!pointsResponse.ok||!airwayResponse.ok)
    throw Error(`Навигационная база GitHub недоступна: ${metaResponse.status}/${pointsResponse.status}/${airwayResponse.status}`);
  const [manifest,pointCsv,airwayCsv]=await Promise.all([metaResponse.json(),pointsResponse.text(),airwayResponse.text()]);
  if(manifest.status!=='ready' || !pointCsv.startsWith('ident,latitude_deg,longitude_deg,type') ||
    !airwayCsv.startsWith('airway,segment,seq,latitude_deg,longitude_deg'))
    throw Error('Снимок navdata не готов или содержит неподдерживаемый формат CSV');
  // Validate all source files before altering the active database.
  const validatePoints=csvRows(pointCsv);
  const validateAirways=csvRows(airwayCsv);
  if(validatePoints.length<2||validateAirways.length<2)throw Error('Пустая база точек или трасс');
  for(const [id,points] of DB) {
    const remaining=points.filter(p=>p.source!=='GitHub snapshot');
    if(remaining.length)DB.set(id,remaining);else DB.delete(id);
  }
  AIRWAYS.clear();
  const count=importCsv(pointCsv,'GitHub snapshot');
  const vertices=importAirwaysCsv(airwayCsv);
  if(!count||!vertices)throw Error('Не удалось импортировать точки или трассы GitHub');
  return {points:count,airwayVertices:vertices,
    cycle:String(manifest.airac_cycle??'не указан'),generated:String(manifest.generated_utc??'')};
}

/** Direct link for uploading a ZIP to the repo. Never uploads from the plugin. */
export function githubUploadUrl(repoUrl:string):string {
  return repoUrl.replace(/\/$/,'')+'/upload/main/navdata-input';
}

/** Visualization-only reconstruction: remove ATS airway designators from an OFP,
 * leaving only explicitly named navigation fixes. The map then shows great-circle
 * links between confirmed consecutive fixes, NOT the actual airway geometry.
 * Unknown fixes still create gaps through parseRoute; never invent coordinates.
 * Works even when an airway (e.g. Y12) is absent from uploaded AIRAC CSV.
 */
/** Skip a terminal SID/STAR designator only when it is near the airport.
 * Unlike named fixes, procedures have no known geometry in our database.
 * Do not silently skip unknown enroute FIX, ICAO coordinates or known points.
 */
function looksLikeUnknownTerminalProcedure(token:string):boolean {
  return /^(?=.{4,10}$)(?=.*[A-Z])(?=.*\d)[A-Z0-9]+$/.test(token) &&
    !DB.has(token) && !AIRWAYS.has(token) && !coordFix(token) &&
    !/^(?:FL\d{2,3}|F\d{3}|S\d{4}|N\d{4}F\d{3})$/.test(token);
}

export function parseNamedFixRoute(text:string):ParsedRoute {
  const raw=text.replace(/[\n\r]+/g,' ').split(/\s+/).filter(Boolean);
  const normalized=raw.map((item,i)=>normalizeRouteToken(item,i===0||i===raw.length-1));
  const procedureIndices=new Set<number>();
  // Ignore DCT and ATS designators when looking for a terminal procedure.
  // Stop at the first real fix, to avoid concealing missing enroute fixes.
  const isConnector=(token:string)=>['DCT','IFR','VFR'].includes(token) ||
    AIRWAYS.has(token) || /^[A-Z]{1,2}\d{1,5}[A-Z]?$/.test(token);
  const scanTerminal=(atStart:boolean)=>{
    const airport=normalized[atStart?0:normalized.length-1]??'';
    if(!/^[A-Z]{4}$/.test(airport))return;
    const step=atStart?1:-1;
    for(let i=atStart?1:normalized.length-2;i>0&&i<normalized.length-1;i+=step){
      const token=normalized[i];
      if(isConnector(token))continue;
      if(looksLikeUnknownTerminalProcedure(token)){procedureIndices.add(i);continue;}
      break;
    }
  };
  scanTerminal(true);
  scanTerminal(false);
  const kept:string[]=[],removed:string[]=[],procedures:string[]=[];
  for(let i=0;i<normalized.length;i++) {
    const token=normalized[i];
    if(procedureIndices.has(i)){procedures.push(token);continue;}
    const resemblesAirway=/^[A-Z]{1,2}\d{1,5}[A-Z]?$/.test(token);
    if(AIRWAYS.has(token) || resemblesAirway) {removed.push(token);continue;}
    kept.push(token);
  }
  const parsed=parseRoute(kept.join(' '));
  return {...parsed,skipped:[...parsed.skipped,
    ...removed.map(item=>'ATS omitted: '+item),
    ...procedures.map(item=>'Terminal SID/STAR omitted: '+item)]};
}

/** Safe route reconstruction: unknown ATS or missing FIX are never linked with a false line. */
export function parseRoute(text:string):ParsedRoute {
  const rawTokens=text.replace(/[\n\r]+/g,' ').split(/\s+/).filter(Boolean);
  const raw=rawTokens.map((token,i)=>normalizeRouteToken(token,i===0||i===rawTokens.length-1)).filter(Boolean);
  const points:RoutePoint[]=[],segments:RoutePoint[][]=[],gaps:RouteGap[]=[];
  const unresolved:string[]=[],skipped:string[]=[],airwayNames:string[]=[],expandedAirways:string[]=[],ambiguous:string[]=[];
  let active:RoutePoint[]=[],pendingAirway:string|null=null,pendingGap:string|null=null;
  const breakSegment=()=>{if(active.length)segments.push(active);active=[];};
  const append=(p:NavPoint,named:boolean)=>{
    const previous=active[active.length-1];
    if(previous&&nm(previous,p)<.01) {
      if(named&&!previous.showLabel){previous.ident=p.ident;previous.type=p.type;previous.source=p.source;previous.showLabel=true;previous.synthetic=false;}
      return;
    }
    const record:RoutePoint={...p,index:points.length,showLabel:named,synthetic:!named};
    points.push(record);active.push(record);
  };
  const previousNamed=()=>[...points].reverse().find(p=>p.showLabel);
  for(let tokenIndex=0;tokenIndex<raw.length;tokenIndex++) {
    let item=raw[tokenIndex];
    if(item.includes('/'))item=item.split('/')[0];
    if(!item||['DCT','IFR','VFR','DEP','ARR','NIL'].includes(item)||/^(-|\+)$/.test(item)||
      /^FL\d{2,3}$/.test(item)||/^(?:F\d{3}|S\d{4})$/.test(item)||/^N\d{4}F\d{3}$/.test(item)) {
      skipped.push(item);continue;
    }
    // Prioritize a known airway over an identically named FIX when it occurs
    // between two explicitly named waypoints; otherwise the airway is silently lost.
    const nextIdent=(raw[tokenIndex+1]??'').split('/')[0];
    if(AIRWAYS.has(item) && previousNamed() && nextIdent && nextIdent!=='DCT' &&
       (DB.has(nextIdent)||coordFix(nextIdent))) {
      pendingAirway=item;
      continue;
    }
    const literal=coordFix(item);
    const options=literal?[literal]:(DB.get(item)??[]);
    if(!options.length) {
      if(AIRWAYS.has(item)||/^(?:[A-Z]{1,2}\d{1,5}[A-Z]?|[A-Z]\d{1,4}[A-Z]?)$/.test(item)) {
        if(pendingAirway){airwayNames.push(pendingAirway);pendingGap=pendingAirway;breakSegment();}
        pendingAirway=item;continue;
      }
      unresolved.push(item);
      pendingGap=pendingGap ? pendingGap+', '+item : item;
      breakSegment();pendingAirway=null;
      continue;
    }
    const previous=previousNamed();
    const sorted=previous?[...options].sort((a,b)=>nm(previous,a)-nm(previous,b)):options;
    const chosen=sorted[0];
    if(options.length>1 && (!previous||Math.abs(nm(previous,sorted[0])-nm(previous,sorted[1]))<80))ambiguous.push(item);
    if(pendingGap) {
      const from=previous?.ident??'?';
      gaps.push({from,to:item,reason:'Неизвестная точка или трасса: '+pendingGap,distanceNm:previous?nm(previous,chosen):0});
      pendingGap=null;
    }
    if(pendingAirway) {
      if(previous && active.length) {
        const expanded=expandAirway(pendingAirway,previous,chosen);
        if(expanded) {for(const p of expanded)append(p,false);expandedAirways.push(pendingAirway);}
        else {airwayNames.push(pendingAirway);
          gaps.push({from:previous.ident,to:item,reason:'ATS '+pendingAirway+' не восстановлена',distanceNm:nm(previous,chosen)});
          breakSegment();}
      } else {airwayNames.push(pendingAirway);
        if(previous)gaps.push({from:previous.ident,to:item,reason:'Недостаточно координат ATS '+pendingAirway,distanceNm:nm(previous,chosen)});
        breakSegment();
      }
      pendingAirway=null;
    } else if(previous && active.length && nm(previous,chosen)>2400 && options.length>1) {
      gaps.push({from:previous.ident,to:item,reason:'Неоднозначный идентификатор: слишком дальний переход',distanceNm:nm(previous,chosen)});
      ambiguous.push(item);breakSegment();
    }
    append(chosen,true);
  }
  if(pendingAirway) {airwayNames.push(pendingAirway);}
  breakSegment();
  let distanceNm=0;
  for(const segment of segments)for(let i=1;i<segment.length;i++)distanceNm+=nm(segment[i-1],segment[i]);
  return {points,segments,gaps,unresolved:[...new Set(unresolved)],skipped,
    airwayNames:[...new Set(airwayNames)],expandedAirways:[...new Set(expandedAirways)],
    ambiguous:[...new Set(ambiguous)],distanceNm};
}
