// Captured B17 paid revision returned all sixteen current texts verbatim.
// Exercise the full real revision consumer and bounded semantic feedback.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterStrategistRuntimeV1} from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=process.argv[2];
const filename=base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json';
const original=await fs.readFile(filename,'utf8'),d=JSON.parse(original),plan=JSON.parse(d.planSerialized);
const paid=d.publicOutputs.findLast(o=>o.roundKind==='revision');
const req=JSON.parse(await fs.readFile(base+'/B/v105r2-revise-request.private.json','utf8'));
assert.equal(paid.sanitizedOutput.repairs.length,16);
const board=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(board.officialUnitCompositionUpgradeDataBundle)});
const lab=createPregameSceneLaboratoryV1({sourceState:board,armyBuilderPort:builder,
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){throw Error('no enumeration');},
    instantiate(){throw Error('no action');},apply(){throw Error('no mutation');}}});
const runtime=createRosterStrategistRuntimeV1({armyBuilderPort:builder,laboratory:lab,
  strategyPack:{foundational:{entries:Array.from({length:5},()=>({}))},receipt:{hash:'b'.repeat(64)}},
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules});
const input={...req,plan,armyAudit:d.working.verdict.audit,
  missionProfile:lab.missionScoringAuthority().missionScoringProfile,
  toolReceipts:d.toolReceipts,teachFrameworkExperience:d.teachFramework.state,
  teachFrameworkSourceBinding:{sourceTeachPlanHash:d.teachFramework.planHash,targetPlanHash:plan.planHash,
    retainedSource:true,frozenDependenciesUnchanged:true,originalQuestionAndContextPreserved:true,
    semanticApplicationStillRequiresReview:true,trainingTruth:false},
  selectionJustificationPolicyVersion:d.agentSelectedStrategySource?.selectionJustificationPolicyVersion,
  selectedCandidateInputHash:hash(d.selectedCandidateInput),finalPlanReview:d.planReview};
let calls=0,firstContext;
const fixed=structuredClone(paid.sanitizedOutput);
fixed.repairs.find(r=>r.claimPath==='publicSummaryText').replacementText+=
  '\nVerification fixture: named distance evidence is conditional, not a new Rules result or strategy endorsement.';
const result=await runtime.reviseRosterPlan(input,{deliberation:{descriptor:()=>({modelVersion:'zero_provider_v106',promptVersion:'v106'}),
  async deliberate(request){calls++;const directive=request.promptNodes.find(n=>n.nodeType==='revision-request');
    assert.equal(directive.content.reasonText,req.reasonText,'real revision request must reach the Provider boundary');
    if(calls===1){firstContext=request.contextHash;return {output:structuredClone(paid.sanitizedOutput)};}
    assert.equal(calls,2,'one actual semantic correction, not blind restart');
    const feedback=request.promptNodes.find(n=>n.nodeType==='revision-completed-reply-feedback');
    assert(feedback,'no-effect must produce explicit model-consumable correction');
    assert.equal(feedback.content.code,'ROSTER_STRATEGIST_CLAIM_REPAIR_INVALID:no_effect');
    assert.deepEqual(feedback.content.unchangedClaimPaths,req.targetedClaimPaths);
    assert.equal(feedback.content.previousOutputHash,paid.outputHash);
    assert.notEqual(request.contextHash,firstContext,'cannot replay the invalid original context as its own correction');
    return {output:fixed};
  }}});
assert.equal(calls,2);
assert.equal(result.plan.planVersion,plan.planVersion+1);
assert.deepEqual(result.plan.rosterCandidate,plan.rosterCandidate);
assert.deepEqual(result.plan.openingDeploymentSchedule,plan.openingDeploymentSchedule);
assert.deepEqual(result.plan.scoreRoute,plan.scoreRoute);
let failures=0;const contexts=new Set();
await assert.rejects(runtime.reviseRosterPlan(input,{deliberation:{descriptor:()=>({modelVersion:'zero_provider_v106',promptVersion:'v106'}),
  async deliberate(request){failures++;contexts.add(request.contextHash);return {output:structuredClone(paid.sanitizedOutput)};}}}),
  /ROSTER_STRATEGIST_CLAIM_REPAIR_INVALID:no_effect/);
assert.equal(failures,3,'three completed replies maximum, not unbounded regeneration');
assert.equal(contexts.size,3,'each bounded feedback round must have its own exact replay key');
assert.equal(await fs.readFile(filename,'utf8'),original);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({status:'PASS',actualSixteenPathNoop:true,requestDelivered:true,
  correctedConsumerCalls:calls,failedBound:failures,rosterAndScheduleUnchanged:true,providerCalls:0,roomActions:0,productionDraftWrites:0}));
