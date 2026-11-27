// Link already-cited Native executions to an inspect of their exact starting
// state. This is source delivery, not a strategy judgment or a new simulation.
import {isDeepStrictEqual} from 'node:util';
const schemas=new Set(['pregame_single_unit_temporal_receipt_v1','pregame_joint_temporal_receipt_v1']);
const fields=['army','rules','map','source'];
const current=(entry,scope)=>entry?.kind==='tool_receipt'&&entry.validity==='current'
  &&fields.every(k=>typeof scope?.[k]==='string'&&entry.bindings?.[k]===scope[k])
  &&(!entry.bindings?.plan||entry.bindings.plan===scope.plan);
const exactRow=row=>({parentStateHash:row.parentStateHash,stateHash:row.stateHash,
  nativeReceiptHash:row.nativeReceiptHash,rulesRuntimeHash:row.rulesRuntimeHash,
  round:row.round,phase:row.phase,actionType:row.nativeAction.actionType,
  sideKey:row.nativeAction.sideKey??null,unitId:row.nativeAction.pieceId??null});
export function projectConnectedNativeExecutionV1(receipt){
 const empty={groups:[],transitions:[],connectedRecordCount:0,jointControlProven:false};
 if(!schemas.has(receipt?.schema)||!Array.isArray(receipt.nativeTransitions)
   ||typeof receipt.baseStateHash!=='string'||typeof receipt.rulesRuntimeHash!=='string'
   ||receipt.isolatedSearchSourceHash!==receipt.baseStateHash)return empty;
 const rows=receipt.nativeTransitions,byState=new Map();
 for(const [index,row]of rows.entries()){
  if(typeof row?.stateHash!=='string')continue;
  if(!byState.has(row.stateHash))byState.set(row.stateHash,[]);
  byState.get(row.stateHash).push({row,index});
 }
 const byParent=new Map();
 for(const candidates of byState.values()){
  const {row,index}=candidates[0];
  if(typeof row.parentStateHash!=='string'||typeof row.nativeReceiptHash!=='string'
    ||!row.nativeReceiptHash||typeof row.nativeAction?.actionType!=='string'
    ||row.rulesRuntimeHash!==receipt.rulesRuntimeHash
    ||candidates.some(c=>c.row.parentStateHash!==row.parentStateHash
      ||c.row.rulesRuntimeHash!==row.rulesRuntimeHash||!c.row.nativeReceiptHash
      ||!isDeepStrictEqual(c.row.nativeAction,row.nativeAction)
      ||c.row.round!==row.round||c.row.phase!==row.phase))continue;
  if(!byParent.has(row.parentStateHash))byParent.set(row.parentStateHash,[]);
  byParent.get(row.parentStateHash).push({row,index});
 }
 const paths=new Map([[receipt.baseStateHash,[]]]),queue=[receipt.baseStateHash],groups=new Map(),used=new Set();
 let connectedRecordCount=0;
 for(let pos=0;pos<queue.length;pos++)for(const {row,index}of byParent.get(queue[pos])??[]){
  if(paths.has(row.stateHash))continue;
  const path=[...paths.get(row.parentStateHash),index];paths.set(row.stateHash,path);queue.push(row.stateHash);connectedRecordCount++;
  // Lifecycle edges establish provenance, but are not separate unit choices.
  if(typeof row.nativeAction.pieceId!=='string')continue;
  const key=JSON.stringify([row.nativeAction.actionType,row.nativeAction.sideKey,row.nativeAction.pieceId]);
  if(!groups.has(key)){
   groups.set(key,{actionType:row.nativeAction.actionType,sideKey:row.nativeAction.sideKey??null,
    unitId:row.nativeAction.pieceId,connectedRecordCount:0,exampleIndex:index,ancestryIndices:path});
   path.forEach(i=>used.add(i));
  }
  groups.get(key).connectedRecordCount++;
 }
 return {baseStateHash:receipt.baseStateHash,groups:[...groups.values()],connectedRecordCount,
  transitions:[...used].sort((a,b)=>a-b).map(i=>({index:i,pointer:'/receipt/nativeTransitions/'+i,...exactRow(rows[i])})),
  jointControlProven:false,singleTrajectory:false};
}
export async function projectRosterSameSourceExecutionV1({assignment,readArtifact}){
 if(assignment?.role!=='roster_workflow_final_review'||!assignment.inputs?.claim?.value
   ||!assignment.inputs?.review?.value?.experimentalSourceReviewVersion)return null;
 const directory=assignment.evidenceDirectory??[],scope=assignment.scope;
 const cited=new Set((assignment.inputs.sourceDirectory?.value?.entries??[]).map(e=>e.sourceEvidenceId));
 const snapshots=[];
 for(const [key,input]of Object.entries(assignment.inputs)){
  if(!/^selectedSource\d+$/.test(key)||input.status!=='read')continue;
  const view=input.value;
  const id=view?.schema==='roster_experiment_source_facts_v1'?view.sourceEvidenceId:input.evidenceId;
  const entry=directory.find(e=>e.id===id);
  if(!cited.has(id)||!current(entry,scope)||view?.sourceArtifactRef&&entry.artifactRef!==view.sourceArtifactRef)continue;
  const original=await readArtifact(entry.artifactRef);
  if(original.operation!=='inspect'||original.receipt?.sourceStateHash!==scope.source
    ||typeof original.receipt.baseStateHash!=='string'
    ||original.stateRef?.stateHash!==original.receipt.baseStateHash)continue;
  snapshots.push({entry,original});
 }
 if(!snapshots.length)return null;
 const address=entry=>({evidenceId:entry.id,evidenceNumber:directory.findIndex(e=>e.id===entry.id)+1,
  artifactRef:entry.artifactRef,pointer:'/receipt'}),links=[];
 for(const entry of directory){
  if(!cited.has(entry.id)||!current(entry,scope))continue;
  const original=await readArtifact(entry.artifactRef),r=original.receipt;
  if(!['bounded_unit_temporal','bounded_joint_temporal'].includes(original.operation)
    ||!schemas.has(r?.schema)||r.sourceStateHash!==scope.source||r.rulesRuntimeHash!==scope.rules)continue;
  const matched=snapshots.filter(s=>s.original.receipt.baseStateHash===r.baseStateHash);
  if(!matched.length)continue;
  const execution=projectConnectedNativeExecutionV1(r);if(!execution.groups.length)continue;
  for(const snapshot of matched)links.push({snapshot:address(snapshot.entry),execution:address(entry),
   sourceStateHash:r.sourceStateHash,rulesRuntimeHash:r.rulesRuntimeHash,
   resultStatus:r.resultStatus,outcome:r.outcome,conditions:structuredClone(r.conditions??null),
   ...execution});
 }
 if(!links.length)return null;
 return {schema:'roster_source_linked_execution_v1',version:1,links,
  sourceFactProjection:true,newNativeObservation:false,jointControlProven:false,planApproved:false,trainingTruth:false,
  instruction:'Exact recorded transitions from Native sources already cited by this same answer, connected to the selected inspect by identical source, army, map, rules and start state. Each group has ONE actual connected example path; other groups/queries may be different branches. The table copies the listed source fields and their original JSON pointers; no new action was executed and omitted fields remain at those sources. A starting snapshot only describes the start. Compare any assertion about subsequent execution to these recorded actions, including when reconsidering a prior unconfirmed verdict. Do not merge groups into a joint witness, infer global reachability, change strategic choices, or waive the original unknown. The reviewer must still judge the exact assertion; this projection supplies facts, not a verdict.'};
}
export async function prepareRosterSameSourceExecutionV1({assignment,store,control}){
 const value=await projectRosterSameSourceExecutionV1({assignment,readArtifact:store.get});
 if(!value)return assignment;
 const entry=await control.publishContext(value,{title:'Same-answer, same-start recorded Native execution; source-linked projection',
  kind:'interpretation',conditions:['Exact fields and connected ancestry from named saved Native sources; not a new Native receipt, combined trajectory or approved conclusion'],includeDirectory:true});
 return {...assignment,evidenceDirectory:entry.evidenceDirectory,inputs:{...assignment.inputs,
  sameSourceExecution:{source:'evidence',status:'read',evidenceId:entry.id,evidenceNumber:entry.evidenceNumber,
   artifactRef:entry.artifactRef,pointer:'',value}}};
}
