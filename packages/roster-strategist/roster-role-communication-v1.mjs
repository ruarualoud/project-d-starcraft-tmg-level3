import {prepareRosterRolePhaseRequestV1} from './roster-role-phase-contract-v1.mjs';
// Transport ownership only. This module never supplies a model's strategic
// answer, clears an unknown, changes Rules truth, or authorizes a retry.
import {isDeepStrictEqual} from 'node:util';
import {ROSTER_FIRST_AUTHOR_INPUT_ENCODING_V1} from './roster-prompt-evidence-encoding-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {packRosterExactReadNodeV1} from './roster-comparison-control-command-v1.mjs';
import {projectRosterReadRequestProgressV1} from './roster-workflow-read-context-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {selectRosterCurrentMapSourcesV1} from './roster-map-evidence-sources-v1.mjs';
import {ROSTER_REVIEW_OWNER_AUTHORITY_INSTRUCTION_V1} from './roster-review-owner-v1.mjs';
import {isRosterWorkflowDiscoveryGraphV1} from './roster-workflow-catalogue-v1.mjs';
const text=value=>typeof value==='string'&&value.trim().length>0;
export const ROSTER_REVIEW_OBLIGATION_DELIVERY_VERSION_V1=2;
const invalid=(reason,detail)=>{throw Object.assign(Error(reason),{code:reason,detail,dispatchOutcome:'not_dispatched'});};
const historyInstruction='Historical resolution obligation: determine whether the following original inquiry/availability assumption has an explicit, source-backed disposition in the current Plan and returned decisions. An old assumption refuted by current evidence can be successfully RESOLVED; supported here means the resolution is supported, not that the old statement became true. Still-open necessary facts remain needs_evidence; a false claim still asserted by the CURRENT Plan requires_revision. Do not force a Plan edit when the current Plan already corrected or rejected that premise. Original historical text (preserved verbatim): ';

// Rename only the identifier. Different producers own question, criterion,
// conditions and future extension fields; a short-ID view cannot whitelist away
// their semantics. The original record remains immutable.
export function projectRosterReviewObligationsV1(assignment){
  if(assignment.role!=='roster_workflow_final_review'||assignment.inputs.review?.value?.obligations===undefined)return null;
  const obligations=assignment.inputs.review.value.obligations;
  if(!Array.isArray(obligations))invalid('ROSTER_REVIEW_OBLIGATIONS_INVALID','Expected an array');
  const ids=new Set();
  for(const row of obligations){
    if(!row||!text(row.checkId)||ids.has(row.checkId)||!text(row.question)&&!text(row.criterion))
      invalid('ROSTER_REVIEW_OBLIGATIONS_INVALID',{checkId:row?.checkId??null,reason:'unique_id_and_nonempty_question_or_criterion_required'});
    ids.add(row.checkId);
  }
  const historical=obligations.some(row=>row.originQuestionIds?.length);
  const entries=obligations.map((row,index)=>({...structuredClone(row),handle:`q${index+1}`,
    ...(row.originQuestionIds?.length&&text(row.question)?{question:historyInstruction+row.question}:{})}));
  const byId=new Map(entries.map(row=>[row.checkId,row.handle])),byHandle=new Map(entries.map(row=>[row.handle,row.checkId]));
  return {byId,byHandle,entries,inputs:{...assignment.inputs,review:{...assignment.inputs.review,value:{
    ...assignment.inputs.review.value,...(historical?{historicalQuestionResolutionVersion:1}:{}),
    obligations:entries.map(({handle,checkId,...body})=>({...body,checkId:handle})),
    identityInstruction:'Return each supplied short checkId exactly once. All obligation content and constraints are preserved. The host restores immutable causal IDs from this request, never from a later obligation order. Missing answers remain unresolved, not approved.'}}}};
}

// Diagnose a retained request against ITS retained assignment, not today's
// changed strategy/rubric. Only actual missing fields justify this recovery.
export function missingRosterReviewObligationFieldsV1({assignment,request}){
  const sent=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(sent?.workId!==assignment?.workId||sent?.role!==assignment?.role)return [];
  const expected=projectRosterReviewObligationsV1(assignment)?.inputs.review.value.obligations;
  const actual=sent.inputs?.review?.value?.obligations;
  if(!expected||!Array.isArray(actual))return [];
  const missing=[];
  expected.forEach(row=>{
    const received=actual.find(other=>other.checkId===row.checkId);
    if(!received)return; // A different ledger is not this known field-loss bug.
    for(const [field,value]of Object.entries(row))if(field!=='checkId'&&value!==undefined&&!Object.hasOwn(received,field))
      missing.push({checkId:row.checkId,field});
  });
  return missing;
}

