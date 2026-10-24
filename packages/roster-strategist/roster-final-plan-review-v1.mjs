// Independent, advisory Teach review of a completed roster plan. It never
// changes the list, the plan, Rules verdicts, or a promoted Skill.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { verifyRosterPlanV1 } from "./roster-plan-contracts-v1.mjs";
import { projectMissionMarkerScoringArithmeticV1, projectMissionMarkerScoringByActorV1 } from
  "./mission-marker-scoring-arithmetic-v1.mjs";
import { projectPregameTargetReachabilityV1,
  PREGAME_TARGET_REACHABILITY_INTERPRETATION_V1 } from
  "./pregame-map-evidence-port-v1.mjs";
import { verifyOfficialMissionScoringProfileV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { auditRosterPlanVpReceiptsV1,
  ROSTER_PLAN_SOURCE_AUDIT_VERSION } from
  "./roster-plan-source-audit-v1.mjs";
import {
  PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  verifyPlannedPresetRosterPlanV2,
} from "./planned-preset-roster-plan-v2.mjs";
import { AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
  verifyAgentScheduledRosterPlanV1 } from
  "./agent-scheduled-roster-plan-v1.mjs";
import { rosterPublicClaimTextEntriesV1, omitRosterStructuredPublicClaimsV1 } from
  "./roster-public-claim-paths-v1.mjs";
import { rosterReviewPremiseFactsV1, rosterReviewPremiseIssuesV1,
  normalizeRosterReviewEvidenceReferencesV1 } from
  "./roster-review-premises-v1.mjs";
import { deliberateRosterReviewOutputV1 } from './roster-review-output-recovery-v1.mjs';
import { compileRosterReviewCatalogueV1, projectRosterReviewBindingIssuesV1, ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1,
  ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2, ROSTER_REVIEW_CATALOGUE_CONTRACT_VERSION }
  from './roster-review-catalogue-transport-v1.mjs';
export { compileRosterReviewCatalogueV1 } from './roster-review-catalogue-transport-v1.mjs';
import {describeOfficialContextualSupplySemanticsV1} from
  '../rule-atoms/official-contextual-supply-projection-v1.mjs';
import {projectRosterTeachResultEvidenceV1} from './roster-teach-result-evidence-v1.mjs';
import {compileRosterReviewLiteralToolsV1, ROSTER_REVIEW_LITERAL_TOOLS_V1} from './roster-review-literal-tools-v1.mjs';
export {compileRosterReviewLiteralToolsV1} from './roster-review-literal-tools-v1.mjs';

function sourceFactScopeAudit(sourceFacts) {
  return {
    kind:'source-fact-scope-audit',version:2,
    authority:'audit_method_and_unchanged_source_field_semantics_not_strategy',
    rulesForSupplyContexts:structuredClone(sourceFacts.supplyValueContexts || null),
    severityDecision:'Use high for a materially false factual assertion about Rules, control eligibility, numerical capability or casualties when the supplied evidence contradicts it. Conditional surrounding strategy does not demote that contradiction to medium. Use medium for missing strategic explanation or a genuinely unsupported hypothesis without a contradiction. Do not emit findings for correct claims just to confirm they were checked. Coverage belongs in reviewedClaimPaths. Compare Native result views before accusing a claim of lacking execution evidence; approximate map evidence cannot refute a separate executed step.',
    method:'First audit the literal factual assertions in EACH target field, independently of its strategic preference. Compare the actor, value, unit, phase, eligibility, population, source state and scope. A conditional strategy or a disclaimer elsewhere does not make a false rule/value assertion true. A scope-specific discount is not a global replacement: use the exact supplied context semantics. A collection of marginal attack estimates at one prior state is not a joint/ordered attack sequence; their individual kill probabilities do not establish combined kill probability, and adding means does not prove joint casualties, legal sequencing or post-attack availability. Check whether a cited receipt actually computes the claimed aggregate. Source-backed contradictions affecting legal actions, control or strategy are material factual findings, not wording cautions. Only after this factual pass consider missing strategic explanations. Do not report an already-explicit condition as a missing disclaimer, or a correct sentence as a finding. Do not invent a contradiction to fill coverage, assume a tactic is bad, or claim certainty about opponent choices. Use exact claimQuote and name the contradicting source field/rule in publicReason; uncertainty without a contradiction remains uncertainty.',
    hostJudgesPlanMeaning:false,planMutation:false,
  };
}

export function projectRosterQualificationFocusV1({sourceFacts,targets}) {
  return [sourceFactScopeAudit(sourceFacts), {
    kind:'literal-qualification-focus',version:1,
    instructions:'After reading the catalogue, decide the exact claimQuote below, not whether the surrounding paragraph contains some correct facts. For each quote, compare its actual asserted consequence and scope to the source. Explain that comparison in publicReason and bind sourceEvidence. Never replace an explicit sentence with a narrower statement it does not make. A true nearby sentence or numeric datum cannot prove another inference. Preserve conditional forecasts, but do not use a forecast disclaimer to validate a false rule or an uncomputed aggregate. These are allegations to investigate, NOT preassigned verdicts. Return the existing structured qualification, no severity or private reasoning.',
    targets:targets.map(({findingIndex,claimPath,claimQuote,category})=>({findingIndex,claimPath,claimQuote,category})),
  }];
}

export function createRosterReviewNumericCheckSchemaV1(quantitySchema) {
  return closed({
    factId:{type:'string',minLength:0,maxLength:65536},claimedValue:str,claimValueQuote:str,
    calculation:closed({operation:choice(['identity','sum','difference']),
      factIds:{type:'array',minItems:0,items:str}}),quantity:quantitySchema,
    literalBinding:closed({start:{type:'integer',minimum:-1,maximum:65536},
      end:{type:'integer',minimum:-1,maximum:65536}}),
    comparisonMode:choice(['legacy_auto','exact','rounded_to_printed_precision']),
  });
}

export const ROSTER_FINAL_PLAN_REVIEW_SCHEMA =
  "starcraft_tmg_roster_final_plan_review_v1";
export const ROSTER_FINAL_PLAN_REVIEW_PROMPT_PACK =
  "ticket27.roster_final_plan_review.v2";
export const ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION =
  "selected_roster_map_route_context_v1";
export const ROSTER_FINAL_PLAN_REVIEW_SCHEMA_V2 =
  "starcraft_tmg_roster_final_plan_review_v2";
export const ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V2 =
  "all_component_claims_and_selected_map_route_v2";
export const ROSTER_FINAL_PLAN_REVIEW_SHARD_SCHEMA_V1 =
  "starcraft_tmg_roster_final_plan_review_shard_v1";
export const ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3 =
  "all_claims_bounded_shards_source_bound_teach_evidence_v3_8";
const LEGACY_GLOBAL_COMPONENT_REVIEW_CONTEXT_V3 =
  "all_claims_bounded_shards_source_bound_teach_evidence_v3_6";
const REVIEW_SHARD_CLAIM_LIMIT = 8;

const choice = (values) => ({ type: "string", enum: values,
  minLength: Math.min(...values.map((value) => value.length)),
  maxLength: Math.max(...values.map((value) => value.length)) });
const str = { type: "string", minLength: 1, maxLength: 65536 };
const closed = (properties) => ({ type: "object", properties,
  required: Object.keys(properties), additionalProperties: false });
const providerSchema = closed({
  schemaVersion: choice([ROSTER_FINAL_PLAN_REVIEW_SCHEMA]),
  roundKind: choice(["final_plan_review"]),
  findings: { type: "array", minItems: 0, maxItems: 6, items: closed({
    claimPath: str,
    claimQuote: str,
    category: choice(["timing", "unit_binding", "scoring",
      "spatial_assumption", "unsupported_claim", "other"]),
    severity: choice(["high", "medium", "low"]),
    publicReason: str,
    correctionQuestion: str,
  }) },
  publicSummary: str,
});
const providerSchemaV2 = structuredClone(providerSchema);
providerSchemaV2.properties.schemaVersion = choice([
  ROSTER_FINAL_PLAN_REVIEW_SCHEMA_V2]);
providerSchemaV2.properties.findings.maxItems = 64;
const providerSchemaShard = closed({
  ...structuredClone(providerSchemaV2.properties),
  schemaVersion: choice([ROSTER_FINAL_PLAN_REVIEW_SHARD_SCHEMA_V1]),
  findings: { ...structuredClone(providerSchemaV2.properties.findings),
    maxItems: 24 },
  reviewedClaimPaths: { type: "array", minItems: 1,
    maxItems: REVIEW_SHARD_CLAIM_LIMIT, items: str },
  hasUnreportedMaterialFindings: { type: "boolean" },
});
const contract = createStarcraftTmgOutputContractV1({
  id: "ticket27.roster_final_plan_review.v1",
  version: "1.0.0",
  schemaName: "roster_final_plan_review_v1",
  providerSchema,
  modelOwnedFields: Object.keys(providerSchema.properties),
  hostOwnedFields: [],
  mapperRef: { id: "ticket27.roster_final_plan_review.decode.v1",
    version: "1.0.0", hash: hashStarcraftTmgContract(
      "ticket27.roster_final_plan_review.decode.v1") },
  semanticValidatorRef: {
    id: "ticket27.roster_final_plan_review.verify.v1",
    version: "1.0.0", hash: hashStarcraftTmgContract(
      "ticket27.roster_final_plan_review.verify.v1") },
  description: "Advisory, cited consistency questions for a finished plan.",
});
const contractV2 = createStarcraftTmgOutputContractV1({
  id: "ticket27.roster_final_plan_review.v2",
  version: "2.0.0",
  schemaName: "roster_final_plan_review_v2",
  providerSchema: providerSchemaV2,
  modelOwnedFields: Object.keys(providerSchemaV2.properties),
  hostOwnedFields: [],
  mapperRef: { id: "ticket27.roster_final_plan_review.decode.v2",
    version: "2.0.0", hash: hashStarcraftTmgContract(
      "ticket27.roster_final_plan_review.decode.v2") },
  semanticValidatorRef: {
    id: "ticket27.roster_final_plan_review.verify.v2",
    version: "2.0.0", hash: hashStarcraftTmgContract(
      "ticket27.roster_final_plan_review.verify.v2") },
  description: "Source-cited review of all finished-plan component claims.",
});
const contractShard = createStarcraftTmgOutputContractV1({
  id: "ticket27.roster_final_plan_review.shard.v1",
  version: "1.0.0",
  schemaName: "roster_final_plan_review_shard_v1",
  providerSchema: providerSchemaShard,
  modelOwnedFields: Object.keys(providerSchemaShard.properties),
  hostOwnedFields: [],
  mapperRef: { id: "ticket27.roster_final_plan_review.shard.decode.v1",
    version: "1.0.0", hash: hashStarcraftTmgContract(
      "ticket27.roster_final_plan_review.shard.decode.v1") },
  semanticValidatorRef: {
    id: "ticket27.roster_final_plan_review.shard.verify.v1",
    version: "1.0.0", hash: hashStarcraftTmgContract(
      "ticket27.roster_final_plan_review.shard.verify.v1") },
  description: "Bounded, source-cited review of one exact claim partition.",
});

function reviewSources(plan, includeAllComponentPurposes = false, includeStructured = false) {
  const values = Object.fromEntries(rosterPublicClaimTextEntriesV1(plan, { includeStructured }));
  for (const purpose of plan.componentPurposes || []) {
    if (includeAllComponentPurposes || purpose.componentKind === "unit") {
      values[`componentPurposes.${purpose.instanceId}`] =
        purpose.publicPurposeText;
    }
  }
  return Object.entries(values).filter(([, value]) => (
    typeof value === "string" && value.trim())).map(([path, text]) => ({
    path, text,
  }));
}

export const ROSTER_FINAL_PLAN_REVIEW_ADJUDICATION_SCHEMA =
  "starcraft_tmg_roster_final_plan_review_adjudication_v1";

function invalidAdjudication() {
  throw new Error("ROSTER_FINAL_REVIEW_ADJUDICATION_INVALID");
}

function verifiedReviewBody(plan, review) {
  if (!plan?.planHash || review?.planHash !== plan.planHash
    || !Array.isArray(review.findings)
    || typeof review.reviewHash !== "string") invalidAdjudication();
  const { reviewHash, ...body } = review;
  if (hashStarcraftTmgContract(body) !== reviewHash) {
    invalidAdjudication();
  }
  return body;
}

// A source adjudication never changes a paid finding. It records the exact
// counterquote and conservative effective severity beside the original,
// allowing later admission to distinguish an unresolved High from a cited
// false positive. Interpretation remains a visible local review judgment,
// not Rules authority or training truth.
export function verifyRosterFinalPlanReviewAdjudicationV1({ plan,
  review } = {}) {
  const body = verifiedReviewBody(plan, review);
  const criticalCount = review.findings.filter((finding) =>
    finding.severity === "critical").length;
  const highEntries = review.findings.map((finding, index) =>
    ({ finding, index })).filter(({ finding }) =>
      finding.severity === "high");
  if (!review.reviewAdjudication) {
    return Object.freeze({ originalHighCount: highEntries.length,
      unresolvedHighCount: highEntries.length, criticalCount,
      reclassifiedMediumCount: 0, parentReviewHash: null });
  }
  const { reviewAdjudication, ...parentBody } = body;
  if (reviewAdjudication.schema
      !== ROSTER_FINAL_PLAN_REVIEW_ADJUDICATION_SCHEMA
    || reviewAdjudication.reviewAuthority
      !== "local_source_bound_adjudication"
    || reviewAdjudication.trainingTruth !== false
    || !Array.isArray(reviewAdjudication.decisions)
    || hashStarcraftTmgContract(parentBody)
      !== reviewAdjudication.parentReviewHash) {
    invalidAdjudication();
  }
  const sources = new Map(reviewSources(plan, true, true).map((source) =>
    [source.path, source.text]));
  const reconciliation = reviewAdjudication.reconciliation;
  if ([5, 6, 7, 8, 9, 10, 11, 12, ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION].includes(reconciliation?.policyVersion)) {
    const targets = review.findings.flatMap((finding, findingIndex) => finding.severity === "high"
      ? [{ ...finding, findingIndex, claimText: sources.get(finding.claimPath) }] : []);
    const facts = reconciliation.premiseFacts;
    const unresolved = reconciliation.policyVersion >= 6 ? reconciliation.unresolvedJudgments : [];
    const covered = [...(reconciliation.judgments || []), ...(unresolved || [])];
    if (!facts || hashStarcraftTmgContract(facts) !== reconciliation.sourceCatalogueHash
      || !Array.isArray(reconciliation.judgments)
      || !Array.isArray(unresolved)
      || covered.length !== targets.length
      || new Set(covered.map(j => j.findingIndex)).size !== targets.length
      || covered.some(j => !targets.some(t => t.findingIndex === j.findingIndex))
      || unresolved.some(j => j.status !== "needs_evidence" || !j.bindingIssues?.length)
      || rosterReviewPremiseIssuesV1({ output: { judgments: reconciliation.judgments }, targets, facts }).length) {
      invalidAdjudication();
    }
  }
  const seen = new Set();
  for (const decision of reviewAdjudication.decisions) {
    // Changed-claim review may inherit a source-only proof without carrying
    // the old batch reconciliation (which also contains changed allegations).
    // Recheck its exact unchanged claim and source catalogue locally.
    const sourceProof = decision?.sourceProof;
    let sourceProofValid = false;
    if (sourceProof) {
      const finding = review.findings[decision.findingIndex];
      const judgment = { ...sourceProof.judgment, findingIndex: decision.findingIndex };
      sourceProofValid = sourceProof.version === 1
        && sourceProof.sourceCatalogueHash === hashStarcraftTmgContract(sourceProof.premiseFacts)
        && sourceProof.claimText === sources.get(finding?.claimPath)
        && NONBLOCKING_CLAIM_ASSESSMENTS.has(judgment.claimAssessment)
        && judgment.sourceEvidence?.length > 0
        && judgment.publicReason === decision.publicReason
        && hashStarcraftTmgContract(judgment.counterEvidence) === hashStarcraftTmgContract(decision.counterEvidence)
        && rosterReviewPremiseIssuesV1({ output: { judgments: [judgment] },
          targets: [{ ...finding, findingIndex: decision.findingIndex, claimText: sourceProof.claimText }],
          facts: sourceProof.premiseFacts }).length === 0;
      if (!sourceProofValid) invalidAdjudication();
    }
    // A failed/absent interpretation cannot turn an unresolved High into a
    // pass. Admission consumes the same per-item proof as correction.
    if (reconciliation?.policyVersion >= 6) {
      const proof = reconciliation.judgments.find(j => j.findingIndex === decision?.findingIndex);
      if (!proof || !NONBLOCKING_CLAIM_ASSESSMENTS.has(proof.claimAssessment)
        || hashStarcraftTmgContract(proof.counterEvidence) !== hashStarcraftTmgContract(decision.counterEvidence)
        || proof.publicReason !== decision.publicReason) invalidAdjudication();
    }
    if (!Number.isSafeInteger(decision?.findingIndex)
      || seen.has(decision.findingIndex)
      || decision.effectiveSeverity !== "medium"
      || typeof decision.publicReason !== "string"
      || !decision.publicReason.trim()
      || !Array.isArray(decision.counterEvidence)
      || (decision.counterEvidence.length === 0
        && !sourceProofValid
        && !(reconciliation?.policyVersion >= 11
          && reconciliation.judgments.find(j => j.findingIndex === decision.findingIndex)
            ?.sourceEvidence?.length))) invalidAdjudication();
    const finding = review.findings[decision.findingIndex];
    if (finding?.severity !== "high"
      || decision.findingHash !== hashStarcraftTmgContract(finding)
      || !sources.get(finding.claimPath)?.includes(finding.claimQuote)) {
      invalidAdjudication();
    }
    for (const evidence of decision.counterEvidence) {
      if (typeof evidence?.claimPath !== "string"
        || typeof evidence.claimQuote !== "string"
        || !evidence.claimQuote.trim()
        || !sources.get(evidence.claimPath)?.includes(evidence.claimQuote)
        || ((reconciliation?.policyVersion ?? 0) < 11 && !sourceProofValid
          && evidence.claimPath === finding.claimPath
          && evidence.claimQuote === finding.claimQuote)) {
        invalidAdjudication();
      }
    }
    seen.add(decision.findingIndex);
  }
  return Object.freeze({ originalHighCount: highEntries.length,
    unresolvedHighCount: highEntries.length - seen.size, criticalCount,
    reclassifiedMediumCount: seen.size,
    parentReviewHash: reviewAdjudication.parentReviewHash });
}

export function createRosterFinalPlanReviewAdjudicationV1({ plan, review,
  decisions, reconciliation = null } = {}) {
  const body = verifiedReviewBody(plan, review);
  if (review.reviewAdjudication || !Array.isArray(decisions)) {
    invalidAdjudication();
  }
  const adjudicatedBody = { ...structuredClone(body),
    reviewAdjudication: {
      schema: ROSTER_FINAL_PLAN_REVIEW_ADJUDICATION_SCHEMA,
      parentReviewHash: review.reviewHash,
      reviewAuthority: "local_source_bound_adjudication",
      decisions: structuredClone(decisions),
      ...(reconciliation ? { reconciliation: structuredClone(reconciliation) } : {}),
      trainingTruth: false,
    } };
  const adjudicated = Object.freeze({ ...adjudicatedBody,
    reviewHash: hashStarcraftTmgContract(adjudicatedBody) });
  verifyRosterFinalPlanReviewAdjudicationV1({ plan,
    review: adjudicated });
  return adjudicated;
}

// One severity interpretation for projections, correction and admission. Paid
// findings remain immutable; only verified, exact-source adjudication changes
// their effective severity. Medium never silently becomes Rules authority.
export function effectiveRosterFinalPlanReviewFindingsV1({ plan, review } = {}) {
  const findings = review?.findings || [];
  if (!review?.reviewAdjudication) return findings;
  verifyRosterFinalPlanReviewAdjudicationV1({ plan, review });
  const indexes = new Set(review.reviewAdjudication.decisions.map(d => d.findingIndex));
  return findings.map((finding, index) => indexes.has(index)
    ? { ...finding, originalSeverity: finding.severity, severity: "medium" }
    : finding);
}

// Exact arithmetic is a review fact, never a tactical preference. In particular,
// do not make another language-model reviewer add per-marker VP or card slots.
function reconciliationArithmetic(sourceFacts, audit, plan) {
  const markers = sourceFacts.missionMarkerScoringByActor?.markers || [];
  const missionMarkerGroups = [];
  for (const affinityPlayerId of new Set(markers.map(m => m.affinityPlayerId))) {
    const group = markers.filter(m => m.affinityPlayerId === affinityPlayerId);
    for (const scoringActorId of new Set(group.flatMap(m => Object.keys(m.vpByScoringActor || {})))) {
      const values = group.map(m => m.vpByScoringActor[scoringActorId]);
      if (values.every(Number.isFinite)) missionMarkerGroups.push({ affinityPlayerId,
        scoringActorId, markerNumbers: group.map(m => m.number), perMarkerVp: values,
        totalVp: values.reduce((a, b) => a + b, 0),
        assumesControlAtScoringWindow: true, provesControlOrActualScore: false });
    }
  }
  const budget = audit?.armyResourceBudgetResult;
  let armySlots = null;
  if (audit?.fullFactionTagSlotAndUniqueLegalityValidated === true
    && audit.startingSupplySlotOccupancyValidated === true && budget?.factionCard) {
    const startingCapacity = budget.factionCard.startingArmySlots;
    const cardAdditions = (budget.tacticalCardRows || []).map(c => ({
      cardInstanceId: c.cardInstanceId, cardName: c.cardName, armySlotsAdded: c.armySlotsAdded }));
    const unitOccupancy = (audit.units || []).map(u => u.unitCompositionResult).map(u => ({
      unitInstanceId: u.unitInstanceId, unitName: u.unitName, armySlotType: u.armySlotType,
      occupiedArmySlots: u.occupiedArmySlots }));
    const types = new Set([...Object.keys(startingCapacity), ...unitOccupancy.map(u => u.armySlotType),
      ...cardAdditions.flatMap(c => Object.keys(c.armySlotsAdded))]);
    const finalCapacity = {}, usedSlots = {};
    for (const type of types) {
      finalCapacity[type] = (startingCapacity[type] || 0)
        + cardAdditions.reduce((n, c) => n + (c.armySlotsAdded[type] || 0), 0);
      usedSlots[type] = unitOccupancy.filter(u => u.armySlotType === type)
        .reduce((n, u) => n + u.occupiedArmySlots, 0);
    }
    armySlots = { startingCapacity, cardAdditions, unitOccupancy, finalCapacity, usedSlots,
      rulesAuditHash: audit.resultHash, rulesLegalityValidated: true,
      startingCapacityIsNotFinalCapacity: true };
  }
  // Expose the selected composition, not only the count of UNIT entries or
  // a generic small/large profile. Actual A described a nine-model Marine
  // unit as six while the shared review/Teach packet omitted its model count.
  // These are existing Rules audit facts, not live survivors or new rules.
  const unknownComposition = reason => ({ status: "unknown", reason, units: [] });
  let rosterComposition = unknownComposition("selected_roster_audit_unavailable");
  if (audit?.resultHash === plan?.rosterCandidate?.legalityReceipt?.auditResultHash
    && audit?.fullCompositionUpgradeAndFieldingLegalityValidated === true
    && audit?.rulesOwnedCountsSupplySlotsCostsAndUpgradeApplication === true) {
    const rows = (audit.units || []).map(u => u.unitCompositionResult);
    const selected = plan.rosterCandidate.units;
    const byId = new Map(rows.map(u => [u?.unitInstanceId, u]));
    const bound = rows.length === selected.length && byId.size === selected.length
      && selected.every(u => {
        const row = byId.get(u.unitInstanceId);
        return row?.recordKey === u.recordKey && row.compositionKind === u.compositionKind
          && row.rulesOwnedModelCountSupplySlotsAndCost === true
          && Number.isInteger(row.startingModelCount) && row.startingModelCount > 0
          && row.startingModelIds?.length === row.startingModelCount
          && Number.isFinite(row.startingSupply) && Number.isFinite(row.occupiedArmySlots);
      });
    rosterComposition = bound ? { status: "source_bound_composition",
      rulesAuditHash: audit.resultHash, scope: "starting_selected_roster_not_live_survivors",
      currentCasualtiesOrControlProven: false,
      units: selected.map(u => {
        const row = byId.get(u.unitInstanceId);
        return { unitInstanceId: row.unitInstanceId, recordKey: row.recordKey,
          compositionKind: row.compositionKind, startingModelCount: row.startingModelCount,
          startingSupply: row.startingSupply, occupiedArmySlots: row.occupiedArmySlots,
          armySlotType: row.armySlotType, compositionResultHash: row.resultHash };
      }) } : unknownComposition("selected_roster_composition_mismatch");
  }
  return { missionMarkerGroups, armySlots, rosterComposition };
}

export const ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION = 13;

// The secure gateway awaits persistence of provider_dispatch BEFORE sending.
// Review reservations may stop before reaching that gateway. Count real sends,
// including unknown outcomes, rather than consuming another attempt on restart.
// Legacy callers without that ledger retain their conservative original count.
export function countRosterReviewDispatchesV1({contexts,dispatches,fallback=0}) {
  if (!Array.isArray(dispatches)) return fallback;
  const bound = new Set(contexts);
  return new Set(dispatches.filter(d => bound.has(d.contextHash))
    .map(d => d.requestId)).size;
}

export function countRosterReviewCapacityRefusalsV1({contexts,dispatches=[]}) {
  const bound=new Set(contexts);
  return new Set(dispatches.filter(d=>bound.has(d.contextHash) && d.status==='response_rejected'
    && d.rejection?.httpStatus===400 && d.rejection?.contextLengthExceeded===true)
    .map(d=>d.requestId)).size;
}

export function retainedRosterReviewRecoveryCandidatesV1({checkpoint,retainedOutputs=[]}) {
  return (checkpoint?.attempts||[]).filter(a=>a.status==='dispatching'||a.wireOutputHash).flatMap(attempt=>{
    const retained=retainedOutputs.findLast(o=>o.roundKind==='final_review_reconciliation'
      && o.contextHash===attempt.contextHash
      && (!attempt.wireOutputHash||o.outputHash===attempt.wireOutputHash)
      && o.outputHash===hashStarcraftTmgContract(o.sanitizedOutput));
    return retained?[{attempt,retained}]:[];
  });
}

function isAdditivePremiseCatalogue(previous, current) {
  if (!previous || !current) return false;
  // New projections may expose an already-delivered arrival value or typed
  // marker authority. Every old fact and every old scope must be unchanged.
  for (const key of ['numbers', 'texts']) {
    const currentValues = new Set(current[key].map(hashStarcraftTmgContract));
    if (!previous[key]?.every(value => currentValues.has(hashStarcraftTmgContract(value)))) return false;
  }
  return Object.entries(previous).filter(([key]) => !['numbers','texts'].includes(key))
    .every(([key,value]) => hashStarcraftTmgContract(value) === hashStarcraftTmgContract(current[key]));
}

// Shared by source qualification and model correction. Keep the full sealed
// facts available; catalogue IDs avoid asking a model to copy paths/quotes.
export function buildRosterReviewFactPacketV1(input) {
  const { sourceFacts, sourceAudit } = buildRosterFinalPlanVerifiedFactsV1(input);
  const arithmetic = reconciliationArithmetic(sourceFacts, input.armyAudit, input.plan);
  const premiseFacts = rosterReviewPremiseFactsV1({ sourceFacts, arithmetic });
  const evidenceCatalogue = [...new Map(premiseFacts.texts.map(f => [f.sourcePath, f])).values()]
    .map(f => ({ evidenceId: `fact:${hashStarcraftTmgContract(f).slice(0, 24)}`, ...f }));
  return { sourceFacts, sourceAudit, arithmetic, premiseFacts, evidenceCatalogue,
    sourceCatalogueHash: hashStarcraftTmgContract(premiseFacts), trainingTruth: false };
}

function inheritedReviewBeforeRedundantQualification(review) {
  const reconciliation = review?.reviewAdjudication?.reconciliation;
  const previousAdjudication = reconciliation?.previousAdjudication;
  if (review?.incrementalReview?.dependencyFactsUnchanged !== true
    || !previousAdjudication?.decisions?.length
    || !Array.isArray(reconciliation.judgments)
    || reconciliation.judgments.some(j => !NONBLOCKING_CLAIM_ASSESSMENTS.has(j.claimAssessment))) return null;
  const previousIndexes = new Set(previousAdjudication.decisions.map(d => d.findingIndex));
  const currentIndexes = new Set(review.reviewAdjudication.decisions.map(d => d.findingIndex));
  const high = review.findings.flatMap((f, i) => f.severity === "high" ? [i] : []);
  if (!high.every(i => previousIndexes.has(i)) || high.every(i => currentIndexes.has(i))) return null;
  const { reviewHash, reviewAdjudication, ...body } = review;
  const priorBody = { ...body, reviewAdjudication: structuredClone(previousAdjudication) };
  const prior = { ...priorBody, reviewHash: hashStarcraftTmgContract(priorBody) };
  // Exact saved proof, same claims/facts. Failed new evidence is not evidence
  // against it; a newly verified contradiction above would prevent recovery.
  return prior.reviewHash === reconciliation.sourceReviewHash ? prior : null;
}

export function needsRosterFinalPlanReconciliationV1(review) {
  if (inheritedReviewBeforeRedundantQualification(review)) return true;
  // Incremental review already verifies unchanged facts, claim text and each
  // inherited counterquote. Do not pay to re-qualify those same decisions just
  // because the new review container has no batch reconciliation object.
  if (review?.incrementalReview?.dependencyFactsUnchanged === true
    && Array.isArray(review.reviewAdjudication?.decisions)) {
    const decided = new Set(review.reviewAdjudication.decisions.map(d => d.findingIndex));
    if (review.findings.every((f, i) => f.severity !== "high" || decided.has(i))) return false;
  }
  return review?.findings?.some(f => f.severity === "high") === true
    && (review.reviewAdjudication?.reconciliation?.status !== "completed"
      || review.reviewAdjudication.reconciliation.policyVersion
        !== ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION);
}

const NONBLOCKING_CLAIM_ASSESSMENTS = new Set(["source_supported", "conditional_or_uncertain"]);

function reconciliationBindingIssues(schema, output, targets, sources) {
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(schema, output).ok) {
    return [{ code: "OUTPUT_SCHEMA_INVALID", path: "$", expected: "Use the supplied strict schema." }];
  }
  const sourceIndex = new Map(sources.map(s => [s.path, s.text]));
  const targetIndex = new Map(targets.map(t => [t.findingIndex, t]));
  const seen = new Set(), issues = [];
  for (const [index, j] of output.judgments.entries()) {
    const target = targetIndex.get(j.findingIndex);
    if (!target || seen.has(j.findingIndex)) {
      issues.push({ code: "TARGET_INDEX_INVALID_OR_DUPLICATE", path: `judgments.${index}.findingIndex`,
        findingIndex: j.findingIndex });
      continue;
    }
    seen.add(j.findingIndex);
    if (!NONBLOCKING_CLAIM_ASSESSMENTS.has(j.claimAssessment)) continue;
    if (!j.publicReason.trim() || (!j.counterEvidence.length && !j.sourceEvidence.length)) {
      issues.push({ code: "MEDIUM_COUNTEREVIDENCE_REQUIRED", path: `judgments.${index}`,
        findingIndex: j.findingIndex });
    }
    for (const [eIndex, e] of j.counterEvidence.entries()) {
      const detail = { path: `judgments.${index}.counterEvidence.${eIndex}`, findingIndex: j.findingIndex,
        claimPath: e.claimPath };
      if (!e.claimQuote.trim() || !sourceIndex.get(e.claimPath)?.includes(e.claimQuote)) {
        issues.push({ ...detail, code: "COUNTERQUOTE_NOT_IN_CURRENT_CLAIM",
          availableClaimText: sourceIndex.get(e.claimPath) || null });
      } else if (e.claimPath === target.claimPath && e.claimQuote === target.claimQuote
        && j.claimAssessment === "source_supported" && !j.sourceEvidence.length) {
        issues.push({ ...detail, code: "COUNTERQUOTE_IS_ALLEGED_QUOTE",
          expected: "The claim cannot prove itself: bind Rules source evidence or distinct contextual evidence." });
      }
    }
  }
  for (const findingIndex of targetIndex.keys()) if (!seen.has(findingIndex)) {
    issues.push({ code: "TARGET_INDEX_MISSING", path: "judgments", findingIndex });
  }
  return issues;
}


