import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDemo, parseNamedFixRoute, importCsv} from './generated/navdb.js';
import {prepareGpxPayload, createGpxHref, makeGpxShareFile} from './generated/gpxDownload.js';

loadDemo();
let route=parseNamedFixRoute('EHAM DCT EDDF DCT LTFM');
const ready=prepareGpxPayload(route);
assert.equal(ready.filename,'windy-flight-route.gpx');
assert.equal(ready.partial,false);
assert.equal(ready.pointCount,3);
assert.equal(ready.routeCount,1);
assert.match(ready.xml,/xmlns="http:\/\/www.topografix.com\/GPX\/1\/1"/);
assert.match(ready.xml,/<rtept lat="52\.3086000" lon="4\.7639000">/);
assert(!ready.xml.includes('<trkpt'), 'Must not create fictitious airway track vertices');

let captured=null;
const blobLink=createGpxHref(ready,{createObjectURL(blob){captured=blob;return 'blob:https://windy.com/abc';}});
assert.equal(blobLink,'blob:https://windy.com/abc');
assert.equal(captured.type,'application/gpx+xml;charset=utf-8');
assert.equal(await captured.text(),ready.xml);
const dataLink=createGpxHref(ready,{createObjectURL(){throw Error('not supported');}});
assert(dataLink.startsWith('data:application/gpx+xml;charset=utf-8,'));
assert.equal(decodeURIComponent(dataLink.split(',').slice(1).join(',')),ready.xml);
const shareFile=makeGpxShareFile(ready);
if(typeof File==='function'){
  assert.equal(shareFile.name,ready.filename);
  assert.equal(await shareFile.text(),ready.xml);
}else assert.equal(shareFile,null);

route=parseNamedFixRoute('EHAM DCT EDDF UNKNOWNFIX LTFM DCT OMDB');
const partial=prepareGpxPayload(route);
assert.equal(partial.partial,true);
assert.equal(partial.filename,'windy-route-PARTIAL.gpx');
assert.equal(partial.routeCount,2);
assert(!partial.xml.includes('UNKNOWNFIX'));
assert(!partial.xml.includes('<trkpt'));
assert.throws(()=>prepareGpxPayload(parseNamedFixRoute('EHAM UNKNOWNFIX OMDB')),/GPX|участка/);

const src=readFileSync('src/plugin.svelte','utf8');
const main=src.split('<script lang="ts">')[0].split('<details class="fr-settings">')[0];
const exportCard=main.slice(main.indexOf('id="fr-section-export"'));
assert(exportCard.includes('href={gpxDownloadHref} download={gpxFileName}'), 'Must use a real download link');
assert(exportCard.includes('on:click={downloadPlannerGpx}'), 'Must have direct-click download handler');
assert(!exportCard.includes('disabled={busy}'), 'Export must be independent of background fetch');
assert(exportCard.includes('on:click={sharePlannerGpx}'), 'iPad native share alternative must be visible');
assert(exportCard.includes('{gpxFeedback}'), 'Export errors must not be hidden in Settings');
assert(src.indexOf('prepareGpxDownload();',src.indexOf('function runRoute()')) < src.indexOf('new L.Polyline',src.indexOf('function runRoute()')),
  'GPX must be prepared before drawing to Windy map');
const clickHandler=src.slice(src.indexOf('function downloadPlannerGpx('),src.indexOf('async function sharePlannerGpx('));
assert(!clickHandler.includes('.click()'), 'Synthetic anchor clicks are fragile in iPad embedded browsers');
assert(!clickHandler.includes('navigator.share('), 'Download should not force share-sheet');
assert(src.includes('clearGpxDownload();clearMap();'), 'GPX object URLs must be revoked on component destroy');
console.log('PASS: GPX complete and partial files, Blob/data URI fallback, real user click, separate iPad sharing, lifecycle cleanup');
