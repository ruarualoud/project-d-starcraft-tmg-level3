// One role/phase description for outgoing instructions and read-only reply consumption.
// Evidence delivery, Native legality and strategic acceptance remain downstream.
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate}
  from '../structured-generation/output-contract-registry-v1.mjs';

const roles={
 roster_workflow_fact_summary:{field:'findings',deferReadNotes:true,annotations:[]},
 roster_workflow_final_review:{field:'checks',deferReadNotes:true,annotations:['assessment']},
 roster_workflow_strategy_decision:{field:'decisions',deferReadNotes:false,annotations:[]},
 roster_workflow_local_teach:{field:'proposals',deferReadNotes:false,annotations:[]},
 roster_workflow_experiment_planner:{field:'workOrders',deferReadNotes:false,annotations:[]}
};
export function rosterRolePhaseContractV1({role,schema}){
 const definition=roles[role],properties=schema?.properties;
 if(!definition||properties?.[definition.field]?.type!=='array'
   ||!Array.isArray(properties.action?.enum)||!properties.reads)return null;
 const actions=properties.action.enum;
 // Specialized extraction/edit/confirmation commands own their own contract.
 if(!actions.some(action=>['read','catalogue','finish','conclude'].includes(action)))return null;
 const record=properties[definition.field].items;
 return {kind:'role_phase_contract',version:1,role,field:definition.field,
   allowedActions:[...actions],deferReadNotes:definition.deferReadNotes,
   annotationFields:definition.annotations.filter(key=>!properties[key]&&record?.properties?.[key]),
   preparationAcceptsDecisions:false,decisionGrantsFactApproval:false};
}
export function prepareRosterRolePhaseRequestV1(request){
 const contract=rosterRolePhaseContractV1({role:request.roundKind,schema:request.responseFormat?.schema});
 if(!contract)return request;
 const clauses=[];
 if(contract.allowedActions.includes('read'))clauses.push('read：提交非空 reads 选择器；'+contract.field+'=[]。若当前 Schema 允许目录查询，可同时查询必要目录，但不提交判断。');
 if(contract.allowedActions.includes('catalogue'))clauses.push('catalogue：只提交非空 catalogueQueries；reads=[]、'+contract.field+'=[]。目录不等于正文已读。');
 if(contract.allowedActions.includes('finish'))clauses.push('finish：reads=[]、catalogueQueries（如存在）=[]；现在才提交 '+contract.field+' 中的角色结果。');
 if(contract.allowedActions.includes('conclude'))clauses.push('conclude：只按本角色结论合同回交，不执行新的 workOrders，也不声称未测事实已证明。');
 if(contract.field==='checks')clauses.push('“每个已分配 checkId 回答一次”仅适用于 finish；逐条 assessment（如 Schema 声明）位于 checks[].assessment，不在顶层。读取阶段无需先审结。');
 clauses.push('本阶段说明不扩大当前 Schema 的权限；读取笔记不是结论，必须在拿到实际正文后再决定。');
 const instruction=clauses.join(' ');
 const prior=request.promptNodes?.find(n=>n.kind==='role_phase_contract');
 const userMessage=prior?.instruction?request.userMessage.replace(prior.instruction,''):request.userMessage;
 return {...request,userMessage:userMessage.trimEnd()+' '+instruction,
   promptNodes:[...(request.promptNodes??[]).filter(n=>n.kind!=='role_phase_contract'),{...contract,instruction}]};
}
export function projectRosterReadPhaseV1({role,output,schema}){
 const unchanged={output,projection:[],deferredFindings:[],deferredAnnotations:[]};
 const contract=rosterRolePhaseContractV1({role,schema});
 if(!contract?.deferReadNotes||!['read','catalogue'].includes(output?.action)
   ||!contract.allowedActions.includes(output.action)
   ||!Array.isArray(output[contract.field]))return unchanged;
 const actualQuery=output.action==='read'?output.reads?.length:output.catalogueQueries?.length;
 if(!actualQuery)return unchanged;
 const candidate=structuredClone(output),annotations=[];
 for(const field of contract.annotationFields)if(Object.hasOwn(candidate,field)){
   if(!validate(schema.properties[contract.field].items.properties[field],candidate[field]).ok)return unchanged;
   annotations.push({field,value:structuredClone(candidate[field])});delete candidate[field];
 }
 // Only type-valid, declared read-only notes can be deferred. Unknown commands,
 // invalid claims and invalid selectors remain errors; no data is silently dropped.
 if(!validate(schema,candidate).ok)return unchanged;
 const findings=candidate[contract.field];
 if(!findings.length&&!annotations.length)return unchanged;
 candidate[contract.field]=[];
 const rule=contract.field==='checks'?'review_read_draft_deferred_v1':'fact_summary_read_draft_deferred_v1';
 const projection=[
   ...(findings.length?[{from:'/'+contract.field,original:structuredClone(findings),value:[],rule}]:[]),
   ...annotations.map(({field,value})=>({from:'/'+field,original:value,rule,retainedAsNonExecutableAnnotation:true}))
 ].map(row=>({...row,semanticApprovalGranted:false,
   reason:'Preserved in the immutable reply and next read-phase context; not accepted or cited as evidence.'}));
 return {output:candidate,projection,deferredField:contract.field,
   deferredFindings:findings,deferredAnnotations:annotations};
}
export function rosterReadPhaseCorrectionCoveredV1(errors,preparation){
 if(!preparation?.projection?.length||!errors?.length)return false;
 const removed=new Set((preparation.deferredAnnotations??[]).map(row=>'$.'+row.field));
 return errors.every(error=>['read_requires_reads_only','evidence_not_read'].includes(error.code)
   ||error.code==='schema'&&error.issues?.length
     &&error.issues.every(issue=>issue.code==='additional_property_forbidden'&&removed.has(issue.path)));
}
