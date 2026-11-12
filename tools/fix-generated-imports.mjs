import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const base='tests/generated';
for(const filename of readdirSync(base)){
  if(!filename.endsWith('.js'))continue;
  const full=path.join(base,filename);
  const before=readFileSync(full,'utf8');
  const after=before.replace(/(from\s+['"])(\.\/[^'".]+)(['"])/g,'$1$2.js$3');
  if(after!==before)writeFileSync(full,after);
}
