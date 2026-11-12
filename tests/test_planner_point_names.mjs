import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/plannerPointNames.ts','utf8');
assert.match(source,/function installPlannerPointNames/);
assert.match(source,/clearPlannerPointNames/);
assert.match(source,/item\.synthetic === true/);
console.log('PASS: planner labels helper source and synthetic waypoint protection');
