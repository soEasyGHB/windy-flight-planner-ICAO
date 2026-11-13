import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readFileSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'windy-v121-cleanup-'));
const put=(name,data='test')=>{const path=join(root,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);};
try {
  put('package.json',JSON.stringify({version:'1.2.1'}));
  put('src/plugin.svelte','new plugin');
  put('src/weather.ts','old feature');
  put('tests/test_release_cleanup.mjs','current');
  put('tests/test_obsolete.mjs','old');
  put('tests/generated/test.js','generated');
  put('tools/clean-legacy.mjs',readFileSync('tools/clean-legacy.mjs','utf8'));
  put('tools/obsolete.js','old');
  put('api/windy-forecast.js','old');
  put('public/index.html','index');
  put('public/navdata/points.csv','FIX,lat,lon\n');
  put('navdata-input/earth_fix.dat','AIRAC sample');
  put('.github/workflows/publish-plugin.yml','current workflow');
  put('.github/workflows/unused-old.yml','old workflow');
  put('AUDIT-v1.1.2.md','old');
  put('AUDIT-v1.2.1.md','current');
  put('Windy-Flight-Route-Analyzer-FULL-v1.1.2.zip','old archive');
  execFileSync('node',['tools/clean-legacy.mjs'],{cwd:root,stdio:'pipe'});
  for(const filename of ['src/weather.ts','tests/test_obsolete.mjs','tests/generated','tools/obsolete.js','api','AUDIT-v1.1.2.md','.github/workflows/unused-old.yml','Windy-Flight-Route-Analyzer-FULL-v1.1.2.zip'])
    assert(!existsSync(join(root,filename)),`Cleanup failed: ${filename}`);
  for(const filename of ['src/plugin.svelte','tools/clean-legacy.mjs','tests/test_release_cleanup.mjs','AUDIT-v1.2.1.md','public/navdata/points.csv','navdata-input/earth_fix.dat','.github/workflows/publish-plugin.yml'])
    assert(existsSync(join(root,filename)),`Cleanup erased a protected file: ${filename}`);
  console.log('PASS: legacy cleanup removes old code and archives; preserves release, user AIRAC, CSV and workflows');
} finally {rmSync(root,{recursive:true,force:true});}
