/** Static early warning for missing named exports imported by the Svelte entry. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
const source=readFileSync('src/plugin.svelte','utf8');
const script=source.match(/<script\s+lang=["']ts["']>([\s\S]*?)<\/script>/)?.[1];
if(!script)throw Error('src/plugin.svelte: TypeScript script not found');
const pattern=/\bimport\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]/gm;
const errors=[];
let count=0,match;
while((match=pattern.exec(script))!==null){
  const filename=resolve('src',match[2]+(extname(match[2])?'':'.ts'));
  if(!existsSync(filename)){errors.push(`File missing: ${filename}`);continue;}
  const code=readFileSync(filename,'utf8');
  for(const member of match[1].split(',')){
    const name=member.trim().split(/\s+as\s+/)[0].trim();
    if(!name)continue;
    count++;
    const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const regex=new RegExp(`\\bexport\\s+(?:declare\\s+)?(?:async\\s+)?(?:const|let|function|class|type|interface|enum)\\s+${escape(name)}\\b|\\bexport\\s*\\{[^}]*\\b${escape(name)}\\b`);
    if(!regex.test(code))errors.push(`${match[2]} does not export ${name}`);
  }
}
if(errors.length){for(const message of errors)console.error(message);process.exit(1);}
console.log(`PASS: named imports resolve to matching exports (${count} symbols)`);
