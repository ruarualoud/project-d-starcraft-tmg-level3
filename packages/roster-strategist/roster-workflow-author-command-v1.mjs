import {rosterConstructionInquiryReturnV1,ROSTER_CONSTRUCTION_INQUIRY_INSTRUCTION_V1} from './roster-construction-inquiry-return-v1.mjs';
import {projectRosterConstructionCommandV1} from './roster-workflow-construction-command-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {projectRosterCatalogueEnvelopeV1} from './roster-workflow-role-envelope-v1.mjs';
import {projectRosterInvestigationSelectionV1} from './roster-workflow-fact-inquiry-v1.mjs';
import {projectRosterWorkflowDraftArgumentsV1} from './roster-workflow-draft-v1.mjs';
import {projectSchemaOwnedParentFieldsV1} from '../structured-generation/schema-owned-field-projection-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});

import {questionStates,authorQuestionStateSchema,selectRosterAuthorQuestionStateV1} from './roster-author-question-state-v1.mjs';
import {projectRosterPriorOperationV1} from './roster-author-operation-context-v1.mjs';

// The model chooses the next operation and updates only the relevant ledger
// entries. Host merges explicit operations; it never chooses a roster or fact.
export function prepareRosterAuthorCommandV1(request){
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const localConstructionReturn=rosterConstructionInquiryReturnV1(assignment);
  const parent=localConstructionReturn?assignment.inputs.priorAuthorDecision?.value:null;
  const savedParentDecision=parent?.decisions?.length===1?parent.decisions[0]:null;
  // The persisted outcome includes Host-derived partitions and bound evidence.
  // The command source copies semantic fields from the sent decision schema;
  // the exact outcome remains available at priorAuthorDecision/originalReplyRef.
  const parentFields=request.responseFormat?.schema?.properties?.decisions?.items?.properties;
  const parentDecision=savedParentDecision&&parentFields?Object.fromEntries(Object.keys(parentFields)
    .filter(k=>Object.hasOwn(savedParentDecision,k)).map(k=>[k,clone(savedParentDecision[k])])):null;
  const parentOriginal=parentDecision?{action:'finish',publicReason:parentDecision.publicReason,reads:[],catalogueQueries:[],decisions:[clone(parentDecision)]}:null;
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const delivery=request.promptNodes.find(n=>n.kind==='evidence_delivery_handoff');
  const handoff=request.promptNodes.find(n=>n.kind==='strategy_author_handoff');
  // A persisted owner handoff is an explicit source for the retained ledger,
  // even after the correction phase has correctly cleared its feedback.
  const ownerOriginal=handoff?.priorRejectedDecision?{action:'finish',
    publicReason:handoff.priorRejectedDecision.publicReason,reads:[],catalogueQueries:[],
    decisions:[clone(handoff.priorRejectedDecision)]}:null;
  const correcting=Boolean(feedback?.errors?.length);
  const envelope=projectRosterCatalogueEnvelopeV1({output:correcting?feedback.originalOutput:delivery?.pendingProposal??ownerOriginal??parentOriginal,
    enabled:Boolean(request.responseFormat?.schema?.properties?.catalogueQueries)});
  const original=envelope.output;
  const originalReplyRef=correcting?feedback.originalReplyRef:delivery?.originalReplyRef??handoff?.sourceReplyRef??parent?.originalReplyRef;
  const assignedRole=request.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.role;
  if(request.roundKind!=='roster_workflow_strategy_decision'
    ||(assignedRole?assignedRole!=='roster_workflow_strategy_decision':
      !request.promptNodes.some(n=>n.kind==='strategy_owner_assignment'||n.kind==='strategy_author_handoff'
        ||n.kind==='comparison_closure_contract'&&[1,2].includes(n.version)))
    ||!originalReplyRef
    ||original?.action!=='finish'||original.decisions?.length!==1)return null;
  // Role/assignment grants authority; diagnostic names must not change the
  // command protocol. Only structurally valid saved decisions can supply the
  // retained ledger. Semantic and source checks still run after projection.
  if(!validate(request.responseFormat.schema,original).ok)return null;
  const prior=original.decisions[0];
  if(!prior.dataQuestions?.length)return null;
  const props=request.responseFormat.schema.properties,dprops=props.decisions.items.properties;
  const qschema=dprops.dataQuestions.items;
  const questions=clone(prior.dataQuestions),restored=[];
  const assigned=request.promptNodes.find(n=>n.kind==='author_original_question_contract');
  // A saved child proposal cannot erase its author's selected inquiry from the
  // next command ledger. Append exact current-source records without renumbering
  // existing entries or rewriting the immutable paid proposal. No Host answer,
  // classification guess, evidence promotion or Plan operation is introduced.
  if(assigned?.version===2&&assigned.questionSource&&Array.isArray(assigned.questionRecords)){
    for(const question of assigned.questions){
      if(questions.some(q=>q.question===question))continue;
      const matches=assigned.questionRecords.filter(q=>q.question===question);
      if(matches.length!==1||!validate(qschema,matches[0]).ok)
        throw Error('ROSTER_AUTHOR_ASSIGNED_QUESTION_LEDGER_INVALID');
      const value=clone(matches[0]);questions.push(value);
      restored.push({questionNumber:questions.length,value:clone(value),source:clone(assigned.questionSource)});
    }
  }
  if(assigned?.version===1&&Array.isArray(assigned.questions)){
    for(const question of assigned.questions){
      if(questions.some(q=>q.question===question))continue;
      if(typeof question!=='string'||!question.trim())throw Error('ROSTER_AUTHOR_ASSIGNED_QUESTION_LEDGER_INVALID');
      // This legacy frontier carries only source text. Host supplies identity,
      // never an answer, classification or invented rationale.
      const value={question};questions.push(value);
      restored.push({questionNumber:questions.length,value:clone(value),requiresClassification:true,
        source:{kind:'assigned_question_text',sourceGoalId:assigned.sourceGoalId,sourceOwnerWorkId:assigned.sourceOwnerWorkId}});
    }
  }
  const decisionProps=clone(Object.fromEntries(Object.entries(dprops).filter(([key])=>key!=='dataQuestions')));
  const scopeFields=['observation','proofRequirement','roundScope','spatialScope'];
  const lineage=localConstructionReturn?[]:request.promptNodes.find(n=>n.kind==='investigation_continuation_contract')?.proofScopeLineage??[];
  const normalize=value=>String(value??'').replace(/\s+/gu,' ').trim();
  const scopeAssignments=lineage.flatMap(row=>questions.flatMap((q,i)=>normalize(q.question)===normalize(row.question)
    ?[{questionNumber:i+1,question:q.question,planClaimPath:row.proof.planClaimPath,
      scope:Object.fromEntries(scopeFields.map(k=>[k,clone(row.proof[k]??null)])),
      sourceWorkId:row.sourceWorkId,sourceResultRef:row.sourceResultRef}]:[]));
  if(scopeAssignments.length){
    const proof=decisionProps.nextInvestigation.anyOf.find(s=>s.type==='object').properties.proofContract.properties.obligations;
    const properties=proof.items.properties;
    const retained=Object.fromEntries(Object.entries(properties).filter(([k])=>!scopeFields.includes(k)));
    // Tag the obligation itself rather than nesting another scope object.
    // This stays within the existing Provider schema depth contract.
    proof.items={anyOf:[
      obj({kind:{type:'string',minLength:1,maxLength:65536,enum:['preserve_assigned']},...clone(retained)}),
      obj({kind:{type:'string',minLength:1,maxLength:65536,enum:['new_bounded']},...clone(properties)})]};
  }
  const grouped=new Map();
  for(const [i,q]of questions.entries())grouped.set(q.question,[...(grouped.get(q.question)??[]),i+1]);
  const duplicateQuestionGroups=[...grouped].filter(([,numbers])=>numbers.length>1)
    .map(([question,questionNumbers])=>({question,questionNumbers}));
  const duplicateNumbers=new Set(duplicateQuestionGroups.flatMap(g=>g.questionNumbers));
  const updateNumbers=questions.map((_,i)=>i+1).filter(n=>!duplicateNumbers.has(n));
  const questionState=authorQuestionStateSchema();
  const newQuestionSchema=clone(qschema);
  delete newQuestionSchema.properties.classification;
  newQuestionSchema.properties.questionState=clone(questionState);
  newQuestionSchema.required=newQuestionSchema.required.map(k=>k==='classification'?'questionState':k);
  const mergeSchema=duplicateQuestionGroups.length?{questionMerges:{type:'array',minItems:0,
    maxItems:duplicateQuestionGroups.length,items:obj({
      questionNumbers:{type:'array',minItems:2,items:{type:'integer',minimum:1,maximum:questions.length,enum:duplicateQuestionGroups.flatMap(g=>g.questionNumbers)}},
      questionState:clone(questionState),publicReason:clone(qschema.properties.publicReason),
      evidenceNumbers:clone(qschema.properties.evidenceNumbers)})}}:{};
  const schema=obj({action:{...clone(props.action),enum:['read','catalogue','decide']},publicReason:clone(props.publicReason),
    reads:clone(props.reads),catalogueQueries:clone(props.catalogueQueries),
    questionUpdates:{type:'array',minItems:0,...(!updateNumbers.length?{maxItems:0}:{}),items:obj({questionNumber:{type:'integer',minimum:1,maximum:questions.length,
      ...(duplicateQuestionGroups.length&&updateNumbers.length?{enum:updateNumbers}:{})},
      questionState:clone(questionState),publicReason:clone(qschema.properties.publicReason),
      evidenceNumbers:clone(qschema.properties.evidenceNumbers)})},
    newQuestions:{type:'array',minItems:0,items:newQuestionSchema},...mergeSchema,
    decision:{anyOf:[obj(clone(decisionProps)),{type:'null'}]}});
  if(localConstructionReturn){
    delete schema.properties.questionUpdates;delete schema.properties.questionMerges;
    schema.required=schema.required.filter(k=>!['questionUpdates','questionMerges'].includes(k));
  }
  const version=localConstructionReturn?'1.12.0':'1.11.0';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_author_command',version,
    schemaName:'roster_workflow_author_command_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.author_command',version,hash:hash('roster.author_command.v'+version)},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit model-owned next operation plus numbered ledger updates; same downstream semantic, Builder and source gates.'});
  const node={kind:'strategy_semantic_repair',version:3,commandProtocolVersion:3,questionMergeVersion:2,assignedQuestionLedgerVersion:2,originalReplyRef,
    questionStateVersion:1,questionStates:questionStates.map(([knowledge,decisionRole,classification,meaning])=>({knowledge,decisionRole,ledgerClassification:classification,meaning})),
    inquirySelectionVersion:1,readPreparationVersion:1,inquirySelection:projectRosterInvestigationSelectionV1({...prior,dataQuestions:questions}),
    commandShape:{requiredTopLevelFields:clone(schema.required),operationPath:'/decision/disposition',
      decisionRequiredFields:clone(schema.properties.decision.anyOf[0].required),
      allowedOperations:clone(dprops.disposition.enum),
      instruction:'action=decide submits a command; it is NOT the strategic operation. That operation is REQUIRED at decision.disposition. Put evidenceNumbers, alternatives, nextInvestigation, workflowBlocker, comparisonDesignRequest, comparisonClosureRequest, strategicChanges and mutation INSIDE decision, not at the root. read/catalogue require decision=null. Always include the root arrays required by this schema. No example or Host-selected disposition is supplied.'},
    stage:restored.length?'scope_reconciliation':correcting?'correction':handoff?'owner_decision':'source_confirmation',
    questions:questions.map((q,i)=>({questionNumber:i+1,...clone(q)})),
    duplicateQuestionGroups:clone(duplicateQuestionGroups),
    priorOperation:projectRosterPriorOperationV1(prior),priorOperationAccepted:false,
    instruction:'AUTHOR DECISION COMMAND: use decide with one explicit decision (operation, public reason, sources, alternatives, mutation, strategicChanges and nextInvestigation). Patch only changed ledger entries using questionUpdates; unlisted entries remain EXACTLY unchanged, and newQuestions append after the existing numbered entries. Never delete a necessary unknown. This is not an old full decisions envelope to copy. Returned author choices need your concrete choice or a genuinely missing prerequisite, not the same factual existence inquiry. Current army authority remains current; an available candidate can be read and selected/rejected, but is not yet adopted. An army/Plan change must use the actual structured mutation; no silent Host edits or approval. Read/catalogue use decision=null, questionUpdates=[],newQuestions=[]; they do not authorize a new experiment. Actual new evidence may change your mind. The original rejected reply remains stored in the exact context source; it is not the current answer template. Final budget/strategy checks remain mandatory. '+(localConstructionReturn?ROSTER_CONSTRUCTION_INQUIRY_INSTRUCTION_V1:"You own the pending strategic questions in this ledger after the fact investigation returns. The completed child investigation bounds its evidence, not your authority to make the next army/Plan choice. Retaining a supported current choice is valid, but repeating that a required choice belongs to a future author does not make that choice.")+' Current fixed/editable roster authority still applies; this command grants no additional editing permission.'};
  if(scopeAssignments.length){
    node.scopeSelectionVersion=1;
    node.assignedQuestionScopes=clone(scopeAssignments);
    node.instruction+=' SCOPE SELECTION: proof obligations do not rewrite observation/proofRequirement/roundScope/spatialScope. For a listed question and exact planClaimPath, set obligation kind="preserve_assigned"; Host copies that saved scope verbatim. It is an authorization identity, NOT proof or a required strategic choice. To test a different unit/time/observation, choose new_bounded with explicit observation/proofRequirement/roundScope/spatialScope and state the expectedNewObservation. You may reference the original question as its parent: Host appends a separate unresolved child from these exact authored values and binds the new proof to that child. You do not need to copy the question or allocate its new number. Existing question state and proof scopes remain unchanged unless you explicitly update that state; the child cannot discharge the parent or assert that a locally tested unit proves an untested one. You may also explicitly append a separate question in newQuestions. You may instead make a supported retain/revise/blocker decision through the ordinary contract; no investigation or winner is forced.';
  }
  const promptNodes=request.promptNodes.map(n=>{
    if(n.kind==='strategy_author_handoff'){
      const {priorRejectedDecision,...remaining}=n;
      return {...remaining,priorRejectedDecisionBodyOmitted:true};
    }
    if(n.kind==='evidence_delivery_handoff'){
      const {pendingProposal,...remaining}=n;
      return {...remaining,pendingProposalBodyOmitted:true};
    }
    if(n!==feedback)return n;
    const {originalOutput,...remaining}=n;
    return {...remaining,originalOutputIsHostProjectionState:true};
  });
  if(duplicateQuestionGroups.length)node.instruction+=' Exact-wording duplicates are listed in duplicateQuestionGroups. questionMerges is an explicit author operation: select at least two entries with IDENTICAL question text and provide the surviving questionState, publicReason and evidenceNumbers yourself. The host will preserve all originals in the projection record; it never resolves conflicting claims or upgrades evidence. Do not merge different questions or use questionUpdates for a merged member. Use CURRENT displayed pre-merge numbers in nextInvestigation and proofContract; choose only ONE member of each merged group and ONE corresponding proof obligation. Host remaps those references after compaction. Keep different proof obligations as separate questions, not a merged duplicate. Unmerged entries stay unchanged. This cannot delete a necessary fact, turn it into a choice or bypass source/coverage checks. read/catalogue require questionMerges=[].';
  if(restored.length){
    node.restoredOriginalQuestions=clone(restored);
    node.instruction+=' This is ORIGINAL QUESTION RECONCILIATION, not approval or confirmation of the prior choice. The prior proposal omitted an actually assigned factual predicate. It is restored as an unresolved source-authored ledger entry, with its exact source wording. If requiresClassification is true, the source supplied only text: explicitly provide questionState, publicReason and evidenceNumbers for that item before deciding. Host supplies no classification or answer. Otherwise preserve the original source-authored state until you explicitly update it. Existing entries and indices are unchanged. Explicitly address the restored question; accepting uncertainty in a different choice entry does not answer it. Use the questionNumber shown in THIS command ledger for updates and nextInvestigation, not an older source\'s numbering. Original missing predicates: '+JSON.stringify(restored.map(r=>({questionNumber:r.questionNumber,question:r.value.question})))+'. '+assigned.instruction;
  }else if(!correcting&&!handoff)node.instruction+=' This is NORMAL SOURCE CONFIRMATION, not an error-repair turn. The ledger is reconstructed with the original saved command mapper; the pending proposal is not accepted. Use the newly delivered sources to confirm or change your operation and only the affected question entries. The same source, semantic and Builder checks remain; no source-read or proposal is automatically a fact.';
  node.instruction+=' QUESTION STATE: submit questionState={knowledge,decisionRole} for each changed/new/merged question, NOT the old classification field. Decide separately whether the fact is established and whether the CURRENT decision actually requires its proof. Do not retain a required dependency solely because the fact is unresolved or an earlier author/reviewer called it necessary. If you choose required_for_current_decision, name the adopted dependency and select its real next operation; a reason saying your decision does not require that proof contradicts this choice. If you deliberately adopt a conditional future intent or decline an optional investigation, select that explicit role and preserve the unproven fact, conditions and reopen trigger. No factual question is deleted or automatically answered, and existing current factual requirements cannot be waived by labelling them conditional. Host maps only your explicit pair to the existing ledger and retains it in the projection record; independent source/coverage and release review still govern.';
  node.instruction+=' Prefer separate read and decide turns. If a decide command explicitly includes source reads, it is only a pending proposal: the normal reader fetches those sources and returns to you for confirmation before any mutation. That fetch does not apply the decision, approve its citations or erase other errors. Catalogue searches cannot be mixed with a decision.';
  const correctionTask=request.promptNodes.find(n=>n.kind==='local_correction_context')?.correctionTask;
  if(correctionTask==='construction_next_action'&&!localConstructionReturn){
    node.correctionTask=correctionTask;
    node.instruction='This is the construction AUTHOR choosing the next operation, not a classification-only correction. Keep the established facts and reason for rejecting an individual branch. The current mineral construction target remains unfinished: choose an actual permitted army/Plan revision, a bounded decision-changing inquiry or a supported external blocker; Builder does not rank strategy for you. No global-optimality proof or forced candidate is required. '+node.instruction;
  }
  if(localConstructionReturn){
    node.constructionInquiryInstructionVersion=2;
    node.stage='local_inquiry_decision';node.questions=[];node.duplicateQuestionGroups=[];
    node.inquirySelection={newQuestionStartNumber:questions.length+1,parentQuestionsWritable:false};
    delete node.priorOperation;delete node.restoredOriginalQuestions;
    node.parentLedger={questionCount:questions.length,readOnly:true,originalReplyRef};
    node.instruction=ROSTER_CONSTRUCTION_INQUIRY_INSTRUCTION_V1+' '+node.commandShape.instruction
      +' The parent question ledger is Host-owned at this local return and is preserved byte-for-value; do not submit questionUpdates/questionMerges. You may append genuinely new local facts in newQuestions using questionState={knowledge,decisionRole}; their numbers start at '+(questions.length+1)+'. A new investigation may select only those new predicates. Current facts, unchanged parent unknowns and global construction targets remain required after this local choice. Read/catalogue use decision=null and newQuestions=[]. An authored revise still uses the ordinary structured mutation and Native audit. No Host-selected disposition or strategic ranking.';
  }
  const next={...request,promptNodes:[...promptNodes,node],
    ...(localConstructionReturn?{constructionInquiryInstructionVersion:2}:{}),
    strategyRepairState:{originalOutput:clone(original),originalResponseFormat:clone(request.responseFormat),questionStateVersion:1,
      inertEnvelopeProjection:clone(envelope.projection),
      ...(localConstructionReturn?{localParentLedgerVersion:1,retainedQuestionLedger:clone(questions)}:{}),
      ...(scopeAssignments.length?{scopeSelectionVersion:1,scopeAssignments:clone(scopeAssignments)}:{}),
      ...(restored.length?{retainedQuestionLedger:clone(questions),originalQuestionRestorations:clone(restored)}:{})},
    userMessage:node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,
    responseFormat:next.responseFormat,projectionSourceHash:hash(next.strategyRepairState)});
  return next;
}

