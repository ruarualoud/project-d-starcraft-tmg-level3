import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileWave4TalDarimThreshold} from './compile-wave4-tal-darim-threshold.mjs';
import {createOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialArmyBuilderCatalogueV2} from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import {createOfficialUnitCardSupplyDataBundleV2} from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
export const WAVE4_ADDED_CARD_DIRECTORY='build/wave4-web/added-cards/candidate-v1';
export const WAVE4_ADDED_CARD_RECORD_KEYS=['barracks__reactor_','hive','infested_barracks','infested_command_center','robotics_support_bay'].map(s=>'tactical_cards:'+s);
export async function loadWave4AddedCardInputs(root){
  const directory=WAVE4_ADDED_CARD_DIRECTORY,inputs=await compileWave4TalDarimThreshold(root,{
    directory,releaseId:'wave4-u98-c88-r50-added-cards-engineering-v1'}),parent=inputs.context.manifest,
    revision=await inputs.read(parent.source.sourceRevisionRef),artifacts={...inputs.artifacts},
    manifestFor=components=>createOfficialReleaseManifestV2({releaseId:parent.releaseId,dataset:inputs.dataset,snapshot:inputs.snapshot,
      sourceRevision:revision,sourceRevisionRef:parent.source.sourceRevisionRef,datasetRef:parent.source.datasetRef,snapshotRef:parent.source.snapshotRef,
      sourcePolicy:parent.source.policy,referenceSources:parent.source.references,components});
  artifacts.armyBuilder=createOfficialArmyBuilderCatalogueV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:inputs.context,
    legacyPolicyBundle:await inputs.read('content/source-releases/wave3-20261112-army-builder-v2.json'),
    sourceRecordKeys:[...new Set([...inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys,...WAVE4_ADDED_CARD_RECORD_KEYS])].sort()});
  artifacts.unitCharacteristics=createOfficialUnitCardSupplyDataBundleV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:inputs.context,
    modelBaseGeometryDataBundle:artifacts.geometry,armyBuilderUnitDataBundle:artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle});
  const context={...inputs.context,manifest:manifestFor({...parent.components,...Object.fromEntries(['armyBuilder','unitCharacteristics'].map(k=>[k,{
    ref:directory+'/'+k+'.json',version:'2.0.0',integrity:{field:'bundleHash',value:artifacts[k].bundleHash}}]))}),resources:artifacts};
  for(const [key,value]of Object.entries({...artifacts,'feature-registry':inputs.registry,'release-manifest':context.manifest}))
    await atomicWrite(path.join(root,directory,key+'.json'),JSON.stringify(value,null,2)+'\n');
  return{...inputs,directory,context,artifacts,fullMatchAdmission:false,admissionScope:'added-card engineering consumers only; source holds and whole-release gates remain'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const inputs=await loadWave4AddedCardInputs(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
  console.log(JSON.stringify({status:'compiled_scoped',selectedRecords:inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys.length,
    releaseId:inputs.context.manifest.releaseId,fullMatchAdmission:false}));
}
