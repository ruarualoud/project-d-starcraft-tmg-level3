import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileWave4StukovUnitsV2} from './compile-wave4-stukov-units-v2.mjs';
import {createOfficialReviewedProductModelGeometryV1} from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import {createOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialArmyBuilderCatalogueV2} from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import {createOfficialUnitCardSupplyDataBundleV2} from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import {verifyOfficialProductBaseSourceV1} from '../packages/source-data/official-product-base-source-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
export const FIREBAT_DIRECTORY='build/wave4-web/firebat/candidate-v1';
export async function compileWave4Firebat(root){
  const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
  const prior=await read('content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json'),faq=prior.source.references.faq;
  if(faq?.version!=='1.3'||faq.byteHash!=='65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213')
    throw Error('FIREBAT_FROZEN_FAQ_REQUIRED');
  const inputs=await compileWave4StukovUnitsV2(root,{releaseId:'wave4-u98-c88-r50-firebat-engineering-v1',
    directory:FIREBAT_DIRECTORY,additionalReferenceSources:{faq}}),parent=inputs.context.manifest,
    source=await read('content/source-releases/wave4-20261127/firebat-product-20261128/unit-base-source.json');
  verifyOfficialProductBaseSourceV1(source);
  for(const row of [source.productPage,source.productImage]){
    const bytes=await fs.readFile(path.join(root,row.ref));
    if(bytes.length!==row.byteLength||createHash('sha256').update(bytes).digest('hex')!==row.byteHash)
      throw Error('FIREBAT_PRODUCT_SOURCE_BYTES_CHANGED');
  }
  let artifacts={...inputs.artifacts},context=inputs.context;
  artifacts.geometry=createOfficialReviewedProductModelGeometryV1({context,baseGeometry:artifacts.geometry,source});
  const revision=await read(parent.source.sourceRevisionRef),manifestFor=components=>createOfficialReleaseManifestV2({
    releaseId:parent.releaseId,dataset:inputs.dataset,snapshot:inputs.snapshot,sourceRevision:revision,
    sourceRevisionRef:parent.source.sourceRevisionRef,datasetRef:parent.source.datasetRef,snapshotRef:parent.source.snapshotRef,
    sourcePolicy:parent.source.policy,referenceSources:parent.source.references,components});
  const binding=(name,value,version='2.0.0')=>({ref:FIREBAT_DIRECTORY+'/'+name+'.json',version,integrity:{field:'bundleHash',value:value.bundleHash}});
  context={...context,manifest:manifestFor({...parent.components,geometry:binding('geometry',artifacts.geometry,artifacts.geometry.version)}),resources:artifacts};
  const selected=[...artifacts.armyBuilder.catalogueSelection.selectedRecordKeys,'army_units:firebat'].sort();
  artifacts.armyBuilder=createOfficialArmyBuilderCatalogueV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:context,
    legacyPolicyBundle:await read('content/source-releases/wave3-20261112-army-builder-v2.json'),sourceRecordKeys:selected});
  artifacts.unitCharacteristics=createOfficialUnitCardSupplyDataBundleV2({dataset:inputs.dataset,snapshot:inputs.snapshot,
    releaseContext:context,modelBaseGeometryDataBundle:artifacts.geometry,
    armyBuilderUnitDataBundle:artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle});
  context={...context,manifest:manifestFor({...context.manifest.components,
    armyBuilder:binding('armyBuilder',artifacts.armyBuilder),unitCharacteristics:binding('unitCharacteristics',artifacts.unitCharacteristics)}),resources:artifacts};
  return{...inputs,directory:FIREBAT_DIRECTORY,artifacts,context,firebatBaseSource:source,
    admissionScope:'Firebat consumer development only; main Builder remains 102/119 pending complete unit',fullMatchAdmission:false};
}
export async function loadWave4FirebatInputs(root){
  const inputs=await compileWave4Firebat(root);
  for(const [key,value]of Object.entries({...inputs.artifacts,'release-manifest':inputs.context.manifest}))
    await atomicWrite(path.join(root,inputs.directory,key+'.json'),JSON.stringify(value,null,2)+'\n');
  return inputs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const inputs=await loadWave4FirebatInputs(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
  console.log(JSON.stringify({status:'compiled_scoped',releaseId:inputs.context.manifest.releaseId,
    firebatBaseMillimetres:40,fullMatchAdmission:false}));
}
