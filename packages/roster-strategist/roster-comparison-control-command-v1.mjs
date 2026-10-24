import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const copy=structuredClone;
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const controlErrors=new Set(['comparison_revision_requires_resolution','comparison_closure_requires_explicit_scoped_choice']);
export function isRosterComparisonControlRequestV1(request){
  const feedback=request?.promptNodes?.find(n=>n.kind==='local_contract_feedback');
  return request?.roundKind==='roster_workflow_strategy_decision'
    &&request.promptNodes.some(n=>n.kind==='comparison_closure_contract'&&n.version===1)
    &&feedback?.errors?.length>0&&feedback.errors.every(e=>controlErrors.has(e.code)||e.code?.startsWith('comparison_control_'))
    &&feedback.originalOutput?.action==='finish'&&feedback.originalOutput.decisions?.length===1;
}

// Lossless factoring of repeated metadata. Every child, condition, source and
// unknown extension field survives, including row order. No parent read granted.
export function packRosterExactReadRowsV1(rows){
  const groups=[],byCommon=new Map();
  rows.forEach((row,index)=>{
    const {pointer,value,requestedPointer,deliveryKind,...common}=row,key=JSON.stringify(common);
    let group=byCommon.get(key);if(!group){group={common:copy(common),children:[]};groups.push(group);byCommon.set(key,group);}
    group.children.push({index,pointer,value:copy(value),
      ...(Object.hasOwn(row,'requestedPointer')?{requestedPointer}:{}),...(Object.hasOwn(row,'deliveryKind')?{deliveryKind}:{})});
  });return groups;
}
export function rosterExactReadRowsV1(node){
  if(Array.isArray(node?.results))return node.results;
  if(node?.encoding!=='shared_metadata_v1')return [];
  return (node.groups??[]).flatMap(g=>g.children.map(c=>({index:c.index,row:{...copy(g.common),
    ...Object.fromEntries(Object.entries(c).filter(([k])=>k!=='index'))}}))).sort((a,b)=>a.index-b.index).map(r=>r.row);
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
      const {results,...rest}=node;return [{...copy(rest),encoding:'shared_metadata_v1',groups:packRosterExactReadRowsV1(results??[]),
        instruction:'Each group.common applies to EVERY child. Each child is an exact original JSON Pointer/value, not a whole source read. Repeated metadata is factored only; no value or uncertainty was omitted. Ordinary reads/catalogue remain available.'}];
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
  const original=feedback.originalOutput,prior=original.decisions[0],questions=prior.dataQuestions;
  if(!questions?.length)return null;
  const props=request.responseFormat.schema.properties,dprops=props.decisions.items.properties;
  const qprops=dprops.dataQuestions.items.properties;
  const schema=object({
    action:{...copy(props.action),enum:['read','catalogue','investigate','redesign','request_closure','revise_strategy','block']},
    publicReason:copy(props.publicReason),reads:copy(props.reads),catalogueQueries:copy(props.catalogueQueries),
    questionUpdates:{type:'array',minItems:0,items:object({questionNumber:{type:'integer',minimum:1,maximum:questions.length},
      classification:copy(qprops.classification),publicReason:copy(qprops.publicReason),evidenceNumbers:copy(qprops.evidenceNumbers)})},
    newQuestions:copy(dprops.dataQuestions),evidenceNumbers:copy(dprops.evidenceNumbers),alternatives:copy(dprops.alternatives),
    nextInvestigation:copy(dprops.nextInvestigation),comparisonDesignRequest:copy(dprops.comparisonDesignRequest),
    comparisonClosureRequest:copy(dprops.comparisonClosureRequest),workflowBlocker:copy(dprops.workflowBlocker),
    revision:nullable(object({mutation:copy(dprops.mutation),strategicChanges:copy(dprops.strategicChanges)})),
  });
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_comparison_control',version:'1.0.0',
    schemaName:'roster_workflow_comparison_control_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.comparison_control',version:'1.0.0',hash:hash('roster.comparison_control.v1')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'One explicit comparison control operation; unchanged factual, Builder, source and review gates.'});
  const node={kind:'strategy_semantic_repair',version:4,originalReplyRef:feedback.originalReplyRef,
    questions:questions.map((q,i)=>({questionNumber:i+1,...copy(q)})),
    instruction:'Select ONE next operation for the assigned comparison, not another rewrite of its purpose. investigate requires nextInvestigation; redesign requires comparisonDesignRequest; request_closure requires comparisonClosureRequest; block requires a concrete workflowBlocker. All other control payloads must be null. revise_strategy requires revision with an actual operational Plan/army change; purpose-text-only revision without another operation is rejected. request_closure MAY carry revision to correct unsupported current Plan wording before independent review; otherwise revision=null. Other actions have revision=null. read/catalogue have no question edits or control payloads. Patch ledger entries by questionNumber, leaving unrelated questions unchanged. A statement that you decline a comparison is not itself a closure command. Do NOT say the same assigned choice is both decided and still awaiting a future author. You may choose any supported operation; no forced retention or replacement. Full spend and one illegal candidate do not prove all substitutions impossible; consider displaced components/opportunity cost, not an unfunded addition. Missing benefit is not evidence of inferiority. Keep actual necessary unknowns; unmeasured alternatives may remain unmeasured if a scoped retention is independently justified. Do not demand whole-match proof or global superiority to make a conditional choice. Facts/Plan/closed comparison are never approved by this command. All ordinary read/search operations remain available for a missing decision-relevant source. Public reasons only.'};
  const nodes=request.promptNodes.map(n=>{
    if(n!==feedback)return n;
    const {originalOutput,...rest}=n;return {...rest,originalOutputIsHostProjectionState:true};
  });
  const next={...request,promptNodes:[...nodes,node],
    strategyRepairState:{originalOutput:copy(original),originalResponseFormat:copy(request.responseFormat)},
    userMessage:node.instruction,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,
    responseFormat:next.responseFormat,projectionSourceHash:hash(next.strategyRepairState)});return next;
}

export function projectRosterComparisonControlCommandV1({request,output}){
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('comparison_control_schema',{issues:checked.issues});
  const original=request.strategyRepairState?.originalOutput;
  if(!original?.decisions?.[0])return reject('comparison_control_source_missing');
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
  const decision={disposition:output.revision?'revise':output.action==='investigate'?'investigate':'retain',
    publicReason:output.publicReason,evidenceNumbers:copy(output.evidenceNumbers),alternatives:copy(output.alternatives),
    dataQuestions:questions,mutation:copy(output.revision?.mutation??null),strategicChanges:copy(output.revision?.strategicChanges??[]),
    ...Object.fromEntries(fields.map(k=>[k,copy(output[k])]))};
  return {output:{action:'finish',publicReason:output.publicReason,reads:[],catalogueQueries:[],decisions:[decision]},
    projection:[{to:'/decisions/0',value:copy(decision),rule:'model_explicit_comparison_control_v1',selectedAction:output.action}],errors:[]};
}
