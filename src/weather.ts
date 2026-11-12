import { nm, interpolate } from './navdb';
import type { NavPoint } from './navdb';
import {estimateModelTropopauseFL,TROPOPAUSE_PRESSURES} from './tropopause';

/** Open-Meteo pressure levels used for cruise-height interpolation. */
export const PRESSURES=[850,700,600,500,400,300,250,200,150] as const;
export const FLIGHT_LEVELS=[300,310,320,330,340,350,360,370,380,390,400] as const;
export const FORECAST_PROVIDER='Open-Meteo · NOAA GFS' as const;
export const MAX_FORECAST_WAYPOINTS=80;
export const OPEN_METEO_URL='https://api.open-meteo.com/v1/forecast';
export type Sample={lat:number;lon:number;label:string;distanceNm:number;eta:Date};
export type WeatherCell={temp:number|null;rh:number|null;windKt:number|null;windDir:number|null;cloud:number|null;cape:number|null;isaDeviationC:number|null;indicators:string[]};
export type WeatherRow={sample:Sample;levels:Record<number,WeatherCell>;flPressure:number;atFl:WeatherCell|null;flightLevels:Record<number,WeatherCell>;tropopauseFL:number|null;alerts:string[]};

export const standardAltitudeM=(p:number):number=>44330.77*(1-Math.pow(Math.max(0.01,p)/1013.25,1/5.25588));
export const flToHpa=(fl:number):number=>1013.25*Math.pow(Math.max(.001,1-(fl*100*.3048)/44330.77),5.25588);
export const flLevel=(fl:number):number=>[...PRESSURES].sort((a,b)=>Math.abs(a-flToHpa(fl))-Math.abs(b-flToHpa(fl)))[0];
export function isaTemperatureC(fl:number):number {
  const z=fl*100*.3048;
  return z<=11000?15-.0065*z:-56.5;
}
const round=(n:number|null):number|null=>n===null?null:Math.round(n);
const valid=(n:unknown):number|null=>typeof n==='number'&&Number.isFinite(n)?n:null;
/** Old equal-distance sampling API retained for interoperability with early tests. */
export function generateSamples(points:NavPoint[],etd:Date,tasKt:number,maxPoints=10):Sample[] {
  if(points.length<2||!(tasKt>0)||Number.isNaN(etd.getTime()))return [];
  const legs=points.slice(1).map((p,i)=>nm(points[i],p));
  const total=legs.reduce((a,b)=>a+b,0);
  const count=Math.min(maxPoints,Math.max(2,Math.ceil(total/250)+1));
  return Array.from({length:count},(_,i)=>{
    const distanceNm=total*i/(count-1);let remaining=distanceNm,leg=0;
    while(leg<legs.length-1&&remaining>legs[leg])remaining-=legs[leg++];
    const p=interpolate(points[leg],points[leg+1],legs[leg]?remaining/legs[leg]:0);
    return {lat:p.lat,lon:p.lon,label:i===0?points[0].ident:i===count-1?points[points.length-1].ident:'S'+i,
      distanceNm,eta:new Date(etd.getTime()+distanceNm/tasKt*3600000)};
  });
}
/** ETA of each explicitly named OFP point, including hidden ATS vertices in flown distance. */
export function generateWaypointSamples(points:NavPoint[],etd:Date,tasKt:number):Sample[] {
  if(points.length<2||!(tasKt>0)||Number.isNaN(etd.getTime()))return [];
  const samples:Sample[]=[];
  let distanceNm=0;
  for(let i=0;i<points.length;i++) {
    if(i)distanceNm+=nm(points[i-1],points[i]);
    const p=points[i] as NavPoint&{showLabel?:boolean;synthetic?:boolean};
    if(p.showLabel===false || p.synthetic===true || p.type==='ATS')continue;
    samples.push({lat:p.lat,lon:p.lon,label:p.ident,distanceNm,
      eta:new Date(etd.getTime()+distanceNm/tasKt*3600000)});
  }
  return samples;
}
function levelCell(hourly:Record<string,unknown[]>,i:number,p:number):WeatherCell {
  const get=(key:string)=>valid(hourly[key+'_'+p+'hPa']?.[i]);
  const temp=get('temperature'),rh=get('relative_humidity'),wind=get('wind_speed'),
    dir=get('wind_direction'),cloud=get('cloud_cover'),cape=valid(hourly.cape?.[i]);
  const fl=standardAltitudeM(p)/30.48;
  const isaDeviationC=temp===null?null:round(temp-isaTemperatureC(fl));
  const indicators:string[]=[];
  if(temp!==null&&rh!==null&&temp<=0&&temp>=-20&&rh>=80)indicators.push('условия возможного обледенения*');
  if(wind!==null&&wind>=100)indicators.push('высокая скорость ветра');
  if(cape!==null&&cape>1000)indicators.push('CAPE повышен в районе*');
  return {temp:round(temp),rh:round(rh),windKt:round(wind),windDir:round(dir),cloud:round(cloud),cape:round(cape),isaDeviationC,indicators};
}
/** Log-pressure interpolation, with vector-based wind interpolation across 0°/360°. */
export function interpolatePressure(levels:Record<number,WeatherCell>,p:number,fl:number):WeatherCell {
  const ps=Object.keys(levels).map(Number).sort((a,b)=>a-b);
  let low=ps[0],high=ps[ps.length-1];
  for(let i=0;i<ps.length;i++) {
    if(ps[i]<=p)low=ps[i];
    if(ps[i]>=p){high=ps[i];break;}
  }
  const a=levels[low],b=levels[high];
  const fraction=low===high?0:(Math.log(p)-Math.log(low))/(Math.log(high)-Math.log(low));
  const blend=(x:number|null,y:number|null):number|null=>x===null||y===null?null:x+(y-x)*fraction;
  let windKt=blend(a.windKt,b.windKt),windDir=blend(a.windDir,b.windDir);
  if(a.windKt!=null&&b.windKt!=null&&a.windDir!=null&&b.windDir!=null){
    const vector=(c:WeatherCell):[number,number]=>[c.windKt!*Math.cos(c.windDir!*Math.PI/180),c.windKt!*Math.sin(c.windDir!*Math.PI/180)];
    const [ax,ay]=vector(a),[bx,by]=vector(b);
    const x=ax+(bx-ax)*fraction,y=ay+(by-ay)*fraction;
    windKt=Math.hypot(x,y);windDir=(Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  const temp=blend(a.temp,b.temp);
  const merged:WeatherCell={temp:round(temp),rh:round(blend(a.rh,b.rh)),cloud:round(blend(a.cloud,b.cloud)),
    windKt:round(windKt),windDir:round(windDir),cape:round(blend(a.cape,b.cape)),
    isaDeviationC:temp==null?null:round(temp-isaTemperatureC(fl)),indicators:[]};
  return merged;
}
/** Backward-compatible rough diagnostic, not the production tropopause method. */
export function estimateTropopauseFL(levels:Record<number,WeatherCell>):number|null {
  const levelsUp=Object.keys(levels).map(Number).sort((a,b)=>b-a);
  for(let i=1;i<levelsUp.length;i++) {
    const pa=levelsUp[i-1],pb=levelsUp[i],ta=levels[pa].temp,tb=levels[pb].temp;
    if(ta==null||tb==null)continue;
    const lapse=(ta-tb)/((standardAltitudeM(pb)-standardAltitudeM(pa))/1000);
    if(lapse<=2&&standardAltitudeM(pb)>=7000)return Math.round(standardAltitudeM(pb)/30.48/10)*10;
  }
  return null;
}

/** Prepare a single GFS model request for both the flight-level table and
 * model-height-based thermal tropopause. Data are requested only for ETA dates,
 * avoiding 16 days of unnecessary hourly values on mobile devices.
 */
export function makeForecastUrl(batch:Sample[]):URL {
  if(!batch.length)throw Error('Open-Meteo: не указаны точки прогноза');
  const variables=new Set<string>(['cape']);
  for(const p of PRESSURES)for(const kind of ['temperature','relative_humidity','wind_speed','wind_direction','cloud_cover'])
    variables.add(`${kind}_${p}hPa`);
  for(const p of TROPOPAUSE_PRESSURES){
    variables.add(`temperature_${p}hPa`);
    variables.add(`geopotential_height_${p}hPa`);
  }
  const dateTimes=batch.map(point=>{
    if(!Number.isFinite(point.lat)||!Number.isFinite(point.lon)||Math.abs(point.lat)>90||Math.abs(point.lon)>180)
      throw Error(`Недопустимые координаты точки ${point.label}`);
    const ms=point.eta.getTime();
    if(!Number.isFinite(ms))throw Error(`Недопустимое ETA точки ${point.label}`);
    return ms;
  });
  const date=(ms:number)=>new Date(ms).toISOString().slice(0,10);
  const url=new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude',batch.map(s=>s.lat.toFixed(4)).join(','));
  url.searchParams.set('longitude',batch.map(s=>s.lon.toFixed(4)).join(','));
  url.searchParams.set('hourly',[...variables].join(','));
  url.searchParams.set('timezone','GMT');
  url.searchParams.set('wind_speed_unit','kn');
  url.searchParams.set('models','gfs_seamless');
  url.searchParams.set('cell_selection','nearest');
  url.searchParams.set('start_date',date(Math.min(...dateTimes)));
  url.searchParams.set('end_date',date(Math.max(...dateTimes)));
  return url;
}

const epochUtc=(str:string):number=>Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(str)?str:str+'Z');

/** Direct, key-free Open-Meteo GFS forecast.
 * Windy Point Forecast key and Vercel address are NOT required.
 * Windy map overlay data remain independent.
 */
export async function loadWeather(samples:Sample[],fl:number,progress?:(s:string)=>void):Promise<WeatherRow[]> {
  if(!samples.length)return [];
  if(samples.length>MAX_FORECAST_WAYPOINTS)
    throw Error(`Маршрут содержит более ${MAX_FORECAST_WAYPOINTS} точек; сократи маршрут для метеоанализа.`);
  const rows:WeatherRow[]=[];
  for(let start=0;start<samples.length;start+=3) {
    const batch=samples.slice(start,start+3);
    progress?.(`Open-Meteo GFS: ${start+1}–${start+batch.length} / ${samples.length}`);
    const url=makeForecastUrl(batch);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    let response:Response;
    try {
      response=await fetch(url.toString(),{signal:controller.signal});
    } catch(err) {
      if(controller.signal.aborted)throw Error('Open-Meteo: превышено время ожидания (30 секунд). Повтори запрос.');
      throw Error('Open-Meteo недоступен: '+String(err));
    } finally {clearTimeout(timeout);}
    if(!response.ok) {
      let detail='';
      try {
        const text=(await response.text()).slice(0,600);
        try {const parsed=JSON.parse(text);detail=String(parsed.reason??parsed.message??'');}
        catch(_err) {detail=text;}
      } catch(_err) { /* some errors have no response body */ }
      throw Error(`Open-Meteo HTTP ${response.status}${detail?': '+detail.slice(0,240):''}`);
    }
    const raw=await response.json();
    const items=Array.isArray(raw)?raw:[raw];
    if(items.length!==batch.length)throw Error('Ответ Open-Meteo не соответствует запрошенным точкам');
    for(let i=0;i<batch.length;i++) {
      const hourly=items[i]?.hourly as Record<string,unknown[]>|undefined;
      const times=hourly?.time as string[]|undefined;
      if(!hourly || !times?.length)throw Error('Open-Meteo не вернул почасовой прогноз');
      const millis=batch[i].eta.getTime();
      let nearest=0;
      for(let ti=1;ti<times.length;ti++)if(Math.abs(epochUtc(times[ti])-millis)<Math.abs(epochUtc(times[nearest])-millis))nearest=ti;
      if(!Number.isFinite(epochUtc(times[nearest]))||Math.abs(epochUtc(times[nearest])-millis)>90*60000)
        throw Error('ETA выходит за горизонт прогноза GFS: '+batch[i].label);
      const levels={} as Record<number,WeatherCell>;
      for(const p of PRESSURES)levels[p]=levelCell(hourly,nearest,p);
      if(Object.values(levels).filter(cell=>cell.temp!==null&&cell.windKt!==null&&cell.windDir!==null).length<2)
        throw Error(`Open-Meteo GFS: недостаточно вертикальных данных для ${batch[i].label}`);
      const flightLevels={} as Record<number,WeatherCell>;
      for(const level of FLIGHT_LEVELS)flightLevels[level]=interpolatePressure(levels,flToHpa(level),level);
      const atFl=interpolatePressure(levels,flToHpa(fl),fl);
      const modelColumn: Array<{heightM:number;tempC:number}>=[];
      for(const p of TROPOPAUSE_PRESSURES) {
        const heightM=valid(hourly[`geopotential_height_${p}hPa`]?.[nearest]);
        const tempC=valid(hourly[`temperature_${p}hPa`]?.[nearest]);
        if(heightM!==null&&tempC!==null)modelColumn.push({heightM,tempC});
      }
      rows.push({sample:batch[i],levels,flightLevels,flPressure:flLevel(fl),atFl,
        tropopauseFL:estimateModelTropopauseFL(modelColumn),alerts:[...atFl.indicators]});
    }
  }
  return rows;
}
