// Captured B18: the revision's shared facts dropped Teach wrapper citations,
// even though a separate advisory Teach projection contained them.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterStrategistRuntimeV1} from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=process.argv[2];
const filename=base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json';
const d=JSON.parse(await fs.readFile(filename,'utf8'));
const plan=[...d.planVersionHistory.map(JSON.parse),JSON.parse(d.planSerialized)].find(p=>p.planVersion===18);
assert(plan);
const board=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(board.officialUnitCompositionUpgradeDataBundle)});
const never=()=>{throw Error('no Native mutation or query');};
const lab=createPregameSceneLaboratoryV1({sourceState:board,armyBuilderPort:builder,
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:never,instantiate:never,apply:never}});
const runtime=createRosterStrategistRuntimeV1({armyBuilderPort:builder,laboratory:lab,
  strategyPack:{foundational:{entries:Array.from({length:5},()=>({}))},receipt:{hash:'b'.repeat(64)}},
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules});
const receiptHash='37240b195db67681df81519506e4c0b9dc2b688556ff09a98b501166ed19ed92';
const original=d.teachFramework.state.queryRecovery.operations.find(x=>x.result?.receiptHash===receiptHash).result;
let captured;
await assert.rejects(runtime.reviseRosterPlan({plan,
  revisionPurpose:'user_requested_claim_revision_v1',triggerIds:[],
  reasonText:'Re-evaluate the cited measurements against their original scope; no tactical choice is prescribed.',
  revisedSectionKeys:['deploymentConcept'],targetedClaimPaths:['deploymentConcept.threatTradeText'],
  armyAudit:d.working.verdict.audit,missionProfile:lab.missionScoringAuthority().missionScoringProfile,
  toolReceipts:d.toolReceipts,teachFrameworkExperience:d.teachFramework.state,
  teachFrameworkSourceBinding:{sourceTeachPlanHash:d.teachFramework.planHash,targetPlanHash:plan.planHash,
    retainedSource:true,frozenDependenciesUnchanged:true,originalQuestionAndContextPreserved:true,
    semanticApplicationStillRequiresReview:true,trainingTruth:false},
  selectionJustificationPolicyVersion:d.agentSelectedStrategySource?.selectionJustificationPolicyVersion,
  selectedCandidateInputHash:hash(d.selectedCandidateInput),
},{deliberation:{descriptor:()=>({modelVersion:'zero_provider_v110',promptVersion:'v110'}),
  async deliberate(request){captured=request;throw Error('CAPTURED_REPAIR_FACTS');}}}),/CAPTURED_REPAIR_FACTS/);
assert(captured);
const linked=captured.promptNodes.find(n=>n.nodeType==='verified-plan-facts')?.content
  .sourceFacts.citedTeachQueryEvidence?.find(x=>x.receiptHash===receiptHash);
assert(linked,'actual revision verified-plan-facts must include the same native-backed Teach citation as review');
assert.deepEqual(linked.sourceReceipt,original.sourceReceipt);
assert.deepEqual(linked.followUpReceipts,original.followUpReceipts);
assert.equal(linked.sourceReceipt.hypotheticalPlacementAssessment.placementLegalityProven,false);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({status:'PASS',actualB18RevisionConsumer:true,measurementAndCoherencyBoundaryPreserved:true,
  providerCalls:0,roomActions:0,productionDraftWrites:0}));
