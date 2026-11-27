import {projectRosterSavedAuthorQuestionsV1} from './roster-author-question-state-v1.mjs';
import {projectRosterPriorOperationV1} from './roster-author-operation-context-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {projectSchemaOwnedParentFieldsV1,projectSchemaOwnedChildFieldsV1,projectSchemaUnknownNullFieldsV1} from '../structured-generation/schema-owned-field-projection-v1.mjs';
const copy=structuredClone;
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const controlErrors=new Set(['comparison_revision_requires_resolution','comparison_retention_requires_resolution','comparison_closure_requires_explicit_scoped_choice',
  'comparison_redesign_requires_scoped_control_request']);
export function isRosterComparisonControlRequestV1(request){
  return Boolean(comparisonCommandSource(request));
}
function comparisonCommandSource(request){
  const feedback=request?.promptNodes?.find(n=>n.kind==='local_contract_feedback');
  if(request?.roundKind!=='roster_workflow_strategy_decision'
    ||!request.promptNodes.some(n=>['comparison_closure_contract','comparison_redesign_contract'].includes(n.kind)&&[1,2,3,4,5,6].includes(n.version)))return null;
  const original=feedback?.originalOutput,prior=original?.decisions?.[0];
  // The actual selected operation determines the wire protocol. A second
  // diagnostic (e.g. pending questions) must not disable the exclusive command.
  if(feedback?.errors?.length&&original?.action==='finish'&&original.decisions?.length===1
    &&(prior.comparisonDesignRequest||prior.comparisonClosureRequest
      ||feedback.errors.every(e=>controlErrors.has(e.code)||e.code?.startsWith('comparison_control_'))))
    return {original,originalReplyRef:feedback.originalReplyRef,stage:'correction'};
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  const seed=inputs?.comparisonControlSeed?.value,accepted=inputs?.priorAuthorDecision;
  if(!seed?.originalReplyRef||accepted?.source!=='evidence'||!accepted.value?.dataQuestions?.length)return null;
  return {original:{action:'finish',decisions:[copy(accepted.value)]},originalReplyRef:seed.originalReplyRef,
    stage:'author_decision',source:{evidenceId:accepted.evidenceId??accepted.id,pointer:accepted.pointer??'/decisions/0',
      sourceKind:'saved_normalized_decision',rawReplyUnchanged:true}};
}

// Lossless factoring of repeated metadata. Every child, condition, source and
// unknown extension field survives, including row order. No parent read granted.
export function packRosterExactReadRowsV1(rows){
  const groups=[],byCommon=new Map();
  rows.forEach((row,index)=>{
    const {pointer,value,requestedPointer,deliveryKind,...common}=row,key=JSON.stringify(common);
    let group=byCommon.get(key);if(!group){group={common:copy(common),children:[]};groups.push(group);byCommon.set(key,group);}
    group.children.push({index,...(Object.hasOwn(row,'pointer')?{pointer}:{}),
      ...(Object.hasOwn(row,'value')?{value:copy(value)}:{}),
      ...(Object.hasOwn(row,'requestedPointer')?{requestedPointer}:{}),...(Object.hasOwn(row,'deliveryKind')?{deliveryKind}:{})});
  });return groups;
}
export function rosterExactReadRowsV1(node){
  if(Array.isArray(node?.results))return node.results;
  if(node?.encoding!=='shared_metadata_v1')return [];
  return (node.groups??[]).flatMap(g=>g.children.map(c=>({index:c.index,row:{...copy(g.common),
    ...Object.fromEntries(Object.entries(c).filter(([k])=>k!=='index'))}}))).sort((a,b)=>a.index-b.index).map(r=>r.row);
}

// One lossless encoding for every role. No size cap, selected-field whitelist
// or new source interpretation: only repeated metadata is factored. Already
// grouped packets stay identical, including their original instructions.
export function packRosterExactReadNodeV1(node){
  if(node?.kind!=='exact_read_results'||!Array.isArray(node.results)||node.results.length<2)return node;
  const {results,...rest}=node;
  const packed={...copy(rest),encoding:'shared_metadata_v1',groups:packRosterExactReadRowsV1(results),
    sharedMetadataInstruction:'Each group.common applies to EVERY child. Child index preserves the original row order; pointer/value/requestedPointer/deliveryKind remain exact. A missing value is not null or zero; a child read is not a whole-source read. No value, source condition, status or uncertainty is omitted. Ordinary source reads remain available.'};
  return JSON.stringify(packed).length<JSON.stringify(node).length?packed:node;
}

