import { nm, interpolate } from './navdb';
import type { NavPoint, RoutePoint } from './navdb';
/** Pressure altitude grid for the pilot-selected cruise band (not model's fixed hPa layers). */
export const CRUISE_FL_LEVELS = [300,310,320,330,340,350,360,370,380,390,400] as const;
export const PRESSURES = [850,700,600,500,400,300,250,200,150,100,70,50] as const;
export type Sample = { lat:number; lon:number; label:string; distanceNm:number; eta:Date };
export type WeatherCell = {temp:number|null;rh:number|null;windKt:number|null;windDir:number|null;cloud:number|null;cape:number|null;geopotentialM:number|null;isaDeviationC:number|null;indicators:string[]};
export type WeatherRow = {sample:Sample;levels:Record<number,WeatherCell>;flPressure:number;atFl:WeatherCell|null; alerts:string[];tropopauseFL:number|null;flightLevels:Record<number,WeatherCell>};
export const standardAltitudeM = (pressureHpa:number):number =>
  44330.77*(1-Math.pow(pressureHpa/1013.25,1/5.25588));
/** ISA temperature at pressure altitude, not a measured tropopause. */
export const isaTemperatureC = (pressureHpa:number):number =>
  15 - 0.0065*Math.min(11000,Math.max(0,standardAltitudeM(pressureHpa)));
export const isaDeviationC = (temperatureC:number,pressureHpa:number):number =>
  temperatureC-isaTemperatureC(pressureHpa);
/**
 * Indicative lapse-rate transition in model geopotential coordinates.
 * Does NOT implement full WMO tropopause detection or represent an aviation SIGWX product.
 * Requires measurements at >= 2 km above candidate altitude and at least 7 km MSL.
 */
export function estimateTropopauseFL(levels:Record<number,WeatherCell>):number|null {
  const observed=PRESSURES.map(p=>({p,z:levels[p]?.geopotentialM,t:levels[p]?.temp}))
    .filter(v=>v.z!==null&&v.z!==undefined&&v.t!==null&&v.t!==undefined)
    .map(v=>({p:v.p,z:v.z as number,t:v.t as number}))
    .sort((a,b)=>a.z-b.z);
  const tempAt=(z:number):number|null=>{
    for(let i=1;i<observed.length;i++) {
      const a=observed[i-1], b=observed[i];
      if(z>=a.z && z<=b.z && b.z>a.z) return a.t+(b.t-a.t)*(z-a.z)/(b.z-a.z);
    }
    return null;
  };
  for(let i=0;i<observed.length-1;i++) {
    const candidate=observed[i];
    if(candidate.z<7000||candidate.z>18000)continue;
    const upper=tempAt(candidate.z+2000);
    if(upper===null)continue;
    const meanLapse=(candidate.t-upper)/2; // C/km over 2 km
    const next=observed[i+1];
    const localLapse=(candidate.t-next.t)/((next.z-candidate.z)/1000);
    if(localLapse<=2 && meanLapse<=2) return Math.round(candidate.z/30.48);
  }
  return null;
}
export const flToHpa=(fl:number)=>1013.25*Math.pow(Math.max(.001,1-(fl*100*0.3048)/44330.77),5.25588);
export const flLevel=(fl:number)=>[...PRESSURES].sort((a,b)=>Math.abs(a-flToHpa(fl))-Math.abs(b-flToHpa(fl)))[0];
export function generateSamples(points:NavPoint[], etd:Date, tasKt:number, maxPoints=10):Sample[] {
  if(points.length<2 || !(tasKt>0)) return [];
  const legs=points.slice(1).map((p,i)=>nm(points[i],p));
  const total=legs.reduce((a,b)=>a+b,0);
  const count=Math.min(maxPoints,Math.max(2,Math.ceil(total/250)+1));
  return Array.from({length:count},(_,i)=> {
    const position=total*i/(count-1);let remaining=position,leg=0;
    while(leg<legs.length-1 && remaining>legs[leg]) {remaining-=legs[leg++];}
    const p=interpolate(points[leg],points[leg+1],legs[leg]?remaining/legs[leg]:0);
    return {lat:p.lat,lon:p.lon,label:i===0?points[0].ident:i===count-1?points[points.length-1].ident:'S'+i,distanceNm:position,eta:new Date(etd.getTime() + position/tasKt*3600000)};
  });
}
/** Each named point of the OFP gets an ETA. ATS intermediate vertices still
 * contribute to cumulative distance but never become an S1/S2 forecast column. */
