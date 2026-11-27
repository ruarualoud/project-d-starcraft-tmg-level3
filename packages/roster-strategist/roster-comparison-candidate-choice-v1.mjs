// Method roles select an authored arm. They do not re-author its loadout, price,
// authority or scene identity. Candidate legality is still the Native Builder's job.
import {isDeepStrictEqual} from 'node:util';
import {normalizeRosterParticipantSelectionV1} from './roster-participant-configuration-v1.mjs';
const clone=structuredClone;
const opponentCardsField='opponentTacticalCardRecordKeys';
export function rosterComparisonCandidateChoicesV1(request){
 const inputs=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
 const current=inputs?.currentArmyConfiguration,purpose=inputs?.comparisonPurpose;
 if(current?.status!=='read'||purpose?.status!=='read')return [];
 const candidate=current.value,arms=purpose.value?.participantConfigurationsByArm;
 if(!Array.isArray(candidate?.units)||!Array.isArray(arms?.current)||!Array.isArray(arms?.alternative))return [];
 const ownIds=new Set(candidate.units.map(u=>u.unitInstanceId));
 const ownCurrent=arms.current.filter(u=>ownIds.has(u.unitInstanceId));
 const other=arms.current.filter(u=>!ownIds.has(u.unitInstanceId));
 // A different opponent configuration requires a different context mechanism;
 // never silently put enemy units in this player's roster or infer ownership by name.
 if(!ownCurrent.length||other.some(u=>!arms.alternative.some(v=>isDeepStrictEqual(u,v))))return [];
 const otherIds=new Set(other.map(u=>u.unitInstanceId));
 const ownAlternative=arms.alternative.filter(u=>!otherIds.has(u.unitInstanceId));
 if(!ownAlternative.length||new Set(ownAlternative.map(u=>u.unitInstanceId)).size!==ownAlternative.length)return [];
 const replacedIds=new Set(ownCurrent.map(u=>u.unitInstanceId));
 // Do not overwrite an unrelated existing unit merely because a proposed ID collides.
 if(ownAlternative.some(u=>ownIds.has(u.unitInstanceId)&&!replacedIds.has(u.unitInstanceId)))return [];
 const alternative={...clone(candidate),units:[...candidate.units.filter(u=>!replacedIds.has(u.unitInstanceId)).map(u=>clone(u)),
   ...ownAlternative.map(normalizeRosterParticipantSelectionV1)]};
 const provenance={candidateEvidenceId:current.evidenceId,purposeEvidenceId:purpose.evidenceId,
   sourceApproved:false,nativeLegalityChecked:false};
 const source=inputs.frozenParticipantSource;
 const knowledge=source?.status==='read'?source.value?.opponentKnowledge:null;
 const hypothetical=knowledge?.actualRosterKnown===false&&other.length>0;
 if(hypothetical){
   if(!['player1','player2'].includes(candidate.sideKey)||typeof knowledge.knownFactionRecordKey!=='string'
     ||!knowledge.knownFactionRecordKey)return [];
   // State identity, faction, scope and units come from the delivered sources.
   // Only the method's explicit hypothesis about cards is still selectable.
   provenance.opponentHypothesis={sideKey:candidate.sideKey==='player1'?'player2':'player1',
     factionRecordKey:knowledge.knownFactionRecordKey,scaleId:candidate.scaleId,
     mineralBudget:candidate.mineralBudget,units:other.map(normalizeRosterParticipantSelectionV1)};
 }
 return [{choiceId:'comparison-current',arm:'current',candidateInput:clone(candidate),removedUnitIds:[],selectedUnitIds:ownCurrent.map(u=>u.unitInstanceId),...provenance},
   {choiceId:'comparison-alternative',arm:'alternative',candidateInput:alternative,removedUnitIds:[...replacedIds],selectedUnitIds:ownAlternative.map(u=>u.unitInstanceId),...provenance}];
}
export function rosterComparisonCandidateStepSchemaV1(schema,choices){
 if(!choices.length)return clone(schema);
 if(schema.anyOf)return {...clone(schema),anyOf:schema.anyOf.flatMap(s=>{const m=rosterComparisonCandidateStepSchemaV1(s,choices);return m.anyOf??[m];})};
 const operations=schema.properties?.operation?.enum;
 if(!operations?.includes('candidate_context'))return clone(schema);
 const selected=clone(schema);
 for(const k of ['argumentsJson','bindings']){delete selected.properties[k];selected.required=selected.required.filter(n=>n!==k);}
 selected.properties.operation.enum=['candidate_context'];
 selected.properties.kind={type:'string',minLength:1,maxLength:64,enum:['comparison_candidate']};
 selected.properties.candidateChoiceId={type:'string',minLength:1,maxLength:128,enum:choices.map(c=>c.choiceId)};
 selected.required=[...new Set([...selected.required,'kind','candidateChoiceId'])];
 if(choices.some(c=>c.opponentHypothesis)){
   selected.properties[opponentCardsField]={type:'array',minItems:0,maxItems:64,
     items:{type:'string',minLength:1,maxLength:65536},
     description:'Explicit tactical cards for this declared hypothetical opponent. [] selects no cards. For both arms choose the same cards and reuse the shared candidate when the own army also matches. Host fills players, known faction, scope and the designed units. Native checks the full selection.'};
   selected.required.push(opponentCardsField);
 }
 if(operations.length===1)return selected;
 const other=clone(schema);other.properties.operation.enum=operations.filter(o=>o!=='candidate_context');
 return {anyOf:[other,selected]};
}
export function projectRosterComparisonCandidateStepV1(step,choices){
 if(step.operation!=='candidate_context'||!choices.length)return {step:clone(step),projection:[],errors:[]};
 const selected=choices.find(c=>c.choiceId===step.candidateChoiceId);
 if(!selected||step.kind!=='comparison_candidate'||Object.hasOwn(step,'argumentsJson')||Object.hasOwn(step,'bindings'))
   return {step:null,projection:[],errors:[{code:'comparison_candidate_choice_required',stepId:step.stepId}]};
 const cards=step[opponentCardsField];
 const hasCards=Object.hasOwn(step,opponentCardsField);
 if(selected.opponentHypothesis?(!Array.isArray(cards)||cards.length>64
   ||cards.some(card=>typeof card!=='string'||!card.trim())||new Set(cards).size!==cards.length):hasCards)
   return {step:null,projection:[],errors:[{code:selected.opponentHypothesis?'comparison_hypothetical_opponent_cards_required'
     :'comparison_frozen_opponent_override_forbidden',stepId:step.stepId}]};
 const {kind,candidateChoiceId,[opponentCardsField]:selectedCards,...rest}=step;
 const args={candidateInput:clone(selected.candidateInput)};
 if(selected.opponentHypothesis)args.opponentCandidateInput={...clone(selected.opponentHypothesis),tacticalCardRecordKeys:clone(selectedCards)};
 return {step:{...clone(rest),argumentsJson:JSON.stringify(args),bindings:[]},errors:[],
   projection:[{rule:'host_assembled_author_selected_comparison_candidate_v1',stepId:step.stepId,choiceId:selected.choiceId,
     candidateEvidenceId:selected.candidateEvidenceId,purposeEvidenceId:selected.purposeEvidenceId,
     ...(selected.opponentHypothesis?{opponentHypothesisBound:true,actualOpponentRosterKnown:false}:{}),
     nativeExecuted:false,sourceApproved:false}]};
}
export const ROSTER_COMPARISON_CANDIDATE_INSTRUCTION_V1='For candidate_context use kind="comparison_candidate" and candidateChoiceId from comparisonCandidateChoices. The Host copies that authored arm onto the current roster, preserving all unrelated units, cards and budget. When opponentHypothesis is shown, supply opponentTacticalCardRecordKeys explicitly ([] means no cards); Host binds the already designed opponent units and Native audits them. A frozen known opponent may not have that field. Do not provide argumentsJson, bindings, stateRef or retype upgrades. This operation is a private candidate creation plus Native roster audit, not a combat state or an accepted roster edit. Its returned stateRef can feed a later explicitly selected prior_step scene; place and inspect that resulting scene before selecting attacks. A failed Native audit returns to the candidate owner; this method role may not change the authored composition or assume equal cost. No choice is made automatically.';

