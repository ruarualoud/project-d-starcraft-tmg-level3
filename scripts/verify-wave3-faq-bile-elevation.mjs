import assert from 'node:assert/strict';
import {base,output,savedRoom} from './support/wave3-faq-room-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {createOfficialTerrainPieceV1} from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import {createOfficialCorrosiveBileRuntimeV1} from '../packages/product-composition/official-corrosive-bile-runtime-v1.mjs';
import {deriveOfficialTokenSurfacePlacementV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
const original=await savedRoom(output+'/faq62-bile-behind-terrain','faq62-bile-behind-terrain');
const manifest=await read(base+'/wave3-artefact-cocoon-v223-v1/morph/manifest.json');
const context=await resolveWave3StandardContext(manifest,'area_ability_inputs');
const s=structuredClone(original.initial.state),effect=s.pendingCorrosiveBileEffects[0];
const token=s.board.tokens.find(t=>t.tokenId===effect.tokenIds[0]);
const actor=s.pieces.find(p=>p.id===effect.sourcePieceId),model=actor.models[0];
assert.equal(actor.models.length,1);assert.equal(effect.rangeMilliInches,1000);
const tokenEdge=token.coordinate.x+token.baseDiameterInches/2;
const terrain=createOfficialTerrainPieceV1({id:'faq70-elevated-shelf',terrainKind:'ordinary',size:3,standableHorizontalSurface:true,
  footprint:{shape:'axis_aligned_rectangle',minXMilliInches:Math.ceil(1000*(tokenEdge+.15)),maxXMilliInches:Math.ceil(1000*(tokenEdge+8)),
    minYMilliInches:Math.round((token.coordinate.y-3)*1000),maxYMilliInches:Math.round((token.coordinate.y+3)*1000)}});
s.board.terrain.push({...terrain,terrainId:terrain.id,heightTier:'high_ground',elevation:'high_ground',elevationSurface:true,isRemoved:false,blocksPlacement:false});
assert.equal(deriveOfficialTokenSurfacePlacementV2(s,token).elevation,'ground');
const adapter=createOfficialCorrosiveBileRuntimeV1({context,source:s.officialCorrosiveBileSourceBundle,state:s,damageConsumerReady:true});
const rows=[];
for(const gap of [.5,1.5]){
  const position={xInches:tokenEdge+model.baseWidthInches/2+gap,yInches:token.coordinate.y,elevation:'high',supportTerrainIds:[terrain.id]};
  for(const m of [actor,model])Object.assign(m,position);
  const projection=adapter.query(s);
  const within=projection.effects.find(e=>e.effectHash===effect.effectHash).tokens.find(t=>t.tokenId===token.tokenId).targets.some(t=>t.pieceId===actor.id);
  assert.equal(within,gap<=1);
  rows.push({gap,position,within,queryHash:projection.queryReceiptHash});
}
await save(output+'/bile-elevation/result.public.json',{faq:70,original:original.initial.stateHash,token:token.tokenId,source:effect.sourceFeatureHash,
  tokenElevation:'ground',targetElevation:'high',platform:terrain.terrainHash,conditional:true,rows,providerCalls:0});
