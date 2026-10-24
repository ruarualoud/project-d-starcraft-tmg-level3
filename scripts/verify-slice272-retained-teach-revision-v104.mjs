// Actual B17 with explicitly retained Teach14: revision used to drop Teach
// entirely; its prompt projection also omitted queryRecovery results.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterPlanningWorkspaceServiceV1} from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import {createRosterRevisionTeachEvidenceV1} from '../packages/roster-strategist/roster-revision-teach-evidence-v1.mjs';
const base=process.argv[2];
const original=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const plan=JSON.parse(original.planSerialized), sourceHash=original.teachFramework.planHash;
assert.notEqual(plan.planHash,sourceHash);
const repaired=original.teachFramework.state.queryRecovery.operations.find(o=>o.originalQueryId==='q-capability-demand-2-4-reach-scenario-v4');
assert.equal(repaired.result.status,'advisory');
const originalSerialized=original.planSerialized;
const failures=[];
const check=(x,msg)=>{if(!x)failures.push(msg);};
function workspace(changedMap=false){
  const d={...original,teachFramework:structuredClone(original.teachFramework)};
  // Isolate the consumer's completion precondition; no claim that a live
  // synthesis has completed, and never write the production draft.
  d.teachFramework.status='completed';
  if(changedMap)d.teachFramework.context.fixture.mapTopologyHash='f'.repeat(64);
  let captured=null;
  const never=()=>assert.fail('No Provider or Rules execution');
  const service=createRosterPlanningWorkspaceServiceV1({
    armyBuilderPort:{evaluateRosterCandidate:never,enumerateArmyBuildingChoices:()=>({unitCandidates:[],vespeneLimitForBudget:{numerator:0,denominator:1}}),
      listFactionChoices:never,listEngagementScales:never},
    laboratoryCore:{labDescriptor:()=>({}),proveMutationZero:never,missionScoringAuthority:()=>({resultStatus:'derivable',
      missionScoringProfile:{missionScoringProfileHash:plan.openingDeploymentSchedule.missionScoringProfileHash}})},
    strategyPack:{foundational:{entries:[]},receipt:{hash:'a'.repeat(64)}},fixture:structuredClone(original.teachFramework.context.fixture),
    draftStore:{loadAll:async()=>({sessions:[d],quarantined:[]}),save:async()=>{}},createRunLaboratory:()=>({}),
    createStrategist:()=>({reviseRosterPlan:async request=>{captured=request;throw Error('CONSUMER_PROBE_STOP');}}),
    deliberationFactory:{createForRun:async()=>({})},
  });
  return {d,service,captured:()=>captured};
}
const request={revisionPurpose:'user_requested_claim_revision_v1',reasonText:'Consume the retained same-army/map Teach evidence; do not infer success from unknown.',
  revisedSectionKeys:['deploymentConcept','publicSummaryText'],targetedClaimPaths:['publicSummaryText'],triggerIds:[],
  sourceTeachPlanHash:sourceHash};
const w=workspace();await w.service.loadPersisted();await w.service.revisePlan(w.d.sessionId,request);
for(let n=0;!w.captured()&&n<100;n++)await new Promise(r=>setTimeout(r,10));
assert(w.captured(),'must reach the actual revision consumer');
check(w.captured().teachFrameworkExperience?.sourceHash===original.teachFramework.state.sourceHash,
  'explicit retained Teach must reach current-Plan revision, not be silently discarded');
check(w.captured().teachFrameworkSourceBinding?.sourceTeachPlanHash===sourceHash
  &&w.captured().teachFrameworkSourceBinding?.targetPlanHash===plan.planHash,
  'consumer must see original Teach and current target identities without relabelling');
const evidence=createRosterRevisionTeachEvidenceV1(original.teachFramework.state,[],w.captured().teachFrameworkSourceBinding);
check(JSON.stringify(evidence.experience.evidence).includes(repaired.result.receiptHash),
  'actual successful recovery result must be in the delivered evidence, not only buried in full history');
check(evidence.read({receiptHash:repaired.result.receiptHash,path:'sourceReceipt.hypotheticalPlacementAssessment'}).status==='read',
  'the new receipt must also be directly retrievable, including coherency limitations');
const changed=workspace(true);await changed.service.loadPersisted();let rejected=false;
try{await changed.service.revisePlan(changed.d.sessionId,request);}catch(e){rejected=/RETAINED_TEACH_DEPENDENCY_CHANGED/.test(e.message);}
check(rejected&&!changed.captured(),'changed map must reject explicit retained context before Provider creation');
assert.equal(original.planSerialized,originalSerialized);
assert.deepEqual(failures,[]);
console.log(JSON.stringify({status:'PASS',actualB17Teach14Consumer:true,recoveredReceiptDeliveredAndReadable:true,
  changedMapRejected:true,providerCalls:0,roomActions:0,productionDraftWrites:0,liveRevisionOrStrategyProven:false}));
