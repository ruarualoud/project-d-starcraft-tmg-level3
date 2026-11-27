// Read-only presentation of exact Native audits. Arithmetic here is ONLY sums
// of their named purchase costs / differences of already computed counts.
// No game-rule recomputation, option ranking, new audit or roster selection.
import {projectRosterBuilderAuditGroupsV1} from './roster-builder-audit-groups-v1.mjs';
const clone=structuredClone;
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const budgetKeys=['mineralBudget','mineralSpent','mineralUnspent','vespeneLimit','vespeneSpent','vespeneUnspent'];
// Copy each named Native accounting quantity; never infer a missing balance.
const projectBudget=budget=>budget?Object.fromEntries(budgetKeys.filter(k=>Object.hasOwn(budget,k)).map(k=>[k,clone(budget[k])])):null;
const summaryKeys=['unitCount','startingModelCount','startingSupply','selectedUpgradeCount',
  'mineralSpent','mineralUnspent','vespeneSpent'];
function auditSource(value){
  let body=value,prefix='';
  if(value?.kind==='tool_receipt'){body=value.value;prefix='/value';}
  let audit,pointer;
  if(body?.operation==='builder_audit'&&body.status==='completed'){audit=body.receipt;pointer=prefix+'/receipt';}
  else if(body?.operation==='candidate_context'&&body.receipt?.resultStatus==='ok'){audit=body.receipt.audit;pointer=prefix+'/receipt/audit';}
  else {audit=body;pointer=prefix;}
  return audit?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
    &&audit.portId==='official-army-builder-query-port-v1'&&audit.status==='legal'
    &&audit.audit?.schema==='starcraft_tmg_official_complete_army_composition_upgrade_audit_v1'
    ?{audit,pointer}:null;
}
function unitCostRows(budget,pointer){
  if(!Array.isArray(budget?.unitRows))return null;
  return budget.unitRows.map((unit,index)=>{
    const upgrades=Array.isArray(budget.upgradeRows)?budget.upgradeRows
      .map((row,i)=>({row,pointer:pointer+'/upgradeRows/'+i+'/mineralCost'}))
      .filter(({row})=>row.unitInstanceId===unit.unitInstanceId):null;
    const baseMineralCost=numeric(unit.mineralCost)?unit.mineralCost:null;
    const upgradeMineralCost=upgrades?.every(({row})=>numeric(row.mineralCost))
      ?upgrades.reduce((sum,{row})=>sum+row.mineralCost,0):null;
    const totalMineralCost=baseMineralCost!==null&&upgradeMineralCost!==null
      ?baseMineralCost+upgradeMineralCost:null;
    return {unitInstanceId:unit.unitInstanceId,recordKey:unit.recordKey,unitName:unit.unitName,
      compositionKind:unit.compositionKind,startingModels:unit.startingModels,startingSupply:unit.startingSupply,
      baseMineralCost,upgradeMineralCost,totalMineralCost,
      purchaseCostUnit:'minerals',sourcePointer:pointer+'/unitRows/'+index,
      totalCostDerivation:{operation:'sum',complete:totalMineralCost!==null,
        operands:[{pointer:pointer+'/unitRows/'+index+'/mineralCost',value:baseMineralCost},
          ...(upgrades??[]).map(({row,pointer})=>({pointer,value:numeric(row.mineralCost)?row.mineralCost:null}))]},
      upgrades:upgrades?.map(({row,pointer})=>({upgradeInstanceId:row.upgradeInstanceId,
        upgradeName:row.upgradeName,mineralCost:row.mineralCost,sourcePointer:pointer}))??null};
  });
}

export function projectRosterBuilderAuditNumericFactsV1({value,evidence={}}){
  const resolved=auditSource(value);if(!resolved)return null;
  const {audit,pointer}=resolved,budget=audit.audit.armyResourceBudgetResult;
  return {schema:'roster_builder_audit_numeric_facts_v1',version:1,
    source:{evidenceId:evidence.id??null,evidenceNumber:evidence.number??null,artifactRef:evidence.artifactRef??null,
      auditPointer:pointer,validity:evidence.validity??null},
    candidateHash:audit.candidateHash,rulesBundleHash:audit.unitCompositionUpgradeDataBundleHash,
    summary:clone(audit.summary??{}),summaryPointer:pointer+'/summary',
    factGroups:projectRosterBuilderAuditGroupsV1({audit,pointer}),
    budget:projectBudget(budget),budgetPointer:budget?pointer+'/audit/armyResourceBudgetResult':null,
    units:unitCostRows(budget,pointer+'/audit/armyResourceBudgetResult'),
    factionCard:budget?.factionCard?clone(budget.factionCard):null,
    factionCardPointer:budget?.factionCard?pointer+'/audit/armyResourceBudgetResult/factionCard':null,
    derivation:'Native summary copied exactly; full unit purchase cost = base composition + all selected upgrades.',
    sourceVerdict:audit.status,newRulesExecution:false,strategyApproved:false,fullOriginalReadGranted:false};
}

