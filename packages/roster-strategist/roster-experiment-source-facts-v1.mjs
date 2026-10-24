// Deterministic, source-labelled measurement projection. No LLM summarization,
// recomputation of combat values, or promotion of null to zero. Omitted detail
// remains readable at the original evidence ID and exact JSON Pointer.
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
import {projectRosterWorkflowExecutionPrerequisitesV1} from './roster-workflow-execution-prerequisites-v1.mjs';
import {collectPregameNativeActionEvidenceV1} from './pregame-native-action-evidence-v1.mjs';
import {projectRosterStaticFormationResultDirectoryV1} from './roster-workflow-receipt-view-v1.mjs';
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';
export const ROSTER_SOURCE_FACTS_PROJECTION_VERSION_V1=7;
// Additive sub-contract: retain complete small structures, not just array
// counts. Large sections remain exact-readable; this is a display threshold,
// never an execution limit or a reason to discard the original source.
export const ROSTER_RECEIPT_STRUCTURE_PROJECTION_VERSION_V1=4;
const inlineStructureBytes=8192;
const scalar=value=>value===null||['string','number','boolean'].includes(typeof value);
const scalars=value=>Object.fromEntries(Object.entries(value??{}).filter(([,v])=>scalar(v)));
const inline=value=>scalar(value)||new TextEncoder().encode(JSON.stringify(value)).length<=inlineStructureBytes;
const measurementFields=value=>Object.fromEntries(Object.entries(value??{}).filter(([,v])=>inline(v))
  .map(([key,v])=>[key,structuredClone(v)]));
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value??{},k)).map(k=>[k,structuredClone(value[k])]));
export function projectRosterExperimentSourceFactsV1({evidence,value}){
  const native=typeof value.operation==='string'&&value.receipt&&typeof value.receipt==='object';
  const receipt=value.receipt??{},exchange=receipt.exchange;
  const comparisonMeaning=projectRosterMeasuredComparisonMeaningV1(receipt);
  const nativeActionEvidence=collectPregameNativeActionEvidenceV1(receipt);
  const receiptStructures=Object.fromEntries(Object.entries(receipt).filter(([,body])=>
    !scalar(body)&&new TextEncoder().encode(JSON.stringify(body)).length<=inlineStructureBytes)
    .map(([key,body])=>[key,structuredClone(body)]));
  const sectionDirectory=Object.entries(receipt).map(([key,body])=>({pointer:'/receipt/'+key.replaceAll('~','~0').replaceAll('/','~1'),
    type:Array.isArray(body)?'array':body===null?'null':typeof body,
    ...(Array.isArray(body)?{length:body.length}:{}),
    ...(scalar(body)?{value:body}:{}),availableByExactRead:true}));
  return {schema:'roster_experiment_source_facts_v1',projectionVersion:ROSTER_SOURCE_FACTS_PROJECTION_VERSION_V1,sourceEvidenceId:evidence.id,sourceArtifactRef:evidence.artifactRef,
    sourceKind:evidence.kind,recordKind:native?'native_tool_measurement':'exact_non_native_source',
    ...(!native?{sourceRecord:structuredClone(value),sourceRecordPointer:'',
      sourceRecordInstruction:'This is the EXACT registered frozen source body, not a Native receipt or an LLM summary. Read its abilities/stats/declared fields directly. Empty Native receipt indexes below do not mean these source fields are missing. Original kind, provenance and advisory/authority limits still apply; a Plan or model proposal does not become Rules truth.'}:{}),
    contextRef:value.contextRef??null,stateRef:projectRosterWorkflowStateReferenceV1(value),
    operation:value.operation??null,receiptScalars:scalars(receipt),sectionDirectory,
    ...(comparisonMeaning?{comparisonMeaning}:{}),
     ...(receipt.queryKind==='space.solve_static_formation'?{
       formationOptionDirectory:projectRosterStaticFormationResultDirectoryV1(receipt.queryReceipt?.result),
       formationDirectoryScope:'Current navigation derived from this registered Native source. Supersedes older alias display metadata (including single-unit labels on joint options), not Native results. One whole_joint_formation option contains ALL unitIds; select it once. No new observation or automatic approval.'}:{}),
    ...(value.toolProofScope?{toolProofScope:structuredClone(value.toolProofScope)}:{}),
    ...(value.participantConfigurationCheck?{participantConfigurationCheck:structuredClone(value.participantConfigurationCheck)}:{}),
    ...(native?{structureProjectionVersion:ROSTER_RECEIPT_STRUCTURE_PROJECTION_VERSION_V1,
      receiptStructures,structureProjection:{selection:'complete_top_level_structures_within_display_threshold',
        maxInlineBytesPerSection:inlineStructureBytes,omittedSectionsRemainExactReadable:true}}:{}),
    executionPrerequisites:projectRosterWorkflowExecutionPrerequisitesV1(value),
    ...(value.experimentOrigin?{experimentOrigin:structuredClone(value.experimentOrigin),scenarioExperienceRef:value.scenarioExperienceRef??null}:{}),
    ...(nativeActionEvidence.length?{nativeActionEvidence}:{}),
    ...(receipt.sceneProjection?{sceneProjection:{pointer:'/receipt/sceneProjection',
      ...pick(receipt.sceneProjection,['referenceStateHash','exactUnits','adaptedUnits','excludedTargetUnits',
        'conditions','referenceNonGeometryTransferred','arrivalOrMovementLegalityProven','globalRosterSuperiorityProven'])}}:{}),
    ...(exchange?{exchange:{pointer:'/receipt/exchange',
      // An absent field remains null, not a fabricated empty array/count.
      attackEstimateCount:Array.isArray(exchange.attackEstimates)?exchange.attackEstimates.length:null,
      attackFailureCount:Array.isArray(exchange.attackEstimateFailures)?exchange.attackEstimateFailures.length:null,
      scalarFacts:scalars(exchange),
      currentGeometry:scalars(exchange.currentGeometry),
      attackSelection:pick(exchange.attackSelection,['mode','availableRangedDomainCount','selectedDomainCount','emptyReason']),
      estimates:Array.isArray(exchange.attackEstimates)?exchange.attackEstimates.map((estimate,index)=>({
        pointer:`/receipt/exchange/attackEstimates/${index}`,
        ...pick(estimate,['attackerUnitId','targetUnitId','weaponName','sideKey','contributingModelIds','visibleTargetModelIds']),
        outcomes:measurementFields(estimate.outcomes),outcomeDetailPointer:`/receipt/exchange/attackEstimates/${index}/outcomes`,
        outcomeFieldDirectory:Object.entries(estimate.outcomes??{}).map(([key,body])=>({key,
          pointer:`/receipt/exchange/attackEstimates/${index}/outcomes/`+key.replaceAll('~','~0').replaceAll('/','~1'),
          type:Array.isArray(body)?'array':body===null?'null':typeof body,
          ...(Array.isArray(body)?{length:body.length}:{}),inline:inline(body),availableByExactRead:true})),
        ...pick(estimate,['precision','uncertainty','assumptions']),
        reactionOpportunityScope:pick(estimate.reactionOpportunitySet,['status','unknownWindowCount',
          'baselineOutcomeDistributionExcludesOptionalReactionEffects','optionalReactionEffectsMustBeComparedBeforeActionSelection']),
        reactionDetailPointer:`/receipt/exchange/attackEstimates/${index}/reactionOpportunitySet`,
        uncertaintyPointer:`/receipt/exchange/attackEstimates/${index}/uncertainty`,
        assumptionsPointer:`/receipt/exchange/attackEstimates/${index}/assumptions`,
      })):null}}:{}),
    instruction:'These values/counts and receiptStructures are copied or counted directly from THIS named immutable source, not from a model answer. Each receiptStructures entry is the COMPLETE named top-level receipt section; larger omitted sections remain indexed and exact-readable. Per-attack outcomes also retain COMPLETE small measurement objects, including probability values, denominators and uncertainty; outcomeFieldDirectory lists every original outcome key, including omitted large fields at their exact pointers. A field not in the inline outcomes is not absent from the original: inspect the directory and read the necessary original detail before rejecting it. Different source/context/state references must stay distinct. Each attackEstimates row describes its named attacker/target, NOT a combined multi-unit volley. A sampled numerical difference alone does not establish a causal contribution; inspect mechanism, controlled inputs and uncertainty. An explicitly excluded optional reaction is not simulated by the baseline distribution. A 0-entry estimate array provides no positive damage measurement; absent/null is not zero. This is an index, not a complete source: exact omitted details remain at sourceEvidenceId + pointer. Do not infer a numerical result from prose or from another source.'};
}
