import {compactStrategyEntry} from './strategy-prompt-entry-v1.mjs';
import {hash,clone} from '../skill-production/common.mjs';
const need=(v,c)=>{if(!v)throw Error(c)};
const strings=v=>Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==='string'&&x.length>0);
export function postgameSkillPromptContentV1(skill){
  const parts=[];
  if(skill.strategyCategory==='learned_procedure')parts.push({title:skill.title,description:skill.description,
    applicabilityScope:clone(skill.applicabilityScope),procedure:clone(skill.procedure)});
  for(const entry of skill.procedure||[]){const part=compactStrategyEntry(entry);if(Object.keys(part).length)parts.push(part)}
  for(const chapter of skill.knowledge||[])for(const entry of chapter.draft?.recommendations||[])
    parts.push({section:clone(chapter.section||null),recommendation:compactStrategyEntry(entry)});
  return parts;
}
export function bindPostgameOpportunityV1(scope,bundles){
  if(!scope)return undefined;
  const bound=clone(scope),required=bound.requiredCandidateEvidence;
  if(required?.kind==='vista_program'){
    const actual=bundles.candidate.vistaProgram?.programHash;
    need(actual&&(!required.programHash||required.programHash===actual),'POSTGAME_OPPORTUNITY_PROGRAM_CHANGED');
    required.programHash=actual;
  }else if(required?.kind==='memento2_policy'){
    const policy=bundles.candidate.memento2Policy;
    need(policy?.frozenForEvaluation===true&&policy.hash,'POSTGAME_OPPORTUNITY_MEMORY_POLICY_REQUIRED');
    need(!required.policyHash||required.policyHash===policy.hash,'POSTGAME_OPPORTUNITY_MEMORY_POLICY_CHANGED');
    if(required.caseIds)need(strings(required.caseIds)&&required.caseIds.every(id=>policy.cases.some(c=>c.id===id)),'POSTGAME_OPPORTUNITY_MEMORY_CASE_UNKNOWN');
    const cases=policy.cases.filter(c=>!required.caseIds||required.caseIds.includes(c.id));
    const expected=Object.fromEntries(cases.map(c=>[c.id,hash(c)]));
    need(!required.caseContentHashes||hash(required.caseContentHashes)===hash(expected),'POSTGAME_OPPORTUNITY_MEMORY_CONTENT_CHANGED');
    required.policyHash=policy.hash;required.caseContentHashes=expected;
  }else if(required?.kind==='skill_content'&&!required.contentHashes){
    const skill=bundles.candidate.entries.find(e=>e.skill.skillId===required.skillId)?.skill;
    const old=bundles.baseline.entries.find(e=>e.skill.skillId===required.skillId)?.skill;
    need(skill,'POSTGAME_OPPORTUNITY_SKILL_INVALID');
    const previous=new Set((old?postgameSkillPromptContentV1(old):[]).map(hash));
    required.contentHashes=postgameSkillPromptContentV1(skill).map(hash).filter(h=>!previous.has(h));
    need(required.contentHashes.length,'POSTGAME_OPPORTUNITY_NO_CHANGED_CONTENT');
  }
  assertPostgameOpportunityV1(bound,bundles.candidate);return bound;
}
export function assertPostgameOpportunityV1(scope,bundle){
  if(!scope)return;
  const allPlannerChoices=scope.decisionScope==='all_planner_choices_v1';
  need(scope.schemaVersion==='postgame_strategy_opportunity_v1'
    &&Number.isSafeInteger(scope.minimumDecisions)&&scope.minimumDecisions>0,'POSTGAME_OPPORTUNITY_INVALID');
  // A VISTA programme governs the whole Planner; do not impose a tactical topic
  // just to measure its delivery. Narrow Skill/case tests retain their scope.
  if(allPlannerChoices)need(scope.requiredCandidateEvidence?.kind==='vista_program'
    &&!scope.phases&&!scope.actionTypes&&!scope.unitIds&&!scope.targetIds,'POSTGAME_OPPORTUNITY_PROGRAM_SCOPE_INVALID');
  else need(!scope.decisionScope&&strings(scope.phases)&&strings(scope.actionTypes),'POSTGAME_OPPORTUNITY_INVALID');
  for(const key of ['unitIds','targetIds'])if(scope[key])need(strings(scope[key]),'POSTGAME_OPPORTUNITY_INVALID');
  const required=scope.requiredCandidateEvidence;
  // Optional for diagnosis; absence cannot support a strategy-improvement claim.
  if(!required)return;
  if(required.kind==='vista_program')need(required.programHash===bundle.vistaProgram?.programHash,'POSTGAME_OPPORTUNITY_PROGRAM_CHANGED');
  else if(required.kind==='memento2_policy'){
    const policy=bundle.memento2Policy;
    need(policy?.frozenForEvaluation===true&&required.policyHash===policy.hash,'POSTGAME_OPPORTUNITY_MEMORY_POLICY_CHANGED');
    if(required.caseIds)need(strings(required.caseIds)&&required.caseIds.every(id=>policy.cases.some(c=>c.id===id)),'POSTGAME_OPPORTUNITY_MEMORY_CASE_UNKNOWN');
    const expected=Object.fromEntries(policy.cases.filter(c=>!required.caseIds||required.caseIds.includes(c.id)).map(c=>[c.id,hash(c)]));
    need(required.caseContentHashes&&hash(required.caseContentHashes)===hash(expected),'POSTGAME_OPPORTUNITY_MEMORY_CONTENT_CHANGED');
  }
  else if(required.kind==='skill_content'){
    const skill=bundle.entries.find(e=>e.skill.skillId===required.skillId)?.skill;
    need(skill&&strings(required.contentHashes),'POSTGAME_OPPORTUNITY_SKILL_INVALID');
    const available=new Set(postgameSkillPromptContentV1(skill).map(hash));
    need(required.contentHashes.every(h=>available.has(h)),'POSTGAME_OPPORTUNITY_CONTENT_CHANGED');
  }else throw Error('POSTGAME_OPPORTUNITY_DELIVERY_KIND_UNSUPPORTED');
}
// Capture what was actually assembled for this Planner. Full text remains in
// the normal prompt store; this observer saves only identities and semantic menu.
export function projectPostgameDecisionExposureV1(artifact){
  const node=id=>artifact.nodes?.find(n=>n.nodeId===id)?.content;
  if(node('agent-stage')?.stage!=='planning')return null;
  const room=node('player-room-projection'),life=node('round-phase-lifecycle'),index=node('current-action-index');
  if(!room?.room?.stateHash||!index?.authority)return null;
  need(index.authority.stateHash===room.room.stateHash,'POSTGAME_EXPOSURE_STATE_MISMATCH');
  const snapshot=node('strategy-skill-snapshot')?.snapshot;
  const chunks=[],memory=[];
  function scan(v,sourceScope){
    if(!v||typeof v!=='object')return;
    sourceScope=v.scope?.roomId?v.scope:sourceScope;
    const retrieved=v.learnedRetrieval;
    if(retrieved?.source==='frozen_memento2_retrieval'&&typeof retrieved.policyHash==='string'
      &&retrieved.stateHash===room.room.stateHash&&sourceScope?.roomId===room.room.roomId
      &&sourceScope?.seatKey===room.viewer.seatKey&&Object.hasOwn(retrieved,'case')
      &&(retrieved.case===null||retrieved.case&&typeof retrieved.case.id==='string')){
      memory.push({policyHash:retrieved.policyHash,stateHash:retrieved.stateHash,
        selection:retrieved.case===null?'no_retrieval':'case',caseId:retrieved.case?.id||null,
        caseContentHash:retrieved.case===null?null:hash(retrieved.case)});
    }
    if(typeof v.skillId==='string'){
      const content=(v.retrievedProcedure||[]).filter(p=>p&&typeof p==='object'&&Object.keys(p).length);
      if(v.proceduralSkill)content.push(v.proceduralSkill);
      for(const chapter of v.retrievedKnowledge||[])for(const recommendation of chapter.recommendations||[])
        content.push({section:chapter.section||null,recommendation});
      // Actual retrieve_strategy_skill replies use an excerpt, not a full Skill.
      if(v.strategy)content.push(v.section?{section:v.section,recommendation:v.strategy}:v.strategy);
      for(const entry of content)chunks.push({skillId:v.skillId,contentHash:hash(entry)});
    }
    for(const child of Object.values(v))if(child&&typeof child==='object')scan(child,sourceScope);
  }
  scan(node('strategy-skill-snapshot'));scan(node('current-query-receipts'));
  for(const message of artifact.agentLoop?.continuationMessages||[])if(message.role==='tool'&&typeof message.content==='string'){
    try{scan(JSON.parse(message.content))}catch{} // Not JSON is not evidence of Skill delivery.
  }
  const option=e=>({id:e.candidateId||e.domainId,actionType:e.actionType,pieceId:e.pieceId||null,
    targetIds:e.parameterContract?.targetUnitIds||e.targetUnitIds||(e.targetId?[e.targetId]:[]),
    availability:e.domainId?'parameter_domain_requires_exact_instantiation':'finite_legal_candidate'});
  return {schemaVersion:'postgame_decision_exposure_v1',promptHash:artifact.promptArtifactHash,
    stateHash:room.room.stateHash,stateRevision:room.room.stateRevision,seat:room.viewer.seatKey,
    phase:life?.currentPhase,round:life?.currentRound,ownFaction:snapshot?.ownFaction,opponentFaction:snapshot?.opponentFaction,
    options:[...(index.finiteActions||[]),...(index.parameterDomains||[])].map(option),
    deliveredContent:[...new Map(chunks.map(c=>[c.skillId+':'+c.contentHash,c])).values()],
    deliveredMemoryPolicies:[...new Map(memory.map(m=>[hash(m),m])).values()],
    programHash:node('frozen-strategy-harness')?.programHash||null,
    scope:'actual_planner_input_not_proof_of_parameterized_geometry_or_model_understanding'};
}
export function assessPostgameStrategyCoverageV1(scope,baseline,candidate){
  if(!scope)return {status:'unregistered',reason:'No preregistered strategy opportunity; execution-only evidence.'};
  function matches(exposure){
    const allPlannerChoices=scope.decisionScope==='all_planner_choices_v1';
    return (allPlannerChoices||scope.phases.includes(exposure.phase))
      &&(!scope.ownFaction||scope.ownFaction===exposure.ownFaction)
      &&(!scope.opponentFaction||scope.opponentFaction===exposure.opponentFaction)
      &&exposure.options.some(o=>allPlannerChoices||(scope.actionTypes.includes(o.actionType)
        &&(!scope.unitIds||scope.unitIds.includes(o.pieceId))
        &&(!scope.targetIds||o.targetIds.some(t=>scope.targetIds.includes(t)))));
  }
  const relevant=result=>{
    const byState=new Map();
    for(const x of result.decisionExposures||[]){if(x.seat!==result.subjectSeat||!matches(x))continue;
      const old=byState.get(x.stateHash);
      byState.set(x.stateHash,{...x,programHash:x.programHash||old?.programHash,
        deliveredMemoryPolicies:[...new Map([...(old?.deliveredMemoryPolicies||[]),...(x.deliveredMemoryPolicies||[])].map(m=>[hash(m),m])).values()],
        deliveredContent:[...new Map([...(old?.deliveredContent||[]),...(x.deliveredContent||[])].map(c=>[c.skillId+':'+c.contentHash,c])).values()]});}
    return [...byState.values()];
  };
  const a=relevant(baseline),b=relevant(candidate),required=scope.requiredCandidateEvidence;
  const memoryMatches=m=>m.policyHash===required?.policyHash
    &&(m.selection==='no_retrieval'?!required.caseIds
      :m.selection==='case'&&Object.hasOwn(required.caseContentHashes||{},m.caseId)&&required.caseContentHashes[m.caseId]===m.caseContentHash);
  const delivered=b.filter(x=>required?.kind==='memento2_policy'?(x.deliveredMemoryPolicies||[]).some(memoryMatches)
    :required?.kind==='vista_program'?x.programHash===required.programHash
    :required?.kind==='skill_content'?required.contentHashes.every(h=>x.deliveredContent.some(c=>c.skillId===required.skillId&&c.contentHash===h)):false);
  return {status:a.length>=scope.minimumDecisions&&b.length>=scope.minimumDecisions&&delivered.length>=scope.minimumDecisions?'covered':'not_covered',
    baselineOpportunities:a.length,candidateOpportunities:b.length,candidateDeliveryOpportunities:delivered.length,
    requiredDecisions:scope.minimumDecisions,candidateDeliverySpecified:Boolean(required),
    ...(required?.kind==='memento2_policy'?{
      candidateExperienceDeliveryOpportunities:delivered.filter(x=>x.deliveredMemoryPolicies.some(m=>memoryMatches(m)&&m.selection==='case')).length,
      candidateNoRetrievalOpportunities:delivered.filter(x=>x.deliveredMemoryPolicies.some(m=>memoryMatches(m)&&m.selection==='no_retrieval')).length,
      memoryInterpretation:'A delivered VOID choice proves the retriever was used, not that any experience was read. Targeted case tests require actual case content.'}:{}),
    baselineStateHashes:a.map(x=>x.stateHash),candidateStateHashes:b.map(x=>x.stateHash),
    scope:clone(scope),interpretation:'Offered choices and delivered policy, not proof that the model understood or obeyed it; choosing another action is allowed.'};
}
