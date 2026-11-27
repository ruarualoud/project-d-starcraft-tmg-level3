// Explicit recovery after an actual tool Interface revision. Never a semantic retry quota reset.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {createRosterExperimentOwnerContinuationV1} from './roster-workflow-experiment-owner-v1.mjs';
const copy=structuredClone;
export async function reconsiderRosterMethodContractV1({workflow,store,descriptor,workId,expectedResultRef,operation,reason,requirements}){
 const reject=()=>{throw Object.assign(Error('ROSTER_METHOD_CONTRACT_RECONSIDERATION_INVALID'),{code:'ROSTER_METHOD_CONTRACT_RECONSIDERATION_INVALID'});};
 const state=await workflow.inspect(),owner=state.work.find(w=>w.id===workId),graph=createRosterWorkflowGraphV1(state);
 if(!reason?.trim()||owner?.role!=='roster_workflow_experiment_planner'||owner.status!=='evidence_ready'
  ||owner.resultRef!==expectedResultRef||!rosterWorkflowBindingsMatchV1(owner.bindings,state.scope)
  ||state.work.some(w=>w.status==='running'||w.operationState?.pending))reject();
 const call=owner.operationState?.calls?.at(-1);if(!call?.requestRef||!call.replyRef)reject();
 const request=await store.get(call.requestRef),scope=request.promptNodes?.find(n=>n.kind==='executable_tool_contract_scope');
 const entry=state.evidence.find(e=>e.id===scope?.currentEvidenceId);
 if(!entry?.artifactRef)reject();
 const prior=await store.get(entry.artifactRef),oldOperation=prior.operations?.find(o=>o.operation===operation),currentOperation=descriptor.operations?.find(o=>o.operation===operation);
 if(!oldOperation||!currentOperation||isDeepStrictEqual(oldOperation,currentOperation))reject();
 const decisionId=owner.id+':contract-revision:'+hash(currentOperation).slice(0,16),goal=state.work.find(w=>w.id===graph.owner(owner.id)?.goalId);
 if(!goal)reject();
 const existing=state.work.find(w=>w.id===decisionId);
 if(existing){
  const p=existing.inputs.methodContractRepair?.value;
  if(p?.sourceWorkId!==owner.id||p.sourceResultRef!==expectedResultRef||!isDeepStrictEqual(p.currentOperation,currentOperation))reject();
  return workflow.dispatch({type:'hold_experiment_for_strategy',goalId:goal.id,decisionId,reason});
 }
 if(goal.investigationHandoff)reject();
 const children=graph.descendants(owner.id,{kinds:['execution','repair','choice','continuation']}).filter(w=>w.id!==owner.id);
 if(!children.length||children.some(w=>!['ready','waiting_dependency'].includes(w.status)||w.resultRef||w.inputRef||w.operationState||w.attempt))reject();
 const result=await store.get(owner.resultRef);
 if(result.value?.experimentConclusion||!result.value?.workOrders?.length||result.value.failedWorkOrders?.length)reject();
 const proof={version:1,sourceWorkId:owner.id,sourceResultRef:owner.resultRef,sourceRequestRef:call.requestRef,sourceReplyRef:call.replyRef,
  oldContractEvidenceId:entry.id,oldContractArtifactRef:entry.artifactRef,oldOperation:copy(oldOperation),currentOperation:copy(currentOperation),
  decisionId,operation,unexecutedWorkIds:children.map(w=>w.id),methodExecuted:false,factsApproved:false,planApproved:false,historyReset:false,reason};
 const job=createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds:[],draft:await store.get(state.draftRef),requirements,
  returnReason:'tool_input_contract_revised',unexecutedMethodReturn:proof});
 if(!job)reject();job.id=decisionId;delete job.inputs.repairContractReconsideration;
 job.inputs.methodContractRepair={source:'literal',value:proof};
 job.inputs.question={source:'literal',value:{goal:'工具输入职责已经澄清；旧方法的全部操作均未派发。请基于原始问题与新合同决定是否仍需要原提案，或者选择真正能回答问题的工作单。',
  instruction:'methodContractRepair保留当时实际送达合同和当前合同。只改变接口理解，不是新的游戏事实、成功回执或战略建议。原方法关于参数前置的理由可错，不能照抄为当前规则。完整军表/Plan、原必要问题与所有已完成证据保留；按当前接口自行选择单位、目标、顺序和假设意图，不由Host代填。不重跑已完成前置；若某额外查询确有独立价值，应说明具体尚缺谓词；不能只为获取本工具内部负责的字段而重复查询。允许有据保留/修订，不批准未执行结果、不扩大到整场对局。'}};
 await workflow.dispatch({type:'enqueue',work:[job]});
 return workflow.dispatch({type:'hold_experiment_for_strategy',goalId:goal.id,decisionId,reason});
}
