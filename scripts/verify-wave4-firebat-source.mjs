import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4FirebatInputs} from './compile-wave4-firebat.mjs';
import {createOfficialAbilityEffectIrCatalogueV1,createOfficialAbilitySourcePhasePolicyV1} from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import {createOfficialFirebatSourceBundleV1,compileOfficialFirebatSpecV1} from '../packages/source-data/official-firebat-source-v1.mjs';
import {createOfficialCharacteristicStatusFamilySourceBundleV2} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {verifyOfficialModelBaseGeometryDataBundleV2} from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4FirebatInputs(root);
const ids=['stimpack-movement-phase','incinerator-gauntlets-movement-phase','fire-it-up-assault-phase','need-a-light-combat-phase'].map(s=>'unit:firebat/'+s+'@1');
const catalogue=createOfficialAbilityEffectIrCatalogueV1({dataset:inputs.dataset,identityCatalogue:inputs.identities,sourceDefinitionIds:ids,
  sourcePhasePolicy:createOfficialAbilitySourcePhasePolicyV1({dataset:inputs.dataset,includeInlineCardPhases:true})});
const source=createOfficialFirebatSourceBundleV1({catalogue,definitionIds:ids});
const characteristic=createOfficialCharacteristicStatusFamilySourceBundleV2({catalogue,definitionIds:[ids[0]],canonicalResourceTypes:true});
assert.equal(characteristic.routes[0].rangedWeaponScope,'perdition flamethrower');
assert.equal(characteristic.routes[0].precision,3);assert.equal(characteristic.routes[0].resourceType,'CP');
const drift=structuredClone(catalogue.definitions.find(d=>d.definitionId===ids[0]));drift.sourceText=drift.sourceText.replace('Perdition Flamethrower','C-14 Rifle');
assert.throws(()=>compileOfficialFirebatSpecV1(drift),/FIREBAT_FEATURE_SOURCE_MISMATCH/);
const geometry=structuredClone(inputs.artifacts.geometry),base=geometry.profiles.find(p=>p.recordKey==='army_units:firebat');
assert.equal(base.baseWidthMillimetres,40);assert.equal(base.baseShape,'round');assert.ok(base.officialProductBaseSource&&!base.p2pSource&&!base.engineeringImageEstimate);
const reseal=b=>{delete b.bundleHash;return{...b,bundleHash:hash(b)};};
const changed=structuredClone(geometry);changed.profiles.find(p=>p.recordKey==='army_units:firebat').baseWidthMillimetres=41;
assert.throws(()=>verifyOfficialModelBaseGeometryDataBundleV2(reseal(changed)),/OFFICIAL_PRODUCT_GEOMETRY_PROFILE_INVALID/);
const oldVersion=structuredClone(geometry);oldVersion.version='2.2.0';
assert.throws(()=>verifyOfficialModelBaseGeometryDataBundleV2(reseal(oldVersion)),/OFFICIAL_PRODUCT_GEOMETRY_PROFILE_INVALID/);
const main=await inputs.read('build/wave4-web/stukov-units/candidate-v3/armyBuilder.json');
assert.ok(!main.catalogueSelection.selectedRecordKeys.includes('army_units:firebat'));
const result={schema:'starcraft_tmg_wave4_firebat_source_v1',status:'passed_component',sourceBundleHash:source.bundleHash,
  sourceDefinitionIds:ids,unitBaseSourceHash:base.officialProductBaseSource.sourceHash,unitBaseMillimetres:40,
  sourceProductUrl:base.officialProductBaseSource.productPage.url,productImageRef:base.officialProductBaseSource.productImage.ref,
  cases:['four exact feature definitions compile','Stimpack binds actual Firebat weapon and CP',
    'changed weapon source rejected','official product base is not mislabelled P2P or estimate',
    'changed physical size rejected','new product source forbidden in old geometry version','main release does not admit unfinished Firebat'],
  newActions:0,newCompleteAtoms:0,flamerDimensionsVerified:false,fullFirebatAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/firebat-source.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,cases:result.cases.length}));