// Qualification is a durable per-item task, not an all-or-nothing batch.
// Invalid reviewer evidence stays unresolved High and is routed to a factual
// claim repair. It is never promoted into a correction instruction or a pass.
export async function reconcileRosterFinalPlanReviewV1(input = {}) {
  const { plan, review, deliberation, sessionId } = input;
  verifiedReviewBody(plan, review);
  verifyRosterFinalPlanReviewAdjudicationV1({ plan, review });
  const inherited = inheritedReviewBeforeRedundantQualification(review);
  if (inherited) {
    verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: inherited });
    return inherited;
  }
  if (!needsRosterFinalPlanReconciliationV1(review)) return review;
  const sources = reviewSources(plan, true, true);
  const targets = review.findings.flatMap((finding, findingIndex) => finding.severity === "high"
    ? [{ findingIndex, claimPath: finding.claimPath, claimQuote: finding.claimQuote,
      category: finding.category, claimText: sources.find(s => s.path === finding.claimPath)?.text }] : []);
  if (!targets.length) return review;
  const { sourceFacts, arithmetic, premiseFacts, evidenceCatalogue, sourceCatalogueHash } =
    buildRosterReviewFactPacketV1(input);
  const claimCatalogue = sources.map(s => ({
    evidenceId: `claim:${hashStarcraftTmgContract(s).slice(0, 24)}`, ...s }));
  const catalogueInput = {
    kind: 'shared-rules-fact-catalogue', numbers: premiseFacts.numbers,
    texts: evidenceCatalogue, geometryReceipts: premiseFacts.geometryReceipts,
    arithmetic, markerQuantityAuthority: premiseFacts.markerQuantityAuthority,
    noExactHypotheticalPlacementProof: premiseFacts.noExactHypotheticalPlacementProof };
  const catalogueTransport = compileRosterReviewCatalogueV1(catalogueInput);
  let legacyCatalogueTransport;
  const markerNumberMaximum = Math.max(0, ...(premiseFacts.markerQuantityAuthority?.markers || [])
    .map(marker => marker.number).filter(Number.isSafeInteger));
  const quantitySchema = closed({
    kind: choice(['source_value','marker_total','marker_per_marker','marker_margin','marker_transfer_swing','retained_scalar']),
    scoringActorId: {type:'string', minLength:0, maxLength:65536},
    markerNumbers: {type:'array', minItems:0, items:{type:'integer', minimum:0, maximum:markerNumberMaximum}},
    opposingActorId: {type:'string', minLength:0, maxLength:65536},
    opposingMarkerNumbers: {type:'array', minItems:0, items:{type:'integer', minimum:0, maximum:markerNumberMaximum}},
  });
  const numericCheckSchema = createRosterReviewNumericCheckSchemaV1(quantitySchema);
  const literalTools=compileRosterReviewLiteralToolsV1({targets,numericCheckSchema});
  // Read adapter supplies retained_scalar for old saved replies without
  // rewriting originals. Fresh provider schema excludes that host-only tag.
  const canonicalItem = closed({
    findingIndex: { type: "integer", minimum: 0, maximum: review.findings.length - 1 },
    claimAssessment: choice(["source_supported", "source_contradicted",
      "source_attribution_unsubstantiated", "conditional_or_uncertain"]),
    publicReason: str,
    evidenceScope: choice(["settled_fact", "conditional_forecast", "exact_queried_geometry", "source_attribution"]),
    factChecks: { type: 'array', minItems: 0, items: numericCheckSchema },
    sourceEvidence: { type: "array", minItems: 0, items: closed({ sourcePath: str, sourceQuote: str }) },
    counterEvidence: { type: "array", minItems: 0, items: closed({ claimPath: str, claimQuote: str }) },
  });
  const canonicalSchema = subset => closed({
    schemaVersion: choice(["starcraft_tmg_roster_review_reconciliation_v1"]),
    roundKind: choice(["final_review_reconciliation"]),
    judgments: { type: "array", minItems: subset.length, maxItems: subset.length,
      items: canonicalItem }, publicSummary: str,
  });
  const identity = { planHash: plan.planHash, reviewHash: review.reviewHash, targets,
    sources, sourceFacts, arithmetic, premiseFacts };
  const qualificationFocus = projectRosterQualificationFocusV1({sourceFacts,targets});
  const baseContextHash = hashStarcraftTmgContract({ policyVersion: ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION,
    qualificationFocusHash:hashStarcraftTmgContract(qualificationFocus), ...identity });
  const accepted = new Map(), unresolved = new Map(), attempts = [];
  let contextHash = null, lastReceipt = null, publicSummary = "", pending = [...targets];
  let checkpoint, maximumFreshCalls = input.maximumFreshCalls ?? 3;
  let restoringCurrentCheckpoint=false;
  const save = async status => {
    checkpoint = { schema: "roster_review_item_recovery_v1", policyVersion: ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION,
      status, planHash: plan.planHash, sourceReviewHash: review.reviewHash,
      baseContextHash, sourceCatalogueHash, contextHash,
      judgments: [...accepted.values()], unresolvedJudgments: [...unresolved.values()],
      pendingFindingIndexes: pending.map(t => t.findingIndex), attempts: structuredClone(attempts),
      maximumFreshCalls,
      automaticAmbiguousRetry: false, trainingTruth: false };
    await input.onCheckpoint?.(structuredClone(checkpoint));
  };
  const decodeWireEvidence = (wire, contractRef = null) => {
    const legacy = contractRef?.version === '4.2.0';
    if (legacy && !legacyCatalogueTransport) legacyCatalogueTransport = compileRosterReviewCatalogueV1(
      catalogueInput,{version:ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1});
    let output = (legacy ? legacyCatalogueTransport : catalogueTransport).decodeOutput(wire);
    if(!contractRef || contractRef.version==='4.4.0') output=literalTools.decodeOutput(output);
    if (Array.isArray(output?.judgments)) for (const j of output.judgments) {
      j.sourceEvidence = Array.isArray(j.sourceEvidence) ? j.sourceEvidence.map(e => {
        const fact = evidenceCatalogue.find(f => f.evidenceId === e?.evidenceId);
        return fact ? { sourcePath: fact.sourcePath, sourceQuote: fact.text }
          : { sourcePath: 'unresolved_evidence_id', sourceQuote: String(e?.evidenceId || 'missing') };
      }) : j.sourceEvidence;
      j.counterEvidence = Array.isArray(j.counterEvidence) ? j.counterEvidence.map(e => {
        const claim = claimCatalogue.find(c => c.evidenceId === e?.evidenceId);
        return claim ? { claimPath: claim.path, claimQuote: claim.text }
          : { claimPath: 'unresolved_evidence_id', claimQuote: String(e?.evidenceId || 'missing') };
      }) : j.counterEvidence;
    }
    return output;
  };
  function recordCandidate(result, subset, metadata = {}) {
    const originalPaidOutputHash = hashStarcraftTmgContract(result?.output ?? null);
    const normalized = normalizeRosterReviewEvidenceReferencesV1({ output: result?.output, facts: premiseFacts });
    const output = normalized.output;
    const retry = [], allIssues = [];
    for (const target of subset) {
      const entries = Array.isArray(output?.judgments)
        ? output.judgments.filter(j => j?.findingIndex === target.findingIndex) : [];
      const one = { schemaVersion: "starcraft_tmg_roster_review_reconciliation_v1",
        roundKind: "final_review_reconciliation", judgments: entries,
        publicSummary: output?.publicSummary || "Per-item retained review" };
      const binding = reconciliationBindingIssues(canonicalSchema([target]), one, [target], sources)
        .map(i => ({ ...i, findingIndex: target.findingIndex }));
      const semantic = binding.length ? [] : rosterReviewPremiseIssuesV1({
        output: one, targets: [target], facts: premiseFacts });
      const rawIssues = [...binding, ...semantic];
      const issues = metadata.catalogueTransportVersion === ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2
        ? projectRosterReviewBindingIssuesV1({ issues: rawIssues, transport: catalogueTransport })
        : rawIssues;
      if (!issues.length) {
        accepted.set(target.findingIndex, entries[0]);
        unresolved.delete(target.findingIndex);
      } else {
        unresolved.set(target.findingIndex, { findingIndex: target.findingIndex,
          status: "needs_evidence", bindingIssues: issues,
          repairRoute: "review_judgment_contract",
          reviewerConclusionIsNotFact: true });
        // These are defects in the reviewer's evidence/assessment contract.
        // A genuine Plan contradiction is a VALID source_contradicted judgment
        // without binding issues; never route an invalid judgment to Plan edits.
        retry.push(target);
      }
      allIssues.push(...issues);
    }
    attempts.push({ roundIndex: metadata.roundIndex, contextHash,
      reviewerReceipt: structuredClone(result?.receipt || null),
      outputHash: hashStarcraftTmgContract(output ?? null), originalPaidOutputHash,
      evidenceReferenceRecoveries: normalized.recoveries, ...metadata,
      acceptedFindingIndexes: [...accepted.keys()], bindingIssues: allIssues,
      contextOnlyFactChecks: (output?.judgments || []).flatMap(j => {
        const target = subset.find(t => t.findingIndex === j.findingIndex);
        return (j.factChecks || []).filter(c => target && !target.claimQuote.includes(c.claimValueQuote)).map(c => ({ findingIndex: j.findingIndex,
          factId: c.factId, claimValueQuote: c.claimValueQuote,
          presentInSameParagraph: target.claimText?.includes(c.claimValueQuote) === true,
          notUsedToProveOrVetoThisAllegation: true }));
      }) });
    lastReceipt = result?.receipt || lastReceipt;
    publicSummary = output?.publicSummary || publicSummary;
    return { retry, output, issues: allIssues };
  }

  try {
    // Import the exact old paid context, never merely a same-session output.
    // Reconstruct v5 feedback identities so older paid failures remain usable;
    // every judgment is then independently revalidated under current rules.
    const legacyBase = hashStarcraftTmgContract({ policyVersion: 5, ...identity });
    let previousOutput = null, legacyIssues = [], imported = false;
    const completedPrior = review.reviewAdjudication?.reconciliation;
    const resumeCurrent = input.recoveryCheckpoint?.baseContextHash === baseContextHash
      && input.recoveryCheckpoint.policyVersion === ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION
      && ((input.recoveryCheckpoint.attempts?.length || 0) > 0
        || (input.recoveryCheckpoint.judgments?.length || 0) > 0);
    // A pre-dispatch schema failure can save an empty current checkpoint. It
    // must not hide the older completed paid proofs and repurchase all claims.
    if (!resumeCurrent && [6, 7, 8, 9, 10, 11, 12].includes(completedPrior?.policyVersion) && completedPrior.status === "completed"
      && (completedPrior.sourceCatalogueHash === sourceCatalogueHash
        || isAdditivePremiseCatalogue(completedPrior.premiseFacts, premiseFacts))) {
      // Re-evaluate exactly saved v6 wire replies against the same Plan and
      // source catalogue. Never repurchase them because local binding changed.
      for (const attempt of completedPrior.attempts || []) {
        const retained = (input.retainedOutputs || []).findLast(o =>
          o.roundKind === "final_review_reconciliation" && o.contextHash === attempt.contextHash
          && o.outputHash === attempt.wireOutputHash
          && o.outputHash === hashStarcraftTmgContract(o.sanitizedOutput));
        if (!retained) continue;
        const output = decodeWireEvidence(retained.sanitizedOutput,retained.outputContractRef);
        contextHash = attempt.contextHash;
        const remainingTargets = targets.filter(t => !accepted.has(t.findingIndex)
          && output.judgments.some(j => j.findingIndex === t.findingIndex));
        if (!remainingTargets.length) continue;
        recordCandidate({ output, receipt: { retainedDispatchRequestId: retained.dispatchRequestId,
          paidReplyReused: true } }, remainingTargets,
        { importedPolicyVersion: completedPrior.policyVersion, retainedPaidReply: true, providerAttempt: false,
          catalogueTransportVersion: retained.outputContractRef?.version === '4.2.0'
            ? ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1 : ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2,
          wireOutputHash: retained.outputHash });
        imported = true;
      }
    }
    const importedCompletedV6 = imported;
    for (let roundIndex = 1; !resumeCurrent && !importedCompletedV6 && roundIndex <= 3; roundIndex += 1) {
      contextHash = hashStarcraftTmgContract({
        baseContextHash: legacyBase, roundIndex, previousOutput, issues: legacyIssues });
      const retained = (input.retainedOutputs || []).findLast(o =>
        o.roundKind === "final_review_reconciliation" && o.contextHash === contextHash
        && o.outputHash === hashStarcraftTmgContract(o.sanitizedOutput));
      if (!retained) break;
      const candidate = { output: retained.sanitizedOutput,
        receipt: { retainedDispatchRequestId: retained.dispatchRequestId, paidReplyReused: true } };
      const partition = recordCandidate(candidate, targets, { roundIndex, importedPolicyVersion: 5,
        retainedPaidReply: true });
      imported = true;
      previousOutput = partition.output;
      legacyIssues = reconciliationBindingIssues(canonicalSchema(targets), previousOutput, targets, sources);
      if (!legacyIssues.length) legacyIssues = rosterReviewPremiseIssuesV1({
        targets, output: previousOutput, facts: premiseFacts });
      if (!legacyIssues.length) break;
    }
    if (imported) {
      pending = targets.filter(t => !accepted.has(t.findingIndex));
      maximumFreshCalls = 1; // One authorized post-fix attempt, not a reset of old history.
    }
    else {
      // Checkpoints bind to this complete Plan/review/source identity. They
      // carry partial successes across process restarts without silent reset.
      const prior = input.recoveryCheckpoint;
      if (prior?.baseContextHash === baseContextHash && prior.policyVersion === ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION) {
        restoringCurrentCheckpoint=true;
        maximumFreshCalls = input.maximumFreshCalls ?? prior.maximumFreshCalls ?? 3;
        attempts.push(...structuredClone(prior.attempts || []));
        const savedItems = [...(prior.judgments || [])];
        if (savedItems.length) recordCandidate({ output: {
          schemaVersion: "starcraft_tmg_roster_review_reconciliation_v1",
          roundKind: "final_review_reconciliation", judgments: savedItems,
          publicSummary: "Revalidated saved per-item progress" } },
        targets.filter(t => savedItems.some(j => j.findingIndex === t.findingIndex)),
        { checkpointRevalidated: true });
        for (const item of prior.unresolvedJudgments || []) {
          if (targets.some(t => t.findingIndex === item.findingIndex)
            && !accepted.has(item.findingIndex) && item.bindingIssues?.length) unresolved.set(item.findingIndex, item);
        }
        // A Provider reply is persisted before its consumer commits progress.
        // Recover that exact reply first: advancing roundIndex here otherwise
        // changes the request identity and silently bypasses zero-cost replay.
        // Only this unchanged Plan/review/source checkpoint may supply it.
        for (const {attempt:savedAttempt,retained} of retainedRosterReviewRecoveryCandidatesV1({
          checkpoint:prior,retainedOutputs:input.retainedOutputs})) {
          const attempt=attempts.find(a=>a.contextHash===savedAttempt.contextHash
            && a.wireOutputHash===savedAttempt.wireOutputHash && a.status===savedAttempt.status);
          if(!attempt)continue;
          const subset = targets.filter(t => !accepted.has(t.findingIndex)
            && retained.sanitizedOutput.judgments?.some(j=>j.findingIndex===t.findingIndex));
          if (!subset.length) continue;
          contextHash = attempt.contextHash;
          attempts.splice(attempts.indexOf(attempt), 1);
          recordCandidate({ output: decodeWireEvidence(retained.sanitizedOutput,retained.outputContractRef),
            receipt: { retainedDispatchRequestId: retained.dispatchRequestId, paidReplyReused: true } },
          subset, { roundIndex: attempt.roundIndex, providerAttempt: true,
            catalogueTransportVersion: retained.outputContractRef?.version === '4.2.0'
              ? ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1 : ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2,
            retainedPaidReply: true, wireOutputHash: retained.outputHash });
        }
        pending = targets.filter(t => !accepted.has(t.findingIndex)
          && (!unresolved.has(t.findingIndex) || prior.pendingFindingIndexes?.includes(t.findingIndex)));
        await save('retained_reply_revalidated');
        restoringCurrentCheckpoint=false;
      }
    }
      const priorAttempts = input.recoveryCheckpoint?.baseContextHash === baseContextHash
        ? input.recoveryCheckpoint.attempts || [] : [];
      const usedCalls = countRosterReviewDispatchesV1({
        contexts:priorAttempts.map(a=>a.contextHash),dispatches:input.providerDispatches,
        fallback:priorAttempts.filter(a=>a.providerAttempt===true).length });
      const seenOutputs = new Set();
      for (let roundIndex = usedCalls + 1; pending.length && roundIndex <= maximumFreshCalls; roundIndex += 1) {
        const subset = pending;
        const wireItem = closed({ ...canonicalItem.properties,
          factChecks: {type:'array', minItems:0, items:{...literalTools.schema,
            properties:{...literalTools.schema.properties,quantity:{...quantitySchema,
              properties:{...quantitySchema.properties,kind:choice(['source_value','marker_total',
                'marker_per_marker','marker_margin','marker_transfer_swing'])}}}}},
          sourceEvidence: { type: "array", minItems: 0,
            items: closed({ evidenceId: str }) },
          counterEvidence: { type: "array", minItems: 0,
            items: closed({ evidenceId: str }) },
        });
        const schema = canonicalSchema(subset);
        schema.properties.judgments.items = wireItem;
        const contract = createStarcraftTmgOutputContractV1({
          id: "ticket27.roster_review_reconciliation.v1", version: ROSTER_REVIEW_CATALOGUE_CONTRACT_VERSION,
          schemaName: "roster_review_reconciliation_v1", providerSchema: schema,
          modelOwnedFields: Object.keys(schema.properties), hostOwnedFields: [],
          mapperRef: { id: "ticket27.review_reconciliation.decode", version: ROSTER_REVIEW_CATALOGUE_CONTRACT_VERSION,
            hash: hashStarcraftTmgContract(ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2) },
          semanticValidatorRef: { id: "ticket27.review_reconciliation.bind", version: "4.1.0",
            hash: hashStarcraftTmgContract("ticket27.review_reconciliation.typed_quantities.v13") },
          description: "Per-item source qualification; host-resolved evidence IDs; unresolved is not a pass.",
        });
        contextHash = hashStarcraftTmgContract({ baseContextHash, roundIndex,
          catalogueTransportVersion: ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2,
          literalToolsVersion:ROSTER_REVIEW_LITERAL_TOOLS_V1,
          pendingFindingIndexes: subset.map(t => t.findingIndex), issues: [...unresolved.values()] });
        const dispatchAttempt = { roundIndex, contextHash, providerAttempt: true, status: "dispatching",
          pendingFindingIndexes: subset.map(t => t.findingIndex) };
        attempts.push(dispatchAttempt);
        await save("before_dispatch");
        const result = await deliberation.deliberate({
          sessionId, roundIndex, roundKind: "final_review_reconciliation",
          promptPack: "ticket27.review_reconciliation.v7", contextHash,
          promptNodes: [
            { kind: "literal-claims-to-qualify", targets: subset },
            { kind: "current-claim-evidence-catalogue", claims: claimCatalogue },
            catalogueTransport.node,
            { kind: "failed-item-feedback", items: [...unresolved.values()],
              acceptedFindingIndexes: [...accepted.keys()], reviewerConclusionIsNotFact: true },
            ...projectRosterQualificationFocusV1({sourceFacts,targets:subset}),
            compileRosterReviewLiteralToolsV1({targets:subset,numericCheckSchema}).node,
          ],
          userMessage: "Assess only these literal claims using the shared facts. Do not copy previous reviewer opinions. "
            + "source_supported means the assertion agrees with the source; source_contradicted requires a bound rule "
            + "or numeric contradiction; source_attribution_unsubstantiated identifies a claim that its cited source "
            + "proves something the source does not establish; conditional_or_uncertain is an explicit forecast, not "
            + "an escape from wrong rule numbers. Return no severity. Numeric factChecks must bind the exact alleged "
            + "value (an exact unique quote containing that amount), actor, quantity and marker group, not a different true number "
            + "in the surrounding text. A marker ID is not a VP amount. Potential VP assumes control. "
            + "Array source paths are zero-based indexes, not marker numbers: use each row's number field for its identity. "
            + "Projected math is not observed score. Starting slots differ from audited final slots. Unknown/entry-edge "
            + "geometry cannot disprove a hypothetical formation. Select sourceEvidence evidenceIds from the fact "
            + "catalogue and counterEvidence evidenceIds from the claim catalogue; the host resolves exact text. "
            + "Source evidence can prove an assertion without another Plan sentence repeating it. Conditional scope "
            + "may be present in the alleged quote itself; citing it does not prove the numeric premise. "
            + "For each factCheck select the original amount using claimLiteralId from numeric-claim-literal-tools; do not write claimedValue or claimValueQuote. For a direct fact use factId and calculation:{operation:'identity',factIds:[]}; "
            + "for a sum or difference use factId:'' and calculation:{operation:'sum'|'difference',factIds:[exact source IDs]}. "
            + "The host computes those operands; a group subtotal cannot be bound as a different total or a per-marker amount. "
            + "For marker VP, extract quantity from the alleged claim (not from the reviewer reason): kind marker_total, marker_per_marker, "
            + "marker_margin (own set total minus opposing set total), or marker_transfer_swing (gaining actor total plus losing actor total for the SAME set). "
            + "Specify scoringActorId and markerNumbers; margin/swing also specify opposingActorId and opposingMarkerNumbers. "
            + "For marker_total/per_marker the opposing fields are empty. Use factId:'' and calculation:{operation:'identity',factIds:[]} "
            + "for these typed quantities: the host computes them directly from markerQuantityAuthority, not supplied subtotal IDs. "
            + "Quote enough of the allegation to show the actor and set; use its surrounding claim only to resolve pronouns. "
            + "Per-marker requires every selected marker to have the same value. Margin requires disjoint control sets. "
            + "For non-marker numeric facts only, quantity is {kind:'source_value',scoringActorId:'',markerNumbers:[],opposingActorId:'',opposingMarkerNumbers:[]}. "
            + "rosterUnits firstArrivalRound describes the declared checked schedule, not an observed on-table position. "
            + "Check every stated VP amount, with enough quote context to identify the occurrence. Do not invent IDs, quotes, "
            + "calculations or private reasoning. A real source error must remain blocking; do not weaken strategies "
            + "to make the review pass. Each requested findingIndex once.",
          responseContract: { allowedChannels: ["roster_strategy"], publicEvidenceOnly: true,
            rulesRemainSoleLegalityAuthority: true },
          responseFormat: { kind: "provider_strict_json_schema", schemaName: contract.schemaName,
            outputContractRef: outputContractRefStarcraftTmgV1(contract), schema: structuredClone(schema) },
        });
        const output = decodeWireEvidence(result?.output,result?.receipt?.outputContractRef);
        attempts.splice(attempts.indexOf(dispatchAttempt), 1);
        const outcome = recordCandidate({ ...result, output }, subset, { roundIndex,
          catalogueTransportVersion: ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2,
          providerAttempt: true, wireOutputHash: hashStarcraftTmgContract(result?.output ?? null) });
        pending = outcome.retry;
        await save("item_progress");
        const fingerprint = hashStarcraftTmgContract(result?.output ?? null);
        if (seenOutputs.has(fingerprint)) break;
        seenOutputs.add(fingerprint);
      }
    for (const target of pending) if (!unresolved.has(target.findingIndex)) {
      unresolved.set(target.findingIndex, { findingIndex: target.findingIndex, status: "needs_evidence",
        bindingIssues: [{ code: "QUALIFICATION_ATTEMPTS_EXHAUSTED" }],
        repairRoute: "review_judgment_contract", reviewerConclusionIsNotFact: true });
    }
    pending = [];
    await save("completed");
  } catch (error) {
    const previousCheckpoint = checkpoint;
    if(restoringCurrentCheckpoint){
      // Restoration is a transaction. A schema/persistence exception must not
      // replace known paid successes with a half-built empty working map.
      checkpoint=structuredClone(input.recoveryCheckpoint);
    } else {
      try { await save("interrupted"); } catch { checkpoint = previousCheckpoint; }
    }
    error.reconciliationAttempts = structuredClone(restoringCurrentCheckpoint
      ? input.recoveryCheckpoint.attempts : attempts);
    error.recoveryCheckpoint = structuredClone(checkpoint);
    error.bindingIssues ||= [...unresolved.values()].flatMap(j => j.bindingIssues);
    throw error;
  }
  const judgments = [...accepted.values()].sort((a, b) => a.findingIndex - b.findingIndex);
  const decisions = judgments.filter(j => NONBLOCKING_CLAIM_ASSESSMENTS.has(j.claimAssessment)).map(j => ({
    findingIndex: j.findingIndex, findingHash: hashStarcraftTmgContract(review.findings[j.findingIndex]),
    effectiveSeverity: "medium", publicReason: j.publicReason, counterEvidence: j.counterEvidence,
  }));
  const { reviewHash, reviewAdjudication, ...body } = review;
  return createRosterFinalPlanReviewAdjudicationV1({ plan,
    review: { ...body, reviewHash: hashStarcraftTmgContract(body) }, decisions,
    reconciliation: { status: "completed", sourceReviewHash: review.reviewHash,
      baseContextHash, contextHash, policyVersion: ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION, attempts, reviewerReceipt: lastReceipt,
      judgments, unresolvedJudgments: [...unresolved.values()].sort((a, b) => a.findingIndex - b.findingIndex),
      publicSummary, premiseFacts, sourceCatalogueHash,
      previousAdjudication: structuredClone(reviewAdjudication || null),
      modelJudgmentIsNotRulesAuthority: true, trainingTruth: false } });
}
function verifiedReceipt(receipt, referencedHashes) {
  if (!receipt || !referencedHashes.has(receipt.receiptHash)) return false;
  const { receiptHash, ...body } = receipt;
  return hashStarcraftTmgContract(body) === receiptHash;
}

