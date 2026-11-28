import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createOfficialModelBaseFootprintV1} from './official-model-base-geometry-rules-kernel-v1.mjs';
import {isOfficialFlyingUnitV1} from './official-flying-rules-kernel-v1.mjs';

const fail=code=>{throw Error(code);};
const live=p=>p.isOnField&&!p.isDestroyed&&p.currentModels>0;
const ground=m=>['ground','ground_level'].includes(m.elevation||'ground_level');
const seal=body=>({...body,proofHash:hash(body)});
function uncovered(min,max,intervals){
  let cursor=min;
  for(const [a,b]of intervals.sort((a,b)=>a[0]-b[0]||a[1]-b[1])){
    if(b<cursor)continue;if(a>cursor)return cursor;cursor=Math.max(cursor,b+1);if(cursor>max)return null;
  }
  return cursor<=max?cursor:null;
}
function interval(center,x,radius){
  const rem=radius**2-(x-center.xMilliInches)**2;if(rem<0)return null;
  const extent=Math.floor(Math.sqrt(rem));return[center.yMilliInches-extent,center.yMilliInches+extent];
}
function nearBounds(bounds,center,radius){
  if(!bounds||!['minXMilliInches','maxXMilliInches','minYMilliInches','maxYMilliInches'].every(k=>Number.isSafeInteger(bounds[k])))return true;
  const x=Math.max(bounds.minXMilliInches,Math.min(center.xMilliInches,bounds.maxXMilliInches));
  const y=Math.max(bounds.minYMilliInches,Math.min(center.yMilliInches,bounds.maxYMilliInches));
  return Math.hypot(x-center.xMilliInches,y-center.yMilliInches)<=radius;
}
// A necessary-endpoint superset, not a path search. Ignoring terrain, unsupported
// blocker outlines and own unplaced models can only add endpoints. A casualty is
// admitted only when this larger region is empty. A possible point proves nothing.
export function proveOfficialDisengageEndpointAbsenceV1({state,domain,piece,model,center,regionRadiusMilliInches,kind}){
  if(isOfficialFlyingUnitV1(piece)||!ground(model)||!['leading_failure','other_model_failure'].includes(kind))
    fail('DISENGAGE_ENDPOINT_PROOF_SCOPE_UNSUPPORTED');
  const moving=createOfficialModelBaseFootprintV1({piece,model,dataBundle:state.officialModelBaseGeometryDataBundle});
  if(moving.shape!=='round')fail('DISENGAGE_ENDPOINT_PROOF_ROUND_ACTOR_REQUIRED');
  const radius=regionRadiusMilliInches;
  if(!Number.isSafeInteger(radius)||radius<0||radius>12000)fail('DISENGAGE_ENDPOINT_PROOF_REGION_INVALID');
  // A leader may use a nearby access point to change elevation. Other models
  // are set and may use a nearby supporting surface. Those endpoints must not be
  // silently excluded from a ground-only absence proof.
  const accessPoints=[...(state.board.accessPoints||[]),
    ...(state.board.specialTerrainAgreement?.terrainEntries||[]).flatMap(t=>t.accessPoints||[]),
    ...(state.board.terrain||[]).flatMap(t=>t.accessPoints||[])];
  if(accessPoints.some(p=>!p.isRemoved&&nearBounds(p.footprint,center,radius+moving.radiusMilliInches)))
    fail('DISENGAGE_ENDPOINT_PROOF_ELEVATED_ENDPOINTS_UNRESOLVED');
  if(kind==='other_model_failure'&&(state.board.terrain||[]).some(t=>!t.isRemoved&&!t.isDestroyed
    &&t.size>0&&(t.standableHorizontalSurface!==false||t.elevationSurface!==false)
    &&nearBounds(t.footprint,center,radius+moving.radiusMilliInches)))
    fail('DISENGAGE_ENDPOINT_PROOF_ELEVATED_ENDPOINTS_UNRESOLVED');
  const freeze=state.officialCompetitiveMapRoomFreeze;
  if(kind==='other_model_failure'&&freeze?.overlayReceipt?.terrainProfilePolicy!=='accepted_premade_group_rectangle_overlay_v1'
    &&freeze?.overlayReceipt?.overlayCompilerVersion==='local_ramp_corridor_v3_1'){
    const rows=freeze.semanticTerrainCertificate?.heightTierLedgerRows;
    if(!Array.isArray(rows)||rows.some(row=>['mid_ground','high_ground'].includes(row.heightTier)&&row.impassable!==true
      &&nearBounds(row.footprint||row,center,radius+moving.radiusMilliInches)))
      fail('DISENGAGE_ENDPOINT_PROOF_ELEVATED_ENDPOINTS_UNRESOLVED');
  }
  const blockers=[];
  for(const p of state.pieces.filter(live)){
    if(isOfficialFlyingUnitV1(p))continue;
    for(const m of p.models.filter(m=>!m.isDestroyed&&m.isOnField!==false&&ground(m))){
      if(m.id===model.id||kind==='leading_failure'&&p.id===piece.id)continue;
      const f=createOfficialModelBaseFootprintV1({piece:p,model:m,dataBundle:state.officialModelBaseGeometryDataBundle});
      if(f.shape!=='round')continue;
      const enemy=p.sideKey!==piece.sideKey;
      blockers.push({modelId:m.id,pieceId:p.id,footprintHash:f.footprintHash,center:f.center,
        // Two milli-inches make the excluded disks conservative at every
        // rounded Native overlap/engagement boundary.
        forbiddenRadius:moving.radiusMilliInches+f.radiusMilliInches+(enemy?998:-2)});
    }
  }
  const boardRadius=Math.max(0,moving.radiusMilliInches-2),width=domain.constraints.battlefieldWidthMilliInches,
    height=domain.constraints.battlefieldHeightMilliInches,minX=Math.max(boardRadius,center.xMilliInches-radius),
    maxX=Math.min(width-boardRadius,center.xMilliInches+radius);
  if(maxX-minX+1>24001)fail('DISENGAGE_ENDPOINT_PROOF_BUDGET_EXCEEDED');
  let candidate=null,columns=0;
  for(let x=minX;x<=maxX;x++){
    columns++;const dy=Math.floor(Math.sqrt(Math.max(0,radius**2-(x-center.xMilliInches)**2))),
      minY=Math.max(boardRadius,center.yMilliInches-dy),maxY=Math.min(height-boardRadius,center.yMilliInches+dy);
    if(minY>maxY)continue;
    const intervals=blockers.map(b=>interval(b.center,x,b.forbiddenRadius)).filter(Boolean);
    const y=uncovered(minY,maxY,intervals);if(y!==null){candidate={xMilliInches:x,yMilliInches:y};break;}
  }
  return seal({schema:'starcraft_tmg_disengage_endpoint_absence_v1',kind,coordinateUnit:'milli-inch',
    stateHash:hash(state),domainId:domain.domainId,modelId:model.id,center,regionRadiusMilliInches:radius,
    movingFootprintHash:moving.footprintHash,blockerHash:hash(blockers),columnsVisited:columns,
    endpointSupersetEmpty:candidate===null,firstUnexcludedEndpoint:candidate,
    terrainAndPathRestrictionsIgnored:true,roundingBoundaryBroadened:true,trainingTruth:false});
}
