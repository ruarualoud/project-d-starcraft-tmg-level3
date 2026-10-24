// One actual product role request against the immutable stopped case. This is
// a new protocol proof, not a reset/retry of the exhausted production author.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
import {projectRosterWorkflowQuestionRouteV1} from '../packages/roster-strategist/roster-workflow-question-routing-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {priceStarcraftTmgDeepSeekCurrentUsageV2} from '../packages/secure-provider-runtime/provider-pricing-v2.mjs';

const cwd=process.cwd(),root=path.resolve(process.argv[2]);
if(root!==path.join(cwd,'build/slice272-product-generation-v645-onHtyj/workspace/decision-workflows/decision-a6d75905-a910-49a7-b260-f6eb8f7558d5'))
  throw Error('EXACT_IMMUTABLE_FAILURE_SOURCE_REQUIRED');
const source=createRosterDecisionWorkflowStoreV1({directory:root}),saved=await source.load();
const paid=await source.get('83060bb6a69f122b32d1b517f154f7cdb59a7af66dfed3a37054819c32b5cc39');
const oldRequest=await source.get('3809e516dca520f326d0bf620011a50f4b7a86c22ba94b2a93a1aef9f8f3ca9a');
const oldAssignment=oldRequest.promptNodes.find(node=>node.kind==='workflow_role_assignment');
const draft=await source.get(saved.draftRef),verdict=await source.get(draft.builderVerdictRef);
const readiness=assessRosterWorkflowReadinessV1({draft,verdict});
const output=await fs.mkdtemp(path.join(cwd,'build/slice272-author-question-proof-v725-'));
const isolated=createRosterDecisionWorkflowStoreV1({directory:path.join(output,'snapshot')});
const store={...isolated,get:async ref=>{try{return await isolated.get(ref);}
  catch(error){if(error.code!=='ENOENT')throw error;return source.get(ref);}}};
const sourceNumbers=[375,376,oldAssignment.inputs.comparisonPurpose.evidenceNumber];
const evidence=sourceNumbers.map(number=>({...saved.evidence[number-1],number}));
const readinessRef=await store.put({schema:'current_mechanical_readiness_observation_v1',
  draftRevision:draft.revision,mechanicalBlockers:readiness.mechanicalBlockers,mechanicalFacts:readiness.mechanicalFacts,
  originDraftRef:saved.draftRef,originBuilderVerdictRef:draft.builderVerdictRef,planApprovalGranted:false});
evidence.push({id:'proof:current-readiness',number:saved.evidence.length+1,kind:'capability_result',
  title:'Current deterministic draft readiness, not a strategy verdict',artifactRef:readinessRef,
  bindings:saved.scope,validity:'current'});
await store.save({schema:saved.schema,scope:saved.scope,evidence,work:[],reads:[],events:[],acceptanceGranted:false});
const reader=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_GAME_OR_DRAFT_EXECUTION');}});
const workId='v725:classify-original-obligations';
const inline=async(number,pointer)=>{
  const entry=evidence.find(row=>row.number===number);
  const read=await reader.dispatch({type:'read_evidence',consumer:workId,evidenceId:entry.id,pointer});
  if(read.status!=='read')throw Error('EXACT_SOURCE_READ_REQUIRED:'+number+':'+pointer);
  return {source:'evidence',evidenceId:entry.id,evidenceNumber:number,pointer,status:'read',value:read.value};
};
// Keep only the actual geometry diagnostic, not the old 610k-character method
// history. The full original remains readable by number and exact pointer.
const geometry=await source.get(saved.evidence[374].artifactRef);
if(!(geometry?.value??geometry).receipt?.hypotheticalPlacementAssessment)
  throw Error('ACTUAL_GEOMETRY_RECEIPT_REQUIRED');
const assignment={workId,role:'roster_workflow_final_review',scope:saved.scope,evidenceDirectory:evidence,
  inputs:{originalDataQuestions:{source:'literal',value:paid.output.unresolvedQuestions},
    currentReadiness:await inline(saved.evidence.length+1,''),
    geometry:await inline(376,'/receipt/hypotheticalPlacementAssessment'),
    comparisonPurpose:structuredClone(oldAssignment.inputs.comparisonPurpose),
    review:{source:'literal',value:{experimentalSourceReviewVersion:5,requirementClassificationVersion:1,
      obligations:[{checkId:'question_coverage',criterion:'Classify each original unresolved question against the supplied current comparison and actual source/readiness. Preserve each original wording and explain its owner and necessity. Do not perform the experiment, write Plan values, assert missing geometry is proven, or decide which strategy wins. This classification alone does not approve a fact, the comparison or a Plan.'}]}}}};
