import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterExperimentOperationCommandV1} from './roster-experiment-operation-command-v1.mjs';
import {projectRosterWorkOrderEditCommandV1} from './roster-work-order-edit-command-v1.mjs';

// Source/role-neutral recovery policy; keep the role runner out of the
// workflow's module-initialization graph.
export const projectRosterHostStepKindRecoveryV1=args=>projectRosterHostReplyRecoveryV1({...args,
  projectionRule:'host_step_kind_from_unique_schema_v1',historyField:'hostStepKindRecoveryHistory',
  kind:'host_step_kind_v1',repairKind:'host_step_kind'});
export const projectRosterSavedProposalRecoveryV1=args=>projectRosterHostReplyRecoveryV1({...args,
  projectionRule:'host_saved_proposal_confirmation_v1',historyField:'hostProposalRecoveryHistory',
  kind:'host_saved_proposal_v1',repairKind:'saved_proposal_echo'});
async function projectRosterHostReplyRecoveryV1({state,work,readArtifact,projectionRule,historyField,kind,repairKind}){
  const op=work?.operationState,errors=op?.correction?.errors??[],last=op?.calls?.at(-1);
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||op.pending||op.noProgressStop||!last
    ||op.correction?.originalReplyRef!==last.replyRef||!errors.length
    ||errors.some(e=>!['experiment_operation_command_schema','work_order_edit_schema','operation_step_parameters_invalid'].includes(e.code))
    ||work[historyField]?.some(h=>h.replyRef===last.replyRef))return null;
  const [request,reply]=await Promise.all([readArtifact(last.requestRef),readArtifact(last.replyRef)]);
  const assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(assigned?.workId!==work.id||assigned.role!==work.role
    ||!Object.entries(work.bindings??{}).every(([k,v])=>state.scope?.[k]===v&&assigned.scope?.[k]===v)
    ||reply.receipt?.contextHash!==request.contextHash||hash(reply.receipt)!==hash(last.receipt))return null;
  const mapper=request.promptNodes.some(n=>n.kind==='work_order_edit_command')?projectRosterWorkOrderEditCommandV1
    :request.promptNodes.some(n=>n.kind==='experiment_operation_command')?projectRosterExperimentOperationCommandV1:null;
  if(!mapper)return null;
  const mapped=mapper({request,output:reply.output});
  const projection=mapped.projection.filter(p=>p.rule===projectionRule);
  if(mapped.errors.length||!mapped.output||!projection.length)return null;
  return {kind,repairKind,workId:work.id,
    requestRef:last.requestRef,replyRef:last.replyRef,originalReplyRef:last.replyRef,
    originalResultRef:work.resultRef,projection,
    revalidationKey:hash({kind,requestRef:last.requestRef,replyRef:last.replyRef}),
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false,
    instruction:repairKind==='saved_proposal_echo'
      ?'The exact paid submit_work_orders response repeats the Host-supplied canonical proposal after source delivery. Restore that exact proposal through normal semantics and compiler. Preserve all parameters, bindings, choices, order, unknowns, original replies and fees; do not buy a transport rewrite or approve the experiment.'
      :'Reuse the exact latest paid operation choice. Host derives only step.kind from a unique match of its operation and unchanged semantic fields. Preserve option, source, parameters, sequence, raw reply, counters and fees. The normal method, source, scope and Native checks still run; no new Provider request or automatic strategy approval.'};
}
