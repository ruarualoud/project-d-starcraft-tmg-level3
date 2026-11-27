import {isDeepStrictEqual} from 'node:util';
import {isRosterSourceClaimCorrectionV1} from './roster-role-responsibility-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {focusRosterComparisonControlContextV1,rosterExactReadRowsV1} from './roster-comparison-control-command-v1.mjs';
import {projectRosterWorkflowAssignedSourceReferencesV1} from './roster-workflow-repair-dependencies-v1.mjs';
import {projectRosterAtomicReviewScopeV1} from './roster-atomic-review-v1.mjs';
import {rosterDelegatedMethodControlV1} from './roster-delegated-method-control-v1.mjs';

// Domain review owns current claims, not the global historical work ledger.
// Canonical scope stays unchanged for scheduling/reuse; its exact background
// remains available through the same reader, not a fabricated resolved state.
export async function focusRosterDomainReviewRequestV1({request,publishContext,directory=[]}){
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const scope=assigned?.inputs?.reviewScope?.value;
  if(!publishContext||request.roundKind!=='roster_workflow_final_review'
    ||scope?.kind!=='roster_domain_review_scope'||assigned.inputs.atomicReviewItem
    ||assigned.inputs.atomicReviewAggregate||request.promptNodes.some(n=>n.kind==='domain_review_context'))return {request};
  const directoryKinds=new Set(['available_evidence_directory','assigned_evidence_references','historical_evidence_directory']);
  const navigation=assigned.inputs.decisionEvidenceDirectory;
  const registered=directory.find(entry=>entry.number===navigation?.evidenceNumber);
  // Keep the already compact, registered navigation address visible. Deferring
  // it again makes a reviewer read background just to find the same address.
  const hasCompactNavigation=navigation?.source==='evidence'
    &&navigation.status==='available_on_demand'&&navigation.bodyRead===false
    &&navigation.value?.schema==='roster_evidence_lineage_navigation_v1'
    &&registered&&registered.id===navigation.evidenceId&&registered.artifactRef===navigation.artifactRef;
  const names=hasCompactNavigation?['revisionReviewContext']:['decisionEvidenceDirectory','revisionReviewContext'];
  const background=Object.fromEntries(names.filter(k=>Object.hasOwn(assigned.inputs,k)).map(k=>[k,structuredClone(assigned.inputs[k])]));
  const source=await publishContext({schema:'roster_domain_review_background_v1',version:1,
    workId:assigned.workId,reviewScope:structuredClone(scope),inputs:background,
    directoryNodes:Object.fromEntries(request.promptNodes.filter(n=>directoryKinds.has(n.kind)).map(n=>[n.kind,structuredClone(n)])),
    newObligationsAuthorized:false,acceptanceGranted:false},
    {kind:'interpretation',title:'Exact domain-review dependency/history background; not extra assigned checks'});
  const reference=pointer=>({source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true});
  const inputs={...structuredClone(assigned.inputs),reviewScope:{...structuredClone(assigned.inputs.reviewScope),
    value:projectRosterAtomicReviewScopeV1(scope)}};
  for(const key of Object.keys(background))inputs[key]=reference('/inputs/'+pointerKey(key));
  const currentNodes=request.promptNodes.filter(n=>!directoryKinds.has(n.kind)&&n.kind!=='workflow_role_assignment');
  const visible=new Set(projectRosterWorkflowAssignedSourceReferencesV1({inputs:{current:inputs,nodes:currentNodes},directory}).map(e=>e.number));
  visible.add(source.evidenceNumber);
  const nodes=request.promptNodes.map(node=>{
    if(node.kind==='workflow_role_assignment')return {...structuredClone(node),inputs};
    if(!directoryKinds.has(node.kind))return structuredClone(node);
    const compact=structuredClone(node);
    for(const [key,rows]of Object.entries(compact))if(Array.isArray(rows))compact[key]=rows.filter(row=>{
      const number=row?.number??row?.evidenceNumber;
      return !Number.isSafeInteger(number)||visible.has(number);
    });
    return compact;
  });
  const available=nodes.find(n=>n.kind==='available_evidence_directory');
  if(available)available.entries.push({number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false});
  nodes.push({kind:'domain_review_context',version:1,workId:assigned.workId,domainId:scope.domainId,
    originalScope:reference('/reviewScope'),backgroundSource:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},
    sourceValuesChanged:false,questionsResolvedByHost:false,newObligationsAuthorized:false,acceptanceGranted:false,
    instruction:'Review ONLY the current assigned obligations and current claims under their stated conditions. The exact global dependency ledger, historical questions and prior revision context remain readable at these pointers; they are not a new checklist for this domain. This projection does not answer, discard or waive any unresolved question. Read a relevant saved fact when the current claim needs it. Name an actual affected current claim for a defect; do not reopen retired roster construction tasks, redesign the Plan or demand a whole future match. Return your scoped judgment to the existing coordinator; a new experimental scope belongs to the strategic author.'});
  const focused={...request,promptNodes:nodes};
  focused.contextHash=hash({priorContextHash:request.contextHash,domainReviewContextVersion:1,
    promptNodes:nodes,userMessage:focused.userMessage,responseFormat:focused.responseFormat});
  return {request:focused,source};
}

// A local author correction is not another whole-experiment decision turn.
// The complete original request is published through the SAME evidence reader;
// no source is summarized away and no model choice is repaired by the Host.
const backgroundInputs=new Set(['activeHypothesisTests','returnedMethodFacts',
  'questionEvidenceDirectory','decisionEvidenceDirectory','previousBatch','batchProgress',
  'unfinishedMethods','completedNativeTransitions','sourceInterpretationChallenges']);
