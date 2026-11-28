import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileWave4StukovUnitsV2} from './compile-wave4-stukov-units-v2.mjs';
import {reviewOfficialTalDarimThresholdIdentityV1} from '../packages/source-data/official-tal-darim-threshold-source-v1.mjs';
import {compileOfficialAbilityIdentityCatalogueV2} from '../packages/source-data/official-ability-identity-v2.mjs';
import {createOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialArmyBuilderCatalogueV2} from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import {createOfficialUnitCardSupplyDataBundleV2} from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
export const TAL_DARIM_THRESHOLD_DIRECTORY='build/wave4-web/tal-darim/threshold-candidate-v1';
export async function compileWave4TalDarimThreshold(root,{
  directory=TAL_DARIM_THRESHOLD_DIRECTORY,releaseId='wave4-u98-c88-r50-tal-darim-threshold-engineering-v1'}={}){
  const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),
    old=await read('content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json'),faq=old.source.references.faq;
  if(faq?.version!=='1.3'||faq.byteHash!=='65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213')
    throw Error('TAL_DARIM_FROZEN_FAQ_REQUIRED');
  const inputs=await compileWave4StukovUnitsV2(root,{
    releaseId,directory,additionalReferenceSources:{faq}}),
    registry=reviewOfficialTalDarimThresholdIdentityV1(inputs),
    historical=await read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json'),
    identities=compileOfficialAbilityIdentityCatalogueV2({dataset:inputs.dataset,registry,historicalDatasets:[historical]}),
    parent=inputs.context.manifest,revision=await read(parent.source.sourceRevisionRef),
    manifestFor=components=>createOfficialReleaseManifestV2({releaseId:parent.releaseId,dataset:inputs.dataset,snapshot:inputs.snapshot,
      sourceRevision:revision,sourceRevisionRef:parent.source.sourceRevisionRef,datasetRef:parent.source.datasetRef,snapshotRef:parent.source.snapshotRef,
      sourcePolicy:parent.source.policy,referenceSources:parent.source.references,components});
  const artifacts={...inputs.artifacts,abilityIdentities:identities};
  let context={...inputs.context,manifest:manifestFor({...parent.components,abilityIdentities:{ref:directory+'/abilityIdentities.json',version:'2',
    integrity:{field:'identityCatalogueHash',value:identities.identityCatalogueHash}}}),resources:artifacts};
  artifacts.armyBuilder=createOfficialArmyBuilderCatalogueV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:context,
    legacyPolicyBundle:await read('content/source-releases/wave3-20261112-army-builder-v2.json'),
    sourceRecordKeys:[...inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys,'tactical_cards:tal_darim'].sort()});
  artifacts.unitCharacteristics=createOfficialUnitCardSupplyDataBundleV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:context,
    modelBaseGeometryDataBundle:artifacts.geometry,armyBuilderUnitDataBundle:artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle});
  context={...context,manifest:manifestFor({...context.manifest.components,...Object.fromEntries(['armyBuilder','unitCharacteristics'].map(k=>[k,{
    ref:directory+'/'+k+'.json',version:'2.0.0',integrity:{field:'bundleHash',value:artifacts[k].bundleHash}}]))}),resources:artifacts};
  return{...inputs,registry,identities,artifacts,context,directory,fullMatchAdmission:false,
    admissionScope:'Tal’darim threshold consumers only; Proxy Pylon and main release still pending'};
}
export async function loadWave4TalDarimThresholdInputs(root){
  const inputs=await compileWave4TalDarimThreshold(root);
  for(const [key,value]of Object.entries({...inputs.artifacts,'feature-registry':inputs.registry,'release-manifest':inputs.context.manifest}))
    await atomicWrite(path.join(root,inputs.directory,key+'.json'),JSON.stringify(value,null,2)+'\n');
  return inputs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const inputs=await loadWave4TalDarimThresholdInputs(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
  console.log(JSON.stringify({status:'compiled_scoped',releaseId:inputs.context.manifest.releaseId,reviewedInheritedPassiveClauses:2,fullMatchAdmission:false}));
}
