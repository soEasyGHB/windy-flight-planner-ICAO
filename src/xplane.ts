/** X-Plane 11/12 XPFIX1101/1200, XPNAV1150/1200, XPAWY1101 -> CSV used by our Windy parser.
 * Client-side conversion: NEVER uploads raw files to any remote service.
 * Does not implement ARINC-424, CIFP procedures or legal/altitude/direction routing checks.
 */
export type XPlaneFiles = {fix:string; nav:string; awy:string};
export type XPlaneResult = {
  pointsCsv:string; airwaysCsv:string; cycle:string; pointCount:number;
  airwayEdges:number; rejectedEdges:number; warnings:string[];
};
type Ref = {lat:number;lon:number};
const valid = (lat:number,lon:number) => Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
const safeIdent = (id:string) => /^[A-Z0-9]{2,12}$/i.test(id);
const asRef = (lat:string,lon:string):Ref|null => {
  const a=Number(lat),b=Number(lon);return valid(a,b)?{lat:a,lon:b}:null;
};
function header(raw:string,kind:string):{cycle:string|null;lines:string[]} {
  const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/);
  if(!lines.some(s=>s.includes('Version')))throw Error(`${kind}: не найден заголовок Version в формате X-Plane`);
  const metadata=lines.slice(0,5).join(' ');
  const match=metadata.match(/data\s+cycle\s+(\d{4})/i);
  const v=metadata.match(/(?:^|\s)(\d{3,4})\s+Version/i);
  if(!v || Number(v[1])<1100 || Number(v[1])>1200)throw Error(`${kind}: поддерживаются X-Plane 11/12 (1100–1200)`);
  return {cycle:match?.[1]||null,lines};
}
function records(lines:string[]):string[][] {
  const out:string[][]=[];
  for(const line of lines){
    const s=line.trim();
    if(!s||s==='I'||s==='A'||s==='99'||s.startsWith('#')||s.startsWith(';')||/^\d{3,4}\s+Version/i.test(s))continue;
    out.push(s.split(/\s+/));
  }
  return out;
}
export function convertXPlane(files:XPlaneFiles):XPlaneResult {
  const fix=header(files.fix,'earth_fix.dat'),nav=header(files.nav,'earth_nav.dat'),awy=header(files.awy,'earth_awy.dat');
  const cycles=[fix.cycle,nav.cycle,awy.cycle];
  if(cycles.some(x=>x!==cycles[0]))throw Error(`AIRAC не совпадает: FIX=${cycles[0]||'?'}, NAV=${cycles[1]||'?'}, AWY=${cycles[2]||'?'}. Загрузи три файла одного цикла.`);
  const warnings:string[]=[];
  if(!cycles[0])warnings.push('AIRAC не указан в заголовках — актуальность проверить не удалось');
  const points:string[]=['ident,latitude_deg,longitude_deg,type'];
  const edges:string[]=['airway,segment,seq,latitude_deg,longitude_deg'];
  const pointKeys=new Set<string>();
  const index=new Map<string,Ref>();
  const add=(name:string,ref:Ref,kind:string,region:string,refType:string,enroute:boolean)=>{
    name=name.toUpperCase(); region=region.toUpperCase();
    if(!safeIdent(name))return;
    const key=`${name}|${ref.lat.toFixed(7)}|${ref.lon.toFixed(7)}|${kind}`;
    if(!pointKeys.has(key)) {pointKeys.add(key);points.push(`${name},${ref.lat},${ref.lon},${kind}`);}
    if(enroute){
      const indexKey=`${name}|${region}|${refType}`;
      if(!index.has(indexKey))index.set(indexKey,ref);
    }
  };
  let badFix=0,badNav=0;
  for(const r of records(fix.lines)){
    const ref=asRef(r[0],r[1]);
    if(!ref||!r[2]||!r[3]||!r[4]){badFix++;continue;}
    add(r[2],ref,'FIX',r[4],'11',r[3].toUpperCase()==='ENRT');
  }
  for(const r of records(nav.lines)){
    const t=Number(r[0]);
    if(![2,3,12,13].includes(t))continue;
    const ref=asRef(r[1],r[2]);
    if(!ref||!r[7]||!r[8]||!r[9]){badNav++;continue;}
    add(r[7],ref,t===2?'NDB':t===3?'VOR':'DME',r[9],t===2?'2':'3',r[8].toUpperCase()==='ENRT');
  }
  const get=(name:string,region:string,kind:string):Ref|null=>{
    return index.get(`${name.toUpperCase()}|${region.toUpperCase()}|${kind}`)||null;
  };
  let rejected=0,edgeCount=0;
  for(const r of records(awy.lines)){
    if(r.length<11||!['11','2','3'].includes(r[2])||!['11','2','3'].includes(r[5])||!['N','F','B'].includes(r[6])){
      rejected++;continue;
    }
    const a=get(r[0],r[1],r[2]),b=get(r[3],r[4],r[5]);
    if(!a||!b){rejected++;continue;}
    const names=r[10].toUpperCase().split('-');
    for(const name of names){
      if(!safeIdent(name))continue;
      const id=`edge${edgeCount++}`;
      edges.push(`${name},${id},0,${a.lat},${a.lon}`);
      edges.push(`${name},${id},1,${b.lat},${b.lon}`);
    }
  }
  if(points.length<=1)throw Error('Не найдено ни одной навигационной точки в трёх файлах');
  if(edges.length<=1)throw Error('Не удалось распознать ATS-трассы. Проверь формат earth_awy.dat и соответствие трём файлам.');
  if(rejected)warnings.push(`Не восстановлены ${rejected} сегментов трасс: несовпадающие точки, регионы или неподдерживаемые записи`);
  if(badFix||badNav)warnings.push(`Пропущены повреждённые FIX/NAV записи: ${badFix+badNav}`);
  warnings.push('Геометрия трасс — без проверки направлений, высотных ограничений и NOTAM');
  return {pointsCsv:points.join('\n')+'\n',airwaysCsv:edges.join('\n')+'\n',cycle:cycles[0]||'unknown',pointCount:points.length-1,airwayEdges:edgeCount,rejectedEdges:rejected,warnings};
}
