// Generates a standalone, no-network evidence viewer. Does not rerun the trial.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.resolve(process.argv[2]);
if(!dir.startsWith(root+path.sep))throw Error('WORKTREE_ONLY');
const read=name=>fs.readFile(path.join(dir,name),'utf8').then(JSON.parse);
const data={result:await read('result.json'),source:await read('source.json'),roles:{}};
try{data.manualReview=await read('manual-review.json');}catch(e){if(e.code!=='ENOENT')throw e;}
for(const role of ['facts','teach','decision']){try{data.roles[role]={request:await read(`${role}.request.json`)};
  try{data.roles[role].reply=await read(`${role}.reply.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
}catch(e){if(e.code!=='ENOENT')throw e;}}
const template=await fs.readFile(path.join(root,'packages/roster-strategist/prototypes/decision-workflow-v502.prototype.html'),'utf8');
const html=template.replace('__EVIDENCE_JSON__',JSON.stringify(data).replaceAll('<','\\u003c'));
const out=path.join(dir,'P0-可行性试验与状态原型.html');
await fs.writeFile(out,html,{flag:'wx'});
console.log(JSON.stringify({file:out,bytes:Buffer.byteLength(html),realCalls:data.result.roles.length,productMutation:false}));