export function projectRosterAuthorCommandV1({request,output}){
  if(request.constructionCommandState?.version===1){
    const compiled=projectRosterConstructionCommandV1({request,output});if(compiled.errors.length)return compiled;
    const mapped=projectRosterAuthorCommandV1({request:compiled.request,output:compiled.output});
    return {...mapped,wireOutput:output,projection:[...compiled.projection,...mapped.projection]};
  }
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  // Apply the SAME one-hop schema ownership used by ordinary author replies
  // before this compact wire's validation. Never synthesize a missing value,
  // overwrite an occupied parent or reinterpret an investigation/Plan choice.
  const ownership=projectSchemaOwnedParentFieldsV1(output,request.responseFormat.schema);
  output=ownership.output;
  const draftProjection=[...ownership.projection];
  // The compact wire command must share the ordinary author's read/write
  // boundary BEFORE schema validation. Costs/hashes are Host recomputations,
  // not editable strategy; retain their exact annotations for the trace.
  if(output?.action==='decide'&&output.decision?.mutation){
    const schema=request.strategyRepairState?.originalResponseFormat?.schema
      ?.properties.decisions?.items?.properties.mutation?.anyOf?.find(s=>s.type==='object');
    if(schema){
      output=clone(output);
      const projected=projectRosterWorkflowDraftArgumentsV1(output.decision.mutation,{
        planRecordEdits:Boolean(schema.properties.plan?.properties.componentPurposeEdits),
        identityRecordEdits:Boolean(schema.properties.plan?.properties.invalidationTriggerEdits),
        branchSelection:Boolean(schema.properties.rosterBranchSelection),
        candidateSelection:Boolean(schema.properties.rosterCandidateSelection)});
      output.decision.mutation=projected.mutation;
      draftProjection.push(...projected.ignored.map(row=>({from:'/decision/mutation'+row.path,
        original:clone(row.value),reason:row.reason,
        rule:row.reason==='host_recomputed_not_writable'?'author_command_host_derived_field_v1':'author_command_draft_argument_projection_v1',
        nativeAuditStillRequired:true,semanticApprovalGranted:false})));
    }
  }
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('author_command_schema',{issues:checked.issues});
  const state=request.strategyRepairState;
  if(!state?.originalOutput||!state.originalResponseFormat)return reject('author_command_projection_state_missing');
  if(state.localParentLedgerVersion===1){
    output={...clone(output),questionUpdates:[],questionMerges:[]};
    const parentCount=(state.retainedQuestionLedger??state.originalOutput.decisions[0].dataQuestions).length;
    if(output.decision?.nextInvestigation?.questionNumbers?.some(n=>n<=parentCount))
      return reject('local_inquiry_parent_predicate_not_owned',{parentCount,instruction:'Preserve parent obligations. Append a genuinely new local predicate in newQuestions before requesting its observation.'});
  }
  const questionProjection=[];
  if(state.questionStateVersion===1){
    output=clone(output);
    for(const field of ['questionUpdates','newQuestions','questionMerges']){
      if(!Array.isArray(output[field]))continue;
      for(const [index,item]of output[field].entries()){
        const selected=selectRosterAuthorQuestionStateV1(item.questionState);
        if(!selected)return reject('author_command_question_state_invalid',{field,index});
        const {questionState,...remaining}=item;
        output[field][index]={...remaining,classification:selected[2]};
        questionProjection.push({from:`/${field}/${index}/questionState`,original:clone(questionState),
          value:selected[2],rule:'model_authored_question_state_v1',factApprovalGranted:false,planApprovalGranted:false});
      }
    }
  }
  if(['read','catalogue'].includes(output.action)){
    if(output.decision||output.questionUpdates.length||output.newQuestions.length||output.questionMerges?.length)return reject('author_command_read_and_write_mixed');
    return {output:{action:output.action,publicReason:output.publicReason,reads:clone(output.reads),
      catalogueQueries:clone(output.catalogueQueries),decisions:[]},projection:[],errors:[]};
  }
  if(!output.decision)return reject('author_command_decision_required');
  if(output.catalogueQueries.length)return reject('author_command_catalogue_and_decision_mixed',{
    instruction:'Search with action=catalogue and decision=null first, then read its sources and decide. The pending decision has not been applied.'});
  const original=state.originalOutput,questions=clone(state.retainedQuestionLedger??original.decisions[0].dataQuestions),seen=new Set();
  const aliases=new Map(),mergeRecords=[];
  for(const merge of output.questionMerges??[]){
    const numbers=merge.questionNumbers;
    if(numbers.length<2||new Set(numbers).size!==numbers.length||numbers.some(n=>!Number.isSafeInteger(n)||!questions[n-1]
      ||aliases.has(n)))return reject('author_command_question_merge_conflict');
    const overlapping=output.questionUpdates.filter(p=>numbers.includes(p.questionNumber));
    if(overlapping.some(p=>p.classification!==merge.classification||!isDeepStrictEqual(p.evidenceNumbers,merge.evidenceNumbers)))
      return reject('author_command_question_merge_conflict');
    const originals=numbers.map(n=>clone(questions[n-1]));
    if(originals.some(q=>q.question!==originals[0].question))return reject('author_command_question_merge_predicate_mismatch');
    const canonical=Math.min(...numbers),{questionNumbers,...authored}=merge;
    for(const n of numbers)aliases.set(n,canonical);
    // Legacy commands allowed two writes to the same predicate. Only agreeing
    // classifications AND sources compose; preserve both authored rationales.
    // Source/semantic checks still inspect the result. No last-write-wins.
    const value={question:originals[0].question,...clone(authored),
      publicReason:[...new Set([authored.publicReason,...overlapping.map(p=>p.publicReason)])].join('\n\n')};
    questions[canonical-1]=value;
    mergeRecords.push({sourceQuestionNumbers:clone(numbers),originals,value:clone(value),canonical});
  }
  const projection=[...draftProjection,...questionProjection,...clone(state.inertEnvelopeProjection??[]),...(state.originalQuestionRestorations??[]).map(r=>({to:`/decisions/0/dataQuestions/${r.questionNumber-1}`,
    original:null,value:clone(r.value),source:clone(r.source),rule:'retained_original_assignment_question_v1'}))];
  for(const patch of output.questionUpdates){
    if(seen.has(patch.questionNumber))return reject('author_command_duplicate_question_update');
    seen.add(patch.questionNumber);
    if(aliases.has(patch.questionNumber)){
      projection.push({sourceQuestionNumber:patch.questionNumber,value:clone(patch),
        rule:'lossless_agreeing_question_write_v1'});continue;
    }
    const index=patch.questionNumber-1,{questionNumber,...update}=patch;
    projection.push({to:`/decisions/0/dataQuestions/${index}`,original:clone(questions[index]),
      value:{...questions[index],...clone(update)},rule:'model_authored_question_update_v1'});
    questions[index]={...questions[index],...clone(update)};
  }
  const missingAssigned=(state.originalQuestionRestorations??[]).filter(r=>r.requiresClassification&&!seen.has(r.questionNumber));
  if(missingAssigned.length)return reject('author_command_assigned_question_update_required',{
    questionNumbers:missingAssigned.map(r=>r.questionNumber),
    instruction:'Classify each exposed source-only assigned question explicitly; Host cannot infer its state from similar wording or a different numbered answer.'});
  const names=new Set(questions.map(q=>q.question));
  for(const question of output.newQuestions){
    if(names.has(question.question))return reject('author_command_duplicate_question_append');
    names.add(question.question);questions.push(clone(question));
    projection.push({to:`/decisions/0/dataQuestions/${questions.length-1}`,original:null,value:clone(question),rule:'model_authored_question_append_v1'});
  }
  const numberMap=new Map(),compacted=[];
  for(const [i,q]of questions.entries())if(!aliases.has(i+1)||aliases.get(i+1)===i+1){
    numberMap.set(i+1,compacted.length+1);compacted.push(q);
  }
  for(const [n,canonical]of aliases)numberMap.set(n,numberMap.get(canonical));
  const decision={...clone(output.decision),dataQuestions:compacted};
  const boundedQuestionRemaps=new Map();
  if(state.scopeSelectionVersion===1&&decision.nextInvestigation){
    for(const proof of decision.nextInvestigation.proofContract.obligations){
      const selection=proof.kind;
      const known=state.scopeAssignments.filter(row=>row.questionNumber===proof.questionNumber);
      let scope,source;
      if(selection==='preserve_assigned'){
        const exact=known.filter(row=>row.planClaimPath===proof.planClaimPath);
        if(exact.length!==1)return reject('author_scope_assignment_missing',{
          questionNumber:proof.questionNumber,planClaimPath:proof.planClaimPath});
        scope=exact[0].scope;source=exact[0];
      }else{
        scope=Object.fromEntries(['observation','proofRequirement','roundScope','spatialScope'].map(k=>[k,clone(proof[k])]));
        if(known.length){
          const parentNumber=proof.questionNumber,next=decision.nextInvestigation;
          if(decision.disposition!=='investigate'||!next.questionNumbers.includes(parentNumber)
            ||!next.expectedNewObservation?.trim()||!next.whyExistingEvidenceInsufficient?.trim()
            ||boundedQuestionRemaps.has(parentNumber))return reject('author_scope_child_binding_ambiguous',{questionNumber:parentNumber});
          const same=known.filter(row=>row.planClaimPath===proof.planClaimPath&&isDeepStrictEqual(row.scope,scope));
          if(same.length===1){source=same[0];}
          else{
            // The author has explicitly requested a NEW scoped observation.
            // Allocate its ledger identity here; never overwrite the parent's
            // scope, answer or dependencies and never manufacture a finding.
            const value={question:next.expectedNewObservation+'\n'+JSON.stringify({planClaimPath:proof.planClaimPath,...scope}),
              classification:'necessary_fact',publicReason:next.whyExistingEvidenceInsufficient,evidenceNumbers:[]};
            if(questions.some(q=>q.question===value.question))return reject('author_scope_child_already_exists',{
              questionNumber:parentNumber,instruction:'Select the existing bounded child question. Its evidence and outcome remain unchanged.'});
            const childNumber=questions.length+1;
            questions.push(value);compacted.push(value);numberMap.set(childNumber,compacted.length);
            boundedQuestionRemaps.set(parentNumber,childNumber);proof.questionNumber=childNumber;
            projection.push({parentQuestionNumber:parentNumber,childQuestionNumber:childNumber,
              parentQuestion:clone(questions[parentNumber-1]),value:clone(value),
              authoredScope:clone(scope),sourceAssignments:clone(known),
              rule:'host_bound_explicit_new_question_v1',factApprovalGranted:false,planApprovalGranted:false});
          }
        }
      }
      delete proof.kind;Object.assign(proof,clone(scope));
      projection.push({questionNumber:proof.questionNumber,planClaimPath:proof.planClaimPath,
        selection:clone(selection),value:clone(scope),...(source?{source:clone(source)}:{}),
        rule:source?'host_preserved_assigned_question_scope_v1':'model_authored_new_question_scope_v1',
        factApprovalGranted:false});
    }
  }
  if(boundedQuestionRemaps.size)decision.nextInvestigation.questionNumbers=
    decision.nextInvestigation.questionNumbers.map(n=>boundedQuestionRemaps.get(n)??n);
  if(mergeRecords.length&&decision.nextInvestigation){
    const next=decision.nextInvestigation;
    const remap=n=>numberMap.get(n);
    if(next.questionNumbers.some(n=>!remap(n))||next.proofContract?.obligations.some(o=>!remap(o.questionNumber)))
      return reject('author_command_merged_investigation_reference_invalid');
    const selected=next.questionNumbers.map(remap),obligations=next.proofContract?.obligations.map(o=>({...o,questionNumber:remap(o.questionNumber)}));
    if(new Set(selected).size!==selected.length||obligations&&new Set(obligations.map(o=>o.questionNumber)).size!==obligations.length)
      return reject('author_command_merged_investigation_duplicate',{instruction:'Choose ONE displayed pre-merge member and ONE authored proof obligation per merged question. Host will not choose, combine or discard competing proof obligations.'});
    next.questionNumbers=selected;if(obligations)next.proofContract.obligations=obligations;
  }
  for(const record of mergeRecords){
    const {canonical,...provenance}=record;
    projection.push({to:`/decisions/0/dataQuestions/${numberMap.get(canonical)-1}`,...provenance,
      rule:'model_authored_exact_question_merge_v1'});
  }
  if(mergeRecords.length)projection.push({to:'/decisions/0',originalQuestionNumbers:questions.map((_,i)=>i+1),
    projectedQuestionNumbers:questions.map((_,i)=>numberMap.get(i+1)),
    originalNextInvestigation:clone(output.decision.nextInvestigation),projectedNextInvestigation:clone(decision.nextInvestigation),
    rule:'exact_question_identity_reference_remap_v1'});
  for(const key of Object.keys(output.decision))projection.push({to:`/decisions/0/${key}`,
    original:clone(original.decisions[0][key]),value:clone(decision[key]),rule:'model_authored_next_operation_v1'});
  // Match the ordinary author envelope: finish+reads is source preparation,
  // never execution. The shared role runner retains this proposal, fetches
  // exact bodies and requires another author confirmation. Dropping the reads
  // would apply an unconfirmed choice; rejecting them here bypassed that lane.
  if(output.reads.length)projection.push({from:'/reads',to:'/reads',value:clone(output.reads),
    rule:'author_command_pending_source_read_v1',conclusionAccepted:false});
  return {output:{action:'finish',publicReason:output.publicReason,reads:clone(output.reads),catalogueQueries:[],decisions:[decision]},projection,errors:[]};
}

