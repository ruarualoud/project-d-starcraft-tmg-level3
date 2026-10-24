// Actual request293: HTTP200 body reset; product Run lost network recovery consent.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningWorkspaceHttpAdapterV1, ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { isRecoverableProviderNetworkFailureV1 } from '../packages/secure-provider-runtime/provider-network-resilience-v1.mjs';
const source = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const failed = source.providerDispatches.at(-1), plan = JSON.parse(source.planSerialized);
assert.equal(failed.transportFailure.networkErrorCode, 'ECONNRESET');
assert.equal(failed.transportFailure.status, 200);
assert.equal(isRecoverableProviderNetworkFailureV1(failed.transportFailure),true);
for(const bad of [{status:403},{code:'PROVIDER_RESPONSE_CONTRACT_REJECTED'},
  {transportProgress:{phase:'completed'}},{networkErrorCode:'UNKNOWN_INTERNAL_ERROR'}]) {
  assert.equal(isRecoverableProviderNetworkFailureV1({...failed.transportFailure,...bad}),false);
}
let forwarded;
const http = createRosterPlanningWorkspaceHttpAdapterV1({ service:{descriptor(){},startPlanning(){}},
  iterativeJourney:{run:async(id,request)=>{forwarded={id,request};return {};}} });
await http.handle({method:'POST',pathname:prefix+'/iterative/sessions/same/run',body:{automaticNetworkRecovery:true}});
assert.deepEqual(forwarded,{id:'same',request:{automaticNetworkRecovery:true}},'HTTP Run must retain explicit recovery consent');
const { rosterJourneyTeachRequestV1 } = await import('../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs');
assert.equal(rosterJourneyTeachRequestV1({automaticNetworkRecovery:true},plan).automaticNetworkRecovery,true);
assert.equal(rosterJourneyTeachRequestV1({},plan).automaticNetworkRecovery,undefined);
assert.equal(rosterJourneyTeachRequestV1({automaticNetworkRecovery:false},plan).automaticNetworkRecovery,false);
async function check(consent, consumed=false) {
  const d={...source,providerDispatches:[structuredClone(failed)],publicOutputs:[],toolReceipts:[],
    providerNetworkRecovery:undefined,dispatchRetryAuthorizations:consumed?[{requestId:failed.requestId,status:'consumed'}]:[],
    dispatchReconciliations:[],progress:{...source.progress,rounds:[]},
    teachFramework:{...source.teachFramework,state:structuredClone(source.teachFramework.state)}};
  let captured;const never=()=>assert.fail('No Native/Provider permitted');
  const context=source.teachFramework.context;
  const service=createRosterPlanningWorkspaceServiceV1({
    armyBuilderPort:{evaluateRosterCandidate:never,enumerateArmyBuildingChoices:()=>({unitCandidates:[],vespeneLimitForBudget:{numerator:0,denominator:1}}),listFactionChoices:never,listEngagementScales:never},
    laboratoryCore:{labDescriptor:()=>({}),proveMutationZero:never,missionScoringAuthority:never},
    strategyPack:{foundational:{entries:[]},receipt:{hash:'a'.repeat(64)}},
    selectionUnitRules:context.sourceFacts.selectionUnitRules,fixture:context.fixture,
    draftStore:{loadAll:async()=>({sessions:[d],quarantined:[]}),save:async()=>{}},
    createRunLaboratory:()=>({missionScoringAuthority:()=>context.mission,
      describeQueryContext:()=>context.queryContext}),
    createStrategist:()=>({selectSkillRoute:()=>({projections:context.skillGuidance,skillRefs:context.skillRefs})}),
    deliberationFactory:{createForRun:async input=>{captured=input;throw Error('STOP_BEFORE_PROVIDER');}},
  });
  await service.loadPersisted();
  const request=rosterJourneyTeachRequestV1({automaticNetworkRecovery:consent},plan);
  if(!consent||consumed){await assert.rejects(service.teachPlanFramework(d.sessionId,request),/AMBIGUOUS_DISPATCH|REQUIRES_RECONCILIATION/);assert.equal(captured,undefined);return;}
  await service.teachPlanFramework(d.sessionId,request);
  for(let i=0;!captured&&i<100;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(captured?.retryDispatch?.requestId,failed.requestId,JSON.stringify(d.teachFramework.failure));
  assert.equal(captured.retryDispatch.requestBodyHash,failed.requestBodyHash);
  assert.equal(captured.retryDispatch.contextHash,failed.contextHash);
  assert.equal(typeof captured.recoverNetworkDispatch,'function');
  assert.equal(d.providerDispatches[0].costStatus,'unknown');
  assert.equal(d.dispatchRetryAuthorizations.length,1);
  assert.equal(d.dispatchRetryAuthorizations[0].maximumPhysicalRetries,1);
  assert.equal(d.planSerialized,source.planSerialized);assert.deepEqual(d.usage,source.usage);
}
await check(true);await check(false);await check(true,true);
console.log(JSON.stringify({pass:true,actualRequest:failed.requestId,httpAndJourneyConsent:true,exactRequestRecovery:true,consumedRetryDenied:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