let adapter,operation=null,request,reply,result;
const events=[];
const save=(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2),{flag:'wx'});
await save('scope.json',{sourceRoot:root,originalReplyRef:'83060bb6a69f122b32d1b517f154f7cdb59a7af66dfed3a37054819c32b5cc39',
  sourceNumbers,oneProviderQuantum:true,originalRunModified:false,productionResumed:false});
console.log(JSON.stringify({stage:'started',output,originalRunModified:false}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const port=await adapter.factory.createForRun({sessionId:path.basename(output),runKind:'teach-framework',
    planHash:saved.scope.plan,onEvent:async event=>{
      events.push(event);await fs.appendFile(path.join(output,'provider-events.jsonl'),JSON.stringify(event)+'\n');
    }});
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:path.basename(output),deliberation:port,
    onRequest:async value=>{
      if(request)throw Error('ONE_PROVIDER_QUANTUM_ONLY');request=value;
      const encoding=encodeRosterProviderInputV1(value,'same_request_evidence_v1');
      await save('request.json',{request:value,providerInstructions:projectRosterProviderInstructionsV1({request:value,runKind:'teach-framework'}),
        encodedProviderInput:encoding.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',inputCharacters:encoding.afterCharacters}));
    },onReply:async value=>{
      reply=value;await save('reply.json',value);
      console.log(JSON.stringify({stage:'returned',usage:value.receipt.usage,latencyMs:value.receipt.latencyMs}));
    }});
  const outcome=await execute(assignment,{operationState:null,
    checkpointOperation:async value=>{operation=structuredClone(value);
      await fs.appendFile(path.join(output,'role-checkpoints.jsonl'),JSON.stringify({operationRef:await store.put(value)})+'\n');},
    readEvidence:(evidenceId,pointer)=>reader.dispatch({type:'read_evidence',consumer:workId,evidenceId,pointer})});
  await save('outcome.json',outcome);
  const check=outcome.value?.checks?.[0];
  const route=check?projectRosterWorkflowQuestionRouteV1({sourceReview:{source:'literal',value:{checks:[check]}}}):null;
  const author=check?.dataQuestions?.find(row=>row.question===paid.output.unresolvedQuestions[1]);
  let price;
  try{
    const send=events.find(event=>event.type==='provider_dispatch'&&event.dispatch?.status==='sending');
    price=reply?priceStarcraftTmgDeepSeekCurrentUsageV2({providerId:'deepseek-openai-compatible-direct',
      requestedModel:'deepseek-flash',reportedModel:reply.receipt.modelVersion,startedAt:send?.at,usage:reply.receipt.usage}):null;
  }catch(error){price={unpriced:true,reason:error.message,usage:reply?.receipt?.usage??null};}
  result={status:outcome.continuation?'role_requested_continuation':'role_completed',
    oneQuantumOnly:true,actualAuthorClassification:author?.classification??null,
    authorDecisionRecognized:author?.classification==='author_decision',checks:outcome.value?.checks??[],
    nextRoute:route,usage:reply?.receipt?.usage??null,latencyMs:reply?.receipt?.latencyMs??null,price,
    originalRunModified:false,nativeCalls:0,formalPlanAccepted:false,automaticRetry:false};
}catch(error){
  result={status:'incomplete',code:error.code??error.message,pendingRequestRetained:Boolean(operation?.pending),
    operationRef:operation?await store.put(operation):null,paidReceipt:reply?.receipt??null,
    originalRunModified:false,nativeCalls:0,formalPlanAccepted:false,automaticRetry:false};
  process.exitCode=1;
}finally{await adapter?.close();}
await save('result.json',result);
console.log(JSON.stringify({stage:'finished',output,status:result.status,authorDecisionRecognized:result.authorDecisionRecognized,
  actualAuthorClassification:result.actualAuthorClassification,nextRoute:result.nextRoute?.kind}));
