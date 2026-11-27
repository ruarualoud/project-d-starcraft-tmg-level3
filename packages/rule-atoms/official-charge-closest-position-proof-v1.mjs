import {createOfficialChargeFlatProofGeometryV1} from './official-charge-composite-cross-section-proof-v1.mjs';
import {evaluateOfficialChargeEndpointDiskDistanceProofV1} from './official-charge-multi-cut-distance-proof-v1.mjs';

const MAX_CELLS=50000;
const unknown=(reason,details={})=>({closestPositionProven:false,reason,...details});
const near=(p,c)=>Math.hypot(Math.max(c.minX-p.x,p.x-c.maxX,0),Math.max(c.minY-p.y,p.y-c.maxY,0));
const blockerDistance=(x,y,b)=>b.rectangle?Math.hypot(Math.max(b.rectangle.minX-x,x-b.rectangle.maxX,0),Math.max(b.rectangle.minY-y,y-b.rectangle.maxY,0)):Math.hypot(x-b.center.x,y-b.center.y);

// Sufficient certificate over ALL nearer integer endpoints. This is not the
// sampled routing/packing search. A failed/capped proof remains unknown.
// Collision cells use a subset of Native's forbidden interiors; continuous
// crossing bounds omit restrictions and thus cannot remove a legal path.
export function proveOfficialChargeClosestPositionV1(state,point,pending=state?.pendingAction){
  const g=createOfficialChargeFlatProofGeometryV1(state,pending);
  if(!g.ok)return unknown(g.reason);
  if(!Number.isSafeInteger(point?.xMilliInches)||!Number.isSafeInteger(point?.yMilliInches))return unknown('invalid_endpoint');
  const {leader,targets,blockers,maximum,actor,enemy}=g;
  const lm=actor.models.find(m=>m.id===leader.id),lr=Math.round(lm.baseWidthInches*1000)/2;
  const rs=new Map(enemy.models.map(m=>[m.id,Math.round(m.baseWidthInches*1000)/2]));
  const achievedGap=Math.min(...targets.map(t=>Math.max(0,Math.round(Math.hypot(point.xMilliInches-t.x,point.yMilliInches-t.y)-lr-rs.get(t.id)))));
  if(achievedGap<=1)return {closestPositionProven:true,kind:'base_contact',achievedGapMilliInches:achievedGap};
  let examined=0,collisionCovered=0,distanceCovered=0;
  const targetCertificates=[];
  for(const target of targets){
    // Native gaps are rounded to milli-inches, with one milli-inch tolerance.
    // Enlarge the set of endpoints whose rounded gap improves by > tolerance.
    const radius=lr+rs.get(target.id)+achievedGap-1.5+1e-7;
    const queue=[{minX:Math.floor(target.x-radius),maxX:Math.ceil(target.x+radius),minY:Math.floor(target.y-radius),maxY:Math.ceil(target.y+radius)}];
    let targetCount=0;
    while(queue.length){
      if(++examined>MAX_CELLS)return unknown('closest_cover_capacity',{examined});
      const c=queue.pop();targetCount++;
      if(near(target,c)>radius||near(leader,c)>maximum+2)continue;
      const covered=blockers.some(b=>[c.minX,c.maxX].every(x=>[c.minY,c.maxY].every(y=>
        blockerDistance(x,y,b)<b.clearance+(b.rectangle?0:1)-1e-7)));
      if(covered){collisionCovered++;continue;}
      if(Math.max(c.maxX-c.minX,c.maxY-c.minY)<=500){
        const bound=evaluateOfficialChargeEndpointDiskDistanceProofV1({leader,target:{x:(c.minX+c.maxX)/2,y:(c.minY+c.maxY)/2},blockers,maximum,radius:Math.hypot(c.maxX-c.minX,c.maxY-c.minY)/2+2});
        if(bound){distanceCovered++;continue;}
      }
      if(c.minX===c.maxX&&c.minY===c.maxY)return unknown('nearer_endpoint_not_excluded',{examined,endpoint:{xMilliInches:c.minX,yMilliInches:c.minY},achievedGapMilliInches:achievedGap});
      const axis=c.maxX-c.minX>=c.maxY-c.minY?'X':'Y',middle=Math.floor((c['min'+axis]+c['max'+axis])/2);
      queue.push({...c,['min'+axis]:middle+1},{...c,['max'+axis]:middle});
    }
    targetCertificates.push({targetModelId:target.id,examinedCells:targetCount,nearerEndpointCoverComplete:true});
  }
  return {closestPositionProven:true,schemaVersion:'official_charge_closest_position_proof_v1',kind:'complete_nearer_integer_endpoint_cover',achievedGapMilliInches:achievedGap,toleranceMilliInches:1,examinedCells:examined,collisionCovered,distanceCovered,targetCertificates,maximumChargeDistanceMilliInches:maximum,omittedConstraintsCanOnlyEnlargeDomain:true,trainingTruth:false};
}
