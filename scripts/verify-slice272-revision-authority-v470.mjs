// Reproduce the false Rules-owned schedule restriction from real input318.
// Exercise the ordinary workspace→runtime→model seam, with no Provider/Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterPlanningWorkspaceServiceV1} from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import {createRosterStrategistRuntimeV1} from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const source=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=JSON.parse(await fs.readFile(process.argv[3],'utf8')).state;
const context=source.teachFramework.context,plan=JSON.parse(source.planSerialized);
source.status='planned';source.failure=null;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)});
const noNative=()=>{throw Error('NO_NATIVE_EXPECTED');};
const raw=createPregameSceneLaboratoryV1({sourceState:state,armyBuilderPort:builder,
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:noNative,instantiate:noNative,apply:noNative}});
const laboratory={...raw,missionScoringAuthority:()=>structuredClone(context.mission)};
const strategyPack={foundational:{entries:Array.from({length:5},()=>({}))},receipt:{hash:'b'.repeat(64)}};
const strategist=createRosterStrategistRuntimeV1({armyBuilderPort:builder,laboratory,strategyPack,
  selectionUnitRules:context.sourceFacts.selectionUnitRules});
let saved=source,seen;
const service=createRosterPlanningWorkspaceServiceV1({armyBuilderPort:builder,laboratoryCore:laboratory,strategyPack,
  fixture:context.fixture,selectionUnitRules:context.sourceFacts.selectionUnitRules,
  draftStore:{loadAll:async()=>({sessions:[source],quarantined:[]}),save:async value=>{saved=value;}},
  createRunLaboratory:()=>laboratory,createStrategist:()=>strategist,
  deliberationFactory:{createForRun:async()=>({descriptor:()=>({kind:'local_model_seam_only'}),deliberate:async request=>{
    seen=request;throw Error('CAPTURED_REVISION_INPUT_ONLY');}})}});
await service.loadPersisted();
await service.revisePlan(source.sessionId,{revisionPurpose:'user_requested_claim_revision_v1',
  reasonText:'Inspect schedule authority at the same formal editor boundary as actual318.',triggerIds:[],
  targetedClaimPaths:['publicSummaryText'],revisedSectionKeys:['publicSummaryText','deploymentConcept']});
for(let i=0;i<100&&saved.status==='running';i++)await new Promise(r=>setTimeout(r,25));
assert.equal(saved.failure?.code,'CAPTURED_REVISION_INPUT_ONLY',JSON.stringify(saved.failure));
assert(!seen.promptNodes.some(n=>n.authority==='rules_checked_immutable_schedule'),
  'A chosen schedule must not be presented as an immutable Rules constraint');
const schedule=seen.promptNodes.find(n=>n.nodeType==='current-arrival-schedule');
assert.equal(schedule.authority,'model_chosen_rules_checked_proposal');
assert.deepEqual(schedule.content.schedule,plan.openingDeploymentSchedule);
assert.equal(schedule.content.scheduleCanBeReplanned,true);
assert.equal(schedule.content.scheduleMutationInThisTool,false);
assert.equal(schedule.content.replanOwner,'iterative_roster_journey');
assert(!seen.userMessage.includes('Keep roster, arrival schedule and unrequested fields unchanged.'));
assert(seen.userMessage.includes('not a game-rule restriction'));
assert.equal(JSON.parse(saved.planSerialized).planHash,plan.planHash);
console.log(JSON.stringify({pass:true,actualBug:318,scheduleBytesUnchanged:true,
  ownershipExplicit:true,editorScopeNotGameRule:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
