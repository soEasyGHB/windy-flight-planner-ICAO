/** Windy Point Forecast v2 client via a user-owned Vercel function.
 * The API key is never sent to the browser. No Open-Meteo fallback is mislabeled Windy.
 */
import {PRESSURES,FLIGHT_LEVELS,flLevel,flToHpa,interpolatePressure,isaTemperatureC} from './weather';
import type {Sample,WeatherCell,WeatherRow} from './weather';
import {loadTropopause} from './tropopause';

// 250 hPa is NOT exposed by Windy Point Forecast (as of Nov 2026).
export const WINDY_PRESSURES=[850,800,700,600,500,400,300,200,150] as const;
export const MAX_FORECAST_WAYPOINTS=80;
type WindyPointResponse={ts:number[];units:Record<string,string>;[name:string]:unknown};
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const numeric=(x:unknown):number|null=>finite(x)?x:null;
const round=(v:number|null)=>v===null?null:Math.round(v);
function valueAt(raw:WindyPointResponse,key:string,index:number):number|null {
  const v=raw[key];return Array.isArray(v)?numeric(v[index]):null;
}
function celsius(value:number|null,unit:string):number|null {
  return value===null?null:unit==='K'?value-273.15:unit==='°F'||unit==='F'?(value-32)*5/9:value;
}
function speedKt(value:number,unit:string):number {
  if(unit==='m*s-1'||unit==='m/s')return value*1.94384449;
  if(unit==='km*h-1'||unit==='km/h')return value/1.852;
  return value;
}
function humidity(value:number|null,unit:string):number|null {
  if(value===null)return null;
  return unit==='1'||unit==='fraction'?value*100:value;
}
const emptyCell=():WeatherCell=>({temp:null,rh:null,windKt:null,windDir:null,cloud:null,cape:null,isaDeviationC:null,indicators:[]});
/** Converts raw, timestamped Windy data, with vector winds and source-provided units. */
export function parseWindyPoint(raw:WindyPointResponse,sample:Sample,selectedFl:number):WeatherRow {
  if(!Array.isArray(raw.ts)||!raw.ts.length||!raw.units || typeof raw.units!=='object')
    throw Error('Windy: ответ не содержит временной шкалы или единиц измерения');
  let index=-1,best=Infinity;
  for(let i=0;i<raw.ts.length;i++){
    if(!finite(raw.ts[i]))continue;
    const difference=Math.abs(raw.ts[i]-sample.eta.getTime());
    if(difference<best){best=difference;index=i;}
  }
  if(index<0||best>90*60_000)throw Error(`Windy: ETA ${sample.label} вне горизонта прогноза (ближайший прогноз > 90 мин)`);
  const levels={} as Record<number,WeatherCell>;
  let populated=0;
  for(const p of WINDY_PRESSURES){
    const suffix=`${p}h`;
    const tKey=`temp-${suffix}`,rhKey=`rh-${suffix}`;
    const temp=round(celsius(valueAt(raw,tKey,index),raw.units[tKey]||'K'));
    const rh=round(humidity(valueAt(raw,rhKey,index),raw.units[rhKey]||'%'));
    const uKey=`wind_u-${suffix}`,vKey=`wind_v-${suffix}`;
    const u=valueAt(raw,uKey,index),v=valueAt(raw,vKey,index);
    const unit=raw.units[uKey]||'m*s-1';
    const windKt=u!==null&&v!==null?round(speedKt(Math.hypot(u,v),unit)):null;
    const windDir=u!==null&&v!==null?round((Math.atan2(-u,-v)*180/Math.PI+360)%360):null;
    const isaDeviationC=temp===null?null:round(temp-isaTemperatureC((44330.77*(1-Math.pow(p/1013.25,1/5.25588)))/30.48));
    const indicators:string[]=[];
    if(windKt!==null&&windKt>=100)indicators.push('высокая скорость ветра');
    if(temp!==null&&rh!==null&&temp>=-20&&temp<=0&&rh>=80)indicators.push('условия возможного обледенения*');
    levels[p]={temp,rh,windKt,windDir,isaDeviationC,cloud:null,cape:null,indicators};
    if(temp!==null && windKt!==null)populated++;
  }
  if(populated<2)throw Error(`Windy: недостаточно вертикальных уровней для ${sample.label}`);
  const flightLevels={} as Record<number,WeatherCell>;
  for(const fl of FLIGHT_LEVELS)flightLevels[fl]=interpolatePressure(levels,flToHpa(fl),fl);
  const atFl=interpolatePressure(levels,flToHpa(selectedFl),selectedFl);
  return {sample,levels,flightLevels,flPressure:flLevel(selectedFl),atFl,
    tropopauseFL:null,alerts:[...atFl.indicators]};
}
export function normalizeForecastBaseUrl(value:string):string {
  const raw=value.trim();
  if(!raw)throw Error('Укажи URL своего проекта Vercel в настройках источника Windy');
  const url=new URL(raw);
  if(url.protocol!=='https:' && !(url.protocol==='http:'&&url.hostname==='localhost'))
    throw Error('Для Windy API нужен HTTPS-адрес Vercel');
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/')
    throw Error('Укажи только адрес сайта Vercel, без /api, пути или параметров');
  return url.origin;
}
export async function loadWindyWeather(samples:Sample[],selectedFl:number,baseUrl:string,progress?:(s:string)=>void):Promise<WeatherRow[]> {
  if(!samples.length)return [];
  if(samples.length>MAX_FORECAST_WAYPOINTS)throw Error(`Маршрут содержит более ${MAX_FORECAST_WAYPOINTS} точек; превышен защитный лимит Windy API`);
  const origin=normalizeForecastBaseUrl(baseUrl);
  const rows=new Array<WeatherRow>(samples.length);
  let next=0,done=0;
  const workers=Array.from({length:Math.min(3,samples.length)},async()=>{
    while(next<samples.length){
      const i=next++,sample=samples[i];
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),23000);
      let response:Response;
      try {
        response=await fetch(origin+'/api/windy-forecast',{
          method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
          body:JSON.stringify({lat:sample.lat,lon:sample.lon,etaMs:sample.eta.getTime(),model:'gfs'})
        });
      } catch(err) {
        throw Error(controller.signal.aborted?'Vercel/Windy: ожидание более 23 секунд':`Vercel/Windy недоступен: ${String(err)}`);
      } finally {clearTimeout(timer);}
      if(!response.ok){
        let message='';try{const error=await response.json();message=String(error.error??'');}catch(_error){}
        throw Error(`Vercel/Windy HTTP ${response.status}${message?': '+message.slice(0,240):''}`);
      }
      rows[i]=parseWindyPoint(await response.json(),sample,selectedFl);
      done++;
      progress?.(`Windy Point Forecast (GFS): ${done}/${samples.length}`);
    }
  });
  await Promise.all(workers);
  // Tropopause isn't a Windy Point Forecast parameter. Use a separate model
  // vertical column, with geopotential heights; missing values stay unknown.
  try {
    progress?.('Тропопауза: независимый вертикальный профиль Open-Meteo…');
    const heights=await loadTropopause(samples);
    rows.forEach((row,i)=>{row.tropopauseFL=heights[i]??null;});
  } catch(err) {
    progress?.('Тропопауза недоступна: '+String(err));
  }
  return rows;
}
