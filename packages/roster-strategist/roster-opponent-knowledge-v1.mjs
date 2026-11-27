// Product information boundary. Never derive a blind planning scene from the
// opponent's submitted list. These minimal carriers are public lab fixtures,
// NOT selected armies, likely enemies, or strategic recommendations.
import {validateOfficialFactionRequiredTacticalCardGroupsV1} from '../product-composition/official-faction-army-building-card-requirements-v1.mjs';
export const rosterOpponentIsUnknownV1=setup=>['unknown_roster','unknown','closed_roster'].includes(setup?.opponentInformationBoundary);
export function rosterOpponentKnowledgeV1(setup,{explicitHypothesis=false}={}){
 return {schema:'roster_opponent_knowledge_v1',actualRosterKnown:false,
  knownFactionRecordKey:setup.opponentFactionRecordKey,actualRoster:null,
  laboratoryOpponent:explicitHypothesis?'model_selected_hypothesis':'public_minimal_carrier',
  instruction:'Only the opponent faction is known. NO actual opponent units, counts, upgrades or cards were supplied. Laboratory pieces are independent hypothetical test subjects, NOT a prediction or the opponent list. The minimal public carrier is not a recommended army or target distribution. Use public faction/unit rules for possibilities; label counter plans conditional. To measure a specific combination, explicitly select opponentCandidateInput in candidate_context; Native audits it. Report results ONLY for that hypothesis, never as observed enemy facts. Do not require learning the hidden list to finish a contingent Plan. Formal own army choices remain model-owned.'};
}
export function createPublicRosterLaboratoryCarrierV1({builderPort,dataset,sideKey,factionRecordKey,scaleId='Standard',mineralBudget=2000}){
 const menu=builderPort.enumerateArmyBuildingChoices({factionRecordKey,scaleId,mineralBudget});
 const options=menu.unitCandidates.flatMap(u=>u.compositionOptions.map(c=>({u,c})))
  .sort((a,b)=>a.c.mineralCost-b.c.mineralCost||a.u.recordKey.localeCompare(b.u.recordKey)||a.c.compositionKind.localeCompare(b.c.compositionKind));
 const cardSets=[[],...menu.tacticalCandidates.map(c=>[c.recordKey])];
 for(const cards of cardSets){
  try{validateOfficialFactionRequiredTacticalCardGroupsV1({dataset,factionRecordKey,selectedTacticalCardRecordKeys:cards});}catch{continue;}
  for(const {u,c} of options){
   const candidate={sideKey,factionRecordKey,scaleId,mineralBudget,tacticalCardRecordKeys:cards,
    units:[{unitInstanceId:'public_lab_'+sideKey,recordKey:u.recordKey,compositionKind:c.compositionKind,upgrades:[]}]};
   if(builderPort.evaluateRosterCandidate(candidate).status==='legal')return candidate;
  }
 }
 throw Object.assign(Error('ROSTER_PUBLIC_LABORATORY_CARRIER_UNAVAILABLE'),{code:'ROSTER_PUBLIC_LABORATORY_CARRIER_UNAVAILABLE',detail:{factionRecordKey,scaleId,mineralBudget}});
}

// Prefer machine-owned source evidence over legacy journey labels. A historical
// record can carry the selected enemy list through its cited original artifacts.
export function rosterImportedExperienceHasFrozenOpponentV1(value){
  if(value?.schema!=='roster_imported_conditional_experience_v1')return false;
  const pending=(value.sourceArtifacts??[]).map(row=>row.value);
  while(pending.length){
    const body=pending.pop();
    if(!body||typeof body!=='object')continue;
    if(body.schema==='roster_opponent_knowledge_v1'&&body.actualRosterKnown===true)return true;
    if(body.schema==='roster_participant_source_v2'
      &&(body.opponentKnowledge?.actualRosterKnown===true
        ||Array.isArray(body.units)&&body.units.some(unit=>unit.sourceKind==='frozen_reference_recipe')))return true;
    for(const child of Object.values(body))if(child&&typeof child==='object')pending.push(child);
  }
  return false;
}

const knownReviewQuestion = "Opponent assumptions, credible counterplay and own responses agree with the configured frozen reference army and use real abilities, costs, timing and disconfirmation conditions. Known selected composition is a current input, not a future uncertainty; distinguish it from future deployment/actions and explicitly optional counterfactual opponents.";
const blindReviewQuestion = 'The actual enemy roster was withheld. Check that matchup hypotheses and counters use public faction rules or explicitly identified laboratory hypotheses. Check real abilities, costs, timing and disconfirmation conditions. Do not treat the laboratory carrier as a selected enemy or demand the actual roster.';

export function rosterReviewOpponentContextV1(sourceEvidenceId, source) {
  const base = {version: 1, sourceEvidenceId};
  if (source?.schema !== 'roster_participant_source_v2') {
    return {...base, knownReferenceRequired: null,
      instruction: 'Use only the opponent information authorized by the delivered participant source. If that source is unavailable, do not infer a selected enemy or require a hidden roster.'};
  }
  const declared = source.opponentKnowledge?.actualRosterKnown;
  if (declared === true || (declared !== false && Array.isArray(source.units) && source.units.some(unit => unit.sourceKind === 'frozen_reference_recipe'))) {
    return {...base, knownReferenceRequired: true,
      instruction: "The supplied frozen participant source is the KNOWN experimental reference used by this Plan and its tools. Check current opponent hypotheses and counters against its exact selected units, compositions and upgrades; do not classify those known selections as future_condition. Future actions, deployment and outcomes remain conditional. Other hypothetical armies must be explicitly outside this reference, not a substitute for explaining the configured matchup. A missing/currently unavailable source is a factual gap. This input does not choose tactics, force a roster change or approve measured superiority."};
  }
  return {...base, knownReferenceRequired: false, instruction: blindReviewQuestion};
}

export function projectRosterReviewOpponentContextV1(assignment) {
  const {inputs} = assignment;
  const assigned = inputs.opponentContextContract;
  if (assignment.role !== 'roster_workflow_final_review' || !assigned?.value) return assignment;
  const participants = inputs.frozenParticipantSource;
  const sourceEvidenceId = assigned.value.sourceEvidenceId;
  const source = participants?.status === 'read' && participants.evidenceId === sourceEvidenceId
    ? participants.value : null;
  const context = rosterReviewOpponentContextV1(sourceEvidenceId, source);
  const question = context.knownReferenceRequired === true ? knownReviewQuestion
    : context.knownReferenceRequired === false ? blindReviewQuestion : context.instruction;
  const projected = {...inputs, opponentContextContract: {...assigned, value: context}};
  if (inputs.review?.value?.domainId === 'opponent_and_counters') {
    for (const key of ['review', 'reviewScope']) {
      const block = inputs[key];
      if (!block?.value?.obligations) continue;
      const obligations = block.value.obligations.map(obligation => {
        if (obligation.checkId !== 'opponent_and_counters') return obligation;
        return {...obligation, question, ...(obligation.originalQuestionContext ? {originalQuestionContext: question} : {})};
      });
      projected[key] = {...block, value: {...block.value, obligations}};
    }
  }
  return {...assignment, inputs: projected};
}
