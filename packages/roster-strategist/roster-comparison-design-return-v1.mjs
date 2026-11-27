// A design-author control return is not an experiment result or a strategic
// disposition. Preserve the unmet choice and pass ownership, never invent a test.
const text={type:'string',minLength:1,maxLength:65536};
const fields={disposition:{...text,enum:['capability_gap','no_useful_comparison']},
  decisionQuestion:text,attemptedHypothesis:text,obstacle:text,requiredChange:text,
  evidenceNumbers:{type:'array',minItems:1,items:{type:'integer',minimum:1,maximum:1000000}}};
export const ROSTER_COMPARISON_DESIGN_RETURN_SCHEMA_V1={anyOf:[{
  type:'object',properties:fields,required:Object.keys(fields),additionalProperties:false,
  description:'Null when reading or proposing an experiment. To return without an executable design, finish with proposals=[], this sourced report, and no reads/queries. capability_gap identifies a required unavailable measurement; no_useful_comparison explains why possible observations cannot distinguish the actual choice. Neither is a completed comparison, an approved fact or permission to skip a required strategic proof.'},{type:'null'}]};
export const ROSTER_COMPARISON_DESIGN_RETURN_INSTRUCTION_V1='If an indispensable measurement is unavailable, or no proposed outcome can distinguish the strategic choice, finish with proposals=[] and comparisonDesignReturn (capability_gap or no_useful_comparison). Name the actual choice, attempted hypothesis, concrete obstacle, required change and read evidenceNumbers. Do not rename a missing measurement, invent an observation, submit an unchanged invalid design or mark the whole Plan approved. This returns control ONCE to the strategic owner; it never runs Native, proves a winner or automatically retries. When proposing one valid experiment, set comparisonDesignReturn=null.';
export function rosterComparisonDesignReturnErrorsV1(output){
  if(output?.comparisonDesignReturn==null)return [];
  const r=output.comparisonDesignReturn;
  if(output.action!=='finish'||output.proposals?.length||output.reads?.length||output.catalogueQueries?.length)
    return [{code:'comparison_design_return_requires_exclusive_finish',instruction:ROSTER_COMPARISON_DESIGN_RETURN_INSTRUCTION_V1}];
  if(!fields.disposition.enum.includes(r.disposition)
    ||['decisionQuestion','attemptedHypothesis','obstacle','requiredChange'].some(k=>typeof r[k]!=='string'||!r[k].trim())
    ||!Array.isArray(r.evidenceNumbers)||!r.evidenceNumbers.length)
    return [{code:'comparison_design_return_requires_specific_sourced_obstacle',instruction:ROSTER_COMPARISON_DESIGN_RETURN_INSTRUCTION_V1}];
  return [];
}
export function projectRosterComparisonDesignReturnV1({output,lookup}){
  if(output?.comparisonDesignReturn==null||rosterComparisonDesignReturnErrorsV1(output).length)return null;
  return {kind:'comparison_design_return',version:1,report:structuredClone(output.comparisonDesignReturn),
    evidenceRefs:output.comparisonDesignReturn.evidenceNumbers.map(n=>({id:lookup(n).id,artifactRef:lookup(n).artifactRef})),
    reasonVerified:false,experimentAuthorized:false,comparisonResolved:false,strategyImprovementProven:false,
    planApproved:false,automaticRetry:false};
}
export function rosterComparisonDesignReturnFromResultV1(result){
  const r=result?.value?.comparisonDesignReturn;
  if(result?.kind!=='proposal'||!Array.isArray(result.value.proposals)||result.value.proposals.length
    ||!result.value.originalReplyRef||r?.kind!=='comparison_design_return'||r.version!==1
    ||['reasonVerified','experimentAuthorized','comparisonResolved','strategyImprovementProven','planApproved','automaticRetry'].some(k=>r[k]!==false)
    ||rosterComparisonDesignReturnErrorsV1({action:'finish',proposals:[],reads:[],catalogueQueries:[],comparisonDesignReturn:r.report}).length
    ||!Array.isArray(r.evidenceRefs)||r.evidenceRefs.length!==r.report.evidenceNumbers.length
    ||r.evidenceRefs.some(e=>!e.id||!e.artifactRef))return null;
  return structuredClone(r);
}
