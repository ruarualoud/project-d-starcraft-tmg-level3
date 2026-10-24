// Thin HTTP client for the Web/App P0–P6 product journey. No custom Teach,
// evidence injection, historical Plan import or alternate generation engine.
import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {createRosterGenerationObserverV1} from './lib/roster-generation-observation-v1.mjs';

const root=process.cwd();
const resumeIndex=process.argv.indexOf('--resume');
const modeIndex=process.argv.indexOf('--mode');
const mode=modeIndex<0?'editable':process.argv[modeIndex+1];
if(!['fixed','editable'].includes(mode))throw Error('PRODUCT_GENERATION_MODE_REQUIRED');
const dir=resumeIndex<0?await fs.mkdtemp(path.join(root,'build/slice272-product-generation-v645-'))
  :path.resolve(process.argv[resumeIndex+1]);
if(!dir.startsWith(path.join(root,'build/slice272-product-generation-v645-')))
  throw Error('PRODUCT_GENERATION_LOCAL_DIRECTORY_REQUIRED');
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);
const save=(file,value)=>fs.writeFile(path.join(dir,file),JSON.stringify(value,null,2),{flag:'wx'});
let adapter,product,stopRequested=false,workflowId,stopTask;
const stop=()=>{
  stopRequested=true;
  console.log(JSON.stringify({stage:'stop_requested',afterCurrentOperation:true}));
  // Set the product scheduler's stop flag now, not after an expensive status
  // read returns. close drains the current operation; it does not discard it.
  if(product&&!stopTask)stopTask=product.closeDecisionWorkflows().catch(error=>{
    console.error(JSON.stringify({stage:'stop_failed',code:error.code||error.message}));
  });
};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
console.log(JSON.stringify({stage:'initializing',dir,mode,oldRunResumed:false,roomReinitialized:false}));
try{
  const config=await read(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'));
  if(!path.resolve(config.fixtureRoot).startsWith(path.resolve(root,'../..'))
    ||!path.resolve(config.mapConfigurationFile).startsWith(path.resolve(root,'../..')))
    throw Error('FROZEN_INPUT_OUTSIDE_PROJECT');
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,
    dataDirectory:path.join(dir,'workspace'),mapConfiguration:await read(config.mapConfigurationFile),
    deliberationFactory:adapter.factory});
  async function http(method,suffix,body){
    const response=await product.handle({method,pathname:prefix+suffix,...(body?{body}:{})});
    if(!response.response?.ok)throw Object.assign(Error(response.response?.reason||'PRODUCT_HTTP_REJECTED'),
      {code:response.response?.reason,httpStatus:response.status,detail:response.response?.detail});
    return response.response;
  }
  if(resumeIndex>=0){
    const saved=await read(path.join(dir,'product-run.json'));
    if(saved.mode!==mode)throw Error('PRODUCT_GENERATION_RESUME_MODE_MISMATCH');
    workflowId=saved.workflowId;
  }else{
    const body={mode,setup:{sideKey:'player1',factionRecordKey:'tactical_cards:terran_armed_forces',
      opponentFactionRecordKey:'tactical_cards:kerrigan_s_swarm',engagementScale:'Standard',
      mineralBudget:2000,opponentInformationBoundary:'open_roster'}};
    if(mode==='fixed'){
      // Only the existing legal army is an input; its Plan is NOT copied.
      const base=path.join(root,'build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner');
      const old=await read(path.join(base,'workflow.json'));
      body.candidateInput=(await read(path.join(base,'artifacts',old.draftRef+'.json'))).candidateInput;
    }
    await save('generation-input.json',body);
    const created=await http('POST','/workflows',body);
    workflowId=created.workflow.workflowId;
    await save('product-run.json',{workflowId,mode,entry:prefix+'/workflows',
      sameWebAppWorkflow:true,oldPlanCopied:false,createdAt:new Date().toISOString()});
    console.log(JSON.stringify({stage:'created',workflowId,mode,httpStatus:201,
      initialUnits:created.workflow.draft.candidateInput.units.length,initialPlanCopied:false}));
  }
  if(!stopRequested&&process.argv.includes('--recover-provider-once')){
    const recovered=await http('POST',`/workflows/${workflowId}/recover-provider`,{
      allowUnknownCharge:true,authorizationId:'standing-user-controlled-recovery-'+workflowId});
    console.log(JSON.stringify({stage:'exact_provider_recovery',workflowId,...recovered.recovery}));
  }
  const comparisonIndex=process.argv.indexOf('--recover-comparison-once');
  if(!stopRequested&&comparisonIndex>=0){
    const sourceReviewResultRef=process.argv[comparisonIndex+1];
    if(!/^[a-f0-9]{64}$/u.test(sourceReviewResultRef??''))throw Error('EXACT_REJECTED_COMPARISON_REF_REQUIRED');
    const recovered=await http('POST',`/workflows/${workflowId}/recover-comparison`,{
      authorizationId:'user-authorized-comparison-once-'+sourceReviewResultRef,sourceReviewResultRef});
    console.log(JSON.stringify({stage:'exact_comparison_continuation',workflowId,...recovered.recovery}));
  }
  const capabilityIndex=process.argv.indexOf('--reconsider-capabilities');
  if(!stopRequested&&capabilityIndex>=0){
    const goalId=process.argv[capabilityIndex+1],expectedSourceReplyRef=process.argv[capabilityIndex+2],
      expectedDraftRevision=Number(process.argv[capabilityIndex+3]);
    const deliveryIndex=process.argv.indexOf('--capability-delivery-version'),
      requiredDeliveryVersion=deliveryIndex<0?1:Number(process.argv[deliveryIndex+1]);
    if(!goalId||!/^[a-f0-9]{64}$/u.test(expectedSourceReplyRef??'')||!Number.isSafeInteger(expectedDraftRevision)
      ||![1,2].includes(requiredDeliveryVersion))
      throw Error('EXACT_CAPABILITY_RECONSIDERATION_SOURCE_REQUIRED');
    const recovered=await http('POST',`/workflows/${workflowId}/reconsider-capabilities`,{
      goalId,expectedSourceReplyRef,expectedDraftRevision,requiredDeliveryVersion,
      authorizationId:'user-authorized-post-fix-capability-reconsideration',
      reason:requiredDeliveryVersion===1
        ?'Confirmed strategy capability-delivery repair: the producing request lacked current executable capabilities. Hold its unstarted investigation and return the saved decision/Plan to the author with the current descriptor; preserve evidence, fees and unresolved questions.'
        :'Confirmed current-contract navigation repair: the producing request had a capability summary but lacked the exact current descriptor address and selected an old contract as current. Hold its unstarted investigation and return the saved decision to the author with current navigation; preserve evidence, fees and unresolved questions.'});
    console.log(JSON.stringify({stage:'capability_delivery_reconsideration',workflowId,...recovered.reconsideration}));
  }
  const handoffIndex=process.argv.indexOf('--handoff-no-progress');
  if(!stopRequested&&handoffIndex>=0){
    const workId=process.argv[handoffIndex+1],expectedOwnerResultRef=process.argv[handoffIndex+2];
    if(resumeIndex<0||!workId||!/^[a-f0-9]{64}$/u.test(expectedOwnerResultRef??''))
      throw Error('EXACT_NO_PROGRESS_HANDOFF_SOURCE_REQUIRED');
    const returned=await http('POST',`/workflows/${workflowId}/handoff-no-progress`,{
      workId,expectedOwnerResultRef,authorizationId:'standing-user-stop-fix-then-continue',
      engineeringChangeId:process.argv.includes('--owner-delivery-repair')?'v995-no-progress-owner-delivery':'v991-explicit-no-progress-owner-return',
      reason:process.argv.includes('--owner-delivery-repair')
        ?'Actual saved author requests omitted the unified current-owner/history separation. Explicitly repair only the unissued successor input; preserve prior paid replies, unanswered predicates, stop evidence and draft. No reset or Native replay.'
        :'Verified stop-to-owner handoff repair: retain identical original inspection and all unresolved questions, hold the repeated method, and return to the strategic owner without a paid summary or Native replay.'});
    console.log(JSON.stringify({stage:'no_progress_owner_handoff',workflowId,...returned.handoff}));
  }
  if(!stopRequested)await http('POST',`/workflows/${workflowId}/run`);
  const observe=createRosterGenerationObserverV1();
  while(!stopRequested){
    const {workflow}=await http('GET',`/workflows/${workflowId}`);
    const observed=observe({...workflow,workflowId});
    if(observed){
      await fs.appendFile(path.join(dir,'observations.jsonl'),JSON.stringify({at:new Date().toISOString(),...observed})+'\n');
      console.log(JSON.stringify(observed));
    }
    if(!workflow.running){
      await save(`boundary-${Date.now()}.json`,{workflowId,status:workflow.status,
        readyForRelease:workflow.readyForRelease,failure:workflow.failure,
        formalPlanAccepted:workflow.formalPlanAccepted,roomStarted:workflow.roomStarted});
      break;
    }
    await delay(5000);
  }
}catch(error){
  await save(`client-failure-${Date.now()}.json`,{code:error.code||error.message,
    detail:error.detail??null,workflowId:workflowId??null,originalPaidRecordsKept:true});
  console.error(JSON.stringify({stage:'client_failure',code:error.code||error.message,detail:error.detail??null}));
  process.exitCode=1;
}finally{
  await stopTask;await product?.closeDecisionWorkflows?.();await adapter?.close?.();
  console.log(JSON.stringify({stage:'finished',workflowId:workflowId??null,stopRequested}));
}