const backgroundNodes=new Set(['registered_native_measurement_supplements',
  'previously_delivered_source_facts','conditional_native_action_evidence','registered_source_record_supplements',
  'historical_assignment_context']);
const isSourceOnly=request=>{
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const original=feedback?.originalOutput??request.strategyRepairState?.originalOutput;
  return request.roundKind==='roster_workflow_strategy_decision'&&feedback?.errors?.length
    &&feedback.errors.every(e=>e.code==='authored_choice_requires_current_plan_source')
    &&original?.action==='finish'&&original.decisions?.length===1;
};
const pointerKey=key=>key.replaceAll('~','~0').replaceAll('/','~1');

// Both normal owner handoff and a scoped review-owner correction use this
// same view. The global ledger is still immutable/readable and remains owned
// by release checks; it is not another set of assignments for a local turn.
function projectOwnerRequirements(value,pointer,defer){
  const projected=structuredClone(value);
  if(Array.isArray(value?.value?.strategyQuestions))
    projected.value.strategyQuestions=defer('requirements.strategyQuestions',
      pointer+'/value/strategyQuestions',value.value.strategyQuestions);
  return projected;
}
function isScopedReviewOwner(request,assignment){
  const input=assignment?.inputs?.reviewResolutionAuthorization,authority=input?.value;
  return request.roundKind==='roster_workflow_strategy_decision'
    &&assignment?.role===request.roundKind&&input?.source==='literal'
    &&authority?.version===1&&authority.groupId===assignment.workId
    &&authority.authorChoosesInquiry===true&&authority.reviewerAuthorizesExperiments===false
    &&Array.isArray(authority.domains)&&authority.domains.length>0
    &&authority.domains.every(d=>typeof d.domain==='string'&&typeof d.reviewId==='string');
}