// Remove only empty placeholders for fields owned by the selected-arm compiler.
// Nonempty candidate data/bindings stay invalid; no ordering or choice is inferred.
export function projectRosterEmptyCandidateFieldsV1(output){
 const value=clone(output),projection=[];
 const visit=(node,path)=>{if(!node||typeof node!=='object')return;
  if(!Array.isArray(node)&&node.kind==='comparison_candidate'&&node.operation==='candidate_context'
    &&typeof node.candidateChoiceId==='string'&&node.candidateChoiceId.length){
    let emptyArguments=typeof node.argumentsJson==='string'&&node.argumentsJson.trim()==='';
    if(!emptyArguments&&typeof node.argumentsJson==='string')try{const parsed=JSON.parse(node.argumentsJson);
      emptyArguments=parsed!==null&&!Array.isArray(parsed)&&typeof parsed==='object'&&Object.keys(parsed).length===0;}catch{}
    for(const key of ['argumentsJson','bindings'])if(key==='argumentsJson'?emptyArguments:Array.isArray(node.bindings)&&node.bindings.length===0){
      projection.push({rule:'empty_host_owned_candidate_field_v1',path:path+'/'+key,value:clone(node[key]),
        candidateChoiceId:node.candidateChoiceId,choiceChanged:false,sourceApproved:false});delete node[key];
    }
  }
  for(const [key,child]of Object.entries(node))visit(child,path+'/'+key.replaceAll('~','~0').replaceAll('/','~1'));
 };visit(value,'');return {output:value,projection};
}
