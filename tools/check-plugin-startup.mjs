/** Catch unknown TS names and eager runtime initialization failures in the Svelte entry. */
import {readFileSync,writeFileSync,rmSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync('src/plugin.svelte','utf8');
const script=source.match(/<script\s+lang=["']ts["']>([\s\S]*?)<\/script>/)?.[1];
assert(script,'Svelte TS script missing');
const temp=mkdtempSync(join(tmpdir(),'windy-gpx-startup-'));
const entry='src/__windy_startup_smoke__.ts';
try {
  writeFileSync(entry,script);
  const output=join(temp,'__windy_startup_smoke__.js');
  let diagnostics='';
  try {
    execFileSync('tsc',['--target','es2022','--module','commonjs','--moduleResolution','node',
      '--lib','es2022,dom','--skipLibCheck','--esModuleInterop','--noEmitOnError','false',
      '--rootDir','src','--outDir',temp,entry],{encoding:'utf8',stdio:'pipe'});
  }catch(err){diagnostics=`${err.stdout??''}\n${err.stderr??''}`;}
  assert(existsSync(output),`Startup script did not transpile:\n${diagnostics}`);
  const unexpected=diagnostics.split(/\r?\n/).filter(line=>/error TS(?:2304|2552):/.test(line)&&!/Cannot find name 'L'/.test(line));
  assert.equal(unexpected.length,0,`Unresolved names:\n${unexpected.join('\n')}`);
  const compiled=readFileSync(output,'utf8');
  const plannerRequests=[];
  const urlRequests=[];
  const sharedFiles=[];
  const downloadedFiles=[];
  const fake={
    '@windy/broadcast':{default:{emit(...args){plannerRequests.push(args);}}},
    '@windy/map':{map:{removeLayer(){}}},
    'svelte':{onMount(){},onDestroy(){}},
    './pluginConfig':{default:{title:'Flight Route Analyzer'}},
    './navdataConfig':{NAVDATA_GITHUB_REPO:'https://example.invalid'},
    './routeGpx':{
      departureIsoUtc:(date,time)=>{
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error('Invalid UTC');
        return `${date}T${time}:00Z`;
      }
    },
    './windyPlannerUrl':{
      buildWindyPlannerUrl: (_route,etd)=>{
        urlRequests.push(etd);
        const bucket=new Date(Math.round(Date.parse(etd)/(3*60*60*1000))*(3*60*60*1000))
          .toISOString().slice(0,13).replace('T','-');
        return {
          url:`https://www.windy.com/route-planner/ifr/55.9726,37.4146;50.0379,8.5622?${bucket}`,
          requestedDepartureUtc:etd,urlTimeUtc:bucket,roundedTime:true,
          partial:false,pointsSent:2,from:'UUEE',to:'EDDF'
        };
      }
    },
    './gpxDownload':{
      prepareGpxPayload:(route,options)=>({
        xml:`<gpx>${options.departureUtc}</gpx>`,filename:'route.gpx',partial:false,pointCount:2,routeCount:1
      }),
      createGpxHref:()=> 'blob:new-dated-gpx',
      makeGpxShareFile:()=>({name:'route.gpx'}),
      triggerGpxDownload:(href,filename)=>downloadedFiles.push([href,filename])
    }
  };
  const exports={};
  const sandbox={
    exports,console:{warn(){},error(){},log(){}},Date,Math,JSON,URL,File,
    navigator:{canShare:()=>true,share:async info=>{sharedFiles.push(info);}},
    require:name=>({__esModule:true,...(fake[name]??{})})
  };
  vm.createContext(sandbox);
  vm.runInContext(compiled,sandbox,{timeout:2000});
  assert.equal(typeof exports.onopen,'function');
  assert.doesNotThrow(()=>exports.onopen());
  vm.runInContext('etdDate="2026-11-13";etdTime="01:20"',sandbox,{timeout:2000});
  assert.equal(plannerRequests.length,0,'No empty native planner should be opened');
  // Working URL handoff remains a normal anchor, no internal planner event.
  vm.runInContext('parsed={segments:[[{lat:55.9726,lon:37.4146},{lat:50.0379,lon:8.5622}]]};prepareGpxDownload()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),
    'https://www.windy.com/route-planner/ifr/55.9726,37.4146;50.0379,8.5622?2026-11-13-00');
  // Native picker has a newer DOM value than the last change event.
  const dateField={id:'fr-etd-date',value:'2026-11-16'};
  const timeField={id:'fr-etd-time',value:'18:20'};
  sandbox.document={getElementById:id=>id==='fr-etd-date'?dateField:timeField};
  sandbox.click={currentTarget:{href:'https://example.invalid/stale'},prevented:false,preventDefault(){this.prevented=true;}};
  vm.runInContext('openWindyPlannerWithCurrentEtd(click)',sandbox,{timeout:2000});
  assert.equal(sandbox.click.currentTarget.href,
    'https://www.windy.com/route-planner/ifr/55.9726,37.4146;50.0379,8.5622?2026-11-16-18',
    'Click must use the current DOM UTC and replace any stale URL');
  assert.equal(sandbox.click.prevented,false);
  assert.equal(urlRequests.at(-1),'2026-11-16T18:20:00Z');
  assert.equal(vm.runInContext('etdTime',sandbox),'18:20');
  assert.equal(vm.runInContext('gpxXml',sandbox),'<gpx>2026-11-16T18:20:00Z</gpx>');
  assert.equal(plannerRequests.length,0,'Use URL, not failed Windy internal event');
  timeField.value='invalid-time';
  sandbox.click.prevented=false;
  vm.runInContext('openWindyPlannerWithCurrentEtd(click)',sandbox,{timeout:2000});
  assert.equal(sandbox.click.prevented,true,'Invalid UTC must block stale URL navigation');
  assert.equal(vm.runInContext('status',sandbox).includes('Не удалось сформировать'),true);
  timeField.value='18:20';

  await vm.runInContext('gpxXml="<gpx/>";gpxDownloadHref="blob:test";gpxFileName="route.gpx";sharePlannerGpx()',sandbox,{timeout:2000});
  assert.equal(sharedFiles.length,1,'iPad should receive native share request');
  assert.equal(sharedFiles[0].files[0].name,'route.gpx');
  assert.equal(downloadedFiles.length,0,'Do not download if sharing succeeded');
  // Browser without a Share Sheet downloads immediately from the same click.
  sandbox.navigator={};
  await vm.runInContext('sharePlannerGpx()',sandbox,{timeout:2000});
  assert.deepEqual(downloadedFiles,[['blob:test','route.gpx']]);
  await vm.runInContext('parsed={segments:[]};etdDate="2026-11-13";etdTime="01:20";departureInputChanged()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('gpxXml',sandbox),'<gpx>2026-11-13T01:20:00Z</gpx>',
    'Changing UTC fields should regenerate GPX without a new route build');
  assert.equal(vm.runInContext('gpxDownloadHref',sandbox),'blob:new-dated-gpx');
  console.log('PASS: Svelte startup, GPX share, user-tested IFR URL, no empty planner or internal handoff');
}finally{
  rmSync(entry,{force:true});rmSync(temp,{recursive:true,force:true});
}
