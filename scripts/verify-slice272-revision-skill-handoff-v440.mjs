import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterPlanningWorkspaceServiceV1} from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import {createRosterStrategistRuntimeV1} from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [formalFile,fixtureFile]=process.argv.slice(2);
const source=JSON.parse(await fs.readFile(formalFile,'utf8'));
const state=JSON.parse(await fs.readFile(fixtureFile,'utf8')).state;
const context=source.teachFramework.context, plan=JSON.parse(source.planSerialized);
source.status='planned'; source.failure=null;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)});
const noNative=()=>{throw Error('NO_NATIVE_EXPECTED');};
const rawLab=createPregameSceneLaboratoryV1({sourceState:state,armyBuilderPort:builder,
 rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:noNative,instantiate:noNative,apply:noNative}});
const laboratory={...rawLab,missionScoringAuthority:()=>structuredClone(context.mission)};
const strategyPack={foundational:{entries:Array.from({length:5},()=>({}))},receipt:{hash:'b'.repeat(64)}};
const strategist=createRosterStrategistRuntimeV1({armyBuilderPort:builder,laboratory,strategyPack,
 selectionUnitRules:context.sourceFacts.selectionUnitRules});
let saved=source, seen=null;
const service=createRosterPlanningWorkspaceServiceV1({armyBuilderPort:builder,laboratoryCore:laboratory,strategyPack,
 fixture:context.fixture,selectionUnitRules:context.sourceFacts.selectionUnitRules,
 draftStore:{loadAll:async()=>({sessions:[source],quarantined:[]}),save:async value=>{saved=value;}},
 createRunLaboratory:()=>laboratory,createStrategist:()=>strategist,
 deliberationFactory:{createForRun:async()=>({descriptor:()=>({kind:'local_model_seam_only'}),deliberate:async request=>{
   seen=request.promptNodes.find(n=>n.nodeType==='skill-guidance')?.content||null;
   throw Error('CAPTURED_REVISION_INPUT_ONLY');
 }})}});
await service.loadPersisted();
await service.revisePlan(source.sessionId,{revisionPurpose:'user_requested_claim_revision_v1',
 reasonText:'Observe exact Skill handoff to the ordinary formal Plan editor without a model call or mutation.',
 triggerIds:[],targetedClaimPaths:['publicSummaryText'],revisedSectionKeys:['publicSummaryText','deploymentConcept']});
for(let i=0;i<80&&saved.status==='running';i++)await new Promise(r=>setTimeout(r,25));
assert.equal(saved.failure?.code,'CAPTURED_REVISION_INPUT_ONLY',JSON.stringify(saved.failure));
assert(seen,'Formal revision lost the actual general/faction/matchup Skill bodies');
assert.deepEqual(seen.projections,context.skillGuidance);
assert.deepEqual(seen.skillRefs,context.skillRefs);
assert.equal(seen.skillsAdvisoryOnlyCannotAffectRules,true);
assert.equal(saved.revisionStrategyGuidanceSnapshots.at(-1).sourcePlanHash,plan.planHash);
assert.deepEqual(saved.revisionStrategyGuidanceSnapshots.at(-1).projections,context.skillGuidance);
assert.equal(JSON.parse(saved.planSerialized).planHash,plan.planHash);
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,sourceWrites:0,skillKinds:Object.keys(seen.projections),sameFrozenBodies:true,durableBeforeDispatch:true}));
