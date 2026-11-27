import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createOfficialChargeFlatProofGeometryV1,
  createOfficialChargeUnconditionalProofGeometryV1} from './official-charge-composite-cross-section-proof-v1.mjs';
import {evaluateOfficialChargeEndpointDiskDistanceProofV1} from './official-charge-multi-cut-distance-proof-v1.mjs';

// A complete COVER of a relaxed path domain, not a sampled route search.
// Every legal path stays inside the enlarged movement disk. A cell is removed
// only if its CLOSED rectangle is strictly inside one shrunk blocker, or wholly
// outside that disk. All remaining cells and corner crossings are traversable.
// This can add false routes; it cannot remove a legal one. Remaining endpoint
// cells need a continuous-path lower bound, never grid-center path length.
const STEP = 125, SAFETY = 2, MAX_CELLS = 500000, MAX_ENDPOINT_CELLS = 256;
const unknown = reason => ({allLegalChargePathsExcluded:false,reason});
const near = (p,c) => Math.hypot(Math.max(c.minX-p.x,p.x-c.maxX,0),
  Math.max(c.minY-p.y,p.y-c.maxY,0));
const rectangleDistance = (x,y,r) => Math.hypot(
  Math.max(r.minX-x,x-r.maxX,0),Math.max(r.minY-y,y-r.maxY,0));

export function evaluateOfficialChargeBoundedRegionProofV1(state,pending=state?.pendingAction) {
  const g=createOfficialChargeFlatProofGeometryV1(state,pending);
  return evaluateBoundedCover(state,pending,g);
}

export function evaluateOfficialChargeUnconditionalRegionProofV1(state,pending=state?.pendingAction) {
  const g=createOfficialChargeUnconditionalProofGeometryV1(state,pending);
  const result=evaluateBoundedCover(state,pending,g);
  return result.allLegalChargePathsExcluded ? {...result,
    algorithmVersion:'unconditional_obstacles_bounded_region_v1',
    ordinaryTerrainAndElevationRestrictionsOmitted:true,
    impassableCrossingAbilityExcluded:true,
    rulesTruth:'official_charge_path_length_base_collision_and_unconditional_impassable_terrain'} : result;
}

