import {ROSTER_PLAN_FACT_SECTIONS_V1} from './roster-plan-synchronization-v1.mjs';
// One semantic obligation per existing reviewer work item. The coordinator
// only copies completed judgments; it never authors a verdict or Plan patch.
import {isDeepStrictEqual as equal} from 'node:util';
const copy=structuredClone;
const fail=detail=>{throw Object.assign(Error('ROSTER_ATOMIC_REVIEW_BINDING_INVALID'),{detail});};
const localSections={
  'component_facts:selected_inventory':[...ROSTER_PLAN_FACT_SECTIONS_V1],
  'component_facts:purchase_constraints':['publicSummaryText','componentPurposes'],
  'resource_allocation:budget_facts':['publicSummaryText','componentPurposes','lossResourceBudget'],
  'resource_allocation:declared_choice':['publicSummaryText','componentPurposes','lossResourceBudget'],
};
const resourceReviewInstructions={
  budget_facts:'Verify only current authored budget claims against current Native budget and Host construction targets: minerals and gas are separate, evaluated gas amounts retain their units. Native legality uses upper limits; the user requires the mineral target but allows reasoned retention of unused gas. Do not mistake legality for completed construction or demand new purchases from a FIXED army. Do not assess strategy, alternative purchases, future control, or whether an unused-gas reason is persuasive. requiresOpportunityExplanation records a separate workflow obligation, not this check. Report a concrete fact mismatch or missing source for this obligation only.',
  declared_choice:'Verify only whether the current author explicitly states the resource choice and its reason. Do not grade that reason, choose a purchase, or certify its factual or strategic correctness: budget facts and opportunity cost have separate checks. requiresOpportunityExplanation records that separation; it does not expand this assignment. A missing declaration returns to the author, not to an experiment.',
  opportunity_cost:'Assess only the current author\'s resource trade-off under its stated goal and conditions, using actual source-backed costs, eligibility and effects. Budget accuracy and existence of a declaration are separate checks; read their premises as needed, but do not re-answer those checks. Judge a bounded relevant alternative and allow a justified retention of strategic direction; unused gas does not require a purchase when the actual trade-off is justified; the mineral target still applies. Fixed armies remain unchanged. Do not require exhaustive alternatives, global optimality, a future victory, or a new experiment merely because gas remains unspent.',
};
const ownObligationOnly='Resource quantities are context for the SINGLE assigned obligation, not another review assignment. Resource choice, unused-gas justification and alternative-purchase comparisons belong to their separately assigned checks. Verify only the current claim and its necessary premises; do not create an additional resource or future-match proof obligation.';
const nonResourceDomains=new Set(['scoring_and_timing','map_and_arrival','combat_and_losses','opponent_and_counters','plan_continuity']);
const domainResourceContextOnly='These exact Native resource quantities are factual context for this domain\'s assigned obligations, not an additional resource strategy review. Check costs, limits or payment only when they are premises of an assigned current claim. Resource allocation, unused-gas justification and alternative-purchase merit belong to the component/resource checks. Do not create another resource-comparison or future-match proof obligation; return only the assigned domain judgment.';
export function expandRosterAtomicReviewJobsV1(jobs){
  return jobs.flatMap(parent=>{
    if(parent.role!=='roster_workflow_final_review'||parent.inputs.review?.value?.atomicReviewVersion!==1)return [parent];
    const obligations=parent.inputs.review.value.obligations;
    if(!obligations?.length||new Set(obligations.map(o=>o.checkId)).size!==obligations.length)fail('unique obligations required');
    const groups=[];
    for(const obligation of obligations){
      const previous=obligation.atomicReviewGroup&&groups.find(items=>items[0].checkId===obligation.atomicReviewGroup);
      if(previous)previous.push(obligation);else groups.push([obligation]);
    }
    const children=groups.map((group,index)=>{
      const obligation=group[0],component=obligation.checkId==='component_choices';
      const id=`${parent.id}:check:${index}`,sections=localSections[obligation.checkId];
      const inputs={};
      for(const [key,input]of Object.entries(parent.inputs)){
        if(['review','reviewScope','mechanics','draft','intent'].includes(key))inputs[key]=copy(input);
        else if(['frozenParticipantSource','opponentContextContract'].includes(key)
          &&(component||obligation.checkId==='resource_allocation:opportunity_cost'))inputs[key]=copy(input);
        else if(key.startsWith('claim')&&input.source==='evidence'&&(!sections||sections.some(section=>
          input.id===`draft:r${parent.draftRevision}:plan:${section}`||input.id.startsWith(`draft:r${parent.draftRevision}:plan:${section}:`))))
          inputs[key]=copy(input);
      }
      inputs.review.value.obligations=copy(group);
      inputs.reviewScope.value.obligations=copy(group);
      if(!component)delete inputs.review.value.componentCoverageVersion;
      if(sections)inputs.reviewScope.value.claimPaths=sections.map(s=>'/'+s);
      // The shared read-context projector supplies exact units, equipped
      // upgrades and full prices from this same Native artifact. Assigning
      // its summary does not grant a full-body read or repeat the entire audit.
      inputs.currentBuilder={source:'evidence',id:`draft:r${parent.draftRevision}:builder`,pointer:'/summary'};
      inputs.currentCards={source:'evidence',id:`draft:r${parent.draftRevision}:builder`,pointer:'/audit/armyResourceBudgetResult/tacticalCardRows'};
      inputs.atomicReviewItem={source:'literal',value:{version:1,parentWorkId:parent.id,
        parentRevision:parent.draftRevision,parentRound:parent.reviewRound,checkId:obligation.checkId,
        ...(group.length>1?{checkIds:group.map(o=>o.checkId)}:{}),
        ...(obligation.checkId==='component_facts:selected_inventory'?{inventoryExtractionVersion:1}:{}),
        instruction:'Answer ONLY the supplied check IDs against the current claims and actual sources. The selected upgrade checks belong to this same component-purpose assignment; answer each one, without duplicating shared experiments. Other judgments are separate work. A prior approval is not evidence; do not reinterpret a false claim into a true one. Additional necessary sources remain available through the ordinary catalogue and exact reader. Do not choose units, rewrite the Plan, or request unrelated proof.'}};
      return {id,role:parent.role,bindings:copy(parent.bindings),draftRevision:parent.draftRevision,
        reviewRound:parent.reviewRound,atomicReviewParentId:parent.id,inputs};
    });
    const inputs=Object.fromEntries(Object.entries(parent.inputs).filter(([key])=>key!=='atomicReviewAggregate'&&!key.startsWith('atomicResult')));
    inputs.atomicReviewAggregate={source:'literal',value:{version:1,parentWorkId:parent.id,
      sourceDraftRef:parent.inputs.reviewScope.value.sourceDraftRef,revision:parent.draftRevision,
      reviewRound:parent.reviewRound,members:children.map((child,i)=>({workId:child.id,checkId:groups[i][0].checkId,
        ...(groups[i].length>1?{checkIds:groups[i].map(o=>o.checkId)}:{})}))}};
    children.forEach((child,i)=>{inputs[`atomicResult${i}`]={source:'work',id:child.id,pointer:'/value'};});
    return [...children,{...parent,inputs}];
  });
}