function focusLocalAuthorCorrection({request,source,previousDeliveredReads}){
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const original=feedback?.originalOutput??request.strategyRepairState?.originalOutput;
  const sourceOnly=isSourceOnly(request);
  const ledger=original?.decisions?.length===1?original.decisions[0].dataQuestions:null;
  if(!ledger?.length)return null;
  const selected=new Set();
  for(const error of feedback.errors??[]){
    for(const n of error.pendingQuestionNumbers??[])if(Number.isSafeInteger(n)&&ledger[n-1])selected.add(n);
    // Old diagnostics omitted the selected address. Recover it only from the
    // actual rejected typed authorization, never from public-reason keywords.
    if(error.code==='bounded_investigation_authorization_invalid')
      for(const n of original.decisions[0].nextInvestigation?.questionNumbers??[])
        if(Number.isSafeInteger(n)&&ledger[n-1])selected.add(n);
    // Both shapes are produced by the shared validators: progress failures
    // name questions[], while a decided_here conflict names one question.
    // Resolve exact ledger identities only; a diagnostic is not new authority.
    const questions=[...(error.questions??[]),...(typeof error.question==='string'?[error.question]:[])];
    for(const question of questions)ledger.forEach((q,i)=>{if(q.question===question)selected.add(i+1);});
  }
  if(!selected.size)return null; // No guessed scope from prose/unknown errors.
  const questionNumbers=[...selected].sort((a,b)=>a-b);
  const focusEvidenceNumbers=new Set(questionNumbers.flatMap(n=>ledger[n-1].evidenceNumbers??[]));
  if(sourceOnly)for(const error of feedback.errors)for(const entry of error.sourceNavigation?.availableCurrentPlanSources??[])
    if(Number.isSafeInteger(entry.evidenceNumber))focusEvidenceNumbers.add(entry.evidenceNumber);
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const scopedReviewOwner=isScopedReviewOwner(request,assigned);
  for(const [key,value]of Object.entries(assigned.inputs??{}))if(/^(?:currentArmy|currentPlan_|currentBudgetOptions$|measurementConfiguration)/u.test(key)
    &&Number.isSafeInteger(value.evidenceNumber))focusEvidenceNumbers.add(value.evidenceNumber);
  const tool=request.promptNodes.find(n=>n.kind==='executable_tool_contract_scope');
  if(Number.isSafeInteger(tool?.currentEvidenceNumber))focusEvidenceNumbers.add(tool.currentEvidenceNumber);
  const deferred=[],key=r=>JSON.stringify([r.evidenceId,r.pointer]);
  const delivered=previousDeliveredReads?new Set(previousDeliveredReads.map(key)):null;
  const defer=(name,pointer,value)=>{deferred.push({name,pointer});return {
    source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true,
    ...(value?.source?{originalSource:value.source}:{})};};
  const keepRead=row=>focusEvidenceNumbers.has(row.evidenceNumber)||!delivered||!delivered.has(key(row));
  const directoryKinds=new Set(['available_evidence_directory','assigned_evidence_references','historical_evidence_directory']);
  const nodes=request.promptNodes.flatMap((node,index)=>{
    const pointer=`/promptNodes/${index}`;
    if(node.kind==='local_correction_context')return [];
    if(sourceOnly&&['comparison_redesign_contract','comparison_closure_contract'].includes(node.kind)){
      // These fields are also consumed by semantic validation. Preserve the
      // exact scope/identity; only global authoring instructions are deferred.
      defer(node.kind,pointer,node);const retained=structuredClone(node);
      for(const key of Object.keys(retained))if(/instruction$/iu.test(key))delete retained[key];
      return [{...retained,localSourceRepairOnly:true,instruction:'Existing proposal authority retained for unchanged semantic validation. This source-only turn cannot redesign it; use only the numbered question repair command.'}];
    }
    if(backgroundNodes.has(node.kind)){defer(node.kind,pointer,node);return [];}
    if(node.kind==='workflow_role_assignment')return [{...structuredClone(node),inputs:Object.fromEntries(Object.entries(node.inputs).map(([name,value])=>{
      const inputPointer=pointer+'/inputs/'+pointerKey(name);
      if(scopedReviewOwner&&name==='requirements')
        return [name,projectOwnerRequirements(value,inputPointer,defer)];
      const background=backgroundInputs.has(name)||/^(?:domain|facts)\d+$/u.test(name)
        ||['tools','currentToolCapabilities','strategicHypothesisChallenge'].includes(name)
        ||/^comparisonClosure(?:Author|Review)\d+$/u.test(name)
        ||scopedReviewOwner&&(name==='previousAuthor'||name==='retainedDecisionEvidenceDirectory'
          ||/^completedInquiryDecision\d+$/u.test(name))
        ||sourceOnly&&(name==='wholeDraft'||name==='originalTeach'||/^(?:priorInvestigation|completedInquiry|comparison)/u.test(name));
      return [name,background?defer('input:'+name,inputPointer,value):structuredClone(value)];
    }))}];
    if(node.kind==='exact_read_results'){
      const next=structuredClone(node);
      if(Array.isArray(node.results))next.results=node.results.filter((row,i)=>{
        if(keepRead(row))return true;defer('read:'+row.evidenceNumber,pointer+'/results/'+i,row);return false;});
      else if(Array.isArray(node.groups))next.groups=node.groups.filter((group,i)=>{
        if(rosterExactReadRowsV1({...node,groups:[group]}).some(keepRead))return true;
        defer('read-group:'+group.common?.evidenceNumber,pointer+'/groups/'+i,group);return false;});
      // Unknown read encodings stay intact, never silently disappear.
      return [next];
    }
    if(directoryKinds.has(node.kind)){
      defer('node:'+node.kind,pointer,node);const next=structuredClone(node);
      for(const [name,rows]of Object.entries(next))if(Array.isArray(rows))next[name]=rows.filter(row=>{
        const n=row?.number??row?.evidenceNumber;return !Number.isSafeInteger(n)||focusEvidenceNumbers.has(n);});
      return [next];
    }
    return [structuredClone(node)];
  });
  const available=nodes.find(n=>n.kind==='available_evidence_directory');
  if(available)available.entries.push({number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false});
  nodes.push({kind:'local_correction_context',version:2,source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},
    ...(sourceOnly?{repairScope:'current_plan_source'}:{}),questionNumbers,focusEvidenceNumbers:[...focusEvidenceNumbers].sort((a,b)=>a-b),deferred,
    ...(scopedReviewOwner?{scopedOwnerBackground:{version:1,
      authorityWorkId:assigned.workId,domains:structuredClone(assigned.inputs.reviewResolutionAuthorization.value.domains),
      globalLedgerIsCurrentAssignment:false,historyDeleted:false,questionsResolved:false,
      instruction:'The current assignment and numbered pending questions define this local owner turn. Global readiness questions and prior author/inquiry interpretations are exact readable background, not additional current obligations or current Rules facts. Current complete army/Plan, mechanical requirements, review issues and delivered source measurements remain available. A historical interpretation does not settle the current choice; reconcile its sources and applicability when needed. No question is answered, waived, promoted or removed by this view.'}}:{}),
    questionsRemoved:false,sourceValuesChanged:false,authorityChanged:false,acceptanceGranted:false,
    instruction:'This is the CURRENT author correction, focused on the explicit question numbers above, not a new global Teach round. All original ledger entries remain in the command; unmentioned entries are unchanged, not erased or answered. Current army authority, relevant saved Plan declarations, exact cited facts and newly requested bodies stay inline. Other old review bodies, tool details, unrelated prior reads and full navigation are EXACT immutable background at the listed source/pointers; read them if a new decision needs them. An omitted body is neither missing evidence nor new permission. Do not reproduce a historical full answer or defer your own choice to another author. Choose the actual next operation under the CURRENT command schema; changing saved intent requires its structured mutation. Preserve unresolved optional hypotheses and conditions, but do not invent a missing fact or waive a required Plan choice. Ordinary read, source, semantic, Builder and final release checks still apply.'});
  const focused={...request,promptNodes:nodes};
  focused.contextHash=hash({priorContextHash:request.contextHash,correctionContextVersion:2,promptNodes:nodes,
    userMessage:request.userMessage,responseFormat:request.responseFormat});
  return focused;
}

