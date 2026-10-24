// One workspace Run owns this store. Small checkpoints reference immutable
// payloads; neither polling nor each local role serialises the entire history.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function publishTemporaryFile(temp,destination,bytes) {
  let writeCompleted=false;
  try{
    await fs.writeFile(temp,bytes,{flag:'wx',mode:0o600});
    writeCompleted=true;
    await fs.rename(temp,destination);
  }catch(error){
    // A failed write may leave a large partial file. Remove only this write's
    // temporary path, never the last complete checkpoint or immutable payload.
    // EEXIST from exclusive creation means this write does not own that path.
    if(writeCompleted||error.code!=='EEXIST')await fs.unlink(temp).catch(()=>{});
    throw error;
  }
}
export function createRosterDecisionWorkflowStoreV1({directory}) {
  const root=path.resolve(directory),payloads=path.join(root,'artifacts');
  const stateFile=path.join(root,'workflow.json');
  return {
    async load() {
      try{return JSON.parse(await fs.readFile(stateFile,'utf8'));}
      catch(error){if(error.code==='ENOENT')return null;throw error;}
    },
    async save(state) {
      const bytes=JSON.stringify(state);
      await fs.mkdir(root,{recursive:true});
      const temp=path.join(root,`checkpoint-${randomUUID()}.tmp`);
      await publishTemporaryFile(temp,stateFile,bytes);
    },
    async put(value) {
      const bytes=JSON.stringify(value);
      if(bytes===undefined)throw Error('ROSTER_WORKFLOW_UNSERIALIZABLE_ARTIFACT');
      const ref=digest(bytes);
      await fs.mkdir(payloads,{recursive:true});
      // Link a complete payload into its stable name; no reader sees a partial
      // file. Same content is reused; refs are storage addresses, not approval.
      const destination=path.join(payloads,`${ref}.json`);
      try{await fs.access(destination);return ref;}catch(error){if(error.code!=='ENOENT')throw error;}
      const temp=path.join(payloads,`payload-${randomUUID()}.tmp`);
      await publishTemporaryFile(temp,destination,bytes);
      return ref;
    },
    async get(ref) {
      if(!/^[a-f0-9]{64}$/u.test(ref))throw Error('ROSTER_WORKFLOW_ARTIFACT_REF_INVALID');
      const bytes=await fs.readFile(path.join(payloads,`${ref}.json`),'utf8');
      if(digest(bytes)!==ref)throw Error('ROSTER_WORKFLOW_ARTIFACT_CORRUPTED');
      return JSON.parse(bytes);
    },
  };
}
