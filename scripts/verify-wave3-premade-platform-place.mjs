import assert from 'node:assert/strict';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { savedRoom, signedBranch } from './support/wave3-faq-room-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { createOfficialModelBaseFootprintV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialFinalPlacementSurfaceSupportV13 } from '../packages/rule-atoms/official-semantic-surface-support-v1.mjs';

const parent='build/ticket-28-wave3-premade-flight-and-platform';
const id='wave3-premade-platform-place-clear', dir=parent+'/reinforcement-place/clear-enemy-gap';
const receipt=await read(parent+'/result.public.json'), {head}=await savedRoom(parent,receipt.roomId);
assert(receipt.cold && head.stateHash===receipt.stateHash && head.stateRevision===6);
// One isolated setup changes only the opposing unit's declared location. The original
// r6 remains the recorded enemy-distance rejection and is never modified here.
const state=structuredClone(head.state);
const hydras=state.pieces.find(p=>p.id==='hydralisk');
const enemyPositions=hydras.models.map((model,i)=>({xInches:36.5,yInches:3.5+2.05*i}));
Object.assign(hydras,enemyPositions[0]);
hydras.models.forEach((model,i)=>Object.assign(model,enemyPositions[i],{elevation:'ground',supportTerrainIds:[]}));
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:id});
const actor=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:raynor_s_raider__marine_');
assert(actor.isInReserves && actor.models.length===6);
const xy=[[18400,20400],[19800,20400],[19800,21800],[18400,21800],[17000,20400],[15650,21300]];
const supports=actor.models.map((model,i)=>{
  const [xMilliInches,yMilliInches]=xy[i],position={xMilliInches,yMilliInches,rotationDegrees:0};
  const footprint=createOfficialModelBaseFootprintV1({dataBundle:state.officialModelBaseGeometryDataBundle,piece:actor,model,position});
  const facts=deriveOfficialFinalPlacementSurfaceSupportV13(state,footprint);
  assert(facts.elevation==='high' && facts.supportTerrainIds.some(s=>s.startsWith('ramp-west::platform')),JSON.stringify({position,facts}));
  return {modelId:model.id,position,facts};
});
assert(supports.some(s=>s.facts.highGroundOverhang));
const params={leadingModelId:actor.models[0].id,anchorPieceId:'raven',anchorModelId:'raven-model-1',
  placements:supports.map(s=>({modelId:s.modelId,...s.position,elevation:s.facts.elevation,supportTerrainIds:s.facts.supportTerrainIds}))};
const scene={parent:receipt.roomId,parentRevision:head.stateRevision,parentHash:head.stateHash,ability:'Rapid Reinforcements',map:receipt.seedId,conditionalEnemyPositions:enemyPositions};
await signedBranch({dir,id,version:'2.99.5',initial:state,state,scene,
  perform:async({app,seats,head:current,menu,commit})=>{
    const h=await current(); if(h.stateRevision===1)return;
    const space=await menu(),d=space.parameterDomains.find(d=>d.pieceId===actor.id && d.abilityName===scene.ability);
    assert(d && d.parameterSchema.anchorPieceId.enum.includes('raven'));
    const preview=parameters=>app.room.previewAction({roomId:id,seatToken:seats.player1.seatToken,
      expectedStateRevision:h.stateRevision,expectedStateHash:h.stateHash,expectedMatchBindingHash:h.matchBindingHash,
      expectedLegalSpaceHash:space.legalSpaceHash,proposal:{kind:'parameterized',domainId:d.domainId,parameters}});
    const admitted=await preview(params);
    if(!admitted.ok){
      await save(dir+'/refused-'+Date.now()+'.public.json',{scene,message:admitted.message,supports,providerCalls:0});
      assert.fail(admitted.message);
    }
    const wrong=structuredClone(params);
    wrong.placements[0].elevation='ground';wrong.placements[0].supportTerrainIds=[];
    const denied=await preview(wrong);
    assert.equal(denied.ok,false);
    assert.match(denied.message,/RELOCATION_TERRAIN_SUPPORT_MISMATCH/);
    await save(dir+'/preview.public.json',{witnesses:supports,denied:denied.message,accepted:admitted.preview.core.result.postStateHash,providerCalls:0});
    await commit(d,params);
  },verify:async h=>{
    const arrived=h.state.pieces.find(p=>p.id===actor.id);
    assert(arrived.isOnField && arrived.activatedPhases.movement);
    for(const [i,m] of arrived.models.entries()){
      const s=supports[i];assert.equal(m.elevation,'high');assert.equal(m.xInches,s.position.xMilliInches/1000);assert.equal(m.yInches,s.position.yMilliInches/1000);
      assert.deepEqual(m.supportTerrainIds,s.facts.supportTerrainIds);
    }
    const preview=await read(dir+'/preview.public.json');assert.equal(h.stateHash,preview.accepted);
    return {actor:actor.id,placed:arrived.models.length,overhang:supports.filter(s=>s.facts.highGroundOverhang).map(s=>s.modelId),nextSide:h.state.activeSideKey};
  }});
