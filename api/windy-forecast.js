/** Vercel serverless function: signed-in user's Point Forecast key remains in Vercel env.
 * One coordinate per request. Do not proxy arbitrary URLs or model/parameter lists.
 */
const LEVELS=['850h','800h','700h','600h','500h','400h','300h','200h','150h'];
const DEFAULT_ORIGINS=['https://www.windy.com','https://windy.com','https://plugins.windy.com'];
export default async function handler(req,res){
  const origin=req.headers.origin||'';
  const allowed=(process.env.WINDY_ALLOWED_ORIGINS||DEFAULT_ORIGINS.join(',')).split(',').map(v=>v.trim()).filter(Boolean);
  if(origin && allowed.includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','private, no-store');
  if(req.method==='OPTIONS')return res.status(origin&& !allowed.includes(origin)?403:204).end();
  if(origin&&!allowed.includes(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method!=='POST')return res.status(405).json({error:'Only POST is supported'});
  const key=process.env.WINDY_POINT_FORECAST_KEY;
  if(!key)return res.status(503).json({error:'WINDY_POINT_FORECAST_KEY is not configured in Vercel'});
  let body;
  try {body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}
  catch(_error){return res.status(400).json({error:'Invalid JSON body'});}
  const {lat,lon,etaMs,model}=body;
  if(typeof lat!=='number'||!Number.isFinite(lat)||Math.abs(lat)>90||
     typeof lon!=='number'||!Number.isFinite(lon)||Math.abs(lon)>180||
     !Number.isSafeInteger(etaMs)||Math.abs(etaMs-Date.now())>20*86400000 ||
     model!=='gfs')return res.status(400).json({error:'Invalid coordinates, forecast time, or unsupported model'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  try {
    const upstream=await fetch('https://api.windy.com/api/point-forecast/v2',{
      method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lat,lon,model:'gfs',parameters:['wind','temp','rh'],levels:LEVELS,key})
    });
    if(!upstream.ok) return res.status(upstream.status===400?502:503).json({error:`Windy API returned HTTP ${upstream.status}; check the Point Forecast key/plan`});
    const raw=await upstream.json();
    if(!Array.isArray(raw.ts)||!raw.units)return res.status(502).json({error:'Windy response missing ts/units'});
    return res.status(200).json(raw);
  } catch(error) {
    return res.status(503).json({error:controller.signal.aborted?'Windy upstream timeout':'Windy upstream unavailable'});
  } finally{clearTimeout(timer);}
}
