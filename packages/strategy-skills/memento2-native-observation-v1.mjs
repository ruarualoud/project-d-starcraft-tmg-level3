import {hash} from '../skill-production/common.mjs';
import {measurePostgameStateV1} from './postgame-paired-product-runtime-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
export const MEMENTO2_METRIC_FIELDS_V1=['score','supply','livingModels','livingUnits'];
export function memento2FeatureContractV1(scales,mode='native_metrics_v1'){
 need(['native_metrics_v1','native_spatial_phase_v1'].includes(mode)&&MEMENTO2_METRIC_FIELDS_V1.every(k=>Number.isFinite(scales[k])&&scales[k]>0),'MEMENTO2_FEATURE_CONTRACT_INVALID');
 return mode+':'+hash(scales);
}
// Retrieval similarity features, not a second geometry/rules service. Coordinates
// are model centres in board inches. They never assert reachability, range or control.
export function projectMemento2NativeObservationV1({state,stateHash,seat,environmentHash,scales,mode='native_metrics_v1',sourceRef}){
 const metrics=measurePostgameStateV1(state,seat),featureContract=memento2FeatureContractV1(scales,mode);
 const features=MEMENTO2_METRIC_FIELDS_V1.map(k=>metrics[k]/scales[k]);
 const result={seat,stateHash,environmentHash,featureContract,features,...(sourceRef?{sourceRef}:{}),metrics};
 if(mode==='native_metrics_v1')return result;
 const enemy=seat==='player1'?'player2':'player1',other=measurePostgameStateV1(state,enemy);
 features.push(...MEMENTO2_METRIC_FIELDS_V1.map(k=>other[k]/scales[k]));
 const phases=['setup','deployment','movement','assault','combat','scoring','end'];
 need(Number.isFinite(state.round)&&state.board.widthInches>0&&state.board.heightInches>0,'MEMENTO2_NATIVE_BOARD_REQUIRED');
 features.push(state.round/5,...phases.map(p=>Number(state.phase===p)),Number(!phases.includes(state.phase)),Number(state.activeSideKey===seat),Number(state.activeSideKey===enemy),Number(!!state.pendingAction));
 const width=state.board.widthInches,height=state.board.heightInches,spatial=[];
 for(const side of [seat,enemy]){
  const grid=Array(16).fill(0),units=(state.pieces||[]).filter(p=>p.sideKey===side&&p.isOnField===true&&!p.isInReserves&&!p.isDestroyed&&!p.isRemoved);
  let cx=0,cy=0,n=0;
  for(const unit of units){
   const models=(unit.models||[]).filter(m=>!m.isDestroyed&&!m.isRemoved&&m.isOnField!==false);
   for(const m of models){need(Number.isFinite(m.xInches)&&Number.isFinite(m.yInches),'MEMENTO2_NATIVE_POSITION_MISSING');
    const x=m.xInches/width,y=m.yInches/height;
    grid[Math.max(0,Math.min(3,Math.floor(y*4)))*4+Math.max(0,Math.min(3,Math.floor(x*4)))]+=1/scales.livingModels;cx+=x;cy+=y;n++;
   }
   spatial.push({unitId:unit.id,sideKey:side,activatedPhases:unit.activatedPhases,
    models:models.map(m=>({id:m.id,xInches:m.xInches,yInches:m.yInches,baseShape:m.baseShape,baseWidthInches:m.baseWidthInches,baseDepthInches:m.baseDepthInches,elevation:m.elevation}))});
  }
  features.push(...grid,n?cx/n:0,n?cy/n:0,...['movement','assault','combat'].map(p=>units.filter(u=>u.activatedPhases?.[p]===true).length/scales.livingUnits));
 }
 result.featureInterpretation='Phase/actor, own/opponent Native metrics, coarse 4x4 model-centre occupancy and centroids; no route, LOS, attack or marker-control inference. Same frozen map/task only.';
 result.spatialFacts={board:{widthInches:width,heightInches:height},phase:state.phase,round:state.round,activeSideKey:state.activeSideKey,units:spatial};
 return result;
}