export function generateWaypointSamples(points:RoutePoint[],etd:Date,tasKt:number):Sample[] {
  if(points.length<2 || !(tasKt>0) || !Number.isFinite(etd.getTime())) return [];
  const result:Sample[]=[];
  let distanceNm=0;
  const nameCount=new Map<string,number>();
  for(let i=0;i<points.length;i++) {
    if(i) distanceNm+=nm(points[i-1],points[i]);
    const point=points[i];
    if(point.showLabel!==true || point.type==='ATS') continue;
    const count=(nameCount.get(point.ident)||0)+1;
    nameCount.set(point.ident,count);
    result.push({lat:point.lat,lon:point.lon,label:point.ident+(count>1?` (${count})`:''),
      distanceNm,eta:new Date(etd.getTime()+distanceNm/tasKt*3600000)});
  }
  return result;
}
/** Interpolation on logarithmic pressure between model levels. The flight levels
 * are *pressure altitudes*; do not assume that a particular hPa level is FL350.
 * Wind direction is interpolated through vector components (avoids 359/001 error).
 * No extrapolation when an upper/lower model level is absent. */
export function cellAtFlightLevel(levels:Record<number,WeatherCell>,fl:number):WeatherCell {
  const target=flToHpa(fl);
  const ordered=[...PRESSURES].filter(p=>levels[p]).sort((a,b)=>b-a);
  const empty:WeatherCell={temp:null,rh:null,windKt:null,windDir:null,cloud:null,cape:null,geopotentialM:null,isaDeviationC:null,indicators:[]};
  const exact=ordered.find(p=>Math.abs(p-target)<0.001);
  let upper:number,lower:number;
  if(exact!==undefined) {upper=exact;lower=exact;}
  else {
    const idx=ordered.findIndex((p,i)=>i<ordered.length-1 && p>target && ordered[i+1]<target);
    if(idx<0) return empty;
    upper=ordered[idx];lower=ordered[idx+1];
  }
  const a=levels[upper],b=levels[lower];
  const blend=upper===lower?0:(Math.log(upper)-Math.log(target))/(Math.log(upper)-Math.log(lower));
  const lerp=(x:number|null,y:number|null):number|null=>x==null||y==null?null:x+(y-x)*blend;
  const temp=lerp(a.temp,b.temp),rh=lerp(a.rh,b.rh),cloud=lerp(a.cloud,b.cloud);
  const geo=lerp(a.geopotentialM,b.geopotentialM);
  let windKt:number|null=null,windDir:number|null=null;
  if(a.windKt!=null && b.windKt!=null && a.windDir!=null && b.windDir!=null) {
    const r=Math.PI/180;
    const u=(1-blend)*a.windKt*Math.sin(a.windDir*r)+blend*b.windKt*Math.sin(b.windDir*r);
    const v=(1-blend)*a.windKt*Math.cos(a.windDir*r)+blend*b.windKt*Math.cos(b.windDir*r);
    windKt=Math.round(Math.hypot(u,v));windDir=(Math.round(Math.atan2(u,v)/r)+360)%360;
  }
  const indicators:string[]=[];
  if(temp!=null && rh!=null && temp<=0 && temp>=-20 && rh>=80)indicators.push('условия обледенения*');
  if(windKt!=null && windKt>=100)indicators.push('сильный ветер на высоте');
  return {temp:temp==null?null:Math.round(temp),rh:rh==null?null:Math.round(rh),
    windKt,windDir,cloud:cloud==null?null:Math.round(cloud),cape:lerp(a.cape,b.cape),
    geopotentialM:geo,isaDeviationC:temp==null?null:Math.round(temp-(15-0.0065*Math.min(11000,fl*100*0.3048))),indicators};
}
function value(v:unknown):number|null {return typeof v==='number'&&Number.isFinite(v)?v:null;}
const round=(v:number|null)=>v==null?null:Math.round(v);
function cell(data:Record<string,unknown[]>,index:number,level:number):WeatherCell {
  const get=(name:string)=>value(data[name+'_'+level+'hPa']?.[index]);
  const t=get('temperature'), rh=get('relative_humidity'), wind=get('wind_speed'),dir=get('wind_direction'), clouds=get('cloud_cover');
  const cape=value(data.cape?.[index]);
  const geopotentialM=get('geopotential_height');
  const indicators:string[]=[];
  // NON-CERTIFIED proxies. NOT direct icing or turbulence forecasts.
  if(t!==null && rh!==null && t<=0 && t>=-20 && rh>=80) indicators.push('условия обледенения*');
  if(wind!==null && wind>=100) indicators.push('сильный ветер на высоте');
  if(cape!==null && cape>1000) indicators.push('высокий CAPE (район)*');
  return {temp:round(t),rh:round(rh),windKt:round(wind),windDir:round(dir),cloud:round(clouds),cape:round(cape),geopotentialM,isaDeviationC:t===null?null:Math.round(isaDeviationC(t,level)),indicators};
}
// For non-commercial prototype only. Forecast is separate from Windy weather model.
// Open-Meteo API accepts arrays of lat/lon and returns arrays of model objects.
export async function loadWeather(samples:Sample[],fl:number,progress?:(s:string)=>void):Promise<WeatherRow[]> {
  if(!samples.length) return [];
  const vars=['cape'];for(const p of PRESSURES) for(const v of ['temperature','relative_humidity','wind_speed','wind_direction','cloud_cover','geopotential_height']) vars.push(v+'_'+p+'hPa');
  const rows:WeatherRow[]=[];
  for(let pos=0;pos<samples.length;pos+=5) {
    const part=samples.slice(pos,pos+5);
    progress?.('Погода ' + (pos+1) + '–' + (pos+part.length) + '/' + samples.length);
    const u=new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude',part.map(p=>p.lat.toFixed(4)).join(','));
    u.searchParams.set('longitude',part.map(p=>p.lon.toFixed(4)).join(','));
    u.searchParams.set('hourly',vars.join(','));u.searchParams.set('timezone','GMT');u.searchParams.set('wind_speed_unit','kn');
    u.searchParams.set('forecast_days','8');
    const response=await fetch(u.toString());
    if(!response.ok) throw Error(`Open-Meteo HTTP ${response.status} — ${await response.text().then(t=>t.slice(0,180))}`);
    const payload=await response.json();
    const items=Array.isArray(payload)?payload:[payload];
    if(items.length!==part.length) throw Error('Некорректный ответ Open-Meteo для группы координат');
    items.forEach((item:any,i:number)=> {
      const hourly:Record<string,unknown[]> = item.hourly || {};
      const time=hourly.time as string[]|undefined;
      if(!time?.length) throw Error('Нет почасового прогноза в ответе');
      const target=part[i].eta.getTime();
      const index=time.map(s=>Date.parse(s+'Z')).reduce((best,t,j)=>Math.abs(t-target)<Math.abs(Date.parse(time[best]+'Z')-target)?j:best,0);
      if(Math.abs(Date.parse(time[index]+'Z')-target)>60*60*1000) throw Error('ETA выходит за доступный горизонт прогноза для ' + part[i].label);
      const levels={} as Record<number,WeatherCell>;
      for(const p of PRESSURES) levels[p]=cell(hourly,index,p);
      const flPressure=flLevel(fl),atFl=levels[flPressure];
      const alerts=[...atFl.indicators];
      const levIdx=PRESSURES.indexOf(flPressure);
      const neigh=PRESSURES[levIdx+1] || PRESSURES[levIdx-1];
      const v1=atFl.windKt,v2=levels[neigh]?.windKt;
      if(v1!==null && v2!=null && Math.abs(v1-v2)>=35)alerts.push('перепад скорости ветра между уровнями*');
      const flightLevels={} as Record<number,WeatherCell>;
      for(const f of CRUISE_FL_LEVELS) flightLevels[f]=cellAtFlightLevel(levels,f);
      rows.push({sample:part[i],levels,flPressure,atFl,alerts,tropopauseFL:estimateTropopauseFL(levels),flightLevels});
    });
  }
  return rows;
}
