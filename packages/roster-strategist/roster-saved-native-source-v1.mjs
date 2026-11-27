// Saved evidence is immutable data, not a dependency on its producer's queue
// lifetime. Future fromStepId dependencies remain ordinary work dependencies.
import {isDeepStrictEqual} from 'node:util';
import {rosterWorkflowReceiptPointerV1} from './roster-decision-workflow-v1.mjs';
const current=(entry,scope)=>entry&&Object.entries(entry.bindings??{}).every(([k,v])=>scope[k]===v);
export function resolveRosterSavedNativeSourceV1({directory,number,scope,resultPointer}){
  const selected=Number.isSafeInteger(number)&&number>0
    ?directory.find((e,i)=>(e.number??i+1)===number):null;
  if(!selected||!/^tool(?:-view)?:/u.test(selected.id)||selected.kind!=='tool_receipt'
    ||selected.availability!=='available'||selected.calculationInvalidation||!current(selected,scope))return null;
  const receipt=directory.find(e=>e.id===selected.id.replace(/^tool-view:/u,'tool:'));
  if(!receipt||receipt.kind!=='tool_receipt'||receipt.availability!=='available'
    ||receipt.calculationInvalidation||!current(receipt,scope)
    ||!isDeepStrictEqual(receipt.bindings,selected.bindings))return null;
  return {selected,receipt,input:{source:'evidence',id:receipt.id,
    pointer:rosterWorkflowReceiptPointerV1(resultPointer).replace(/^\/value(?=\/|$)/u,'')}};
}