// Share the normal immutable reader with both strategy and comparison design.
// The full assignment remains Host validation input; only the outgoing model
// view is partitioned. Preserve every capability and its exact proof exclusions,
// never rank/select tools or turn a catalogue entry into an observed result.
// Publication returns an append-only authoritative registry snapshot. Other roles
// may publish between this request's initial snapshot and its own publication.
// Synchronize discovery metadata only; this does not grant any source-body read.
function synchronizePublishedDirectory(directory,entry,errorCode){
  const authoritative=entry.evidenceDirectory;
  if(!Array.isArray(authoritative)||directory.length>authoritative.length
    ||new Set(authoritative.map(row=>row.id)).size!==authoritative.length
    ||directory.some((row,index)=>row.number!==index+1||row.id!==authoritative[index]?.id))
    invalid(errorCode,'Published directory must extend the same immutable identity prefix');
  const existing=directory.find(row=>row.id===entry.id);
  if(existing&&existing.number!==entry.evidenceNumber)invalid(errorCode,'Existing source number changed');
  directory.push(...authoritative.slice(directory.length).map((row,index)=>({...row,number:directory.length+index+1})));
}

export async function prepareRosterRoleCapabilityContextV1({request,directory,publishContext}){
  const node=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(!node||!['roster_workflow_strategy_decision','roster_workflow_local_teach'].includes(node.role))return request;
  const selected=Object.entries(node.inputs).filter(([key,input])=>
    ['currentToolCapabilities','comparisonCapabilities'].includes(key)
    &&input?.value?.schema==='roster_design_tool_capabilities_v1');
  if(!selected.length)return request;
  const inputs={...node.inputs};
  for(const [key,input]of selected){
    const catalogue=input.value;
    const entry=await publishContext(catalogue,{title:'Exact current design capability catalogue; not measurements',
      kind:'capability_result',conditions:['Exact executable capability projection; no experiment or strategy approval'],includeDirectory:true});
    const published=entry.evidenceDirectory?.[entry.evidenceNumber-1];
    if(!Number.isSafeInteger(entry.evidenceNumber)||published?.id!==entry.id)
      throw Error('ROSTER_CAPABILITY_CONTEXT_DIRECTORY_MISMATCH');
    synchronizePublishedDirectory(directory,entry,'ROSTER_CAPABILITY_CONTEXT_NUMBER_MISMATCH');
    const contract=pointer=>({evidenceNumber:entry.evidenceNumber,pointer});
    const keep=(row,fields)=>Object.fromEntries(fields.filter(f=>Object.hasOwn(row,f)).map(f=>[f,structuredClone(row[f])]));
    const interventions=catalogue.nativeInterventions;
    const index={schema:'roster_design_tool_capability_directory_v1',sourceSchema:catalogue.schema,
      sourceEvidenceId:entry.id,contract:contract(''),
      capabilities:catalogue.capabilities.map((cap,i)=>({
        ...keep(cap,['operation','queryKind','sideEffects','requiresCurrentActionDomain','proofScope']),
        contract:contract('/capabilities/'+i),
        decisionMeasurements:(cap.decisionMeasurements??[]).map((offer,j)=>({
          ...keep(offer,['observable','valueType','unit','aggregation','supportedInference','endpoint','availability','observationDomain','decisionSemantics']),
          contract:contract('/capabilities/'+i+'/decisionMeasurements/'+j)}))})),
      ...(interventions?{nativeInterventions:{
        ...keep(interventions,['schema','sourceStateHash','rulesRuntimeHash','purchaseSourceAvailability','unitFactsAvailability',
          'executionEligibilityProven','strategyApproved','instruction']),
        contract:contract('/nativeInterventions'),
        ...Object.fromEntries(['definitions','unitFacts','purchasableUpgrades'].filter(k=>Array.isArray(interventions[k]))
          .map(field=>[field,interventions[field].map((row,i)=>({
            ...keep(row,['unitId','unitIds','recordKey','compositionKind','definitionId','abilityName','activationKind','phase',
              'purchasableUpgradeProfileId','upgradeName']),contract:contract('/nativeInterventions/'+field+'/'+i)}))]))}}:{}),
      policy:structuredClone(catalogue.policy),missingMeasurementMeaning:catalogue.missingMeasurementMeaning,
      toolResultsAlreadyObserved:false,mayExecuteTools:false,
      instruction:'Complete capability/measurement and participant/ability/purchase navigation, not complete source bodies. All original values, parameters, selectors, costs and exclusions are stored unchanged at these exact read pointers. Read necessary definitions/measurements together through action=read before relying on an omitted detail. Unshown values are not absent, zero or unavailable. Retain the assigned decision and current Plan; the directory neither chooses strategy nor authorizes an experiment. Host submission validation still uses the complete original catalogue.'};
    inputs[key]={source:'evidence',evidenceId:entry.id,evidenceNumber:entry.evidenceNumber,
      artifactRef:entry.artifactRef,pointer:'',status:'available_on_demand',bodyRead:false,value:index};
  }
  return {...request,promptNodes:request.promptNodes.map(n=>n===node?{...node,inputs}:n)};
}