export function focusRosterComparisonControlContextV1(request,source){
  if(!isRosterComparisonControlRequestV1(request))return null;
  const deferred=[],defer=(name,pointer)=>{deferred.push({name,pointer});return {
    source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true};};
  const background=new Set(['requirements','strategicHypothesisChallenge','questionEvidenceDirectory','decisionEvidenceDirectory',
    'activeHypothesisTests','previousBatch','batchProgress','unfinishedMethods','completedNativeTransitions']);
  const directories=new Set(['assigned_evidence_references','historical_evidence_directory','historical_assignment_context']);
  const selected=new Set();
  for(const node of request.promptNodes){
    if(node.kind==='exact_read_results')for(const row of rosterExactReadRowsV1(node))selected.add(row.evidenceNumber);
    if(node.kind==='workflow_role_assignment')for(const input of Object.values(node.inputs??{}))if(input.evidenceNumber)selected.add(input.evidenceNumber);
  }
  const nodes=request.promptNodes.flatMap((node,i)=>{
    const pointer='/promptNodes/'+i;
    if(directories.has(node.kind)){defer(node.kind,pointer);return [];}
    if(node.kind==='workflow_role_assignment')return [{...copy(node),inputs:Object.fromEntries(Object.entries(node.inputs).map(([key,input])=>{
      if(background.has(key)||/^batchFacts\d+$/u.test(key))return [key,defer(key,pointer+'/inputs/'+key.replaceAll('~','~0').replaceAll('/','~1'))];
      return [key,copy(input)];
    }))}];
    if(node.kind==='available_evidence_directory'){
      defer(node.kind,pointer);return [{...copy(node),entries:node.entries.filter(e=>selected.has(e.number))}];
    }
    if(node.kind==='exact_read_results'){
      return [packRosterExactReadNodeV1(node)];
    }
    if(node.kind==='evidence_delivery_handoff'){
      const {pendingProposal,...rest}=node;defer('priorRejectedProposal',pointer);return [{...copy(rest),pendingProposalBodyOmitted:true}];
    }
    return [copy(node)];
  });
  nodes.push({kind:'comparison_context_navigation',version:1,source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
    instruction:'The original input is saved unchanged at this source. Deferred global work/history is NOT missing evidence. Read exact listed pointers or use the normal evidence catalogue. Current whole Plan/army, assigned comparison and actual measurement data stay inline. This stage chooses the NEXT operation only; it does not answer unrelated global questions or approve a Plan.'});
  return {...request,promptNodes:nodes};
}

