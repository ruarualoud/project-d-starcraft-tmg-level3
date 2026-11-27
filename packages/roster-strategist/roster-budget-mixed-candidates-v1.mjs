import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const copy=structuredClone;
// A finite candidate population, not a strategy selector or legality oracle.
// Existing selected upgrades/cards stay selected. Combinations may resize an
// existing unit and add configured units; every yielded candidate is later
// audited by the unchanged complete-army Builder.
export function generateRosterMixedBudgetCandidatesV1({current,menu,nativeSelections,maximumMutationDepth,shortfall,slotOverflowAdvisory,menuCost,upgradeCost,maximumPopulation=20000,preserveUnitIds=[],excludedNewUnitRecordKeys=[]}){
 const groups=[],ids=new Set(current.units.map(u=>u.unitInstanceId));
 const totalCost=(type,composition,names)=>{const values=[menuCost(composition.mineralCost),...names.map(name=>{
  const u=type.purchasableUpgrades.find(x=>x.upgradeName===name);return u?upgradeCost(u,composition.compositionKind):null;
 })];return values.every(Number.isSafeInteger)?values.reduce((a,b)=>a+b,0):null;};
 const subsets=(items,limit)=>{const out=[[]];for(const item of items){for(const subset of out.slice())if(subset.length<limit)out.push([...subset,item]);}return out;};
 for(const unit of [...current.units].sort((a,b)=>a.unitInstanceId.localeCompare(b.unitInstanceId))){
  if(preserveUnitIds.includes(unit.unitInstanceId))continue;
  const type=menu.unitCandidates.find(x=>x.recordKey===unit.recordKey),selected=nativeSelections.get(unit.unitInstanceId);
  if(!type||!selected)throw Error('ROSTER_BUDGET_NATIVE_SELECTION_MISSING');
  const before=type.compositionOptions.find(o=>o.compositionProfileId===selected.unitCompositionResult.compositionProfileId);
  const names=selected.selectedUpgrades.map(u=>u.upgradeName),baselineCost=totalCost(type,before,names),options=[];
  for(const composition of type.compositionOptions){
   const changed=composition.compositionProfileId!==before.compositionProfileId,baseSteps=changed?[{mutationKind:'change_composition',subjectId:unit.unitInstanceId,detailId:composition.compositionProfileId}]:[];
   for(const additions of subsets(type.purchasableUpgrades.filter(u=>!names.includes(u.upgradeName)),maximumMutationDepth-baseSteps.length)){
    const steps=[...baseSteps,...additions.map(u=>({mutationKind:'add_upgrade',subjectId:unit.unitInstanceId,detailId:u.purchasableUpgradeProfileId}))];if(!steps.length)continue;
    const cost=totalCost(type,composition,[...names,...additions.map(u=>u.upgradeName)]);
    options.push({steps,delta:Number.isSafeInteger(cost)&&Number.isSafeInteger(baselineCost)?cost-baselineCost:null,transform:draft=>{
     const target=draft.units.find(x=>x.unitInstanceId===unit.unitInstanceId);
     if(changed){target.compositionKind=composition.compositionKind;delete target.compositionProfileId;delete target.startingModelIds;}
     for(const upgrade of additions)target.upgrades.push({upgradeName:upgrade.upgradeName});
    }});
   }
  }groups.push(options);
 }
 for(const type of [...menu.unitCandidates].sort((a,b)=>a.recordKey.localeCompare(b.recordKey))){
  if(excludedNewUnitRecordKeys.includes(type.recordKey))continue;
  for(const composition of type.compositionOptions){
   const suffix=hash({recordKey:type.recordKey,compositionProfileId:composition.compositionProfileId}).slice(0,12);
   let id=current.sideKey+'-branch-'+suffix,n=2;while(ids.has(id))id=current.sideKey+'-branch-'+suffix+'-'+n++;ids.add(id);
   const options=[];
   for(const upgrades of subsets(type.purchasableUpgrades,maximumMutationDepth-1)){
    const steps=[{mutationKind:'add_unit',subjectId:type.recordKey,detailId:composition.compositionProfileId},
     ...upgrades.map(u=>({mutationKind:'add_upgrade',subjectId:id,detailId:u.purchasableUpgradeProfileId}))];
    options.push({steps,delta:totalCost(type,composition,upgrades.map(u=>u.upgradeName)),transform:draft=>draft.units.push({unitInstanceId:id,recordKey:type.recordKey,compositionKind:composition.compositionKind,upgrades:upgrades.map(u=>({upgradeName:u.upgradeName}))})});
   }groups.push(options);
  }
 }
 let population=[{parts:[],steps:[],delta:0,slotOverflow:0,key:''}],truncated=false;
 const rank=(a,b)=>(a.slotOverflow??Infinity)-(b.slotOverflow??Infinity)
  ||(a.delta===null?Infinity:Math.abs(shortfall-a.delta))-(b.delta===null?Infinity:Math.abs(shortfall-b.delta))
  ||a.steps.length-b.steps.length||a.key.localeCompare(b.key);
 for(const options of groups){
  let next=population.slice();
  for(const node of population)for(const part of options){
   if(node.steps.length+part.steps.length>maximumMutationDepth)continue;
   const steps=[...node.steps,...part.steps],delta=node.delta===null||part.delta===null?null:node.delta+part.delta;
   next.push({parts:[...node.parts,part],steps,delta,slotOverflow:slotOverflowAdvisory(steps),key:steps.map(s=>s.mutationKind+':'+s.subjectId+':'+s.detailId).join('|')});
   // Bounded memory; keeping the top K of a prefix and then the next prefix
   // yields the same top K under this total, deterministic ordering.
   if(next.length>=maximumPopulation*2){next.sort(rank);next.length=maximumPopulation;truncated=true;}
  }
  if(next.length>maximumPopulation){next.sort(rank);next.length=maximumPopulation;truncated=true;}
  population=next;
 }
 const candidates=population.filter(n=>n.steps.length).map(node=>{
  const one=node.steps.length===1?node.steps[0]:null;
  return {branchId:one?one.mutationKind+':'+one.subjectId+':'+one.detailId:'compound:'+hash(node.steps).slice(0,20),
   kind:one?.mutationKind??'compound',subjectId:one?.subjectId??null,detailId:one?.detailId??null,
   expectedDelta:node.delta,steps:node.steps,transform:draft=>node.parts.forEach(p=>p.transform(draft))};
 });
 candidates.sort((a,b)=>Number(b.steps.length===1)-Number(a.steps.length===1)||a.branchId.localeCompare(b.branchId));
 return {candidates,oneStepCount:candidates.filter(x=>x.steps.length===1).length,truncated,
  scope:{maximumPopulation,groups:groups.length,method:'bounded_group_beam',newUnitUpgradeDependencies:true,menuCostsAreAdvisory:true}};
}
