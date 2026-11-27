import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {projectPostgameExecutionEvidenceV1} from '../../packages/strategy-skills/postgame-observed-decision-v1.mjs';
const need=(v,c)=>{if(!v)throw Error(c)};
// Only the completed Host execution may name files. This is not a model path tool.
export async function readSlice249ExecutionEvidenceV1({store,result}){
  const record=await store.load(result.executionKey);
  need(record?.status==='completed','VISTA_EXECUTION_EVIDENCE_NOT_COMPLETE');
  const boundaryFrames={};
  for(const name of ['before','after']){
    const frame=record.boundaryFrames?.[name];
    if(!frame||frame.status!=='available'){boundaryFrames[name]=frame||{status:'unavailable',reason:'not_saved_in_this_execution'};continue}
    const expected=name==='before'?record.sourceStateHash:record.nativeTransitions?.at(-1)?.postStateHash||record.sourceStateHash;
    need(frame.stateHash===expected&&frame.seat===record.input.subjectSeat,'POSTGAME_FRAME_STATE_MISMATCH');
    const relative=path.relative(record.result.trajectoryRef.directory,frame.ref);
    need(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'POSTGAME_FRAME_PATH_OUTSIDE_BRANCH');
    const bytes=await fs.readFile(frame.ref);
    need(bytes.length===frame.byteLength&&createHash('sha256').update(bytes).digest('hex')===frame.sha256,'POSTGAME_FRAME_BYTES_CHANGED');
    const {ref,...publicFrame}=frame;
    boundaryFrames[name]={...publicFrame,image:{mimeType:'image/png',data:bytes.toString('base64'),sha256:frame.sha256,detail:'high'}};
  }
  return {...projectPostgameExecutionEvidenceV1(record),boundaryFrames,trajectoryRef:result.trajectoryRef,
    replayMatchesCurrent:result.replayMatchesCurrent,sourceUnchanged:result.sourceUnchanged};
}