export function prepareRosterComparisonControlCommandV1(request){
  if(!isRosterComparisonControlRequestV1(request))return null;
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const source=comparisonCommandSource(request);
  const original=source.original,prior=original.decisions[0],questions=prior.dataQuestions;
  if(!questions?.length)return null;
  const props=request.responseFormat.schema.properties,dprops=props.decisions.items.properties;
  const qprops=dprops.dataQuestions.items.properties;
  const nonnull=schema=>{const branches=schema.anyOf?.filter(s=>s.type!=='null');
    return copy(!branches?schema:branches.length===1?branches[0]:{anyOf:branches});};
  const kind=value=>({type:'string',minLength:1,maxLength:64,enum:[value]});
  // One tagged payload makes two concurrent operations unrepresentable. The
  // model chooses their order; its unexecuted proposal stays in saved state.
  const operations=[
    object({kind:kind('investigate'),request:nonnull(dprops.nextInvestigation)}),
    object({kind:kind('redesign'),request:nonnull(dprops.comparisonDesignRequest)}),
    object({kind:kind('request_closure'),request:nonnull(dprops.comparisonClosureRequest),
      mutation:copy(dprops.mutation),strategicChanges:copy(dprops.strategicChanges)}),
    object({kind:kind('revise_strategy'),mutation:nonnull(dprops.mutation),strategicChanges:copy(dprops.strategicChanges)}),
    object({kind:kind('block'),request:nonnull(dprops.workflowBlocker)}),
  ];
  const schema=object({
    action:{...copy(props.action),enum:['read','catalogue','operate']},
    publicReason:copy(props.publicReason),reads:copy(props.reads),catalogueQueries:copy(props.catalogueQueries),
    questionUpdates:{type:'array',minItems:0,items:object({questionNumber:{type:'integer',minimum:1,maximum:questions.length},
      classification:copy(qprops.classification),publicReason:copy(qprops.publicReason),evidenceNumbers:copy(qprops.evidenceNumbers)})},
    newQuestions:copy(dprops.dataQuestions),evidenceNumbers:copy(dprops.evidenceNumbers),alternatives:copy(dprops.alternatives),
    operation:nullable({anyOf:operations}),
  });
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_comparison_control',version:'1.1.2',
    schemaName:'roster_workflow_comparison_control_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.comparison_control',version:'1.1.2',hash:hash('roster.comparison_control.v1.1.2')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'One explicit comparison control operation; unchanged factual, Builder, source and review gates.'});
  const node={kind:'strategy_semantic_repair',version:5,originalReplyRef:source.originalReplyRef,
    stage:source.stage,...(source.source?{ledgerSource:copy(source.source)}:{}),
    questions:questions.map((q,i)=>({questionNumber:i+1,...copy(q)})),
    priorOperation:projectRosterPriorOperationV1(prior),priorOperationAccepted:false,
    pendingProposal:{sourceReplyRef:source.originalReplyRef,applied:false,
      hasRevision:Boolean(prior.mutation),hasDesignRequest:Boolean(prior.comparisonDesignRequest),
      instruction:'Both proposed operations remain in the immutable original reply. Select which operation to submit NOW; no other proposal is applied, accepted or silently scheduled. After its result, the author can reconsider the remaining proposal against the current draft and evidence.'},
    instruction:'Select ONE next operation for the assigned comparison using action=operate and operation.kind. investigate takes one bounded fact authorization; it may deliberately select an optional_probe with a complete proofContract for its local missing fact, without making the parent comparison mandatory. redesign submits YOUR actual comparison choice, conditional objective, opportunity cost and result-to-choice policy for value review; the later designer implements those declared choices, not chooses the missing alternative or objective for you. If a chosen candidate lacks a Native legality/cost verdict, investigate that concrete candidate first, or choose an independently justified closure; do not submit a request merely telling a later author to decide. request_closure takes an independently reviewed conditional choice and may also carry mutation/strategicChanges to correct unsupported current Plan wording (otherwise null/[]); block names a concrete unavailable prerequisite; revise_strategy contains the actual Plan/army mutation and strategicChanges. Only fields of the selected branch are allowed. Redesign and Plan revision are separate operations; you choose which goes first. The previous rejected proposal stays saved and unapplied; after its result the author can reconsider it against the current draft. For read/catalogue use operation=null with no question edits. Patch ledger entries by questionNumber, leaving unrelated questions unchanged. A redesign request does not itself change the frozen design or approve a comparison. Do not call a choice decided while deferring it to a future author. No forced retention, replacement or winner. Full spend/one illegal candidate does not prove all substitutions impossible; consider displaced components and opportunity cost. Missing benefit is not evidence of inferiority. Necessary unknowns stay unresolved; optional alternatives may be declined with an independently reviewed basis. No whole-match/global-optimum demand. Existing source, semantic, Builder and final-release checks still apply. Public reasons only.'};
  const nodes=request.promptNodes.map(n=>{
    if(n.kind==='comparison_redesign_contract')return {...copy(n),
      instruction:'Downstream semantic constraint, not additional wire fields: a redesign request is independent of a Plan/army mutation. Submit it only as operation.kind=redesign with operation.request; no top-level disposition, mutation or strategicChanges. The mapper supplies the no-edit envelope. The design author must explicitly revise and preflight the experiment; this request changes/approves no design, measurement, Plan or roster. Leave unresolved facts in the ledger.'};
    if(n!==feedback)return n;
    const {originalOutput,...rest}=n;return {...rest,originalOutputIsHostProjectionState:true,
      errors:rest.errors.map(error=>error.code==='comparison_redesign_requires_scoped_control_request'
        ?{...error,instruction:'The prior reply mixed Plan editing and redesign. Choose ONE tagged operation; do not emit the legacy full-decision fields. Both prior proposals remain stored and unapplied.'}:error)};
  });
  const next={...request,promptNodes:[...nodes,node],
    strategyRepairState:{originalOutput:copy(original),originalResponseFormat:copy(request.responseFormat)},
    userMessage:node.instruction,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,
    responseFormat:next.responseFormat,projectionSourceHash:hash(next.strategyRepairState)});return next;
}