// The paid reviewer is advisory and bounded to six findings. Keep its original
// receipt immutable; a separately hashed, Rules-source-backed supplement can
// catch a concrete scoring-window contradiction without pretending the model
// reported it. Missing or conflicting authority never becomes an invented fact.
export function supplementRosterFinalPlanReviewWithMissionScoringV1({
  plan, review, toolReceipts = [], missionProfile,
} = {}) {
  if (!plan?.planHash || review?.planHash !== plan.planHash
    || !review?.reviewHash || review?.missionScoringSourceAudit) {
    throw new Error("ROSTER_FINAL_REVIEW_SOURCE_SUPPLEMENT_INVALID");
  }
  const { reviewHash, ...originalBody } = review;
  if (hashStarcraftTmgContract(originalBody) !== reviewHash) {
    throw new Error("ROSTER_FINAL_REVIEW_SOURCE_SUPPLEMENT_DRIFT");
  }
  const receipts = toolReceipts.filter((receipt) => {
    if (receipt?.queryId !== "mission-scoring-authority"
      || receipt.resultStatus !== "derivable"
      || receipt.sourceStateHash !== receipt.baseStateHash) return false;
    const { receiptHash, ...body } = receipt;
    return hashStarcraftTmgContract(body) === receiptHash;
  });
  const matches = receipts.filter((receipt) => receipt
    .missionScoringProfile?.missionScoringProfileHash
      === plan.openingDeploymentSchedule?.missionScoringProfileHash);
  if (matches.length !== 1) {
    throw new Error("ROSTER_FINAL_REVIEW_MISSION_SCORING_SOURCE_UNAVAILABLE");
  }
  const receipt = matches[0];
  const profile = receipt.missionScoringProfile;
  verifyOfficialMissionScoringProfileV1(missionProfile);
  if (profile.missionScoringProfileHash
      !== missionProfile.missionScoringProfileHash
    || profile.sourceTextHash !== missionProfile.sourceTextHash
    || profile.destroyedEnemySupplyVpPerSupply
      !== missionProfile.destroyedEnemySupplyVpPerSupply
    || profile.markerScoringStartsRound
      !== missionProfile.markerScoringStartsRound) {
    throw new Error("ROSTER_FINAL_REVIEW_MISSION_SCORING_PROJECTION_DRIFT");
  }
  const route = plan.scoreRoute?.routeText || "";
  const denial = route.match(
    /round\s*1\s+is\s+purely\s+positional:\s*no\s+VP\s+is\s+available/iu);
  const findings = structuredClone(review.findings);
  if (denial && profile.destroyedEnemySupplyVpPerSupply > 0
    && !findings.some((finding) => finding.claimPath
      === "scoreRoute.routeText" && finding.severity === "high"
      && finding.claimQuote === denial[0])) {
    findings.push({ claimPath: "scoreRoute.routeText",
      claimQuote: denial[0], category: "scoring", severity: "high",
      publicReason: "The frozen mission awards VP for enemy Supply destroyed "
        + "in each scoring round; only marker-control VP starts in round 2. "
        + "A round-1 kill can therefore score.",
      correctionQuestion: "Revise the round-1 scoring and kill-trade "
        + "guidance without changing the Rules-checked roster, arrival "
        + "schedule or target VP table." });
  }
  const body = { ...structuredClone(originalBody), findings,
    sourceReviewParentHash: reviewHash,
    missionScoringSourceAudit: {
      status: "verified",
      receiptHash: receipt.receiptHash,
      missionScoringProfileHash: profile.missionScoringProfileHash,
      destroyedEnemySupplyVpPerSupply:
        profile.destroyedEnemySupplyVpPerSupply,
      markerScoringStartsRound: profile.markerScoringStartsRound,
      contradictionCount: findings.length - review.findings.length,
    } };
  return Object.freeze({ ...body,
    reviewHash: hashStarcraftTmgContract(body) });
}

