// A navigable input view, not a shortened or rewritten receipt. The immutable
// source stays available under exact JSON Pointers. Large sections are fetched
// by the assigned role only when its question requires them.
import {projectRosterWorkflowStateReferenceV1,projectRosterParticipantConfigurationReadV1} from './roster-workflow-state-reference-v1.mjs';
import {projectRosterWorkflowExecutionPrerequisitesV1} from './roster-workflow-execution-prerequisites-v1.mjs';
import {rosterAuditedCandidateSourceV1} from './roster-workflow-candidate-source-v1.mjs';
import {parseRosterTeachEvidencePathV1} from './roster-teach-typed-evidence-v1.mjs';
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';
import {projectRosterActionEligibilityV1,projectRosterActionUnavailableDirectoryV1} from './roster-action-eligibility-view-v1.mjs';

// Saved inspect facts stay immutable, but their embedded invocation recipes
// may describe an older transport. Deliver the current source-owned recipe
// alongside the EXACT read, never overwrite it or manufacture a new receipt.
export function projectRosterCurrentInvocationContractsV1({reads,descriptor}){
  const contracts=[];
  for(const operation of descriptor?.operations??[]){
    for(const [capability,currentContract]of Object.entries(operation.specContract?.capabilityContracts??{})){
      for(const read of reads??[]){
        if(read.status!=='read')continue;
        const pointer=read.pointer??'';
        const saved=pointer.endsWith('/scenarioConstruction/'+capability)?read.value
          :pointer.endsWith('/scenarioConstruction')?read.value?.[capability]
          :pointer===''?read.value?.receipt?.scenarioConstruction?.[capability]:null;
        if(!saved||!saved.version||saved.version===currentContract.version)continue;
        contracts.push({operation:operation.operation,capability,
          historicalSource:{evidenceId:read.evidenceId,evidenceNumber:read.evidenceNumber,
            pointer,historicalVersion:saved.version},
          currentContract:structuredClone(currentContract),
          savedContext:Object.fromEntries(['firstPlayerSideKey','sourceEligible']
            .filter(key=>Object.hasOwn(saved,key)).map(key=>[key,structuredClone(saved[key])])),
          originalArtifactUnchanged:true});
      }
    }
  }
  return contracts.length?{kind:'current_saved_source_invocation_contracts',version:1,contracts,nativeFact:false,
    instruction:'The saved inspect remains exact evidence about its state. Its historical request/recipe is NOT the current call format. Use currentContract for operation, argument and whole-state binding fields; use savedContext only for that inspected source. Do not copy retired request fields or invent Native action keys. After preparation inspect the real successor menu and select from that saved menu through native_action.selection. This metadata executes nothing, chooses no action and grants no new scope or fact approval.'}:null;
}
// The read interface and factual verifier must interpret the same handle.
// Metadata such as /sections is never itself a Native observation.
const formationFactRoots=[
  ['optionCount','optionCount'],
  ...['search','jointUnitIds','noLegalFormationProven','arrivalOrMovementLegalityProven','trainingTruth']
    .map(key=>['searchOutcome/'+key,key]),
];
function existingPointer(value,keys){
  for(const key of keys){
    if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return false;
    value=value[key];
  }
  return true;
}
// An invalid leaf address may have the right field name but the wrong parent.
// Enumerate actual source addresses, including ambiguity; never infer which
// occurrence the author meant or turn a navigation result into a measurement.
export function projectRosterReceiptLeafReadHandlesV1({source,pointer}){
  const tokens=parseRosterTeachEvidencePathV1(pointer)?.keys;
  if(tokens?.[0]!=='receipt'||tokens.length<2||!source?.receipt)return [];
  const leaf=String(tokens.at(-1)),handles=[],stack=[{body:source.receipt,pointer:'/receipt'}];
  while(stack.length){
    const row=stack.pop();
    if(!row.body||typeof row.body!=='object')continue;
    for(const [key,value]of Object.entries(row.body)){
      const at=row.pointer+'/'+key.replaceAll('~','~0').replaceAll('/','~1');
      if(key===leaf)handles.push({pointer:at,valueType:Array.isArray(value)?'array':value===null?'null':typeof value,bodyRead:false});
      if(value&&typeof value==='object')stack.push({body:value,pointer:at});
    }
  }
  return handles;
}
// Only lossless, named Native fields have aliases. Aggregated miss counts,
// projected option summaries and navigation metadata remain NON-measurements.
// The verifier still reads the registered original and checks the exact value.
export function projectRosterReceiptViewFactHandlesV1(view){
  if(view?.schema!=='roster_workflow_receipt_view_v1')return [];
  const directory=view.formationOptionDirectory,handles=[];
  for(const [display,source] of directory?formationFactRoots:[]){
    if(!existingPointer(directory,display.split('/')))continue;
    const handle={viewPointer:'/formationOptionDirectory/'+display,pointer:'/receipt/queryReceipt/result/'+source};
    handles.push(handle);
    if(source==='search')for(const key of Object.keys(directory.searchOutcome.search??{})){
      const token=key.replaceAll('~','~0').replaceAll('/','~1');
      handles.push({viewPointer:handle.viewPointer+'/'+token,pointer:handle.pointer+'/'+token});
    }
  }
  if(view.operation==='builder_branches'){
    for(const [display,source]of [['budgetBranchScope','searchScope'],['nextPage','nextPage']])
      if(Object.hasOwn(view,display)&&view.sections?.some(s=>s.pointer==='/receipt/'+source))
        handles.push({viewPointer:'/'+display,pointer:'/receipt/'+source});
    for(const [index,branch]of (view.budgetBranchDirectory??[]).entries())
      for(const key of ['branchId','mutationKind','steps','mineralSpent','mineralShortfall','exactBudget'])
        if(Object.hasOwn(branch,key))handles.push({viewPointer:`/budgetBranchDirectory/${index}/${key}`,
          pointer:`/receipt/branches/${index}/${key}`});
  }
  if(view.operation==='inspect')for(const row of view.actionUnavailableDirectory??[]){
    if(!Number.isSafeInteger(row.index)||row.index<0)continue;
    for(const key of ['pieceId','actionType','phase','disabledReason'])if(Object.hasOwn(row,key)&&row[key]!==null)
      handles.push({viewPointer:`/actionUnavailableDirectory/${row.index}/${key}`,
        pointer:`/receipt/actionSpace/actionAvailability/disabledActions/${row.index}/${key}`});
  }
  return handles;
}
// Producer-owned meaning for every current view. A directory contains Host
// addresses/instructions as well as copied fields: its whole object is not an
// executed Native observation. Offer original addresses, never rewrite a claim.
export function projectRosterReceiptViewCitationContractV1(view){
  if(view?.schema!=='roster_workflow_receipt_view_v1')return null;
  const fields=[{viewPointer:'/status',kind:'execution_metadata',nativeFactEligible:false,
    sourcePointers:[],meaning:'Host dispatch status, not Builder legality or a computed Rules result. Cite the tool in evidenceNumbers/conditions; select an original receipt field for a Native claim.'}];
  if(view.operation==='builder_branches')fields.push({viewPointer:'/budgetBranchDirectory',
    kind:'navigation_directory',nativeFactEligible:false,sourcePointers:['/receipt/branches'],
    meaning:'Host directory with index, candidatePointer and instructions. Read /receipt/branches or a named field; the directory as a whole is not that Native array.'});
  for(const h of projectRosterReceiptViewFactHandlesV1(view))fields.push({
    ...h,kind:'exact_source_alias',nativeFactEligible:true,sourcePointers:[h.pointer],
    meaning:'Address alias only. Current source, actual read, exact value and independent question coverage remain required.'});
  return {version:1,fields,hostNavigationOnly:true,claimApproved:false,
    instruction:'Use exact_source_alias or /receipt/... for nativeFacts. execution_metadata and navigation_directory may explain a tool/control result, but must not be copied as a Native observation. Read the supplied original address and explicitly select the needed field; Host does not replace your assertion or approve strategy.'};
}
export function resolveRosterReceiptViewPointerV1(view,pointer){
  if(view?.schema!=='roster_workflow_receipt_view_v1'||typeof pointer!=='string')return null;
  if(pointer==='/receipt'||pointer.startsWith('/receipt/')||pointer==='/stateRef'||pointer.startsWith('/stateRef/'))return pointer;
  const keys=parseRosterTeachEvidencePathV1(pointer)?.keys;
  if(['formationOptionDirectory','budgetBranchDirectory','budgetBranchScope','nextPage','actionUnavailableDirectory'].includes(keys?.[0])){
    if(!existingPointer(view,keys))return null;
    for(const handle of projectRosterReceiptViewFactHandlesV1(view))
      if(pointer===handle.viewPointer||pointer.startsWith(handle.viewPointer+'/'))
        return handle.pointer+pointer.slice(handle.viewPointer.length);
    return null;
  }
  if(keys?.[0]!=='sections'||keys[2]!=='value')return null;
  const section=view.sections?.[keys[1]];
  if(typeof section?.pointer!=='string'||!section.pointer.startsWith('/receipt/'))return null;
  return section.pointer+keys.slice(3).map(k=>'/'+String(k).replaceAll('~','~0').replaceAll('/','~1')).join('');
}
// Read-time Host navigation for old AND new immutable views. It offers every
// out-of-line section, without choosing which fact the model needs to read.
export function projectRosterWorkflowReceiptReadNavigationV1({view,evidenceNumber,selectedPointer,selectedValue}){
  if(view?.schema!=='roster_workflow_receipt_view_v1'||!Number.isSafeInteger(evidenceNumber)||evidenceNumber<1)return null;
  const sections=view.sections??[],selectedIndex=selectedPointer===undefined?-1:sections.findIndex(section=>
    selectedPointer===section.pointer||selectedPointer.startsWith(section.pointer+'/'));
  return {schema:'roster_receipt_read_navigation_v1',hostNavigationOnly:true,originalArtifactUnchanged:true,
    handles:sections.flatMap((section,sectionIndex)=>section.availableByExactRead===true?[{
      sectionIndex,sectionPointer:section.pointer,valueType:section.type,characters:section.characters,
      read:{evidenceNumber,pointer:section.pointer}}]:[]),
    ...(selectedIndex>=0?{selectedSectionIndex:selectedIndex,selectedSectionPointer:sections[selectedIndex].pointer,
      resolvedSourcePointer:selectedPointer,selectedValueType:Array.isArray(selectedValue)?'array':selectedValue===null?'null':typeof selectedValue,
      selectedSectionAlreadyInline:Object.hasOwn(sections[selectedIndex],'value')}:{}),
    instruction:'Use the explicit handle.read {evidenceNumber,pointer} for a needed large section; do NOT count or guess /sections/N/value indices. If you read an index, selectedSectionPointer states what you ACTUALLY received. An inline hash/status is not a missing query payload. Handles are addresses only: they neither fetch all sections nor count as having read their contents. Keep choosing which exact source your question needs.'};
}
function formationSearchOutcome(result){
  if(!result||typeof result!=='object')return null;
  const groups=new Map();
  for(const [index,miss] of (result.misses??[]).entries()){
    const reason=miss.reason??null,anchorRejectionReason=miss.diagnostic?.anchorRejection?.reason??null;
    const key=JSON.stringify([reason,anchorRejectionReason]);
    const group=groups.get(key)??{reason,anchorRejectionReason,count:0,
      sourcePointerTemplate:'/receipt/queryReceipt/result/misses/{index}',sourceIndexRanges:[]};
    group.count++;
    const last=group.sourceIndexRanges.at(-1);
    if(last&&last[1]+1===index)last[1]=index;else group.sourceIndexRanges.push([index,index]);
    groups.set(key,group);
  }
  return {pointer:'/receipt/queryReceipt/result',
    ...Object.fromEntries(['search','jointUnitIds','noLegalFormationProven','arrivalOrMovementLegalityProven','trainingTruth']
      .filter(key=>Object.hasOwn(result,key)).map(key=>[key,structuredClone(result[key])])),
    missCount:Array.isArray(result.misses)?result.misses.length:null,misses:[...groups.values()],
    instruction:'Exact Native search/proof fields and a lossless index of miss reasons, not a new feasibility verdict. sourceIndexRanges are inclusive [first,last] array indices; substitute any index into sourcePointerTemplate to read that exact original miss. No diagnostic was removed or reclassified. A bounded miss is not continuous-space impossibility. Read a named miss for its footprint/blocker details; this search does not prove movement or arrival. Do not replay the same failed region as new evidence.'};
}
// One source-backed result directory for tool reads AND subsequent planners.
// The directory conveys search outcome and proof scope; raw diagnostic bodies
// remain at their exact source pointers, not copied into every later request.
export function projectRosterStaticFormationOptionV1(option,optionIndex){
  const joint=Array.isArray(option.jointUnitIds)&&option.jointUnitIds.length>1;
  return {optionIndex,
    ...(joint?{selectionScope:'whole_joint_formation',unitIds:structuredClone(option.jointUnitIds),
      unitAnchors:(option.unitOptions??[]).map(row=>({unitId:row.pieceId,anchor:structuredClone(row.anchor)})),
      mustApplyTogether:true,jointGeometryProven:option.jointGeometryProven===true}
      :{selectionScope:'single_unit_formation',unitId:option.pieceId,unitIds:[option.pieceId],
        anchor:structuredClone(option.anchor),mustApplyTogether:false}),
    staticGeometryProven:option.staticGeometryProven===true};
}
export function projectRosterStaticFormationResultDirectoryV1(result){
  return {pointer:'/receipt/queryReceipt/result/formationOptions',
    optionCount:result?.formationOptions?.length??null,
    searchOutcome:formationSearchOutcome(result),
    options:(result?.formationOptions??[]).map(projectRosterStaticFormationOptionV1),
    selectionContract:'Choose {sourceEvidenceNumber: THIS Native receipt evidence number, optionIndex}. A whole_joint_formation entry is ONE complete option for ALL its unitIds and must be applied together, not a single-unit option named after the first unit. Host reads the exact source and option; do not write work IDs, option IDs or coordinates. Zero options means no selectable candidate, not impossibility.'};
}
// Historical views are immutable artifacts, not version-frozen interfaces.
// Refresh only derived navigation from the registered original; old section
// addresses and Native data retain their exact meaning.
export function projectRosterCurrentReceiptReadViewV1({view,source,sourceArtifactRef}){
  if(view?.schema!=='roster_workflow_receipt_view_v1')return view;
  const comparisonMeaning=projectRosterMeasuredComparisonMeaningV1(source?.receipt);
  const actionEligibility=projectRosterActionEligibilityV1(source);
  const actionUnavailableDirectory=projectRosterActionUnavailableDirectoryV1(source);
  const current={citationContract:projectRosterReceiptViewCitationContractV1(view),
    ...(source?.participantConfigurationCheck?{participantConfigurationCheck:projectRosterParticipantConfigurationReadV1(source)}:{}),...(source?.receipt?.queryKind==='space.solve_static_formation'?{
    formationOptionDirectory:projectRosterStaticFormationResultDirectoryV1(source.receipt.queryReceipt?.result)}:{}),
    ...(comparisonMeaning?{comparisonMeaning}:{}),...(actionEligibility?{actionEligibility}:{}),
    ...(actionUnavailableDirectory?{actionUnavailableDirectory}:{})};
  if(!Object.keys(current).length)return view;
  return {...view,...current,
    currentReadProjection:{schema:'roster_current_receipt_read_projection_v1',version:5,
      sourceEvidenceId:view.evidenceId,sourceArtifactRef,originalArtifactUnchanged:true,
      fields:Object.keys(current),
      instruction:'Current source-derived navigation and named comparison meaning supersede historical display metadata only. Native options, source evidence, section addresses and original artifact are unchanged. This is not a new measurement or strategic approval.'}};
}
export function projectRosterWorkflowReceiptViewV1({evidenceId,value,conditions=[]}) {
  const comparisonMeaning=projectRosterMeasuredComparisonMeaningV1(value.receipt);
  const actionEligibility=projectRosterActionEligibilityV1(value);
  const sceneReceipt=value.receipt?.sceneProjectionReceipt??value.receipt;
  const scenePointer=value.receipt?.sceneProjectionReceipt
    ?'/receipt/sceneProjectionReceipt/sceneProjection':'/receipt/sceneProjection';
  const auditedCandidate=rosterAuditedCandidateSourceV1(value);
  const pointer=key=>'/receipt/'+String(key).replaceAll('~','~0').replaceAll('/','~1');
  const sections=Object.entries(value.receipt??{}).map(([key,body])=>{
    const characters=JSON.stringify(body).length;
    return {pointer:pointer(key),type:Array.isArray(body)?'array':body===null?'null':typeof body,characters,
      ...(characters<=4096?{value:structuredClone(body)}:{availableByExactRead:true})};
  });
  const view={schema:'roster_workflow_receipt_view_v1',evidenceId,operation:value.operation,status:value.status,
    ...(actionEligibility?{actionEligibility}:{}),
    ...(comparisonMeaning?{comparisonMeaning}:{}),
    ...(value.toolProofScope?{toolProofScope:structuredClone(value.toolProofScope)}:{}),
    ...(value.participantConfigurationCheck?{participantConfigurationCheck:projectRosterParticipantConfigurationReadV1(value)}:{}),
    ...(value.experimentOrigin?{experimentOrigin:structuredClone(value.experimentOrigin),scenarioExperienceRef:value.scenarioExperienceRef??null}:{}),
    ...(value.queryReuse?{executed:false,queryReuse:structuredClone(value.queryReuse)}:{}),
    ...(projectRosterWorkflowExecutionPrerequisitesV1(value)?{executionPrerequisites:projectRosterWorkflowExecutionPrerequisitesV1(value)}:{}),
    ...(projectRosterWorkflowStateReferenceV1(value)?{stateRef:projectRosterWorkflowStateReferenceV1(value),stateRefPointer:'/stateRef',
      stateRefMeaning:'Complete Host-derived candidate + state identity. Bind /stateRef to next arguments /stateRef; no manual base/context/hash assembly. Metadata projection only, not additional game evidence.'}:{}),
    ...(value.contextRef?{contextRef:value.contextRef,contextScope:'This receipt belongs to the selected private candidate; pass this contextRef on subsequent queries, independently of the branch hash.'}:{}),
    conditions:structuredClone(conditions),sections,
    ...(auditedCandidate?{auditedCandidateSelection:{
      candidatePointer:auditedCandidate.candidatePointer,mutationField:'rosterCandidateSelection',
      instruction:'Read this complete immutable candidate, then explicitly choose {sourceEvidenceNumber:THIS_SOURCE_NUMBER}. No simultaneous unit/card edits or branch selection. Current Builder rechecks; this is not a strategic recommendation or historical audit approval.'}}:{}),
    ...(value.operation==='inspect'&&value.receipt?.actionSpace?{actionMenuDirectory:[
      ...(value.receipt.actionSpace.finiteActions??[]).map((entry,index)=>({kind:'finite',index,
        actionType:entry.action?.actionType??null,pieceId:entry.action?.pieceId??null,
        candidateId:entry.candidateId??null,readPointer:`/receipt/actionSpace/finiteActions/${index}`})),
      ...(value.receipt.actionSpace.parameterDomains??[]).map((entry,index)=>({kind:'domain',index,
        domainId:entry.domainId,actionType:entry.actionType,pieceId:entry.pieceId??null,
        abilityName:entry.abilityName??null,readPointer:`/receipt/actionSpace/parameterDomains/${index}`})),
      ],actionMenuDirectoryIsBodyRead:false,
      ...(value.receipt.actionSpace.actionAvailability?{actionUnavailableDirectory:projectRosterActionUnavailableDirectoryV1(value),
        actionUnavailableDirectoryIsBodyRead:false,
        actionUnavailableMeaning:'Exact current-state Native diagnostics, not selectable actions or a global unsupported-capability conclusion. Read the original entry; supported phases are in actionCapabilityReference.'}:{}),
      actionMenuInstruction:'These exact identities are navigation, not a parameter contract or outcome. Read the selected entry, then select it by exact domainId/primitive identity or index. Ability display names are not actionType aliases.'}:{}),
    ...(sceneReceipt?.sceneProjection?{sceneComparison:{
      pointer:scenePointer,
      ...Object.fromEntries(['referenceStateHash','exactUnits','adaptedUnits','excludedTargetUnits','conditions',
        'referenceNonGeometryTransferred','arrivalOrMovementLegalityProven','globalRosterSuperiorityProven']
        .map(key=>[key,structuredClone(sceneReceipt.sceneProjection[key])]))}}:{}),
    ...(value.receipt?.queryKind==='space.solve_static_formation'?{formationOptionDirectory:
      projectRosterStaticFormationResultDirectoryV1(value.receipt.queryReceipt?.result)}:{}),
    ...(value.operation==='builder_branches'?{budgetBranchDirectory:(value.receipt?.branches||[]).map((branch,index)=>({
      index,branchId:branch.branchId,mutationKind:branch.mutationKind,steps:structuredClone(branch.steps),
      mineralSpent:branch.mineralSpent,mineralShortfall:branch.mineralShortfall,exactBudget:branch.exactBudget,
      candidatePointer:`/receipt/branches/${index}/candidateInput`,
      instruction:'Rules-audited candidate, NOT a strategy recommendation. Read the exact candidate, then choose mutation.rosterBranchSelection={sourceEvidenceNumber:THIS_SOURCE_NUMBER,branchId} with no explicit unit/card edits; Host copies and Builder rechecks it. Or deliberately propose different explicit edits without claiming this exact branch.'})),
      budgetBranchScope:structuredClone(value.receipt?.searchScope),
      nextPage:structuredClone(value.receipt?.nextPage??null)}:{}),
    instruction:'Inline section values are exact receipt sections. Top-level status and directories are Host metadata, not Native facts; use citationContract for source addresses. Large sections are still available in the named tool evidence: select its evidenceNumber and the exact section pointer or a child pointer. Read only what this question needs. No section was discarded; do not infer that an unread section is missing.'};
  return {...view,citationContract:projectRosterReceiptViewCitationContractV1(view)};
}