// Only discovery history is deferred. Current Plan, questions, findings, prior
// choices, explicit reads and the full Host assignment retain their own owners.
// Published graphs are snapshots, not recursively expanded prompt attachments.
export function projectRosterSourceNavigationValueV1(graph,evidenceNumber){
  if(!isRosterWorkflowDiscoveryGraphV1(graph)||!Number.isSafeInteger(evidenceNumber)||evidenceNumber<1)return null;
  const read=pointer=>({evidenceNumber,pointer});
  const {schema,entries,edges,...metadata}=graph;
  return {...metadata,schema:'roster_evidence_lineage_navigation_v1',sourceSchema:schema,
    entryCount:entries.length,edgeCount:edges.length,
    read:{whole:read(''),entries:read('/entries'),edges:read('/edges')},
    instruction:graph.instruction+' Full historical entries/edges are available at these exact read addresses. Roots and unresolved references remain here; this navigation is not source evidence already read. Read the needed entry or graph through the existing reader; a missing body is not missing evidence.'};
}
async function prepareFixedInitialBuilderUpgradeNavigationV1(nodes,{node,draft,directory,publishContext}){
  if(node.role!=='roster_workflow_strategy_decision'||node.workId!=='product:initial-army-and-plan'
    ||draft?.mode!=='fixed'||draft.rosterEditAuthority!=='preset_immutable'||draft.revision!==0||draft.plan!==null)return nodes;
  const factsNode=nodes.find(item=>item.kind==='builder_audit_numeric_facts');
  if(!factsNode)return nodes;
  const audits=[];
  for(const audit of factsNode.audits){
    const source=audit.source;
    const registered=directory.find(entry=>entry.id===source?.evidenceId);
    const upgrades=audit.factGroups?.find(group=>group.key==='upgrades');
    if(source?.validity!=='current'||source.evidenceId!=='draft:r0:builder'
      ||registered?.artifactRef!==source.artifactRef||audit.candidateHash!==node.scope.army
      ||!upgrades?.observations?.length){audits.push(audit);continue;}
    const entry=await publishContext(upgrades,{title:'Selected upgrades: full current Builder audit detail',
      kind:'capability_result',conditions:[`Exact upgrade fact group projected from Builder audit ${source.artifactRef}; not a new audit or a strategy recommendation`],
      includeDirectory:true});
    synchronizePublishedDirectory(directory,entry,'ROSTER_FIXED_UPGRADE_DIRECTORY_NUMBER_MISMATCH');
    audits.push({...audit,factGroups:audit.factGroups.filter(group=>group!==upgrades),
      upgradeAuditNavigation:{sourceEvidenceId:entry.id,sourceArtifactRef:entry.artifactRef,bodyRead:false,
        observationCount:upgrades.observations.length,read:{evidenceNumber:entry.evidenceNumber,pointer:''},
        units:Object.entries(upgrades.value.units).map(([key,unit])=>({unitInstanceId:unit.unitInstanceId,
          read:{evidenceNumber:entry.evidenceNumber,pointer:'/value/units/'+key.replaceAll('~','~0').replaceAll('/','~1')}})),
        instruction:'Current selected upgrade names and purchase costs remain in units. This exact evidence contains the complete specialist, effect and validation detail. Read it when the decision depends on that detail.'}});
  }
  return nodes.map(item=>item===factsNode?{...factsNode,audits}:item);
}