function selectedMapRouteFacts(plan, toolReceipts,
  selectedCandidateInputHash) {
  const unknown = (reason) => ({ status: "unknown", reason,
    exactMoveOrDeploymentLegality: false });
  if (!selectedCandidateInputHash) {
    return unknown("selected_candidate_input_hash_unavailable");
  }
  const referencedHashes = new Set((plan.toolReceiptReferences || [])
    .filter((entry) => entry.status === "attached")
    .map((entry) => entry.receiptHash));
  const routes = toolReceipts.filter((receipt) => (
    receipt.queryKind === "evaluate_roster_route"
      && receipt.resultStatus === "certified_base_clearance_audit"
      && receipt.candidateInputHash === selectedCandidateInputHash
      && receipt.sideId === plan.sideKey
      && verifiedReceipt(receipt, referencedHashes)));
  if (routes.length !== 1) {
    return unknown("selected_route_receipt_not_unique_or_unavailable");
  }
  const route = routes[0];
  const binding = route.mapBinding;
  const mission = plan.provenance?.missionBinding;
  const summaries = toolReceipts.filter((receipt) => (
    receipt.queryKind === "summarize_map"
      && receipt.resultStatus === "certified_map_summary"
      && verifiedReceipt(receipt, referencedHashes)
      && receipt.mapBinding?.sourceStateHash === binding?.sourceStateHash
      && receipt.mapBinding?.roomFreezeHash === binding?.roomFreezeHash));
  if (summaries.length !== 1
    || binding?.missionRecordKey !== mission?.missionRecordKey
    || binding?.deploymentRecordKey !== mission?.deploymentRecordKey
    || !binding?.sourceStateHash || !binding?.roomFreezeHash) {
    return unknown("map_summary_or_mission_binding_mismatch");
  }
  const receiptUnits = new Map((route.units || []).map((unit) => (
    [unit.unitInstanceId, unit])));
  const accessByBase = new Map((route.accessByBase || []).map((entry) => (
    [entry.baseId, entry.targets])));
  if (receiptUnits.size !== plan.rosterCandidate.units.length
    || plan.rosterCandidate.units.some((unit) => (
      receiptUnits.get(unit.unitInstanceId)?.recordKey !== unit.recordKey
        || !accessByBase.has(receiptUnits.get(unit.unitInstanceId)?.baseId)))) {
    return unknown("selected_roster_unit_or_base_access_mismatch");
  }
  return { status: "certified_base_clearance_audit",
    reachabilityInterpretationVersion:
      PREGAME_TARGET_REACHABILITY_INTERPRETATION_V1,
    receiptHash: route.receiptHash,
    mapSummaryReceiptHash: summaries[0].receiptHash,
    missionMarkers: (summaries[0].missionMarkers || []).map((marker) => ({
      targetId: marker.targetId,
      coordinate: marker.coordinate,
      elevation: marker.elevation,
    })),
    mapBinding: { sourceStateHash: binding.sourceStateHash,
      roomFreezeHash: binding.roomFreezeHash,
      seedId: binding.seedId,
      compilationHash: binding.compilationHash },
    exactMoveOrDeploymentLegality: false,
    formationCoherencyAndEndingFitChecked: false,
    flyingAndAbilityTransitChecked: false,
    routeLengthIsApproximate: true,
    units: plan.rosterCandidate.units.map((unit) => {
      const baseId = receiptUnits.get(unit.unitInstanceId).baseId;
      return { unitInstanceId: unit.unitInstanceId,
        recordKey: unit.recordKey, baseId,
        firstArrivalRound: plan.openingDeploymentSchedule?.entries.find(
          (entry) => entry.unitInstanceId === unit.unitInstanceId)?.round
          ?? null,
        objectiveAccess: accessByBase.get(baseId).map((target) => ({
          targetId: target.targetId,
          ...projectPregameTargetReachabilityV1(target),
          failureCode: target.failureCode,
          approximateRouteLengthInches:
            target.approximateRouteLengthInches,
          accessPointId: target.accessPointId,
        })) };
    }),
  };
}

