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
  // Link is NOT auto-generated: the user explicitly confirms the current UTC
  // before any URL is made clickable. This avoids stale iPad Safari hrefs.
  vm.runInContext('parsed={segments:[[{lat:55.9726,lon:37.4146},{lat:50.0379,lon:8.5622}]]};prepareGpxDownload()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),'',
    'URL must not be precomputed with potentially stale UTC');
  const dateField={id:'fr-etd-date',value:'2026-11-16'};
  const timeField={id:'fr-etd-time',value:'18:20'};
  sandbox.document={getElementById:id=>id==='fr-etd-date'?dateField:id==='fr-etd-time'?timeField:null};
  vm.runInContext('generateWindyPlannerLink()',sandbox,{timeout:2000});
  const userTestedUrl='https://www.windy.com/route-planner/ifr/55.9726,37.4146;50.0379,8.5622?2026-11-16-18';
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),userTestedUrl);
  assert.equal(urlRequests.at(-1),'2026-11-16T18:20:00Z');
  assert.equal(vm.runInContext('etdTime',sandbox),'18:20');
  assert.equal(vm.runInContext('gpxXml',sandbox),'<gpx>2026-11-16T18:20:00Z</gpx>');
  assert(vm.runInContext('windyPlannerNote',sandbox).includes('18:00 UTC'),
    'Show the effective three-hour Windy UTC slot');
  // Native iPad picker may not have sent an input/change event before the
  // user taps the existing link. Block stale navigation, do not modify href.
  const click={prevented:false,preventDefault(){this.prevented=true;}};
  sandbox.click=click;
  timeField.value='21:00';
  vm.runInContext('checkGeneratedLinkFreshness(click)',sandbox,{timeout:2000});
  assert.equal(click.prevented,true,'Old href must not open if native field changed silently');
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),'');
  timeField.value='18:20';
  vm.runInContext('generateWindyPlannerLink()',sandbox,{timeout:2000});
  click.prevented=false;
  vm.runInContext('checkGeneratedLinkFreshness(click)',sandbox,{timeout:2000});
  assert.equal(click.prevented,false,'Confirmed correct URL should remain a normal anchor');

  // Changing either input MUST invalidate the previously generated URL.
  timeField.value='21:00';
  vm.runInContext('departureInputChanged({currentTarget:{id:"fr-etd-time",value:"21:00"}})',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),'', 'Never retain an old URL after UTC changes');
  vm.runInContext('generateWindyPlannerLink()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),
    'https://www.windy.com/route-planner/ifr/55.9726,37.4146;50.0379,8.5622?2026-11-16-21');
  // Even if an iPad picker never sent an event, generating reads live DOM.
  timeField.value='15:00';
  vm.runInContext('generateWindyPlannerLink()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),
    'https://www.windy.com/route-planner/ifr/55.9726,37.4146;50.0379,8.5622?2026-11-16-15');
  timeField.value='invalid-time';
  vm.runInContext('generateWindyPlannerLink()',sandbox,{timeout:2000});
  assert.equal(vm.runInContext('windyPlannerUrl',sandbox),'','Invalid UTC must not produce a clickable old URL');
  assert(vm.runInContext('windyPlannerNote',sandbox).includes('Не удалось сформировать'),
    'Show a clear validation error');
  timeField.value='18:20';
  assert.equal(plannerRequests.length,0,'Use URL, not failed Windy internal event');

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
  console.log('PASS: Svelte startup, explicit UTC generation, stale-link invalidation, GPX share, verified IFR URL');
}finally{
  rmSync(entry,{force:true});rmSync(temp,{recursive:true,force:true});
}