export async function aggregateRosterAtomicReviewV1({assignment,state,readArtifact}){
  const spec=assignment.inputs.atomicReviewAggregate?.value;
  if(spec?.version!==1||spec.parentWorkId!==assignment.workId||spec.revision!==state.draftRevision
    ||spec.sourceDraftRef!==state.draftRef||!equal(assignment.bindings,state.scope))fail('parent scope');
  const parent=state.work.find(w=>w.id===spec.parentWorkId),expected=parent?.inputs.review?.value?.obligations;
  const assignedIds=spec.members.flatMap(m=>m.checkIds??[m.checkId]);
  if(!expected||parent.reviewRound!==spec.reviewRound||assignedIds.length!==expected.length
    ||new Set(spec.members.map(m=>m.workId)).size!==spec.members.length
    ||new Set(assignedIds).size!==expected.length||!equal(assignedIds,expected.map(o=>o.checkId))
    ||!equal(parent.inputs.atomicReviewAggregate?.value,spec))fail('parent obligations');
  const checks=[],members=[];
  for(const [index,member]of spec.members.entries()){
    const child=state.work.find(w=>w.id===member.workId),input=assignment.inputs[`atomicResult${index}`];
    const checkIds=member.checkIds??[member.checkId],obligations=checkIds.map(id=>expected.find(o=>o.checkId===id));
    if(member.checkId!==checkIds[0]||child?.atomicReviewParentId!==parent.id
      ||child.role!=='roster_workflow_final_review'||child.status!=='evidence_ready'||!child.resultRef
      ||child.operationState?.pending||child.draftRevision!==spec.revision||child.reviewRound!==spec.reviewRound
      ||!equal(child.bindings,parent.bindings)||input?.source!=='work'||input.workId!==child.id
      ||input.resultRef!==child.resultRef||!equal(child.inputs.review.value.obligations,obligations))fail(member.workId);
    const body=await readArtifact(child.resultRef);
    if(child.inputs.atomicReviewItem.value.inventoryExtractionVersion===1
      &&body.value?.inventoryVerification?.version!==1)fail('inventory extraction/comparison result missing');
    if(!equal(input.value,body.value)||body.value?.checks?.length!==checkIds.length
      ||!equal(body.value.checks.map(c=>c.checkId).sort(),[...checkIds].sort()))fail('child result '+member.workId);
    checks.push(...checkIds.map(id=>copy(body.value.checks.find(c=>c.checkId===id))));
    if(child.reviewDependencyReuse){
      const proof=child.reviewDependencyReuse,origin=state.work.find(w=>w.id===proof.originWorkId);
      if(proof.appliesToDraftRef!==state.draftRef||proof.appliesToRevision!==spec.revision
        ||proof.originResultRef!==child.resultRef||origin?.resultRef!==child.resultRef
        ||proof.originRevision!==origin.draftRevision||proof.newModelReview!==false
        ||proof.originalResultRewritten!==false||child.operationState?.calls?.length)fail('child reuse provenance');
    }
    members.push({...copy(member),resultRef:child.resultRef,
      ...(child.reviewDependencyReuse?{reuseProof:copy(child.reviewDependencyReuse)}:{})});
  }
  return {kind:'proposal',value:{checks,publicReason:'Host copied each independent check unchanged; no aggregate model judgment.',
    atomicReviewAggregation:{version:1,...copy(spec),members},modelInterpretationNotRulesTruth:true,
    acceptanceGranted:false},conditions:['Engineering fan-in of actual child judgments; not release approval']};
}