// Shared, read-only projection for both the independent reviewer and the
// coordinated revision. Repeating these facts in separate prompt builders
// previously caused Supply, map-coordinate and VP-row interpretations to
// diverge while the underlying Rules receipts were identical.
function citedTeachQueryEvidenceV1(teachState, citedHashes, sourceStateHash,
  toolReceipts) {
  if (!teachState || !sourceStateHash) return [];
  const native = new Map(toolReceipts.map(receipt => [receipt.receiptHash, receipt]));
  const found = new Map();
  const evidence = [...(teachState.evidence || []),
    ...(teachState.investigation?.evidence || []),
    ...(teachState.retainedHistoricalEvidence || []),
    ...(teachState.queryRecovery?.operations || []).map(op => op.result)];
  for (const receipt of evidence) {
    if (!receipt || !citedHashes.has(receipt.receiptHash)) continue;
    // These two fields are framework routing metadata added after the original
    // evidence-port seal. Keep the signed original body and its Native children.
    const { receiptHash, questionId: _question, queryRecoveryOf: _recovery,
      ...body } = receipt;
    if (body.schema !== "starcraft_tmg_roster_teach_evidence_receipt_v1"
      || hashStarcraftTmgContract(body) !== receiptHash
      || body.sourceReceipt?.sourceStateHash !== sourceStateHash
      || body.sourceReceipt?.mutatesSourceState !== false) continue;
    const children = [body.sourceReceipt,
      ...(body.followUpReceipts || []).flatMap(row => row.receipt ? [row.receipt] : [])];
    if (children.some(child => !native.has(child.receiptHash)
      || hashStarcraftTmgContract(child)
        !== hashStarcraftTmgContract(native.get(child.receiptHash))
      || !verifiedReceipt(child, new Set([child.receiptHash])))) continue;
    found.set(receiptHash, structuredClone({ ...body, receiptHash }));
  }
  return [...found.values()];
}

