/** Windy-inspired route weather cross-section; no external chart library.
 * Not a copy of native Windy graphics and not a flight-planning product.
 * All geometry and color input comes from the supplied forecast rows.
 */
import type {WeatherRow,WeatherCell} from './weather';

export const PROFILE_LEVELS=[390,380,370,360,350,340,330] as const;
export const PROFILE_TOP=226;
export const PROFILE_ROW_STEP=52;
export const PROFILE_LEFT=86;
export const PROFILE_RIGHT=38;
export const PROFILE_BOTTOM=PROFILE_TOP+6*PROFILE_ROW_STEP;
export const PROFILE_HEIGHT=635;

export type GradientStop={offset:number;color:string};
export type Band={level:number;y:number;stops:GradientStop[]};
export type Waypoint={index:number;label:string;distanceNm:number;etaUtc:string;x:number;labelX:number;labelY:number;labelWidth:number};
export type Barb={x:number;y:number;direction:number;speed:number;shaft:string;feathers:string;pennants:string;calm:boolean};
export type IsaLabel={x:number;y:number;text:string};
export type Point2D={x:number;y:number};
export type IsaContour={value:number;segments:Point2D[][];labels:Array<Point2D&{text:string}>};
export type LevelRecommendation={fl:number;averageTailwindKt:number;coverage:number;parity:'even'|'odd'};
export type TropopausePoint=Point2D&{fl:number};
/** Signed along-track wind: positive is tailwind, negative is headwind.
 * True route course is computed from the straight line between named fixes;
 * it is not an ATS airway course or a magnetic heading.
 */
export type AlongTrackWind={
  courseDeg:number;windFromDeg:number;windKt:number;
  signedKt:number;componentKt:number;crosswindKt:number;
  kind:'tail'|'head'|'cross';
};
export type ComponentGlyph=AlongTrackWind&{x:number;y:number;level:number};
export type ProfileChart={
  width:number;height:number;left:number;right:number;top:number;bottom:number;
  totalNm:number;selectedFl:number;selectedY:number;
  levels:readonly number[];bands:Band[];barbs:Barb[];components:ComponentGlyph[];waypointWinds:(AlongTrackWind|null)[];waypoints:Waypoint[];
  ticks:Array<{x:number;distanceNm:number;label:string}>;
  isaLabels:IsaLabel[];isaContours:IsaContour[];recommendations:LevelRecommendation[];
  tropopauseSegments:Point2D[][];tropopauseMarkers:TropopausePoint[];
  tropopauseBandTop:number;tropopauseBandBottom:number;
  hasTropopause:boolean;tropopauseDescription:string;tropopauseLabel:Point2D|null;
};

const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const round=(n:number)=>Math.round(n*10)/10;
const radians=(degrees:number)=>degrees*Math.PI/180;
const normalizedAngle=(degrees:number)=>(degrees%360+360)%360;

/** Initial true great-circle course between two FIX coordinates; null for same place. */
export function trueCourseDeg(from:{lat:number;lon:number},to:{lat:number;lon:number}):number|null {
  if(![from.lat,from.lon,to.lat,to.lon].every(finite) ||
     Math.abs(from.lat)>90 || Math.abs(to.lat)>90 || Math.abs(from.lon)>180 || Math.abs(to.lon)>180)
    return null;
  const lat1=radians(from.lat),lat2=radians(to.lat),dlon=radians(to.lon-from.lon);
  const x=Math.sin(dlon)*Math.cos(lat2);
  const y=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dlon);
  if(Math.abs(x)<1e-12&&Math.abs(y)<1e-12)return null;
  return normalizedAngle(Math.atan2(x,y)*180/Math.PI);
}

/** Wind directions follow the meteorological FROM convention, as returned by Open-Meteo.
 * A 50kt wind nearly crosswise can create a ~5kt along-track component.
 * Round only after projecting so 0kt isn't colored as a weak head/tailwind.
 */
