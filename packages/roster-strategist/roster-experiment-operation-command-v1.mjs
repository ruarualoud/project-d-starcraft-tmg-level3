import {prepareRosterOperationStepRepairV1,projectRosterOperationStepRepairV1} from './roster-operation-step-repair-v1.mjs';
import {rosterSavedProposalConfirmationV1,rosterSavedProposalDisplayV1,projectRosterSavedProposalEchoV1} from './roster-saved-proposal-confirmation-v1.mjs';
import {rosterHostStepKindWireSchemaV1,projectRosterHostStepKindsV1,rosterHostStepKindInstructionV1} from './roster-host-step-kind-v1.mjs';
import {rosterSemanticParameterStepSchemaV1,projectRosterSemanticParameterStepV1,ROSTER_SEMANTIC_PARAMETER_INSTRUCTION_V1,ROSTER_SEMANTIC_CONTEXT_INSTRUCTION_V2,ROSTER_SEMANTIC_COMPARISON_INSTRUCTION_V3} from './roster-semantic-parameters-v1.mjs';
// One explicit operation per experiment turn. The wire cannot say "read" and
// carry an executable batch simultaneously. Mapping never executes a tool or
// approves evidence; the original role/compiler/Native gates still run.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterNativeSelectionStepSchemaV1,projectRosterNativeSelectionStepV1} from './roster-native-choice-command-v1.mjs';
import {rosterDelegatedMethodControlV1,ROSTER_DELEGATED_METHOD_CONTROL_INSTRUCTION_V1,ROSTER_METHOD_DEPENDENCIES_V1} from './roster-delegated-method-control-v1.mjs';
import {rosterSavedSceneChoicesV1,rosterSavedSceneStepSchemaV1,projectRosterSavedSceneStepV1,ROSTER_SAVED_SCENE_INSTRUCTION_V4} from './roster-saved-scene-choice-v1.mjs';
import {projectRosterEmptyCandidateFieldsV1,rosterComparisonCandidateChoicesV1,rosterComparisonCandidateStepSchemaV1,projectRosterComparisonCandidateStepV1,ROSTER_COMPARISON_CANDIDATE_INSTRUCTION_V1} from './roster-comparison-candidate-choice-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
   validateStarcraftTmgHostJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {rosterBuilderAuditGroupChoicesV1,rosterBuilderAuditGroupConclusionSchemaV1,projectRosterBuilderAuditGroupConclusionV1} from './roster-builder-audit-groups-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const tag=kind=>({type:'string',minLength:1,maxLength:64,enum:[kind]});