// Review repair owns the rejected checks, not the parent's whole strategy.
// Exact current reads, proof/configuration, original output and both error lanes
// stay inline. Only navigation/global background moves to an ordinary reader.
async function focusReviewCorrection({request,publishContext,directory}){
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  if(!feedback?.errors?.length||!publishContext||request.promptNodes.some(n=>n.kind==='review_correction_context'))return {request};
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(assigned?.role!=='roster_workflow_final_review')return {request};
  const source=await publishContext(request,{kind:'interpretation',title:'Exact original local-review context; background is not new assigned work'});
  const deferred=[],directoryKinds=new Set(['available_evidence_directory','assigned_evidence_references','historical_evidence_directory']);
  const defer=(name,pointer)=>{deferred.push({name,pointer});return {source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true};};
  const nodes=request.promptNodes.flatMap((node,index)=>{
    const pointer=`/promptNodes/${index}`;
    if(node.kind==='historical_assignment_context'){defer(node.kind,pointer);return [];}
    if(directoryKinds.has(node.kind)){defer(node.kind,pointer);return [];}
    if(node.kind!=='workflow_role_assignment')return [structuredClone(node)];
    return [{...node,inputs:Object.fromEntries(Object.entries(node.inputs).map(([key,value])=>
      key==='sourceDirectory'||backgroundInputs.has(key)?[key,defer('input:'+key,pointer+'/inputs/'+pointerKey(key))]:[key,structuredClone(value)]))}];
  });
  const visible=new Set(projectRosterWorkflowAssignedSourceReferencesV1({inputs:{nodes},directory}).map(e=>e.number));
  const available=request.promptNodes.find(n=>n.kind==='available_evidence_directory');
  if(available)nodes.push({...structuredClone(available),entries:[...available.entries.filter(e=>visible.has(e.number)),
    {number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false}]});
  nodes.push({kind:'review_correction_context',version:1,source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
    ownerRole:'roster_workflow_final_review',isNewStrategyTurn:false,originalOutputChanged:false,acceptanceGranted:false,
    instruction:'Repair only the supplied rejected check(s), against the exact current claim, assigned obligations, source configuration and local_contract_feedback. The original rejected check is NOT evidence. Its original semantic defect and any repairAttempt protocol defect are separate unresolved lanes. Exact read values, source conditions and current proof context remain inline; global/history directories are readable background, not newly assigned work. Every deferred pointer resolves to the unchanged original input through ordinary read; absence inline is not absence of evidence. If another check has a real newly discovered problem, use the existing explicit new_finding operation and cite its basis. Do not redesign the Plan, broaden the experiment, silently waive unknowns or mark a read as a completed correction. Full source validation and release checks still apply.'});
  const focused={...request,promptNodes:nodes};
  focused.contextHash=hash({priorContextHash:request.contextHash,reviewCorrectionContextVersion:1,promptNodes:nodes,
    userMessage:request.userMessage,responseFormat:request.responseFormat});
  return {request:focused,source};
}

async function focusWorkOrderRepair({request,publishContext,directory}){
  const edit=request.promptNodes.find(n=>n.kind==='work_order_edit_command');
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  // A failed Native input and an uncompiled retained method have the same
  // local responsibility. Do not bypass this projection merely because the
  // former still uses the ordinary experiment command instead of an editor.
  const delegated=rosterDelegatedMethodControlV1(request);
  if(!publishContext||!edit&&!delegated||!assigned||request.promptNodes.some(n=>n.kind==='work_order_repair_context'))return {request};
  const deferredNames=new Set(['draft','localObligation','decision','decisionEvidenceDirectory',
    'retainedDecisionEvidenceDirectory','activeHypothesisTests','strategicHypothesisChallenge',
    'completedInquiryHandoff','authoritativeDecisionFacts','completedNativeTransitions']);
  const directoryKinds=new Set(['assigned_evidence_references','available_evidence_directory','historical_evidence_directory']);
  const deferredKinds=new Set(['authoritative_decision_facts',
    'builder_menu_source_coverage','draft_lifecycle_contract','acceptance_stage_contract',
    'experiment_followup_contract','local_hypothesis_decision_loop',
    'registered_native_measurement_supplements','previously_delivered_source_facts',
    'historical_assignment_context','historical_reference_inputs']);
  const background=Object.fromEntries(Object.entries(assigned.inputs).filter(([key])=>
    deferredNames.has(key)||/^completedInquiryDecision\d+$|^priorInvestigation(?:Conclusion|Review)\d+$/u.test(key)));
  const diagnostics=assigned.inputs.currentMethodParameterDiagnostics?.value?.issues??[];
  const source=await publishContext({schema:'roster_work_order_repair_background_v1',version:1,
    workId:assigned.workId,inputs:structuredClone(background),
    originalTask:structuredClone(assigned.inputs.task??null),originalEditor:structuredClone(edit??null),
    nodes:request.promptNodes.filter(n=>directoryKinds.has(n.kind)||deferredKinds.has(n.kind)),
    historicalOnly:true,acceptanceGranted:false},
    {kind:'interpretation',title:'Exact method-repair background and original rejection; not additional assignments'});
  const ref=pointer=>({source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true});
  const inputs=structuredClone(assigned.inputs);
  for(const key of Object.keys(background))inputs[key]=ref('/inputs/'+pointerKey(key));
  // Keep the immutable rejection identity for the Host mapper, but do not repeat
  // its obsolete generic instruction as a current parameter repair instruction.
  if(diagnostics.length&&inputs.task?.value?.error?.queryRepair){
    const qr=inputs.task.value.error.queryRepair;
    delete qr.instruction;
    qr.historicalInstruction=ref('/originalTask/value/error/queryRepair/instruction');
    qr.currentDiagnosticInput='currentMethodParameterDiagnostics';
  }
  const currentEditor=structuredClone(edit);
  if(diagnostics.length&&currentEditor){
    currentEditor.currentRejection=structuredClone(diagnostics);
    currentEditor.retainedMethodRejection=ref('/originalEditor/retainedMethodRejection');
    currentEditor.instruction='Current source parameter diagnostics supersede the historical error classification for these arguments. A missing identity field is not a request for new participant authority. The old receipt remains readable and unchanged. '+currentEditor.instruction;
  }
  const active=request.promptNodes.filter(n=>!directoryKinds.has(n.kind)&&!deferredKinds.has(n.kind)
    &&!['workflow_role_assignment','work_order_edit_command'].includes(n.kind));
  const visible=new Set(projectRosterWorkflowAssignedSourceReferencesV1({
    inputs:{current:inputs,nodes:active,editor:currentEditor},directory}).map(e=>e.number));
  visible.add(source.evidenceNumber);
  const nodes=request.promptNodes.filter(n=>!deferredKinds.has(n.kind)).map(n=>{
    if(n.kind==='workflow_role_assignment')return {...structuredClone(n),inputs};
    if(n.kind==='work_order_edit_command')return currentEditor;
    const next=structuredClone(n);
    if(directoryKinds.has(n.kind))for(const[key,rows]of Object.entries(next))if(Array.isArray(rows))
      next[key]=rows.filter(row=>{const number=row?.number??row?.evidenceNumber;
        return !Number.isSafeInteger(number)||visible.has(number);});
    return next;
  });
  const available=nodes.find(n=>n.kind==='available_evidence_directory');
  if(available)available.entries.push({number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false});
  nodes.push({kind:'work_order_repair_context',version:2,workId:assigned.workId,
    mode:edit?'retained_method_editor':'delegated_method_repair',
    backgroundSource:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},
    originalAssignmentAndReceiptsPreserved:true,acceptanceGranted:false,
    instruction:'Repair only the retained unexecuted method under its current delegation. The selected operation contracts, source parameter diagnosis, explicit participants, comparison design and exact requested reads are current inputs. Full Plan, prior conclusions, global ledgers and unrelated measurement packets are saved background at the listed pointers, not new tasks. Read them only if relevant. No new objective, participant, measurement result or strategic choice is supplied by this projection.'});
  const focused={...request,promptNodes:nodes,userMessage:currentEditor?.instruction??request.userMessage};
  focused.contextHash=hash({priorContextHash:request.contextHash,workOrderRepairContextVersion:2,
    promptNodes:nodes,userMessage:focused.userMessage,responseFormat:focused.responseFormat});
  return {request:focused,source};
}