export async function prepareRosterRoleSourceNavigationV1({request,directory,publishContext}){
  const node=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(!node)return request;
  const inputs={...node.inputs};
  for(const [key,input]of Object.entries(inputs)){
    const graph=input?.value;
    if(!isRosterWorkflowDiscoveryGraphV1(graph))continue;
    const entry=await publishContext(graph,{title:`Exact decision evidence navigation: ${key}`,
      kind:'capability_result',conditions:['Discovery metadata only; no source read, rule fact or Plan approval'],includeDirectory:true});
    const published=entry?.evidenceDirectory?.[entry.evidenceNumber-1];
    // A view without a valid registered address must retain its full body.
    if(!Number.isSafeInteger(entry?.evidenceNumber)||published?.id!==entry.id)continue;
    synchronizePublishedDirectory(directory,entry,'ROSTER_SOURCE_NAVIGATION_NUMBER_MISMATCH');
    // Keep future metadata and unresolved references. Only the two named
    // historical graph arrays move behind the ordinary exact reader.
    inputs[key]={source:'evidence',evidenceId:entry.id,evidenceNumber:entry.evidenceNumber,
      artifactRef:entry.artifactRef,pointer:'',status:'available_on_demand',bodyRead:false,
      value:projectRosterSourceNavigationValueV1(graph,entry.evidenceNumber)};
  }
  let nodes=request.promptNodes.map(n=>n===node?{...node,inputs}:n);
  const choiceIndex=nodes.findIndex(n=>n.kind==='comparison_redesign_contract');
  const choice=nodes[choiceIndex]?.choiceSource;
  if(choice){
    let nextChoice=choice;
    for(const [key,input]of Object.entries(inputs)){
      if(input?.value?.schema!=='roster_design_tool_capability_directory_v1')continue;
      const native=input.value.nativeInterventions;
      if(!native||native.sourceStateHash!==choice.sourceStateHash||native.rulesRuntimeHash!==choice.rulesRuntimeHash)continue;
      let nextNative=native;
      for(const field of ['definitions','purchasableUpgrades']){
        const rows=native[field],choices=choice[field];
        if(!Array.isArray(rows)||!Array.isArray(choices)||rows.length!==choices.length||!rows.length)continue;
        // This is a presentation alias only when EVERY discovery field is
        // already present unchanged, in the same order, in the choice source.
        if(!rows.every((row,i)=>row.contract?.evidenceNumber===input.evidenceNumber
          &&row.contract.pointer===`/nativeInterventions/${field}/${i}`
          &&Object.entries(row).every(([k,v])=>k==='contract'||Object.hasOwn(choices[i],k)&&isDeepStrictEqual(v,choices[i][k]))))continue;
        nextChoice={...nextChoice,[field]:choices.map((row,i)=>({...row,sourceContract:rows[i].contract}))};
        nextNative={...nextNative,[field]:{rowCount:rows.length,
          inRequest:{nodeKind:'comparison_redesign_contract',pointer:`/promptNodes/${choiceIndex}/choiceSource/${field}`},
          sourceContract:{evidenceNumber:input.evidenceNumber,pointer:`/nativeInterventions/${field}`},
          instruction:'The complete choice index is already present at inRequest; each row has its exact original sourceContract. No choice was removed or ranked. Unshown source detail still requires read; index presence is not an executed measurement.'}};
      }
      if(nextNative!==native)inputs[key]={...input,value:{...input.value,nativeInterventions:nextNative}};
    }
    if(nextChoice!==choice)nodes=nodes.map((n,i)=>i===choiceIndex?{...n,choiceSource:nextChoice}:n);
  }
  const draft=inputs.wholeDraft?.value;
  const initialAuthor=node.role==='roster_workflow_strategy_decision'&&node.workId==='product:initial-army-and-plan'
    &&draft?.revision===0&&draft.plan===null
    &&(draft.mode==='fixed'&&draft.rosterEditAuthority==='preset_immutable'
      ||draft.mode==='editable'&&draft.candidateInput?.units?.length===0);
  const delegation=nodes.find(n=>n.kind==='pending_operation_choice_contract');
  const preparation=delegation?.preparationScope;
  const root=preparation?.sourceStateRef;
  const firstRoundRepair=node.role==='roster_workflow_experiment_planner'&&request.roundIndex===1
    &&delegation?.delegationKind==='input_repair'
    &&['single_unit_temporal_round_one','joint_temporal_round_one'].includes(preparation?.kind)
    &&root?.contextRef===null&&root.sourceStateHash===node.scope.source&&root.stateHash===node.scope.source;
  if(initialAuthor||firstRoundRepair){
    const supplementIndex=nodes.findIndex(n=>n.kind==='registered_native_measurement_supplements');
    const supplement=nodes[supplementIndex];
    if(supplement){
      const sources=[];
      for(const source of supplement.sources){
        const projection=source.projection,menu=projection?.actionEligibility;
        if(source.validity!=='current'||projection?.operation!=='inspect'
          ||menu?.phase!=='setup'||menu.bindingStatus!=='same_native_state'||menu.completeMenu!==true
          ||menu.stateRef?.sourceStateHash!==node.scope.source||menu.stateRef.stateHash!==node.scope.source
          ||!Array.isArray(menu.actions)||!menu.actions.length
          ||!menu.actions.every(row=>row.availability==='not_listed_in_named_state'
            &&Array.isArray(row.currentOptions)&&!row.currentOptions.length
            &&Array.isArray(row.disabledOptions)&&!row.disabledOptions.length)){
          sources.push(source);
          continue;
        }
        const entry=await publishContext(menu,{title:'Exact initial Setup action eligibility',
          kind:'capability_result',conditions:['Same saved Setup state; no current selectors or listed disabled options'],includeDirectory:true});
        synchronizePublishedDirectory(directory,entry,'ROSTER_SETUP_ACTION_DIRECTORY_NUMBER_MISMATCH');
        const {actions,...state}=menu;
        const {actionEligibility,...facts}=projection;
        sources.push({...source,projection:{...facts,actionEligibilityNavigation:{
          ...state,schema:'roster_setup_action_navigation_v1',sourceSchema:menu.schema,
          sourceEvidenceId:entry.id,sourceArtifactRef:entry.artifactRef,bodyRead:false,
          count:actions.length,currentOptionCount:0,disabledOptionCount:0,
          rows:actions.map(({pieceId,actionType},i)=>({pieceId,actionType,
            read:{evidenceNumber:entry.evidenceNumber,pointer:'/actions/'+i}})),
          read:{evidenceNumber:entry.evidenceNumber,pointer:''},
          instruction:'Each row is not_listed_in_named_state in this saved Setup menu. Read one row for its exact subject state and implemented routes. This menu supplies no current selectors and does not rule out later actions or other states.'}}});
      }
      nodes=nodes.map((n,i)=>i===supplementIndex?{...n,sources}:n);
    }
  }
  nodes=await prepareFixedInitialBuilderUpgradeNavigationV1(nodes,{node,draft,directory,publishContext});
  return {...request,promptNodes:nodes};
}