// Presentation only. Original assignments, exact reads and all source bodies
// remain in the product store. Catalogue/read permissions are unchanged.
export function projectRosterAtomicReviewScopeV1(scope){
  const value=copy(scope);
  delete value.factBoundary;delete value.interpretationBoundary;delete value.carriedQuestions;
  value.hostDependencyRecord='Complete dependency/reuse scope is saved in the canonical assignment; not an extra semantic obligation.';
  return value;
}
// Compare the scope actually delivered, including the explicit domain-only
// presentation. Old requests keep their raw scope; no old reply is rewritten.
export function rosterReviewScopeDeliveredV1({request,consumer,contract}){
  const sent=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment'&&n.workId===consumer.id);
  if(!sent)return false;
  const projected=consumer.atomicReviewParentId||request.promptNodes.some(n=>
    n.kind==='domain_review_context'&&n.version===1&&n.workId===consumer.id&&n.domainId===contract.domainId);
  return equal(sent.inputs?.reviewScope?.value,projected?projectRosterAtomicReviewScopeV1(contract):contract);
}
export function prepareRosterAtomicReviewRequestV1(request,{directory=[]}={}){
  const node=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const item=node?.inputs.atomicReviewItem?.value;
  if(item?.version!==1){
    const scope=node?.inputs?.reviewScope?.value;
    if(request.roundKind!=='roster_workflow_final_review'||node?.role!=='roster_workflow_final_review'
      ||node.inputs.atomicReviewAggregate||scope?.kind!=='roster_domain_review_scope'
      ||!nonResourceDomains.has(scope.domainId))return request;
    // Domain reviews use the same final request boundary as atomic checks.
    // Preserve facts and original obligations; a shared budget record must not
    // assign every reviewer the resource author's strategic responsibilities.
    const inputs=copy(node.inputs);
    if(inputs.mechanics?.value?.resourceAllocation)
      inputs.mechanics.value.resourceAllocation.instruction=domainResourceContextOnly;
    const promptNodes=request.promptNodes.filter(n=>n.kind!=='resource_allocation_decision_contract')
      .map(n=>n===node?{...n,inputs}:n);
    return {...request,promptNodes};
  }
  const inputs=copy(node.inputs),scope=inputs.reviewScope?.value;
  if(scope)inputs.reviewScope.value=projectRosterAtomicReviewScopeV1(scope);
  const inventory=item.checkId==='component_facts:selected_inventory';
  const resourceDimension=Object.keys(resourceReviewInstructions).find(d=>item.checkId==='resource_allocation:'+d);
  const resourceInstruction=resourceReviewInstructions[resourceDimension]??ownObligationOnly;
  if(inputs.mechanics?.value?.resourceAllocation)
    inputs.mechanics.value.resourceAllocation.instruction=resourceInstruction;
  const localNumbers=new Set(Object.values(inputs).filter(i=>i.source==='evidence')
    .map(i=>i.evidenceNumber??directory.find(e=>e.id===(i.evidenceId??i.id))?.number));
  // Exact reads stay visible. Discovery history can be searched if relevant;
  // neither its former conclusions nor its incidental questions are defaults.
  const promptNodes=request.promptNodes.filter(n=>n.kind!=='historical_evidence_directory'
    &&!(n.kind==='resource_allocation_decision_contract'&&!resourceDimension)
    &&!(inventory&&['resource_allocation_decision_contract','builder_menu_source_coverage','builder_unselected_card_budget_facts'].includes(n.kind)))
    .map(n=>n===node?{...n,inputs}:n.kind==='assigned_evidence_references'&&inventory
      ?{...n,entries:n.entries.filter(e=>localNumbers.has(e.evidenceNumber)),
        instruction:'Current assigned claim/inventory references. Other registered sources remain searchable through action=catalogue; this subset is not a statement of source absence.'}:n);
  // Each resource subcheck keeps its exact original obligation. The broader
  // three-dimensional instruction must not ask it to answer sibling checks.
  for(let i=0;i<promptNodes.length;i++)if(promptNodes[i].kind==='resource_allocation_decision_contract'){
    const contract=copy(promptNodes[i]);
    contract.requiredDimensions=[resourceDimension];
    delete contract.reviewCheckIds;
    contract.instruction=resourceInstruction;
    if(contract.resourceFacts)contract.resourceFacts.instruction=resourceInstruction;
    if(resourceDimension!=='opportunity_cost'){
      delete contract.adequateBasis;delete contract.calibration;
      contract.resultBoundary='Answer only the original assigned check. A supported budget or declaration is not strategic approval. Other checks and their future conditions cannot become requirements here; do not manufacture an investigation.';
    }
    promptNodes[i]=contract;
  }
  return {...request,promptNodes,userMessage:request.userMessage+' This request is one assigned review group; answer every supplied checkId only. No other reviewer verdict is a default answer.'};
}