async function focusFactMethod({request,publishContext,directory}){
  if(request.promptNodes.some(n=>n.kind==='work_order_edit_command')||rosterDelegatedMethodControlV1(request))
    return focusWorkOrderRepair({request,publishContext,directory});
  const sourceOnly=isRosterSourceClaimCorrectionV1(request.promptNodes.find(n=>n.kind==='source_review_repair_stage'));
  const sourceBackgroundInputs=new Set(['draft','tools','experimentLifecycle','authoritativeDecisionFacts',
    'currentArmyAuthority','currentArmyIdentity','currentArmyConfiguration','strategicHypothesisChallenge']);
  const sourceBackgroundKinds=new Set(['authoritative_decision_facts',
    'builder_menu_source_coverage','selected_native_menu_read_contract','draft_lifecycle_contract',
    'acceptance_stage_contract','experiment_followup_contract','local_hypothesis_decision_loop']);
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const question=assigned?.inputs?.question?.value;
  const reviewGoal=assigned?.inputs?.localObligation?.value?.originalGoal;
  const reviewIssues=assigned?.inputs?.reviewIssues??reviewGoal?.inputs?.reviewIssues;
  const reviewResolution=Array.isArray(reviewIssues?.value)&&reviewIssues.value.length>0;
  const explicitQuestion=question?.schema==='roster_factual_inquiry_question_v1'
    &&question.authorizationScope==='explicit_selected_predicates'&&question.authorization;
  const delegated=assigned?.inputs?.localObligation?.value?.reviewLevel==='fact_method';
  if(!publishContext||!sourceOnly&&!reviewResolution&&!explicitQuestion&&!delegated
    ||request.promptNodes.some(n=>n.kind==='fact_method_context'
      ||!reviewResolution&&['pending_operation_choice_contract','native_choice_command','work_order_edit_command'].includes(n.kind)))return {request};
  const deferredInputs={},keptInputs={};
  for(const [key,value]of Object.entries(assigned.inputs)){
    // A fact method may consult the exact challenge as background, but never
    // inherits the strategic owner's job of choosing/comparing a new army.
    const closedComparison=key==='strategicHypothesisChallenge';
    if(sourceOnly&&sourceBackgroundInputs.has(key)||['decision','decisionEvidenceDirectory'].includes(key)
      ||/^priorInvestigation(?:Conclusion|Review)\d+$|^completedInquiryDecision\d+$/u.test(key)||closedComparison)deferredInputs[key]=value;
    else keptInputs[key]=value;
  }
  const directoryKinds=new Set(['assigned_evidence_references','available_evidence_directory','historical_evidence_directory']);
  // Prior control returns are discoverable evidence, not the new method's
  // assignment. In particular their originalQuestion can contain an obsolete
  // "Correct ONLY this invalid work order" command and its rejected parameters.
  // Retain exact bodies behind the ordinary reader, with identity/status inline.
  const historicalControlReturns=assigned.inputs.priorInvestigationEvidence?.value?.controlReturns;
  const source=await publishContext({schema:'roster_fact_method_background_v1',version:2,
    workId:assigned.workId,scope:structuredClone(assigned.scope),
    inputs:structuredClone(deferredInputs),
    ...(sourceOnly?{roleBackgroundNodes:Object.fromEntries(request.promptNodes.filter(n=>sourceBackgroundKinds.has(n.kind)).map(n=>[n.kind,structuredClone(n)]))}:{}),
    ...(Array.isArray(historicalControlReturns)?{historicalControlReturns:structuredClone(historicalControlReturns)}:{}),
    directoryNodes:Object.fromEntries(request.promptNodes.filter(n=>directoryKinds.has(n.kind)).map(n=>[n.kind,structuredClone(n)])),
    interpretationIsObservation:false,acceptanceGranted:false},{kind:'interpretation',
    title:'Exact fact-method background; prior interpretations and full source navigation'});
  const deferred=Object.keys(deferredInputs).map(key=>({name:'input:'+key,pointer:'/inputs/'+pointerKey(key)}));
  const inputs={...keptInputs,...Object.fromEntries(Object.entries(deferredInputs).map(([key,value])=>[key,{
    source:'deferred_context',originalSource:value.source,evidenceNumber:source.evidenceNumber,
    pointer:'/inputs/'+pointerKey(key),bodyOmitted:true}]))};
  if(Array.isArray(historicalControlReturns)){
    inputs.priorInvestigationEvidence=structuredClone(inputs.priorInvestigationEvidence);
    inputs.priorInvestigationEvidence.value.controlReturns=historicalControlReturns.map((row,index)=>{
      const projected=structuredClone(row);
      for(const key of ['originalQuestion','unresolvedQuestions','sourceControlDispute'])if(Object.hasOwn(row,key)){
        const pointer=`/historicalControlReturns/${index}/${pointerKey(key)}`;
        deferred.push({name:`historical-control-return:${index}:${key}`,pointer});
        projected[key]={source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true,
          historicalAssignment:true,currentExecutionAuthority:false};
      }
      return projected;
    });
  }
  // Keep metadata for every explicitly retained input/current exact source.
  // The complete catalogue is still queryable, and the omitted metadata itself
  // is saved verbatim; it is not a second implicit queue of required facts.
  const activeNodes=request.promptNodes.filter(n=>!directoryKinds.has(n.kind)&&n.kind!=='workflow_role_assignment'
    &&(!sourceOnly||!sourceBackgroundKinds.has(n.kind)));
  const visible=new Set(projectRosterWorkflowAssignedSourceReferencesV1({inputs:{current:inputs,nodes:activeNodes},directory}).map(e=>e.number));
  visible.add(source.evidenceNumber);
  const nodes=request.promptNodes.filter(node=>{
    if(!sourceOnly||!sourceBackgroundKinds.has(node.kind))return true;
    deferred.push({name:'node:'+node.kind,pointer:'/roleBackgroundNodes/'+pointerKey(node.kind)});return false;
  }).map(node=>{
    if(node.kind==='workflow_role_assignment')return {...structuredClone(node),inputs};
    if(!directoryKinds.has(node.kind))return structuredClone(node);
    deferred.push({name:'node:'+node.kind,pointer:'/directoryNodes/'+pointerKey(node.kind)});
    const compact=structuredClone(node);
    for(const [key,rows]of Object.entries(compact))if(Array.isArray(rows))compact[key]=rows.filter(row=>{
      const number=row?.number??row?.evidenceNumber;
      return !Number.isSafeInteger(number)||visible.has(number);
    });
    return compact;
  });
  const available=nodes.find(n=>n.kind==='available_evidence_directory');
  if(available)available.entries.push({number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false});
  nodes.push({kind:'fact_method_context',version:3,
    assignmentKind:sourceOnly?'source_claim_correction':reviewResolution?'final_review_resolution':'authorized_question',
    currentAssignment:sourceOnly?{workId:assigned.workId,pendingClaimCorrections:structuredClone(request.promptNodes.find(n=>n.kind==='source_review_repair_stage').pendingClaimCorrections),reviewerIsAuthority:false}:reviewResolution?{workId:assigned.workId,goalWorkId:reviewGoal?.workId??assigned.workId,
      reviewIssues:structuredClone(reviewIssues),reviewerIsAuthority:false}:null,
    source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
    currentAuthorization:sourceOnly?null:explicitQuestion?structuredClone(question.authorization):null,globalObligationsRemoved:false,acceptanceGranted:false,
    ...(sourceOnly?{newExperimentAuthorized:false,currentOperationScope:'saved_sources_and_local_conclusion'}:{}),
    instruction:sourceOnly?'You own only sourceRepairStage pendingClaimCorrections. The original claim, exact review, Native observations, conditions and source readers are retained. Full army/Builder packets and parent research instructions are exact background at the listed source/pointers, not new assignments; read a relevant fact if needed. No new experiment is authorized. Return the corrected scoped conclusion or unresolved source conflict, without redefining the original question or approving the Plan.':'You own ONLY the current authorized method window. Choose its next executable query from current sources, or a source-backed local return. Prior investigation answers/reviewer opinions and closed comparisons are retrievable background, NOT your answer template or proof of unavailable tools. Current exact_read_results, source identity, army, local authorization, unresolved parent questions and actual contract feedback remain inline unchanged. Omission from inline context is not absence from storage: read any needed original via the listed evidence number and exact pointer or ordinary catalogue. Do not restart a completed matching experiment. If a source/menu rejects a step, explain that selected-state limit, not a universal absence; if a different method or scope requires an owner choice, return the facts and that precise choice. No parent obligation, necessary unknown, source check or final release gate is removed.'});
  const focused={...request,promptNodes:nodes,
    userMessage:'This turn is a LOCAL FACT-METHOD CHOICE, not reconsideration of the whole parent Plan. Use the currentAssignment review obligation or explicit currentAuthorization in fact_method_context. A reviewer assertion is a proposal, not permission to expand into a whole-army future rehearsal. The retained failed order is unapproved: if it belongs to an obsolete objective, use the existing strategy_required return with the exact remaining choice instead of making the wrong order executable. Old model conclusions are background to evaluate, not instructions to repeat.\n'+request.userMessage};
  focused.contextHash=hash({priorContextHash:request.contextHash,factMethodContextVersion:3,
    promptNodes:nodes,userMessage:focused.userMessage,responseFormat:focused.responseFormat});
  return {request:focused,source};
}