export function compareRosterBuilderAuditNumericFactsV1(before,after){
  if(!before||!after||!before.rulesBundleHash||before.rulesBundleHash!==after.rulesBundleHash
    ||!before.candidateHash||!after.candidateHash||before.candidateHash===after.candidateHash
    ||!['sideKey','scaleId','mineralBudget'].every(key=>Object.hasOwn(before.summary,key)
      &&Object.hasOwn(after.summary,key)&&before.summary[key]===after.summary[key]))return null;
  return {schema:'roster_builder_audit_numeric_comparison_v1',version:1,
    beforeCandidateHash:before.candidateHash,afterCandidateHash:after.candidateHash,
    beforeSource:clone(before.source),afterSource:clone(after.source),
    direction:'after_minus_before',values:Object.fromEntries(summaryKeys.map(key=>{
      const left=before.summary[key],right=after.summary[key];
      return [key,numeric(left)&&numeric(right)?{before:left,after:right,afterMinusBefore:right-left,
        beforePointer:before.summaryPointer+'/'+key,afterPointer:after.summaryPointer+'/'+key}:null];
    })),newRulesExecution:false,strategyApproved:false,
    instruction:'Exact differences between two audited roster candidates, not combat losses, a chosen replacement, or proof of strategic value. Negative means the after candidate has/spends less; null means unavailable, never zero.'};
}

export function projectRosterBuilderCandidateFactsV1({value,evidenceNumber,artifactRef,constraintDiagnostics=null,diagnosticSource=null}){
  const receipt=value?.receipt,candidate=value?.request?.candidateInput;
  if(value?.operation!=='builder_audit'||value.status!=='completed'||!candidate
    ||!['legal','illegal'].includes(receipt?.status))return null;
  const budget=receipt.audit?.armyResourceBudgetResult;
  const slots=budget?.armySlotAuditResult??(constraintDiagnostics?.constraintKind==='army_slot_capacity'?constraintDiagnostics:null);
  const pick=(row,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(row,k)).map(k=>[k,clone(row[k])]));
  const numericFacts=projectRosterBuilderAuditNumericFactsV1({value,evidence:{number:evidenceNumber,artifactRef}});
  return {version:2,source:{evidenceNumber,artifactRef,candidatePointer:'/request/candidateInput',
      budgetPointer:budget?'/receipt/audit/armyResourceBudgetResult':null,diagnosticSource:clone(diagnosticSource)},
    candidateInput:clone(candidate),status:receipt.status,
    budget:projectBudget(budget),
    units:budget?budget.unitRows.map(unit=>({...pick(unit,['unitInstanceId','recordKey','unitName','compositionKind','startingModels','startingSupply']),
      baseMineralCost:unit.mineralCost,
      upgradeMineralCost:numericFacts?.units?.find(row=>row.unitInstanceId===unit.unitInstanceId)?.upgradeMineralCost??null,
      totalMineralCost:numericFacts?.units?.find(row=>row.unitInstanceId===unit.unitInstanceId)?.totalMineralCost??null,
      upgrades:budget.upgradeRows.filter(upgrade=>upgrade.unitInstanceId===unit.unitInstanceId)
        .map(upgrade=>pick(upgrade,['upgradeName','mineralCost']))})):null,
    cards:budget?budget.tacticalCardRows.map(card=>pick(card,['cardInstanceId','recordKey','cardName','vespeneGasCost','armySlotsAdded'])):null,
    slots:slots?{used:clone(slots.usedArmySlots),capacity:clone(slots.availableArmySlots),
      units:slots.unitRows.map(unit=>pick(unit,['unitInstanceId','recordKey','unitName','compositionKind','armySlotType','occupiedArmySlots']))}:numericFacts?.factGroups.find(g=>g.key==='slots')?.value??null,
    legalAlternativesQuery:receipt.status==='legal'?{operation:'builder_branches',baseEvidenceNumber:evidenceNumber,
      unitsToUpsert:[],unitIdsToRemove:[],tacticalCardEdits:{add:[],remove:[]}}:null,
    autoSelected:false,strategyApproved:false,
    instruction:'Values belong ONLY to this exact candidate. Slot capacity is the TOTAL allowance, not remaining capacity: compare used and capacity. null means this receipt did not return that detail, never zero. Native rejects at the first invalid constraint; another constraint may also fail. legalAlternativesQuery is an available read-only request on this baseline, NOT executed/selected and not proof that a branch is strategically preferable. Choose a branch or explicit edits yourself; a partial legal candidate may be committed together with its preliminary Plan, while final target still applies.'};
}
