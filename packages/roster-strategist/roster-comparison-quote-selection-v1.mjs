// Reviewers select immutable author text; they do not retype/translate quotes.
// The reviewer still owns every verdict and reason. Binding is not approval.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectSchemaOwnedChildFieldsV1} from '../structured-generation/schema-owned-field-projection-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const copy=structuredClone;
const fields={retainedSourceNumbers:'retainedComponentQuotes',foregoneSourceNumbers:'foregoneBenefitQuotes'};
export function prepareRosterComparisonQuoteRequestV1(request){
  if(request.roundKind!=='roster_workflow_final_review'||!request.responseFormat?.schema?.properties?.premiseAudit
    ||request.promptNodes.some(n=>n.kind==='comparison_quote_selection'))return null;
  const premise=request.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.inputs?.comparisonPremises?.value;
  if(premise?.kind!=='comparison_premise_contract'||premise.version!==1)return null;
  const sources=[...premise.premises.map(p=>({origin:p.premiseId,text:p.text,usage:'audit_premise_and_tradeoff_quote'})),
    ...(premise.quoteSources??[]).map(p=>({origin:p.pointer,text:p.text,usage:'tradeoff_quote_only'}))]
    .filter(p=>typeof p.text==='string'&&p.text.trim()).map((p,i)=>({number:i+1,...p}));
  if(!sources.length)return null;
  const schema=copy(request.responseFormat.schema),tradeoff=schema.properties.premiseAudit.properties.tradeoff;
  const allowedPremiseIds=premise.premises.map(p=>p.premiseId);
  const allowedComparisonKeys=premise.comparisons.filter(c=>c.sourceCurrent&&c.meaningStatus==='observed').map(c=>c.comparisonKey);
  const rows=schema.properties.premiseAudit.properties.rows;
  rows.maxItems=allowedPremiseIds.length;
  if(allowedPremiseIds.length)rows.items.properties.premiseId.enum=allowedPremiseIds;
  const assertions=rows.items.properties.numericAssertions;
  if(allowedComparisonKeys.length)assertions.items.properties.comparisonKey.enum=allowedComparisonKeys;
  else assertions.maxItems=0;
  for(const [selection,quote]of Object.entries(fields)){
    delete tradeoff.properties[quote];tradeoff.required=tradeoff.required.map(k=>k===quote?selection:k);
    tradeoff.properties[selection]={type:'array',minItems:0,items:{type:'integer',minimum:1,maximum:sources.length}};
  }
  const contract=createStarcraftTmgOutputContractV1({id:'roster.comparison_quote_selection',version:premise.factPolicy?'1.3.0':'1.1.0',
    schemaName:'roster_comparison_quote_selection_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.comparison_quote_selection',version:'1.1.0',hash:hash('roster.comparison_quote_selection.v1.1')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit source-number selection binds verbatim quotes; original review and premise checks remain authoritative.'});
  const node={kind:'comparison_quote_selection',version:1,premiseSelectionVersion:1,
    authorResultRef:premise.authorResultRef,allowedPremiseIds,allowedComparisonKeys,sources,
    instruction:'AUDIT ROWS and QUOTE SOURCES are separate namespaces. On finish emit exactly one row for every allowedPremiseId; quote-only /value paths are NOT additional premiseIds. On read/catalogue rows may be empty. numericAssertions selects only allowedComparisonKeys; when that list is empty numericAssertions MUST be [] in every row. Raw attack receipts still support semantic findings via evidenceNumbers and publicReason, but do not manufacture a comparisonKey or a satisfied boolean for them. In premiseAudit.tradeoff select retainedSourceNumbers and foregoneSourceNumbers from this exact author-source list. Do not emit retainedComponentQuotes/foregoneBenefitQuotes or retype, translate or paraphrase a quote. Host copies only the sources YOU select. An absent supporting passage may use an empty selection with requires_revision/needs_evidence and an explanation; never fabricate a passage. Selection does not prove its meaning: keep independent verdicts, public reasons, premise rows and aggregate checks. Read the exact author sentence WITH its existing conditions: do not reject it for lacking a qualifier it already contains. A measured point-estimate difference is not itself proof that a swap is strategically worthwhile. Distinguish "no measured difference" (a factual assertion) from "the measured difference does not justify my choice" (a strategic assessment requiring reasons). If the author has not justified the tradeoff, identify that missing rationale rather than invent an arithmetic contradiction or require a winning experiment. Earlier reviewer findings are not authoritative; correct a mistaken finding when the existing original source establishes it. A rejected premise still rejects closure; no automatic author correction, experiment, Plan approval or extra source access.'};
  if(premise.factPolicy){node.instruction='每个allowedPremiseId保留一行；事实值只来自factSlots。factClaims必须提取原句里的事实断言，不论你认为其正确或错误：选择原句quote、原文token和对应factId，由Host确认差异，不得填写actual，也不能因supported省略。纯偏好、假设和没有事实断言的句子才可为空。策略评价可写建议，即使requires_revision也不能凭偏好阻止作者。retained/foregoneSourceNumbers只选原句序号，可为空，不造证据。读时行为空，finish按原句覆盖。';}
  const next={...request,promptNodes:[...request.promptNodes,node],
    strategyRepairState:{originalResponseFormat:copy(request.responseFormat)},
    userMessage:request.userMessage+'\n'+node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,
    userMessage:next.userMessage,responseFormat:next.responseFormat});return next;
}
export function projectRosterComparisonQuoteOutputV1({request,output}){
  const node=request.promptNodes.find(n=>n.kind==='comparison_quote_selection'&&n.version===1);
  const shaped=projectSchemaOwnedChildFieldsV1(output,request.responseFormat.schema);
  const checked=validate(request.responseFormat.schema,shaped.output);
  if(!checked.ok)return {output:null,projection:[],errors:[{code:'comparison_quote_selection_schema',issues:checked.issues}]};
  const projected=copy(shaped.output),projection=[...shaped.projection],tradeoff=projected.premiseAudit.tradeoff;
  for(const [selection,quote]of Object.entries(fields)){
    const numbers=tradeoff[selection],texts=numbers.map(n=>node.sources[n-1].text);
    delete tradeoff[selection];tradeoff[quote]=texts;
    projection.push({from:'/premiseAudit/tradeoff/'+selection,to:'/premiseAudit/tradeoff/'+quote,
      sourceNumbers:copy(numbers),authorResultRef:node.authorResultRef,value:copy(texts),
      rule:'model_selected_author_quote_v1',interpretationApproved:false});
  }
  return {output:projected,projection,errors:[]};
}
