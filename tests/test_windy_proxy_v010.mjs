import assert from 'node:assert/strict';
import handler from '../api/windy-forecast.js';
const originalKey=process.env.WINDY_POINT_FORECAST_KEY;
const originalFetch=globalThis.fetch;
const request=(method='POST',origin='https://www.windy.com',body={lat:55,lon:37,etaMs:Date.now(),model:'gfs'})=>({method,headers:{origin},body});
function response(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this;},
    status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},end(){return this;}};
}
try{
  delete process.env.WINDY_POINT_FORECAST_KEY;
  let res=response();await handler(request(),res);assert.equal(res.statusCode,503);assert(!JSON.stringify(res.body).includes('secret'));
  process.env.WINDY_POINT_FORECAST_KEY='test-key-secret';
  res=response();await handler(request('POST','https://not-windy.com'),res);assert.equal(res.statusCode,403);
  res=response();await handler(request('GET'),res);assert.equal(res.statusCode,405);
  res=response();await handler(request('OPTIONS'),res);assert.equal(res.statusCode,204);
  res=response();await handler(request('POST','https://www.windy.com',{lat:910,lon:0,etaMs:Date.now(),model:'gfs'}),res);assert.equal(res.statusCode,400);
  let requested;
  globalThis.fetch=async(url,options)=>{
    requested={url,options};
    return {ok:true,json:async()=>({ts:[Date.now()],units:{'temp-300h':'K'},'temp-300h':[220]})};
  };
  res=response();await handler(request(),res);assert.equal(res.statusCode,200);
  assert.equal(res.headers['Access-Control-Allow-Origin'],'https://www.windy.com');
  const body=JSON.parse(requested.options.body);
  assert.equal(body.key,'test-key-secret');
  assert.equal(body.model,'gfs');assert(!body.levels.includes('250h'));
  assert(!JSON.stringify(res.body).includes('test-key-secret'));
  assert.equal(requested.url,'https://api.windy.com/api/point-forecast/v2');
}finally{
  if(originalKey===undefined)delete process.env.WINDY_POINT_FORECAST_KEY;
  else process.env.WINDY_POINT_FORECAST_KEY=originalKey;
  globalThis.fetch=originalFetch;
}
console.log('PASS v0.10.1 (v0.10.0 regression): Vercel proxy key shielding, POST-only, origin/coordinates validation, Windy upstream contract');
