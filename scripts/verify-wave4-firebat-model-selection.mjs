import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4FirebatInputs} from './compile-wave4-firebat.mjs';
import {createWave4FirebatScene} from './support/wave4-firebat-room-v1.mjs';
import {createOfficialAbilityEffectIrCatalogueV1,createOfficialAbilitySourcePhasePolicyV1} from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import {createOfficialFirebatSourceBundleV1} from '../packages/source-data/official-firebat-source-v1.mjs';
import {prepareOfficialFirebatModelSubstitutionV1 as prepare} from '../packages/rule-atoms/official-firebat-model-substitution-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4FirebatInputs(root),
  ids=['unit:firebat/fire-it-up-assault-phase@1','unit:firebat/need-a-light-combat-phase@1'];
const catalogue=createOfficialAbilityEffectIrCatalogueV1({dataset:inputs.dataset,identityCatalogue:inputs.identities,
  sourceDefinitionIds:ids,sourcePhasePolicy:createOfficialAbilitySourcePhasePolicyV1({dataset:inputs.dataset,includeInlineCardPhases:true})}),
  sourceBundle=createOfficialFirebatSourceBundleV1({catalogue,definitionIds:ids}),cases=[];
for(const compositionKind of ['small','large']){
  const s=createWave4FirebatScene(inputs,{compositionKind}).state;s.phase='assault';
  const ids=s.pieces.find(p=>p.id==='firebat').models.map(m=>m.id),before=hash(s),limit=compositionKind==='large'?2:1,
    plan=prepare({state:s,pieceId:'firebat',attackKind:'ranged',eligibleModelIds:ids,templateModelIds:ids.slice(0,limit),sourceBundle});
  assert.equal(plan.maximumTemplateModels,limit);assert.equal(plan.numericModelIds.length,ids.length-limit);
  assert.equal(plan.numericModelIds.filter(id=>plan.templateModelIds.includes(id)).length,0);assert.equal(hash(s),before);
  assert.throws(()=>prepare({state:s,pieceId:'firebat',attackKind:'ranged',eligibleModelIds:ids,templateModelIds:ids.slice(0,limit+1),sourceBundle}),/FIREBAT_SUBSTITUTION_MODEL_LIMIT/);
  assert.throws(()=>prepare({state:s,pieceId:'firebat',attackKind:'ranged',eligibleModelIds:ids,templateModelIds:[ids[0],ids[0]],sourceBundle}),/FIREBAT_SUBSTITUTION_MODEL_SELECTION_INVALID/);
  const zero=prepare({state:s,pieceId:'firebat',attackKind:'ranged',eligibleModelIds:ids,templateModelIds:[],sourceBundle});
  assert.deepEqual(zero.numericModelIds,ids.slice().sort());
  cases.push({compositionKind,currentSupply:plan.currentSupply,modelCount:ids.length,templateCount:limit,numericCount:plan.numericModelIds.length,
    zeroChoiceRetainsAllNumeric:true,overLimitRejected:true,duplicateRejected:true,readOnly:true});
}
for(const purchased of [false,true]){
  const s=createWave4FirebatScene(inputs,{kind:'melee',upgrades:purchased?[{upgradeName:'Need A Light?'}]:[]}).state;s.phase='combat';
  const ids=s.pieces.find(p=>p.id==='firebat').models.map(m=>m.id),args={state:s,pieceId:'firebat',attackKind:'close_combat',eligibleModelIds:ids,
    templateModelIds:[ids[0]],sourceBundle};
  if(!purchased)assert.throws(()=>prepare(args),/FIREBAT_SUBSTITUTION_UPGRADE_NOT_PURCHASED/);
  else{assert.equal(prepare(args).templateModelIds.length,1);assert.throws(()=>prepare({...args,templateModelIds:ids.slice(0,2)}),/FIREBAT_SUBSTITUTION_MODEL_LIMIT/);}
  cases.push({attackKind:'close_combat',purchaseAuditedByBuilder:true,purchased,selectionAllowed:purchased});
}
const result={schema:'starcraft_tmg_wave4_firebat_model_selection_v1',status:'passed_component',cases,
  sourceBundleHash:sourceBundle.bundleHash,newSignedActions:0,parameterSelectionOnly:true,
  coverageVerified:false,actualAttackConsumersVerified:false,newCompleteAtoms:0,fullFirebatAdmission:false,
  sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/firebat-model-selection.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,cases:cases.length,actualAttackConsumersVerified:false}));
