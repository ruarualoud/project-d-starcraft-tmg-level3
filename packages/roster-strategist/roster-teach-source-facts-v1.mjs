import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';

// These are existing typed source projections, NOT invented Native receipts.
// The reader and binder share identity/path/scope. Do not index arbitrary model
// narrative or use a shared ability route as a partner-specific fact identity.
const roots=[
  ['/mission',false,'frozen_mission_definition'],
  ['/sourceFacts/roundSupplySchedule',false,'chosen_arrival_schedule_not_unique_legal_or_actual_arrival'],
  ['/sourceFacts/selectionSupportRules',true,'frozen_rule_record_not_observed_opponent_selection'],
  ['/sourceFacts/selectionUnitRules',true,'frozen_rule_record_not_observed_opponent_selection'],
  ['/sourceFacts/selectionRosterUnits',true,'selected_roster_facts_not_action_legality'],
  ['/sourceFacts/rosterUnits',true,'selected_roster_facts_not_action_legality'],
  ['/abilityPartnerConstraints',true,'static_partner_constraint_not_dynamic_eligibility'],
];

export function collectRosterTeachSourceFactsV1(context,{readValue}={}){
  const read=readValue||((path)=>path.slice(1).split('/').reduce((v,k)=>v?.[k],context));
  const facts=[];
  for(const [root,array,scope] of roots){
    const value=read(root);
    const paths=array?(Array.isArray(value)?value.map((_,i)=>`${root}/${i}`):[]):value?[root]:[];
    for(const path of paths){
      const value=read(path);
      if(!value||typeof value!=='object')continue;
      const referenceId=hash({kind:'roster_teach_source_fact_v1',path,value});
      const aliases=[...(path==='/sourceFacts/roundSupplySchedule'&&value.scheduleHash?[value.scheduleHash]:[]),
        ...(/\/selection(?:Support|Unit)Rules\//u.test(path)?[value.referenceId,value.sourceRecordHash].filter(Boolean):[])];
      facts.push({referenceId,citationRef:`source-fact:${referenceId}`,aliases,path,scope,value,
        label:[value.ownerUnitId,value.abilityName,value.partnerUnitId].filter(Boolean).join(' / ')
          ||value.recordKey||value.unitInstanceId||value.id||path,
        notNativeActionReceipt:true,interpretationVerified:false});
    }
  }
  return facts;
}
