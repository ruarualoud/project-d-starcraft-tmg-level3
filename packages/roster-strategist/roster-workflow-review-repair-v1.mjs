import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {rosterInventoryRequestIdentityRecoveryV1} from './roster-inventory-claims-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});

// Bind an error to one existing check using exact Host-owned identity only.
// No question paraphrase, verdict, citation or missing answer is inferred.
export function rosterReviewErrorCheckIdV1({error,checks=[],bindings=[]}){
  const ids=new Set(checks.map(c=>c.checkId));
  if(ids.has(error.checkId))return error.checkId;
  const path=error.pointer??error.path;
  const match=typeof path==='string'&&/^\/checks\/(\d+)(?:\/|$)/u.exec(path);
  if(match)return checks[Number(match[1])]?.checkId??null;
  if(typeof error.question!=='string'||!error.question)return null;
  const matched=new Set(checks.filter(c=>c.dataQuestions?.some(q=>q.question===error.question)).map(c=>c.checkId));
  for(const binding of bindings.filter(b=>b.question===error.question)){
    const id=ids.has(binding.handle)?binding.handle:ids.has(binding.checkId)?binding.checkId:null;
    if(id)matched.add(id);
  }
  return matched.size===1?[...matched][0]:null;
}

// A rejected check is not a new mandate to rewrite the whole review. The paid
// source stays immutable; explicit model patches still pass ALL old validators.
export function prepareRosterReviewRepairRequestV1(request){
  if(request.roundKind!=='roster_workflow_final_review')return null;
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const original=feedback?.originalOutput,checks=original?.checks;
  if(original?.action!=='finish'||!checks?.length||!feedback.errors?.length)return null;
  const ids=checks.map(c=>c.checkId);
  if(new Set(ids).size!==ids.length)return null;
  const bindings=request.assignedQuestionReviewState?.bindings
    ??request.promptNodes.find(n=>n.kind==='assigned_question_identity')?.checks??[];
  const flagged=feedback.errors.map(error=>rosterReviewErrorCheckIdV1({error,checks,bindings}));
  // Envelope/unknown-address failures retain their normal correction lane.
  if(flagged.some(id=>!id))return null;
  const props=request.responseFormat.schema.properties,check=props.checks.items;
  const text={type:'string',minLength:1,maxLength:65536};
  const readActions=props.action.enum.filter(action=>['read','catalogue'].includes(action));
  const envelope=Object.fromEntries(['publicReason','reads','catalogueQueries'].filter(key=>Object.hasOwn(props,key))
    .map(key=>[key,clone(props[key])]));
  const schema=obj({action:{...props.action,enum:[...readActions,'repair']},...envelope,
    checkPatches:{type:'array',minItems:0,items:obj({checkId:{...text,enum:ids},
      reasonKind:{...text,enum:['reported_error','new_finding']},changeReason:text,replacement:clone(check)})}});
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_review_semantic_repair',version:'1.0.2',
    schemaName:'roster_workflow_review_semantic_repair_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.review_check_patch',version:'1.0.2',hash:hash('roster.review_check_patch.v1.2.host_owned_check_identity')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit per-check correction; unlisted checks are preserved, new findings are declared, original review validation remains required.'});
  const node={kind:'review_semantic_repair',version:1,originalResponseFormat:clone(request.responseFormat),
    originalReplyRef:feedback.originalReplyRef,flaggedCheckIds:[...new Set(flagged)],
    instruction:'Repair only the reported check(s) using checkPatches; unlisted checks remain exactly unchanged. replacement follows its exact schema. When checkId is omitted by that schema, Host binds it from the explicit existing patch target; otherwise it must equal the patch checkId. Do not add forbidden identity fields or rewrite the whole review. reasonKind=reported_error addresses the supplied issue. If reading reveals a REAL issue in another check, explicitly use new_finding and explain the new evidence and why that check must change; do not silently re-review or copy unrelated conclusions. A new finding is allowed and does not get waived. All original source/semantic/release checks still run. read/catalogue have checkPatches=[] and do not complete or reset the pending correction. No army/Plan edit, Native replay, automatic approval or strategic choice is authorized.'};
  const next={...request,promptNodes:[...request.promptNodes,node],
    userMessage:'LOCAL REVIEW CORRECTION: '+node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,
    userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}

export function projectRosterReviewRepairOutputV1({request,output}){
  const node=request.promptNodes.find(n=>n.kind==='review_semantic_repair'&&n.version===1);
  const supportsCatalogue=Object.hasOwn(node.originalResponseFormat.schema.properties,'catalogueQueries');
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  const operationProjection=[];
  // A nonempty patch with no reads already specifies the sole operation.
  // Normalize only its redundant finish label, never a mixed read/write choice.
  if(output?.action==='finish'&&Array.isArray(output.checkPatches)&&output.checkPatches.length
    &&Array.isArray(output.reads)&&!output.reads.length
    &&(!supportsCatalogue||Array.isArray(output.catalogueQueries)&&!output.catalogueQueries.length)){
    operationProjection.push({from:'/action',to:'/action',original:'finish',value:'repair',
      rule:'explicit_review_patch_discriminator_v1',semanticApprovalGranted:false});
    output={...output,action:'repair'};
  }
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('review_patch_schema',{issues:checked.issues});
  if(['read','catalogue'].includes(output.action)){
    if(output.checkPatches.length)return reject('review_patch_read_and_write_mixed');
    return {output:{action:output.action,publicReason:output.publicReason,reads:clone(output.reads),
      ...(supportsCatalogue?{catalogueQueries:clone(output.catalogueQueries)}:{}),checks:[]},projection:[],errors:[]};
  }
  if(output.reads.length||output.catalogueQueries?.length)return reject('review_patch_read_and_write_mixed');
  if(!output.checkPatches.length)return reject('review_patch_no_changes');
  const original=request.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput;
  const projected=clone(original),projection=[...operationProjection],seen=new Set();
  for(const patch of output.checkPatches){
    if(seen.has(patch.checkId))return reject('review_patch_duplicate_check',{checkId:patch.checkId});
    seen.add(patch.checkId);
    const index=projected.checks.findIndex(c=>c.checkId===patch.checkId);
    const identityInReplacement=Object.hasOwn(node.originalResponseFormat.schema.properties.checks.items.properties,'checkId');
    if(index<0||identityInReplacement&&patch.replacement.checkId!==patch.checkId)return reject('review_patch_check_identity',{checkId:patch.checkId});
    // Scoped coverage schemas deliberately omit the Host-owned identity. The
    // patch target already names exactly one retained check; bind only that
    // identity, preserving every supplied judgment/source/classification.
    const replacement=identityInReplacement?clone(patch.replacement):{...clone(patch.replacement),checkId:patch.checkId};
    if(!node.flaggedCheckIds.includes(patch.checkId)&&patch.reasonKind!=='new_finding')
      return reject('review_patch_unreported_change_requires_new_finding',{checkId:patch.checkId});
    projection.push({to:`/checks/${index}`,original:clone(projected.checks[index]),value:clone(replacement),
      rule:'model_authored_review_patch_v1',reasonKind:patch.reasonKind,changeReason:patch.changeReason});
    projected.checks[index]=replacement;
  }
  projection.push({to:'/publicReason',original:projected.publicReason,value:output.publicReason,rule:'model_authored_review_patch_v1'});
  projected.publicReason=output.publicReason;projected.action='finish';projected.reads=[];
  if(supportsCatalogue)projected.catalogueQueries=[];
  return {output:projected,wireOutput:output,projection,errors:[]};
}

// This exact Host failure occurs while constructing the repair schema, BEFORE
// pending/onRequest/Provider. No paid reply is retried or rewritten. Unknown
// transport outcomes and a newer pending request must never use this recovery.
export async function rosterReviewRequestShapeRecoveryV1({work,readArtifact}){
  const identityRecovery=await rosterInventoryRequestIdentityRecoveryV1({work,readArtifact});
  if(identityRecovery)return identityRecovery;
  const kind='review_repair_optional_catalogue_v832',op=work.operationState;
  if(work.role!=='roster_workflow_final_review'||work.status!=='needs_repair'||op?.pending
    ||work.failure?.code!=='$.required must contain every property exactly once'
    ||!op?.correction||work.requestShapeRecoveries?.some(r=>r.kind===kind))return null;
  const call=op.calls?.at(-1);
  if(!call||op.correction.originalReplyRef!==call.replyRef)return null;
  const request=await readArtifact(call.requestRef),props=request.responseFormat?.schema?.properties;
  if(request.roundKind!==work.role||!props?.checks||Object.hasOwn(props,'catalogueQueries')
    ||request.promptNodes.some(n=>n.kind==='review_semantic_repair'))return null;
  return {kind,originalFailure:clone(work.failure),lastIssuedRequestRef:call.requestRef,
    originalReplyRef:call.replyRef,historyReset:false,providerReplayed:false,nativeReplayed:false};
}
