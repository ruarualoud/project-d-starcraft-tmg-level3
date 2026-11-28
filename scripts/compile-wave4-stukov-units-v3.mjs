import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileWave4StukovUnitsV2} from './compile-wave4-stukov-units-v2.mjs';
import {atomicWrite} from './lib/development-context.mjs';
export const STUKOV_UNITS_V3_DIRECTORY='build/wave4-web/stukov-units/candidate-v3';
export async function loadWave4StukovUnitInputsV3(root){
 const manifest=JSON.parse(await fs.readFile(path.join(root,'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json'),'utf8')),
  faq=manifest.source.references.faq,historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration');
 if(faq?.byteHash!=='65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213'||faq.version!=='1.3')throw Error('WAVE4_FROZEN_FAQ_BINDING_REQUIRED');
 const bytes=await fs.readFile(path.join(root,faq.ref)).catch(e=>{if(e.code!=='ENOENT')throw e;return fs.readFile(path.join(historicalRoot,faq.ref));});
 if(createHash('sha256').update(bytes).digest('hex')!==faq.byteHash)throw Error('WAVE4_FROZEN_FAQ_BYTES_MISMATCH');
 const inputs=await compileWave4StukovUnitsV2(root,{releaseId:'wave4-u98-c88-r50-stukov-units-engineering-v3',directory:STUKOV_UNITS_V3_DIRECTORY,additionalReferenceSources:{faq}});
 inputs.dependencyRebinding.frozenFaq={version:faq.version,byteHash:faq.byteHash,actualBytesVerified:true};
 for(const [key,value]of Object.entries({...inputs.artifacts,'release-manifest':inputs.context.manifest}))await atomicWrite(path.join(root,inputs.directory,key+'.json'),JSON.stringify(value,null,2)+'\n');
 return inputs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify((await loadWave4StukovUnitInputsV3(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))).dependencyRebinding));
