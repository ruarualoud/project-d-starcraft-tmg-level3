import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const payload=s=>s?.anyOf?.find(v=>v.type==='object')??(s?.type==='object'?s:null);
const slots=['disposition','mutation','strategicChanges','nextInvestigation','workflowBlocker','comparisonDesignRequest','comparisonClosureRequest'];
const instruction='CONSTRUCTION AUTHOR: choose the next executable operation at decision.nextStep (or decisions[].nextStep for a finish reply). kind=revise selects an actual army/Plan mutation; investigate selects a concrete missing observation; report_blocker requires evidence of unavailable capability or missing external input. Comparison design/closure are available only where their existing contracts authorize them. Host compiles the selected operation into internal decision fields; do not supply disposition or duplicate operation slots outside nextStep. Read/catalogue remain available with no decision. You may reject a candidate or preserve current strategic priorities, but that does not finish the assigned incomplete army. No global superiority proof or Builder strategic ranking is required before making your provisional next choice. When candidatePreview is supplied, its Native totals and added/updated/removed list describe your pending choice; the current draft has NOT changed. Confirm by selecting that exact candidate through the existing audited-candidate selection, explicitly resubmit it, or revise the choice using these actual numbers. Copy no arithmetic into authority fields and do not restart construction from an empty army. A deliberate cost reduction is allowed. Treat early Teach as a proposal, not an instruction to repeat an optional experiment. You may explicitly retain an already reasoned conditional choice while completing a different outstanding army/Plan requirement; reopen it only for a relevant change, new evidence or a concrete flaw in that reason. Do not repeatedly swap the same alternatives merely to generate another Teach cycle. Use the current Native budget, not a prior authored total: replacement cost is the net change after removals. A limited candidate page is not an exhaustive impossibility proof; available catalogue/search/reselection tools retain their stated coverage. Native legality, factual sources, comparison authority, and final completion checks remain in force; no roster choice is made by Host.';

// A Host-assigned construction obligation, never mere arithmetic or wording,
// selects this protocol. Historical saved requests retain their saved schema.
export function prepareRosterConstructionCommandV1(request){
  if(request.constructionCommandState?.version===1)return request;
  const requirement=request.promptNodes?.find(n=>n.kind==='strategy_progress_contract')?.constructionRequirement;
  if(request.roundKind!=='roster_workflow_strategy_decision'
    ||requirement?.source!=='assigned_host_construction_obligation')return request;
  const source=request.responseFormat.schema, schema=clone(source);
  const single=payload(schema.properties.decision), multiple=schema.properties.decisions?.items;
  const decision=single??multiple;
  if(decision?.type!=='object'||!decision.properties.disposition||!decision.properties.mutation)return request;
  const dp=decision.properties, alternatives=[];
  const add=(kind,properties)=>alternatives.push(object({kind:{type:'string',minLength:1,maxLength:32,enum:[kind]},...properties}));
  const mutation=payload(dp.mutation), investigation=payload(dp.nextInvestigation), blocker=payload(dp.workflowBlocker);
  if(mutation&&dp.strategicChanges)add('revise',{mutation:clone(mutation),strategicChanges:{...clone(dp.strategicChanges),minItems:1},
    ...(dp.nextInvestigation?{nextInvestigation:clone(dp.nextInvestigation)}:{}),
    ...(dp.comparisonClosureRequest?{comparisonClosureRequest:clone(dp.comparisonClosureRequest)}:{})});
  if(investigation)add('investigate',{nextInvestigation:clone(investigation)});
  if(blocker)add('report_blocker',{workflowBlocker:clone(blocker)});
  for(const [kind,field]of [['design_comparison','comparisonDesignRequest'],['close_comparison','comparisonClosureRequest']]){
    const value=payload(dp[field]);if(value)add(kind,{[field]:clone(value)});
  }
  if(alternatives.length<2)return request;
  const common=Object.fromEntries(Object.entries(dp).filter(([k])=>!slots.includes(k)));
  const wire=object({...common,nextStep:{anyOf:alternatives}});
  if(single)schema.properties.decision={anyOf:[wire,{type:'null'}]};else schema.properties.decisions.items=wire;
  const version='1.0.0',contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_construction_command',version,
    schemaName:'roster_workflow_construction_command_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted','constructionStage'],
    mapperRef:{id:'roster.construction_command',version,hash:hash('roster.construction_command.v1.0.0')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit next operation for an assigned incomplete construction; existing author/Native/source validators still apply.'});
  const promptNodes=request.promptNodes.map(n=>{
    if(n.kind!=='strategy_semantic_repair'||n.version!==3)return n;
    const tail=n.instruction.indexOf('Patch only changed ledger entries');
    return {...n,commandShape:{requiredTopLevelFields:clone(schema.required),operationPath:'/decision/nextStep/kind',
      decisionRequiredFields:clone(wire.required),allowedOperations:alternatives.map(a=>a.properties.kind.enum[0]),instruction},
      instruction:instruction+' '+(tail>=0?n.instruction.slice(tail):'Preserve the numbered question ledger and assigned proof scopes; this changes only the submitted operation interface.')};
  });
  promptNodes.push({kind:'construction_next_operation',version:1,requirement:clone(requirement),instruction});
  return {...request,promptNodes,userMessage:instruction,
    constructionCommandState:{version:1,decisionShape:single?'single':'multiple',originalResponseFormat:clone(request.responseFormat),
      originalUserMessage:request.userMessage},responseContract:contract,
    responseFormat:{...request.responseFormat,schema,outputContractRef:outputContractRefStarcraftTmgV1(contract)}};
}