export function projectRosterComparisonControlWireV1({request,output}){
  if(!request.promptNodes.some(n=>n.kind==='strategy_semantic_repair'&&[4,5].includes(n.version)))return {output,projection:[]};
  const wireProjection=[];
  const typed=request.promptNodes.some(n=>n.kind==='strategy_semantic_repair'&&n.version===5);
  if(typed&&output?.action==='operate'&&output.operation?.kind){
    // Narrow ONLY by the model's explicit discriminator. The shared projector
    // deliberately does not guess between object-union variants. Reuse it after
    // selecting one declared branch; whole-command validation still follows.
    const leaves=s=>(s?.anyOf??s?.oneOf)?.flatMap(leaves)??[s];
    const branches=leaves(request.responseFormat.schema.properties.operation).filter(s=>{
      const k=s?.type==='object'&&s.properties?.kind;
      return k&&(k.enum?.includes(output.operation.kind)||Object.hasOwn(k,'const')&&k.const===output.operation.kind);
    });
    const operationSchema=branches.length===1?branches[0]:null;
    output=copy(output);
    if(operationSchema){
      // The explicit operation discriminator selects ONE owner. Move values
      // only to that declared child, never guess a branch or overwrite a value.
      const narrowed={...request.responseFormat.schema,properties:{...request.responseFormat.schema.properties,operation:operationSchema}};
      const child=projectSchemaOwnedChildFieldsV1(output,narrowed);
      output=child.output;wireProjection.push(...child.projection);
      if(output.operation.kind==='request_closure'){
        const op=output.operation;
        if(!Object.hasOwn(op,'mutation')&&Array.isArray(op.strategicChanges)&&op.strategicChanges.length===0){
          op.mutation=null;wireProjection.push({rule:'comparison_explicit_no_edit_envelope_v1',to:'/operation/mutation',value:null,semanticApprovalGranted:false});
        }else if(op.mutation===null&&!Object.hasOwn(op,'strategicChanges')){
          op.strategicChanges=[];wireProjection.push({rule:'comparison_explicit_no_edit_envelope_v1',to:'/operation/strategicChanges',value:[],semanticApprovalGranted:false});
        }
      }
      const normalized=projectSchemaOwnedParentFieldsV1(output.operation,operationSchema);
      output.operation=normalized.output;
      wireProjection.push(...normalized.projection.map(p=>({...p,from:'/operation'+p.from,to:'/operation'+p.to})));
      const noNullExtras=projectSchemaUnknownNullFieldsV1(output.operation,operationSchema);
      output.operation=noNullExtras.output;
      wireProjection.push(...noNullExtras.projection.map(p=>({...p,from:'/operation'+p.from})));
    }
    const field={investigate:'nextInvestigation',redesign:'comparisonDesignRequest',request_closure:'comparisonClosureRequest',block:'workflowBlocker'}[output.operation.kind];
    const canonical={mutation:output.operation.mutation??null,strategicChanges:output.operation.strategicChanges??[],
      nextInvestigation:null,comparisonDesignRequest:null,comparisonClosureRequest:null,workflowBlocker:null,
      ...(field?{[field]:output.operation.request}:{})};
    // Known obsolete no-edit fields may redundantly echo the selected command's
    // exact no-op envelope. Never discard unknown, conflicting or nonempty data.
    for(const [container,schema,prefix] of [[output,request.responseFormat.schema,''],
      ...(operationSchema?[[output.operation,operationSchema,'/operation']]:[])])
      for(const [key,value] of Object.entries(canonical))if(Object.hasOwn(container,key)
        &&!Object.hasOwn(schema.properties,key)
        &&(value===null&&container[key]===null||Array.isArray(value)&&value.length===0
          &&Array.isArray(container[key])&&container[key].length===0)){
        wireProjection.push({from:prefix+'/'+key,to:'/decisions/0/'+key,value:copy(value),
          rule:'comparison_legacy_noop_projection_v1',originalReplyUnchanged:true});delete container[key];
      }
  }
  const noNullExtras=projectSchemaUnknownNullFieldsV1(output,request.responseFormat.schema);
  output=noNullExtras.output;wireProjection.push(...noNullExtras.projection);
  return {output,projection:wireProjection};
}

