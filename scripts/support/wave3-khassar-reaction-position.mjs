// Find a conditional engineering scene. The Match menu itself must offer the requested target.
import assert from 'node:assert/strict';
import { evaluateOfficialWithinWhollyWithinV1, officialTerrainBlocksModelPlacementV1 } from '../../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './wave3-room-boundary-fixture-v1.mjs';
export function findKhassarReactionPosition(state, runtime, record = () => {}) {
  const rectangles=state.board.terrain.filter(officialTerrainBlocksModelPlacementV1).map(t=>t.footprint);
  assert(rectangles.every(f=>f.shape==='axis_aligned_rectangle'),'this sampler requires rectangular source cells');
  const route=state.officialReactionFamilySourceBundle.routes.find(r=>r.requiresRangedTargetSnapshot);
  const modelBounds=state.pieces.filter(p=>p.isOnField).flatMap(p=>p.models.map(m=>({
    id:p.id, x:m.xInches-p.xInches, y:m.yInches-p.yInches,
    rx:m.baseWidthInches/2, ry:m.baseDepthInches/2,
  })));
  let candidatesChecked=0;
  for(let y=2;y<=28;y+=0.5)for(let x=5;x<=46;x+=0.5) {
    const positions={high_templar:[x-4,y],adept:[x,y],roach:[x+4.9,y+2.6],hydralisk:[x,y+6]};
    // Use individual bounding boxes as an inexpensive sufficient clearance test.
    // The full geometry and visibility readers still qualify each surviving scene.
    const clear=modelBounds.every(m=>{
      const [px,py]=positions[m.id];
      const left=(px+m.x-m.rx)*1000,right=(px+m.x+m.rx)*1000;
      const top=(py+m.y-m.ry)*1000,bottom=(py+m.y+m.ry)*1000;
      return !rectangles.some(f=>f.maxXMilliInches>left&&f.minXMilliInches<right
        &&f.maxYMilliInches>top&&f.minYMilliInches<bottom);
    });
    if(!clear)continue;
    if(++candidatesChecked>24)throw Error('No qualifying target among 24 geometrically clear samples');
    const s=structuredClone(state);
    for(const [id,[px,py]] of Object.entries(positions)) {
      const p=s.pieces.find(p=>p.id===id);
      const dx=px-p.xInches,dy=py-p.yInches;
      Object.assign(p,{xInches:px,yInches:py});
      for(const m of p.models){m.xInches+=dx;m.yInches+=dy;}
    }
    try {declareWave3EngineeringCoherencyV1(s,{planIdPrefix:'mixed-reaction-geometry-'});}
    catch(e){if(e.failureStage==='scene_geometry' && ['MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP','MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID'].includes(e.code)){record({x,y,reason:e.cause?.message??e.code});continue;}throw e;}
    const shooter='adept',target='roach',neighbour=s.pieces.find(p=>p.id==='hydralisk');
    const neighbourInRange=neighbour.models.some(m=>evaluateOfficialWithinWhollyWithinV1({state:s,dataBundle:s.officialModelBaseGeometryDataBundle,
      source:{kind:'model',unitId:neighbour.id,modelId:m.id},targetUnitId:target,rangeMilliInches:route.rangeInches*1000}).unitWithin);
    if(!neighbourInRange){record({x,y,reason:'neighbour out of range'});continue;}
    const menu=runtime.enumerate(s,{sideKey:'player1'}).parameterDomains;
    const d=menu.find(d=>d.actionType==='delegate_khassar_shot'
      && d.constraints.recipientUnitId===shooter&&d.parameterSchema.targetUnitId.enum.includes(target));
    if(d)return {positions,shooter,weapon:d.weaponName,eligibleTargets:d.parameterSchema.targetUnitId.enum,neighbour:neighbour.id,rangeInches:route.rangeInches};
    record({x,y,reason:'no requested delegated target',targets:menu.filter(d=>d.actionType==='delegate_khassar_shot').map(d=>d.parameterSchema.targetUnitId.enum)});
  }
  throw Error('No qualifying placement among the bounded samples on this board');
}