// Derive ownership from the exact saved sending Schema. Restore only supplied
// values with one owner; never select an operation or overwrite a conflict.
export function normalizeRosterConstructionWireV1({request,output}){
  const state=request.constructionCommandState,projection=[];
  if(state?.version!==1||!output||typeof output!=='object')return {output,projection};
  const schema=request.responseFormat.schema;
  const shape=state.decisionShape==='single'?payload(schema.properties.decision):schema.properties.decisions?.items;
  const dp=shape?.properties;
  if(!dp)return {output,projection};
  const result=clone(output);
  const container=state.decisionShape==='single'?'decision':'decisions';
  const commandAction=state.decisionShape==='single'?'decide':'finish';
  if(output.action===commandAction&&!Object.hasOwn(output,container)&&output.nextStep&&dp.nextStep){
    const decision={};
    for(const key of Object.keys(dp))if(Object.hasOwn(result,key)
      &&(!Object.hasOwn(schema.properties,key)||key==='publicReason')){
      decision[key]=clone(result[key]);
      projection.push({rule:'construction_decision_envelope_v1',from:'/'+key,to:(state.decisionShape==='single'?'/decision/':'/decisions/0/')+key,valuePreserved:true,semanticApprovalGranted:false});
      if(key!=='publicReason')delete result[key];
    }
    result[container]=state.decisionShape==='single'?decision:[decision];
  }
  // A single declared decision uniquely owns these fields. Models sometimes
  // emit both the correct envelope and an identical flat echo. Keep the exact
  // semantic value once; never discard a conflicting or multi-owner value.
  const sole=state.decisionShape==='single'?result.decision
    :Array.isArray(result.decisions)&&result.decisions.length===1?result.decisions[0]:null;
  if(result.action===commandAction&&sole&&typeof sole==='object'){
    const path=state.decisionShape==='single'?'/decision':'/decisions/0';
    for(const key of Object.keys(dp)){
      if(Object.hasOwn(schema.properties,key)||!Object.hasOwn(result,key))continue;
      const duplicate=Object.hasOwn(sole,key);
      if(duplicate&&!isDeepStrictEqual(sole[key],result[key]))continue;
      if(!duplicate)sole[key]=clone(result[key]);
      delete result[key];
      projection.push({rule:'construction_decision_envelope_v1',from:'/'+key,to:path+'/'+key,
        duplicateRemoved:duplicate,valuePreserved:true,semanticApprovalGranted:false});
    }
  }
  const decisions=state.decisionShape==='single'?[[result.decision,'/decision']]
    :Array.isArray(result.decisions)?result.decisions.map((d,i)=>[d,'/decisions/'+i]):[];
  for(const [decision,path]of decisions){
    if(!decision||typeof decision!=='object'||!decision.nextStep)continue;
    const step=decision.nextStep;
    const branch=dp.nextStep?.anyOf?.find(s=>s.properties?.kind?.enum?.includes(step.kind));
    if(!branch)continue;
    for(const key of Object.keys(branch.properties)){
      if(key==='kind'||Object.hasOwn(dp,key)||!Object.hasOwn(decision,key))continue;
      const duplicate=Object.hasOwn(step,key);
      if(duplicate&&!isDeepStrictEqual(step[key],decision[key]))continue; // Preserve both for conflict rejection.
      if(!duplicate)step[key]=clone(decision[key]);
      delete decision[key];
      projection.push({rule:'construction_operation_slot_v1',from:path+'/'+key,to:path+'/nextStep/'+key,
        duplicateRemoved:duplicate,valuePreserved:true,semanticApprovalGranted:false});
    }
    // An omitted optional side effect grants no new inquiry/closure authority.
    // Only revise has these nullable adjuncts; its mutation/intent stay required.
    if(step.kind==='revise')for(const key of ['nextInvestigation','comparisonClosureRequest']){
      const spec=branch.properties[key];
      if(!Object.hasOwn(step,key)&&spec?.anyOf?.some(s=>s.type==='null')){
        step[key]=null;projection.push({rule:'construction_absent_adjunct_v1',to:path+'/nextStep/'+key,
          value:null,additionalAuthorizationGranted:false,semanticApprovalGranted:false});
      }
    }
  }
  if(['decide','finish'].includes(result.action))for(const key of ['reads','catalogueQueries'])
    if(schema.properties[key]?.type==='array'&&!Object.hasOwn(result,key)){
      result[key]=[];projection.push({rule:'construction_inactive_read_list_v1',to:'/'+key,value:[],semanticApprovalGranted:false});
    }
  return {output:projection.length?result:output,projection};
}

