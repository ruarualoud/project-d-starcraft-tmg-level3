import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileWave4VirusEffects} from './compile-wave4-virus-effects.mjs';
import {createOfficialEngineeringImageGeometryV1} from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import {createOfficialUnitCardSupplyDataBundleV2} from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import {createOfficialBattlefieldAssetComponentProfileV1,createOfficialBattlefieldAssetComponentProfileV2} from '../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import {createOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {atomicWrite} from './lib/development-context.mjs';
export const STUKOV_UNITS_DIRECTORY='build/wave4-web/stukov-units/candidate';
export async function compileWave4StukovUnits(root){
 const inputs=await compileWave4VirusEffects(root),parent=inputs.context.manifest;
 const estimates=await inputs.read('content/source-releases/wave4-20261127/geometry-engineering/stukov-unit-base-estimates.json');
 let geometry=inputs.artifacts.geometry;
 for(const estimate of estimates){
  const bytes=await fs.readFile(path.join(root,estimate.sourceImage.ref));
  if(createHash('sha256').update(bytes).digest('hex')!==estimate.sourceImage.byteHash)throw Error('STUKOV_UNIT_ESTIMATE_SOURCE_BYTES_CHANGED');
  geometry=createOfficialEngineeringImageGeometryV1({context:inputs.context,baseGeometry:geometry,estimate});
 }
 const revision=await inputs.read(parent.source.sourceRevisionRef);
 const manifestFor=components=>createOfficialReleaseManifestV2({releaseId:'wave4-u98-c88-r50-stukov-units-engineering-v1',
  dataset:inputs.dataset,snapshot:inputs.snapshot,sourceRevision:revision,sourceRevisionRef:parent.source.sourceRevisionRef,
  datasetRef:parent.source.datasetRef,snapshotRef:parent.source.snapshotRef,sourcePolicy:parent.source.policy,
  referenceSources:parent.source.references,components});
 const geometryBinding={ref:STUKOV_UNITS_DIRECTORY+'/geometry.json',version:geometry.version,integrity:{field:'bundleHash',value:geometry.bundleHash}};
 const context={...inputs.context,manifest:manifestFor({...parent.components,geometry:geometryBinding}),resources:{...inputs.artifacts,geometry}};
 const unitCharacteristics=createOfficialUnitCardSupplyDataBundleV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:context,
  modelBaseGeometryDataBundle:geometry,armyBuilderUnitDataBundle:inputs.artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle});
 const battlefieldAssets=createOfficialBattlefieldAssetComponentProfileV2({context,legacyProfile:createOfficialBattlefieldAssetComponentProfileV1(),references:inputs.componentReferences});
 const artifacts={...inputs.artifacts,geometry,unitCharacteristics,battlefieldAssets};
 const components={...parent.components,geometry:geometryBinding,
  unitCharacteristics:{ref:STUKOV_UNITS_DIRECTORY+'/unitCharacteristics.json',version:unitCharacteristics.version||'2.0.0',integrity:{field:'bundleHash',value:unitCharacteristics.bundleHash}},
  battlefieldAssets:{ref:STUKOV_UNITS_DIRECTORY+'/battlefieldAssets.json',version:battlefieldAssets.semanticVersion,integrity:{field:'profileHash',value:battlefieldAssets.profileHash}}};
 return{...inputs,estimates,directory:STUKOV_UNITS_DIRECTORY,artifacts,context:{...context,manifest:manifestFor(components),resources:artifacts}};
}
export async function loadWave4StukovUnitInputs(root){
 const inputs=await compileWave4StukovUnits(root);
 for(const [name,value]of Object.entries({...inputs.artifacts,'release-manifest':inputs.context.manifest}))
  await atomicWrite(path.join(root,inputs.directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
 return inputs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const inputs=await loadWave4StukovUnitInputs(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 console.log(JSON.stringify({releaseId:inputs.context.manifest.releaseId,engineeringUnitProfiles:inputs.estimates.map(e=>e.recordKey),fullMatchAdmission:false}));
}
