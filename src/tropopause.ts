/** Independently derived approximate thermal tropopause using Open-Meteo
 * temperature AND model geopotential heights (not standard-atmosphere heights).
 * It is not an ICAO/SIGWX tropopause forecast; unresolved columns remain null.
 */
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
