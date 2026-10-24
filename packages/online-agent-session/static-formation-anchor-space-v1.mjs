// Expand ONLY caller-chosen leader-anchor regions. This is not a second
// collision/coherency implementation, a tactical selector, or an action.
export const STATIC_FORMATION_ANCHOR_REGION_CONTRACT_V1=Object.freeze({
  required:['minimumXInches','maximumXInches','minimumYInches','maximumYInches','stepInches'],
  optional:['preferredAnchor'],
  preferredAnchor:{xInches:'number',yInches:'number'},
  stepInches:'positive multiple of 0.001in (Native position precision); explicitly chosen by caller',
  scope:'Leader anchor ONLY, not the complete unit envelope. Native still checks every model base, terrain and coherency.',
  enumeration:'Exact anchors first, then regions in supplied order. Region lattice is visited nearest preferredAnchor first (or minimum corner if omitted), deterministic row/column ties. Only caller-supplied regions are sampled.',
  proof:'A bounded discrete grid search, NOT a continuous feasibility/impossibility or arrival proof. Caller selects a returned complete option.'});
const fail=detail=>{throw Object.assign(Error('STATIC_FORMATION_ARGUMENTS_INVALID:'+detail),{code:'STATIC_FORMATION_ARGUMENTS_INVALID'});};
const regionFields=new Set([...STATIC_FORMATION_ANCHOR_REGION_CONTRACT_V1.required,...STATIC_FORMATION_ANCHOR_REGION_CONTRACT_V1.optional]);
const pointOK=p=>p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).every(k=>['xInches','yInches'].includes(k))
  &&Number.isFinite(p.xInches)&&Number.isFinite(p.yInches);
function regionGrid(region,index){
  if(!region||typeof region!=='object'||Array.isArray(region)||Object.keys(region).some(k=>!regionFields.has(k))
    ||STATIC_FORMATION_ANCHOR_REGION_CONTRACT_V1.required.some(k=>!Number.isFinite(region[k])))fail('anchor_region_fields_invalid:'+index);
  const minX=Math.ceil(region.minimumXInches*1000),maxX=Math.floor(region.maximumXInches*1000);
  const minY=Math.ceil(region.minimumYInches*1000),maxY=Math.floor(region.maximumYInches*1000),step=Math.round(region.stepInches*1000);
  if(![minX,maxX,minY,maxY,step].every(Number.isSafeInteger)||minX>maxX||minY>maxY||step<=0
    ||Math.abs(region.stepInches*1000-step)>1e-6)fail('anchor_region_bounds_and_positive_native_precision_step_required:'+index);
  if(region.preferredAnchor!==undefined&&!pointOK(region.preferredAnchor))fail('anchor_region_preferredAnchor_invalid:'+index);
  const preferred=region.preferredAnchor??{xInches:minX/1000,yInches:minY/1000};
  const preferredX=Math.round(preferred.xInches*1000),preferredY=Math.round(preferred.yInches*1000);
  if(!Number.isSafeInteger(preferredX)||!Number.isSafeInteger(preferredY))fail('anchor_region_preferredAnchor_precision_invalid:'+index);
  const columns=Math.floor((maxX-minX)/step)+1,rows=Math.floor((maxY-minY)/step)+1;
  if(!Number.isSafeInteger(columns*rows))fail('anchor_region_grid_cardinality_invalid:'+index);
  return {minX,minY,step,columns,rows,preferredX,preferredY,index,count:columns*rows};
}
function* regionCandidates(grid){
  // Lazy best-first lattice traversal: never allocate a map-sized grid just
  // to evaluate a caller-bounded number of candidates.
  const {minX,minY,step,columns,rows,preferredX,preferredY,index}=grid,frontier=[],seen=new Set();
  const add=(column,row)=>{
    if(column<0||column>=columns||row<0||row>=rows)return;
    const key=column+':'+row;if(seen.has(key))return;seen.add(key);
    const x=minX+column*step,y=minY+row*step;
    frontier.push({column,row,x,y,distance:(x-preferredX)**2+(y-preferredY)**2});
  };
  add(Math.max(0,Math.min(columns-1,Math.round((preferredX-minX)/step))),Math.max(0,Math.min(rows-1,Math.round((preferredY-minY)/step))));
  while(frontier.length){
    frontier.sort((a,b)=>a.distance-b.distance||a.row-b.row||a.column-b.column);const candidate=frontier.shift();
    yield {anchor:{xInches:candidate.x/1000,yInches:candidate.y/1000},anchorSource:{kind:'region_grid',regionIndex:index,
      gridColumn:candidate.column,gridRow:candidate.row,stepMilliInches:step}};
    add(candidate.column-1,candidate.row);add(candidate.column+1,candidate.row);add(candidate.column,candidate.row-1);add(candidate.column,candidate.row+1);
  }
}
export function prepareStaticFormationAnchorSpaceV1(unit){
  const anchors=unit.anchors??[],regions=unit.anchorRegions??[];
  if(!Array.isArray(anchors)||anchors.some(p=>!pointOK(p)))fail('anchor_coordinates_required');
  if(!Array.isArray(regions))fail('anchorRegions_array_required');
  if(!anchors.length&&!regions.length)fail('nonempty_anchors_or_anchorRegions_required');
  const grids=regions.map(regionGrid),count=anchors.length+grids.reduce((sum,g)=>sum+g.count,0);
  if(!Number.isSafeInteger(count))fail('anchor_search_cardinality_invalid');
  return {count,usesRegions:grids.length>0,hasExactAnchors:anchors.length>0,
    kind:grids.length?(anchors.length?'mixed_model_points_and_regions':'model_supplied_regions'):'model_supplied_points',
    *candidates(){let anchorIndex=0;
      for(const anchor of anchors)yield {anchorIndex:anchorIndex++,anchor};
      for(const grid of grids)for(const candidate of regionCandidates(grid))yield {...candidate,anchorIndex:anchorIndex++};
    }};
}