// Upgrade only an UNISSUED old compiled binding whose exact author work order,
// original producer and immutable full receipt all still agree. Never revive
// retired goals, rewrite sent requests, rerun old tools or manufacture success.
export async function projectRosterSavedNativeSourceRepairsV1({state,readArtifact}){
  const byId=new Map(state.work.map(w=>[w.id,w])),results=new Map(),repairs=[];
  const read=async ref=>{if(!results.has(ref))results.set(ref,await readArtifact(ref));return results.get(ref);};
  const retired=w=>w.supersededByGoalId||w.supersededByWorkId||w.branchReturnRef
    ||w.comparisonClosureRef||w.calculationInvalidation||w.reviewRepairSupersession||w.comparisonAuthorizationSuperseded;
  for(const work of state.work){
    // The old selector compiler overwrote the immutable evidence-body root
    // with the /value wrapper used only by future WORK results. Repair only
    // the exact unissued source-path failure and original saved model choice.
    const name=work.failure?.detail?.input,old=work.inputs?.[name];
    if(work.role==='roster_workflow_tool'&&work.status==='needs_repair'
      &&work.failure?.code==='ROSTER_WORKFLOW_EVIDENCE_NOT_READY'
      &&work.failure.dispatchOutcome==='not_dispatched'
      &&work.failure.detail?.result?.status==='path_missing'
      &&work.failure.detail.result.pointer==='/value'
      &&['nativeActionSource','queryActionSource'].includes(name)
      &&old?.source==='evidence'&&old.pointer==='/value'
      &&!retired(work)&&current(work,state.scope)&&!work.resultRef&&!work.inputRef
      &&!work.attempt&&!work.dispatchKey&&!work.operationState){
      const owner=byId.get(work.experimentOwnerId);
      if(owner?.role==='roster_workflow_experiment_planner'&&owner.status==='evidence_ready'
        &&owner.resultRef&&!retired(owner)&&current(owner,state.scope)){
        const saved=await read(owner.resultRef),request=work.inputs.request?.value;
        for(const [i,order]of (saved.value?.workOrders??[]).entries()){
          const step=order.steps?.find(s=>work.id===`${owner.id}:order${i}:${s.stepId}`);
          if(!step)continue;
          let args;try{args=JSON.parse(step.argumentsJson);}catch{continue;}
          if(!((name==='nativeActionSource'&&step.operation==='native_action')
            ||(name==='queryActionSource'&&step.operation==='spatial'))
            ||request?.operation!==step.operation||request.orderId!==order.orderId
            ||request[name]!==name||!isDeepStrictEqual(request.args,args)
            ||args.selection?.fromStepId||!args.selection?.sourceEvidenceNumber)continue;
          const source=resolveRosterSavedNativeSourceV1({directory:state.evidence,
            number:args.selection.sourceEvidenceNumber,scope:state.scope,resultPointer:''});
          if(!source||old.id!==source.receipt.id||work.failure.detail.result.evidenceId!==old.id)continue;
          const body=await read(source.receipt.artifactRef);
          if(!body?.receipt||!body.stateRef||Object.hasOwn(body,'value'))continue;
          repairs.push({workId:work.id,ownerWorkId:owner.id,ownerResultRef:owner.resultRef,
            originalStatus:work.status,originalFailure:structuredClone(work.failure),
            changes:[{name,before:structuredClone(old),after:{...source.input,pointer:''},
              selectedEvidenceId:source.selected.id,selectedArtifactRef:source.selected.artifactRef,
              receiptArtifactRef:source.receipt.artifactRef}],queryReexecuted:false,
            oldRequestRewritten:false,acceptanceGranted:false});
        }
      }
      continue;
    }
    if(work.role!=='roster_workflow_tool'||!['ready','waiting_dependency','superseded'].includes(work.status)
      ||retired(work)||!current(work,state.scope)||work.resultRef||work.inputRef||work.attempt||work.dispatchKey
      ||work.failure||work.operationState)continue;
    const owner=byId.get(work.experimentOwnerId);
    if(owner?.role!=='roster_workflow_experiment_planner'||owner.status!=='evidence_ready'
      ||!owner.resultRef||retired(owner)||!current(owner,state.scope))continue;
    const saved=await read(owner.resultRef),changes=[];
    for(const [i,order]of (saved.value?.workOrders??[]).entries()){
      const step=order.steps?.find(s=>work.id===`${owner.id}:order${i}:${s.stepId}`);
      if(!step)continue;
      const request=work.inputs?.request?.value;
      let args;try{args=JSON.parse(step.argumentsJson);}catch{continue;}
      if(request?.operation!==step.operation||request.orderId!==order.orderId
        ||!isDeepStrictEqual(request.args,args))continue;
      for(const [index,reference]of (step.bindings??[]).entries()){
        if(!reference.fromEvidenceNumber||reference.fromStepId)continue;
        const source=resolveRosterSavedNativeSourceV1({directory:state.evidence,number:reference.fromEvidenceNumber,
          scope:state.scope,resultPointer:reference.resultPointer});
        if(!source)continue;
        const name=`binding${index}`,old=work.inputs[name],producer=byId.get(source.receipt.id.slice(5));
        if(!producer?.resultRef||producer.role!=='roster_workflow_tool'||!current(producer,state.scope)
          ||!isDeepStrictEqual(old,{source:'work',id:producer.id,pointer:rosterWorkflowReceiptPointerV1(reference.resultPointer)})
          ||!isDeepStrictEqual(request.bindings?.[index],{name,pointer:reference.argumentPointer}))continue;
        const result=await read(producer.resultRef),body=await read(source.receipt.artifactRef);
        if(result.kind!=='tool_receipt'||result.continuation===true||result.value?.status!=='completed'
          ||!isDeepStrictEqual(result.value,body))continue;
        changes.push({name,before:structuredClone(old),after:source.input,
          selectedEvidenceId:source.selected.id,selectedArtifactRef:source.selected.artifactRef,
          receiptArtifactRef:source.receipt.artifactRef,producerResultRef:producer.resultRef});
      }
    }
    if(changes.length)repairs.push({workId:work.id,ownerWorkId:owner.id,ownerResultRef:owner.resultRef,
      originalStatus:work.status,changes,queryReexecuted:false,oldRequestRewritten:false,acceptanceGranted:false});
  }
  return repairs;
}
