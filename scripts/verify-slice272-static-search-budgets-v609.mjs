// Actual v608 crossed intent normalization but Native single-unit still rejected
// its publicly advertised search-budget fields. Exercise the real private lab /
// Rules Adapter / static solver on the SAME frozen authority, no model or room.
import fs from 'node:fs/promises';import path from 'node:path';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const last=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.resultRef&&w.status==='needs_model_choice'
  &&w.inputs.request.value.operation==='spatial'&&w.inputs.request.value.args.queryKind==='space.solve_static_formation');
const failed=JSON.parse(await fs.readFile(path.join(base,'artifacts',last.resultRef+'.json'),'utf8')).value;
const args=JSON.parse(failed.request.argumentsJson);assert(Array.isArray(args.formationObjectives));
assert.equal(args.maximumJointOptions,6);assert.equal(args.maximumJointEvaluations,128);
let authority;for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===state.scope.source){authority=saved.authority;break;}}
assert(authority);const frozenHash=hash(authority.state);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:'ticket27-s271-roster-workspace-lab',
  sourceRoomRef:{roomId:'ticket27-slice-271-roster-workspace-isolated-lab',stateRevision:0},sourceState:authority.state,
  matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})})});
let queries=0;const query=async(input,id)=>{queries++;return lab.querySpatial({queryId:id,seatKey:'player1',
  queryKind:'space.solve_static_formation',argumentsJson:JSON.stringify(input)});};
const {maximumJointOptions,maximumJointEvaluations,...legacyArgs}=args;
const baselineFile=path.join(run,'static-budget-v609-legacy-baseline.json');
let baseline=await fs.readFile(baselineFile,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
if(!baseline){const receipt=await query(legacyArgs,'v609-legacy-single-before-budget-fix');assert.equal(receipt.resultStatus,'ok');
  baseline={sourceHash:frozenHash,input:legacyArgs,receipt,diagnosticNotAgentDecision:true};
  await fs.writeFile(baselineFile,JSON.stringify(baseline,null,2),{flag:'wx'});}
assert.equal(baseline.sourceHash,frozenHash);assert.deepEqual(baseline.input,legacyArgs);
const result=await query(args,'v609-actual-single-budget-fields');
assert.equal(result.resultStatus,'ok','public single-unit budget fields must be consumed, not rejected as unrecognized');
const actual=result.queryReceipt.result,old=baseline.receipt.queryReceipt.result;
assert.deepEqual(actual.formationOptions,old.formationOptions,'large explicit budgets preserve all original per-anchor witnesses');
assert.deepEqual(actual.misses,old.misses);assert.equal(actual.search.maximumOptions,6);assert.equal(actual.search.maximumEvaluations,128);
assert.equal(actual.search.evaluations,args.anchors.length);assert.equal(actual.search.exhaustiveWithinSuppliedAnchors,true);
const bounded=await query({...args,maximumJointOptions:1,maximumJointEvaluations:1},'v609-native-bounded-single');
assert.equal(bounded.resultStatus,'ok');assert(bounded.queryReceipt.result.search.evaluations<=1);
assert(bounded.queryReceipt.result.formationOptions.length<=1);assert.equal(bounded.queryReceipt.result.noLegalFormationProven,false);
const bad=await query({...args,maximumJointEvaluations:0},'v609-native-invalid-budget');assert.equal(bad.resultStatus,'unknown');
assert.match(bad.queryReceipt.repairContext.validationMessage,/positive.*search_budgets|required.*positive/i,
  'real Rules Adapter must retain a concrete Native input error, not only the shared generic code');
assert.equal(hash(authority.state),frozenHash);assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
console.log(JSON.stringify({status:'passed',realNativeQueriesThisInvocation:queries,oldSuccessfulBaselineReused:true,
  actualSingleBudgetFieldsAccepted:true,unchangedWitnesses:actual.optionCount,searchBoundsHonored:true,
  concreteErrorDelivered:true,providerCalls:0,sourceMutations:0,productionWrites:0}));
