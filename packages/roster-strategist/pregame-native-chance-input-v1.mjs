// Shared transport contract. Rules still owns count/order/ranges and settlement.
// This module never samples, selects, coerces or infers a die result.
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function isPregameNativeChanceOutcomeV1(value,{allowPrecision=true}={}){
  return Boolean(object(value)&&Array.isArray(value.chanceReveals)
    &&value.chanceReveals.every(reveal=>Number.isSafeInteger(reveal)
      ||object(reveal)&&Number.isSafeInteger(reveal.faces)&&Number.isSafeInteger(reveal.outcome))
    &&Object.keys(value).every(key=>key==='chanceReveals'||allowPrecision&&key==='precisionConvertedFailedHitDieIndices'));
}
// Normalize representations, never select a roll. Faces come from the selected
// Native action; explicit records, including invalid values, are not rewritten.
export function compilePregameNativeChanceOutcomeV1(value,nativeChanceContract){
  if(value===undefined)return undefined;
  if(!isPregameNativeChanceOutcomeV1(value))
    throw Object.assign(Error('PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'),{code:'PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'});
  return {...structuredClone(value),chanceReveals:value.chanceReveals.map((reveal,counter)=>{
    if(!Number.isSafeInteger(reveal))return structuredClone(reveal);
    const faces=nativeChanceContract?.faces;
    if(!Number.isSafeInteger(faces)||faces<2)
      throw Object.assign(Error('PREGAME_LAB_NATIVE_CHANCE_FACES_UNRESOLVED'),{
        code:'PREGAME_LAB_NATIVE_CHANCE_FACES_UNRESOLVED',detail:'Integer shorthand requires a uniform faces count from the selected Native chance contract; no die faces were guessed.'});
    return {counter,faces,outcome:reveal};
  })};
}
export function describePregameNativeChanceOutcomeInputV1(nativeChanceContract=null){
  return {version:2,schema:{type:'object',required:['chanceReveals'],additionalProperties:false,
    properties:{chanceReveals:{type:'array',items:{oneOf:[{type:'integer'},
      {type:'object',required:['faces','outcome'],properties:{faces:{type:'integer'},outcome:{type:'integer'}}}]}},
      precisionConvertedFailedHitDieIndices:{description:'Optional Native Precision selection indices; Native validates eligibility.'}}},
    ...(nativeChanceContract?{nativeChanceContract:structuredClone(nativeChanceContract)}:{}),
    instruction:'Submit outcome.chanceReveals as an ARRAY of explicit integer die results or {faces:integer,outcome:integer} entries, never the nativeChanceContract descriptor or {rolls:[...]} wrapper. That descriptor gives required count, faces and order; Native validates those. Preserve the explicitly chosen conditional assumption. These dice are not an expected loss, probability estimate or predicted future fact. Host never chooses or coerces dice.'};
}
