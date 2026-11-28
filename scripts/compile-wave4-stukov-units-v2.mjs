import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileWave4StukovUnits} from './compile-wave4-stukov-units.mjs';
import {createOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialArmyBuilderCatalogueV2} from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import {createOfficialUnitCardSupplyDataBundleV2} from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import {rebindOfficialUnchangedReviewedDeploymentGeometryV1,readOfficialReviewedDeploymentGeometryV1} from '../packages/source-data/official-reviewed-deployment-geometry-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
export const STUKOV_UNITS_V2_DIRECTORY='build/wave4-web/stukov-units/candidate-v2';
export async function compileWave4StukovUnitsV2(root,{releaseId='wave4-u98-c88-r50-stukov-units-engineering-v2',directory=STUKOV_UNITS_V2_DIRECTORY,additionalReferenceSources={}}={}){
 const inputs=await compileWave4StukovUnits(root),parent=inputs.context.manifest,priorManifest=await inputs.read(inputs.seed.setup.releaseRef),
  previousBundle=await inputs.read(priorManifest.components.deploymentCardGeometry.ref),previousDataset=await inputs.read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json'),sourceBytesByRef=new Map();
 const historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration');
 for(const ref of new Set(previousBundle.cards.map(c=>c.evidence.sourceRef))){
  const bytes=await fs.readFile(path.join(root,ref)).catch(e=>{if(e.code!=='ENOENT')throw e;return fs.readFile(path.join(historicalRoot,ref));});sourceBytesByRef.set(ref,bytes);
 }
 // Source revision is explicit; rebuilding the Builder binds conversion policy
 // to this release instead of carrying a previous engineering release ID.
 const revision=await inputs.read(parent.source.sourceRevisionRef);
 const buildManifest=components=>createOfficialReleaseManifestV2({releaseId,dataset:inputs.dataset,snapshot:inputs.snapshot,
  sourceRevision:revision,sourceRevisionRef:parent.source.sourceRevisionRef,datasetRef:parent.source.datasetRef,snapshotRef:parent.source.snapshotRef,
  sourcePolicy:parent.source.policy,referenceSources:{...parent.source.references,...additionalReferenceSources},components});
 let context={...inputs.context,manifest:buildManifest(parent.components)},artifacts={...inputs.artifacts};
 artifacts.deploymentCardGeometry=rebindOfficialUnchangedReviewedDeploymentGeometryV1({context,previousBundle,
  previousContext:{dataset:previousDataset,manifest:priorManifest,resources:{deploymentCardGeometry:previousBundle}},sourceBytesByRef});
 const geometryBinding={ref:directory+'/deploymentCardGeometry.json',version:'1.0.0',integrity:{field:'bundleHash',value:artifacts.deploymentCardGeometry.bundleHash}};
 context={...context,manifest:buildManifest({...parent.components,deploymentCardGeometry:geometryBinding}),resources:artifacts};
 artifacts.armyBuilder=createOfficialArmyBuilderCatalogueV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:context,
  legacyPolicyBundle:await inputs.read('content/source-releases/wave3-20261112-army-builder-v2.json'),sourceRecordKeys:inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys});
 artifacts.unitCharacteristics=createOfficialUnitCardSupplyDataBundleV2({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:context,
  modelBaseGeometryDataBundle:artifacts.geometry,armyBuilderUnitDataBundle:artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle});
 const components=Object.fromEntries(Object.entries(artifacts).map(([key,value])=>{const field=key==='abilityIdentities'?'identityCatalogueHash':['wave3CommunityGeometry','battlefieldAssets'].includes(key)?'profileHash':'bundleHash';
  return[key,{ref:directory+'/'+key+'.json',version:key==='deploymentCardGeometry'?'1.0.0':parent.components[key].version,integrity:{field,value:value[field]}}];}));
 context={...context,manifest:buildManifest(components),resources:artifacts};readOfficialReviewedDeploymentGeometryV1({dataset:inputs.dataset,releaseContext:context});
 return{...inputs,directory,artifacts,context,dependencyRebinding:{previousReleaseId:parent.releaseId,releaseId:context.manifest.releaseId,
  selectedRecordCount:artifacts.armyBuilder.catalogueSelection.selectedRecordKeys.length,reviewedDeploymentRecords:previousBundle.cards.map(c=>c.recordKey),
  originalDeploymentRecordsAndEvidenceBytesUnchanged:true,armyBuilderRecompiledForRelease:true,sourceHeldDefinitions:39,fullMatchAdmission:false}};
}
export async function loadWave4StukovUnitInputsV2(root){const inputs=await compileWave4StukovUnitsV2(root);
 for(const [key,value]of Object.entries({...inputs.artifacts,'release-manifest':inputs.context.manifest}))await atomicWrite(path.join(root,inputs.directory,key+'.json'),JSON.stringify(value,null,2)+'\n');return inputs;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify((await loadWave4StukovUnitInputsV2(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))).dependencyRebinding));
