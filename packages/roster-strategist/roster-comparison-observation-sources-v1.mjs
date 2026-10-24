// Exact saved observation provenance, not another model summary or a strategy
// verdict. A new proposal cannot rename an old arm by citing its receipt number.
export async function projectRosterComparisonObservationSourcesV1({inputs,state,readArtifact}){
  const references=new Map();
  for(const key of ['proposedDesign','comparisonPurpose','previousDesign']){
    const body=inputs[key]?.value?.value??inputs[key]?.value;
    for(const proposal of body?.proposals??[])
      for(const ref of proposal.evidenceRefs??[])references.set(ref.id,ref);
  }
  const entries=[];
  for(const ref of references.values()){
    const number=state.evidence.findIndex(e=>e.id===ref.id&&e.artifactRef===ref.artifactRef)+1;
    if(!number)continue;
    const source=state.evidence[number-1],saved=await readArtifact(source.artifactRef),body=saved.value??saved;
    if(!['threat_exchange','probability'].includes(body.operation)||!body.receipt)continue;
    const origin=body.experimentOrigin,comparison=origin?.comparisonBinding;
    const estimates=body.receipt.exchange?.attackEstimates??body.receipt.queryReceipt?.result?.attackEstimates??[];
    entries.push({evidenceNumber:number,evidenceId:source.id,artifactRef:source.artifactRef,
      operation:body.operation,originBindings:structuredClone(source.bindings),
      sameCommittedArmy:source.bindings?.army===state.scope.army,
      sourceStateRef:structuredClone(body.stateRef??body.submittedArguments?.stateRef??null),
      originalComparison:comparison?{purposeSource:structuredClone(comparison.purposeSource),
        arm:comparison.arm,armDescription:comparison.armDescription,
        measurements:structuredClone(comparison.measurements),stage:comparison.stage}:null,
      declaredParticipants:structuredClone(origin?.participantUnitIds??[]),
      submittedQuery:structuredClone(body.submittedArguments??body.request??null),
      observedWeapons:[...new Set(estimates.map(e=>e.weaponName).filter(Boolean))],
      declaredOriginIsNotNativeConfigurationProof:true,
      read:{evidenceNumber:number,pointer:'/experimentOrigin'}});
  }
  return {version:1,entries,
    instruction:'These are exact immutable ORIGINAL observation identities, not labels from the new design. sameCommittedArmy=false does not make a historical measurement false; it means it is not automatically a measurement of the current army. Original armDescription is its declared old design, observedWeapons comes from the actual saved estimate; neither can be renamed by a new Plan. For each cited observation, explicitly assess whether it is historical context or a valid measurement of a declared new arm, and why configuration AND relevant controlled conditions match. Use the current selected configuration and exact source, not the new author assertion that an old number is the current baseline. If equivalence is not established, keep it historical and require the meaningful local new observation, not a full match. No host-selected winner, inferred damage or automatic replay.'};
}

// A passing army check must actually assess the cited measurement sources,
// not merely confirm that the new roster has the claimed upgrades. Existing
// dataQuestions carry these source-scoped public reasons: no new output format.
export function rosterComparisonObservationCoverageErrorsV1({inputs,checks}){
  const ledger=inputs.comparisonObservationSources?.value;
  const check=checks.find(c=>c.checkId==='army_baseline');
  if(!ledger||!check||!['supported','conditional'].includes(check.verdict))return [];
  const checked=new Set(check.evidenceNumbers??[]);
  const assessed=new Set((check.dataQuestions??[]).flatMap(q=>q.evidenceNumbers??[]));
  const missing=ledger.entries.filter(row=>!checked.has(row.evidenceNumber)||!assessed.has(row.evidenceNumber));
  return missing.length?[{code:'comparison_observation_origin_not_assessed',checkId:'army_baseline',
    missingEvidenceNumbers:missing.map(row=>row.evidenceNumber),originalObservations:structuredClone(missing),
    instruction:'The current roster citation does not establish the identity/applicability of these old measurements. For each listed original source, read it and give a source-cited dataQuestion assessment of historical-context versus actual measurement of the claimed new arm, matching original configuration and relevant conditions. If the design mislabels a source or equivalence is missing, use requires_revision/needs_evidence with the precise gap; do not rubber-stamp it or invent a current-arm result. A hypothetical design may request NEW measurements without already having them. Retain the original proposal and facts; no automatic Native replay.'}]:[];
}
