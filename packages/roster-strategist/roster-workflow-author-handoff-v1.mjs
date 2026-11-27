import {projectRosterStrategyRepairOutputV1,rosterStrategyRepairNodeV1,rosterStrategyOriginalResponseFormatV1} from './roster-workflow-semantic-repair-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {rosterInvestigationCapabilityErrorV1} from './roster-tool-proof-scope-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {rosterInvestigationScopeContinuityErrorV1} from './roster-investigation-scope-continuity-v1.mjs';

// One owner transition, shared by live execution and cold product resume. It is
// NOT approval, a correction retry grant, a model reply or a Plan mutation.
export async function projectRosterAuthorDecisionHandoffV1({role,operation,store}){
  const correction=operation?.correction;
  const scopeReturn=correction?.errors?.some(e=>e.code==='investigation_same_question_scope_changed')
    &&correction.errors.every(e=>['investigation_same_question_scope_changed','investigation_capability_unsupported'].includes(e.code));
  const capabilityReturn=scopeReturn||correction?.errors?.length===1&&correction.errors[0].code==='investigation_capability_unsupported';
  if(role!=='roster_workflow_strategy_decision'||operation.pending||operation.authorDecisionHandoff
    ||!correction?.errors?.length||!capabilityReturn&&!correction.errors.every(e=>e.code==='author_choice_requires_author_action'))return null;
  const call=operation.calls?.findLast(c=>c.replyRef===correction.originalReplyRef);
  if(!call?.requestRef)return null;
  const [request,reply]=await Promise.all([store.get(call.requestRef),store.get(call.replyRef)]);
  if(request.roundKind!==role||reply.providerFailure)return null;
  const repair=rosterStrategyRepairNodeV1(request);
  const projected=repair?projectRosterStrategyRepairOutputV1({request,output:reply.output}):{output:reply.output,errors:[]};
  const schema=rosterStrategyOriginalResponseFormatV1(request).schema;
  if(projected.errors?.length||!validate(schema,projected.output).ok)return null;
  const output=projected.output;
  if(output.action!=='finish'||output.decisions?.length!==1)return null;
  const decision=output.decisions[0],questions=decision.dataQuestions;
  let capabilityDiagnostic=null,deliveredCapabilityContract=null,scopeDiagnostic=null;
  if(capabilityReturn){
    const contract=request.promptNodes.find(n=>n.kind==='investigation_capability_contract');
    // Only a delivered new return protocol may enter this phase. Old paid
    // requests are not retroactively reclassified or silently re-authorized.
    if(contract?.returnProtocolVersion!==1)return null;
    if(scopeReturn){
      const lineage=request.promptNodes.find(n=>n.kind==='investigation_continuation_contract');
      if(lineage?.proofScopeContinuityVersion!==1)return null;
      scopeDiagnostic=rosterInvestigationScopeContinuityErrorV1(decision,lineage.proofScopeLineage);
      if(!isDeepStrictEqual(scopeDiagnostic,correction.errors.find(e=>e.code==='investigation_same_question_scope_changed')))return null;
    }
    // Scope continuity does not prove tool capability. Compute BOTH from the
    // exact delivered contracts, including old rejected replies whose first
    // diagnostic previously hid the second. Neither proposal is executed.
    capabilityDiagnostic=rosterInvestigationCapabilityErrorV1({decision,contract});
    const recordedCapability=correction.errors.find(e=>e.code==='investigation_capability_unsupported');
    if(recordedCapability&&!isDeepStrictEqual(capabilityDiagnostic,recordedCapability))return null;
    if(!scopeReturn&&!recordedCapability)return null;
    deliveredCapabilityContract=structuredClone(contract);
  }else{
    if(!questions?.some(q=>q.classification==='author_decision')
      ||questions.some(q=>q.classification==='necessary_fact'))return null;
    const pending=questions.filter(q=>q.classification==='author_decision').map(q=>q.question).sort();
    const flagged=correction.errors.flatMap(e=>e.questions??[]).sort();
    if(JSON.stringify(pending)!==JSON.stringify(flagged))return null;
  }
  return {kind:'strategy_author_handoff',version:1,phase:'awaiting_owner_decision',
    ...(capabilityReturn?{reason:capabilityDiagnostic?'proof_capability_unsupported':'proof_scope_changed',
      capabilityDiagnostic,deliveredCapabilityContract,...(scopeDiagnostic?{scopeDiagnostic}:{} )}:{}),
    sourceRequestRef:call.requestRef,sourceReplyRef:call.replyRef,
    questions:structuredClone(questions),previousDecision:structuredClone(decision),
    previousCorrection:structuredClone(correction),startedAtTurn:operation.turn,
    startedAtCallIndex:operation.calls.length,
    previousCounters:{consecutiveCorrections:operation.consecutiveCorrections,
      correctionLimit:operation.correctionLimit??3,evidenceDecisionRequired:operation.evidenceDecisionRequired??false,
      readPreparationReturnRequired:operation.readPreparationReturnRequired??false},
    previousRecovery:structuredClone(operation.correctionRecovery??null),
    factApprovalGranted:false,planApprovalGranted:false,hostAuthoredPlanValues:false};
}

