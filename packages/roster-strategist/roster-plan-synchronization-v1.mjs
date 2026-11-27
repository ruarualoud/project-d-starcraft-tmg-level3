// One current-roster context for every author and factual review consumer.
// Native owns quantities; authors own tactics and Plan text.
import {isDeepStrictEqual as equal} from 'node:util';
import {projectRosterBuilderAuditNumericFactsV1} from './roster-builder-candidate-facts-v1.mjs';
export const ROSTER_PLAN_FACT_SECTIONS_V1=Object.freeze(['publicSummaryText','componentPurposes','scoreRoute','deploymentConcept','lossResourceBudget','opponentHypotheses','counterResponses','invalidationTriggers']);
const copy=structuredClone;
export function projectRosterPlanTextLeavesV1(value,pointer='',boundComponent=null){
 if(typeof value==='string')return [{text:value,pointer,component:boundComponent}];
 if(!value||typeof value!=='object')return [];
 const component=value.componentKind?value:boundComponent;
 return Object.entries(value).flatMap(([key,child])=>{
  const next=pointer+'/'+key.replaceAll('~','~0').replaceAll('/','~1');
  if(typeof child==='string')return /Text$|^publicReason$/u.test(key)?[{text:child,pointer:next,component}]:[];
  return child&&typeof child==='object'?projectRosterPlanTextLeavesV1(child,next,component):[];
 });
}
export function createRosterPlanImpactV1({before,after,verdict,revision,changedSections}){
 const old=new Map(before.units.map(u=>[u.unitInstanceId,u])),next=new Map(after.units.map(u=>[u.unitInstanceId,u]));
 const unitChanges=[...new Set([...old.keys(),...next.keys()])].flatMap(id=>equal(old.get(id),next.get(id))?[]:[{unitInstanceId:id,kind:!old.has(id)?'added':!next.has(id)?'removed':'changed',before:copy(old.get(id)??null),after:copy(next.get(id)??null)}]);
 const cardChanges=equal(before.tacticalCardRecordKeys,after.tacticalCardRecordKeys)?null:{before:copy(before.tacticalCardRecordKeys),after:copy(after.tacticalCardRecordKeys)};
 return {version:1,rosterChangedAtRevision:revision,unitChanges,cardChanges,affectedSections:[...ROSTER_PLAN_FACT_SECTIONS_V1],sectionsChangedInCommit:copy(changedSections),strategyImprovementProven:false};
}
export function projectRosterPlanSynchronizationV1(draft){
 const planned=new Set((draft.plan?.deploymentConcept?.activationOrder??[]).map(x=>x.unitInstanceId));
 return {version:1,draftRevision:draft.revision,rosterRevision:draft.rosterRevision,
  currentNativeFacts:copy(draft.planSynchronization?.currentNativeFacts??null),
  lastRosterChange:copy(draft.planSynchronization?.lastRosterChange??null),
  unitsWithoutExplicitActivation:(draft.candidateInput.units??[]).filter(u=>!planned.has(u.unitInstanceId)).map(u=>({unitInstanceId:u.unitInstanceId,recordKey:u.recordKey})),
  phase:'pregame_plan_authoring',
  instruction:'Use the CURRENT Native inventory and exact roster changes, not old prose counts or old construction shortfalls. Update affected purposes, deployment, reinforcement, activation, loss consequences and counters together; retaining a section does not certify its factual consistency. A partial activation order is allowed: explain omitted units as conditional/deferred roles rather than implying all units are scheduled. In-match replan changes actions of the locked roster; purchasing/replacing units or upgrades is a next-roster proposal, not an in-match remedy. Keep conditional strategy and uncertainty honest. Host does not rewrite prose or force a new tactic.'};
}
export function updateRosterPlanSynchronizationV1({draft,candidate,verdict,revision,armyChanged,changedSections}){
 const facts=projectRosterBuilderAuditNumericFactsV1({value:verdict,evidence:{id:'draft:r'+revision+':builder',validity:'current'}});
 return {version:1,currentNativeFacts:facts,
  lastRosterChange:armyChanged?createRosterPlanImpactV1({before:draft.candidateInput,after:candidate,verdict,revision,changedSections}):copy(draft.planSynchronization?.lastRosterChange??null)};
}