export function alongTrackWind(courseDeg:number|null,windFromDeg:number|null,windKt:number|null):AlongTrackWind|null {
  if(!finite(courseDeg)||!finite(windFromDeg)||!finite(windKt)||windKt<0)return null;
  const angle=radians(windFromDeg-courseDeg);
  const projected=Math.round(-windKt*Math.cos(angle));
  const signedKt=projected===0?0:projected; // eliminate negative zero at exact crosswind
  const crosswindKt=Math.round(Math.abs(windKt*Math.sin(angle)));
  return {courseDeg:normalizedAngle(courseDeg),windFromDeg:normalizedAngle(windFromDeg),windKt,
    signedKt,componentKt:Math.abs(signedKt),crosswindKt,
    kind:signedKt>0?'tail':signedKt<0?'head':'cross'};
}
const formatNm=(n:number)=>Math.round(n).toLocaleString('en-US').replace(/,/g,' ');

export function yForFlightLevel(fl:number):number {
  return PROFILE_TOP+(390-fl)/10*PROFILE_ROW_STEP;
}

/** Diffuse ISA palette, complemented by actual isolines. */
export function isaColor(isa:number|null|undefined):string {
  if(!finite(isa))return '#e6e9eb';
  const stops:Array<[number,number[]]>=[
    [-25,[205,226,239]],[-15,[218,237,241]],[-5,[234,241,236]],
    [0,[248,246,239]],[5,[249,231,222]],[15,[246,215,206]],
    [25,[240,200,191]]
  ];
  const t=clamp(isa,stops[0][0],stops[stops.length-1][0]);
  const upper=stops.findIndex(s=>s[0]>=t);
  if(upper<=0)return `rgb(${stops[0][1].join(',')})`;
  const [f,c0]=stops[upper-1],[end,c1]=stops[upper];
  const k=(t-f)/(end-f);
  return `rgb(${c0.map((n,i)=>Math.round(n+(c1[i]-n)*k)).join(',')})`;
}

/** Shaft points toward the direction the wind comes FROM (meteorological convention). */
export function windBarbGeometry(speedKt:number):{shaft:string;feathers:string;pennants:string;calm:boolean} {
  if(!finite(speedKt)||speedKt<2.5)
    return {shaft:'',feathers:'',pennants:'',calm:true};
  const speed=Math.max(0,Math.round(speedKt/5)*5);
  let remaining=speed;
  let cursor=-14;
  let pennants='';
  let feathers='';
  while(remaining>=50){
    pennants+=`M0 ${cursor} L9 ${cursor+5} L0 ${cursor+9} Z `;
    remaining-=50;cursor+=9;
  }
  while(remaining>=10){
    feathers+=`M0 ${cursor} L9 ${cursor+5} `;
    remaining-=10;cursor+=5;
  }
  if(remaining>=5){feathers+=`M0 ${cursor} L5 ${cursor+3} `;}
  return {shaft:'M0 13 L0 -14',feathers:feathers.trim(),pennants:pennants.trim(),calm:false};
}

const vector=(windKt:number,windDir:number):[number,number]=>[
  windKt*Math.cos(windDir*Math.PI/180),windKt*Math.sin(windDir*Math.PI/180)
];
/** Interpolate wind as vectors so 355° + 5° does not become 180°. */
export function blendWind(a:WeatherCell|null,b:WeatherCell|null,f:number):{speed:number;direction:number}|null {
  const ak=a?.windKt,ad=a?.windDir,bk=b?.windKt,bd=b?.windDir;
  if(!finite(ak)||!finite(ad)){
    return finite(bk)&&finite(bd)?{speed:bk,direction:(bd+360)%360}:null;
  }
  if(!finite(bk)||!finite(bd))return {speed:ak,direction:(ad+360)%360};
  const [ax,ay]=vector(ak,ad),[bx,by]=vector(bk,bd);
  const u=ax+(bx-ax)*f,v=ay+(by-ay)*f;
  return {speed:Math.hypot(u,v),direction:(Math.atan2(v,u)*180/Math.PI+360)%360};
}

/** Weighted along-route tail/headwind advantage. All legs must have a wind
 * at both endpoints; otherwise a recommendation would be misleading.
 * This is meteorological ranking ONLY: NOT a cleared, safe, economical or
 * aircraft-performance-valid flight level.
 */