const nonempty=schema=>({...clone(schema),minItems:1});
function workOrdersWithNativeSelection(schema,delegatedControl,sceneChoices,candidateChoices){
  const orders=nonempty(schema),steps=orders.items.properties.steps,original=clone(steps.items);
  const other=clone(original);
  other.properties.operation.enum=other.properties.operation.enum.filter(kind=>kind!=='native_action');
  other.properties.kind=tag('tool');other.required.push('kind');
  const sceneStep=rosterComparisonCandidateStepSchemaV1(rosterSavedSceneStepSchemaV1(other,sceneChoices,4),candidateChoices);
  const semanticStep=rosterSemanticParameterStepSchemaV1(sceneStep,sceneChoices);
  steps.items={anyOf:[...(semanticStep.anyOf??[semanticStep]),rosterNativeSelectionStepSchemaV1(original)]};
  if(delegatedControl){
    delete orders.items.properties.experimentScope;
    orders.items.required=orders.items.required.filter(key=>key!=='experimentScope');
  }
  return orders;
}
export function prepareRosterExperimentOperationCommandV1(request,{sourceStateIdentities=[]}={}){
  if(request.roundKind!=='roster_workflow_experiment_planner'||request.strategyRepairState)return null;
  const props=request.responseFormat?.schema?.properties;
  if(!props?.workOrders||!props.action?.enum)return null;
  const actions=new Set(props.action.enum),variants=[];
  const delegatedControl=rosterDelegatedMethodControlV1(request);
  const sceneChoices=rosterSavedSceneChoicesV1(request,{sourceStateIdentities});
  const candidateChoices=rosterComparisonCandidateChoicesV1(request);
  const builderGroups=rosterBuilderAuditGroupChoicesV1(request);
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const original=feedback?.originalOutput;
  // Only the exact unexecuted operation-tag conflict has a confirmable batch.
  // Other compile/scope/legality failures require their original repair route.
  const savedConfirmation=actions.has('finish')?rosterSavedProposalConfirmationV1(request):null;
  const retained=savedConfirmation?.pendingProposal??(actions.has('finish')&&original?.action==='read'&&original.workOrders?.length
    &&original.reads?.length===0&&original.catalogueQueries?.length===0&&original.conclusion===null
    &&feedback.errors?.length&&feedback.errors.every(e=>e.code==='read_requires_reads_only')
    ?clone(original):null);
  if(actions.has('read'))variants.push(obj({kind:tag('read'),reads:nonempty(props.reads),catalogueQueries:clone(props.catalogueQueries)}));
  if(actions.has('catalogue'))variants.push(obj({kind:tag('catalogue'),catalogueQueries:nonempty(props.catalogueQueries)}));
  if(actions.has('finish'))variants.push(obj({kind:tag('submit_work_orders'),workOrders:workOrdersWithNativeSelection(props.workOrders,delegatedControl,sceneChoices,candidateChoices)}));
  if(retained)variants.push(obj({kind:tag('submit_retained_work_orders')}));
  if(actions.has('conclude'))variants.push(obj({kind:tag('conclude'),conclusion:rosterBuilderAuditGroupConclusionSchemaV1(props.conclusion.anyOf.find(s=>s.type!=='null'),builderGroups)}));
  if(!variants.length)return null;
  const hostStepKindSchema=obj({publicReason:clone(props.publicReason),unresolvedQuestions:clone(props.unresolvedQuestions),
    command:variants.length===1?variants[0]:{anyOf:variants}});
  const schema=rosterHostStepKindWireSchemaV1(hostStepKindSchema);
  const hasHypothesis=candidateChoices.some(choice=>choice.opponentHypothesis);
  const version=hasHypothesis?'1.17.0':'1.16.0';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.experiment_operation_command',version,
    schemaName:'roster_experiment_operation_command_v1',providerSchema:schema,modelOwnedFields:Object.keys(schema.properties),
    hostOwnedFields:['step.kind','retainedWorkOrders','artifactRef','acceptanceGranted',...(delegatedControl?['experimentScope','comparisonBinding']:[])],
    mapperRef:{id:'roster.experiment_operation_command',version,hash:hash(hasHypothesis?'roster.experiment_operation_command.v1.17.0.hypothetical_opponent':'roster.experiment_operation_command.v1.16.0.single_temporal_parameters')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Exclusive model-selected experiment operation, followed by the unchanged role and Native validation.'});
  const node={kind:'experiment_operation_command',version:1,nativeActionStepVersion:2,nativeFactSelectionVersion:1,
    builderAuditGroupVersion:1,builderAuditGroups:builderGroups.map(g=>({groupNumber:g.groupNumber,key:g.key,evidenceNumber:g.source.evidenceNumber})),
    methodDependencies:clone(ROSTER_METHOD_DEPENDENCIES_V1),
    hostStepKindVersion:1,savedSceneChoiceVersion:4,savedSceneChoices:sceneChoices,candidateFieldOwnershipVersion:2,semanticParameterVersion:3,comparisonCandidateChoiceVersion:hasHypothesis?2:1,comparisonCandidateChoices:candidateChoices,
    ...(delegatedControl?{delegatedControlVersion:1,delegatedControl}:{}),
    allowedCommands:variants.map(v=>v.properties.kind.enum[0]),
    ...(savedConfirmation?{savedProposalConfirmationVersion:1,retainedProposal:rosterSavedProposalDisplayV1(savedConfirmation)}
      :retained?{retainedProposal:{sourceReplyRef:feedback.originalReplyRef,workOrders:clone(retained.workOrders),
      publicReason:retained.publicReason,unresolvedQuestions:clone(retained.unresolvedQuestions),executed:false,approved:false}}:{}),
    instruction:'Choose exactly ONE command.kind from allowedCommands. Return ONLY publicReason, unresolvedQuestions and command; do not return the old flat action/reads/workOrders/conclusion envelope. read retrieves saved sources with nonempty reads and optional independent catalogueQueries; catalogue searches metadata only. submit_work_orders submits a nonempty executable batch, not a factual answer. conclude returns an answered/blocked/strategy_required conclusion, never a simultaneous batch. Unused operation fields do not exist in that variant. Existing preparation windows, delegated scope, source/citation rules and Native legality still apply. A completed batch is not an answered original question. Preserve necessary unknowns; never turn missing evidence into zero, future realized history, a universal strategy or Plan approval. Reuse saved successful sources/actions; do not replay setup to read its result. Only authorized local conditional experiments are allowed, not a complete match. Every new workOrder must retain its declared experimentScope, source bindings, comparison purpose and stop boundary. Public rationale only, no private reasoning.'};
  if(actions.has('finish'))node.instruction+=' Each step has a wire kind: native_selection for operation=native_action, tool for other operations. For native_selection return nativeSelection instead of argumentsJson/bindings. nativeSelection.source is exactly {kind:"saved_menu",evidenceNumber:<already saved menu number>} OR {kind:"batch_step",stepId:<earlier step in THIS batch>}. nativeSelection.selector is exactly {kind:"index",index:<observed zero-based index>} OR {kind:"action_type",actionType:<exact observed actionType>} OR {kind:"match",matchJson:<JSON object of exact primitive identity fields>}. Prefer action_type when the observed actionType uniquely identifies the intended action; a zero or ambiguous source match still requires observation and a more specific choice. Neither source nor selector may be null or a placeholder. nativeSelection.kind is finite/domain/formation. parametersJson is an explicit JSON object only for domain, otherwise null; outcomeJson is null unless an explicit authorized outcome is needed. Host obtains parent, seat and action identity from that source using the unchanged compiler. Future menus still require observation and model confirmation. If the selector is not yet known because a needed inspect has not run, submit only that necessary inspect prefix with completionStepId="" (the existing empty-string preliminary marker) and stopAndReturnToModelWhen requiring observation and an explicit choice. Keep the original question unresolved; this preliminary batch is not a completed experiment. Do not invent index 0, infer a casualty choice, submit a null selector or repeat an unchanged saved inspect merely to fit a batch. The Host never truncates or fills a rejected batch. Keep stepId, guards and publicReason. Only UNMIGRATED tool kinds keep argumentsJson/bindings; *_parameters kinds instead use the source-owned parameters schema below. The step kind is only a wire discriminator, not part of tool arguments.';
  node.instruction+=' For a saved observation, use nativeFacts entries {kind:"source_value", evidenceNumber, pointer, purpose}. Select the already-read original /receipt field or a published exact alias; Host binds its exact whole value. Do not retype a menu/array into expectedValueJson. actionEligibility and other navigation directories are not Native receipt fields: use the original actionSpace /receipt address shown in the saved view and read it first. kind=assert_value with expectedValueJson remains available only for an explicit independently checked assertion, including the string "null" for a real null; never mix it with source_value. A selected observation does not prove your interpretation, future control or Plan validity. The conclude command already returns control; do not add stopAndReturnToModelWhen or other old envelope fields; preserve scope limits in conclusion.conditions.';
  if(builderGroups.length)node.instruction+=' Builder quantities have ready-to-select groups in builderAuditGroups and their exact values in builder_audit_numeric_facts.factGroups. For these facts return nativeFacts entries {kind:"builder_audit_group",groupNumber,purpose}; Host supplies the source evidence and all operand pointers. Do not enumerate audit leaves, hashes or profile IDs. Select the relevant groups once, then answer the delegated question concisely. Slots: baseCapacity is BEFORE card grants; capacity is the TOTAL after all card grants; compare used with capacity. Missing operands remain null, never zero. Native legality does not prove strategic superiority; you still own your answer and scope.';
  if(savedConfirmation)node.instruction+=' Saved source reads have completed. Choose command.kind=submit_retained_work_orders (no other command fields) to confirm the exact pending proposal shown as read-only summaries. Host retains ALL parameters, source bindings, ordering, guards and unknowns. Do not copy readOnlyArguments or reconstruct transport fields. Choose submit_work_orders only for an actual method change using its CURRENT semantic schema. A confirmation is an author choice, not source approval or a Native result.';
  if(retained&&!savedConfirmation)node.instruction+=' The prior proposal was NEVER dispatched: it declared read with no reads and a nonempty workOrders batch. submit_retained_work_orders explicitly submits that exact saved batch through the ORIGINAL compiler and source/Native checks, preserving its unknown questions. It is your choice, not an automatic conversion or approval. Choose a new batch instead if it needs substantive changes, read missing sources, or return an honest conclusion. Do not retype the rejected envelope.';
  if(delegatedControl)node.instruction=node.instruction.replace(
    'Every new workOrder must retain its declared experimentScope, source bindings, comparison purpose and stop boundary.',
    'Every local workOrder must retain its source bindings and stop boundary; Host supplies the fixed scope.')+' '+ROSTER_DELEGATED_METHOD_CONTROL_INSTRUCTION_V1;
  node.instruction=node.instruction.replace('tool for other operations.','spatial_query for spatial, scene_inspection for inspect, scene_tool for other explicit-scene operations, and tool for remaining operations.')+' '+ROSTER_SAVED_SCENE_INSTRUCTION_V4;
  if(candidateChoices.length)node.instruction+=' '+ROSTER_COMPARISON_CANDIDATE_INSTRUCTION_V1;
  if(!actions.has('finish'))node.instruction=node.instruction.replace(
    'submit_work_orders submits a nonempty executable batch, not a factual answer. ', '')
    .replace('Every new workOrder must retain its declared experimentScope, source bindings, comparison purpose and stop boundary. ', 'No new work order is permitted in this turn. ');
  node.instruction+=' '+ROSTER_SEMANTIC_PARAMETER_INSTRUCTION_V1+' '+ROSTER_SEMANTIC_CONTEXT_INSTRUCTION_V2+' '+ROSTER_SEMANTIC_COMPARISON_INSTRUCTION_V3;
  node.instruction=rosterHostStepKindInstructionV1(node.instruction);
  const next={...request,strategyRepairState:{hostStepKindSchema,originalResponseFormat:clone(request.responseFormat),
      ...(retained?{originalOutput:retained}:{}),...(savedConfirmation?{savedProposalConfirmation:clone(savedConfirmation)}:{}),experimentOperationCommand:true},
    promptNodes:[...request.promptNodes.map(n=>savedConfirmation&&n.kind==='evidence_delivery_handoff'
      ?{...Object.fromEntries(Object.entries(n).filter(([key])=>key!=='pendingProposal')),pendingProposalRetainedByHost:true}
      :retained&&n===feedback
      ?{...n,originalOutput:undefined,originalOutputRetainedByHost:true,operationConflict:{declared:'read',reads:0,workOrders:retained.workOrders.length}}
      :n),node],userMessage:node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return prepareRosterOperationStepRepairV1(next);
}
export function projectRosterExperimentOperationCommandV1({request,output}){
  const repaired=projectRosterOperationStepRepairV1({request,output});
  if(repaired){if(repaired.errors.length)return repaired;
    const mapped=projectRosterExperimentOperationCommandV1({request:repaired.request,output:repaired.output});
    return {...mapped,projection:[...repaired.projection,...mapped.projection]};}
  const savedEcho=projectRosterSavedProposalEchoV1({request,output});
  if(savedEcho)return savedEcho;
  const internal=request.strategyRepairState?.hostStepKindSchema;
  if(internal){
    const kinds=projectRosterHostStepKindsV1(internal,output);
    if(kinds.errors.length)return {output:null,projection:kinds.projection,errors:kinds.errors};
    const mapped=projectRosterExperimentOperationCommandV1({request:{...request,responseFormat:{...request.responseFormat,schema:internal},
      strategyRepairState:{...request.strategyRepairState,hostStepKindSchema:undefined}},output:kinds.output});
    return {...mapped,projection:[...kinds.projection,...mapped.projection]};
  }
  const kinds=projectRosterHostStepKindsV1(request.responseFormat.schema,output);
  if(kinds.errors.length)return {output:null,projection:kinds.projection,errors:kinds.errors};
  if(kinds.projection.length){const mapped=projectRosterExperimentOperationCommandV1({request,output:kinds.output});
    return {...mapped,projection:[...kinds.projection,...mapped.projection]};}

  const inert=projectRosterEmptyCandidateFieldsV1(output);
  if(inert.projection.length){const mapped=projectRosterExperimentOperationCommandV1({request,output:inert.output});
    return {...mapped,projection:[...inert.projection,...mapped.projection]};}
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return {output:null,projection:[],errors:[{code:'experiment_operation_command_schema',issues:checked.issues,
    instruction:'Use one command.kind and only that variant fields. A read cannot contain workOrders; submission cannot contain reads or a conclusion. The rejected proposal has not executed.'}]};
  const command=output.command;
  const sceneNode=request.promptNodes.find(n=>n.kind==='experiment_operation_command'&&[1,2,3,4].includes(n.savedSceneChoiceVersion));
  const sceneChoices=sceneNode?.savedSceneChoices??[];
  const sceneProjection=[];
  const result={action:{read:'read',catalogue:'catalogue',submit_work_orders:'finish',submit_retained_work_orders:'finish',conclude:'conclude'}[command.kind],
    publicReason:output.publicReason,reads:clone(command.reads??[]),catalogueQueries:clone(command.catalogueQueries??[]),
    workOrders:clone(command.workOrders??[]),unresolvedQuestions:clone(output.unresolvedQuestions),conclusion:clone(command.conclusion??null)};
  const grouped=projectRosterBuilderAuditGroupConclusionV1({request,conclusion:result.conclusion});
  if(grouped.errors.length)return {output:null,projection:[],errors:grouped.errors};
  result.conclusion=grouped.conclusion;sceneProjection.push(...grouped.projection);
  // Saved paid requests without this version keep their exact historical wire.
  if(command.kind==='submit_work_orders'&&[1,2].includes(request.promptNodes.find(n=>n.kind==='experiment_operation_command')?.nativeActionStepVersion)){
    for(const order of result.workOrders)for(let i=0;i<order.steps.length;i++){
      if(order.steps[i].operation!=='native_action'){
        const semantic=projectRosterSemanticParameterStepV1(order.steps[i],sceneNode?.semanticParameterVersion,sceneChoices);
         if(semantic.errors.length)return {output:null,projection:[],errors:semantic.errors};
         sceneProjection.push(...semantic.projection);
         const candidate=projectRosterComparisonCandidateStepV1(semantic.step,[1,2].includes(sceneNode?.comparisonCandidateChoiceVersion)?sceneNode.comparisonCandidateChoices:[]);
        if(candidate.errors.length)return {output:null,projection:[],errors:candidate.errors};
        sceneProjection.push(...candidate.projection);
        const mapped=projectRosterSavedSceneStepV1(candidate.step,sceneChoices,sceneNode?.savedSceneChoiceVersion??1);
        if(mapped.errors.length)return {output:null,projection:[],errors:mapped.errors};
        sceneProjection.push(...mapped.projection);
        const {kind,...retained}=mapped.step;order.steps[i]=retained;continue;
      }
      const projected=projectRosterNativeSelectionStepV1(order.steps[i]);
      if(projected.errors.length)return {output:null,projection:[],errors:projected.errors};
      sceneProjection.push(...(projected.projection??[]));
      order.steps[i]=projected.step;
    }
  }
  if(command.kind==='submit_retained_work_orders'){
    const original=request.strategyRepairState?.originalOutput;
    if(!original?.workOrders?.length)return {output:null,projection:[],errors:[{code:'experiment_retained_proposal_missing'}]};
    result.workOrders=clone(original.workOrders);
    result.unresolvedQuestions=[...new Set([...original.unresolvedQuestions,...result.unresolvedQuestions])];
  }
  const control=request.promptNodes.find(n=>n.kind==='experiment_operation_command'&&n.delegatedControlVersion===1)?.delegatedControl;
  if(control)for(const order of result.workOrders)order.experimentScope=clone(control.experimentScope);
  return {output:result,errors:[],projection:[...sceneProjection,{rule:'model_authored_experiment_operation_v1',command:command.kind,
    nativeExecuted:false,sourceApproved:false,originalReplyUnchanged:true},...(control&&result.workOrders.length?[{
      rule:'host_owned_delegated_method_control_v1',targetWorkId:control.targetWorkId,
      compilerDerivedBinding:true,sourceApproved:false,originalReplyUnchanged:true}]:[])]};
}