export function buildRosterFinalPlanVerifiedFactsV1({ plan,
  toolReceipts = [], selectedCandidateInputHash = null,
  selectionUnitRules = [], selectionJustificationPolicyVersion = null,
  selectionSupportRules = [],
  teachState = null } = {}) {
  const selectionClaims = reviewSources(plan, true).filter(source =>
    source.text.includes("Selection argument (public model output):")
      || source.text.includes("Final choice argument (public model output):"));
  const selectionRequired = selectionJustificationPolicyVersion === "unit_role_comparison_v1"
    || selectionClaims.length > 0;
  const selectedRecordKeys = new Set(plan.rosterCandidate.units.map(unit => unit.recordKey));
  // The catalogue is public Rules data, not proof of an enemy roster. Fixed-list
  // plans still make unit/weapon/opponent claims: absence of a Builder's optional
  // comparison block must never hide their available source facts from review.
  const selectionRules = selectionUnitRules;
  if (selectionRequired && [...selectedRecordKeys].some(recordKey =>
    !selectionRules.some(rule => rule.recordKey === recordKey))) {
    throw Object.assign(new Error("ROSTER_SELECTION_RULE_FACTS_MISSING"), {
      code: "ROSTER_SELECTION_RULE_FACTS_MISSING",
    });
  }
  const schedule = plan.openingDeploymentSchedule || null;
  const sourceAudit = auditRosterPlanVpReceiptsV1({ plan, toolReceipts });
  const selectedMapRouteEvidence = selectedMapRouteFacts(plan, toolReceipts,
    selectedCandidateInputHash);
  const missionReceipts = toolReceipts.filter((receipt) => (
    receipt?.queryId === "mission-scoring-authority"
      && receipt?.missionScoringProfile?.recordKey
        === plan.provenance?.missionBinding?.missionRecordKey
      && (!schedule?.missionScoringProfileHash
        || receipt.missionScoringProfile.missionScoringProfileHash
          === schedule.missionScoringProfileHash)));
  const missionMarkerScoringArithmetic =
    projectMissionMarkerScoringArithmeticV1({
      receipts: missionReceipts,
      sideKey: plan.sideKey,
      expectedMissionScoringProfileHash:
        schedule?.missionScoringProfileHash || null,
      expectedSourceStateHash: selectedMapRouteEvidence.status
        === "certified_base_clearance_audit"
        ? selectedMapRouteEvidence.mapBinding.sourceStateHash : null,
    });
  // Old plans retain their original versions/bytes. Their Teach receipts may
  // predate attachment to toolReceiptReferences; an explicit public citation
  // can still be checked against the retained, hash-verified tool log and the
  // SAME frozen source. Never infer that evidence is absent just because the
  // final selected-roster route receipt has a different query/hash.
  const claimSources = reviewSources(plan, true);
  const citedHashes = new Set(claimSources
    .flatMap(entry => entry.text.match(/\b[a-f0-9]{64}\b/gu) || []));
  // Plans are instructed to cite platform reference IDs. Resolve those IDs
  // through the Plan's immutable reference table before looking up evidence;
  // requiring model prose to repeat a 64-character hash drops real receipts.
  const mentions = (text, id) => {
    for (let at = text.indexOf(id); at >= 0; at = text.indexOf(id, at + id.length)) {
      if (!/[A-Za-z0-9_:-]/u.test(text[at - 1] || '')
        && !/[A-Za-z0-9_:-]/u.test(text[at + id.length] || '')) return true;
    }
    return false;
  };
  const citedToolReferences = (plan.toolReceiptReferences || []).filter(ref =>
    typeof ref.referenceId === 'string' && ref.referenceId
    && claimSources.some(source => mentions(source.text, ref.referenceId)))
    .map(ref => ({ referenceId: ref.referenceId, receiptHash: ref.receiptHash,
      status: ref.status, referenceAloneIsNotEvidence: true }));
  for (const ref of citedToolReferences) {
    if (/^[a-f0-9]{64}$/u.test(ref.receiptHash || '')) citedHashes.add(ref.receiptHash);
  }
  const sourceStateHash = selectedMapRouteEvidence.mapBinding?.sourceStateHash;
  const citedReadOnlyQueryEvidence = sourceStateHash
    ? toolReceipts.filter(receipt => {
      const receiptSource = receipt?.mapBinding?.sourceStateHash
        || receipt?.sourceStateHash;
      return receiptSource === sourceStateHash
        && (receipt.mutatesRoomState === false
          || receipt.mutatesSourceState === false)
        && verifiedReceipt(receipt, citedHashes);
    }).map(receipt => structuredClone(receipt)) : [];
  const citedTeachQueryEvidence = citedTeachQueryEvidenceV1(teachState,
    citedHashes, sourceStateHash, toolReceipts);
  // A repair must be able to select already-queried counterevidence, not only
  // the old citations it is correcting. Keep original status, source/base and
  // hypothesis scope; availability never promotes a query to a true claim.
  const availableHashes = new Set(toolReceipts.map(r=>r?.receiptHash));
  const availableQueries = sourceStateHash ? toolReceipts.filter(r =>
    !citedHashes.has(r?.receiptHash) && r?.sourceStateHash === sourceStateHash
    && (r.mutatesRoomState === false || r.mutatesSourceState === false)
    && verifiedReceipt(r,availableHashes)) : [];
  // Inline counterevidence of the same query families as the claims being
  // checked. Other retained query families stay discoverable in an explicit
  // index; their giant all-board graphs are not premises of this claim edit.
  const relevantQueryKinds = new Set(citedReadOnlyQueryEvidence.map(r=>r.queryKind).filter(Boolean));
  const availableReadOnlyQueryEvidence = availableQueries
    .filter(r=>relevantQueryKinds.has(r.queryKind)).map(r=>structuredClone(r));
  // The review has no later tool-read turn. An index alone hid actual Native
  // deployments/fire results and made the reviewer substitute old map-grid
  // witnesses. Deliver the same scoped result views used by Teach and repair.
  const availableReadOnlyQueryResultViews = projectRosterTeachResultEvidenceV1(availableQueries);
  const expandedHashes = new Set(availableReadOnlyQueryEvidence.map(r=>r.receiptHash));
  const availableReadOnlyQueryIndex = availableQueries.map(r=>({receiptHash:r.receiptHash,
    queryKind:r.queryKind || null,sourceStateHash:r.sourceStateHash,
    baseStateHash:r.baseStateHash || r.branchStateHash || null,resultStatus:r.resultStatus || null,
    resultIncluded:expandedHashes.has(r.receiptHash),fullReceiptRetained:true,
    indexIsNotQueryResultEvidence:true}));
  const missionMarkerScoringByActor = projectMissionMarkerScoringByActorV1({
    receipts: missionReceipts,
    expectedMissionScoringProfileHash: schedule?.missionScoringProfileHash || null,
    expectedSourceStateHash: selectedMapRouteEvidence.status === "certified_base_clearance_audit"
      ? selectedMapRouteEvidence.mapBinding.sourceStateHash : null,
  });
  const sourceFacts = {
    planHash: plan.planHash,
    candidateHash: plan.rosterCandidate.candidateHash,
    supplyValueContexts:describeOfficialContextualSupplySemanticsV1(),
    rosterUnitCounts: plan.rosterCandidate.units.reduce((counts, unit) => {
      counts[unit.recordKey] = (counts[unit.recordKey] || 0) + 1;
      return counts;
    }, {}),
    rosterUnits: plan.rosterCandidate.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
      firstArrivalRound: schedule?.entries.find((entry) => (
        entry.unitInstanceId === unit.unitInstanceId))?.round ?? null,
      firstArrivalRoundMeaning: "scheduled_first_arrival_not_rules_earliest",
    })),
    roundSupplySchedule: schedule ? {
      scheduleHash: schedule.scheduleHash,
      isChosenPlanNotUniqueLegalSchedule: true,
      scheduleDoesNotProveAlternativeArrivalsIllegal: true,
      rounds: schedule.rounds,
      entries: schedule.entries.map((entry) => ({
        unitInstanceId: entry.unitInstanceId,
        round: entry.round,
        startingSupply: entry.startingSupply,
        poolSupply: entry.poolSupply,
        applicableDefinitionIds: entry.applicableDefinitionIds,
      })),
      placementAndPathVerified: schedule.placementAndPathVerified,
    } : null,
    targetVpSchedule: plan.scoreRoute?.targetVpSchedule ?? null,
    citedMathReceipts: sourceAudit.citedMathReceipts,
    staleMathCitationHashes: sourceAudit.staleCitationHashes,
    misappliedMathCitationHashes: sourceAudit.misappliedCitationHashes,
    selectedMapRouteEvidence,
    citedReadOnlyQueryEvidence,
    ...(availableReadOnlyQueryEvidence.length ? {availableReadOnlyQueryEvidence,
      availableQueriesRetainOriginalSceneAndUnknownScope:true} : {}),
    ...(availableReadOnlyQueryIndex.length ? {availableReadOnlyQueryIndex} : {}),
    ...(Object.keys(availableReadOnlyQueryResultViews).length ? {
      availableReadOnlyQueryResultViews,
      queryEvidenceInterpretation:'Map-grid witnesses, static hypothetical placements and Native executed steps are not interchangeable. Read each result under its own sourceReceiptHash and parent/branch scope. A successful conditional deployment proves that step, not arrival at a marker or a future opponent choice. An index is not a full result; an unexpanded receipt is not proof that an experiment was never performed.',
    } : {}),
    ...(citedToolReferences.length ? { citedToolReferences } : {}),
    ...(citedTeachQueryEvidence.length ? { citedTeachQueryEvidence } : {}),
    missionMarkerScoringArithmetic,
    sourceScoringIsNotProofOfMarkerControl: true,
    noDeploymentPositionOrPathProof: true,
    ...(selectionSupportRules.length ? {
      selectionSupportRules: structuredClone(selectionSupportRules),
      supportRuleCatalogueIsObservedEnemyLoadout: false,
    } : {}),
    ...(selectionRequired || selectionRules.length ? {
      // Preserve legacy request serialization order for paid-shard recovery.
      missionMarkerScoringByActor,
      callerSuppliedMathDoesNotVerifyScoringPremises: true,
      selectionUnitRules: structuredClone(selectionRules),
      unitRuleCatalogueIsObservedEnemyRoster: false,
      selectionRosterUnits: structuredClone(plan.rosterCandidate.units),
      selectionArgumentsAreModelClaimsNotVerifiedFacts: true,
    } : { missionMarkerScoringByActor }),
  };
  return Object.freeze({ sourceFacts: Object.freeze(sourceFacts),
    sourceAudit });
}

export async function reviewRosterFinalPlanV1(input = {}) {
  return reviewRosterFinalPlan(input, false);
}

export async function reviewRosterFinalPlanV2(input = {}) {
  return reviewRosterFinalPlan(input, true);
}

function reviewDependencyBody(plan) {
  const body = structuredClone(plan);
  // sourcePlanHash is the derived inner-plan digest, not an independent
  // Rules dependency. Both complete envelopes were verified above; compare
  // their actual non-prose fields instead of invalidating every text edit.
  for (const key of ["planHash", "sourcePlanHash", "planVersion", "planStatus", "revisions",
    "publicSummaryText"]) delete body[key];
  for (const key of ["routeText", "fallbackRouteText", "scoreRouteHash"]) {
    delete body.scoreRoute[key];
  }
  for (const key of ["deploymentConceptText", "reinforcementPolicyText",
    "threatTradeText", "objectiveControlText", "deploymentConceptHash"]) {
    delete body.deploymentConcept[key];
  }
  for (const purpose of body.componentPurposes || []) {
    delete purpose.publicPurposeText;
    delete purpose.purposeHash;
  }
  return omitRosterStructuredPublicClaimsV1(body);
}

function factDependencyHash(facts) {
  const { planHash, ...dependencies } = facts;
  return hashStarcraftTmgContract(dependencies);
}