// Freeze decoding identities after all role-specific projections. Kept outside
// Provider input; the model need not reason about Host hashes or long causal IDs.
// The map reviewer needs the selected scene, not another search through general
// rule prose. Expose only saved, current, typed geometry sources. These are read
// addresses, never silently delivered observations or new experiment authority.
export async function prepareRosterMapReviewNavigationV1({request,directory,scope,readArtifact}){
  const assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const reviewScope=assigned?.inputs?.reviewScope?.value;
  if(assigned?.role!=='roster_workflow_final_review'||reviewScope?.kind!=='roster_domain_review_scope'
    ||reviewScope.domainId!=='map_and_arrival'||assigned.inputs.atomicReviewItem
    ||assigned.inputs.atomicReviewAggregate||request.promptNodes.some(n=>n.kind==='map_geometry_source_navigation'))return request;
  const entries=[];
  for(const {entry,operation,pointer,proofScope} of await selectRosterCurrentMapSourcesV1({directory,scope,readArtifact})){
    entries.push({evidenceNumber:entry.number,operation,sourceKind:entry.kind,
      reads:[{evidenceNumber:entry.number,pointer},{evidenceNumber:entry.number,pointer:'/receipt/mapBinding'},
        {evidenceNumber:entry.number,pointer:'/toolProofScope'}],
      proofScope,bodyRead:false});
  }
  return {...request,promptNodes:[...request.promptNodes,{kind:'map_geometry_source_navigation',version:1,
    workId:assigned.workId,domainId:reviewScope.domainId,entries,evidenceBodiesRead:false,acceptanceGranted:false,
    instruction:'These are registered completed map geometry receipts with current army/rules/map/source bindings, not official rule text or an experiment request. Read the exact source addresses for the selected map/deployment coordinates and proof limits. Geometry does NOT prove unit route legality, arrival round, joint control or future VP. Empty entries means no matching saved geometry was indexed here, not that the map is impossible or a new experiment is authorized. Other saved sources remain searchable with their actual kind. Review only the assigned current claims; any new experimental scope returns to the strategy owner.'}]};
}

