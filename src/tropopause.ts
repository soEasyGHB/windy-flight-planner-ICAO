/** Independently derived approximate thermal tropopause using Open-Meteo
 * temperature AND model geopotential heights (not standard-atmosphere heights).
 * It is not an ICAO/SIGWX tropopause forecast; unresolved columns remain null.
 */
import type {Sample} from './weather';
export const TROPOPAUSE_PRESSURES=[700,600,500,400,300,250,200,150,100,50] as const;
const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const key=(variable:string,p:number)=>`${variable}_${p}hPa`;
type Column={heightM:number;tempC:number};
export function estimateModelTropopauseFL(column:Column[]):number|null {
  const levels=column.filter(x=>valid(x.heightM)&&valid(x.tempC)).sort((a,b)=>a.heightM-b.heightM);
  if(levels.length<4)return null;
  // Conservative coarse-column approximation of the WMO lapse-rate criterion:
  // local lapse <= 2 C/km and the average over at least the next 2 km <= 2.
  for(let i=0;i<levels.length-1;i++){
    const a=levels[i],b=levels[i+1],dz=b.heightM-a.heightM;
    if(a.heightM<7000||a.heightM>17000||dz<100||dz>5000)continue;
    const lapse=(a.tempC-b.tempC)/(dz/1000);
    if(lapse>2)continue;
    const upper=levels.find(v=>v.heightM>=a.heightM+2000);
    if(!upper)continue;
    const avg=(a.tempC-upper.tempC)/((upper.heightM-a.heightM)/1000);
    if(avg<=2)return Math.round(a.heightM/30.48);
  }
  return null;
}
export async function loadTropopause(samples:Sample[]):Promise<Array<number|null>> {
  const result=new Array<number|null>(samples.length).fill(null);
  for(let start=0;start<samples.length;start+=6){
    const batch=samples.slice(start,start+6);
    const hourly=TROPOPAUSE_PRESSURES.flatMap(p=>[key('temperature',p),key('geopotential_height',p)]);
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',batch.map(s=>s.lat.toFixed(4)).join(','));
    url.searchParams.set('longitude',batch.map(s=>s.lon.toFixed(4)).join(','));
    url.searchParams.set('hourly',hourly.join(','));
    url.searchParams.set('timezone','GMT');url.searchParams.set('forecast_days','16');
    url.searchParams.set('models','gfs_seamless'); // same model family as Windy GFS, separate provider/run
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    let response:Response;
    try{response=await fetch(url.toString(),{signal:controller.signal});}
    finally{clearTimeout(timer);}
    if(!response.ok)throw Error(`Open-Meteo tropopause HTTP ${response.status}`);
    const raw=await response.json();
    const items=Array.isArray(raw)?raw:[raw];
    if(items.length!==batch.length)throw Error('Неверное число колонок тропопаузы');
    for(let i=0;i<batch.length;i++){
      const data=items[i]?.hourly as Record<string,unknown[]> | undefined;
      const times=data?.time as string[] |undefined;
      if(!times?.length)continue;
      const toTime=(x:string)=>Date.parse(x.endsWith('Z')?x:x+'Z');
      let ti=0;
      for(let j=1;j<times.length;j++)if(Math.abs(toTime(times[j])-batch[i].eta.getTime())<Math.abs(toTime(times[ti])-batch[i].eta.getTime()))ti=j;
      if(Math.abs(toTime(times[ti])-batch[i].eta.getTime())>90*60000)continue;
      const profile:Column[]=[];
      for(const p of TROPOPAUSE_PRESSURES){
        const heightM=data?.[key('geopotential_height',p)]?.[ti];
        const tempC=data?.[key('temperature',p)]?.[ti];
        if(valid(heightM)&&valid(tempC))profile.push({heightM,tempC});
      }
      result[start+i]=estimateModelTropopauseFL(profile);
    }
  }
  return result;
}
