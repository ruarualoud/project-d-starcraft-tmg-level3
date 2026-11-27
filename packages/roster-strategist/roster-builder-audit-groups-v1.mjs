// Exact Native audit presentation and short source selection. No rule execution
// or strategic judgement. Missing operands remain unavailable, never zero.
const clone=structuredClone;
const number=v=>typeof v==='number'&&Number.isFinite(v);
const escape=s=>s.replaceAll('~','~0').replaceAll('/','~1');
function at(value,pointer){for(const token of pointer.slice(1).split('/')){if(pointer==='')break;const key=token.replaceAll('~1','/').replaceAll('~0','~');if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return {found:false};value=value[key];}return {found:true,value};}
export function projectRosterBuilderAuditGroupsV1({audit,pointer}){
 const groups=[];
 function group(key,build){const value={},observations=[];
  const set=(target,source)=>{const found=at(audit,source);if(!found.found)return;
   const parts=target.split('/'),leaf=parts.pop();let parent=value;for(const part of parts)parent=parent[part]??={};
   parent[leaf]=clone(found.value);observations.push({pointer:pointer+source,valuePointer:'/'+target});};
  build(set,value);groups.push({key,value,observations});}
 const budget='/audit/armyResourceBudgetResult';
 group('summary',set=>{set('status','/status');set('summary','/summary');});
 group('resources',set=>{for(const key of ['mineralBudget','mineralSpent','mineralUnspent','vespeneLimit','vespeneSpent','vespeneUnspent'])set(key,budget+'/'+key);set('validated','/audit/fullResourceArithmeticValidated');});
 group('slots',(set,value)=>{
  set('baseCapacity',budget+'/factionCard/startingArmySlots');
  const cards=audit.audit?.armyResourceBudgetResult?.tacticalCardRows,units=audit.audit?.units;
  if(Array.isArray(cards))cards.forEach((card,i)=>{set('cardGrants/'+i+'/name',budget+'/tacticalCardRows/'+i+'/cardName');set('cardGrants/'+i+'/slots',budget+'/tacticalCardRows/'+i+'/armySlotsAdded');});
  if(Array.isArray(units))units.forEach((unit,i)=>{const p='/audit/units/'+i+'/unitCompositionResult';for(const [name,key]of Object.entries({unitInstanceId:'unitInstanceId',unitName:'unitName',type:'armySlotType',count:'occupiedArmySlots'}))set('units/'+i+'/'+name,p+'/'+key);});
  set('validated','/audit/startingSupplySlotOccupancyValidated');
  const base=value.baseCapacity,keys=base&&typeof base==='object'?Object.keys(base):[];
  const complete=keys.length>0&&keys.every(k=>number(base[k]))&&Array.isArray(cards)&&cards.every(c=>keys.every(k=>number(c.armySlotsAdded?.[k])))
   &&Array.isArray(units)&&units.every(u=>keys.includes(u.unitCompositionResult?.armySlotType)&&number(u.unitCompositionResult?.occupiedArmySlots));
  value.capacity=complete?Object.fromEntries(keys.map(k=>[k,base[k]+cards.reduce((s,c)=>s+c.armySlotsAdded[k],0)])):null;
  value.used=complete?Object.fromEntries(keys.map(k=>[k,units.reduce((s,u)=>s+(u.unitCompositionResult.armySlotType===k?u.unitCompositionResult.occupiedArmySlots:0),0)])):null;
  value.derivation={complete,capacity:'baseCapacity + all cardGrants',used:'sum of unit occupiedArmySlots by type',rulesRecomputed:false};
 });
 group('upgrades',set=>{
  set('validated','/audit/distinctUpgradeEntryAndSpecialistAssignmentValidated');
  for(const [i,unit]of (audit.audit?.units??[]).entries()){
   const p='/audit/units/'+i;
   for(const key of ['unitInstanceId','unitName','selectedUpgradeCount','specialistUpgradeCount','unitWideUpgradeCount','upgradeSelectionSetComplete','onlyPart12ListedUpgradeEntriesPurchased','sameUpgradeEntryPurchasedMoreThanOnce','unitWideDefaultAppliedToEveryStartingModel','specialistAssignedToExactlyOneStartingModel','differentSpecialistsAssignedToDifferentModels'])set('units/'+i+'/'+key,p+'/'+key);
   for(const [j,upgrade]of (unit.selectedUpgrades??[]).entries())for(const key of ['upgradeName','applicationKind','nominatedModelId','appliedModelIds','mineralCost'])set('units/'+i+'/selected/'+j+'/'+key,p+'/selectedUpgrades/'+j+'/'+key);
  }
 });
 return groups;
}
export function rosterBuilderAuditGroupChoicesV1(request){
 const choices=[];
 for(const node of request.promptNodes??[])if(node.kind==='builder_audit_numeric_facts')for(const audit of node.audits??[]){
  const source=audit.source;if(!Number.isSafeInteger(source?.evidenceNumber)||source.validity!=='current')continue;
  for(const group of audit.factGroups??[])choices.push({groupNumber:choices.length+1,key:group.key,source:clone(source),value:clone(group.value),observations:clone(group.observations)});
 }
 return choices;
}
export function rosterBuilderAuditGroupDeliveredReadsV1(request){
 return rosterBuilderAuditGroupChoicesV1(request).flatMap(group=>group.observations.flatMap(observation=>{
  const selected=at(group.value,observation.valuePointer);return selected.found?[{status:'read',evidenceId:group.source.evidenceId,
   evidenceNumber:group.source.evidenceNumber,artifactRef:group.source.artifactRef,pointer:observation.pointer,value:selected.value}]:[];
 }));
}
export function rosterBuilderAuditGroupConclusionSchemaV1(schema,choices){
 const next=clone(schema);if(!choices.length)return next;
 const item={type:'object',properties:{kind:{type:'string',minLength:1,maxLength:64,enum:['builder_audit_group']},groupNumber:{type:'integer',minimum:1,maximum:choices.length},purpose:{type:'string',minLength:1,maxLength:65536}},required:['kind','groupNumber','purpose'],additionalProperties:false};
 next.properties.nativeFacts.items={anyOf:[item,...(next.properties.nativeFacts.items.anyOf??[next.properties.nativeFacts.items])]};
 return next;
}
export function projectRosterBuilderAuditGroupConclusionV1({request,conclusion}){
 if(!conclusion)return {conclusion,errors:[],projection:[]};
 const node=request.promptNodes?.find(n=>n.kind==='experiment_operation_command'&&n.builderAuditGroupVersion===1);
 if(!node)return {conclusion,errors:[],projection:[]};
 const choices=rosterBuilderAuditGroupChoicesV1(request),facts=[],evidenceNumbers=new Set(conclusion.evidenceNumbers),projection=[];
 for(const fact of conclusion.nativeFacts??[]){
  if(fact.kind!=='builder_audit_group'){facts.push(fact);continue;}
  const group=choices.find(c=>c.groupNumber===fact.groupNumber);
  if(!group||!group.observations.length)return {conclusion:null,projection:[],errors:[{code:'builder_audit_group_unavailable',groupNumber:fact.groupNumber}]};
  evidenceNumbers.add(group.source.evidenceNumber);
  for(const observation of group.observations)facts.push({kind:'source_value',evidenceNumber:group.source.evidenceNumber,pointer:observation.pointer,purpose:fact.purpose});
  projection.push({rule:'host_selected_builder_audit_group_v1',groupNumber:group.groupNumber,key:group.key,source:clone(group.source),nativeExecuted:false,sourceApproved:false});
 }
 const unique=[...new Map(facts.map(f=>[JSON.stringify([f.kind,f.evidenceNumber,f.pointer,f.expectedValueJson,f.purpose]),f])).values()];
 return {conclusion:{...clone(conclusion),evidenceNumbers:[...evidenceNumbers],nativeFacts:unique},errors:[],projection};
}