// A failed strategic answer is not the current decision template. Keep the
// question ledger/mapper intact; move only its previous model rationale behind
// exact ordinary reads from the context already saved by the correction lane.
// No additional archive, inferred fact/classification or output format exists.
export async function prepareRosterAuthorDecisionViewV1({request,directory,readArtifact}){
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const command=request.promptNodes.find(n=>n.kind==='strategy_semantic_repair');
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const context=request.promptNodes.find(n=>n.kind==='local_correction_context'&&n.version===2);
  if(request.roundKind!=='roster_workflow_strategy_decision'||assigned?.role!==request.roundKind
    ||command?.version!==3||command.rationaleViewVersion||!command.questions?.length
    ||!feedback?.errors?.length||!feedback.errors.every(e=>e.code==='strategy_required_work_has_no_next_step')
    ||feedback.originalReplyRef!==command.originalReplyRef||!context?.source||!readArtifact)return request;
  const entry=directory.find(e=>e.number===context.source.evidenceNumber);
  if(!entry?.artifactRef||entry.id!==context.source.evidenceId
    ||!entry.id.startsWith('role-context:'+assigned.workId+':'))return request;
  const original=await readArtifact(entry.artifactRef);
  const originalAssignment=original?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const feedbackIndex=original?.promptNodes?.findIndex(n=>n.kind==='local_contract_feedback');
  const originalFeedback=original?.promptNodes?.[feedbackIndex];
  const ledger=originalFeedback?.originalOutput?.decisions?.length===1
    ?originalFeedback.originalOutput.decisions[0].dataQuestions:null;
  if(originalAssignment?.workId!==assigned.workId||!isDeepStrictEqual(originalAssignment.scope,assigned.scope)
    ||originalFeedback?.originalReplyRef!==command.originalReplyRef||!Array.isArray(ledger))return request;
  const deferred=[];
  const questions=command.questions.map(row=>{
    const {questionNumber,...value}=row,index=questionNumber-1,prior=ledger[index];
    if(!Number.isSafeInteger(questionNumber)||questionNumber<1||!text(prior?.publicReason)
      ||!isDeepStrictEqual(value,prior))return row;
    const {publicReason,...current}=row;
    const pointer=`/promptNodes/${feedbackIndex}/originalOutput/decisions/0/dataQuestions/${index}/publicReason`;
    deferred.push(questionNumber);
    return {...current,priorReason:{source:'deferred_context',evidenceNumber:entry.number,pointer,bodyOmitted:true,
      interpretationOnly:true,instruction:'Exact prior rejected MODEL rationale, not current task authority or a verified tool fact. Read it if needed to understand the history; use current task, current Plan and actual source facts to decide now.'}};
  });
  if(!deferred.length)return request;
  const instruction='Choose the NEXT operation for this current author assignment from the delivered Plan, actual facts and current permissions. The prior reply failed because required work had no next operation. Its question identities, recorded classifications and sources remain below; prior model reasons are separately readable historical proposals, not a template to repeat. Reconsider the operation and any affected reasons/classifications yourself. Unmentioned ledger entries remain unchanged in Host state, not automatically approved. Do not invent facts, discard necessary questions, force a roster change, repeat an unchanged experiment or claim an unexecuted operation occurred.';
  return {...request,userMessage:instruction+'\n'+request.userMessage,promptNodes:request.promptNodes.map(node=>{
    if(node===command)return {...node,stage:'owner_redecision',rationaleViewVersion:1,questions,
      priorRationaleSource:{evidenceNumber:entry.number,evidenceId:entry.id,originalReplyRef:command.originalReplyRef},
      deferredRationaleQuestionNumbers:deferred,ledgerChanged:false,acceptanceGranted:false,
      instruction:instruction+'\n'+node.instruction};
    if(node===feedback)return {...node,instruction};
    if(node===context)return {...node,instruction:instruction+' The existing deferred context remains available at its exact reader addresses. This stays within the same local assignment, not a new global Teach or a new experiment.'};
    return node;
  })};
}

