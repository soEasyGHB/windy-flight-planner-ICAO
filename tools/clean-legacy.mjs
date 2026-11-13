/** Replace obsolete project files with the v1.2 release tree.
 * Only project-code/workflow paths and versioned release files are touched.
 * AIRAC/navdata-input, public/navdata snapshots, .git, and user documents are preserved.
 * Usage: node tools/clean-legacy.mjs [--dry-run]
 */
import {existsSync,readdirSync,lstatSync,rmSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';

const dryRun=process.argv.includes('--dry-run');
const version=JSON.parse(readFileSync('package.json','utf8')).version;
if(version!=='1.2.0') throw Error(`Refusing to clean using the wrong release: ${version}`);
const canonical=new Set([
  'src/plugin.svelte','src/pluginConfig.ts','src/navdataConfig.ts','src/navdb.ts',
  'src/xplane.ts','src/routeGpx.ts','src/gpxDownload.ts','src/windyPlannerUrl.ts',
  'tests/test.mjs','tests/test_xplane.mjs','tests/test_github_snapshot.mjs',
  'tests/test_route_gpx.mjs','tests/test_gpx_download.mjs',
  'tests/test_windy_planner_url.mjs','tests/test_simplified_ui.mjs',
  'tests/test_navdata_converter.py','tests/test_release_cleanup.mjs',
  'tools/build_navdata.py','tools/sync_gdrive_navdata.py','tools/convert_icao_gpkg.py',
  'tools/check-plugin-deps.mjs','tools/check-plugin-exports.mjs',
  'tools/check-plugin-startup.mjs','tools/check-build-config.mjs',
  'tools/check-release-tree.mjs','tools/verify-release.mjs',
  'tools/fix-generated-imports.mjs','tools/clean-legacy.mjs',
  '.github/workflows/build-navdata.yml','.github/workflows/publish-plugin.yml',
  '.github/workflows/sync-gdrive-navdata.yml','public/index.html'
]);
const obsoleteRoot=/^(?:AUDIT|INSTALL)-v\d+\.\d+(?:\.\d+)?(?:-iPad)?\.md$|^Windy-Flight-Route-Analyzer-FULL-v[\d.]+\.(?:zip|sha256)$|^vercel\.json$/;
const keepRoot=new Set([`AUDIT-v1.2.md`,`INSTALL-v1.2.md`]);
let removed=0;
function removeFile(path){
  if(dryRun) console.log('Would remove:',path);
  else {rmSync(path,{recursive:true,force:true});console.log('Removed:',path);}
  removed++;
}
function scan(dirname){
  if(!existsSync(dirname))return;
  for(const name of readdirSync(dirname)){
    const path=join(dirname,name);
    if((path==='public/navdata'||path==='navdata-input')&&lstatSync(path).isDirectory())continue;
    if(lstatSync(path).isDirectory()){
      if(path==='tests/generated'){removeFile(path);continue;}
      scan(path);
      if(!dryRun && readdirSync(path).length===0)rmSync(path,{recursive:true,force:true});
    } else if(!canonical.has(path))removeFile(path);
  }
}
for(const name of ['src','tests','tools','.github/workflows','api','public'])scan(name);
if(!dryRun && existsSync('api') && readdirSync('api').length===0)rmSync('api',{recursive:true,force:true});
for(const name of readdirSync('.')){
  if(obsoleteRoot.test(name)&&!keepRoot.has(name))removeFile(name);
}
console.log(`${dryRun?'DRY RUN':'DONE'}: ${removed} legacy item(s) identified; user navdata preserved`);