// A legacy compact command omitted a required exact predicate from its address
// space. One new addressed author choice, never reinterpret a paid answer.
export function projectRosterAssignedLedgerRecoveryV1({work,request}){
  const errors=work?.operationState?.correction?.errors??[],node=request?.promptNodes?.find(n=>n.kind==='strategy_semantic_repair'),assigned=request?.promptNodes?.find(n=>n.kind==='author_original_question_contract');
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
    ||node?.version!==3||node.assignedQuestionLedgerVersion===2||assigned?.version!==1
    ||!work.operationState?.correction?.originalReplyRef||!errors.length
    ||!errors.every(e=>e.code==='author_original_question_coverage'&&e.missingQuestions?.length&&!e.duplicateQuestions?.length)
    ||!errors.flatMap(e=>e.missingQuestions).every(q=>assigned.questions.includes(q)&&!node.questions.some(x=>x.question===q)))return null;
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind:'author_assigned_ledger_reconciliation',feedbackVersion:'assigned-ledger-v2',
    recoveryKey:hash({workId:work.id,repairKind:'author_assigned_ledger_reconciliation',version:2}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false,
    instruction:'Host has restored an exact delegated question missing from the previous numbered command. Preserve earlier replies and resolved entries. Address the newly exposed source-only item with an explicit state/reason and actual sources; similar wording is not an answer and no experiment or final approval is forced.'};
}