// Reuse an actual full review, never simply relabel a partial review as full.
// Every non-prose dependency (including future fields) must be unchanged.
// The complete cross-claim index still accompanies the changed targets.
function incrementalReviewScope(input, allSources) {
  if (!input.incrementalFrom) return null;
  const { plan: previous, review } = input.incrementalFrom;
  const fail = (detail) => { throw Object.assign(new Error(
    `ROSTER_INCREMENTAL_REVIEW_DEPENDENCY_CHANGED:${detail}`), {
    code: "ROSTER_INCREMENTAL_REVIEW_DEPENDENCY_CHANGED", detail,
  }); };
  if (!previous || !review) fail("baseline_missing");
  verifiedReviewBody(previous, review);
  verifyRosterFinalPlanReviewAdjudicationV1({ plan: previous, review });
  const coverageUpgrade = review.reviewContextVersion === LEGACY_GLOBAL_COMPONENT_REVIEW_CONTEXT_V3;
  const beforeSources = reviewSources(previous, true, !coverageUpgrade);
  if ((!coverageUpgrade && review.reviewContextVersion !== ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3)
    || review.evidenceAuditVersion !== ROSTER_PLAN_SOURCE_AUDIT_VERSION
    || review.reviewedClaimPaths?.length !== beforeSources.length
    || new Set(review.reviewedClaimPaths).size !== beforeSources.length
    || beforeSources.some(source => !review.reviewedClaimPaths.includes(source.path))
    || hashStarcraftTmgContract(reviewDependencyBody(previous))
      !== hashStarcraftTmgContract(reviewDependencyBody(input.plan))) {
    fail("non_prose_or_coverage");
  }
  const beforeFacts = buildRosterFinalPlanVerifiedFactsV1({ ...input,
    plan: previous }).sourceFacts;
  const afterFacts = buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
  const factsHash = factDependencyHash(beforeFacts);
  let citedEvidenceScopeChange = null;
  if (factsHash !== factDependencyHash(afterFacts)) {
    // This list is a projection of citations in the Plan, not the frozen
    // authority itself. A7 cited its newly completed control query in two
    // changed fields; treating that as every claim's facts changing silently
    // repurchased a full review. Keep the full baseline-fact check below and
    // require every other fact and every common receipt to remain identical.
    const { citedReadOnlyQueryEvidence: beforeNative = [],
      citedTeachQueryEvidence: beforeTeach = [], ...beforeAuthority } = beforeFacts;
    const { citedReadOnlyQueryEvidence: afterNative = [],
      citedTeachQueryEvidence: afterTeach = [], ...afterAuthority } = afterFacts;
    const beforeEvidence = [...beforeNative, ...beforeTeach];
    const afterEvidence = [...afterNative, ...afterTeach];
    if (factDependencyHash(beforeAuthority) !== factDependencyHash(afterAuthority)) fail("facts_changed");
    const priorEvidence = new Map(beforeEvidence.map(r => [r.receiptHash, hashStarcraftTmgContract(r)]));
    const nextEvidence = new Map(afterEvidence.map(r => [r.receiptHash, hashStarcraftTmgContract(r)]));
    if ([...priorEvidence].some(([id, value]) => nextEvidence.has(id) && nextEvidence.get(id) !== value)) {
      fail("cited_evidence_changed");
    }
    const added = [...nextEvidence.keys()].filter(id => !priorEvidence.has(id));
    const removed = [...priorEvidence.keys()].filter(id => !nextEvidence.has(id));
    const affected = new Set([...added, ...removed]);
    citedEvidenceScopeChange = { addedReceiptHashes: added, removedReceiptHashes: removed,
      frozenAuthorityFactsUnchanged: true, commonReceiptContentsUnchanged: true,
      affectedClaimPaths: [...new Set([...beforeSources, ...allSources]
        .filter(source => [...affected].some(id => source.text.includes(id)))
        .map(source => source.path))] };
  }
  let addedDerivedFactFields = [];
  if (review.verifiedFactsHash) {
    if (review.verifiedFactsHash !== factsHash) {
      const { citedTeachQueryEvidence: newlyBound = [], ...withoutTeach } = beforeFacts;
      if (newlyBound.length && factDependencyHash(withoutTeach) === review.verifiedFactsHash) {
        // A previously omitted citation is new evidence for its own claims,
        // not a reason to repurchase unrelated, unchanged reviewed claims.
        addedDerivedFactFields = ["citedTeachQueryEvidence"];
        const hashes = new Set(newlyBound.map(row => row.receiptHash));
        const affected = [...beforeSources, ...allSources].filter(source =>
          [...hashes].some(id => source.text.includes(id))).map(source => source.path);
        citedEvidenceScopeChange = { ...(citedEvidenceScopeChange || {}),
          affectedClaimPaths: [...new Set([
            ...(citedEvidenceScopeChange?.affectedClaimPaths || []), ...affected])],
          restoredPreviouslyOmittedTeachCitations: [...hashes] };
      } else {
      // Historical A had the same frozen scoring inputs before the actor table
      // was added. This is a derived view, not a new Rules source. Prove exact
      // equality of ALL prior fields; never broadly waive a digest mismatch.
      const { missionMarkerScoringByActor: actors, ...priorCatalogue } = beforeFacts;
      const arithmetic = beforeFacts.missionMarkerScoringArithmetic;
      if (actors?.status !== "source_bound_arithmetic_only"
        || arithmetic?.status !== "source_bound_arithmetic_only"
        || actors.receiptHash !== arithmetic.receiptHash
        || actors.sourceStateHash !== arithmetic.sourceStateHash
        || actors.missionScoringProfileHash !== arithmetic.missionScoringProfileHash
        || factDependencyHash(priorCatalogue) !== review.verifiedFactsHash) {
        fail("prior_facts_changed");
      }
      addedDerivedFactFields = ["missionMarkerScoringByActor"];
      }
    }
  } else {
    // Legacy full V3 reviews already retain exact dispatch contexts. Check
    // those cheap local contexts once; do not re-query Rules or the model.
    const count = Math.ceil(beforeSources.length / REVIEW_SHARD_CLAIM_LIMIT);
    const receipts = review.reviewerReceipt?.shards;
    if (review.shardCount !== count || receipts?.length !== count
      || review.adaptiveSubdivision?.failedContexts?.length) fail("legacy_coverage");
    for (let index = 0; index < count; index += 1) {
      const sources = beforeSources.slice(index * REVIEW_SHARD_CLAIM_LIMIT,
        (index + 1) * REVIEW_SHARD_CLAIM_LIMIT);
      const expected = hashStarcraftTmgContract({
        sessionId: `${review.sessionId}-shard-${index + 1}-of-${count}`,
        planHash: previous.planHash,
        reviewContextVersion: review.reviewContextVersion,
        sources, sourceFacts: beforeFacts,
        allSourcesHash: hashStarcraftTmgContract(beforeSources),
        shardIndex: index, shardCount: count,
      });
      if (receipts[index].receipt?.contextHash !== expected) fail("legacy_facts_changed");
    }
  }
  const before = new Map(beforeSources.map(source => [source.path, source.text]));
  if ((!coverageUpgrade && allSources.length !== beforeSources.length)
    || beforeSources.some(source => !allSources.some(after => after.path === source.path))) {
    fail("claim_identity");
  }
  const requestedAdditional = input.coverageUpgradeAdditionalClaimPaths || input.relatedRepairClaimPaths || [];
  if (!Array.isArray(requestedAdditional)
    || new Set(requestedAdditional).size !== requestedAdditional.length
    || (requestedAdditional.length > 0 && !coverageUpgrade && !input.relatedRepairClaimPaths)
    || requestedAdditional.some(path => !before.has(path))) fail("additional_claim_identity");
  // Exact changed-citation dependencies are computed above by the reviewer.
  // They do not require the caller to repeat the same derived list as an
  // explicit request; doing so falsely escalated safe incremental reviews.
  const additional = [...new Set([
    ...requestedAdditional,
    ...(citedEvidenceScopeChange?.affectedClaimPaths || []),
  ])];
  if (additional.some(path => !before.has(path))) fail("additional_claim_identity");
  const targets = allSources.filter(source => !before.has(source.path)
    || before.get(source.path) !== source.text || additional.includes(source.path));
  if (targets.length === 0) fail("no_changed_claims");
  const changed = new Set(targets.map(source => source.path));
  const retainedFindings = review.findings.filter(finding => !changed.has(finding.claimPath));
  const retainedAdjudications = (review.reviewAdjudication?.decisions || []).flatMap(decision => {
    const finding = review.findings[decision.findingIndex];
    if (changed.has(finding.claimPath)
      || decision.counterEvidence.some(e => changed.has(e.claimPath))) return [];
    const findingIndex = retainedFindings.findIndex(f => hashStarcraftTmgContract(f) === decision.findingHash);
    if (findingIndex < 0) return [];
    const retained = { ...structuredClone(decision), findingIndex };
    const reconciliation = review.reviewAdjudication.reconciliation;
    if (!retained.sourceProof
      && reconciliation?.policyVersion >= 11) {
      const judgment = reconciliation.judgments.find(j => j.findingIndex === decision.findingIndex);
      if (judgment?.sourceEvidence?.length) retained.sourceProof = {
        version: 1, claimText: before.get(finding.claimPath),
        sourceCatalogueHash: reconciliation.sourceCatalogueHash,
        premiseFacts: structuredClone(reconciliation.premiseFacts),
        judgment: structuredClone(judgment),
        inheritedFromReviewHash: review.reviewHash,
        unchangedDependencyFactsVerified: true, trainingTruth: false,
      };
    }
    return [retained];
  });
  return { targets,
    retainedFindings, retainedAdjudications,
    receipt: { version: "unchanged_dependencies_changed_claims_v1",
      previousPlanHash: previous.planHash, previousReviewHash: review.reviewHash,
       coverageUpgrade, previousReviewContextVersion: review.reviewContextVersion,
       explicitlyRecheckedClaimPaths: [...additional],
      changedClaimPaths: [...changed], newReviewedClaimCount: targets.length,
      reusedClaimCount: allSources.length - targets.length,
      reusedClaimPaths: allSources.filter(source => !changed.has(source.path))
        .map(source => source.path),
      dependencyFactsUnchanged: true, fullCrossClaimIndexProvided: true,
      addedDerivedFactFields,
      ...(citedEvidenceScopeChange ? { citedEvidenceScopeChange } : {}),
      priorPaidReviewPreserved: true, trainingTruth: false },
  };
}

function splitReviewSources(sources) {
  if (sources.length > 1) {
    const middle = Math.floor(sources.length / 2);
    return [sources.slice(0, middle), sources.slice(middle)];
  }
  const source = sources[0];
  const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" })
    .segment(source.text)];
  if (sentences.length < 2) return null;
  const cut = sentences[Math.floor(sentences.length / 2)].index;
  const start = source.sourceSpan?.start || 0;
  return [[{ ...source, text: source.text.slice(0, cut),
    sourceSpan: { start, end: start + cut } }],
  [{ ...source, text: source.text.slice(cut),
    sourceSpan: { start: start + cut, end: start + source.text.length } }]];
}

function completeReviewSpanCoverage(allSources, leaves) {
  const coverage = leaves.flatMap(leaf => leaf.sources.map(source => ({
    claimPath: source.path,
    start: source.sourceSpan?.start || 0,
    end: source.sourceSpan?.end ?? source.text.length,
    text: source.text,
  })));
  for (const original of allSources) {
    let cursor = 0;
    for (const span of coverage.filter(s => s.claimPath === original.path)
      .sort((a, b) => a.start - b.start)) {
      if (span.start !== cursor || span.end <= span.start
        || original.text.slice(span.start, span.end) !== span.text) {
        throw new Error("ROSTER_FINAL_PLAN_REVIEW_SUBDIVISION_COVERAGE_INVALID");
      }
      cursor = span.end;
    }
    if (cursor !== original.text.length) {
      throw new Error("ROSTER_FINAL_PLAN_REVIEW_SUBDIVISION_COVERAGE_INVALID");
    }
  }
  return coverage.map(({ text, ...span }) => span);
}

export async function reviewRosterFinalPlanV3(input = {}) {
  const allSources = reviewSources(input.plan, true, true);
  if (allSources.length === 0 || !String(input.sessionId || "").trim()) {
    throw new Error("ROSTER_FINAL_PLAN_REVIEW_INPUT_INVALID");
  }
  let incremental = null;
  let reviewScopeSelection = null;
  try {
    incremental = incrementalReviewScope(input, allSources);
  } catch (error) {
    // Product repair may add/change real schedule, scoring or other facts.
    // Choose full review before any dispatch instead of treating the invalid
    // incremental optimization as an unrecoverable production failure. Strict
    // incremental consumers remain strict; missing baselines/no-op revisions
    // still fail and do not authorize another paid full review.
    if (input.allowFullReviewOnDependencyChange !== true
      || error?.code !== "ROSTER_INCREMENTAL_REVIEW_DEPENDENCY_CHANGED"
      || ["baseline_missing", "no_changed_claims"].includes(error.detail)) throw error;
    reviewScopeSelection = {
      version: "changed_dependencies_full_review_v1",
      requestedScope: "changed_claims", effectiveScope: "full",
      reason: error.detail,
      previousPlanHash: input.incrementalFrom.plan.planHash,
      previousReviewHash: input.incrementalFrom.review.reviewHash,
      priorFindingsReused: false, selectionBeforeProviderDispatch: true,
      trainingTruth: false,
    };
  }
  const targetSources = incremental?.targets || allSources;
  const shards = [];
  for (let offset = 0; offset < targetSources.length;
    offset += REVIEW_SHARD_CLAIM_LIMIT) {
    shards.push(targetSources.slice(offset,
      offset + REVIEW_SHARD_CLAIM_LIMIT));
  }
  const parts = [];
  const leaves = [];
  const failedContexts = [];
  const adaptive = input.adaptiveReview === true;
  const evaluate = async (sources, index, branch = "") => {
    const sessionId = `${input.sessionId}-shard-${index + 1}-of-${shards.length}`
      + (branch ? `-split-${branch}` : "");
    try {
      const part = await reviewRosterFinalPlan({ ...input, sessionId }, true,
        { shard: { index, count: shards.length, sources, allSources,
          adaptive, branch } });
      parts.push(part);
      leaves.push({ sources, contextHash: part.contextHash });
    } catch (error) {
      const subdivisions = adaptive
        && error?.code === "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE"
        && error.providerIncompleteReason === "max_output_tokens"
        ? splitReviewSources(sources) : null;
      if (!subdivisions) throw error;
      const record = { contextHash: error.reviewContextHash,
        reason: "max_output_tokens", claimPaths: sources.map(source => source.path),
        branch, subdivisionCount: subdivisions.length };
      failedContexts.push(record);
      await input.onShardProgress?.({ type: "review_shard_subdivided", ...record });
      // These are NEW smaller targets, not retries of the parent request. The
      // caller's cancellation/call budget/egress authority still governs sends.
      await evaluate(subdivisions[0], index, branch + "L");
      await evaluate(subdivisions[1], index, branch + "R");
    }
  };
  for (let index = 0; index < shards.length; index += 1) {
    await evaluate(shards[index], index);
  }
  const body = {
    schema: "starcraft_tmg_roster_final_plan_review_v3",
    sessionId: input.sessionId, planHash: input.plan.planHash,
    contextHash: hashStarcraftTmgContract({
      version: ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3,
      sessionId: input.sessionId, planHash: input.plan.planHash,
      sources: allSources,
      shardReviewHashes: parts.map((part) => part.reviewHash),
      ...(incremental ? { incrementalReview: incremental.receipt } : {}),
    }),
    reviewerReceipt: { shards: parts.map((part) => ({
      reviewHash: part.reviewHash, receipt: part.reviewerReceipt,
    })) },
    findings: [...(incremental?.retainedFindings || []),
      ...parts.flatMap((part) => part.findings)],
    discardedUncitedFindings: parts.reduce((sum, part) =>
      sum + part.discardedUncitedFindings, 0),
    evidenceAuditVersion: ROSTER_PLAN_SOURCE_AUDIT_VERSION,
    reviewContextVersion: ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3,
    sourceAudit: parts[0].sourceAudit,
    verifiedFactsHash: factDependencyHash(buildRosterFinalPlanVerifiedFactsV1(input)
      .sourceFacts),
    publicSummary: parts.map((part) => part.publicSummary).join("\n"),
    reviewedClaimCount: allSources.length, shardCount: parts.length,
    reviewedClaimPaths: allSources.map((source) => source.path),
    ...(adaptive ? { adaptiveSubdivision: {
      version: "exact_claim_spans_capacity_only_v1", rootShardCount: shards.length,
      failedContexts, coverage: completeReviewSpanCoverage(targetSources, leaves),
    } } : {}),
    ...(incremental ? { incrementalReview: incremental.receipt } : {}),
    ...(reviewScopeSelection ? { reviewScopeSelection } : {}),
    capacityOverflowAccepted: parts.reduce((sum, part) =>
      sum + part.capacityOverflowAccepted, 0),
    reviewIsAdvisory: true, planMutation: false, trainingTruth: false,
  };
  const review = Object.freeze({ ...body, reviewHash: hashStarcraftTmgContract(body) });
  return incremental?.retainedAdjudications?.length
    ? createRosterFinalPlanReviewAdjudicationV1({ plan: input.plan, review,
      decisions: incremental.retainedAdjudications }) : review;
}

