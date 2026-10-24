// One shared interface for a LOCAL strategic test and its proposed verdict.
// Host preserves provenance; the model chooses hypotheses, trade-offs and action.
const text={type:'string',minLength:1,maxLength:65536};
const texts={type:'array',minItems:0,items:text};
const number={type:'integer',minimum:1,maximum:1000000};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const ROSTER_HYPOTHESIS_TEST_SCHEMA_V1=object({
  claim:text,alternative:text,controlledConditions:{...texts,minItems:1},changedFactors:{...texts,minItems:1},
  supportsIf:text,refutesIf:text,decisionIfSupported:text,decisionIfRefuted:text,
  priorEvidenceNumbers:{type:'array',minItems:0,items:number},newInformation:text,
});
export const ROSTER_HYPOTHESIS_ASSESSMENT_SCHEMA_V1=object({
  sourceEvidenceNumber:number,
  verdict:{...text,enum:['supported_under_conditions','refuted_under_conditions','inconclusive']},
  observation:text,publicReason:text,strategicConsequence:text,
  evidenceNumbers:{type:'array',minItems:1,items:number},conditions:texts,
});
export function validateRosterHypothesisDesignV1(test){
  // Previously saved fact probes are not retroactively rewritten as hypotheses.
  if(test===null||test===undefined)return null;
  if(typeof test!=='object'||Array.isArray(test))throw Error('ROSTER_HYPOTHESIS_DESIGN_INVALID');
  for(const key of ['claim','alternative','supportsIf','refutesIf','decisionIfSupported','decisionIfRefuted','newInformation'])
    if(typeof test[key]!=='string'||!test[key].trim())throw Error('ROSTER_HYPOTHESIS_DESIGN_FIELD_REQUIRED:'+key);
  for(const key of ['controlledConditions','changedFactors'])
    if(!Array.isArray(test[key])||!test[key].length||test[key].some(v=>typeof v!=='string'||!v.trim()))
      throw Error('ROSTER_HYPOTHESIS_DESIGN_FIELD_REQUIRED:'+key);
  if(!Array.isArray(test.priorEvidenceNumbers)||test.priorEvidenceNumbers.some(n=>!Number.isSafeInteger(n)||n<1)
    ||Object.keys(test).some(key=>!Object.hasOwn(ROSTER_HYPOTHESIS_TEST_SCHEMA_V1.properties,key)))
    throw Error('ROSTER_HYPOTHESIS_DESIGN_INVALID');
  return structuredClone(test);
}
export function rosterHypothesisOriginV1(value){
  // These are actual stored tool/view/source-fact envelopes, not arbitrary prose.
  return value?.experimentOrigin??value?.value?.experimentOrigin??null;
}
export function rosterHypothesisLoopContractV1(){
  return {kind:'local_hypothesis_decision_loop',version:1,
    instruction:'Separate a factual probe from a strategic hypothesis test. Ordinary rules, payment, legality or missing firepower measurements use hypothesisTest=null; they remain useful facts, NOT proof of strategy improvement. For a strategic test, declare claim and a credible alternative, what stays controlled, what changes, observable support/refutation criteria, and which army/Plan choice would differ. Cite prior evidence and explain the NEW information: repeating an already-proven legality probe does not establish other participants or a strategic advantage. Do not force a roster replacement: a fixed tactical point contest, route or weapon choice may be the decision. Keep the local scenario and explicit counterplay; do not simulate a whole match. On conclusion, return hypothesisAssessments with the actual source evidence, observation and supported_under_conditions/refuted_under_conditions/inconclusive. Unknown measurements or untested reactions stay inconclusive; no invented verdict or universal optimality. A verdict is a proposal requiring independent source/coverage review. The strategic owner then adopts/rejects it through an actual army/Plan mutation or gives an evidence-grounded reason to retain. Fact logging alone is not that adoption. Affected rechecks and later held-out play still apply; scenario evidence never becomes live history or auto-promoted Skill.'};
}