export function recommendFlightLevels(rows:WeatherRow[]):LevelRecommendation[]{
  if(rows.length<2)return [];
  const candidates:LevelRecommendation[]=[];
  for(const level of PROFILE_LEVELS){
    let weighted=0,total=0,complete=true;
    for(let i=1;i<rows.length;i++){
      const prev=rows[i-1],next=rows[i];
      const distance=next.sample.distanceNm-prev.sample.distanceNm;
      if(!finite(distance)||distance<0){complete=false;break;}
      if(distance===0)continue;
      const course=trueCourseDeg(prev.sample,next.sample);
      const a=prev.flightLevels[level],b=next.flightLevels[level];
      const first=alongTrackWind(course,a?.windDir??null,a?.windKt??null);
      const last=alongTrackWind(course,b?.windDir??null,b?.windKt??null);
      if(!first||!last){complete=false;break;}
      weighted+=(first.signedKt+last.signedKt)/2*distance;
      total+=distance;
    }
    if(complete&&total>0)candidates.push({fl:level,averageTailwindKt:Math.round(weighted/total),coverage:1,
      parity:Math.round(level/10)%2===0?'even':'odd'});
  }
  return (['even','odd'] as const).flatMap(parity=>{
    const available=candidates.filter(c=>c.parity===parity);
    if(!available.length)return [];
    available.sort((a,b)=>b.averageTailwindKt-a.averageTailwindKt||a.fl-b.fl);
    return [available[0]];
  });
}

/** Iso-ISA isolines, as short marching-squares segments within each altitude
 * and waypoint cell. There is no manufactured isoline across missing data.
 */
export function buildIsaContours(rows:WeatherRow[],xs:number[]):IsaContour[]{
  const values=[-25,-20,-15,-10,-5,0,5,10,15,20,25];
  const contours=values.map(value=>({value,segments:[] as Point2D[][],labels:[] as Array<Point2D&{text:string}>}));
  if(rows.length<2)return contours;
  const makeIntersection=(a:Point2D,b:Point2D,va:number,vb:number,target:number):Point2D=>{
    const fraction=va===vb ? 0.5 : clamp((target-va)/(vb-va),0,1);
    return {x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};
  };
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<PROFILE_LEVELS.length-1;j++){
    const top=PROFILE_LEVELS[j],bottom=PROFILE_LEVELS[j+1];
    const corners=[
      {x:xs[i],y:yForFlightLevel(top)},
      {x:xs[i+1],y:yForFlightLevel(top)},
      {x:xs[i+1],y:yForFlightLevel(bottom)},
      {x:xs[i],y:yForFlightLevel(bottom)}
    ];
    const measures=[rows[i].flightLevels[top]?.isaDeviationC,
      rows[i+1].flightLevels[top]?.isaDeviationC,
      rows[i+1].flightLevels[bottom]?.isaDeviationC,
      rows[i].flightLevels[bottom]?.isaDeviationC];
    if(!measures.every(finite))continue;
    const nums=measures as number[];
    for(const contour of contours){
      const crossings:Point2D[]=[];
      for(let edge=0;edge<4;edge++){
        const next=(edge+1)%4,v0=nums[edge],v1=nums[next];
        if((v0<=contour.value&&v1>contour.value)||(v1<=contour.value&&v0>contour.value))
          crossings.push(makeIntersection(corners[edge],corners[next],v0,v1,contour.value));
      }
      for(let k=0;k+1<crossings.length;k+=2)contour.segments.push([crossings[k],crossings[k+1]]);
    }
  }
  for(const contour of contours){
    const sorted=contour.segments.filter(s=>s.length===2).sort((a,b)=>a[0].x-b[0].x);
    let lastX=-Infinity;
    for(const segment of sorted){
      const center={x:(segment[0].x+segment[1].x)/2,y:(segment[0].y+segment[1].y)/2};
      if(center.x-lastX<280||center.y<PROFILE_TOP+11||center.y>PROFILE_BOTTOM-11)continue;
      contour.labels.push({...center,text:`ISA ${contour.value>0?'+':''}${contour.value}°`});
      lastX=center.x;
    }
  }
  return contours;
}

