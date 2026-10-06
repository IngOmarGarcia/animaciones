import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=['js/brand-logo.js','js/logo-renderer.js','js/logo-world.js','js/support.js','js/recent-guides.js','css/styles.css','sitemap.xml'];
const hash=value=>createHash('sha256').update(value.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const results=[];
for(const file of files){
 const expected=execFileSync('git',['show',`${commit}:${file}`],{maxBuffer:8*1024*1024});
 const response=await fetch(`https://viralcss.com/${file}?release=${commit.slice(0,12)}`,{signal:AbortSignal.timeout(25000),cache:'no-store'});
 const body=Buffer.from(await response.arrayBuffer());
 results.push({file,status:response.status,expected:hash(expected),actual:hash(body),matches:response.ok&&hash(expected)===hash(body)});
}
await mkdir('tools/review',{recursive:true});
await writeFile('tools/review/production-release.json',JSON.stringify({date:new Date().toISOString(),commit,results},null,2));
console.log(JSON.stringify({commit,results:results.map(({file,status,matches})=>({file,status,matches}))},null,2));
assert(results.every(r=>r.matches),'La versión pública todavía no coincide con el commit actual');