// Qualification follows actual delivery, not the unprojected Host assignment.
// Historical completed reads stay valid. A newly deferred input grants no read.
export function rosterLocalRepairDeliveryV1({request,previousDeliveredReads=[]}){
  if(!request.promptNodes.some(n=>n.kind==='work_order_repair_context'&&n.version===2))return null;
  return {inputs:request.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.inputs??{},
    reads:[...previousDeliveredReads,...request.promptNodes.filter(n=>n.kind==='exact_read_results')
      .flatMap(rosterExactReadRowsV1)].filter(row=>row.status==='read')};
}

export async function focusRosterWorkflowCorrectionRequestV1({request,publishContext,directory=request.roleCommunication?.evidenceNumbers??[],previousDeliveredReads=null}) {
  if(request.roundKind==='roster_workflow_final_review')return focusReviewCorrection({request,publishContext,directory});
  if(request.roundKind==='roster_workflow_experiment_planner')return focusFactMethod({request,publishContext,directory});
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const handoff=request.promptNodes.find(n=>n.kind==='strategy_author_handoff'||n.kind==='strategy_owner_assignment');
  if(request.roundKind!=='roster_workflow_strategy_decision'||!feedback&&!handoff||!publishContext)return {request};
  const source=await publishContext(request);
  if(isSourceOnly(request)){
    const focused=focusLocalAuthorCorrection({request,source,previousDeliveredReads});
    if(focused)return {request:focused,source};
  }
  const comparison=focusRosterComparisonControlContextV1(request,source);
  if(comparison)return {request:comparison,source};
  if(!handoff&&feedback?.errors?.length){
    const focused=focusLocalAuthorCorrection({request,source,previousDeliveredReads});
    if(focused)return {request:focused,source};
  }
  // A construction progress error asks for a strategic next operation. It is
  // not a citation/classification patch: the generic local-only instruction
  // would contradict the still-active author responsibility.
  const constructionNextAction=Boolean(feedback?.errors?.some(error=>
    error.code==='construction_required_work_has_no_next_step')
    &&request.promptNodes.some(node=>node.kind==='strategy_progress_contract'
      &&node.constructionRequirement?.budget?.shortfall>0));
  const deferred=[];
  const scopedOwner=Boolean(handoff?.questions?.length);
  const activeComparison=request.promptNodes.some(n=>n.kind==='comparison_closure_contract'||n.kind==='comparison_redesign_contract');
  let deferredClosedComparison=false;
  const deferValue=(name,pointer,value)=>{
    deferred.push({name,pointer});
    return {source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true,
      ...(Array.isArray(value)?{itemCount:value.length}:{})};
  };
  const nodes=request.promptNodes.flatMap((node,index)=>{
    // Owner handoff is not syntax repair: its current exact observations must
    // stay inline. Only older context/directories are deferred. In particular,
    // do not drop the named operands which distinguish a source dispute from
    // the erroneous wording in the current Plan.
    const currentFacts=handoff&&node.kind!=='historical_assignment_context';
    if(backgroundNodes.has(node.kind)&&!currentFacts){
      deferred.push({name:node.kind,pointer:`/promptNodes/${index}`});
      return [];
    }
    if(node.kind!=='workflow_role_assignment')return [structuredClone(node)];
    return [{...node,inputs:Object.fromEntries(Object.entries(node.inputs).map(([key,value])=>{
      const returnedSource=/^batch(?:Facts|ToolSource)\d+$/u.test(key);
      // The global readiness ledger is NOT the scoped owner's work queue.
      // Preserve mechanical authority and all exact old obligations, but do
      // not inline historical questions as 172 new tasks beside four assigned
      // questions. No workflow ledger entry or release requirement is removed.
      if(scopedOwner&&key==='requirements'&&Array.isArray(value.value?.strategyQuestions)){
        return [key,projectOwnerRequirements(value,`/promptNodes/${index}/inputs/${pointerKey(key)}`,deferValue)];
      }
      const memory=value.value?.comparisonMemory;
      if(scopedOwner&&!activeComparison&&key==='strategicHypothesisChallenge'
        &&memory?.comparisonResolved===true&&memory.comparisonStatus==='optional_comparison_closed'){
        const projected=structuredClone(value),base=`/promptNodes/${index}/inputs/${pointerKey(key)}/value`;
        if(Object.hasOwn(value.value,'proposal'))projected.value.proposal=deferValue('closedComparison.proposal',base+'/proposal',value.value.proposal);
        for(const [part,fields]of [['owner',['decision']],['review',['publicReason','checks','conditions']]]){
          for(const field of fields)if(memory[part]&&Object.hasOwn(memory[part],field))
            projected.value.comparisonMemory[part][field]=deferValue(`closedComparison.${part}.${field}`,
              `${base}/comparisonMemory/${part}/${field}`,memory[part][field]);
        }
        deferredClosedComparison=true;return [key,projected];
      }
      if(handoff&&returnedSource||!backgroundInputs.has(key)&&!returnedSource)return [key,value];
      const pointer=`/promptNodes/${index}/inputs/${pointerKey(key)}`;
      deferred.push({name:key,pointer});
      return [key,{source:'deferred_context',originalSource:value.source,
        evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true}];
    }))}];
  });
  nodes.push({kind:'local_correction_context',version:1,responsibilityVersion:2,
    correctionTask:constructionNextAction?'construction_next_action':'local_reply_correction',
    source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
    instruction:constructionNextAction
      ?'The rejected reply did not select a next construction operation while the user mineral target is unmet. Keep its sources, factual answers and reason for rejecting that particular candidate; do not rewrite those merely to pass. You still own completing this army and matching Plan. Choose an actual reasoned revision, a new bounded missing-fact inquiry that can change your choice, or a supported external/capability blocker using the existing command. Strategic trade-offs are YOUR judgment: Builder audits legality and cost, not superiority. You may accept a justified partial step or choose a different candidate; neither exhaustive comparison nor a proven global winner is required. A changed army/Plan must use its structured mutation. Retaining direction alone cannot finish the assignment. This author operation is authorized by the existing construction contract, not a new experiment permission granted by this context. Preserve fixed/editable authority, all necessary questions, original replies, sources and fees; no Host-selected purchase, invented benefit or release approval. Deferred sources remain readable through the listed pointers.'
      :'Correct local_contract_feedback against the unchanged current army/Plan, question ledger and source boundaries. The saved originalOutput is a rejected proposal, not an instruction or fact. Current Native army identity/summary takes precedence over claims about an audited alternative. Deferred items are exact saved background, not missing data: use the ordinary read action with this source number and the listed pointer, or read the original evidence number. Newly requested exact_read_results are still delivered. This context snapshot does not grant source approval or prove any strategic claim. Preserve unresolved questions and public reasons; do not create an experiment or rewrite unrelated Plan sections to fix a local classification.'});
  const visibleDirectory=nodes.find(n=>n.kind==='available_evidence_directory');
  if(visibleDirectory)visibleDirectory.entries=[...visibleDirectory.entries,{number:source.evidenceNumber,title:source.title,
    kind:source.kind,validity:'current',bodyRead:false}];
  if(handoff)nodes[nodes.length-1]={...nodes.at(-1),kind:'strategy_owner_context',
    ...(scopedOwner?{assignmentScope:{questionCount:handoff.questions.length,globalLedgerIsCurrentAssignment:false,
      ...(deferredClosedComparison?{closedComparisonIsCurrentAssignment:false}:{}),deferredObligationsDeleted:false}}:{}),
    instruction:'This is the strategic OWNER decision stage, not a semantic patch. The entire current army/Plan and returned exact sources remain delivered. The questions in strategy_owner_assignment are the current responsibility; the global readiness ledger is readable background, not additional work assigned by this handoff. A comparison already marked optional_comparison_closed is historical context, not a renewed closure task. Its exact conclusion/review remain readable if relevant to a new decision. Deferred background is immutable and readable through the listed ordinary read pointers; missing from the inline prompt is not missing globally. The prior rejected proposal does not override current authority. Decide from actual evidence and preserve every question. No fact, source or strategy is automatically approved.'};
  const focused={...request,promptNodes:nodes,
    userMessage:(handoff?'YOU are the strategic owner. Decide the returned choices using current authority and exact evidence; the old rejected proposal is not a fact. '
      :constructionNextAction?'This is the construction AUTHOR choosing the next operation, not a classification-only correction. Keep established facts and rejection reasons; now choose how to continue the unfinished army/Plan. '
      :'This is a LOCAL CORRECTION, not a fresh full-strategy review. Repair the supplied rejected output using local_contract_feedback and current authority. ')
      +'Full deferred background remains readable; no fact or choice is auto-approved.\n'+request.userMessage};
  focused.contextHash=hash({priorContextHash:request.contextHash,correctionContextVersion:1,
    promptNodes:nodes,userMessage:focused.userMessage,responseFormat:focused.responseFormat});
  return {request:focused,source};
}

