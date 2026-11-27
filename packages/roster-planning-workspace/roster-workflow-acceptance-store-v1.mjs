// Persistence seam used by the product's writer-leased accept operation.
// It stores a reviewed bundle, never computes an approval or calls a model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export async function publishRosterWorkflowAcceptanceFileV1(directory,bundle){
  const temporary=path.join(directory,`acceptance-${randomUUID()}.tmp`);
  let foreignTemporary=false;
  try{
    try{await fs.writeFile(temporary,JSON.stringify(bundle,null,2),{flag:'wx',mode:0o600});}
    catch(error){foreignTemporary=error.code==='EEXIST';throw error;}
    // Atomic, exclusive publication: no reader can see a partial JSON and an
    // existing immutable result is never replaced. If acknowledgement is lost
    // after link(), the normal accept/read path finds the complete same bundle.
    await fs.link(temporary,path.join(directory,'acceptance.json'));
  }finally{
    // Only this invocation's fresh temporary link; never remove the accepted
    // destination or a pre-existing path rejected by exclusive creation.
    if(!foreignTemporary)await fs.unlink(temporary).catch(()=>{});
  }
}