export function projectRosterComparisonControlCommandV1({request,output}){
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  const typed=request.promptNodes.some(n=>n.kind==='strategy_semantic_repair'&&n.version===5);
  const wire=projectRosterComparisonControlWireV1({request,output});
  output=wire.output;const wireProjection=wire.projection;
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('comparison_control_schema',{issues:checked.issues});
  const saved=request.strategyRepairState?.originalOutput;
  if(!saved?.decisions?.[0])return reject('comparison_control_source_missing');
  // Decode the saved ledger BEFORE applying current edits. Otherwise an old
  // questionState survives beside the author's new classification.
  const baseline=projectRosterSavedAuthorQuestionsV1({schema:request.strategyRepairState.originalResponseFormat.schema,output:saved});
  if(baseline.errors.length)return reject('comparison_control_baseline_invalid',{issues:baseline.errors});
  const original=baseline.output;wireProjection.push(...baseline.projection);
  if(typed){
    const {operation,...common}=output;
    if(output.action==='operate'&&!operation||output.action!=='operate'&&operation!==null)
      return reject('comparison_control_operation_required');
    if(operation?.strategicChanges?.length&&!operation.mutation)return reject('comparison_control_revision_required');
    const field={investigate:'nextInvestigation',redesign:'comparisonDesignRequest',request_closure:'comparisonClosureRequest',block:'workflowBlocker'}[operation?.kind];
    output={...common,action:operation?.kind??output.action,nextInvestigation:null,
      comparisonDesignRequest:null,comparisonClosureRequest:null,workflowBlocker:null,
      revision:operation?.mutation?copy({mutation:operation.mutation,strategicChanges:operation.strategicChanges}):null,
      ...(field?{[field]:copy(operation.request)}:{})};
  }
  const fields=['nextInvestigation','comparisonDesignRequest','comparisonClosureRequest','workflowBlocker'];
  const selected={investigate:'nextInvestigation',redesign:'comparisonDesignRequest',request_closure:'comparisonClosureRequest',block:'workflowBlocker'}[output.action];
  if(fields.some(k=>k===selected?output[k]===null:output[k]!==null))return reject('comparison_control_exclusive_operation');
  if(['read','catalogue'].includes(output.action)){
    if(output.revision||output.questionUpdates.length||output.newQuestions.length||output.evidenceNumbers.length||output.alternatives.length)
      return reject('comparison_control_read_and_write_mixed');
    return {output:{action:output.action,publicReason:output.publicReason,reads:copy(output.reads),catalogueQueries:copy(output.catalogueQueries),decisions:[]},projection:[],errors:[]};
  }
  if(output.reads.length||output.catalogueQueries.length)return reject('comparison_control_write_and_read_mixed');
  if(output.action==='revise_strategy'&&!output.revision||output.revision&&!['request_closure','revise_strategy'].includes(output.action))
    return reject('comparison_control_revision_operation_mismatch');
  if(output.revision&&(!output.revision.mutation||!output.revision.strategicChanges.length))return reject('comparison_control_revision_required');
  const questions=copy(original.decisions[0].dataQuestions),seen=new Set();
  for(const {questionNumber,...update} of output.questionUpdates){
    if(seen.has(questionNumber))return reject('comparison_control_duplicate_question_update');
    seen.add(questionNumber);questions[questionNumber-1]={...questions[questionNumber-1],...copy(update)};
  }
  const names=new Set(questions.map(q=>q.question));for(const q of output.newQuestions){
    if(names.has(q.question))return reject('comparison_control_duplicate_question_append');names.add(q.question);questions.push(copy(q));
  }
  // The tagged command and its parent describe ONE model-selected operation.
  // Requiring the same citations to be typed twice caused actual195 to fail
  // after selecting924 in the command. Union only explicit selected citations;
  // source/read/currency checks still run on the resulting normal decision.
  const evidenceNumbers=copy(output.evidenceNumbers);
  const commandNumbers=selected?output[selected]?.evidenceNumbers??[]:[];
  const added=commandNumbers.filter(n=>!evidenceNumbers.includes(n));
  for(const n of added)if(!evidenceNumbers.includes(n))evidenceNumbers.push(n);
  if(added.length)wireProjection.push({rule:'explicit_control_source_union_v1',
    from:typed?'/operation/request/evidenceNumbers':'/'+selected+'/evidenceNumbers',
    to:'/decisions/0/evidenceNumbers',selectedAction:output.action,addedNumbers:[...new Set(added)],
    readPermissionGranted:false,sourceValidityGranted:false,originalReplyUnchanged:true});
  const decision={disposition:output.revision?'revise':output.action==='investigate'?'investigate':'retain',
    publicReason:output.publicReason,evidenceNumbers,alternatives:copy(output.alternatives),
    dataQuestions:questions,mutation:copy(output.revision?.mutation??null),strategicChanges:copy(output.revision?.strategicChanges??[]),
    ...Object.fromEntries(fields.map(k=>[k,copy(output[k])]))};
  return {output:{action:'finish',publicReason:output.publicReason,reads:[],catalogueQueries:[],decisions:[decision]},
    ...(wire.projection.length?{wireOutput:copy(wire.output)}:{}),projection:[...wireProjection,{to:'/decisions/0',value:copy(decision),rule:'model_explicit_comparison_control_v1',selectedAction:output.action}],errors:[]};
}