// Host-side continuity validation of an exact, locally deferred assignment input.
// This does not assert that its full body was delivered to the model, grant a
// citation read, or search older requests for a convenient Plan.
export async function resolveRosterDeferredAssignmentInputV1({request,key,readArtifact}){
  const assignment=request?.promptNodes?.find(node=>node.kind==='workflow_role_assignment');
  const input=assignment?.inputs?.[key];
  if(input?.source!=='deferred_context')return input??null;
  if(input.bodyOmitted!==true||!Number.isSafeInteger(input.evidenceNumber)||typeof input.pointer!=='string')return null;
  const context=request.promptNodes.find(node=>node.kind==='local_correction_context'
    &&node.source?.evidenceNumber===input.evidenceNumber
    &&node.deferred?.some(row=>row.pointer===input.pointer));
  const entry=request.roleCommunication?.evidenceNumbers?.find(row=>row.number===input.evidenceNumber);
  if(!context||!entry?.artifactRef||entry.id!==context.source.evidenceId
    ||!entry.id.startsWith('role-context:'+assignment.workId+':'))return null;
  const original=await readArtifact(entry.artifactRef);
  const index=original?.promptNodes?.findIndex(node=>node.kind==='workflow_role_assignment');
  if(index===undefined||index<0||input.pointer!=='/promptNodes/'+index+'/inputs/'+pointerKey(key))return null;
  const prior=original.promptNodes[index];
  if(prior.workId!==assignment.workId||!isDeepStrictEqual(prior.scope,assignment.scope))return null;
  const value=prior.inputs?.[key];
  if(!value||value.source==='deferred_context'||input.originalSource&&value.source!==input.originalSource)return null;
  return structuredClone(value);
}
