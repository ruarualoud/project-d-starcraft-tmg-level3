import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileWave4TurretCombat} from './compile-wave4-turret-combat.mjs';
import {createOfficialBattlefieldAssetComponentProfileV1,createOfficialBattlefieldAssetComponentProfileV2} from '../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import {createOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

export const VIRUS_EFFECTS_DIRECTORY='build/wave4-web/virus-effects/candidate';
export async function compileWave4VirusEffects(root){
 const inputs=await compileWave4TurretCombat(root);
 const previous=await inputs.read('content/source-releases/wave3-20261112-geometry-release-v2.json');
 const oldDataset=await inputs.read(previous.source.datasetRef);
 const original=await inputs.read('content/source-releases/wave3-20261112-battlefield-component-references-v1.json');
 const {manifestHash,...referenceBody}=original;
 if(hash(referenceBody)!==manifestHash||oldDataset.datasetHash!==original.sourceDatasetHash)throw Error('VIRUS_COMPONENT_REFERENCE_INVALID');
 // These printed component dimensions survive the dataset refresh only when
 // the associated official ability text is unchanged. No unit size is inferred.
 for(const row of [...original.components,...original.unresolvedComponents]){
  const before=oldDataset.recordsByKey[row.recordKey],after=inputs.dataset.recordsByKey[row.recordKey];
  const ability=record=>record?.payload.upgrades?.find(u=>u.name===row.abilityName);
  if(!ability(before)||hash(ability(before))!==hash(ability(after)))throw Error('VIRUS_COMPONENT_SOURCE_CHANGED:'+row.recordKey);
 }
 const rebound={...referenceBody,sourceDatasetHash:inputs.dataset.datasetHash,sourceSnapshotHash:inputs.snapshot.snapshotHash,
  previousReferenceManifestHash:manifestHash,unchangedAbilityPayloadsVerified:true};
 const references={...rebound,manifestHash:hash(rebound)};
 const battlefieldAssets=createOfficialBattlefieldAssetComponentProfileV2({context:inputs.context,
  legacyProfile:createOfficialBattlefieldAssetComponentProfileV1(),references});
 const parent=inputs.context.manifest;
 const artifacts={...inputs.artifacts,battlefieldAssets};
 const manifest=createOfficialReleaseManifestV2({releaseId:'wave4-u98-c88-r50-virus-effects-engineering-v1',
  dataset:inputs.dataset,snapshot:inputs.snapshot,sourceRevision:await inputs.read(parent.source.sourceRevisionRef),
  sourceRevisionRef:parent.source.sourceRevisionRef,datasetRef:parent.source.datasetRef,snapshotRef:parent.source.snapshotRef,
  sourcePolicy:parent.source.policy,referenceSources:parent.source.references,
  components:{...parent.components,battlefieldAssets:{ref:VIRUS_EFFECTS_DIRECTORY+'/battlefieldAssets.json',
   version:battlefieldAssets.semanticVersion,integrity:{field:'profileHash',value:battlefieldAssets.profileHash}}}});
 return{...inputs,directory:VIRUS_EFFECTS_DIRECTORY,artifacts,componentReferences:references,
  context:{...inputs.context,manifest,resources:artifacts}};
}
export async function loadWave4VirusEffectsInputs(root){
 const inputs=await compileWave4VirusEffects(root);
 for(const [name,value]of Object.entries({...inputs.artifacts,'component-references':inputs.componentReferences,'release-manifest':inputs.context.manifest}))
  await atomicWrite(path.join(root,inputs.directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
 return inputs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const inputs=await loadWave4VirusEffectsInputs(root);
 console.log(JSON.stringify({releaseId:inputs.context.manifest.releaseId,assetProfile:inputs.artifacts.battlefieldAssets.profileHash,
  creepFootprint:inputs.artifacts.battlefieldAssets.componentEvidence.creep_tumor,fullMatchAdmission:false}));
}
