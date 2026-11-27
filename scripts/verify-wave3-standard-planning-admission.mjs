import assert from 'node:assert/strict';
import path from 'node:path';
import {root,read,save,registry} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';

const directory='build/ticket-28-wave3-mixed-support-opening/planning-admission';
const version='2.99.11', options={root,dataDirectory:path.join(root,directory,'host'),offlineWave3MatchVersion:version};
await assert.rejects(()=>createStarcraftProductRoomHostV1({...options,liveEnabled:true}),{code:'PRODUCT_SETUP_OFFLINE_CANDIDATE_REQUIRED'});
const host=await createStarcraftProductRoomHostV1({...options,liveEnabled:false});
const reg=registry();
try {
  const inputs=host.planningInputsForSetup('wave3-standard-v1'),ref=inputs.wave3MatchSetup.releaseRef;
  const manifest=await read(ref);
  reg.resolver.register(manifest);
  const board=await createRosterPlanningProductModuleV1({root,...inputs,operation:'board_queries'});
  const map=board.mapEvidencePort.summarizeMap({queryId:'planning-admission'});
  assert.equal(board.armyBuilderPort.portDescriptor().releaseBinding.manifestHash,board.releaseBinding.manifestHash);
  assert.equal(map.releaseBinding.manifestHash,board.releaseBinding.manifestHash);
  const record={setupId:inputs.wave3MatchSetup.id,candidateVersion:version,releaseRef:ref,releaseId:manifest.releaseId,
    manifestHash:manifest.manifestHash,boardBinding:board.releaseBinding,registeredComponents:Object.keys(manifest.components),
    scope:'shared formal constructor before fixed or editable seed selection',providerCalls:0,liveCandidateRejected:true};
  await assert.rejects(()=>createRosterPlanningProductModuleV1({root,...inputs,dataDirectory:options.dataDirectory,
    releaseId:manifest.releaseId,releaseResolver:reg.resolver}),error=>{
    if(error.code!=='OFFICIAL_RELEASE_COMPONENTS_MISSING')return false;
    record.rejection={code:error.code,missing:error.detail};
    return error.detail.includes('strategySkills');
  });
  await save(directory+'/result.public.json',record);
} finally {reg.close();await host.close();}