// Keep old delivered evidence, but a pending proposal from the previous role
// phase cannot remain the command template for a fresh owner decision. New
// reads after the handoff still require their normal source confirmation.
export function rosterSourceConfirmationBelongsToCurrentOwnerV1(operation){
  if(!operation.evidenceDelivery)return false;
  const start=operation.authorDecisionHandoff?.startedAtCallIndex;
  if(!Number.isSafeInteger(start))return true;
  const index=operation.calls.findLastIndex(call=>call.replyRef===operation.evidenceDelivery.originalReplyRef);
  // Missing call identity retains the existing explicit engineering error.
  return index<0||index>=start;
}

export function enterRosterAuthorDecisionHandoffV1(operation,handoff){
  if(operation.authorDecisionHandoff||!handoff)throw Error('ROSTER_WORKFLOW_AUTHOR_HANDOFF_INVALID');
  operation.authorDecisionHandoff=structuredClone(handoff);
  operation.correction=null;
  // Start the new OWNER phase's local format counter, retaining the exhausted
  // repair phase verbatim above. A second ownership handoff is prohibited.
  operation.consecutiveCorrections=0;
  operation.correctionLimit=operation.normalCorrectionLimit??3;
  delete operation.correctionRecovery;
  delete operation.evidenceDecisionRequired;
  delete operation.readPreparationReturnRequired;
}

export const ROSTER_DECIDED_HERE_INSTRUCTION_V1=
  'decided_here is YOUR explicit choice NOW, not a measured fact, saved Plan declaration, deferred promise or approval. State the chosen action, conditions, trade-off and public reason. Cite actual read sources for factual premises; an author commitment or task-instruction acknowledgment may have evidenceNumbers=[] when it asserts no external fact. Never add an irrelevant citation to satisfy a count. Output-language/process instructions stay task constraints, not new research questions; if already recorded, preserve and acknowledge them without an experiment. Keep factual answers in answered_fact with actual sources, missing facts in necessary_fact and pending choices in author_decision. Never replace an original delegated factual predicate with a choice. Valid with retain, revise OR investigate: disposition chooses the NEXT operation. A local choice can coexist with nextInvestigation for DIFFERENT necessary facts; do not erase them or mislabel the next operation retain. Changing saved intent still requires structured mutation and strategicChanges. Existing declarations use authored_choice with their current Plan source. Independent source/coverage and final review still check premises, reasons and choices; this structural check approves no fact, strategy or Plan.';

export function rosterDecidedHereErrorsV1(decision){
  const questions=decision.dataQuestions?.filter(q=>q.classification==='decided_here')??[];
  // Choices are authored intent, not measured facts. Requiring a nonempty
  // tool citation for every commitment caused the real Chinese-output promise
  // to exhaust correction attempts. Evidence identity/coverage and factual
  // claims remain checked at their existing, distinct boundaries.
  return questions.flatMap(q=>!['retain','revise','investigate'].includes(decision.disposition)
    ?[{code:'decided_here_requires_explicit_owner_decision',question:q.question,instruction:ROSTER_DECIDED_HERE_INSTRUCTION_V1}]:[]);
}
