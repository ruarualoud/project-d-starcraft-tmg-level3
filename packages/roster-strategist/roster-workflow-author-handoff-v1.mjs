import {projectRosterStrategyRepairOutputV1,rosterStrategyRepairNodeV1,rosterStrategyOriginalResponseFormatV1} from './roster-workflow-semantic-repair-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';

// One owner transition, shared by live execution and cold product resume. It is
// NOT approval, a correction retry grant, a model reply or a Plan mutation.
export async function projectRosterAuthorDecisionHandoffV1({role,operation,store}){
  const correction=operation?.correction;
  if(role!=='roster_workflow_strategy_decision'||operation.pending||operation.authorDecisionHandoff
    ||!correction?.errors?.length||!correction.errors.every(e=>e.code==='author_choice_requires_author_action'))return null;
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
  if(!questions?.some(q=>q.classification==='author_decision')
    ||questions.some(q=>q.classification==='necessary_fact'))return null;
  const pending=questions.filter(q=>q.classification==='author_decision').map(q=>q.question).sort();
  const flagged=correction.errors.flatMap(e=>e.questions??[]).sort();
  if(JSON.stringify(pending)!==JSON.stringify(flagged))return null;
  return {kind:'strategy_author_handoff',version:1,phase:'awaiting_owner_decision',
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
  'Only the strategic decision maker can use decided_here: YOU explicitly decide NOW about THIS question after comparing evidence. State the concrete chosen action, conditions, trade-off and reason in this question publicReason and cite the relevant read evidence. It is not an old saved Plan declaration (authored_choice), not a missing fact, not a promise that somebody else will decide, and not an applied edit or acceptance. Valid with retain, revise OR investigate: disposition selects the NEXT operation, not whether every other question is settled. A supported local choice can remain decided_here while you choose investigate for DIFFERENT necessary_fact questions using nextInvestigation. Do not call that next operation retain or delete the pending facts merely to preserve a choice. A change to saved intent still requires the actual structured mutation and strategicChanges. Use author_decision for choices genuinely still pending and necessary_fact for external facts still required. Neither can be silently erased. Independent review still checks your reasons and sources.';

export function rosterDecidedHereErrorsV1(decision){
  const questions=decision.dataQuestions?.filter(q=>q.classification==='decided_here')??[];
  return questions.flatMap(q=>!['retain','revise','investigate'].includes(decision.disposition)||!q.evidenceNumbers?.length
    ?[{code:'decided_here_requires_explicit_owner_decision',question:q.question,instruction:ROSTER_DECIDED_HERE_INSTRUCTION_V1}]:[]);
}
