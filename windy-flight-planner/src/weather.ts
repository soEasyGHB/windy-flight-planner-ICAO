import { nm, interpolate } from './navdb';
import type { NavPoint } from './navdb';
export const PRESSURES = [850,700,600,500,400,300,250,200,150] as const;
export type Sample = { lat:number; lon:number; label:string; distanceNm:number; eta:Date };
export type WeatherCell = {temp:number|null;rh:number|null;windKt:number|null;windDir:number|null;cloud:number|null;cape:number|null;indicators:string[]};
export type WeatherRow = {sample:Sample;levels:Record<number,WeatherCell>;flPressure:number;atFl:WeatherCell|null; alerts:string[]};
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
function value(v:unknown):number|null {return typeof v==='number'&&Number.isFinite(v)?v:null;}
const round=(v:number|null)=>v==null?null:Math.round(v);
function cell(data:Record<string,unknown[]>,index:number,level:number):WeatherCell {
  const get=(name:string)=>value(data[name+'_'+level+'hPa']?.[index]);
  const t=get('temperature'), rh=get('relative_humidity'), wind=get('wind_speed'),dir=get('wind_direction'), clouds=get('cloud_cover');
  const cape=value(data.cape?.[index]);
  const indicators:string[]=[];
  // NON-CERTIFIED proxies. NOT direct icing or turbulence forecasts.
  if(t!==null && rh!==null && t<=0 && t>=-20 && rh>=80) indicators.push('условия обледенения*');
  if(wind!==null && wind>=100) indicators.push('сильный ветер на высоте');
  if(cape!==null && cape>1000) indicators.push('высокий CAPE (район)*');
  return {temp:round(t),rh:round(rh),windKt:round(wind),windDir:round(dir),cloud:round(clouds),cape:round(cape),indicators};
}
// For non-commercial prototype only. Forecast is separate from Windy weather model.
// Open-Meteo API accepts arrays of lat/lon and returns arrays of model objects.
export async function loadWeather(samples:Sample[],fl:number,progress?:(s:string)=>void):Promise<WeatherRow[]> {
  if(!samples.length) return [];
  const vars=['cape'];for(const p of PRESSURES) for(const v of ['temperature','relative_humidity','wind_speed','wind_direction','cloud_cover']) vars.push(v+'_'+p+'hPa');
  const rows:WeatherRow[]=[];
  for(let pos=0;pos<samples.length;pos+=3) {
    const part=samples.slice(pos,pos+3);
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
      rows.push({sample:part[i],levels,flPressure,atFl,alerts});
    });
  }
  return rows;
}
