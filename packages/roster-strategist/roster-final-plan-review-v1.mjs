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
import { auditRosterPlanVpReceiptsV1,
  ROSTER_PLAN_SOURCE_AUDIT_VERSION } from
  "./roster-plan-source-audit-v1.mjs";
import {
  PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  verifyPlannedPresetRosterPlanV2,
} from "./planned-preset-roster-plan-v2.mjs";

export const ROSTER_FINAL_PLAN_REVIEW_SCHEMA =
  "starcraft_tmg_roster_final_plan_review_v1";
export const ROSTER_FINAL_PLAN_REVIEW_PROMPT_PACK =
  "ticket27.roster_final_plan_review.v2";

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

function reviewSources(plan) {
  const values = {
    "scoreRoute.routeText": plan.scoreRoute?.routeText,
    "scoreRoute.fallbackRouteText": plan.scoreRoute?.fallbackRouteText,
    "publicSummaryText": plan.publicSummaryText,
  };
  for (const key of ["deploymentConceptText", "reinforcementPolicyText",
    "threatTradeText", "objectiveControlText"]) {
    values[`deploymentConcept.${key}`] = plan.deploymentConcept?.[key];
  }
  for (const purpose of plan.componentPurposes || []) {
    if (purpose.componentKind === "unit") {
      values[`componentPurposes.${purpose.instanceId}`] =
        purpose.publicPurposeText;
    }
  }
  return Object.entries(values).filter(([, value]) => (
    typeof value === "string" && value.trim())).map(([path, text]) => ({
    path, text,
  }));
}

export async function reviewRosterFinalPlanV1({ plan, deliberation,
  sessionId, toolReceipts = [] } = {}) {
  if (plan?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    verifyPlannedPresetRosterPlanV2(plan);
  } else {
    verifyRosterPlanV1(plan);
  }
  if (plan.planStatus === "no_pregame_plan"
    || typeof deliberation?.deliberate !== "function"
    || !String(sessionId || "").trim()) {
    throw new Error("ROSTER_FINAL_PLAN_REVIEW_INPUT_INVALID");
  }
  const sources = reviewSources(plan);
  const schedule = plan.openingDeploymentSchedule || null;
  const sourceAudit = auditRosterPlanVpReceiptsV1({ plan, toolReceipts });
  const sourceFacts = {
    planHash: plan.planHash,
    candidateHash: plan.rosterCandidate.candidateHash,
    rosterUnits: plan.rosterCandidate.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
      firstArrivalRound: schedule?.entries.find((entry) => (
        entry.unitInstanceId === unit.unitInstanceId))?.round ?? null,
    })),
    roundSupplySchedule: schedule ? {
      scheduleHash: schedule.scheduleHash,
      rounds: schedule.rounds,
      placementAndPathVerified: schedule.placementAndPathVerified,
    } : null,
    targetVpSchedule: plan.scoreRoute?.targetVpSchedule ?? null,
    citedMathReceipts: sourceAudit.citedMathReceipts,
    staleMathCitationHashes: sourceAudit.staleCitationHashes,
    misappliedMathCitationHashes: sourceAudit.misappliedCitationHashes,
    sourceScoringIsNotProofOfMarkerControl: true,
    noDeploymentPositionOrPathProof: true,
  };
  const contextHash = hashStarcraftTmgContract({
    sessionId, planHash: plan.planHash, sources, sourceFacts,
  });
  const result = await deliberation.deliberate({
    sessionId, roundIndex: 1, roundKind: "final_plan_review",
    promptPack: ROSTER_FINAL_PLAN_REVIEW_PROMPT_PACK,
    promptNodes: [
      { kind: "frozen-plan-claims", sources },
      { kind: "verified-structured-facts", sourceFacts },
      { kind: "review-boundary", planImmutable: true,
        rulesRemainSoleLegalityAuthority: true, reviewIsAdvisory: true,
        publicEvidenceOnly: true },
    ],
    userMessage: "Act as an independent Teach challenger after roster "
      + "selection and plan deepening. Report at most six material "
      + "contradictions or unsupported operational assumptions, most "
      + "important first. Scan ALL claim sources for every 'before round N' "
      + "or early-casualty contingency: compare N with each named unit's "
      + "verified firstArrivalRound. A unit still in Reserves cannot be "
      + "lost on-table, react, heal, contest, attack or screen. Also check "
      + "whether each claimed scoring-round route names an available unit. "
      + "For each cited arithmetic receipt, compare its original VP rows "
      + "with the CURRENT target VP schedule. A stale receipt cannot "
      + "validate a revised schedule, even if its old deltas were zero. "
      + "Do not flag a correct timing statement, a clearly conditional "
      + "target position, or geometry already labeled unverified merely "
      + "to ask for clarification. Quote an exact substring from one named "
      + "claim source for each finding and ask one public correction "
      + "question. Do not edit the plan, choose units, invent Rules or "
      + "emit hidden reasoning. Zero findings is allowed.",
    responseContract: { allowedChannels: ["roster_strategy"],
      publicEvidenceOnly: true, rulesRemainSoleLegalityAuthority: true },
    responseFormat: { kind: "provider_strict_json_schema",
      schemaName: contract.schemaName,
      outputContractRef: outputContractRefStarcraftTmgV1(contract),
      schema: structuredClone(contract.providerSchema) },
    maxOutputUnits: 8192,
    contextHash,
  });
  const output = result?.output;
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(
    providerSchema, output).ok) {
    throw new Error("ROSTER_FINAL_PLAN_REVIEW_OUTPUT_INVALID");
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
  for (const receiptHash of sourceAudit.misappliedCitationHashes) {
    cited.push({ claimPath: "scoreRoute.routeText",
      claimQuote: receiptHash,
      category: "unsupported_claim", severity: "high",
      publicReason: "This cited arithmetic receipt was calculated for "
        + "different VP targets and cannot validate the current target "
        + "schedule. Arithmetic never proves marker control.",
      correctionQuestion: "Remove the stale validation claim or obtain "
        + "a new receipt for the current target schedule." });
  }
  const body = { schema: ROSTER_FINAL_PLAN_REVIEW_SCHEMA,
    sessionId, planHash: plan.planHash, contextHash,
    reviewerReceipt: structuredClone(result.receipt ?? null),
    findings: cited, discardedUncitedFindings,
    evidenceAuditVersion: ROSTER_PLAN_SOURCE_AUDIT_VERSION,
    sourceAudit,
    publicSummary: output.publicSummary,
    reviewIsAdvisory: true, planMutation: false, trainingTruth: false };
  return Object.freeze({ ...body,
    reviewHash: hashStarcraftTmgContract(body) });
}
