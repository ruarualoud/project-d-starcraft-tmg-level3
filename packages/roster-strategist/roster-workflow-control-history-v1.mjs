// Invalidated facts lose evidential authority, not the record of who asked
// which question. Only this explicit calculation-retraction boundary permits
// an old owner to be used for routing; it never restores its result as a fact.
const matches=(bindings,scope)=>Object.entries(bindings??{}).every(([key,value])=>scope[key]===value);
export function rosterWorkflowControlOwnerAvailableV1({state,work}){
  if(!work)return false;
  if(work.status!=='superseded'&&matches(work.bindings,state.scope))return true;
  if(!work.calculationInvalidation||!work.resultRef)return false;
  const bindings={...work.bindings};
  if(bindings.invalidatedCalculation!==undefined){
    if(bindings.invalidatedCalculation!==work.calculationInvalidation.reportRef)return false;
    delete bindings.invalidatedCalculation;
  }
  return matches(bindings,state.scope)&&(!work.preInvalidationBindings||matches(work.preInvalidationBindings,state.scope));
}
export function rosterWorkflowHistoricalControlInputsV1({state,inputs}){
  const copy=structuredClone(inputs);
  for(const input of Object.values(copy))if(input.source==='evidence'){
    const evidence=state.evidence.find(row=>row.id===input.id);
    if(evidence?.calculationInvalidation)input.scopeUsage='historical_reference';
  }
  return copy;
}
