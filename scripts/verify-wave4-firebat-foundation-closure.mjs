import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),prefix='docs/development/wave4/evidence/',
  read=async name=>JSON.parse(await fs.readFile(path.join(root,prefix+name+'.public.json'),'utf8')),
  native=await read('firebat-foundation'),source=await read('firebat-source'),selection=await read('firebat-model-selection'),
  cold=await read('firebat-current-cold'),legacy=await read('consume-legacy-cold');
assert.equal(native.status,'passed_scoped');assert.equal(native.results.length,5);
assert.equal(native.results.reduce((n,r)=>n+r.signedActions,0),122);
assert.ok(native.results.every(r=>r.fullNativeRound&&r.coldReplay&&r.idempotencyVerified));
assert.ok(native.results.filter(r=>!r.movement).every(r=>r.precision===(r.stimpack?3:0)));
assert.equal(native.results.find(r=>r.movement).movedInches,6.5);
assert.equal(source.status,'passed_component');assert.equal(source.cases.length,7);
assert.equal(selection.status,'passed_component');assert.equal(selection.cases.length,4);assert.equal(selection.actualAttackConsumersVerified,false);
assert.equal(cold.status,'passed_read_only');assert.equal(cold.results.length,5);
assert.ok(cold.results.every(r=>r.descriptorUnchanged&&r.coldReplay&&r.stimpackRoundCleanupVerified&&r.newActions===0));
assert.equal(legacy.status,'passed_read_only');assert.equal(legacy.results.length,4);
assert.ok(legacy.results.every(r=>r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));
const refs=['firebat-foundation','firebat-source','firebat-model-selection','firebat-current-cold','consume-legacy-cold'].map(n=>prefix+n+'.public.json');
const consumers=[
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','createOfficialCharacteristicStatusFamilySourceBundleV2'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','createOfficialCharacteristicStatusFamilyAdapterV1'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','projectOfficialCharacteristicStatusFamilyModifiersV1'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','resolveOfficialMovementSpeedV1'],
  ['packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs','instantiateOfficialSelectedRosterRangedActionV1'],
  ['packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs','instantiateOfficialSelectedRosterMeleeActionV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1'],
  ['packages/source-data/official-model-base-geometry-data-bundle-v1.mjs','createOfficialReviewedProductModelGeometryV1']
].map(([file,exportName])=>({file,exportName}));
const result={schema:'starcraft_tmg_wave4_firebat_foundation_consumers_v1',status:'passed_scoped',rootRuntimeVersion:'3.243.0',
  nativeCases:5,nativeSignedActions:122,nativeFullRounds:5,independentColdCases:5,independentColdOriginalActions:122,
  legacyColdCases:4,legacyColdOriginalActions:14,newColdActions:0,sourceComponentCases:7,modelSelectionComponentCases:4,
  definitions:[
    {definitionId:'unit:firebat/stimpack-movement-phase@1',classification:'existing_atoms_new_combination',
      actualConsumers:['CP payment and NON-LETHAL DAMAGE (2)','6.5 inch Native move with +3 Speed','numeric ranged and melee PRECISION (3)','round cleanup'],
      allConsumersVerified:false,pendingConsumers:['FT attack integration']},
    ...['perdition-flamethrower-assault-phase','flame-strike-combat-phase'].map(s=>({definitionId:'unit:firebat/'+s+'@1',
      classification:'data_change',actualConsumers:[s.startsWith('perdition')?'numeric ranged attack':'numeric melee attack',
        'native defence/casualties and activation completion'],allConsumersVerified:false,pendingConsumers:['per-model FT combination']}))],
  componentOnlyDefinitions:['unit:firebat/fire-it-up-assault-phase@1','unit:firebat/need-a-light-combat-phase@1'],
  sourceCompiledOnlyDefinitions:['unit:firebat/incinerator-gauntlets-movement-phase@1'],
  actualConsumerRefs:consumers,componentOnlyConsumerRefs:[{file:'packages/rule-atoms/official-firebat-model-substitution-v1.mjs',
    exportName:'prepareOfficialFirebatModelSubstitutionV1',actualAttackConsumerVerified:false}],evidenceRefs:refs,
  newCompleteAtoms:0,implementedCumulativeAtoms:6,mainBuilderRecordCount:102,mainBuilderDenominator:119,sourceHeldDefinitions:39,
  flamerDimensionsVerified:false,webVerified:false,fullFirebatAdmission:false,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,prefix+'firebat-foundation-consumers.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,nativeCases:5,nativeSignedActions:122,newCompleteAtoms:0,fullFirebatAdmission:false}));
