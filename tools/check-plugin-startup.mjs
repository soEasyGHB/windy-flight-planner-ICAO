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
  const fallbackUrls=[];
  const sharedFiles=[];
  const downloadedFiles=[];
  const fake={
    '@windy/broadcast':{default:{emit(...args){plannerRequests.push(args);}}},
    '@windy/map':{map:{removeLayer(){}}},
    'svelte':{onMount(){},onDestroy(){}},
    './pluginConfig':{default:{title:'Flight Route Analyzer'}},
    './navdataConfig':{NAVDATA_GITHUB_REPO:'https://example.invalid'},
    './gpxDownload':{
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
  vm.runInContext('openNativePlanner()',sandbox,{timeout:2000});
  assert.deepEqual(plannerRequests,[['rqstOpen','rplanner']],
    'Planner must open without route or flight parameters');
  assert.equal(fallbackUrls.length,0);
  await vm.runInContext('gpxXml="<gpx/>";gpxDownloadHref="blob:test";gpxFileName="route.gpx";sharePlannerGpx()',sandbox,{timeout:2000});
  assert.equal(sharedFiles.length,1,'iPad should receive native share request');
  assert.equal(sharedFiles[0].files[0].name,'route.gpx');
  assert.equal(downloadedFiles.length,0,'Do not download if sharing succeeded');
  // Browser without a Share Sheet downloads immediately from the same click.
  sandbox.navigator={};
  await vm.runInContext('sharePlannerGpx()',sandbox,{timeout:2000});
  assert.deepEqual(downloadedFiles,[['blob:test','route.gpx']]);
  // Fallback when the internal Windy planner event throws.
  fake['@windy/broadcast'].default.emit=()=>{throw new Error('unsupported');};
  vm.runInContext('openNativePlanner()',sandbox,{timeout:2000});
  assert.equal(fallbackUrls.length,1);
  assert.deepEqual(fallbackUrls[0],[
    'https://www.windy.com/distance','_blank','noopener,noreferrer'
  ]);
  console.log('PASS: Svelte initialization, blank native planner, iPad sharing, GPX fallback and planner URL fallback');
}finally{
  rmSync(entry,{force:true});rmSync(temp,{recursive:true,force:true});
}