export function finalizeRosterRoleRequestV1(request,{assignment,handles,directory}){
  request=prepareRosterRolePhaseRequestV1(request);
  const currentAssignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const correction=currentAssignment?.inputs?.assignmentCorrection;
  const correctedAuthor=currentAssignment?.workId===assignment.workId
    &&currentAssignment.role==='roster_workflow_strategy_decision'&&correction?.source==='literal'
    &&[1,2].includes(correction.value?.version);
  if(correctedAuthor&&correction.value.correctedQuestion!==currentAssignment.inputs.question?.value)
    invalid('ROSTER_ASSIGNMENT_CORRECTION_VIEW_MISMATCH',{workId:assignment.workId});
  // Fetch progress was measured against the request BEFORE these bodies arrived.
  // Re-project against the actual outgoing body set, after all role-specific
  // partitioning. Do not label freshly delivered data "notDelivered", and do
  // not mistake a saved/partial body for one actually present in this request.
  const promptNodes=request.promptNodes.map(node=>{
    if(node===currentAssignment){
      let inputs=node.inputs;
      if(correctedAuthor){
      // Full previous instructions/corrections stay in the workflow audit and
      // immutable requests. Do not repeat them as active literal instructions.
      const {previousQuestion,previousCorrection,...notice}=correction.value;
      inputs={...inputs,assignmentCorrection:{...correction,value:{
        ...notice,version:2,historyRetainedOutsideCurrentInstructions:true,
        instruction:'The task description was corrected at its source. workflow_role_assignment.inputs.question is the CURRENT instruction. The saved older request/reply IDs are provenance, not task authority. Previous rejected proposal reasons may quote superseded instructions; reconsider those reasons against the current task and actual facts. Old questions, source requirements, semantic errors, counts and tool limits remain. No fact, experiment, tactical choice or Plan is approved by this correction.'}}};
      const review=inputs.reviewResolutionAuthorization;
      if(review?.source==='literal'&&review.value?.version===1
        &&review.value.authorChoosesInquiry===true&&review.value.reviewerAuthorizesExperiments===false){
        inputs={...inputs,reviewResolutionAuthorization:{...review,value:{...review.value,
          instructionScope:'review_return_provenance_current_task_in_question',
          originalInstructionRetainedInWorkflow:true,
          instruction:ROSTER_REVIEW_OWNER_AUTHORITY_INSTRUCTION_V1}}};
      }
      }
      return {...node,inputs};
    }
    if(correctedAuthor&&node.kind==='strategy_semantic_repair')return {...node,
      priorProposalIsTaskAuthority:false,assignmentAuthority:'workflow_role_assignment.inputs.question'};
    if(node.kind!=='immutable_read_progress')return packRosterExactReadNodeV1(node);
    const reads=[...(node.alreadyDelivered??[]),...(node.notDelivered??[])]
      .map(({evidenceNumber,pointer})=>({evidenceNumber,pointer}));
    const current=projectRosterReadRequestProgressV1({request,reads,directory});
    return {kind:node.kind,version:2,scope:'current_request',
      alreadyDelivered:current.alreadyDelivered,notDelivered:current.notDelivered,
      previousRequest:node.previousRequest??{contextHash:node.deliveryContextHash,replyRef:node.originalReplyRef},
      acceptanceGranted:false,
      instruction:'This availability describes the CURRENT request. alreadyDelivered bodies are in exact_read_results NOW; use them without requesting the same pointer again. notDelivered bodies are not fully present now: inspect their actual status/navigation and request only a necessary missing detail. previousRequest identifies the historical fetch request, not current availability. Delivery proves neither truth nor sufficiency: make the assigned decision using the evidence, or identify a genuinely missing fact. No experiment, conclusion or Plan is approved by this transport receipt.'};
  });
  const draft=currentAssignment?.inputs?.wholeDraft?.value;
  const compactInitialAuthor=!request.providerInputEncodingVersion
    &&request.roundIndex===1&&assignment.role==='roster_workflow_strategy_decision'
    &&assignment.workId==='product:initial-army-and-plan'
    &&draft?.mode==='editable'&&draft.revision===0&&draft.plan===null&&draft.candidateInput?.units?.length===0;
  return {...request,promptNodes,
    ...(compactInitialAuthor?{providerInputEncodingVersion:ROSTER_FIRST_AUTHOR_INPUT_ENCODING_V1}:{}),
    roleCommunication:{version:1,workId:assignment.workId,role:assignment.role,
    reviewHandles:handles?.entries.map(({handle,checkId})=>({handle,checkId}))??[],
    evidenceNumbers:directory.map(({number,id,artifactRef})=>({number,id,artifactRef}))},
    contextHash:hash({workId:assignment.workId,role:assignment.role,promptNodes,
      contract:request.responseFormat.outputContractRef.hash})};
}