export function projectRosterConstructionCommandV1({request,output}){
  const state=request.constructionCommandState;
  if(state?.version!==1)return {output,projection:[],errors:[]};
  const normalized=normalizeRosterConstructionWireV1({request,output});
  const checked=validate(request.responseFormat.schema,normalized.output);
  if(!checked.ok)return {output:null,projection:[],errors:[{code:'construction_command_schema',issues:checked.issues}]};
  const result=clone(normalized.output),projection=[...normalized.projection];
  const original=state.decisionShape==='single'?payload(state.originalResponseFormat.schema.properties.decision)
    :state.originalResponseFormat.schema.properties.decisions.items;
  const compile=(value,path)=>{
    if(value===null)return null;
    const {nextStep,...common}=value,{kind,...parameters}=nextStep;
    const empty=Object.fromEntries(slots.filter(k=>k in original.properties).map(k=>[k,k==='strategicChanges'?[]:null]));
    const disposition=kind==='revise'?'revise':kind==='investigate'?'investigate':'retain';
    projection.push({from:path+'/nextStep',rule:'construction_semantic_operation_v1',kind,
      hostSelectedStrategy:false,factsApproved:false,acceptanceGranted:false});
    return {...common,...empty,disposition,...parameters};
  };
  if(state.decisionShape==='single')result.decision=compile(result.decision,'/decision');
  else result.decisions=result.decisions.map((d,i)=>compile(d,'/decisions/'+i));
  const {constructionCommandState,...inner}=request;
  return {output:result,projection,errors:[],wireOutput:output,
    request:{...inner,responseFormat:state.originalResponseFormat,userMessage:state.originalUserMessage}};
}
