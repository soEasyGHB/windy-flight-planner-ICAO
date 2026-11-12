import assert from 'node:assert/strict';
import {loadDemo,parseNamedFixRoute} from './generated/navdb.js';
import {prepareGpxPayload,createGpxHref,makeGpxShareFile,triggerGpxDownload} from './generated/gpxDownload.js';
loadDemo();
const full=prepareGpxPayload(parseNamedFixRoute('EHAM DCT EDDF DCT LTFM'));
assert.equal(full.filename,'windy-flight-route.gpx');
assert.equal(full.pointCount,3);assert.equal(full.routeCount,1);assert.equal(full.partial,false);
assert.match(full.xml,/xmlns="http:\/\/www\.topografix\.com\/GPX\/1\/1"/);
let blob;
const url=createGpxHref(full,{createObjectURL(item){blob=item;return 'blob:testing';}});
assert.equal(url,'blob:testing');
assert.equal(blob.type,'application/gpx+xml;charset=utf-8');
assert.equal(await blob.text(),full.xml);
const fallback=createGpxHref(full,{createObjectURL(){throw Error('not available');}});
assert(fallback.startsWith('data:application/gpx+xml;'));
assert.equal(decodeURIComponent(fallback.split(',').slice(1).join(',')),full.xml);
const share=makeGpxShareFile(full);
if(typeof File==='function'){
  assert.equal(share.name,full.filename);assert.equal(await share.text(),full.xml);
}else assert.equal(share,null);
const partial=prepareGpxPayload(parseNamedFixRoute('EHAM EDDF UNKNOWNFIX LTFM OMDB'));
assert.equal(partial.partial,true);
assert.equal(partial.filename,'windy-route-PARTIAL.gpx');
assert.equal(partial.routeCount,2);
assert.throws(()=>prepareGpxPayload(parseNamedFixRoute('EHAM UNKNOWNFIX OMDB')),/участка|GPX/);
const clicked=[];
let appended=false,removed=false;
const fakeDoc={
  createElement(tag){assert.equal(tag,'a');return {style:{},click(){clicked.push({href:this.href,filename:this.download});},remove(){removed=true;}};},
  body:{appendChild(){appended=true;}}
};
triggerGpxDownload('blob:testing','route.gpx',fakeDoc);
assert.deepEqual(clicked,[{href:'blob:testing',filename:'route.gpx'}]);
assert(appended&&removed);
assert.throws(()=>triggerGpxDownload('','missing.gpx',fakeDoc),/missing/);
console.log('PASS: GPX complete/partial, Blob link, data fallback, iPad share File');
