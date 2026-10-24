// Exercise the production Teach operation on an actual completed historical
// Teach/Plan pair. This is not fresh production, not the current v5 acceptance,
// and not a replacement for Builder/Plan mutation or strategic comparison.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {runRosterTeachFrameworkSessionV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1}
  from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const [sourceFile,outputDir]=process.argv.slice(2);
const worktree=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const p of [sourceFile,outputDir])if(!p||!path.resolve(p).startsWith(worktree+path.sep))throw Error('WORKTREE_PATH_REQUIRED');
await fs.mkdir(outputDir,{recursive:false});
const store=(name,value)=>fs.writeFile(path.join(outputDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const before=await fs.stat(sourceFile);
const source=JSON.parse(await fs.readFile(sourceFile,'utf8'));
const saved=source.teachFrameworkHistory.findLast(f=>f.status==='completed'&&f.state.investigation?.completed&&f.state.synthesis?.answers);
const plan=source.planVersionHistory.map(v=>JSON.parse(v)).find(p=>p.planHash===saved?.planHash);
if(!plan)throw Error('COMPLETED_HISTORICAL_PLAN_REQUIRED');
const state=structuredClone(saved.state);
const synthesisBefore=hash(state.synthesis),evidenceBefore=hash(state.evidence);
await store('source.json',{sourceFile,sourcePlanHash:plan.planHash,sourcePlanVersion:plan.planVersion,
  sourceTeachHash:hash(saved),sourceIsCompletedHistorical:true,currentPlanUntouched:true,
  operation:'runRosterTeachFrameworkSessionV1/revisionWorkOrderOnly',acceptedFinalPlan:false});
let adapter,sequence=0;
const calls=[];
try {
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const port=await adapter.factory.createForRun({sessionId:'s272-v505-historical-work-order',runKind:'teach-framework',planHash:plan.planHash,
    onEvent:async event=>fs.appendFile(path.join(outputDir,'provider-events.jsonl'),JSON.stringify(event)+'\n')});
  const deliberation={deliberate:async request=>{
    if(process.argv.includes('--single-dispatch')&&sequence>=1)throw Error('POST_FIX_SINGLE_DISPATCH_COMPLETE');
    const number=++sequence;
    const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
    await store(`${number}.request.json`,{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),
      encodedProviderInput:encoded.input,isExactPromptContent:true});
    console.log(JSON.stringify({stage:'dispatching',number,kind:request.roundKind,inputCharacters:encoded.afterCharacters}));
    const reply=await port.deliberate(request);
    await store(`${number}.reply.json`,reply);
    calls.push({number,kind:request.roundKind,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs,receiptHash:reply.receipt.receiptHash});
    console.log(JSON.stringify({stage:'returned',...calls.at(-1)}));
    return reply;
  }};
  await runRosterTeachFrameworkSessionV1({sessionId:'s272-v505-historical-work-order',plan,context:saved.context,state,
    revisionWorkOrderOnly:true,deliberation,laboratory:null,
    onCheckpoint:async value=>{
      await fs.appendFile(path.join(outputDir,'checkpoints.jsonl'),JSON.stringify({phase:value.phase,
        revisionWorkOrder:value.revisionWorkOrder||null,pendingModelCall:value.pendingModelCall||null,
        lastCall:value.calls?.at(-1)||null,lastCorrection:value.replyCorrections?.at(-1)||null})+'\n');
    }});
  const after=await fs.stat(sourceFile);
  const unchanged=before.size===after.size&&before.mtimeMs===after.mtimeMs;
  if(!unchanged||hash(state.synthesis)!==synthesisBefore||hash(state.evidence)!==evidenceBefore)throw Error('READONLY_EVIDENCE_CHANGED');
  await store('work-order.json',state.revisionWorkOrder);
  await store('result.json',{status:'completed',calls,sourceUnchanged:unchanged,synthesisAndEvidenceUnchanged:true,
    workOrder:state.revisionWorkOrder,providerCalls:sequence,nativeExecutions:0,formalPlanMutations:0,armyMutations:0,
    acceptanceGranted:false,strategicImprovementProven:false,onlyProductionWorkOrderOperationExercised:true});
  console.log(JSON.stringify({stage:'completed',questionCount:state.revisionWorkOrder.questionWork.length,
    planClaimPaths:state.revisionWorkOrder.planClaimPaths,rosterDecisionRequired:state.revisionWorkOrder.rosterDecisionRequired,
    investigationQuestionIds:state.revisionWorkOrder.investigationQuestionIds,unresolvedQuestionIds:state.revisionWorkOrder.unresolvedQuestionIds}));
}catch(error){
  await store('failure.json',{code:error.code||error.message,calls,dispatchesMayHaveUnknownCost:true,sourceUnchanged:true});
  console.error(error);process.exitCode=1;
}finally{await adapter?.close?.();}