/** ISO-safe, stable widths, supports duplicate distances without NaN. */
export function buildRouteProfile(rows:WeatherRow[],selectedFl=360):ProfileChart {
  const selected=PROFILE_LEVELS.includes(selectedFl as (typeof PROFILE_LEVELS)[number])?selectedFl:360;
  const width=Math.max(1080,Math.min(4800,rows.length*104));
  const available=width-PROFILE_LEFT-PROFILE_RIGHT;
  const distances=rows.map(r=>finite(r.sample.distanceNm)?Math.max(0,r.sample.distanceNm):0);
  const totalNm=Math.max(0,...distances,0);
  const span=totalNm>0?totalNm:Math.max(1,rows.length-1);
  const xs=rows.map((_,i)=>PROFILE_LEFT+available*(totalNm>0?distances[i]/span:i/span));
  /** At a waypoint use the outbound leg; at the destination use the inbound leg.
   * Duplicate consecutive coordinates are skipped, not given a fictitious course.
   */
  const courseAtIndex=(i:number):number|null=>{
    const origin=rows[i]?.sample;
    if(!origin)return null;
    for(let j=i+1;j<rows.length;j++){
      const course=trueCourseDeg(origin,rows[j].sample);
      if(course!==null)return course;
    }
    for(let j=i-1;j>=0;j--){
      const course=trueCourseDeg(rows[j].sample,origin);
      if(course!==null)return course;
    }
    return null;
  };
  const courseAtX=(x:number):number|null=>{
    if(rows.length<2)return null;
    let index=0;
    while(index<rows.length-2 && xs[index+1]<=x)index++;
    for(let offset=0;offset<rows.length-1;offset++){
      const j=Math.min(rows.length-2,index+offset);
      const course=trueCourseDeg(rows[j].sample,rows[j+1].sample);
      if(course!==null)return course;
    }
    for(let j=index-1;j>=0;j--){
      const course=trueCourseDeg(rows[j].sample,rows[j+1].sample);
      if(course!==null)return course;
    }
    return null;
  };
  const waypointWinds=rows.map((r,i)=>{
    const c=r.flightLevels[selected]??r.atFl;
    return alongTrackWind(courseAtIndex(i),c?.windDir??null,c?.windKt??null);
  });
  const levels=PROFILE_LEVELS;
  const bands:Band[]=levels.map(level=>({
    level,y:yForFlightLevel(level),
    stops:rows.length?rows.map((r,i)=>({
      offset:round(100*(xs[i]-PROFILE_LEFT)/available),
      color:isaColor(r.flightLevels[level]?.isaDeviationC)
    })):[{offset:0,color:'#eef0ef'},{offset:100,color:'#eef0ef'}]
  }));
  // Every fix name is visible. Place compact labels on six staggered rows,
  // linked to the exact-distance marker even when fixes are closely spaced.
  const labelLanes=[38,53,68,83,98,113];
  const lastRight=labelLanes.map(()=>-Infinity);
  const waypoints=rows.map((r,i)=>{
    const label=r.sample.label;
    const labelWidth=clamp(label.length*6.6+15,43,105);
    const nominalX=clamp(xs[i],labelWidth/2+3,width-labelWidth/2-3);
    const free=lastRight.findIndex(right=>nominalX-labelWidth/2-right>=5);
    let lane=free;
    let labelX=nominalX;
    if(lane<0){
      // If all label lanes are busy, put the next label on the least crowded
      // lane and offset it horizontally. The exact route distance is unchanged.
      lane=lastRight.indexOf(Math.min(...lastRight));
      labelX=clamp(Math.max(nominalX,lastRight[lane]+labelWidth/2+5),labelWidth/2+3,width-labelWidth/2-3);
    }
    lastRight[lane]=labelX+labelWidth/2;
    return {index:i,label,distanceNm:r.sample.distanceNm,
      etaUtc:r.sample.eta.toISOString().slice(11,16)+'Z',x:xs[i],
      labelX,labelY:labelLanes[lane],labelWidth};
  });
  const ticks:Array<{x:number;distanceNm:number;label:string}>=[];
  if(totalNm>0){
    const step=totalNm<=1000?200:totalNm<=3200?500:totalNm<=7000?1000:2000;
    for(let d=step;d<totalNm;d+=step)ticks.push({
      x:PROFILE_LEFT+available*d/totalNm,distanceNm:d,label:formatNm(d)+' NM'
    });
  }
  const barbs:Barb[]=[];
  const components:ComponentGlyph[]=[];
  const spaced=51;
  const windAt=(x:number,level:number)=>{
    if(!rows.length)return null;
    let j=0;
    while(j<rows.length-2 && xs[j+1]<x)j++;
    const x0=xs[j],x1=xs[Math.min(j+1,xs.length-1)];
    const f=x1>x0?clamp((x-x0)/(x1-x0),0,1):0;
    const first=rows[j].flightLevels[level]??null;
    const second=rows[Math.min(j+1,rows.length-1)].flightLevels[level]??null;
    // Do not extrapolate a forecast into a missing point: an unknown wind
    // must not produce a colored head/tail component on the profile.
    if(!finite(first?.windKt)||!finite(first?.windDir)||
       !finite(second?.windKt)||!finite(second?.windDir))return null;
    return blendWind(first,second,f);
  };
  for(const level of levels){
    for(let x=PROFILE_LEFT+27;x<width-PROFILE_RIGHT-9;x+=spaced){
      const wind=windAt(x,level);
      if(!wind)continue;
      const geometry=windBarbGeometry(wind.speed);
      barbs.push({x,y:yForFlightLevel(level),direction:wind.direction,speed:wind.speed,...geometry});
      const component=alongTrackWind(courseAtX(x),wind.direction,wind.speed);
      // Do not draw a glyph for an absent or zero along-track component.
      // A pure crosswind (including rounded-to-zero) must leave the plot empty.
      if(component && component.kind!=='cross')components.push({x,y:yForFlightLevel(level),level,...component});
    }
  }
  const isaLabels:IsaLabel[]=[]; // maintained for compatibility; isotherms are preferred.
  const isaContours=buildIsaContours(rows,xs);
  const recommendations=recommendFlightLevels(rows);
  // The actual tropopause can be outside FL330–390. Show a dedicated band,
  // clearly labeled as a separate FL scale, to keep a continuous route trace
  // without falsely clipping it to the cruise-level graph boundaries.
  const tropopauseBandTop=148,tropopauseBandBottom=198;
  const tropopauseSegments:Point2D[][]=[];
  const tropopauseMarkers:TropopausePoint[]=[];
  const estimates=rows.map(r=>r.tropopauseFL).filter(finite);
  const min=estimates.length?Math.min(...estimates):300;
  const max=estimates.length?Math.max(...estimates):450;
  const pad=Math.max(20,(max-min)*.15);
  const lo=clamp(min-pad,120,550),hi=Math.max(lo+40,clamp(max+pad,160,580));
  const tropopauseY=(fl:number)=>tropopauseBandBottom-(fl-lo)/(hi-lo)*(tropopauseBandBottom-tropopauseBandTop);
  for(let i=0;i<rows.length;i++){
    const fl=rows[i].tropopauseFL;
    if(finite(fl))tropopauseMarkers.push({x:xs[i],y:tropopauseY(fl),fl});
    if(i>0 && finite(fl) && finite(rows[i-1].tropopauseFL)){
      tropopauseSegments.push([
        {x:xs[i-1],y:tropopauseY(rows[i-1].tropopauseFL!)},
        {x:xs[i],y:tropopauseY(fl)}
      ]);
    }
  }
  const hasTropopause=tropopauseMarkers.length>0;
  const tropopauseDescription=!hasTropopause?'Тропопауза: нет достаточных данных модели':
    min===max?`Тропопауза ≈ FL${Math.round(min)}`:`Тропопауза ≈ FL${Math.round(min)}–${Math.round(max)}`;
  const midSegment=tropopauseSegments[Math.floor(tropopauseSegments.length/2)];
  const tropopauseLabel=midSegment
    ?{x:(midSegment[0].x+midSegment[1].x)/2,y:(midSegment[0].y+midSegment[1].y)/2}
    :tropopauseMarkers.length?tropopauseMarkers[Math.floor(tropopauseMarkers.length/2)]:null;
  return {width,height:PROFILE_HEIGHT,left:PROFILE_LEFT,right:width-PROFILE_RIGHT,
    top:PROFILE_TOP,bottom:PROFILE_BOTTOM,totalNm,
    selectedFl:selected,selectedY:yForFlightLevel(selected),levels,bands,barbs,components,waypointWinds,waypoints,ticks,isaLabels,isaContours,recommendations,
    tropopauseSegments,tropopauseMarkers,tropopauseBandTop,tropopauseBandBottom,hasTropopause,tropopauseDescription,tropopauseLabel};
}
