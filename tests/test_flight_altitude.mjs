import assert from 'node:assert/strict';
import {planWindyAltitude,nearestPressureLevel,desiredTurbulenceBand,applyWindyAltitude} from './generated/flightAltitude.js';

assert.equal(desiredTurbulenceBand(350),'300h-200h');
assert.equal(desiredTurbulenceBand(280),'700h-300h');
assert.equal(nearestPressureLevel(350), '250h');
const turb = planWindyAltitude('turbulence',350);
assert.equal(turb.mode,'range');assert.equal(turb.levelsRange,'300h-200h');
assert.equal(planWindyAltitude('wind',350).pressureLevel,'250h');
assert.equal(planWindyAltitude('temp',350).mode,'pressure');
for (const overlay of ['rain','radar','thunder','cape','cloudtop']) {
 const plan=planWindyAltitude(overlay,350);
 assert.equal(plan.mode,'two-dimensional');assert.equal(plan.pressureLevel,null);assert.equal(plan.levelsRange,null);
}
const state={overlay:'turbulence',level:'700h',levelsRange:'700h-300h',availLevels:['500h','400h','300h','250h','200h','150h']};
const writes=[];
const store={get:key=>state[key],getAllowed:key=>key==='levelsRange'?['700h-300h','300h-200h','200h-150h']:[],set:(key,val)=>{writes.push([key,val]);state[key]=val;return true;}};
let result=applyWindyAltitude(store,'turbulence',350);
assert.equal(result.actual,'300h-200h');assert.equal(state.levelsRange,'300h-200h');
result=applyWindyAltitude(store,'wind',350);
assert.equal(result.actual,'250h');assert.equal(state.level,'250h');
const count=writes.length;
result=applyWindyAltitude(store,'thunder',350);
assert.equal(writes.length,count,'2D overlay should not force a FL');
assert.equal(result.accepted,true);
assert.equal(planWindyAltitude('turbulence',350,['200h','250h'],['700h-300h']).levelsRange,null);
console.log('PASS: pressure, turbulence range, 2D overlay safety, store writes');
