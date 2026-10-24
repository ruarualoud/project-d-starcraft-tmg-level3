// Semantic index over immutable workflow artifacts. A design, a method and an
// observation are different assets. This index neither approves evidence nor
// rewrites old receipts; explicit control relations determine responsibility.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterComparisonPurposeFromProposalV1} from './roster-comparison-purpose-v1.mjs';
import {rosterWorkflowUnresolvedSourceIdV1} from './roster-workflow-tool-return-v1.mjs';
import {rosterHypothesisOriginV1} from './roster-hypothesis-test-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterComparisonSceneFactsV1} from './roster-comparison-scene-facts-v1.mjs';
const unwrap=value=>value?.kind&&value.value?value.value:value;
const currentFacts=(work,scope)=>Object.entries(work.bindings??{})
  .filter(([key])=>key!=='plan').every(([key,value])=>scope[key]===value);

// One observation may serve several declared measurements. Store its complete
// row once, retaining the ordered relation to EACH measurement. This is lossless
// navigation, not a summary, relevance filter, source read or coverage verdict.
export function normalizeRosterComparisonCoverageV1(coverage){
  if(!coverage||coverage.schema==='roster_comparison_candidate_directory_v2')return coverage;
  const candidateDirectory=[],numbers=new Map();
  const measurements=coverage.measurements.map(({candidates,...measurement})=>({
    ...measurement,candidateNumbers:candidates.map(candidate=>{
      const key=JSON.stringify(candidate);
      if(!numbers.has(key)){
        numbers.set(key,candidateDirectory.length+1);
        candidateDirectory.push(structuredClone(candidate));
      }
      return numbers.get(key);
    })}));
  return {...coverage,schema:'roster_comparison_candidate_directory_v2',candidateDirectory,measurements,
    instruction:coverage.instruction+' candidateNumbers are one-based indexes into candidateDirectory, NOT evidence numbers. Read/cite each row’s sourceEvidenceNumber. A shared candidate appears once but retains every measurement association; no fact is approved or omitted.'};
}

