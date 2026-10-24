// Actual158: solve_static_formation accepts the initial Native state, but
// formation_scene rejects that same explicit parent before validating candidates.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const transient=new Map(),get=async ref=>transient.has(ref)?transient.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const fail=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.repairGeneration===3
  &&w.id.includes('owned-question-v557')&&w.status==='needs_model_choice');
const failed=(await get(fail.resultRef)).value;
assert.equal(failed.request.base.kind,'source');
const chosen=failed.request.selections[0],work=state.work.find(w=>w.id===chosen.sourceWorkId),value=(await get(work.resultRef)).value;
const receipt=value.receipt;
assert.equal(receipt.baseStateHash,receipt.sourceStateHash);
assert.ok(receipt.queryReceipt.result.formationOptions.some(o=>o.formationOptionId===chosen.formationOptionId));
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const source=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(source.authority.state)===receipt.sourceStateHash){authority=source.authority;break;}
}
assert.ok(authority);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:receipt.laboratoryId,sourceRoomRef:receipt.sourceRoomRef,
  sourceState:authority.state,matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})})});
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store:{get,load:async()=>state,
  put:async value=>{const ref=hash(value);transient.set(ref,structuredClone(value));return ref;}}});
const result=await executor.execute({workId:'source-parent-proof',inputs:{request:{value:{operation:'formation_scene',
  args:{stateRef:failed.submittedArguments.stateRef,selections:[chosen]},bindings:[],guards:[]}}}},
  {checkpointOperation:async()=>{}});
assert.equal(result.value.status,'completed','same explicit Native source parent must be accepted by solver and apply');
assert.equal(result.value.receipt.parentStateHash,receipt.sourceStateHash);
assert.equal(result.value.receipt.formationSelection.selections[0].formationOptionId,chosen.formationOptionId);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
assert.equal(hash(authority.state),receipt.sourceStateHash);
console.log(JSON.stringify({pass:true,rootParentAppliedThroughProductAndNative:true,
  sameParentAndCandidateChecksPreserved:true,providerCalls:0,productionWrites:0}));