export function rosterRoleReplyCommunicationErrorsV1(request,reply){
  const errors=[],receipt=reply?.receipt;
  const add=(field,expected,actual)=>errors.push({field,expected,actual:actual??null});
  for(const field of ['contextHash','roundKind']){
    const expected=field==='roundKind'?request.roundKind:request.contextHash;
    if(receipt?.[field]!==expected)add(field,expected,receipt?.[field]);
  }
  for(const field of ['sessionId','roundIndex']){
    // Legacy immutable receipts did not include these fields. New requests use
    // the same Host-assigned identity in the production adapter and test adapter.
    if((request.roleCommunication&&!reply?.providerFailure||Object.hasOwn(receipt??{},field))
      &&receipt?.[field]!==request[field])add(field,request[field],receipt?.[field]);
  }
  // Completed malformed JSON has a preserved failure document, not an output
  // hash; it still belongs to one exact request and follows normal correction.
  if(!reply?.providerFailure&&receipt?.outputHash!==hash(reply?.output??null))
    add('outputHash',hash(reply?.output??null),receipt?.outputHash);
  if(receipt?.outputContractRef&&!isDeepStrictEqual(receipt.outputContractRef,request.responseFormat.outputContractRef))
    add('outputContractRef',request.responseFormat.outputContractRef,receipt.outputContractRef);
  return errors;
}

export function rosterToolReplyCommunicationErrorsV1({receipt,descriptor,args}){
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||!Object.keys(receipt).length)
    return [{field:'receipt',reason:'nonempty_tool_result_object_required'}];
  const errors=[],expected={sourceStateHash:descriptor.sourceStateHash,rulesRuntimeHash:descriptor.rulesRuntimeHash,
    baseStateHash:args.base?.kind==='branch'?args.base.branchStateHash:descriptor.sourceStateHash};
  // Validate identities declared by that native operation. Do not invent a
  // universal success schema for Builder/math/map results with different shapes.
  for(const [field,value]of Object.entries(expected))if(value!==undefined&&Object.hasOwn(receipt,field)&&receipt[field]!==value)
    errors.push({field,expected:value,actual:receipt[field]});
  return errors;
}

export async function quarantineRosterCommunicationV1({errors,operation,replyRef,requestRef,store,control,lane}){
  if(!errors.length)return;
  operation.communicationFailures=[...(operation.communicationFailures??[]),{
    lane,requestRef,replyRef,errors:structuredClone(errors),outcome:'unattributed',retryAuthorized:false}];
  await control.checkpointOperation(operation);
  throw Object.assign(Error('ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH'),{
    code:'ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH',dispatchOutcome:'completed_unattributed',
    detail:{lane,requestRef,replyRef,errors,originalPendingPreserved:true,automaticRetry:false}});
}
