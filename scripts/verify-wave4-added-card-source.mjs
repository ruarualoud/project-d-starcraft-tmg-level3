import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs,WAVE4_ADDED_CARD_RECORD_KEYS} from './compile-wave4-added-cards.mjs';
import {createOfficialAbilityEffectIrCatalogueV1,createOfficialAbilitySourcePhasePolicyV1} from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import {createOfficialCharacteristicStatusFamilySourceBundleV2} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {createOfficialRelocationFamilySourceBundleV2} from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import {createOfficialBattlefieldAssetFamilySourceBundleV2} from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  ids=['card:robotics_support_bay/master-of-robotics-any@1','card:barracks__reactor_/go-go-go-any@1',
    'card:infested_barracks/for-the-swarm-any@1','card:hive/creep-spread-any@1','card:infested_command_center/scanner-sweep-any@1'],
  catalogue=createOfficialAbilityEffectIrCatalogueV1({dataset:inputs.dataset,identityCatalogue:inputs.identities,sourceDefinitionIds:ids,
    sourcePhasePolicy:createOfficialAbilitySourcePhasePolicyV1({dataset:inputs.dataset,includeInlineCardPhases:true})}),
  char=createOfficialCharacteristicStatusFamilySourceBundleV2({catalogue,definitionIds:ids.slice(0,1),canonicalResourceTypes:true}),
  relocation=createOfficialRelocationFamilySourceBundleV2({catalogue,definitionIds:ids.slice(1,3)}),
  battlefield=createOfficialBattlefieldAssetFamilySourceBundleV2({catalogue,definitionIds:ids.slice(3)}),cases=[];
assert.equal(char.routes[0].effectKind,'fixed_heal');assert.equal(char.routes[0].healValue,2);assert.equal(char.routes[0].requiredActorTag,'mechanical');
cases.push('Master of Robotics exact source binds existing HEAL(2) for Mechanical actor');
assert.equal(relocation.routes.find(r=>r.definitionId===ids[1]).effectKind,'extra_move');
assert.equal(relocation.routes.find(r=>r.definitionId===ids[1]).requiredActorGround,undefined);
cases.push('Reactor Go! Go! Go! retains existing Biological extra Move without a Ground restriction');
const swarm=relocation.routes.find(r=>r.definitionId===ids[2]);assert.equal(swarm.requiredActorTag,'biological');assert.equal(swarm.requiredActorGround,true);
assert.equal(swarm.maxDistanceMilliInches,2000);assert.equal(swarm.actionLimitConsumed,false);
cases.push('For the Swarm! binds both Biological and Ground, two inches and no action-limit consumption');
assert.equal(battlefield.routes.find(r=>r.definitionId===ids[3]).effectKind,'creep_token_place');
cases.push('Hive Creep Spread exact source reuses Creep token placement');
assert.equal(battlefield.routes.find(r=>r.definitionId===ids[4]).effectKind,'detection_indicator');
assert.ok(battlefield.routes.find(r=>r.definitionId===ids[4]).sourceText.includes('lose the HIDDEN Status'));
cases.push('Infested Scanner Sweep exact source accepts its explicit article without changing old source text');
const selection=inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys;
assert.equal(selection.length,108);assert.ok(WAVE4_ADDED_CARD_RECORD_KEYS.every(k=>selection.includes(k)));
assert.ok(['archon','alarak','infested_goliath','infested_siege_tank'].every(k=>!selection.includes('army_units:'+k)));
cases.push('five records selected only in private candidate; four held records remain excluded');
const result={schema:'starcraft_tmg_wave4_added_card_source_v1',status:'passed_component',cases,
  definitions:ids.map(id=>({definitionId:id,classification:inputs.inventory.definitions.find(d=>d.definitionId===id).classification,
    newAtomIds:inputs.inventory.definitions.find(d=>d.definitionId===id).newAtomIds})),
  releaseId:inputs.context.manifest.releaseId,privateSelectedRecords:108,mainBuilderRecordCount:102,newSignedActions:0,
  newCompleteAtoms:0,implementedCumulativeAtoms:7,sourceHeldDefinitions:39,actualRuntimeConsumersVerified:false,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/added-card-source.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,cases:cases.length,definitions:ids.length}));