async function reviewRosterFinalPlan({ plan, deliberation,
  sessionId, toolReceipts = [], selectedCandidateInputHash = null,
  selectionUnitRules = [], selectionJustificationPolicyVersion = null,
  selectionSupportRules = [],
  incompleteShardContextHashes = [], armyAudit = null, teachState = null } = {},
comprehensive = false, options = {}) {
  if (plan?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    verifyPlannedPresetRosterPlanV2(plan);
  } else if (plan?.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
    verifyAgentScheduledRosterPlanV1(plan);
  } else {
    verifyRosterPlanV1(plan);
  }
  if (plan.planStatus === "no_pregame_plan"
    || typeof deliberation?.deliberate !== "function"
    || !String(sessionId || "").trim()) {
    throw new Error("ROSTER_FINAL_PLAN_REVIEW_INPUT_INVALID");
  }
  const shard = options.shard || null;
  const sources = shard?.sources || reviewSources(plan, comprehensive);
  const activeContract = shard ? contractShard
    : comprehensive ? contractV2 : contract;
  const activeProviderSchema = shard ? providerSchemaShard
    : comprehensive ? providerSchemaV2 : providerSchema;
  const activeContextVersion = shard
    ? ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3 : comprehensive
    ? ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V2
    : ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION;
  const activeSchema = shard ? ROSTER_FINAL_PLAN_REVIEW_SHARD_SCHEMA_V1
    : comprehensive
    ? ROSTER_FINAL_PLAN_REVIEW_SCHEMA_V2
    : ROSTER_FINAL_PLAN_REVIEW_SCHEMA;
  const { sourceFacts, sourceAudit, arithmetic, sourceCatalogueHash } = buildRosterReviewFactPacketV1({
    plan, toolReceipts, selectedCandidateInputHash, selectionUnitRules, selectionSupportRules,
    selectionJustificationPolicyVersion, armyAudit, teachState,
  });
  // Keep predicate/value scope visible before the large cross-claim catalogue.
  // Actual review321 ignored a supply-context contradiction while repeatedly
  // reporting already-disclaimed geometry. This supplies no tactical verdict.
  const factScopeAudit = sourceFactScopeAudit(sourceFacts);
  const contextHash = hashStarcraftTmgContract({
    sessionId, planHash: plan.planHash,
    reviewContextVersion: activeContextVersion,
    sources, sourceFacts, sharedFactPacketVersion: 1, sourceCatalogueHash,
    factScopeAuditHash:hashStarcraftTmgContract(factScopeAudit),
    ...(shard ? { allSourcesHash: hashStarcraftTmgContract(
      shard.allSources), shardIndex: shard.index,
      shardCount: shard.count } : {}),
  });
  if (shard?.adaptive && incompleteShardContextHashes.includes(contextHash)) {
    throw Object.assign(new Error("ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE"), {
      code: "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE",
      providerIncompleteReason: "max_output_tokens", reviewContextHash: contextHash,
    });
  }
  let result;
  try {
    result = await deliberateRosterReviewOutputV1(deliberation, {
    sessionId, roundIndex: shard ? shard.index + 1 : 1,
    roundKind: "final_plan_review",
    promptPack: shard ? "ticket27.roster_final_plan_review.sharded.v1"
      : comprehensive
      ? "ticket27.roster_final_plan_review.v3"
      : ROSTER_FINAL_PLAN_REVIEW_PROMPT_PACK,
    promptNodes: [
      factScopeAudit,
      { kind: "frozen-plan-claims", sources },
      ...(shard ? [{ kind: "frozen-plan-cross-claim-index",
        sources: shard.allSources }] : []),
      { kind: "verified-structured-facts", sourceFacts, arithmetic, sourceCatalogueHash,
        sameFactsAsQualificationAndCorrection: true },
      { kind: "review-boundary", planImmutable: true,
        rulesRemainSoleLegalityAuthority: true, reviewIsAdvisory: true,
        publicEvidenceOnly: true,
        ...(shard ? { targetClaimPaths: sources.map((source) => source.path),
          shardIndex: shard.index + 1, shardCount: shard.count } : {}) },
    ],
    userMessage: "Act as a source-fact contradiction auditor after roster "
      + "selection and plan deepening. Follow source-fact-scope-audit first; this is not a style or risk-aversion review. "
      + (shard
        ? "Review EVERY claim in frozen-plan-claims against the full "
          + "cross-claim index and verified facts. Report findings ONLY "
          + "for those target claims, not for reference-only claims. "
          + "List all high and material medium contradictions; omit "
          + "stylistic low findings. Return every target path once in "
          + "reviewedClaimPaths. If 24 findings cannot cover all material "
          + "issues, set hasUnreportedMaterialFindings=true. "
          + "For each High, identify the exact proposition asserted by "
          + "claimQuote and the specific verified fact or exact other "
          + "claim that contradicts it. High requires a materially false "
          + "rule, timing, unit, scoring or legality assertion, or an "
          + "unsupported hard guarantee essential to the proposed win "
          + "route. An omitted risk, unmentioned alternative, conditional "
          + "intent, or missing caution is at most Medium; do not turn "
          + "'can' into guaranteed survival or 'only two large biological "
          + "bodies' into 'only two bodies or healers'. Judge the literal "
          + "quoted proposition before asking for extra explanation. "
          + "For selection arguments, check that each declined alternative "
          + "has a causal mission/map/opponent trade-off and an observation "
          + "that would reverse the preference. Being currently selected, "
          + "temporarily frozen or already spending the budget is not that "
          + "trade-off. Report circular or missing comparisons as Medium; "
          + "report materially false costs, eligibility or Supply as High "
          + "only when contradicted by the delivered Rules facts. Use "
          + "composition costs and upgrade costS/costL, distinguishing a "
          + "base body from the full loadout. Do not impose a preferred strategy. "
          + (shard.adaptive
            ? "Keep each finding focused: shortest faithful claim quote, "
              + "contradicting fact and one correction question. Do not "
              + "repeat the plan or produce a running narrative. Targets "
              + "with sourceSpan are exact contiguous excerpts; audit only "
              + "those excerpts, using the complete cross-claim index for "
              + "their context. Do not truncate findings to fit. " : "")
        : comprehensive
        ? "Review every supplied global and component claim, including "
          + "units, compositions, upgrades and cards. Report ALL high "
          + "contradictions first, then material medium findings; omit "
          + "low-value stylistic findings. Do not stop after six findings. "
        : "Report at most six material contradictions or unsupported "
          + "operational assumptions, most important first. ")
      + "Scan ALL claim sources for every 'before round N' "
      + "or early-casualty contingency: compare N with each named unit's "
      + "verified firstArrivalRound. A unit still in Reserves cannot be "
      + "lost on-table, react, heal, contest, attack or screen. Also check "
      + "whether each claimed scoring-round route names an available unit. "
      + "firstArrivalRound is the MODEL-CHOSEN schedule, not the Rules-earliest "
      + "legal arrival. A fixed army does not make that schedule uniquely required. "
      + "Check every independent assertion within each target field: a correct "
      + "fact list or another correct sentence does not excuse a contradictory "
      + "sentence in the same field. In particular keep scoring actor, marker "
      + "affinity and control transfer distinct. A source-attached argument is "
      + "still model prose and is not automatically validated by its citations. "
      + "For each cited arithmetic receipt, distinguish inputRows from "
      + "projectedRows. A projected score is not an observed score. "
      + "A missing zero-value pre-scoring round does not make otherwise "
      + "matching scored-round input rows stale. Compare each row with "
      + "the CURRENT target schedule before judging a citation. "
      + "Distinguish printed startingSupply from effective poolSupply; "
      + "an explicit ability discount can make them differ. "
      + "Use the certified missionMarkers coordinates when judging a "
      + "coordinate claim, never infer their absence from route lengths. "
      + "Do not flag a correct timing statement, a clearly conditional "
      + "target position, or geometry already labeled unverified merely "
      + "to ask for clarification. When selectedMapRouteEvidence is "
      + "certified, compare each named unit and marker with its base-size "
      + "reachability and firstArrivalRound. The half-inch route length "
      + "is approximate: it does not prove an exact move, deployment, "
      + "coherent formation, arrival that round, or marker scoring. "
       + "Entry-edge route length is not a weapon-to-target distance: never "
       + "compare those different geometries as a range contradiction. "
      + "When evidence is unknown, do not infer a path. Quote an exact "
      + "substring from one named "
      + "claim source for each finding and ask one public correction "
      + "question. Do not edit the plan, choose units, invent Rules or "
      + "emit hidden reasoning. Zero findings is allowed."
      + (sourceFacts.selectionUnitRules ? " Selection arguments are public model "
        + "claims, not verified facts merely because they cite a source. Check "
        + "each claimed ability against selectionUnitRules: owner, phase, eligible "
        + "recipient tags, range, resource cost and conditions. Compare purchased "
        + "upgrade requirements with selectionRosterUnits, not just the catalogue. Check the named "
        + "partner actually exists and arrives in time. Distinguish a conditional "
        + "comparison preference from proven superiority; an arithmetic receipt "
        + "does not prove the inputs or premises. Interpret own/enemy marker VP "
        + "from each scoring actor's perspective. Require evidence for factual "
        + "claims, not risk avoidance or agreement with a particular strategy."
        : ""),
    responseContract: { allowedChannels: ["roster_strategy"],
      publicEvidenceOnly: true, rulesRemainSoleLegalityAuthority: true },
    responseFormat: { kind: "provider_strict_json_schema",
      schemaName: activeContract.schemaName,
      outputContractRef: outputContractRefStarcraftTmgV1(activeContract),
      schema: structuredClone(activeContract.providerSchema) },
    contextHash,
    });
  } catch (error) {
    if (error?.code === "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE") {
      error.reviewContextHash = contextHash;
    }
    throw error;
  }
  const output = result?.output;
  const validationSchema = shard
    && Array.isArray(output?.findings)
    && output.findings.length
      > activeProviderSchema.properties.findings.maxItems
    ? { ...activeProviderSchema,
      properties: { ...activeProviderSchema.properties,
        findings: { ...activeProviderSchema.properties.findings,
          maxItems: output.findings.length } } }
    : activeProviderSchema;
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(
    validationSchema, output).ok) {
    throw new Error("ROSTER_FINAL_PLAN_REVIEW_OUTPUT_INVALID");
  }
  const capacityOverflowAccepted = shard ? Math.max(0,
    output.findings.length - activeProviderSchema.properties.findings.maxItems)
    : 0;
  if (shard && (output.hasUnreportedMaterialFindings
    || output.reviewedClaimPaths.length !== sources.length
    || new Set(output.reviewedClaimPaths).size !== sources.length
    || output.reviewedClaimPaths.some((path) =>
      !sources.some((source) => source.path === path)))) {
    throw new Error("ROSTER_FINAL_PLAN_REVIEW_SHARD_COVERAGE_INCOMPLETE");
  }
  const byPath = new Map(sources.map((source) => [source.path, source.text]));
  const cited = [];
  let discardedUncitedFindings = 0;
  for (const finding of output.findings) {
    if (!byPath.get(finding.claimPath)?.includes(finding.claimQuote)) {
      discardedUncitedFindings += 1;
      continue;
    }
    cited.push(structuredClone(finding));
  }
  for (const receiptHash of shard && (shard.index !== 0
    || shard.branch?.includes("R")) ? []
    : sourceAudit.misappliedCitationHashes) {
    cited.push({ claimPath: "scoreRoute.routeText",
      claimQuote: receiptHash,
      category: "unsupported_claim", severity: "high",
      publicReason: "This cited arithmetic receipt was calculated for "
        + "different VP targets and cannot validate the current target "
        + "schedule. Arithmetic never proves marker control.",
      correctionQuestion: "Remove the stale validation claim or obtain "
        + "a new receipt for the current target schedule." });
  }
  const body = { schema: activeSchema,
    sessionId, planHash: plan.planHash, contextHash,
    reviewerReceipt: structuredClone(result.receipt ?? null),
    findings: cited, discardedUncitedFindings,
    evidenceAuditVersion: ROSTER_PLAN_SOURCE_AUDIT_VERSION,
    reviewContextVersion: activeContextVersion,
    sourceAudit,
    publicSummary: output.publicSummary,
    ...(shard ? { capacityOverflowAccepted } : {}),
    reviewIsAdvisory: true, planMutation: false, trainingTruth: false };
  return Object.freeze({ ...body,
    reviewHash: hashStarcraftTmgContract(body) });
}