export async function projectRosterWorkflowExperimentAssetsV1({state,workId,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state);
  const ancestors=graph.ancestors(workId,{accept:work=>currentFacts(work,state.scope)});
  const cache=new Map(),get=async ref=>{
    if(!cache.has(ref))cache.set(ref,await readArtifact(ref));
    return cache.get(ref);
  };
  const evidenceById=new Map(state.evidence.map((source,index)=>[source.id,{...source,number:index+1}]));
  let purposeInput=null,purposeOrigin=null;
  for(const work of ancestors){
    const input=work.inputs?.comparisonPurpose;
    if(input?.source!=='evidence')continue;
    const source=evidenceById.get(input.id??input.evidenceId);if(!source)continue;
    const purpose=rosterComparisonPurposeFromProposalV1({value:unwrap(await get(source.artifactRef))});
    if(!purpose)continue;
    purposeInput={source:'evidence',status:'read',evidenceId:source.id,evidenceNumber:source.number,
      pointer:'/proposals/0/comparisonPurpose',value:purpose};
    purposeOrigin={declarationWorkId:work.id,sourceEvidenceId:source.id,sourceEvidenceNumber:source.number,
      sourceArtifactRef:source.artifactRef,expectedBenefitIsMeasured:false};
    break;
  }
  const explicitOwner=purposeInput?ancestors.find(work=>work.role==='roster_workflow_experiment_planner'
    &&work.experimentGoalId===work.id&&work.inputs?.comparisonPurpose?.id===purposeInput.evidenceId):null;
  const ownerId=explicitOwner?.id??graph.owner(workId)?.goalId??null;
  const current=graph.get(workId),goalId=graph.owner(workId)?.goalId??null;
  const ownsComparison=Boolean(ownerId&&goalId===ownerId&&current?.role==='roster_workflow_experiment_planner'
    &&!current.repairOf&&!current.orderRepairOf&&!current.choiceOf);
  const related=ownerId?graph.descendants(ownerId,{accept:work=>currentFacts(work,state.scope)}):ancestors;
  const tools=related.filter(work=>work.role==='roster_workflow_tool');
  const declarations=[];
  for(const work of ancestors){
    if(work.role!=='roster_workflow_experiment_planner'||!work.resultRef)continue;
    const raw=await get(work.resultRef),proposal=unwrap(raw);
    for(const [index,order]of (proposal.workOrders??[]).entries()){
      if(!order.experimentScope?.hypothesisTest)continue;
      const sources=tools.filter(tool=>tool.experimentOwnerId===work.id
        &&tool.inputs.request?.value?.orderId===order.orderId)
        .map(tool=>evidenceById.get('tool:'+tool.id)).filter(Boolean);
      // An order's first result may be a repaired prerequisite carrying NO
      // hypothesis (or a different child design). The immutable source, not its
      // queue position or parent declaration, owns what a citation can assert.
      const carriers=[];
      for(const source of sources){
        const value=await get(source.artifactRef),origin=rosterHypothesisOriginV1(value);
        if(origin?.hypothesisTest&&hash(origin.hypothesisTest)===hash(order.experimentScope.hypothesisTest))
          carriers.push({...source,pointer:(value.experimentOrigin?'':'/value')+'/experimentOrigin/hypothesisTest'});
      }
      declarations.push({id:work.id+':declared-order:'+order.orderId,declarationWorkId:work.id,
        declarationOrderId:order.orderId,originalExperimentGoalId:work.experimentGoalId??null,
        declarationRef:work.resultRef,
        declarationPointer:(raw===proposal?'':'/value')+`/workOrders/${index}/experimentScope/hypothesisTest`,
        sourceEvidenceNumbers:carriers.map(source=>source.number),
        relatedSourceEvidenceNumbers:sources.map(source=>source.number),
        hypothesisTest:structuredClone(order.experimentScope.hypothesisTest),
        assessmentSourceEvidenceNumber:carriers[0]?.number??null,
        assessmentSourceEvidenceId:carriers[0]?.id??null,designSourceArtifactRef:carriers[0]?.artifactRef??null,
        assessmentSourcePointer:carriers[0]?.pointer??null});
    }
  }
  // A child method can propose a different design, but it cannot silently turn
  // that proposal into another parent obligation. Keep every proposal in the
  // catalogue. The original owner's declaration remains the comparison.
  let ownerDeclarations=declarations.filter(row=>row.declarationWorkId===ownerId);
  if(!ownerDeclarations.length){
    const first=related.find(work=>declarations.some(row=>row.declarationWorkId===work.id)
      &&graph.owner(work.id)?.goalId===ownerId&&!work.repairOf&&!work.choiceOf&&!work.orderRepairOf);
    ownerDeclarations=declarations.filter(row=>row.declarationWorkId===first?.id);
  }
  const entries=[];
  for(const declaration of ownerDeclarations){
    if(entries.some(row=>JSON.stringify(row.hypothesisTest)===JSON.stringify(declaration.hypothesisTest)))continue;
    entries.push({...declaration,comparisonId:purposeInput?.evidenceId??ownerId,
      assessmentResponsibility:ownsComparison?'owned':'context_only',
      measuredResultDelivered:false,strategyImprovementProven:false,priorAssessments:[]});
  }
  for(const work of ancestors){
    if(work.role!=='roster_workflow_experiment_planner'||!work.resultRef)continue;
    const result=unwrap(await get(work.resultRef));
    for(const assessment of result.experimentConclusion?.hypothesisAssessments??[]){
      const entry=entries.find(row=>row.sourceEvidenceNumbers.includes(assessment.sourceEvidenceNumber));
      if(entry)entry.priorAssessments.push({sourceWorkId:work.id,resultRef:work.resultRef,
        assessment:structuredClone(assessment),sourceReviewNotInThisProjection:true});
    }
  }
  const referencedSources=new Set([
    ...Object.values(current?.inputs??{}).flatMap(input=>input.source==='evidence'?[input.id??input.evidenceId]
      :input.source==='work'?['tool:'+input.id]:[]),
    ...(current?.operationState?.reads??[]).map(read=>read.evidenceId),
  ].filter(Boolean).map(id=>id.replace(/^tool-view:/,'tool:')));
  const observations=[],sceneSources=[];
  // The comparison owner needs both arms across completed child methods, not
  // just its most recent batch. A local repair must NOT inherit that whole
  // obligation. This is an index of declared candidates, never a coverage
  // verdict or an automatically read/approved result.
  const exposeCoverage=purposeInput&&(ownsComparison
    ||current?.role==='roster_workflow_strategy_decision'
    ||current?.role==='roster_workflow_final_review'&&current.inputs?.comparisonPurpose);
  const comparisonCoverage=exposeCoverage?{
    schema:'roster_comparison_candidate_directory_v1',comparisonId:purposeInput.evidenceId,
    measurements:purposeInput.value.measurements.map((description,index)=>({number:index+1,description,candidates:[]})),
    unboundToolResultCount:0,endpointReached:null,strategyImprovementProven:false,
    instruction:'Locate existing current/alternative/shared observations by original measurement and stage, then read their exact sources before judging. These are model-declared observation candidates, not proof that the metric or endpoint is satisfied. Preparation and baseline do not become effect results. An empty list is not zero benefit or global absence: older unbound tool results remain in the evidence catalogue. Reuse sufficient exact results; request another bounded method only for a named missing predicate or discriminating alternative. Do not extend the comparison into full-match history.'
  }:null;
  for(const work of tools){
    const source=evidenceById.get('tool:'+work.id)
      ??(work.resultRef?evidenceById.get(rosterWorkflowUnresolvedSourceIdV1(work)):null);
    if(!source)continue;
    const original=unwrap(await get(source.artifactRef));
    sceneSources.push({source,body:original});
    const showObservation=referencedSources.has(source.id)||work.experimentOwnerId===workId;
    if(!showObservation&&!comparisonCoverage)continue;
    const request=work.inputs.request?.value??{};
    if(comparisonCoverage){
      const binding=original.experimentOrigin?.comparisonBinding;
      if(!binding)comparisonCoverage.unboundToolResultCount++;
      else if(binding.comparisonId===purposeInput.evidenceId&&binding.role==='observation_candidate'){
        for(const measurement of binding.measurements??[]){
          const row=comparisonCoverage.measurements.find(entry=>entry.number===measurement.number);
          if(!row)continue;
          row.candidates.push({sourceEvidenceNumber:source.number,artifactRef:source.artifactRef,
            arm:binding.arm,stage:binding.stage,operation:original.operation??request.operation??null,
            sourceStatus:original.status??null,stateRef:structuredClone(original.stateRef??null),
            toolProofScope:structuredClone(original.toolProofScope??binding.toolProofScope??null),
            newObservation:original.queryReuse?.newObservation===false?false:null,
            endpointReached:null,sourceApproved:false,nativeResultReadByModel:false});
        }
      }
    }
    if(!showObservation)continue;
    observations.push({sourceEvidenceNumber:source.number,artifactRef:source.artifactRef,
      operation:request.operation??null,queryKind:request.args?.queryKind??null,
      executionStatus:work.status,sourceStatus:original.status??null,stateRef:structuredClone(original.stateRef??null),
      toolProofScope:structuredClone(original.toolProofScope??null),
      comparisonBinding:structuredClone(original.experimentOrigin?.comparisonBinding??null),
      nativeResultReadByModel:false});
  }
  const ownerDeclarationIds=new Set(ownerDeclarations.map(row=>row.id));
  return {ancestors,get,purposeInput,purposeOrigin,entries,
    taskScope:{kind:ownsComparison?'comparison':current?.role==='roster_workflow_experiment_planner'?'fact_method':'review_or_decision',
      currentWorkId:workId,currentQuestionOwnerId:goalId,comparisonOwnerWorkId:ownerId,
      comparisonId:purposeInput?.evidenceId??ownerId,mayCloseParentComparison:ownsComparison},
    catalogue:{schema:'roster_experiment_assets_v1',comparisonId:purposeInput?.evidenceId??ownerId,
      declarations:declarations.map(row=>({declarationRef:row.declarationRef,declarationPointer:row.declarationPointer,
        declarationOrderId:row.declarationOrderId,sourceEvidenceNumbers:row.sourceEvidenceNumbers,
        relatedSourceEvidenceNumbers:row.relatedSourceEvidenceNumbers,
        relationship:ownerDeclarationIds.has(row.id)?'owner_design':'method_proposal',designBodyRead:false})),
      observations,comparisonCoverage:normalizeRosterComparisonCoverageV1(comparisonCoverage),
      controlledSceneComparisons:projectRosterComparisonSceneFactsV1(sceneSources),
      observationSelection:'Only this task’s explicit inputs, saved reads and directly owned results.',
      comparisonBindingMeaning:'Explicit model-selected arm/measurement/stage, bound to the immutable purpose and real operation contract. Baseline is not effect_endpoint; even a declared effect_endpoint is unproved until actual source and mechanism review. Null means unbound, not zero or irrelevant. This directory does not count as reading the Native result.',
      otherSources:'Use the existing evidence catalogue for all other immutable sources; absence here is not absence of evidence.',
      observationsAreApproved:false,originalArtifactsUnchanged:true}};
}