function evaluateBoundedCover(state,pending,g) {
  if(!g.ok)return unknown(g.reason);
  const {leader,maximum,targets,blockers,enemy}=g;
  const width=Math.round(Number(state.board.widthInches)*1000);
  const height=Math.round(Number(state.board.heightInches)*1000);
  if(![width,height].every(n=>Number.isSafeInteger(n)&&n>0))return unknown('unsupported_board');
  const W=Math.ceil(width/STEP),H=Math.ceil(height/STEP),N=W*H;
  if(N>MAX_CELLS)return unknown('bounded_region_cover_capacity');
  const moveLimit=maximum+SAFETY,blocked=new Uint8Array(N);
  const cell=i=>({minX:(i%W)*STEP,maxX:(i%W+1)*STEP,
    minY:Math.floor(i/W)*STEP,maxY:(Math.floor(i/W)+1)*STEP});
  for(let i=0;i<N;i++)if(near(leader,cell(i))>moveLimit)blocked[i]=1;
  for(const b of blockers) {
    if(!(b.clearance>0))continue;
    const r=b.rectangle||{minX:b.center.x,maxX:b.center.x,minY:b.center.y,maxY:b.center.y};
    const minX=Math.max(0,Math.floor((r.minX-b.clearance)/STEP));
    const maxX=Math.min(W,Math.ceil((r.maxX+b.clearance)/STEP));
    const minY=Math.max(0,Math.floor((r.minY-b.clearance)/STEP));
    const maxY=Math.min(H,Math.ceil((r.maxY+b.clearance)/STEP));
    for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++) {
      const i=y*W+x;if(blocked[i])continue;
      const c=cell(i);
      // Distance to a convex blocker is convex; its maximum over the rectangle
      // is attained at a corner. Strict coverage excludes touching gaps.
      const covered=[c.minX,c.maxX].every(xx=>[c.minY,c.maxY].every(yy=>
        (b.rectangle?rectangleDistance(xx,yy,b.rectangle):Math.hypot(xx-b.center.x,yy-b.center.y))
          <b.clearance-0.1));
      if(covered)blocked[i]=1;
    }
  }
  const reachable=new Uint8Array(N),queue=[];
  // A start on a cell edge/corner seeds ALL touching cells, not just floor().
  for(let y=Math.max(0,Math.ceil(leader.y/STEP)-1);y<=Math.min(H-1,Math.floor(leader.y/STEP));y++)
    for(let x=Math.max(0,Math.ceil(leader.x/STEP)-1);x<=Math.min(W-1,Math.floor(leader.x/STEP));x++) {
      const i=y*W+x;if(!blocked[i]){reachable[i]=1;queue.push(i);}
    }
  if(!queue.length)return unknown('starting_region_not_certified');
  for(let k=0;k<queue.length;k++) {
    const i=queue[k],x=i%W,y=Math.floor(i/W);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
      if((!dx&&!dy)||x+dx<0||x+dx>=W||y+dy<0||y+dy>=H)continue;
      const n=(y+dy)*W+x+dx;
      if(!blocked[n]&&!reachable[n]){reachable[n]=1;queue.push(n);}
    }
  }
  const candidatesByTarget=targets.map(target=>({target,cells:queue.filter(i=>
    near(target,cell(i))<=leader.radiusCeil+target.radiusCeil+1002+0.1)}));
  const endpointCells=[...new Set(candidatesByTarget.flatMap(row=>row.cells))].sort((a,b)=>a-b);
  if(endpointCells.length>MAX_ENDPOINT_CELLS)return unknown('endpoint_partition_capacity');
  const bounds=new Map();
  for(const i of endpointCells) {
    const c=cell(i),target={x:(c.minX+c.maxX)/2,y:(c.minY+c.maxY)/2};
    const proof=evaluateOfficialChargeEndpointDiskDistanceProofV1({leader,target,blockers,maximum,
      radius:Math.ceil(Math.SQRT2*STEP/2)+SAFETY});
    if(!proof)return unknown(`unresolved_endpoint_cell:${i}`);
    bounds.set(i,{cell:i,rectangle:c,lowerBoundMilliInches:proof.lowerBoundMilliInches,
      continuousCrossingProofHash:hash(proof),visibilityVertexCount:proof.visibilityVertexCount});
  }
  const targetCertificates=candidatesByTarget.map(({target,cells})=>({targetModelId:target.id,
    proof:'bounded_region_complete_cover_and_cross_section_distance',
    lowerBoundMilliInches:cells.length?Math.min(...cells.map(i=>bounds.get(i).lowerBoundMilliInches)):moveLimit,
    reachableEndpointCells:cells,reachableEndpointCoverComplete:true,
    excludedWithinMoveLimitMilliInches:moveLimit}));
  return {allLegalChargePathsExcluded:true,algorithmVersion:'bounded_region_cross_sections_v1',
    certificateKind:'occupied_cross_section_distance_shortfall',leadingModelId:leader.id,
    declaredTargetUnitId:enemy.id,declaredTargetModelId:pending.chargePlan.targets[0].modelId,
    allActiveTargetModelsCovered:true,targetCertificates,maximumChargeDistanceMilliInches:maximum,
    cover:{stepMilliInches:STEP,widthCells:W,heightCells:H,reachableCells:queue.length,
      blockedMaskHash:hash(Buffer.from(blocked).toString('base64')),
      reachableMaskHash:hash(Buffer.from(reachable).toString('base64')),
      allTouchingStartCellsSeeded:true,cornerCrossingsAllowed:true,
      endpointCellBounds:[...bounds.values()]},
    omittedConstraintsCanOnlyEnlargeDomain:true,
    rulesTruth:'official_charge_path_length_and_model_base_collision',trainingTruth:false};
}
