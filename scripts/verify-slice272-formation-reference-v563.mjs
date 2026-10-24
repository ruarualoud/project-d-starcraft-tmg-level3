// Actual159 mixed a Goliath option with an older empty result. The new public
// selection is one source-bound index; Host derives both identities together.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const temporary=new Map(),get=async ref=>temporary.has(ref)?temporary.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const failedWork=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.repairGeneration===4&&w.id.includes('owned-question-v557'));
const failed=(await get(failedWork.resultRef)).value;
assert.equal(failed.code,'PREGAME_LAB_FORMATION_SELECTION_UNKNOWN');
const selectedEvidence=state.evidence[427],sourceWork=state.work.find(w=>w.id===selectedEvidence.id.replace(/^tool(?:-view)?:/,''));
const sourceValue=(await get(sourceWork.resultRef)).value,receipt=sourceValue.receipt;
assert.equal(receipt.queryReceipt.result.formationOptions[0].formationOptionId,'static-f12dd309e9464c01313d7074');
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
  put:async value=>{const ref=hash(value);temporary.set(ref,structuredClone(value));return ref;}}});
const execute=async(id,args)=>{
  const [job]=compileRosterWorkflowExperimentV1({scope:state.scope,namespace:id,evidenceDirectory:state.evidence,
    order:{orderId:id,purpose:'Actual159 source-reference regression',scenarioAssumptions:[],stopAndReturnToModelWhen:'source mismatch',
      steps:[{stepId:'apply',operation:'formation_scene',argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'explicit retained candidate'}]}});
  return executor.execute({workId:job.id,inputs:{request:{value:job.inputs.request.value}}},{checkpointOperation:async()=>{}});
};
const oldFailure=await execute('retained-wrong-pair',failed.submittedArguments);
assert.equal(oldFailure.value.code,'PREGAME_LAB_FORMATION_SELECTION_UNKNOWN');
assert.equal(oldFailure.value.detail,'static-f12dd309e9464c01313d7074','Native candidate failure must expose its actual detail');
const result=await execute('typed-source-selection',{stateRef:failed.submittedArguments.stateRef,
  selections:[{sourceEvidenceNumber:428,optionIndex:0}]});
assert.equal(result.value.status,'completed','source-bound index must apply the selected saved Native option');
assert.equal(result.value.receipt.formationSelection.selections[0].sourceReceiptHash,receipt.receiptHash);
assert.equal(result.value.receipt.formationSelection.selections[0].formationOptionId,receipt.queryReceipt.result.formationOptions[0].formationOptionId);
const emptySource=state.evidence.findIndex(e=>e.id===`tool-view:${failed.request.selections[2].sourceWorkId}`)+1;
const empty=await execute('empty-source-selection',{stateRef:failed.submittedArguments.stateRef,selections:[{sourceEvidenceNumber:emptySource,optionIndex:0}]});
assert.equal(empty.value.status,'returned_to_model');
assert.equal(empty.value.detail.availableOptionCount,0,'empty candidates return exact facts for correction; no invented option');
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,sameProductAndNative:true,atomicSourceSelection:true,emptySelectionDiagnosable:true,
  nativeErrorDetailPreserved:true,providerCalls:0,productionWrites:0}));
