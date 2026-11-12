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
  const timestampChanges=[];
  let windyTimestamp=0;
  let rejectTimestamp=false;
  const fallbackUrls=[];
  const sharedFiles=[];
  const downloadedFiles=[];
  const fake={
    '@windy/broadcast':{default:{emit(...args){plannerRequests.push(args);}}},
    '@windy/store':{store:{
      set(key,value){assert.equal(key,'timestamp');timestampChanges.push(value);if(!rejectTimestamp)windyTimestamp=value;return !rejectTimestamp;},
      get(key){assert.equal(key,'timestamp');return windyTimestamp;}
    }},
    '@windy/map':{map:{removeLayer(){}}},
    'svelte':{onMount(){},onDestroy(){}},
    './pluginConfig':{default:{title:'Flight Route Analyzer'}},
    './navdataConfig':{NAVDATA_GITHUB_REPO:'https://example.invalid'},
    './routeGpx':{
      departureIsoUtc:(date,time)=>`${date}T${time}:00Z`
    },
    './nativePlannerHandoff':{
      buildNativePlannerHandoff: (_route,etd)=>({
        timestampMs:Date.parse(etd),departureUtc:etd,
        params:{coords:[{lat:55.9726,lon:37.4146},{lat:50.0379,lon:8.5622}],view:'ifr'},
        fallbackUrl:'https://www.windy.com/distance/55.9726,37.4146;50.0379,8.5622?2026-11-13-00,55.9726,37.4146,5',
        partial:false,verticesSent:2,from:'UUEE',to:'EDDF'
      })
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
    window:{open:(...args)=>fallbackUrls.push(args)},
    require:name=>({__esModule:true,...(fake[name]??{})})
  };
  vm.createContext(sandbox);
  vm.runInContext(compiled,sandbox,{timeout:2000});
  assert.equal(typeof exports.onopen,'function');
  assert.doesNotThrow(()=>exports.onopen());
  vm.runInContext('etdDate="2026-11-13";etdTime="01:20";openNativePlanner()',sandbox,{timeout:2000});
  assert.deepEqual(timestampChanges,[Date.parse('2026-11-13T01:20:00Z')],'Windy forecast time must reflect selected UTC');
  assert.equal(vm.runInContext('status',sandbox).includes('Время прогноза Windy синхронизировано'),true);
  assert.deepEqual(plannerRequests,[['rqstOpen','rplanner']],
    'Planner must open without route or flight parameters');
  assert.equal(fallbackUrls.length,0);
  // New optional action must forward coordinates to the old internal Windy
  // rplanner integration, after setting selected forecast timestamp.
  vm.runInContext('parsed={segments:[[{lat:55.9726,lon:37.4146},{lat:50.0379,lon:8.5622}]]};gpxXml="<gpx/>";sendRouteAndUtcToPlanner()',sandbox,{timeout:2000});
  assert.deepEqual(plannerRequests[1],['rqstOpen','rplanner',{
    coords:[{lat:55.9726,lon:37.4146},{lat:50.0379,lon:8.5622}],view:'ifr'
  }]);
  assert.equal(timestampChanges.length,2);
  assert.equal(timestampChanges[1],Date.parse('2026-11-13T01:20:00Z'));
  assert.equal(vm.runInContext('handoffBackupUrl',sandbox).startsWith('https://www.windy.com/distance/'),true);
  assert.equal(vm.runInContext('status',sandbox).includes('Внутреннее время старта планировщика необходимо проверить'),true);

  await vm.runInContext('gpxXml="<gpx/>";gpxDownloadHref="blob:test";gpxFileName="route.gpx";sharePlannerGpx()',sandbox,{timeout:2000});
  assert.equal(sharedFiles.length,1,'iPad should receive native share request');
  assert.equal(sharedFiles[0].files[0].name,'route.gpx');
  assert.equal(downloadedFiles.length,0,'Do not download if sharing succeeded');
  // Browser without a Share Sheet downloads immediately from the same click.
  sandbox.navigator={};
  await vm.runInContext('sharePlannerGpx()',sandbox,{timeout:2000});
  assert.deepEqual(downloadedFiles,[['blob:test','route.gpx']]);
  // A rejected Windy timeline update must still open native planner and give a warning.
  rejectTimestamp=true;
  vm.runInContext('etdTime="02:20";openNativePlanner()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('status',sandbox).includes('Windy не принял'),true);
  assert.equal(plannerRequests.length,3);
  rejectTimestamp=false;
  // Fallback when the internal Windy planner event throws.
  fake['@windy/broadcast'].default.emit=()=>{throw new Error('unsupported');};
  vm.runInContext('openNativePlanner()',sandbox,{timeout:2000});
  assert.equal(fallbackUrls.length,1);
  assert.deepEqual(fallbackUrls[0],[
    'https://www.windy.com/distance','_blank','noopener,noreferrer'
  ]);
  await vm.runInContext('parsed={segments:[]};etdDate="2026-11-13";etdTime="01:20";departureInputChanged()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('gpxXml',sandbox),'<gpx>2026-11-13T01:20:00Z</gpx>',
    'Changing UTC fields should regenerate GPX without a new route build');
  assert.equal(vm.runInContext('gpxDownloadHref',sandbox),'blob:new-dated-gpx');
  console.log('PASS: Svelte startup, UTC timestamp sync, coordinate handoff, Windy rejection and fallback, GPX share');
}finally{
  rmSync(entry,{force:true});rmSync(temp,{recursive:true,force:true});
}
