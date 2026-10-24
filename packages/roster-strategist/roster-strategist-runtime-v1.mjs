import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectIterativeRosterEvidenceV1 } from './iterative-roster-tool-port-v1.mjs';
import { buildArrivalScheduleEvidenceNodesV1 } from
  "./arrival-schedule-evidence-v1.mjs";
import { STARCRAFT_TMG_TACTICAL_RELATIONSHIP_INTENTS_V1 } from
  "../online-agent-session/tactical-relationship-graph-v1.mjs";
import {
  ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,
  ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  verifyOfficialArmyBuilderQueryPortDescriptorV1,
} from "./army-builder-query-port-v1.mjs";
import {
  verifyPregameSceneLaboratoryDescriptorV1,
} from "./pregame-scene-laboratory-v1.mjs";
import {
  normalizeRosterStrategistPublicOutputV1,
  ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1,
  ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
} from "./public-output-normalization-v1.mjs";
import { projectPregameMapRouteRequestV1 } from
  "./pregame-map-evidence-port-v1.mjs";
import { pruneRosterUndeclaredPublicFieldsV1 } from
  "./public-output-pruning-v1.mjs";
import { deduplicateIdenticalRosterProposalsV1 } from
  "./roster-proposal-deduplication-v1.mjs";
import { recoverRosterComparisonSelectionFromQuotedEvidenceV1 } from
  "./roster-comparison-selection-repair-v1.mjs";
import { normalizeRosterComponentPurposeParentAliasV1 } from
  "./roster-component-purpose-parent-alias-v1.mjs";
import { liftSchemaUniqueTopLevelFieldsV1 } from
  "./roster-repair-output-shape-v1.mjs";
import { auditRosterPlanVpReceiptsV1 } from
  "./roster-plan-source-audit-v1.mjs";
import { buildRosterFinalPlanVerifiedFactsV1, buildRosterReviewFactPacketV1,
  effectiveRosterFinalPlanReviewFindingsV1 } from
  "./roster-final-plan-review-v1.mjs";
import { projectMissionMarkerScoringArithmeticV1, projectMissionMarkerScoringByActorV1 } from
  "./mission-marker-scoring-arithmetic-v1.mjs";
import {
  NARRATIVE_DISPLAY_TARGETS,
  NARRATIVE_TRANSPORT_CEILING,
  ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1,
  rosterStrategistRoundOutputContractRefV1,
  rosterStrategistRoundOutputContractV1,
  rosterInformationNeedCountWarningV1,
  verifyRosterStrategistOutputContractSetV1,
} from "./roster-strategist-output-schemas-v1.mjs";
import {
  createOpponentArchetypeHypothesisV1,
  createRosterCandidateComparisonV1,
  createRosterCandidateV1,
  createRosterComponentPurposeV1,
  createRosterCounterResponseV1,
  createRosterDeploymentConceptV1,
  createRosterInvalidationTriggerV1,
  createRosterLossResourceBudgetV1,
  createRosterPlanBudgetAcceptanceV1,
  createRosterPlanProvenanceV1,
  createRosterPlanRevisionEventV1,
  createRosterPlanV1,
  createRosterScoreRouteV1,
  createRosterToolReceiptReferenceV1,
  ROSTER_FORMAL_BUDGET_CONTRACT_V1,
  verifyRosterComponentPurposesV1,
  verifyRosterPlanRoundTripV1,
} from "./roster-plan-contracts-v1.mjs";
import { runRosterTeachCycleV1 } from "./roster-teach-cycle-v1.mjs";
import { createRosterTeachEvidencePortV1,
  projectRosterTeachEvidenceReferencesV1 } from
  "./roster-teach-evidence-port-v1.mjs";
import { createRosterRevisionTeachEvidenceV1 } from
  "./roster-revision-teach-evidence-v1.mjs";
import { createRosterPlanEditToolsV1, projectStagedRosterPlanArgumentsV1, STRUCTURED_PLAN_TOOLS_PROTOCOL_V1, STRUCTURED_PLAN_TOOLS_PROTOCOL_V2, STRUCTURED_PLAN_TOOLS_PROTOCOL_V3 } from
  "./roster-plan-edit-tools-v1.mjs";
import { rosterInterruptedEditDraftV1 } from './roster-plan-edit-recovery-v1.mjs';
import {
  PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  createPlannedPresetRoundSupplyScheduleV1,
  verifyPlannedPresetRoundSupplyScheduleV1,
  createPlannedPresetRosterPlanV2,
  verifyPlannedPresetRosterPlanRoundTripV2,
} from "./planned-preset-roster-plan-v2.mjs";
import {
  AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
  createAgentScheduledRosterPlanV1,
  verifyAgentScheduledRosterPlanV1,
  verifyAgentScheduledRosterPlanRoundTripV1,
} from "./agent-scheduled-roster-plan-v1.mjs";
import {
  AGENT_ARRIVAL_SCHEDULE_ROUND_KIND,
  AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_REF_V1,
  AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1,
} from "./agent-arrival-schedule-output-v1.mjs";
import {
  AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_REF_V1,
  AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_V1,
} from "./agent-scheduled-plan-repair-output-v1.mjs";
import {
  AGENT_SCHEDULED_CLAIM_REPAIR_PATHS_V1,
  AGENT_SCHEDULED_LEGACY_CLAIM_REPAIR_PATHS_V1,
  AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_REF_V1,
  AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_V1,
  createAgentScheduledClaimRepairOutputContractV2,
  createAgentScheduledClaimRepairOutputContractV3,
  createAgentScheduledClaimRepairOutputContractV4,
} from "./agent-scheduled-claim-repair-output-v1.mjs";
import {
  PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_REF_V1,
  PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1,
  PLANNED_PRESET_DEEPENING_ROUND_KIND,
} from "./planned-preset-deepening-output-v1.mjs";
import {
  ROSTER_SELECTION_JUSTIFICATION_POLICY_V1,
  ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1,
  ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_V1,
  ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_REF_V1,
  validateRosterSelectionJustificationV1,
  projectRosterSelectionArgumentsV1,
  rosterSelectionPromptEvidenceV1,
} from "./roster-selection-justification-v1.mjs";
import {
  PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_REF_V1,
  PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1,
  PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_REF_V1,
  PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1,
} from "./planned-preset-revision-output-v1.mjs";
import { verifyVerifiedPresetRosterLockV1 } from
  "./verified-preset-roster-lock-v1.mjs";
import { evaluatePregameMapReadinessV1 } from
  "./pregame-map-evidence-port-v1.mjs";
import { queryRosterBudgetBranchesV1 } from
  "./roster-budget-branch-query-v1.mjs";
import { rosterPublicClaimTextEntriesV1, rosterPublicClaimSectionV1,
  rosterPublicClaimReplacementSectionsV1, rosterRelatedRepairClaimPathsV1 } from "./roster-public-claim-paths-v1.mjs";

export const ROSTER_STRATEGIST_RUNTIME_MODULE =
  "packages/roster-strategist/roster-strategist-runtime-v1.mjs";
export const ROSTER_STRATEGIST_RUNTIME_VERSION = "1.4.1";
export const ROSTER_STRATEGIST_DELIBERATION_SCHEMA =
  "starcraft_tmg_roster_strategist_deliberation_v1";
export const ROSTER_STRATEGIST_DESCRIPTOR_SCHEMA =
  "starcraft_tmg_roster_strategist_descriptor_v1";
export const ROSTER_STRATEGIST_SKILL_ROUTE_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_skill_route_receipt_v1";
export const ROSTER_STRATEGIST_ROUND_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_round_receipt_v1";
export const ROSTER_STRATEGIST_INFORMATION_NEED_SCHEMA =
  "starcraft_tmg_roster_strategist_information_need_v1";
export const ROSTER_STRATEGIST_SESSION_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_session_receipt_v1";
export const ROSTER_STRATEGIST_PRESET_SESSION_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_preset_session_receipt_v1";
export const ROSTER_STRATEGIST_PRESET_PROMPT_PACK_V1 =
  "ticket27.roster_strategist.planned_preset.v1";
export const ROSTER_STRATEGIST_AGENT_SELECTED_LOCKED_PROMPT_PACK_V1 =
  "ticket27.roster_strategist.agent_selected_locked_teach.v1";
export const ROSTER_STRATEGIST_PROMPT_PACK_V1 =
  "ticket27.roster_strategist.multi_round.v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
// Menu-derived near-cap threshold, shared by the runtime and the planning
// workspace (Slice 272: the UI displays the same Rules-derived threshold).
// Reads any object with a `units` array of menu entries (the runtime's
// projected menu or the Builder enumeration's unitCandidates); never
// hard-coded per faction.
export function deriveNearCapThresholdMineralsV1(menuValue) {
  const costs = [];
  const push = (value) => {
    const numeric = Number(value);
    if (Number.isSafeInteger(numeric) && numeric > 0) costs.push(numeric);
  };
  for (const unit of menuValue?.units || []) {
    for (const option of unit.compositionOptions || []) {
      push(option.mineralCost);
    }
    for (const upgrade of unit.purchasableUpgrades || []) {
      const byComposition = upgrade.mineralCostByComposition;
      if (Array.isArray(byComposition)) {
        for (const entry of byComposition) push(entry?.mineralCost ?? entry);
      } else if (byComposition && typeof byComposition === "object") {
        for (const value of Object.values(byComposition)) push(value);
      }
    }
  }
  // With no positive purchasable increment only an exact-budget roster is
  // near-cap; a real menu always yields its cheapest composition/upgrade.
  return costs.length ? Math.min(...costs) : 1;
}
const ROUND_KINDS = new Set([
  "strategy_foundation", "candidate_proposals", "comparison_selection",
  "arrival_schedule", "revision",
]);
const NEED_KINDS = new Set([
  "probability", "spatial", "map_route", "math", "threat_exchange",
  "scenario",
]);
const ROUTE_KINDS = new Set([
  "mission_marker_control", "attrition", "hybrid", "unknown",
]);
const CONFIDENCE_LEVELS = new Set(["unknown", "low", "medium", "high"]);
const SCHEDULE_STATUSES = new Set(["declared", "unknown"]);
const COMPONENT_KINDS = new Set([
  "faction_card", "tactical_card", "unit", "composition", "upgrade",
]);
const SCORING_ROLES = new Set([
  "primary_scorer", "support", "counter", "flex", "unknown",
]);
const TRIGGER_OBSERVATION_KINDS = new Set([
  "vp_deficit", "opponent_composition", "battlefield_event", "loss_budget",
  "unknown",
]);
const MAX_TEXT_LENGTH = 2_000;
const SPATIAL_INTENTS = new Set(
  STARCRAFT_TMG_TACTICAL_RELATIONSHIP_INTENTS_V1);
const MAX_LIST = 32;
const MAX_PROPOSAL_ROUNDS = 12;
const MAX_SKILL_PROJECTION_BYTES = 24 * 1024;
const FORBIDDEN_OUTPUT_KEYS = new Set([
  "hidden", "chainofthought", "cot", "scratchpad", "reasoning",
  "reasoningtrace", "internalmonologue", "privatereasoning", "thinking",
  "internalnotes",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  if (text.length > MAX_TEXT_LENGTH) fail(code, "text_too_long");
  return text;
}
function hash64(value, code) {
  const text = String(value || "");
  if (!HASH_PATTERN.test(text)) fail(code);
  return text;
}
function hashedReceipt(body, hashField = "receiptHash") {
  return freezeDeep({ ...body, [hashField]: hashStarcraftTmgContract(body) });
}
function exactKeys(value, expected, code) {
  const observed = Object.keys(value || {}).sort();
  const wanted = [...expected].sort();
  if (observed.length !== wanted.length
    || observed.some((key, index) => key !== wanted[index])) {
    fail(code, observed.join(","));
  }
}
function textList(value, code, { allowEmpty = true, max = MAX_LIST } = {}) {
  if (!Array.isArray(value) || value.length > max) fail(code);
  if (!allowEmpty && value.length === 0) fail(code);
  return value.map((entry) => nonEmpty(entry, code));
}

function rejectForbiddenKeys(value, path = "output") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  if (!object(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[-_]/gu, "");
    if (FORBIDDEN_OUTPUT_KEYS.has(normalized)) {
      fail("ROSTER_STRATEGIST_HIDDEN_COT_REJECTED", `${path}.${key}`);
    }
    rejectForbiddenKeys(child, `${path}.${key}`);
  }
}

function sealNode(nodeType, authority, content) {
  // A prompt is an immutable value snapshot, not ownership of the live
  // session/evidence collections. Freezing an alias prevents later tool
  // results from being appended during this same multi-turn operation.
  const body = { nodeType, authority, content: clone(content) };
  return freezeDeep({ ...body, nodeHash: hashStarcraftTmgContract(body) });
}

function currentArrivalScheduleNode(plan) {
  return sealNode('current-arrival-schedule','model_chosen_rules_checked_proposal',{
    schedule:clone(plan.openingDeploymentSchedule),
    scheduleCanBeReplanned:true,
    scheduleMutationInThisTool:false,
    replanOwner:'iterative_roster_journey',
    instruction:'This is the current model-chosen schedule, not Rules-earliest arrival or an immutable game rule. This argument editor preserves its structural fields for this atomic edit only. The ordinary selecting/replanning journey can reopen the Plan and choose a different schedule through the existing Rules-audited arrival tool. A fixed army does not fix its schedule. Do not justify a strategic gap by saying the frozen schedule forbids improvement. Identify any necessary timing alternative honestly; current schedule feasibility alone proves neither placement, movement nor control.',
  });
}

// ------------------------------------------------------------ skill route

function skillGuidanceProjection(skill) {
  const projection = {
    skillId: skill.skillId,
    version: skill.version,
    skillHash: skill.hash,
    status: skill.status,
    canAffectRules: skill.canAffectRules === true,
    guidance: [],
  };
  const procedures = Array.isArray(skill.procedure) ? skill.procedure : [];
  for (const entry of procedures) {
    if (typeof entry === "string") {
      projection.guidance.push({ kind: "procedure_note", text: entry });
      continue;
    }
    if (!object(entry)) continue;
    projection.guidance.push({
      kind: "procedure",
      axis: entry.axis ?? null,
      title: entry.title ?? null,
      when: clone(entry.when || []),
      objective: entry.objective ?? null,
      steps: clone(entry.steps || []),
      alternatives: clone(entry.alternatives || []),
      opponentBranches: clone(entry.opponentBranches || []),
      risk: entry.risk ?? null,
      reviseIf: entry.reviseIf ?? null,
      requiredQueries: clone(entry.requiredQueries || []),
    });
  }
  const knowledge = Array.isArray(skill.knowledge) ? skill.knowledge : [];
  for (const section of knowledge) {
    const recommendations = section?.draft?.recommendations || [];
    projection.guidance.push({
      kind: "knowledge_section",
      sectionId: section?.section?.id ?? null,
      axis: section?.section?.axis ?? null,
      recommendations: recommendations.map((recommendation) => ({
        title: recommendation?.title ?? null,
        when: clone(recommendation?.when || []),
      })),
    });
  }
  let bytes = Buffer.byteLength(JSON.stringify(projection), "utf8");
  while (bytes > MAX_SKILL_PROJECTION_BYTES && projection.guidance.length > 1) {
    projection.guidance.pop();
    projection.truncated = true;
    bytes = Buffer.byteLength(JSON.stringify(projection), "utf8");
  }
  return freezeDeep(projection);
}

// ------------------------------------------------------- deliberation port

export function createScriptedRosterDeliberationPortV1(input = {}) {
  if (typeof input.handler !== "function") {
    fail("ROSTER_STRATEGIST_MOCK_HANDLER_REQUIRED");
  }
  const modelVersion = nonEmpty(input.modelVersion || "scripted-mock-v1",
    "ROSTER_STRATEGIST_MOCK_INVALID");
  const promptVersion = nonEmpty(input.promptVersion || "scripted-mock-prompt-v1",
    "ROSTER_STRATEGIST_MOCK_INVALID");
  const calls = [];
  return freezeDeep({
    descriptor: () => freezeDeep({
      kind: "scripted_mock_deterministic",
      modelVersion,
      promptVersion,
      paidProviderCalls: 0,
      realProviderCalls: 0,
      trainingTruth: false,
    }),
    calls: () => calls.map((entry) => clone(entry)),
    async deliberate(request) {
      const output = await input.handler(clone(request));
      if (!object(output)) fail("ROSTER_STRATEGIST_MOCK_OUTPUT_INVALID");
      const receiptBody = {
        providerKind: "scripted_mock_deterministic",
        modelVersion,
        promptVersion,
        roundKind: request.roundKind,
        contextHash: hash64(request.contextHash, "ROSTER_STRATEGIST_MOCK_INVALID"),
        outputHash: hashStarcraftTmgContract(output),
        usage: null,
        usageStatus: "unknown_not_applicable_for_mock",
        latencyMs: null,
        paidProviderCall: false,
        trainingTruth: false,
      };
      const receipt = freezeDeep({ ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody) });
      calls.push(receipt);
      return freezeDeep({ output: clone(output), receipt });
    },
  });
}

// ------------------------------------------------------------- runtime

export function normalizeRosterStrategistReplyForRequestV1({
  output, request,
} = {}) {
  // Typed public-output normalization boundary: unwraps admitted transport
  // envelopes, stamps absent request-owned constants and renames admitted
  // field aliases only. It never invents or fills semantic content; the
  // strict schema/Rules validation below always runs on the normalized
  // output and fails closed on anything the boundary did not admit.
  // All structured roster rounds use the same unique-field extraction.
  // Initial schedule rounds can misnest siblings just like repair rounds;
  // extraction never fills absent content or resolves ambiguous copies.
  const shapeRecovery = object(request.responseFormat?.schema)
    ? liftSchemaUniqueTopLevelFieldsV1({
      output: output,
      schema: request.responseFormat.schema,
    }) : null;
  const normalization = normalizeRosterStrategistPublicOutputV1({
    output: shapeRecovery?.output ?? output,
    request: {
      roundKind: request.roundKind,
      schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
      contractSchema: request.responseFormat?.schema,
    },
  });
  const pruning = pruneRosterUndeclaredPublicFieldsV1({
    output: normalization.output,
    schema: request.responseFormat?.schema,
  });
  const proposalDeduplication = request.roundKind
      === "candidate_proposals"
    ? deduplicateIdenticalRosterProposalsV1({ output: pruning.output })
    : null;
  return freezeDeep({
    output: proposalDeduplication?.output ?? pruning.output,
    outputShapeRecoveryReceipt: clone(shapeRecovery?.receipt ?? null),
    normalizationReceipt: clone(normalization.receipt),
    pruningReceipt: clone(pruning.receipt),
    proposalDeduplicationReceipt:
      clone(proposalDeduplication?.receipt ?? null),
  });
}


export function canonicalRosterStrategistToolRequestV1(need) {
  const raw = object(need.toolRequest) ? need.toolRequest : {};
  const textOrNull = (value) => {
    const normalized = String(value ?? "").trim();
    return normalized || null;
  };
  const idList = (value) => (Array.isArray(value)
    ? value.map(textOrNull).filter(Boolean).slice(0, MAX_LIST) : []);
  const positiveBudget = (value) => {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
  };
  const integerOrZero = (value) => {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) ? numeric : 0;
  };
  const scheduleEntries = (value, vpField) => (Array.isArray(value)
    ? value.slice(0, MAX_LIST).map((entry) => ({
      window: textOrNull(entry?.window) || "",
      [vpField]: integerOrZero(entry?.[vpField]),
    })).filter((entry) => entry.window)
    : []);
  const request = {};
  const branchIdRef = textOrNull(raw.branchIdRef);
  if (branchIdRef) request.branchIdRef = branchIdRef;
  const putText = (key) => {
    const valueText = textOrNull(raw[key]);
    if (valueText) request[key] = valueText;
  };
  const putIdList = (key) => {
    const list = idList(raw[key]);
    if (list.length) request[key] = list;
  };
  const putBudget = () => {
    const sample = positiveBudget(raw.sampleBudget);
    if (sample) request.sampleBudget = sample;
  };
  if (need.kind === "probability") {
    putText("attackerUnitId");
    putText("domainId");
    putText("targetUnitId");
    putBudget();
  } else if (need.kind === "spatial") {
    putText("queryKind");
    putText("argumentsJson");
    putText("seatKey");
    putText("intent");
    putIdList("subjectUnitIds");
    putIdList("targetIds");
  } else if (need.kind === "map_route") {
    Object.assign(request, projectPregameMapRouteRequestV1(raw));
  } else if (need.kind === "threat_exchange") {
    putText("seatKey");
    putBudget();
    putIdList("subjectUnitIds");
    putIdList("targetIds");
  } else if (need.kind === "math") {
    const mathKind = textOrNull(raw.mathKind);
    if (mathKind) request.mathKind = mathKind;
    const inputs = object(raw.inputs) ? raw.inputs : {};
    if (mathKind === "budget_fit") {
      request.inputs = {
        mineralBudget: integerOrZero(inputs.mineralBudget),
        mineralSpent: integerOrZero(inputs.mineralSpent),
        vespeneSpent: integerOrZero(inputs.vespeneSpent),
        vespeneLimitNumerator: integerOrZero(inputs.vespeneLimitNumerator),
        vespeneLimitDenominator:
          integerOrZero(inputs.vespeneLimitDenominator),
      };
    } else if (mathKind === "mission_marker_schedule") {
      putText("argumentsJson");
      // Keep an explicitly supplied typed schedule for the shared lab's
      // lossless transport normalization/conflict check. Scalar placeholders
      // are not scoring assumptions and retain their previous empty form.
      request.inputs = Object.hasOwn(inputs, "sideKey") || Object.hasOwn(inputs, "windows")
        ? clone(inputs) : {};
    } else if (mathKind === "vp_schedule_delta") {
      request.inputs = {
        planned: scheduleEntries(inputs.planned, "plannedCumulativeVp"),
        projected: scheduleEntries(inputs.projected, "cumulativeVp"),
      };
    } else if (mathKind === "integer_sum") {
      request.inputs = {
        values: (Array.isArray(inputs.values) ? inputs.values : [])
          .slice(0, 128).map((value) => integerOrZero(value)),
      };
    } else {
      request.inputs = {};
    }
  } else if (need.kind === "scenario") {
    const rawSpec = object(raw.spec) ? raw.spec : {};
    const spec = {};
    const specKind = textOrNull(rawSpec.kind);
    if (specKind) spec.kind = specKind;
    if (specKind === 'native_action') {
      putText('argumentsJson');
      putText('seatKey');
    }
    const steps = Number(rawSpec.lifecycleSteps);
    if (Number.isSafeInteger(steps) && steps > 0) {
      spec.lifecycleSteps = steps;
    }
    const phase = textOrNull(rawSpec.phase);
    if (phase) {
      spec.phase = phase;
      const activeSideKey = textOrNull(rawSpec.activeSideKey);
      if (activeSideKey) spec.activeSideKey = activeSideKey;
    }
    if (rawSpec.isolateToPlacedPieces === true) {
      spec.isolateToPlacedPieces = true;
    }
    if (rawSpec.clearTerrain === true) spec.clearTerrain = true;
    // The laboratory owns the actual scenario piece denominator. Never
    // silently turn a complete model scenario into a different four-piece
    // scene while reporting the original need as answered.
    const placements = (Array.isArray(rawSpec.placements)
      ? rawSpec.placements : []).map((placement) => ({
      pieceId: textOrNull(placement?.pieceId) || "",
      xInches: Number(placement?.xInches),
      yInches: Number(placement?.yInches),
    }));
    if (placements.length) spec.placements = placements;
    request.spec = spec;
    const followUps = (Array.isArray(raw.followUps) ? raw.followUps : [])
      .slice(0, 4).map((followUp) => {
        const canonical = {};
        const followKind = textOrNull(followUp?.kind);
        if (followKind) canonical.kind = followKind;
        for (const key of ["attackerUnitId", "targetUnitId", "seatKey", "domainId", "queryKind", "argumentsJson",
          "intent"]) {
          const valueText = textOrNull(followUp?.[key]);
          if (valueText) canonical[key] = valueText;
        }
        const sample = positiveBudget(followUp?.sampleBudget);
        if (sample) canonical.sampleBudget = sample;
        for (const key of ["subjectUnitIds", "targetIds"]) {
          const list = idList(followUp?.[key]);
          if (list.length) canonical[key] = list;
        }
        return canonical;
      }).filter((followUp) => followUp.kind);
    if (followUps.length) request.followUps = followUps;
  }
  return request;
}


export function createRosterStrategistRuntimeV1(input = {}) {
  const armyBuilderPort = input.armyBuilderPort;
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.enumerateArmyBuildingChoices !== "function"
    || typeof armyBuilderPort?.portDescriptor !== "function") {
    fail("ROSTER_STRATEGIST_BUILDER_PORT_INVALID");
  }
  const portDescriptor = armyBuilderPort.portDescriptor();
  verifyOfficialArmyBuilderQueryPortDescriptorV1(portDescriptor);
  const laboratory = input.laboratory;
  if (typeof laboratory?.labDescriptor !== "function"
    || typeof laboratory?.queryProbability !== "function"
    || typeof laboratory?.querySpatial !== "function"
    || typeof laboratory?.queryMath !== "function"
    || typeof laboratory?.queryThreatExchange !== "function"
    || typeof laboratory?.runScenarioBranch !== "function"
    || typeof laboratory?.missionScoringAuthority !== "function") {
    fail("ROSTER_STRATEGIST_LABORATORY_INVALID");
  }
  const labDescriptor = laboratory.labDescriptor();
  verifyPregameSceneLaboratoryDescriptorV1(labDescriptor);
  const pack = input.strategyPack;
  const entries = pack?.foundational?.entries;
  if (!Array.isArray(entries) || entries.length < 5
    || !HASH_PATTERN.test(String(pack?.receipt?.hash || ""))) {
    fail("ROSTER_STRATEGIST_STRATEGY_PACK_INVALID");
  }
  verifyRosterStrategistOutputContractSetV1(
    ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1);

  const descriptorBody = {
    schema: ROSTER_STRATEGIST_DESCRIPTOR_SCHEMA,
    version: ROSTER_STRATEGIST_RUNTIME_VERSION,
    promptPack: ROSTER_STRATEGIST_PROMPT_PACK_V1,
    portDescriptorHash: portDescriptor.descriptorHash,
    laboratoryDescriptorHash: labDescriptor.descriptorHash,
    strategyPackManifestHash: pack.manifest?.hash ?? null,
    strategyPackReceiptHash: pack.receipt.hash,
    strategySources: ["general_skill", "faction_skill", "directed_matchup_skill",
      "agent_deliberation"],
    hostPreferenceWeights: false,
    promptPreferenceWeights: false,
    runtimeRanksOrScoresCandidates: false,
    rulesRemainSoleLegalityAuthority: true,
    strategistMayNotWaiveRepairOrReinterpretRulesRejections: true,
    hiddenChainOfThoughtRequested: false,
    hiddenChainOfThoughtPersisted: false,
    unknownStaysUnknown: true,
    // Schedule-grounding contract (sub-slice 269.13, closing the round-9
    // list-quality gap of an unknown victory-point schedule): the
    // authoritative mission task/scoring data frozen in the source Room
    // state is sealed into the foundation-round request; when it is
    // derivable the public schedule must be declared and mission-grounded,
    // otherwise the schedule stays unknown and the missing authority is
    // identified publicly. The runtime never fabricates scoring data.
    missionScoringAuthority: {
      sealedIntoFoundationRound: true,
      declaredGroundedScheduleRequiredWhenDerivable: true,
      unknownPreservedAndMissingAuthorityIdentifiedOtherwise: true,
      runtimeNeverFabricatesScoringData: true,
    },
    // Budget-utilization contract (sub-slice 269.14, closing the round-9
    // list-quality gap of 940/2000 minerals spent): unspent budget is lost,
    // so budget residue is an explicit strategic opportunity cost. The
    // near-cap threshold is derived from the Rules-owned menu (cheapest
    // positive purchasable increment), never hard-coded per faction and
    // never forced to exact budget equality; when an evaluated Rules-legal
    // candidate is near-cap the selection must be near-cap or carry an
    // explicit public justification tied to a legal retained-resource use.
    budgetUtilizationContract: {
      nearCapThresholdDerivation:
        "cheapest_positive_purchasable_increment_in_rules_owned_menu",
      unspentResourceDisposition: "lost",
      unspentBudgetIsAnExplicitOpportunityCost: true,
      nearCapSelectionOrDeclaredJustificationRequired: true,
      exactBudgetEqualityNeverForced: true,
      runtimeNeverRanksCandidates: true,
    },
    // Formal budget acceptance contract (Slice 272, closing the 940/2000
    // severe-underspend class): Rules legality alone is not a final formal
    // success. The budget/menu stay Rules/Builder-owned; the utilization
    // floor tolerance is the versioned product contract
    // ROSTER_FORMAL_BUDGET_CONTRACT_V1, displayed in the planning UI. A
    // selection below the floor without the menu-derived near-cap
    // exemption fails closed when a compliant legal candidate is
    // available; with no compliant candidate the plan closes as draft with
    // budgetAcceptance unmet — never active. Vespene must stay within the
    // Rules-owned formal cap.
    formalBudgetAcceptanceContract: {
      contractSchema: ROSTER_FORMAL_BUDGET_CONTRACT_V1.schema,
      contractVersion: ROSTER_FORMAL_BUDGET_CONTRACT_V1.version,
      contractHash: ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash,
      mineralUtilizationFloor:
        ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor,
      budgetAndMenuAuthority:
        ROSTER_FORMAL_BUDGET_CONTRACT_V1.budgetAndMenuAuthority,
      vespeneWithinFormalCapRequired: true,
      activeRequiresBudgetContractMet: true,
      severeUnderspendClosesAsDraftNeverActive: true,
      decliningCompliantCandidateFailsClosed: true,
      floorEchoesRecomputedFromRulesVerdicts: true,
      exactBudgetEqualityNeverForced: true,
      toleranceDisplayedInProductUi: true,
      toleranceDisplayTextZh:
        ROSTER_FORMAL_BUDGET_CONTRACT_V1.toleranceDisplayTextZh,
      toleranceDisplayTextEn:
        ROSTER_FORMAL_BUDGET_CONTRACT_V1.toleranceDisplayTextEn,
      runtimeNeverRanksCandidates: true,
    },
    // Narrative-capacity policy (sub-slice 269.17, closing the saved live
    // round-10 window-bound blocker): free public narrative is bounded only
    // by the transport-level overall safety ceiling; exceeding a display
    // target is a soft public warning recorded in the round receipt, never
    // a rejection, and the full public text is preserved. Identifier, enum,
    // identity and legality bounds are unchanged.
    narrativeCapacityPolicy: {
      narrativeTransportCeiling: NARRATIVE_TRANSPORT_CEILING,
      displayTargets: clone(NARRATIVE_DISPLAY_TARGETS),
      exceedingDisplayTargetIsSoftWarningOnly: true,
      fullPublicNarrativeTextPreserved: true,
      identifierEnumLegalityIdentityBoundsUnchanged: true,
      transportCeilingIsOverallSafetyBoundNotPerFieldContentLimit: true,
    },
    publicOutputNormalization: {
      aliasRegistrySchema:
        ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.schema,
      aliasRegistryVersion: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
      aliasRegistryHash:
        ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.registryHash,
      renamesOnlyAdmittedAliases: true,
      unwrapsOnlyAdmittedTransportEnvelopes: true,
      stampsOnlyAbsentRequestOwnedConstants: true,
      neverInventsStrategyContent: true,
      neverFillsMissingSemanticContent: true,
      neverWeakensLegality: true,
      neverSpecialCasesOneCandidateOrProvider: true,
      fullSchemaAndRulesValidationRunsAfterNormalization: true,
    },
    // Generation-side structured output contract (sub-slice 269.7): every
    // deliberation round request carries the round's strict Provider JSON
    // schema, so the contracted public field set is enforced at generation
    // time. The schemas bind field names, types, bounds and enums only —
    // never roster content or strategy. The normalization boundary and the
    // full schema/Rules validation still run on every decoded output.
    structuredGenerationOutput: {
      contractSetSchema:
        ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.schema,
      contractSetVersion: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.version,
      contractSetHash:
        ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
      contracts: clone(ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contracts),
      generationSideFieldSetEnforcement: true,
      schemaFieldSetsMatchRuntimeValidators: true,
      placeholderFieldsNeverReachRulesOrToolReceipts: true,
      normalizationBoundaryStillRunsAfterDecoding: true,
      fullSchemaAndRulesValidationStillRunsAfterDecoding: true,
      neverInventsStrategyContent: true,
      neverWeakensLegality: true,
    },
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });

  function selectSkillRoute(routeInput = {}) {
    const ownFaction = nonEmpty(routeInput.ownFactionRecordKey,
      "ROSTER_STRATEGIST_SKILL_ROUTE_INVALID");
    const opponentFaction = nonEmpty(routeInput.opponentFactionRecordKey,
      "ROSTER_STRATEGIST_SKILL_ROUTE_INVALID");
    const general = entries.find((entry) => entry.role === "general");
    const faction = entries.find((entry) => entry.role === "faction"
      && entry.factionRecordKey === ownFaction);
    const matchup = entries.find((entry) => entry.role === "matchup"
      && entry.ownFaction === ownFaction
      && entry.opponentFaction === opponentFaction);
    if (!general || !faction || !matchup) {
      fail("ROSTER_STRATEGIST_SKILL_ROUTE_UNAVAILABLE", JSON.stringify({
        general: Boolean(general), faction: Boolean(faction),
        matchup: Boolean(matchup), ownFaction, opponentFaction }));
    }
    const skillRefs = [
      { role: "general", entry: general },
      { role: "faction", entry: faction },
      { role: "matchup", entry: matchup },
    ].map(({ role, entry }) => freezeDeep({
      role,
      skillId: entry.skill.skillId,
      version: entry.skill.version,
      skillHash: entry.skill.hash,
      qualificationHash: entry.qualificationRef.hash,
      runtimeAccepted: entry.skill.runtimeAccepted === true,
      canAffectRules: entry.skill.canAffectRules === true,
    }));
    return freezeDeep({
      receipt: hashedReceipt({
        schema: ROSTER_STRATEGIST_SKILL_ROUTE_RECEIPT_SCHEMA,
        ownFactionRecordKey: ownFaction,
        opponentFactionRecordKey: opponentFaction,
        skillRefs,
        strategyPackManifestHash: pack.manifest?.hash ?? null,
        strategyPackReceiptHash: pack.receipt.hash,
        selectionPolicy: "exact_manifest_role_and_direction_only",
        skillsAdvisoryOnlyCannotAffectRules: true,
        providerCalls: 0,
        trainingTruth: false,
      }),
      skillRefs,
      projections: freezeDeep({
        general: skillGuidanceProjection(general.skill),
        faction: skillGuidanceProjection(faction.skill),
        matchup: skillGuidanceProjection(matchup.skill),
      }),
    });
  }

  function menuProjection(enumeration) {
    return freezeDeep({
      faction: {
        recordKey: enumeration.faction.recordKey,
        factionName: enumeration.faction.factionName,
        raceTag: enumeration.faction.raceTag,
        startingArmySlots: clone(enumeration.faction.startingArmySlots),
      },
      scale: clone(enumeration.scale),
      mineralBudget: enumeration.mineralBudget,
      vespeneLimitForBudget: clone(enumeration.vespeneLimitForBudget),
      tacticalCards: enumeration.tacticalCandidates.map((entry) => ({
        recordKey: entry.recordKey, cardName: entry.cardName,
        vespeneGasCost: entry.vespeneGasCost,
        armySlotsAdded: clone(entry.armySlotsAdded),
      })),
      units: enumeration.unitCandidates.map((entry) => ({
        recordKey: entry.recordKey, unitName: entry.unitName,
        armySlotType: entry.armySlotType,
        compositionOptions: entry.compositionOptions.map((option) => ({
          compositionKind: option.compositionKind,
          startingModels: option.startingModels,
          startingSupply: option.startingSupply,
          occupiedArmySlots: clone(option.occupiedArmySlots),
          mineralCost: option.mineralCost,
        })),
        purchasableUpgrades: entry.purchasableUpgrades.map((upgrade) => ({
          upgradeName: upgrade.upgradeName,
          applicationKind: upgrade.applicationKind,
          specialistAssignmentRequired: upgrade.specialistAssignmentRequired,
          mineralCostByComposition: clone(upgrade.mineralCostByComposition),
        })),
      })),
      legalityNote: enumeration.legalityNote,
    });
  }

  // Menu-derived near-cap threshold (sub-slice 269.14, closing the round-9
  // list-quality gap of 940/2000 minerals spent): the cheapest positive
  // purchasable mineral increment anywhere in the Rules-owned menu. The
  // derivation is general — it reads the menu, is never hard-coded per
  // faction and never forces exact budget equality. A candidate whose
  // unspent minerals fall below this increment cannot purchase even the
  // cheapest remaining item, so its residue is near-cap.
  function nearCapThresholdMineralsFromMenu(menuValue) {
    return deriveNearCapThresholdMineralsV1(menuValue);
  }

  // ---------------------------------------------------- output validation

  // General narrative-capacity policy (sub-slice 269.17, mirroring the
  // strict output contract set v1.4.0): free public narrative is bounded
  // only by the transport-level overall safety ceiling; exceeding a role's
  // display target records a soft public warning in the round receipt,
  // never a rejection, and the full public text is preserved. Identifiers,
  // enums, identities and every legality check keep their exact existing
  // rules — nonEmpty/textList are unchanged for them.
  let activeNarrativeWarnings = null;
  function narrative(value, code,
    { path = "narrative", role = "publicProse" } = {}) {
    const text = String(value || "").trim();
    if (!text) fail(code);
    if (text.length > NARRATIVE_TRANSPORT_CEILING) {
      fail(code, "narrative_transport_ceiling_exceeded");
    }
    const displayTarget = NARRATIVE_DISPLAY_TARGETS[role];
    if (activeNarrativeWarnings && text.length > displayTarget) {
      activeNarrativeWarnings.push(freezeDeep({
        path, role, displayTarget, observedLength: text.length,
        severity: "soft_display_target_exceeded", fullTextPreserved: true,
      }));
    }
    return text;
  }
  function narrativeList(value, code,
    { allowEmpty = true, max = MAX_LIST, path = "narrative",
      role = "publicProse" } = {}) {
    if (!Array.isArray(value) || value.length > max) fail(code);
    if (!allowEmpty && value.length === 0) fail(code);
    return value.map((entry, index) => narrative(entry, code,
      { path: `${path}[${index}]`, role }));
  }

  function validateEnvelope(output, roundKind) {
    if (!object(output)) fail("ROSTER_STRATEGIST_OUTPUT_INVALID", roundKind);
    rejectForbiddenKeys(output);
    if (output.schemaVersion !== ROSTER_STRATEGIST_DELIBERATION_SCHEMA
      || output.roundKind !== roundKind) {
      fail("ROSTER_STRATEGIST_OUTPUT_INVALID",
        `${roundKind}:envelope:keys=${Object.keys(output).join(",").slice(0, 200)}`
          + `:schemaVersion=${String(output.schemaVersion).slice(0, 80)}`
          + `:roundKind=${String(output.roundKind).slice(0, 80)}`);
    }
  }

  function validateScoreRoute(value, code) {
    if (!object(value)) fail(code);
    exactKeys(value, ["routeKind", "routeText", "scheduleStatus",
      "targetVpSchedule", "fallbackRouteText"], code);
    if (!ROUTE_KINDS.has(value.routeKind)) fail(code, "routeKind");
    if (!SCHEDULE_STATUSES.has(value.scheduleStatus)) fail(code, "scheduleStatus");
    return {
      routeKind: value.routeKind,
      routeText: narrative(value.routeText, code,
        { path: "scoreRoute.routeText" }),
      scheduleStatus: value.scheduleStatus,
      targetVpSchedule: (value.targetVpSchedule || []).map((entry, index) => ({
        window: narrative(entry?.window, code, {
          path: `scoreRoute.targetVpSchedule[${index}].window`,
          role: "scheduleWindowLabel" }),
        plannedCumulativeVp: Number(entry?.plannedCumulativeVp),
      })),
      fallbackRouteText: narrative(value.fallbackRouteText, code,
        { path: "scoreRoute.fallbackRouteText" }),
    };
  }

  function validateFoundation(output, { missionAuthorityDerivable } = {}) {
    validateEnvelope(output, "strategy_foundation");
    exactKeys(output, ["schemaVersion", "roundKind", "scoreRoute",
      "scoreRouteAuthority", "opponentHypotheses", "counterResponses",
      "invalidationTriggers", "informationNeeds"],
      "ROSTER_STRATEGIST_FOUNDATION_INVALID");
    const code = "ROSTER_STRATEGIST_FOUNDATION_INVALID";
    const scoreRoute = validateScoreRoute(output.scoreRoute, code);
    // Schedule-grounding contract (sub-slice 269.13): a mission-grounded
    // VP schedule is built from the authoritative task/scoring data when
    // that authority is derivable; otherwise unknown is preserved and the
    // missing authority is identified. Never fabricated either way.
    const grounding = output.scoreRouteAuthority;
    if (!object(grounding)) fail(code, "scoreRouteAuthority");
    exactKeys(grounding, ["status", "authorityText"], code);
    if (!["mission_grounded", "unknown_missing_authority"].includes(
      grounding.status)) {
      fail(code, "scoreRouteAuthority:status");
    }
    const groundingResult = {
      status: grounding.status,
      authorityText: narrative(grounding.authorityText, code,
        { path: "scoreRouteAuthority.authorityText" }),
    };
    if (missionAuthorityDerivable === true
      && (scoreRoute.scheduleStatus !== "declared"
        || grounding.status !== "mission_grounded")) {
      fail(code, "schedule_grounding:"
        + "derivable_authority_requires_declared_mission_grounded_schedule");
    }
    if (missionAuthorityDerivable === false
      && (scoreRoute.scheduleStatus !== "unknown"
        || grounding.status !== "unknown_missing_authority")) {
      fail(code, "schedule_grounding:"
        + "missing_authority_preserves_unknown_and_identifies_"
        + "missing_authority");
    }
    const hypotheses = (output.opponentHypotheses || []).map((entry) => {
      exactKeys(entry, ["hypothesisId", "archetypeLabel", "hypothesisText",
        "confidence", "expectedCounterTexts", "ownCounterResponseIds",
        "falsificationText"], code);
      if (!CONFIDENCE_LEVELS.has(entry.confidence)) fail(code, "confidence");
      return {
        hypothesisId: nonEmpty(entry.hypothesisId, code),
        archetypeLabel: nonEmpty(entry.archetypeLabel, code),
        hypothesisText: narrative(entry.hypothesisText, code,
          { path: "opponentHypotheses.hypothesisText" }),
        confidence: entry.confidence,
        expectedCounterTexts: narrativeList(entry.expectedCounterTexts || [],
          code, { path: "opponentHypotheses.expectedCounterTexts" }),
        ownCounterResponseIds: textList(entry.ownCounterResponseIds || [], code),
        falsificationText: narrative(entry.falsificationText, code,
          { path: "opponentHypotheses.falsificationText" }),
      };
    });
    if (hypotheses.length < 1 || hypotheses.length > 8) fail(code, "hypotheses");
    const responses = (output.counterResponses || []).map((entry) => {
      exactKeys(entry, ["responseId", "triggerText", "responseText",
        "linkedHypothesisIds"], code);
      return {
        responseId: nonEmpty(entry.responseId, code),
        triggerText: narrative(entry.triggerText, code,
          { path: "counterResponses.triggerText" }),
        responseText: narrative(entry.responseText, code,
          { path: "counterResponses.responseText" }),
        linkedHypothesisIds: textList(entry.linkedHypothesisIds || [], code),
      };
    });
    const triggers = (output.invalidationTriggers || []).map((entry) => {
      exactKeys(entry, ["triggerId", "observationKind", "triggerText",
        "revisionRequiredText"], code);
      if (!TRIGGER_OBSERVATION_KINDS.has(entry.observationKind)) {
        fail(code, "observationKind");
      }
      return {
        triggerId: nonEmpty(entry.triggerId, code),
        observationKind: entry.observationKind,
        triggerText: narrative(entry.triggerText, code,
          { path: "invalidationTriggers.triggerText" }),
        revisionRequiredText: narrative(entry.revisionRequiredText, code,
          { path: "invalidationTriggers.revisionRequiredText" }),
      };
    });
    if (triggers.length < 1) fail(code, "invalidationTriggers_required");
    const needs = (output.informationNeeds || []).map((entry) => {
      exactKeys(entry, ["needId", "kind", "questionText", "toolRequest"], code);
      if (!NEED_KINDS.has(entry.kind)) fail(code, `need_kind:${entry.kind}`);
      return {
        needId: nonEmpty(entry.needId, code),
        kind: entry.kind,
        questionText: narrative(entry.questionText, code,
          { path: "informationNeeds.questionText" }),
        toolRequest: clone(entry.toolRequest),
      };
    });
    if (needs.length < 1) fail(code, "information_needs_required");
    const needCountWarning = rosterInformationNeedCountWarningV1(needs.length);
    if (activeNarrativeWarnings && needCountWarning) {
      activeNarrativeWarnings.push(needCountWarning);
    }
    if (new Set(needs.map((entry) => entry.needId)).size !== needs.length) {
      fail(code, "information_need_ids_unique");
    }
    return {
      scoreRoute,
      scoreRouteAuthority: groundingResult,
      opponentHypotheses: hypotheses,
      counterResponses: responses,
      invalidationTriggers: triggers,
      informationNeeds: needs,
    };
  }

  function validateProposals(output, menu,
    { allowSingleAfterIdenticalDedup = false } = {}) {
    validateEnvelope(output, "candidate_proposals");
    exactKeys(output, ["schemaVersion", "roundKind", "proposals"],
      "ROSTER_STRATEGIST_PROPOSALS_INVALID");
    const code = "ROSTER_STRATEGIST_PROPOSALS_INVALID";
    const proposals = output.proposals;
    if (!Array.isArray(proposals)
      || proposals.length < (allowSingleAfterIdenticalDedup ? 1 : 2)
      || proposals.length > 4) {
      fail(code, "proposal_count_2_to_4_required");
    }
    const unitMenu = new Map(menu.units.map((entry) => [entry.recordKey, entry]));
    const tacticalMenu = new Set(menu.tacticalCards.map((entry) => entry.recordKey));
    const seen = new Set();
    return proposals.map((proposal) => {
      exactKeys(proposal, ["candidateId", "tacticalCardRecordKeys", "units",
        "rationaleText"], code);
      const candidateId = nonEmpty(proposal.candidateId, code);
      if (seen.has(candidateId)) fail(code, `duplicate:${candidateId}`);
      seen.add(candidateId);
      const tacticalCardRecordKeys = textList(
        proposal.tacticalCardRecordKeys || [], code, { max: 8 });
      for (const key of tacticalCardRecordKeys) {
        if (!tacticalMenu.has(key)) fail(code, `tactical_not_in_menu:${key}`);
      }
      const units = proposal.units;
      if (!Array.isArray(units) || units.length < 1 || units.length > 24) {
        fail(code, "units_bound");
      }
      const unitIds = new Set();
      const mappedUnits = units.map((unit, index) => {
        exactKeys(unit, ["recordKey", "compositionKind", "upgrades"], code);
        const recordKey = nonEmpty(unit.recordKey, code);
        const menuEntry = unitMenu.get(recordKey);
        if (!menuEntry) fail(code, `unit_not_in_menu:${recordKey}`);
        if (!menuEntry.compositionOptions.some((option) => (
          option.compositionKind === unit.compositionKind))) {
          fail(code, `composition_not_in_menu:${recordKey}:${unit.compositionKind}`);
        }
        const upgradeMenu = new Set(menuEntry.purchasableUpgrades.map(
          (upgrade) => upgrade.upgradeName));
        const upgrades = (unit.upgrades || []).map((upgrade) => {
          exactKeys(upgrade, ["upgradeName"], code);
          const upgradeName = nonEmpty(upgrade.upgradeName, code);
          if (!upgradeMenu.has(upgradeName)) {
            fail(code, `upgrade_not_in_menu:${recordKey}:${upgradeName}`);
          }
          return { upgradeName };
        });
        const unitInstanceId = `agent-unit-${index + 1}`;
        if (unitIds.has(unitInstanceId)) fail(code, "unit_instance_unique");
        unitIds.add(unitInstanceId);
        return {
          unitInstanceId,
          recordKey,
          compositionKind: unit.compositionKind,
          upgrades,
        };
      });
      return {
        candidateId,
        tacticalCardRecordKeys,
        units: mappedUnits,
        rationaleText: narrative(proposal.rationaleText, code,
          { path: `proposals.${candidateId}.rationaleText` }),
      };
    });
  }

  function validateComparison(output, evaluated, budgetContract,
    { lockedCandidateId = null, requireExactBudgetForActive = false,
      requireSelectionJustification = false } = {}) {
    const preset = lockedCandidateId !== null;
    validateEnvelope(output, preset
      ? PLANNED_PRESET_DEEPENING_ROUND_KIND : "comparison_selection");
    exactKeys(output, preset
      ? ["schemaVersion", "roundKind", "componentPurposes",
        "deploymentConcept", "resourceUtilization", "lossResourceBudget",
        "publicSummaryText", ...(requireSelectionJustification ? ["selectionJustification"] : [])]
      : ["schemaVersion", "roundKind", "comparison",
        "componentPurposes", "deploymentConcept", "resourceUtilization",
        "lossResourceBudget", "publicSummaryText"],
    "ROSTER_STRATEGIST_COMPARISON_INVALID");
    const code = "ROSTER_STRATEGIST_COMPARISON_INVALID";
    const comparison = preset ? null : output.comparison;
    if (!preset) {
      if (!object(comparison)) fail(code);
      exactKeys(comparison, ["basisTexts", "tradeoffTexts",
        "selectedCandidateId"], code);
    }
    const selectedCandidateId = preset ? lockedCandidateId
      : nonEmpty(comparison.selectedCandidateId, code);
    const selected = evaluated.find((entry) => (
      entry.proposal.candidateId === selectedCandidateId));
    if (!selected) fail("ROSTER_STRATEGIST_SELECTION_UNKNOWN", selectedCandidateId);
    if (selected.candidate.legalityStatus !== "legal") {
      fail("ROSTER_STRATEGIST_SELECTION_NOT_RULES_LEGAL", selectedCandidateId);
    }
    // Budget-utilization contract (sub-slice 269.14): unspent budget is
    // lost, so the near-cap facts are recomputed from the Rules verdicts
    // and the menu-derived threshold; the model's echoes must match those
    // computed values exactly, and declining an available near-cap
    // candidate requires a declared public justification tied to a legal
    // retained-resource use. The runtime computes but never ranks.
    const { nearCapThresholdMinerals, mineralBudget } = budgetContract;
    const floor = ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor;
    const utilizationFacts = new Map(evaluated
      .filter((entry) => entry.candidate.legalityStatus === "legal")
      .map((entry) => {
        const mineralSpent = entry.verdictOrRejection.summary.mineralSpent;
        const mineralUnspent = mineralBudget - mineralSpent;
        const nearCap = mineralUnspent < nearCapThresholdMinerals;
        // Formal budget acceptance (Slice 272): floor met, or the
        // menu-derived near-cap exemption; recomputed from the Rules
        // verdicts, never from the model.
        const meetsBudgetFloor = nearCap
          || mineralSpent * floor.denominator
            >= mineralBudget * floor.numerator;
        return [entry.proposal.candidateId, {
          mineralUnspent,
          nearCap,
          meetsBudgetFloor,
          meetsExactBudget: mineralUnspent === 0,
        }];
      }));
    const computedNearCapAvailable = [...utilizationFacts.values()].some(
      (fact) => fact.nearCap);
    const computedSelectedNearCap =
      utilizationFacts.get(selectedCandidateId)?.nearCap === true;
    const computedBudgetFloorAvailable = [...utilizationFacts.values()].some(
      (fact) => fact.meetsBudgetFloor);
    const computedSelectedMeetsBudgetFloor =
      utilizationFacts.get(selectedCandidateId)?.meetsBudgetFloor === true;
    const utilization = output.resourceUtilization;
    if (!object(utilization)) fail(code, "resourceUtilization");
    exactKeys(utilization, ["nearCapCandidateAvailable",
      "selectedCandidateNearCap", "unspentBudgetAcknowledgedLost",
      "budgetFloorCandidateAvailable", "selectedCandidateMeetsBudgetFloor",
      "retainedResourceJustificationStatus",
      "retainedResourceJustificationText"], code);
    if (utilization.nearCapCandidateAvailable !== computedNearCapAvailable) {
      fail(code, "resourceUtilization:near_cap_availability_echo_mismatch");
    }
    if (utilization.selectedCandidateNearCap !== computedSelectedNearCap) {
      fail(code, "resourceUtilization:selected_near_cap_echo_mismatch");
    }
    if (utilization.budgetFloorCandidateAvailable
      !== computedBudgetFloorAvailable) {
      fail(code, "resourceUtilization:budget_floor_availability_echo_mismatch");
    }
    if (utilization.selectedCandidateMeetsBudgetFloor
      !== computedSelectedMeetsBudgetFloor) {
      fail(code, "resourceUtilization:selected_meets_floor_echo_mismatch");
    }
    if (utilization.unspentBudgetAcknowledgedLost !== true) {
      fail(code, "resourceUtilization:unspent_budget_lost_not_acknowledged");
    }
    if (!["declared", "not_applicable"].includes(
      utilization.retainedResourceJustificationStatus)) {
      fail(code, "resourceUtilization:justification_status");
    }
    const justificationRaw = String(
      utilization.retainedResourceJustificationText ?? "").trim();
    const justificationText = justificationRaw
      ? narrative(justificationRaw, code,
        { path: "resourceUtilization.retainedResourceJustificationText" })
      : "";
    if (utilization.retainedResourceJustificationStatus === "declared"
      && !justificationText) {
      fail(code, "resourceUtilization:justification_text_required");
    }
    if (utilization.retainedResourceJustificationStatus === "not_applicable"
      && justificationText) {
      fail(code, "resourceUtilization:justification_text_must_be_empty");
    }
    if (computedNearCapAvailable && !computedSelectedNearCap
      && utilization.retainedResourceJustificationStatus !== "declared") {
      fail(code,
        "resourceUtilization:justification_required_when_near_cap_available");
    }
    // Formal budget acceptance (Slice 272): a declared justification can
    // explain declining a near-cap candidate, but it can never waive the
    // formal floor — selecting a severe-underspend candidate while a
    // budget-floor-compliant Rules-legal candidate is available fails
    // closed. With no compliant candidate the selection stands and the
    // plan closes as draft with budgetAcceptance unmet (never active).
    if (computedBudgetFloorAvailable && !computedSelectedMeetsBudgetFloor) {
      fail(code,
        "resourceUtilization:budget_floor_candidate_available_declined");
    }
    if (requireExactBudgetForActive
      && [...utilizationFacts.values()].some((fact) => fact.meetsExactBudget)
      && utilizationFacts.get(selectedCandidateId)?.meetsExactBudget !== true) {
      fail(code, "agent_exact_budget_candidate_available_declined");
    }
    const purposes = (output.componentPurposes || []).map((entry) => {
      exactKeys(entry, ["componentKind", "recordKey", "instanceId",
        "publicPurposeText", "scoringRole"], code);
      if (!COMPONENT_KINDS.has(entry.componentKind)) fail(code, "componentKind");
      if (!SCORING_ROLES.has(entry.scoringRole)) fail(code, "scoringRole");
      return {
        componentKind: entry.componentKind,
        recordKey: nonEmpty(entry.recordKey, code),
        instanceId: nonEmpty(entry.instanceId, code),
        publicPurposeText: narrative(entry.publicPurposeText, code,
          { path: `componentPurposes.${entry.instanceId}.publicPurposeText` }),
        scoringRole: entry.scoringRole,
      };
    });
    if (purposes.length < 1) fail(code, "component_purposes_required");
    validatePurposeBindings(purposes, selected, code);
    verifyRosterComponentPurposesV1(purposes.map(createRosterComponentPurposeV1));
    const deployment = output.deploymentConcept;
    if (!object(deployment)) fail(code, "deploymentConcept");
    exactKeys(deployment, ["deploymentConceptText", "activationOrderStatus",
      "activationOrder", "reinforcementPolicyText", "threatTradeText",
      "objectiveControlText"], code);
    const activationOrder = (deployment.activationOrder || []).map((entry) => {
      exactKeys(entry, ["ordinal", "unitInstanceId", "phase"], code);
      return {
        ordinal: Number(entry?.ordinal),
        unitInstanceId: nonEmpty(entry?.unitInstanceId, code),
        phase: nonEmpty(entry?.phase, code),
      };
    });
    const selectedUnitIds = new Set(selected.proposal.units.map(
      (unit) => unit.unitInstanceId));
    for (const entry of activationOrder) {
      if (!selectedUnitIds.has(entry.unitInstanceId)) {
        fail(code, `activation_order_unit_not_selected:${entry.unitInstanceId}`);
      }
    }
    let lossBudget = null;
    if (output.lossResourceBudget !== null && output.lossResourceBudget !== undefined) {
      const budget = output.lossResourceBudget;
      exactKeys(budget, ["lossBudgetStatus", "plannedLossBudget"], code);
      if (!["declared", "unknown"].includes(budget.lossBudgetStatus)) {
        fail(code, "lossBudgetStatus");
      }
      lossBudget = {
        lossBudgetStatus: budget.lossBudgetStatus,
        plannedLossBudget: (budget.plannedLossBudget || []).map((entry, i) => ({
          resourceKind: nonEmpty(entry?.resourceKind, code),
          window: narrative(entry?.window, code, {
            path: `lossResourceBudget.plannedLossBudget[${i}].window`,
            role: "scheduleWindowLabel" }),
          plannedMaximumLoss: Number(entry?.plannedMaximumLoss),
        })),
      };
    }
    return {
      comparison: preset ? null : {
        basisTexts: narrativeList(comparison.basisTexts, code,
          { allowEmpty: false, path: "comparison.basisTexts" }),
        tradeoffTexts: narrativeList(comparison.tradeoffTexts || [], code,
          { path: "comparison.tradeoffTexts" }),
        selectedCandidateId,
      },
      componentPurposes: purposes,
      deploymentConcept: {
        deploymentConceptText: narrative(deployment.deploymentConceptText,
          code, { path: "deploymentConcept.deploymentConceptText" }),
        activationOrderStatus: deployment.activationOrderStatus === "declared"
          ? "declared" : "unknown",
        activationOrder,
        reinforcementPolicyText: narrative(deployment.reinforcementPolicyText,
          code, { path: "deploymentConcept.reinforcementPolicyText" }),
        threatTradeText: narrative(deployment.threatTradeText, code,
          { path: "deploymentConcept.threatTradeText" }),
        objectiveControlText: narrative(deployment.objectiveControlText, code,
          { path: "deploymentConcept.objectiveControlText" }),
      },
      lossResourceBudget: lossBudget,
      resourceUtilization: {
        nearCapCandidateAvailable: computedNearCapAvailable,
        selectedCandidateNearCap: computedSelectedNearCap,
        unspentBudgetAcknowledgedLost: true,
        budgetFloorCandidateAvailable: computedBudgetFloorAvailable,
        selectedCandidateMeetsBudgetFloor:
          computedSelectedMeetsBudgetFloor,
        retainedResourceJustificationStatus:
          utilization.retainedResourceJustificationStatus,
        retainedResourceJustificationText: justificationText,
        nearCapThresholdMinerals,
      },
      publicSummaryText: narrative(output.publicSummaryText, code,
        { path: "publicSummaryText" }),
    };
  }

  function validatePurposeBindings(purposes, selected, code) {
    const proposal = selected.proposal;
    const unitsById = new Map(proposal.units.map((unit) => [
      unit.unitInstanceId, unit]));
    for (const purpose of purposes) {
      if (purpose.componentKind === "faction_card") {
        if (purpose.instanceId !== `${proposal.sideKeySafe}-faction`) {
          fail(code, `faction_card_instance:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "tactical_card") {
        const index = proposal.tacticalCardRecordKeys.indexOf(purpose.recordKey);
        if (index < 0
          || purpose.instanceId !== `${proposal.sideKeySafe}-tactical-${index + 1}`) {
          fail(code, `tactical_card_binding:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "unit") {
        const unit = unitsById.get(purpose.instanceId);
        if (!unit || unit.recordKey !== purpose.recordKey) {
          fail(code, `unit_binding:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "composition") {
        const match = /^(.+)-composition$/u.exec(purpose.instanceId);
        const unit = match && unitsById.get(match[1]);
        if (!unit || unit.recordKey !== purpose.recordKey) {
          fail(code, `composition_binding:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "upgrade") {
        const match = /^(.+)-upgrade-(\d+)$/u.exec(purpose.instanceId);
        const unit = match && unitsById.get(match[1]);
        const upgradeIndex = match ? Number(match[2]) - 1 : -1;
        if (!unit || unit.recordKey !== purpose.recordKey
          || upgradeIndex < 0 || upgradeIndex >= unit.upgrades.length) {
          fail(code, `upgrade_binding:${purpose.instanceId}`);
        }
      }
    }
  }

  // -------------------------------------------------- information needs

  // Foundation and Teach share one executor. Never project a request by its
  // family first: doing that discarded an explicitly supplied hypothetical
  // scene and falsely answered the question using the off-board source.
  async function executeInformationNeed({ need, evidencePort, branchByNeedId,
    toolReceipts, traceEntry, foundationHash }) {
    const evidence = await evidencePort.query({ challengeId: need.needId,
      request: { kind: need.kind, toolRequest: clone(need.toolRequest) },
      mutationAuthority: false, initialFoundationHash: foundationHash,
      sourceHashes: [labDescriptor.sourceStateHash] });
    const references = [];
    const receiptKind = kind => kind === 'math' ? 'math'
      : kind === 'probability' ? 'probability'
        : ['spatial', 'map_route'].includes(kind) ? 'spatial' : 'simulation';
    const attach = (kind, receipt, summary) => {
      const reference = createRosterToolReceiptReferenceV1({
        referenceId: 'needref-' + need.needId + '-' + (toolReceipts.length + 1),
        receiptKind: receiptKind(kind), status: receipt ? 'attached' : 'unknown',
        ...(receipt ? { receiptHash: receipt.receiptHash } : {}),
        toolId: labDescriptor.laboratoryId, querySummaryText: summary });
      toolReceipts.push(reference);
      references.push(reference.referenceId);
      if (receipt) (traceEntry.informationNeedResults ||= []).push(freezeDeep({
        needId: need.needId, request: clone(need), referenceId: reference.referenceId,
        sourceReceipt: clone(receipt) }));
    };
    if (evidence.sourceReceipt) attach(evidence.requestKind, evidence.sourceReceipt, need.questionText);
    for (const child of evidence.followUpReceipts || []) {
      if (child.receipt) attach(child.kind, child.receipt,
        need.questionText + ' (branch ' + child.kind + ' follow-up)');
    }
    if (!references.length) attach(evidence.requestKind, null, need.questionText);
    if (evidence.requestKind === 'scenario' && evidence.sourceReceipt?.branchStateHash) {
      branchByNeedId.set(need.needId, evidence.sourceReceipt.branchStateHash);
    }
    const answered = evidence.status === 'advisory';
    traceEntry.informationNeedOutcomes.push(freezeDeep({
      needId: need.needId, kind: need.kind,
      status: answered ? 'answered' : evidence.sourceReceipt ? 'unknown' : 'failed',
      resultStatus: evidence.sourceReceipt?.resultStatus || null,
      ...(evidence.sourceReceipt?.branchStateHash
        ? { branchStateHash: evidence.sourceReceipt.branchStateHash } : {}),
      receiptReferenceIds: references,
      // Keep the exact requested operation and the shared source-owned repair
      // verdict together; failed children are not a successful parent answer.
      request: clone(need), evidenceReceipt: clone(evidence),
      ...(!answered ? { errorCode: evidence.unknownReasonCode,
        queryRepair: clone(evidence.queryRepair || {
          sourceContract: evidence.schema, originalQueryNotAnswered: true,
          correctionInstruction: 'Inspect this unchanged request and native result against evidenceQueryContext; explicitly select the supported scene, actors and arguments. Do not treat missing evidence as a strategic fact.' }) } : {}),
    }));
  }

  // --------------------------------------------------------- deliberation

  async function deliberateRound(deliberation, roundRequest, trace) {
    if (typeof deliberation?.deliberate !== "function"
      || typeof deliberation?.descriptor !== "function") {
      fail("ROSTER_STRATEGIST_DELIBERATION_PORT_INVALID");
    }
    const response = await deliberation.deliberate(freezeDeep(clone(roundRequest)));
    if (!object(response) || !object(response.output)) {
      fail("ROSTER_STRATEGIST_DELIBERATION_RESPONSE_INVALID");
    }
    rejectForbiddenKeys(response.output);
    trace.deliberationReceipts.push(clone(response.receipt || null));
    return normalizeRosterStrategistReplyForRequestV1({
      output: response.output, request: roundRequest,
    });
  }

  function buildRoundRequest({ sessionId, roundIndex, roundKind, nodes,
    userMessage, contextSeed, outputContract = null,
    outputContractRef = null, promptPack = ROSTER_STRATEGIST_PROMPT_PACK_V1,
    decisionCandidateSource =
      "agent_deliberation_over_skills_and_rules_legal_choices_only" }) {
    const contextHash = hashStarcraftTmgContract(contextSeed);
    const contract = outputContract
      || rosterStrategistRoundOutputContractV1(roundKind);
    return {
      sessionId,
      roundIndex,
      roundKind,
      promptPack,
      promptNodes: nodes,
      userMessage,
      responseContract: {
        allowedChannels: ["roster_strategy"],
        decisionCandidateSource,
      },
      // Strict generation-side contract: deliberation ports capable of
      // Provider JSON-schema output must request exactly this schema, so
      // the contracted public field set is structurally unavoidable. The
      // schema binds field names/types/bounds/enums only; normalization and
      // full schema/Rules validation still run on the decoded output.
      responseFormat: {
        kind: "provider_strict_json_schema",
        schemaName: contract.schemaName,
        outputContractRef: outputContractRef
          || rosterStrategistRoundOutputContractRefV1(roundKind),
        schema: clone(contract.providerSchema),
      },
      // Output capacity belongs to the versioned Provider profile. A
      // Foundation reply also exhausted the old 8,192-unit request override
      // even though the attached profile allowed 32,768. Keep the structured
      // schema and charge actual usage, but do not impose a second cap here.
      contextHash,
    };
  }

  function roundReceipt(traceEntry) {
    return hashedReceipt({
      schema: ROSTER_STRATEGIST_ROUND_RECEIPT_SCHEMA,
      ...without(traceEntry, ["informationNeedOutcomes"]),
      informationNeedOutcomes: traceEntry.informationNeedOutcomes || [],
      hiddenChainOfThoughtRequested: false,
      hostPreferenceWeightsApplied: false,
      trainingTruth: false,
    });
  }

  // ------------------------------------------------------------ planRoster

  async function planRosterInternal(sessionInput = {}, options = {},
    presetLock = null) {
    const code = "ROSTER_STRATEGIST_SESSION_INVALID";
    const sessionId = nonEmpty(sessionInput.sessionId, code);
    const sideKey = nonEmpty(sessionInput.sideKey, code);
    const factionRecordKey = nonEmpty(sessionInput.factionRecordKey, code);
    const opponentFactionRecordKey = nonEmpty(
      sessionInput.opponentFactionRecordKey, code);
    const engagementScale = nonEmpty(sessionInput.engagementScale || "Standard",
      code);
    const mineralBudget = Number(sessionInput.mineralBudget ?? 2_000);
    if (!Number.isSafeInteger(mineralBudget) || mineralBudget < 1) {
      fail(code, "mineralBudget");
    }
    const boundary = nonEmpty(sessionInput.opponentInformationBoundary, code);
    const agentSelectedStrategySource = options.agentSelectedStrategySource || null;
    const requireSelectionJustification = agentSelectedStrategySource
      ?.selectionJustificationPolicyVersion === ROSTER_SELECTION_JUSTIFICATION_POLICY_V1;
    const selectionDeepeningContract = requireSelectionJustification
      ? ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_V1
      : PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1;
    const selectionDeepeningRef = requireSelectionJustification
      ? ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_REF_V1
      : PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_REF_V1;
    if (agentSelectedStrategySource && (!presetLock
      || agentSelectedStrategySource.plan?.candidateHash
        !== agentSelectedStrategySource.candidateHash
      || hashStarcraftTmgContract(agentSelectedStrategySource.plan)
        !== agentSelectedStrategySource.planHash)) {
      fail("ROSTER_STRATEGIST_SELECTED_STRATEGY_SOURCE_INVALID");
    }
    if (presetLock) {
      verifyVerifiedPresetRosterLockV1(presetLock, armyBuilderPort);
      if (presetLock.candidateInput.sideKey !== sideKey
        || presetLock.candidateInput.factionRecordKey !== factionRecordKey
        || presetLock.candidateInput.scaleId !== engagementScale
        || presetLock.candidateInput.mineralBudget !== mineralBudget
        || (sessionInput.planId !== undefined
          && sessionInput.planId !== presetLock.baselinePlan.planId)) {
        fail("ROSTER_STRATEGIST_PRESET_CONTEXT_DRIFT");
      }
    }
    const deliberation = options.deliberation;
    const deliberationDescriptor = deliberation?.descriptor?.();
    if (!object(deliberationDescriptor)
      || !deliberationDescriptor.modelVersion
      || !deliberationDescriptor.promptVersion) {
      fail("ROSTER_STRATEGIST_DELIBERATION_PORT_INVALID");
    }
    const requireExactBudgetForActive = !presetLock
      && options.requireExactBudgetForActive === true;
    const enableBudgetBranchGuidance = !presetLock
      && requireExactBudgetForActive
      && options.enableBudgetBranchGuidance === true;
    const requireCertifiedMapForActive =
      options.requireCertifiedMapForActive === true;
    const maxProposalRounds = Math.max(1, Math.min(MAX_PROPOSAL_ROUNDS,
      Number(options.maxProposalRounds || (requireExactBudgetForActive ? 3 : 2))));

    const route = selectSkillRoute({
      ownFactionRecordKey: factionRecordKey,
      opponentFactionRecordKey,
    });
    const enumeration = armyBuilderPort.enumerateArmyBuildingChoices({
      factionRecordKey, scaleId: engagementScale, mineralBudget });
    const menu = menuProjection(enumeration);
    // Authoritative mission task/scoring data (sub-slice 269.13), sealed
    // into the foundation-round request below: when derivable, the public
    // VP schedule must be declared and mission-grounded; when missing,
    // unknown is preserved and the missing authority is identified. The
    // runtime never fabricates scoring data.
    const missionAuthority = laboratory.missionScoringAuthority();
    const missionMarkerScoringArithmetic =
      projectMissionMarkerScoringArithmeticV1({
        receipt: missionAuthority, sideKey,
        expectedMissionScoringProfileHash:
          missionAuthority.missionScoringProfile?.missionScoringProfileHash,
      });
    const missionMarkerScoringByActor = requireSelectionJustification
      ? projectMissionMarkerScoringByActorV1({ receipt: missionAuthority,
        expectedMissionScoringProfileHash:
          missionAuthority.missionScoringProfile?.missionScoringProfileHash }) : null;
    const missionAuthorityDerivable =
      missionAuthority.resultStatus === "derivable";
    const agentSelectedArrivalSource = options.agentSelectedArrivalSchedule;
    if (agentSelectedArrivalSource && !presetLock) {
      fail("ROSTER_STRATEGIST_AGENT_SELECTED_SCHEDULE_LOCK_REQUIRED");
    }
    // The Agent-selected handoff already carries a source-audited V2 Supply
    // schedule. Rebuilding it through the legacy V1 constructor drops
    // contextual Supply Pool modifiers (for example Medic facilities) and
    // can falsely exceed cumulative round capacity before any model call.
    if (agentSelectedArrivalSource) {
      verifyPlannedPresetRoundSupplyScheduleV1(agentSelectedArrivalSource,
        presetLock.candidate, presetLock.verdict.audit,
        missionAuthority.missionScoringProfile);
    }
    const agentSelectedArrivalSchedule = agentSelectedArrivalSource
      ? clone(agentSelectedArrivalSource) : null;
    if (agentSelectedArrivalSource
      && (agentSelectedArrivalSource.armyAuditResultHash
          !== presetLock.verdict.auditResultHash
        || agentSelectedArrivalSource.missionScoringProfileHash
          !== missionAuthority.missionScoringProfile
            ?.missionScoringProfileHash
        || hashStarcraftTmgContract(agentSelectedArrivalSource.entries)
          !== hashStarcraftTmgContract(
            agentSelectedArrivalSchedule.entries)
        || hashStarcraftTmgContract(agentSelectedArrivalSource.rounds)
          !== hashStarcraftTmgContract(
            agentSelectedArrivalSchedule.rounds))) {
      fail("ROSTER_STRATEGIST_AGENT_SELECTED_SCHEDULE_DRIFT");
    }
    const presetPromptPack = agentSelectedArrivalSchedule
      ? ROSTER_STRATEGIST_AGENT_SELECTED_LOCKED_PROMPT_PACK_V1
      : ROSTER_STRATEGIST_PRESET_PROMPT_PACK_V1;
    // Menu-derived near-cap threshold (sub-slice 269.14): unspent budget is
    // lost, so budget residue is an explicit strategic opportunity cost.
    const nearCapThresholdMinerals = nearCapThresholdMineralsFromMenu(menu);
    const selectionUnitRules = requireSelectionJustification
      ? (input.selectionUnitRules || []).filter(record =>
        menu.units.some(unit => unit.recordKey === record.recordKey)) : [];
    if (requireSelectionJustification && selectionUnitRules.length !== menu.units.length)
      fail("ROSTER_SELECTION_RULE_EVIDENCE_MISSING");

    const provenance = createRosterPlanProvenanceV1({
      sourceLockHash: sessionInput.versionPins?.sourceLockHash,
      sourceSnapshotHash: sessionInput.versionPins?.sourceSnapshotHash,
      normalizedDatasetHash: sessionInput.versionPins?.normalizedDatasetHash,
      officialRulesVersion: sessionInput.versionPins?.officialRulesVersion,
      officialUnitsVersion: sessionInput.versionPins?.officialUnitsVersion,
      officialCardsVersion: sessionInput.versionPins?.officialCardsVersion,
      unitCompositionUpgradeDataBundleHash:
        portDescriptor.unitCompositionUpgradeDataBundleHash,
      armyResourceBudgetDataBundleHash:
        portDescriptor.armyResourceBudgetDataBundleHash,
      factionArmyEligibilityDataBundleHash:
        portDescriptor.factionArmyEligibilityDataBundleHash,
      engagementScale,
      missionBinding: {
        status: "frozen",
        missionRecordKey: sessionInput.missionBinding?.missionRecordKey,
        deploymentRecordKey: sessionInput.missionBinding?.deploymentRecordKey,
        mapTopologyHash: sessionInput.missionBinding?.mapTopologyHash,
      },
      opponentInformationBoundary: boundary,
      skillVersions: route.skillRefs.map((ref) => ({
        skillId: ref.skillId, version: ref.version,
        promoted: ref.runtimeAccepted,
      })),
      modelVersion: deliberationDescriptor.modelVersion,
      promptVersion: deliberationDescriptor.promptVersion,
    });

    const planId = nonEmpty(presetLock?.baselinePlan.planId
      || sessionInput.planId || `roster-plan-${sessionId}`, code);
    const trace = [];
    const toolReceipts = [];
    const branchByNeedId = new Map();
    const retainedScenarios = options.selectionEvidence?.scenarios || [];
    const selectionEvidence = projectIterativeRosterEvidenceV1(options.selectionEvidence);
    const evidencePort = createRosterTeachEvidencePortV1(laboratory, { branchByNeedId, retainedScenarios });
    for (const row of selectionEvidence?.queries || []) {
      toolReceipts.push(createRosterToolReceiptReferenceV1({
        referenceId: row.referenceId, receiptKind: 'spatial', status: 'attached',
        receiptHash: row.receipt.receiptHash, toolId: 'pregame_scene_query',
        querySummaryText: `Retained ${row.query.queryKind} on ${row.receipt.baseStateHash}; result ${row.receipt.resultStatus}. Hypothetical scope unchanged; not arrival proof.`,
      }));
    }
    const deliberationReceipts = [];
    const traceSink = { deliberationReceipts };
    const mapSummary = typeof laboratory.summarizeMap === "function"
      ? laboratory.summarizeMap({ queryId: `${sessionId}:foundation-map` })
      : null;
    // Discovery must precede the first tool choice, not appear only after a
    // failed Foundation query. This is the same frozen Native descriptor
    // subsequently consumed by Teach; no model-derived tool aliases.
    const foundationQueryContext = typeof laboratory.describeQueryContext === "function"
      ? laboratory.describeQueryContext({ base: { kind: "source" } }) : null;
    if (mapSummary) {
      toolReceipts.push(createRosterToolReceiptReferenceV1({
        referenceId: "mapref-foundation",
        receiptKind: "spatial", status: "attached",
        receiptHash: mapSummary.receiptHash,
        toolId: "pregame-map-evidence-port-v1",
        querySummaryText: "Frozen Rules map and mission terrain summary",
      }));
    }

    // ------------------------------------------------ round 1: foundation
    const foundationNodes = [
      ...(options.planImprovementRequest ? [sealNode("preset-plan-reconsideration",
        "previous_plan_and_teach_are_advisory_not_locked_strategy", {
          ...clone(options.planImprovementRequest),
          instruction: "Keep only the Rules-verified army immutable. Reconsider victory route, unit roles, order, first-arrival schedule, map use and contingencies using the Teach evidence. The previous Plan and its schedule are NOT fixed facts. Produce a complete newly justified Plan, preserving sound risky choices.",
        })] : []),
      sealNode("frozen-context", "rules_and_source_frozen", {
        engagementScale, mineralBudget, sideKey, factionRecordKey,
        opponentFactionRecordKey, opponentInformationBoundary: boundary,
        missionBinding: clone(provenance.missionBinding),
        provenanceHash: provenance.provenanceHash,
        sourceStateHash: labDescriptor.sourceStateHash,
      }),
      ...(foundationQueryContext ? [sealNode("pregame-tool-contracts",
        "native_query_discovery_not_strategy_evidence", {
          queryContext: foundationQueryContext,
          instruction: "Use these actual unit IDs and tool contracts. Reserves require an explicit hypothetical scenario before combat queries. map_route is approximate base reachability, not exact movement legality. Put native spatial arguments in argumentsJson, not legacy outer selectors. Query failures need correction, not a final unknown rule claim.",
        })] : []),
      ...(selectionEvidence ? [sealNode('selection-query-evidence',
        'native_receipts_with_explicit_hypothesis_scope', selectionEvidence)] : []),
      sealNode("skill-guidance", "strategy_skills_advisory", {
        routeReceiptHash: route.receipt.receiptHash,
        skillsAdvisoryOnlyCannotAffectRules: true,
        projections: route.projections,
      }),
      ...(agentSelectedStrategySource ? [sealNode(
        "agent-selected-strategy-source", "model_owned_selection_purpose_not_rules", {
          ...clone(agentSelectedStrategySource),
          teachIsChallengeNotTacticalVeto: true,
          snapshotImmutableDuringThisTeachOnly: true,
          rosterCanBeReopenedAfterTeach:
            agentSelectedStrategySource.feedbackPolicy === "skill_teach_roster_coevolution_v1",
        })] : []),
      sealNode("legal-choice-menu-summary", "rules_owned_army_builder_port", {
        enumerationReceiptHash: enumeration.receiptHash,
        denominators: clone(enumeration.denominators),
        vespeneLimitForBudget: clone(enumeration.vespeneLimitForBudget),
      }),
      ...(requireSelectionJustification ? [sealNode("selection-argument-requirements",
        "public_evidence_coverage_not_strategy_ranking", {
          policyVersion: ROSTER_SELECTION_JUSTIFICATION_POLICY_V1,
          instruction: ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1,
          unitRules: clone(selectionUnitRules), menu: clone(menu),
        })] : []),
      ...(presetLock ? [sealNode("locked-preset-roster",
        requireSelectionJustification ? "rules_verified_current_teach_snapshot"
          : "rules_verified_immutable_room_roster", {
          lockHash: presetLock.lockHash,
          baselinePlanHash: presetLock.baselinePlan.planHash,
          candidateHash: presetLock.candidate.candidateHash,
          auditResultHash: presetLock.verdict.auditResultHash,
          recipe: clone(presetLock.recipe),
          modelSelectionLocked: true,
          ...(requireSelectionJustification ? { lockScope: "this_teach_snapshot_only",
            rosterAndArrivalMayBeReopenedAfterTeach: true } : {}),
        })] : []),
      ...buildArrivalScheduleEvidenceNodesV1(agentSelectedArrivalSchedule),
      // Sub-slice 269.13: the authoritative mission task/scoring data
      // frozen in the source Room state is sealed into the foundation
      // round, so a mission-grounded VP schedule is derivable from the
      // request itself; a missing authority is sealed as unknown with the
      // missing authority named.
      sealNode("mission-scoring-authority",
        "rules_owned_mission_scoring_authority", {
          resultStatus: missionAuthority.resultStatus,
          unknownReason: missionAuthority.unknownReason ?? null,
          missionScoringProfile: clone(missionAuthority.missionScoringProfile),
          markerAffinity: clone(missionAuthority.markerAffinity),
          scheduleDerivationNote: missionAuthority.scheduleDerivationNote,
          authorityReceiptHash: missionAuthority.receiptHash,
          runtimeNeverFabricatesScoringData: true,
        }),
      sealNode("mission-marker-scoring-arithmetic",
        "source_bound_arithmetic_not_strategy_or_rules_verdict", {
          projection: clone(missionMarkerScoringArithmetic),
          allMarkersControlledIsNotAnAttainableRouteClaim: true,
          planPatternVpMustNotBeCalledTheGlobalMarkerCeiling: true,
        }),
      ...(missionMarkerScoringByActor ? [sealNode("mission-marker-scoring-by-actor",
        "source_bound_scoring_facts_not_strategy", {
          projection: clone(missionMarkerScoringByActor),
          numericMathInputsDoNotVerifyScoringPremises: true,
        })] : []),
      ...(mapSummary ? [sealNode("pregame-map-evidence",
        "rules_frozen_map_evidence_or_typed_unknown", {
          receipt: clone(mapSummary),
          mapHashAloneNeverProvesRouteUnderstanding: true,
          halfInchGridWitnessIsNotExactMovementLegality: true,
        })] : []),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "strategy_foundation",
        fields: ["scoreRoute", "scoreRouteAuthority", "opponentHypotheses",
          "counterResponses", "invalidationTriggers", "informationNeeds"],
        informationNeedKinds: [...NEED_KINDS],
        publicFieldsOnly: true,
        envelopeAtTopLevelNoChannelsWrapper: true,
        hiddenChainOfThoughtForbidden: true,
        outputSchemaName:
          rosterStrategistRoundOutputContractV1("strategy_foundation")
            .schemaName,
        strictProviderJsonSchemaEnforced: true,
      }),
    ];
    const foundationTrace = {
      roundIndex: 1, roundKind: "strategy_foundation",
      outputContractRef:
        rosterStrategistRoundOutputContractRefV1("strategy_foundation"),
      promptNodeHashes: foundationNodes.map((node) => node.nodeHash),
      informationNeedOutcomes: [],
    };
    const foundationDeliberation = await deliberateRound(deliberation,
      buildRoundRequest({
        sessionId, roundIndex: 1, roundKind: "strategy_foundation",
        nodes: foundationNodes,
        userMessage: agentSelectedStrategySource
          ? "Start from the supplied original Agent selection purpose, not a replacement goal. This candidate snapshot is immutable during this Teach so all evidence refers to the same army; after Teach the selecting Agent may retain it or return to Builder and change the combination. Expand and test the existing victory route using Skills, exact map queries and combat hypotheses. A risky legal strategy is not a rule error. Explicitly preserve or revise assumptions with public reasons; never impose risk avoidance. Respect the Rules-checked first-arrival rounds. Unknown stays unknown; no hidden chain of thought."
          : agentSelectedArrivalSchedule
          ? "The Agent selected this exact Rules-legal roster before "
            + "Teach. The lock is technical, not a user preset. Form a "
            + "public victory route without changing its models or the "
            + "Rules-checked first-arrival rounds. Never assign a Unit an "
            + "on-table action before its listed round. Use the supplied "
            + "Skills and map-route evidence; unknown stays unknown. "
            + "Public fields only, no hidden chain-of-thought."
          : presetLock
          ? "This roster is Rules-verified and immutable. Form a small "
            + "public victory-route plan for its exact models and upgrades; "
            + "do not select or change them. State opponent hypotheses, "
            + "counter-responses, invalidation triggers and typed information "
            + "needs. Use map_route with frozen sideId/baseId/targetId for "
            + "deployment-to-objective reachability; spatial only inspects "
            + "placed-unit relationships. Strategy must come from the supplied Skills and your "
            + "own deliberation. Public fields only; never emit hidden "
            + "chain-of-thought."
          : "Choose the public score route, opponent hypotheses, "
            + "counter-responses, invalidation triggers and typed information "
            + "needs for this roster planning session. Use map_route with "
            + "frozen sideId/baseId/targetId to inspect deployment-to-objective "
            + "reachability; spatial only inspects placed-unit relationships. "
            + "Strategy must come from "
            + "the supplied Skills and your own deliberation. Public fields "
            + "only; never emit hidden chain-of-thought.",
        contextSeed: { sessionId, roundKind: "strategy_foundation",
          ...(selectionEvidence ? { selectionEvidenceHash: selectionEvidence.evidenceHash } : {}),
          provenanceHash: provenance.provenanceHash,
          enumerationReceiptHash: enumeration.receiptHash,
          skillRouteReceiptHash: route.receipt.receiptHash,
           ...(agentSelectedStrategySource ? {
             agentSelectedStrategyHash: agentSelectedStrategySource.planHash } : {}),
           ...(requireSelectionJustification ? {
             selectionJustificationPolicyVersion: ROSTER_SELECTION_JUSTIFICATION_POLICY_V1 } : {}),
          ...(mapSummary ? {
            mapEvidenceReceiptHash: mapSummary.receiptHash } : {}),
          ...(presetLock ? { presetLockHash: presetLock.lockHash } : {}),
          ...(agentSelectedArrivalSchedule ? { arrivalScheduleHash:
            agentSelectedArrivalSchedule.scheduleHash } : {}) },
        ...(presetLock ? { promptPack:
          presetPromptPack,
          decisionCandidateSource:
            "rules_verified_immutable_room_roster_only" } : {}),
      }), traceSink);
    const foundationOutput = foundationDeliberation.output;
    foundationTrace.outputNormalizationReceipt =
      foundationDeliberation.normalizationReceipt;
    foundationTrace.outputPruningReceipt =
      foundationDeliberation.pruningReceipt;
    foundationTrace.contextHash = hashStarcraftTmgContract({
      sessionId, roundKind: "strategy_foundation",
      ...(selectionEvidence ? { selectionEvidenceHash: selectionEvidence.evidenceHash } : {}),
      provenanceHash: provenance.provenanceHash,
      enumerationReceiptHash: enumeration.receiptHash,
      skillRouteReceiptHash: route.receipt.receiptHash,
      ...(agentSelectedStrategySource ? {
        agentSelectedStrategyHash: agentSelectedStrategySource.planHash } : {}),
      ...(mapSummary ? {
        mapEvidenceReceiptHash: mapSummary.receiptHash } : {}),
      ...(presetLock ? { presetLockHash: presetLock.lockHash } : {}) });
    const foundationWarnings = [];
    activeNarrativeWarnings = foundationWarnings;
    let foundation;
    try {
      foundation = validateFoundation(foundationOutput,
        { missionAuthorityDerivable });
    } finally {
      activeNarrativeWarnings = null;
    }
    foundationTrace.narrativeDisplayWarnings = foundationWarnings;
    foundationTrace.outputHash = hashStarcraftTmgContract(foundationOutput);
    for (const need of foundation.informationNeeds) {
      await executeInformationNeed({ need, evidencePort, branchByNeedId, toolReceipts,
        traceEntry: foundationTrace, foundationHash: foundationTrace.outputHash });
    }
    trace.push(roundReceipt(foundationTrace));

    // Optional Teach lane: the small plan is challenged and revised before
    // any model/composition/upgrade proposal. Existing three-round callers
    // keep their frozen behavior until they explicitly provide the two roles;
    // evidence is always routed through this runtime's frozen laboratory.
    let teachCycle = null;
    if (options.teachPorts) {
      teachCycle = await runRosterTeachCycleV1({
        ...options.teachPorts,
        evidencePort,
        initialFoundation: foundation,
        sourceHashes: [provenance.provenanceHash,
          route.receipt.receiptHash, enumeration.receiptHash,
          missionAuthority.receiptHash,
          ...(mapSummary ? [mapSummary.receiptHash] : []),
          ...(presetLock ? [presetLock.lockHash] : []),
          ...(agentSelectedStrategySource ? [agentSelectedStrategySource.planHash] : []),
          ...route.skillRefs.map((ref) => ref.skillHash)],
        sourceContext: {
          engagementScale, mineralBudget,
          ...(agentSelectedStrategySource ? {
            agentSelectedStrategySource: clone(agentSelectedStrategySource),
            teachIsChallengeNotTacticalVeto: true,
            ...(requireSelectionJustification ? {
              selectionJustificationInstruction: ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1,
              selectionUnitRules: clone(selectionUnitRules),
            } : {}),
          } : {}),
          missionScoringAuthority: clone(missionAuthority),
          ...(missionMarkerScoringByActor ? {
            missionMarkerScoringByActor: clone(missionMarkerScoringByActor),
            numericMathInputsDoNotVerifyScoringPremises: true,
          } : {}),
          ...(mapSummary ? { mapEvidence: clone(mapSummary) } : {}),
          skillGuidance: clone(route.projections),
          legalChoiceDenominators: clone(enumeration.denominators),
          foundationToolReferences: clone(toolReceipts),
          foundationToolResults: clone(foundationTrace.informationNeedResults || []),
          foundationToolOutcomes: clone(foundationTrace.informationNeedOutcomes),
          ...(selectionEvidence ? { selectionEvidence: clone(selectionEvidence) } : {}),
          ...(agentSelectedArrivalSchedule ? {
            arrivalScheduleEvidence: buildArrivalScheduleEvidenceNodesV1(agentSelectedArrivalSchedule),
          } : {}),
          ...(foundationQueryContext ? {
            evidenceQueryContext: clone(foundationQueryContext),
            availableFoundationBranchRefs: [...branchByNeedId.keys(), ...retainedScenarios.map(row => row.challengeId)],
          } : {}),
          opponentInformationBoundary: boundary,
          ...(presetLock ? { presetRosterLock: {
            lockHash: presetLock.lockHash,
            candidateHash: presetLock.candidate.candidateHash,
            auditResultHash: presetLock.verdict.auditResultHash,
            recipe: clone(presetLock.recipe),
            rulesAuditSummary: clone(presetLock.verdict.summary),
            modelSelectionLocked: true,
          } } : {}),
        },
      });
      const teachRoleReceipts = [teachCycle.roleReceipts.challenger,
        teachCycle.roleReceipts.student];
      if (teachRoleReceipts.some((receipt) =>
        !object(receipt)
          || !HASH_PATTERN.test(String(receipt.receiptHash || "")))) {
        fail("ROSTER_TEACH_ROLE_RECEIPT_REQUIRED");
      }
      deliberationReceipts.push(...teachRoleReceipts.map((receipt) =>
        clone(receipt)));
      toolReceipts.push(...projectRosterTeachEvidenceReferencesV1(
        teachCycle.evidenceReceipts, { toolId: labDescriptor.laboratoryId }));
      const revised = validateFoundation({
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "strategy_foundation",
        ...clone(teachCycle.revisedFoundation),
      }, { missionAuthorityDerivable });
      const initialNeeds = new Map(foundation.informationNeeds.map((need) =>
        [need.needId, need]));
      const challengeTrace = {
        roundIndex: 2, roundKind: "teach_challenge",
        teachCycleHash: teachCycle.cycleHash,
        initialFoundationHash: teachCycle.initialFoundationHash,
        challengeCount: teachCycle.challenges.length,
        challengePromptRoute: teachCycle.challengePromptRoute,
        roleReceiptHash: teachRoleReceipts[0].receiptHash,
        evidenceReceiptHashes: teachCycle.evidenceReceipts.map((receipt) =>
          receipt.receiptHash),
        promptNodeHashes: [], informationNeedOutcomes: [],
      };
      const revisionTrace = {
        roundIndex: 3, roundKind: "teach_revision",
        teachCycleHash: teachCycle.cycleHash,
        revisedFoundationHash: teachCycle.revisedFoundationHash,
        revisionPromptRoute: teachCycle.revisionPromptRoute,
        roleReceiptHash: teachRoleReceipts[1].receiptHash,
        promptNodeHashes: [], informationNeedOutcomes: [],
        revisedInformationNeeds: [],
      };
      for (const need of revised.informationNeeds) {
        const prior = initialNeeds.get(need.needId);
        if (prior && hashStarcraftTmgContract(prior)
          !== hashStarcraftTmgContract(need)) {
          // A Student may revise a question under the same logical need ID.
          // Keep both immutable query receipts and identify the reissue;
          // the latest branch binding is used only by later explicit needs.
          revisionTrace.revisedInformationNeeds.push({
            needId: need.needId,
            previousNeedHash: hashStarcraftTmgContract(prior),
            revisedNeedHash: hashStarcraftTmgContract(need),
          });
        }
        if (!prior || hashStarcraftTmgContract(prior)
          !== hashStarcraftTmgContract(need)) {
          await executeInformationNeed({ need, evidencePort, branchByNeedId, toolReceipts,
            traceEntry: revisionTrace, foundationHash: revisionTrace.revisedFoundationHash });
        }
      }
      foundation = revised;
      trace.push(roundReceipt(challengeTrace), roundReceipt(revisionTrace));
    }

    const scoreRoute = createRosterScoreRouteV1(foundation.scoreRoute);
    const opponentHypotheses = foundation.opponentHypotheses.map((entry) => (
      createOpponentArchetypeHypothesisV1(entry)));
    const counterResponses = foundation.counterResponses.map((entry) => (
      createRosterCounterResponseV1(entry)));
    const invalidationTriggers = foundation.invalidationTriggers.map((entry) => (
      createRosterInvalidationTriggerV1(entry)));

    // ------------------------------------------- round 2+: proposals
    const evaluated = [];
    const rejections = [];
    let legalProposals = [];
    let proposalRound = 0;
    const proposalFeedback = [];
    const budgetFeedback = [];
    const budgetBranchReceipts = [];
    const guidedCandidateHashes = new Set();
    let budgetBranchGuide = null;
    const seenCandidateIds = new Set();
    const meetsFormalBudgetFloor = (entry) => {
      const spent = entry.verdictOrRejection.summary.mineralSpent;
      const floor = ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor;
      return spent * floor.denominator >= mineralBudget * floor.numerator
        || mineralBudget - spent < nearCapThresholdMinerals;
    };
    const meetsAgentCompletionTarget = (entry) =>
      requireExactBudgetForActive
        ? entry.verdictOrRejection.summary.mineralSpent === mineralBudget
        : meetsFormalBudgetFloor(entry);
    if (presetLock) {
      // There is exactly one already audited candidate. No proposal or
      // selection model call is made, and no substitute list can enter.
      const proposal = freezeDeep({
        candidateId: presetLock.candidate.candidateId,
        tacticalCardRecordKeys:
          clone(presetLock.candidateInput.tacticalCardRecordKeys),
        units: presetLock.candidateInput.units.map((unit) => ({
          unitInstanceId: unit.unitInstanceId,
          recordKey: unit.recordKey,
          compositionKind: unit.compositionKind,
          upgrades: clone(unit.upgrades),
        })),
        rationaleText: "Immutable Rules-verified preset roster",
        sideKeySafe: sideKey,
      });
      const row = freezeDeep({
        proposal,
        candidateInput: clone(presetLock.candidateInput),
        candidate: presetLock.candidate,
        verdictOrRejection: presetLock.verdict,
        proposalOrder: 0,
      });
      evaluated.push(row);
      legalProposals = [row];
    } else while (!legalProposals.some(meetsAgentCompletionTarget)
      && proposalRound < maxProposalRounds) {
      proposalRound += 1;
      const roundIndex = 1 + 2 * Number(Boolean(teachCycle))
        + proposalRound;
      const proposalNodes = [
        sealNode("frozen-context", "rules_and_source_frozen", {
          engagementScale, mineralBudget, provenanceHash: provenance.provenanceHash,
          scoreRouteHash: scoreRoute.scoreRouteHash,
        }),
        sealNode("legal-choice-menu", "rules_owned_army_builder_port", {
          enumerationReceiptHash: enumeration.receiptHash, menu }),
        // Formal budget acceptance context (Slice 272): candidates must be
        // proposed with the versioned product-contract utilization floor in
        // view, so at least one candidate should spend within the floor or
        // the menu-derived near-cap exemption; the budget and menu stay
        // Rules/Builder-owned, only the tolerance is a product value.
        sealNode("formal-budget-contract", "product_contract_displayed_in_ui", {
          contractVersion: ROSTER_FORMAL_BUDGET_CONTRACT_V1.version,
          contractHash: ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash,
          mineralBudget,
          mineralUtilizationFloor:
            ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor,
          nearCapExemptionThresholdMinerals: nearCapThresholdMinerals,
          vespeneFormalCap: Math.floor(
            (menu.vespeneLimitForBudget?.numerator ?? 0)
              / (menu.vespeneLimitForBudget?.denominator ?? 1)),
          unspentResourceDisposition: "lost",
          agentCompletionPolicyVersion: requireExactBudgetForActive
            ? "agent_exact_budget_or_draft_v1" : "legacy_floor_v1",
          agentCompletionTargetMinerals: requireExactBudgetForActive
            ? mineralBudget : null,
          proposalGuidance: requireExactBudgetForActive
            ? "Propose at least one Rules-legal candidate spending exactly "
              + `${mineralBudget} minerals. The historical 90% floor is `
              + "not this Agent session's completion target. If no exact "
              + "candidate is found after the bounded rounds, retain the "
              + "best legal candidate only as a draft."
            : "Propose candidates that use the budget: at least one "
              + "candidate should meet the mineral-utilization floor or "
              + "near-cap exemption; severe underspend closes as draft.",
          toleranceDisplayTextZh:
            ROSTER_FORMAL_BUDGET_CONTRACT_V1.toleranceDisplayTextZh,
          toleranceDisplayTextEn:
            ROSTER_FORMAL_BUDGET_CONTRACT_V1.toleranceDisplayTextEn,
          priorLegalBudgetGaps: clone(budgetFeedback),
          priorCandidateIds: [...seenCandidateIds],
          nextRoundGuidance: requireExactBudgetForActive
            ? "Propose distinct new Rules-legal candidates that close the "
              + "exact displayed mineral gap; do not repeat prior IDs."
            : "Legal but severely underspent candidates remain available "
              + "as drafts. Close the displayed shortfall with distinct "
              + "new candidates; do not repeat prior IDs.",
        }),
        sealNode("strategy-foundation", "agent_deliberation_public", {
          scoreRoute: foundation.scoreRoute,
          opponentHypotheses: foundation.opponentHypotheses.map((entry) => ({
            hypothesisId: entry.hypothesisId,
            archetypeLabel: entry.archetypeLabel,
            hypothesisText: entry.hypothesisText,
          })),
          toolEvidence: toolReceipts.map((receipt) => ({
            referenceId: receipt.referenceId, receiptKind: receipt.receiptKind,
            status: receipt.status, receiptHash: receipt.receiptHash })),
        }),
        sealNode("queried-evidence-results", "native_receipts_with_explicit_hypothesis_scope", {
          results: trace.flatMap(entry => clone(entry.informationNeedResults || [])),
          outcomes: trace.flatMap(entry => clone(entry.informationNeedOutcomes || [])),
          teachEvidence: clone(teachCycle?.evidenceReceipts || []),
          referenceOnlyIsNotAnAnswer: true,
        }),
        sealNode("proposal-feedback", "rules_owned_army_builder_port", {
          priorRejections: clone(proposalFeedback),
        }),
        ...(budgetBranchGuide ? [sealNode("budget-branch-guide",
          "rules_owned_army_builder_port", clone(budgetBranchGuide))] : []),
        sealNode("response-schema", "platform", {
          schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
          roundKind: "candidate_proposals",
          fields: ["proposals"],
          proposalShape: { candidateId: "string", tacticalCardRecordKeys: [],
            units: [{ recordKey: "from menu", compositionKind: "from menu",
              upgrades: [{ upgradeName: "from menu" }] }],
            rationaleText: "public" },
          proposalCount: "2_to_4",
          rulesRemainSoleLegalityAuthority: true,
          publicFieldsOnly: true,
          envelopeAtTopLevelNoChannelsWrapper: true,
          outputSchemaName:
            rosterStrategistRoundOutputContractV1("candidate_proposals")
              .schemaName,
          strictProviderJsonSchemaEnforced: true,
        }),
      ];
      const proposalTrace = {
        roundIndex, roundKind: "candidate_proposals",
        outputContractRef:
          rosterStrategistRoundOutputContractRefV1("candidate_proposals"),
        promptNodeHashes: proposalNodes.map((node) => node.nodeHash),
        informationNeedOutcomes: [],
      };
      const proposalDeliberation = await deliberateRound(deliberation,
        buildRoundRequest({
          sessionId, roundIndex, roundKind: "candidate_proposals",
          nodes: proposalNodes,
          userMessage: "Propose 2 to 4 distinct roster candidates using only "
            + "recordKeys, compositionKinds and upgradeNames from the "
            + "Rules-owned legal choice menu. The Rules port remains the sole "
            + "legality authority; rejections are returned typed and are never "
            + "silently repaired. Public fields only."
            + (budgetBranchGuide ? " The budget-branch guide's Builder-legal "
              + "lists are optional alternatives: choose or reject them "
              + "for stated strategic reasons, not just because minerals "
              + "fit. Map routes are not certified by this arithmetic guide."
              : ""),
          contextSeed: { sessionId, roundKind: "candidate_proposals",
            proposalRound, provenanceHash: provenance.provenanceHash,
            enumerationReceiptHash: enumeration.receiptHash,
            ...(enableBudgetBranchGuidance ? {
              budgetBranchReceiptHash: budgetBranchGuide?.receiptHash ?? null,
            } : {}) },
        }), traceSink);
      const proposalOutput = proposalDeliberation.output;
      proposalTrace.outputNormalizationReceipt =
        proposalDeliberation.normalizationReceipt;
      proposalTrace.outputPruningReceipt =
        proposalDeliberation.pruningReceipt;
      proposalTrace.proposalDeduplicationReceipt =
        proposalDeliberation.proposalDeduplicationReceipt;
      proposalTrace.contextHash = hashStarcraftTmgContract({
        sessionId, roundKind: "candidate_proposals", proposalRound,
        provenanceHash: provenance.provenanceHash,
        enumerationReceiptHash: enumeration.receiptHash,
        ...(enableBudgetBranchGuidance ? {
          budgetBranchReceiptHash: budgetBranchGuide?.receiptHash ?? null,
        } : {}) });
      const proposalWarnings = [];
      activeNarrativeWarnings = proposalWarnings;
      let proposals;
      try {
        proposals = validateProposals(proposalOutput, menu, {
          allowSingleAfterIdenticalDedup:
            proposalDeliberation.proposalDeduplicationReceipt
              ?.operations.length > 0,
        });
      } finally {
        activeNarrativeWarnings = null;
      }
      proposalTrace.narrativeDisplayWarnings = proposalWarnings;
      proposalTrace.outputHash = hashStarcraftTmgContract(proposalOutput);
      proposalFeedback.length = 0;
      budgetFeedback.length = 0;
      for (const proposal of proposals) {
        if (seenCandidateIds.has(proposal.candidateId)) {
          proposalFeedback.push({
            candidateId: proposal.candidateId,
            feedbackKind: "duplicate_prior_candidate_id",
            rulesErrorCode: null,
            portErrorCode: null,
            rejectionKind: null,
            silentRepairAttempted: false,
          });
          continue;
        }
        seenCandidateIds.add(proposal.candidateId);
        const candidateInput = {
          sideKey, scaleId: engagementScale, mineralBudget, factionRecordKey,
          tacticalCardRecordKeys: proposal.tacticalCardRecordKeys,
          units: proposal.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            compositionKind: unit.compositionKind,
            upgrades: unit.upgrades,
          })),
        };
        const verdict = armyBuilderPort.evaluateRosterCandidate(
          clone(candidateInput));
        const legal = verdict.schema === ARMY_BUILDER_ROSTER_VERDICT_SCHEMA;
        if (!legal && verdict.schema !== ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA) {
          fail("ROSTER_STRATEGIST_PORT_RESPONSE_UNKNOWN");
        }
        const candidate = createRosterCandidateV1({
          candidateId: proposal.candidateId, sideKey, factionRecordKey,
          scaleId: engagementScale, mineralBudget,
          tacticalCardRecordKeys: proposal.tacticalCardRecordKeys,
          units: proposal.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            compositionKind: unit.compositionKind,
            upgradeSelections: unit.upgrades.map((upgrade) => ({
              upgradeName: upgrade.upgradeName })),
          })),
          legalityStatus: legal ? "legal" : "illegal",
          legalityReceipt: legal
            ? { auditResultHash: verdict.auditResultHash }
            : {
              rejectionReceiptHash: verdict.receiptHash,
              rulesErrorCode: verdict.rulesErrorCode
                || verdict.portErrorCode || "UNKNOWN",
              rejectionKind: verdict.rejectionKind,
            },
        });
        const row = freezeDeep({
          proposal: freezeDeep({ ...clone(proposal), sideKeySafe: sideKey }),
          candidateInput: freezeDeep(candidateInput),
          candidate,
          verdictOrRejection: verdict,
          proposalOrder: evaluated.length,
        });
        evaluated.push(row);
        if (legal) {
          legalProposals.push(row);
          if (!meetsAgentCompletionTarget(row)) {
            const spent = verdict.summary.mineralSpent;
            const floor = ROSTER_FORMAL_BUDGET_CONTRACT_V1
              .mineralUtilizationFloor;
            budgetFeedback.push({
              candidateId: proposal.candidateId,
              feedbackKind: requireExactBudgetForActive
                ? "legal_but_below_agent_exact_budget_target"
                : "legal_but_below_product_budget_floor",
              mineralBudget,
              mineralSpent: spent,
              shortfallToAgentCompletionTarget: requireExactBudgetForActive
                ? mineralBudget - spent : null,
              minimumSpendForFloor: Math.ceil(
                mineralBudget * floor.numerator / floor.denominator),
              shortfallToFloor: Math.max(0, Math.ceil(
                mineralBudget * floor.numerator / floor.denominator) - spent),
              nearCapThresholdMinerals,
              rulesLegal: true,
            });
          }
        } else {
          rejections.push(verdict);
          proposalFeedback.push({
            candidateId: proposal.candidateId,
            rulesErrorCode: verdict.rulesErrorCode || null,
            portErrorCode: verdict.portErrorCode || null,
            rejectionKind: verdict.rejectionKind,
            silentRepairAttempted: false,
          });
        }
      }
      proposalTrace.evaluatedCandidateHashes = evaluated.map((entry) => (
        entry.candidate.candidateHash));
      proposalTrace.legalCandidateCount = legalProposals.length;
      if (enableBudgetBranchGuidance
        && proposalRound < maxProposalRounds
        && !legalProposals.some(meetsAgentCompletionTarget)) {
        const guideSource = legalProposals
          .filter((entry) => !guidedCandidateHashes.has(
            entry.candidate.candidateHash))
          .sort((left, right) => right.verdictOrRejection.summary.mineralSpent
            - left.verdictOrRejection.summary.mineralSpent)[0];
        if (guideSource) {
          guidedCandidateHashes.add(guideSource.candidate.candidateHash);
          const receipt = queryRosterBudgetBranchesV1({
            armyBuilderPort,
            candidateInput: guideSource.candidateInput,
            maximumEvaluations: 12,
            maximumMutationDepth: 5,
          });
          budgetBranchReceipts.push(receipt);
          toolReceipts.push(createRosterToolReceiptReferenceV1({
            referenceId: `budget-ref-round-${proposalRound}`,
            receiptKind: "math", status: "attached",
            receiptHash: receipt.receiptHash,
            toolId: "roster-budget-branch-query-v1",
            querySummaryText: `Rules-audited budget branches for ${
              guideSource.proposal.candidateId}`,
          }));
          budgetBranchGuide = {
            receiptHash: receipt.receiptHash,
            sourceCandidateId: guideSource.proposal.candidateId,
            sourceCandidateHash: receipt.sourceCandidateHash,
            mineralBudget,
            sourceMineralShortfall: receipt.sourceMineralShortfall,
            exactBudgetImpossibilityClaimed: false,
            arithmeticOrderIsNotStrategyRanking: true,
            mapRouteCertifiedByThisGuide: false,
            nextPage: receipt.nextPage,
            alternatives: receipt.branches.slice(0, 8).map((branch) => ({
              branchId: branch.branchId,
              // The model's proposal schema does not accept Builder-owned
              // instance IDs or request metadata. Keep those in the sealed
              // receipt and expose only fields it can choose deliberately.
              proposalShape: {
                tacticalCardRecordKeys:
                  branch.candidateInput.tacticalCardRecordKeys,
                units: branch.candidateInput.units.map((unit) => ({
                  recordKey: unit.recordKey,
                  compositionKind: unit.compositionKind,
                  upgrades: unit.upgrades,
                })),
              },
              rulesAuditResultHash: branch.rulesAuditResultHash,
              mineralSpent: branch.mineralSpent,
              exactBudget: branch.exactBudget,
              steps: branch.steps,
            })),
          };
          proposalTrace.nextRoundBudgetGuideReceiptHash =
            receipt.receiptHash;
        }
      }
      trace.push(roundReceipt(proposalTrace));
    }
    if (legalProposals.length === 0) {
      fail("ROSTER_STRATEGIST_NO_LEGAL_CANDIDATE",
        JSON.stringify(proposalFeedback));
    }

    const candidateMapAccess = typeof laboratory.evaluateRosterRoute === "function"
      ? legalProposals.map((entry, index) => {
        const receipt = laboratory.evaluateRosterRoute({
          queryId: `${sessionId}:candidate-map-${index + 1}`,
          sideId: sideKey, candidateInput: entry.candidateInput,
        });
        toolReceipts.push(createRosterToolReceiptReferenceV1({
          referenceId: `mapref-candidate-${index + 1}`,
          receiptKind: "spatial", status: "attached",
          receiptHash: receipt.receiptHash,
          toolId: "pregame-map-evidence-port-v1",
          querySummaryText: `Rules base-clearance access for ${entry.proposal.candidateId}`,
        }));
        return { candidateId: entry.proposal.candidateId,
          receipt: clone(receipt) };
      }) : [];

    // ---------------------------------------- final round: comparison
    const comparisonRoundIndex = 2 + 2 * Number(Boolean(teachCycle))
      + proposalRound;
    const comparisonRoundKind = presetLock
      ? PLANNED_PRESET_DEEPENING_ROUND_KIND : "comparison_selection";
    const comparisonNodes = [
      sealNode("queried-evidence-results", "native_receipts_with_explicit_hypothesis_scope", {
        results: trace.flatMap(entry => clone(entry.informationNeedResults || [])),
        outcomes: trace.flatMap(entry => clone(entry.informationNeedOutcomes || [])),
        teachEvidence: clone(teachCycle?.evidenceReceipts || []),
        referenceOnlyIsNotAnAnswer: true,
      }),
      ...(missionMarkerScoringByActor ? [sealNode("mission-marker-scoring-by-actor",
        "source_bound_scoring_facts_not_strategy", {
          projection: clone(missionMarkerScoringByActor),
          numericMathInputsDoNotVerifyScoringPremises: true,
        })] : []),
      sealNode("frozen-context", "rules_and_source_frozen", {
        provenanceHash: provenance.provenanceHash,
        scoreRouteHash: scoreRoute.scoreRouteHash,
      }),
      sealNode("evaluated-candidates", "rules_owned_army_builder_port", {
        candidates: evaluated.map((entry) => ({
          candidateId: entry.proposal.candidateId,
          candidateHash: entry.candidate.candidateHash,
          legalityStatus: entry.candidate.legalityStatus,
          rationaleText: entry.proposal.rationaleText,
          mineralSpent: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.mineralSpent : null,
          vespeneSpent: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.vespeneSpent : null,
          startingSupply: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.startingSupply : null,
          // Budget-utilization context (sub-slice 269.14): per-candidate
          // unspent budget and near-cap flag derived from the Rules verdict
          // and the menu-derived threshold below — never from the model.
          mineralUnspent: entry.candidate.legalityStatus === "legal"
            ? mineralBudget - entry.verdictOrRejection.summary.mineralSpent
            : null,
          nearCap: entry.candidate.legalityStatus === "legal"
            ? (mineralBudget - entry.verdictOrRejection.summary.mineralSpent)
              < nearCapThresholdMinerals
            : null,
          // Formal budget acceptance context (Slice 272): whether this
          // candidate satisfies the versioned product-contract utilization
          // floor or the menu-derived near-cap exemption, plus the exact
          // utilization in basis points — recomputed from the Rules
          // verdict, never from the model.
          utilizationBasisPoints: entry.candidate.legalityStatus === "legal"
            ? Math.round(
              (entry.verdictOrRejection.summary.mineralSpent * 10_000)
                / mineralBudget)
            : null,
          meetsFormalBudgetFloor: entry.candidate.legalityStatus === "legal"
            ? ((mineralBudget - entry.verdictOrRejection.summary.mineralSpent)
                < nearCapThresholdMinerals
              || entry.verdictOrRejection.summary.mineralSpent
                * ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor
                  .denominator
                >= mineralBudget
                  * ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor
                    .numerator)
            : null,
          meetsAgentExactBudgetTarget: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.mineralSpent === mineralBudget
            : null,
          rulesErrorCode: entry.candidate.legalityStatus === "illegal"
            ? entry.candidate.legalityReceipt.rulesErrorCode : null,
          // Deterministic component identities (sub-slice 269.11, closing
          // the saved live round-8 blocker unit_binding:agent-unit-1): the
          // strict comparison binding rule requires these exact identities,
          // so the sealed context must publish them; they are derived
          // positionally from the candidate content, never invented, and
          // match the formats documented by the strict comparison schema.
          factionCardInstanceId: `${sideKey}-faction`,
          tacticalCards: entry.proposal.tacticalCardRecordKeys.map(
            (recordKey, tacticalIndex) => ({
              instanceId: `${sideKey}-tactical-${tacticalIndex + 1}`,
              recordKey })),
          units: entry.proposal.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            compositionKind: unit.compositionKind,
            compositionInstanceId: `${unit.unitInstanceId}-composition`,
            upgrades: unit.upgrades.map((upgrade, upgradeIndex) => ({
              upgradeName: upgrade.upgradeName,
              instanceId:
                `${unit.unitInstanceId}-upgrade-${upgradeIndex + 1}`,
            })),
          })),
        })),
        // Budget-utilization contract (sub-slice 269.14): unspent minerals
        // are lost (no carryover, no later spend), so budget residue is an
        // explicit strategic opportunity cost, never headroom. The
        // threshold is derived from the Rules-owned menu (cheapest positive
        // purchasable increment), never hard-coded per faction and never
        // forced to exact budget equality.
        budgetGuidance: {
          nearCapThresholdMinerals,
          nearCapThresholdDerivation:
            "cheapest_positive_purchasable_increment_in_rules_owned_menu",
          unspentResourceDisposition: "lost",
          unspentBudgetIsAnExplicitOpportunityCost: true,
          selectionRule: requireExactBudgetForActive
            ? "When an evaluated Rules-legal candidate spends exactly the "
              + "budget, select an exact-budget candidate. Otherwise the "
              + "chosen legal candidate remains a draft; unspent minerals "
              + "are lost and cannot count as a full-budget result."
            : "When any evaluated Rules-legal candidate is near-cap, "
              + "select one or declare a public retained-resource "
              + "justification; exact budget equality is not required.",
          exactBudgetEqualityNeverForced: !requireExactBudgetForActive,
          agentCompletionPolicyVersion: requireExactBudgetForActive
            ? "agent_exact_budget_or_draft_v1" : "legacy_floor_v1",
          agentCompletionTargetMinerals: requireExactBudgetForActive
            ? mineralBudget : null,
          // Formal budget acceptance contract (Slice 272): the versioned
          // product-contract utilization floor, displayed in the planning
          // UI. Selecting a candidate that does not meet the floor while a
          // compliant Rules-legal candidate is available fails closed; if
          // no evaluated legal candidate meets the floor, the plan closes
          // as draft with budgetAcceptance unmet — never as an active
          // final formal success. The budget and menu stay
          // Rules/Builder-owned; only the tolerance is a product value.
          formalBudgetFloor: {
            mineralUtilizationFloorNumerator:
              ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor
                .numerator,
            mineralUtilizationFloorDenominator:
              ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor
                .denominator,
            utilizationFloorBasisPoints: Math.round(
              (ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor
                .numerator * 10_000)
                / ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor
                  .denominator),
            contractVersion: ROSTER_FORMAL_BUDGET_CONTRACT_V1.version,
            contractHash: ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash,
            nearCapExemptionThresholdMinerals: nearCapThresholdMinerals,
            vespeneFormalCap: Math.floor(
              (menu.vespeneLimitForBudget?.numerator ?? 0)
                / (menu.vespeneLimitForBudget?.denominator ?? 1)),
            toleranceDisplayTextZh:
              ROSTER_FORMAL_BUDGET_CONTRACT_V1.toleranceDisplayTextZh,
            toleranceDisplayTextEn:
              ROSTER_FORMAL_BUDGET_CONTRACT_V1.toleranceDisplayTextEn,
          },
          formalBudgetFloorSelectionRule: requireExactBudgetForActive
            ? "The 90% floor is historical compatibility only. Select a "
              + "candidate whose meetsAgentExactBudgetTarget is true if "
              + "one is available. Copy the historical floor echo fields "
              + "truthfully, but do not treat them as Agent completion."
            : "Select a candidate whose meetsFormalBudgetFloor is true "
              + "when available; copy the floor echo fields truthfully; "
              + "severe underspend with no compliant candidate is draft.",
          runtimeNeverRanksCandidates: true,
        },
        laboratoryNeverRanks: true,
        hostPreferenceWeights: false,
      }),
      sealNode("strategy-foundation", "agent_deliberation_public", {
        scoreRoute: foundation.scoreRoute,
        opponentHypotheses: foundation.opponentHypotheses,
        counterResponses: foundation.counterResponses,
        invalidationTriggers: foundation.invalidationTriggers,
      }),
      ...(requireSelectionJustification ? [sealNode("selection-argument-requirements",
        "public_evidence_coverage_not_strategy_ranking", {
          policyVersion: ROSTER_SELECTION_JUSTIFICATION_POLICY_V1,
          instruction: ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1,
          unitRules: clone(selectionUnitRules), menu: clone(menu),
          skillReferences: route.skillRefs.map(ref => ({
            referenceId: `skill:${ref.skillId}`, skillHash: ref.skillHash })),
          toolReferences: clone(toolReceipts),
          originalSelectionPurpose: clone(agentSelectedStrategySource.plan),
        })] : []),
      ...(candidateMapAccess.length ? [sealNode("candidate-map-access",
        "rules_frozen_base_clearance_audit_advisory", {
          candidates: candidateMapAccess,
          routeWitnessesAreNotExactMovesOrFormationProof: true,
          unknownAccessMustRemainUnknown: true,
        })] : []),
      ...(presetLock ? [sealNode("locked-preset-roster",
        requireSelectionJustification ? "rules_verified_current_teach_snapshot"
          : "rules_verified_immutable_room_roster", {
          lockHash: presetLock.lockHash,
          baselinePlanHash: presetLock.baselinePlan.planHash,
          candidateHash: presetLock.candidate.candidateHash,
          auditResultHash: presetLock.verdict.auditResultHash,
          candidateSelectionAllowed: false,
          ...(requireSelectionJustification ? { lockScope: "this_teach_snapshot_only",
            rosterAndArrivalMayBeReopenedAfterTeach: true } : {}),
        })] : []),
      ...buildArrivalScheduleEvidenceNodesV1(agentSelectedArrivalSchedule),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: comparisonRoundKind,
        fields: presetLock
          ? ["componentPurposes", "deploymentConcept",
            "resourceUtilization", "lossResourceBudget", "publicSummaryText",
            ...(requireSelectionJustification ? ["selectionJustification"] : [])]
          : ["comparison", "componentPurposes", "deploymentConcept",
            "resourceUtilization", "lossResourceBudget", "publicSummaryText"],
        selectedCandidateMustBeRulesLegal: true,
        ...(presetLock ? { candidateSelectionAllowed: false } : {}),
        publicFieldsOnly: true,
        envelopeAtTopLevelNoChannelsWrapper: true,
        outputSchemaName: presetLock
          ? selectionDeepeningContract.schemaName
          : rosterStrategistRoundOutputContractV1("comparison_selection")
            .schemaName,
        strictProviderJsonSchemaEnforced: true,
      }),
    ];
    let comparisonTrace = {
      roundIndex: comparisonRoundIndex, roundKind: comparisonRoundKind,
      outputContractRef: presetLock
        ? selectionDeepeningRef
        : rosterStrategistRoundOutputContractRefV1("comparison_selection"),
      promptNodeHashes: comparisonNodes.map((node) => node.nodeHash),
      informationNeedOutcomes: [],
    };
    const initialComparisonRequest = buildRoundRequest({
        sessionId, roundIndex: comparisonRoundIndex,
        roundKind: comparisonRoundKind,
        nodes: comparisonNodes,
        userMessage: requireSelectionJustification
          ? ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1
            + " Deepen this exact snapshot, completing every public component, "
            + "deployment and selectionJustification field."
          : agentSelectedArrivalSchedule
          ? "Deepen the Agent-selected exact roster without changing a "
            + "model, upgrade, card or first-arrival round. The technical "
            + "lock does not make this a user preset. Every deployment, "
            + "activation, support and casualty claim must respect the "
            + "Rules-checked arrival schedule; a Unit in Reserves cannot "
            + "act or be lost on the table. Give public strategic reasons "
            + "and keep uncertain map moves conditional. Complete every "
            + "required field and roster component, but avoid repeating the "
            + "full mission rule, roster list or arrival schedule in each "
            + "field. Give each component its distinct purpose and tradeoff "
            + "in one or two concise sentences; describe each activation "
            + "step once, with its map condition and fallback. Keep genuine "
            + "uncertainty and counterplay visible rather than padding or "
            + "omitting strategic evidence."
          : presetLock
          ? "The Rules-verified preset roster is immutable. Deepen the "
            + "revised score route into public component purposes, deployment, "
            + "reinforcement, threat/trade and loss-resource plans for this "
            + "exact roster. Acknowledge unspent minerals as lost. Do not "
            + "propose, compare, select or modify any roster. Public fields "
            + "only; never emit hidden chain-of-thought."
          : "Compare the evaluated candidates on the public evidence "
            + "(score route, hypotheses, tool receipts, Rules verdicts), "
            + (requireExactBudgetForActive
              ? "select an exact-budget Rules-legal candidate if available "
                + "(otherwise only a draft can result), "
              : "select exactly one Rules-legal candidate, ")
            + "and declare public "
            + "component purposes, deployment concept, loss budget and a "
            + "public summary. Public fields only; never emit hidden "
            + "chain-of-thought.",
        contextSeed: { sessionId, roundKind: comparisonRoundKind,
          provenanceHash: provenance.provenanceHash,
          candidateHashes: evaluated.map((entry) => entry.candidate.candidateHash),
          mapAccessReceiptHashes: candidateMapAccess.map((entry) =>
            entry.receipt.receiptHash),
          ...(presetLock ? { presetLockHash: presetLock.lockHash } : {}),
          ...(agentSelectedArrivalSchedule ? { arrivalScheduleHash:
             agentSelectedArrivalSchedule.scheduleHash } : {}),
           ...(requireSelectionJustification ? {
             selectionJustificationPolicyVersion: ROSTER_SELECTION_JUSTIFICATION_POLICY_V1,
             selectionEvidenceNodeHashes: comparisonNodes.map(node => node.nodeHash),
           } : {}) },
        ...(presetLock ? {
          outputContract: selectionDeepeningContract,
          outputContractRef: selectionDeepeningRef,
          promptPack: presetPromptPack,
          decisionCandidateSource: "rules_verified_immutable_room_roster_only",
        } : {}),
      });
    let comparisonRequest = initialComparisonRequest;
    let comparisonSelection;
    let selectionJustification = null;
    // Keep the first request/context byte-compatible with retained paid
    // replies. Only a known output-contract rejection adds a correction
    // request. Replaying its deterministic lineage also reuses any already
    // paid corrections, so restarting cannot reset this three-attempt limit.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const comparisonDeliberation = await deliberateRound(deliberation,
        comparisonRequest, traceSink);
      const selectionRepair = presetLock
      ? { output: comparisonDeliberation.output, receipt: null }
      : recoverRosterComparisonSelectionFromQuotedEvidenceV1({
        output: comparisonDeliberation.output, evaluated });
    const selectedForPurposeBinding = presetLock ? evaluated[0]
      : evaluated.find((entry) => entry.proposal.candidateId
        === selectionRepair.output?.comparison?.selectedCandidateId);
    const purposeAlias = normalizeRosterComponentPurposeParentAliasV1({
      output: selectionRepair.output, selected: selectedForPurposeBinding,
    });
    const comparisonOutput = purposeAlias.output;
    comparisonTrace.selectionRepairReceipt = selectionRepair.receipt;
    comparisonTrace.componentPurposeAliasReceipt = purposeAlias.receipt;
    comparisonTrace.outputNormalizationReceipt =
      comparisonDeliberation.normalizationReceipt;
    comparisonTrace.outputPruningReceipt =
      comparisonDeliberation.pruningReceipt;
    comparisonTrace.contextHash = comparisonRequest.contextHash;
    comparisonTrace.outputHash = hashStarcraftTmgContract(comparisonOutput);
    const comparisonWarnings = [];
    activeNarrativeWarnings = comparisonWarnings;
    try {
      comparisonSelection = validateComparison(comparisonOutput,
        evaluated, { nearCapThresholdMinerals, mineralBudget },
        { lockedCandidateId: presetLock?.candidate.candidateId ?? null,
          requireExactBudgetForActive, requireSelectionJustification });
      if (requireSelectionJustification) {
        selectionJustification = validateRosterSelectionJustificationV1({
          justification: comparisonOutput.selectionJustification,
          candidate: selectedForPurposeBinding.candidate,
          unitRules: selectionUnitRules,
          supportRules: input.selectionSupportRules || [],
          evidenceRefs: [...toolReceipts.map(ref => ref.referenceId),
            ...route.skillRefs.map(ref => `skill:${ref.skillId}`),
            ...rosterSelectionPromptEvidenceV1(comparisonNodes)
              .map(ref => ref.referenceId)],
        });
        const argumentsProjection = projectRosterSelectionArgumentsV1(
          selectionJustification.justification, comparisonSelection.componentPurposes,
          comparisonSelection.publicSummaryText);
        comparisonSelection = { ...comparisonSelection, ...argumentsProjection };
      }
    } catch (error) {
      const code = String(error?.message || error).split(":")[0];
      // Scope is the model-owned comparison/deepening output, not network,
      // unknown dispatches, Rules state, credentials or immutable lock drift.
      if (!["ROSTER_STRATEGIST_COMPARISON_INVALID",
        "ROSTER_STRATEGIST_OUTPUT_INVALID",
        "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID",
        "ROSTER_PLAN_COMPONENT_PURPOSE_DUPLICATE",
        "ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE"].includes(code)) throw error;
      comparisonTrace.contractRejection = {
        code, detail: String(error?.message || error), attempt: attempt + 1,
        details: clone(error?.details ?? null),
        maximumAttempts: 3, repairScope: "comparison_public_output_only",
      };
      comparisonTrace.narrativeDisplayWarnings = comparisonWarnings;
      trace.push(roundReceipt(comparisonTrace));
      if (attempt === 2) throw error;
      const repairNode = sealNode("roster-output-contract-repair",
        "platform_contract_feedback_not_strategy", {
          failure: clone(comparisonTrace.contractRejection),
          rejectedOutput: clone(comparisonDeliberation.output),
          rejectedOutputHash: hashStarcraftTmgContract(
            comparisonDeliberation.output),
          evaluatedCandidates: evaluated.map(entry => ({
            candidateHash: entry.candidate.candidateHash,
            candidateId: entry.proposal.candidateId,
            sideKey: entry.proposal.sideKeySafe,
            units: clone(entry.proposal.units),
            tacticalCardRecordKeys: clone(entry.proposal.tacticalCardRecordKeys),
          })),
          rosterAndArrivalScheduleLocked: Boolean(presetLock),
          hostStrategyEditsAllowed: false,
          instruction: "Return the complete same public output contract with "
            + "the named contract error corrected. Each componentKind and "
            + "instanceId pair is unique. Preserve meaningful intent, use "
            + "only the already evaluated roster identities and keep all "
            + "locked roster/arrival facts unchanged. Do not echo this "
            + "feedback as output or invent Rules evidence.",
        });
      comparisonRequest = {
        ...initialComparisonRequest,
        roundIndex: comparisonRoundIndex + attempt + 1,
        promptNodes: [...comparisonNodes, repairNode],
        userMessage: initialComparisonRequest.userMessage + " Correct the "
          + "attached output-contract rejection without restarting Teach "
          + "or changing a locked roster/arrival schedule.",
        contextHash: hashStarcraftTmgContract({
          originalContextHash: initialComparisonRequest.contextHash,
          repairNodeHash: repairNode.nodeHash, attempt: attempt + 1,
        }),
      };
      comparisonTrace = {
        roundIndex: comparisonRequest.roundIndex,
        roundKind: comparisonRoundKind,
        outputContractRef: initialComparisonRequest.responseFormat.outputContractRef,
        promptNodeHashes: comparisonRequest.promptNodes.map(node => node.nodeHash),
        informationNeedOutcomes: [],
        correctionOfOutputHash: comparisonTrace.outputHash,
      };
      continue;
    } finally {
      activeNarrativeWarnings = null;
    }
    comparisonTrace.narrativeDisplayWarnings = comparisonWarnings;
    break;
    }
    const selected = presetLock ? evaluated[0]
      : evaluated.find((entry) => (
        entry.proposal.candidateId
          === comparisonSelection.comparison.selectedCandidateId));

    const comparison = presetLock ? null : createRosterCandidateComparisonV1({
      comparisonId: `${sessionId}-comparison-1`,
      candidateHashes: evaluated.map((entry) => entry.candidate.candidateHash),
      basisTexts: comparisonSelection.comparison.basisTexts,
      tradeoffTexts: comparisonSelection.comparison.tradeoffTexts,
      selectionStatus: "selected",
      selectedCandidateHash: selected.candidate.candidateHash,
      receiptReferenceIds: toolReceipts.map((receipt) => receipt.referenceId),
    });
    comparisonTrace.comparisonHash = comparison?.comparisonHash ?? null;
    trace.push(roundReceipt(comparisonTrace));

    // Final legality is re-proven through the Rules-owned port at plan time.
    const finalVerdict = armyBuilderPort.evaluateRosterCandidate(
      clone(selected.candidateInput));
    if (finalVerdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
      || finalVerdict.auditResultHash
        !== selected.candidate.legalityReceipt.auditResultHash) {
      fail("ROSTER_STRATEGIST_FINAL_LEGALITY_DRIFT");
    }

    // Comparison chooses the roster, not the opening on-table subset. Keep
    // its paid reply intact and ask a separate, versioned public round for
    // first arrivals. The existing Rules-owned Supply calculator rejects
    // omissions, invented Unit IDs and every finite-round overfill.
    const missionProfile = missionAuthority.resultStatus === "derivable"
      ? missionAuthority.missionScoringProfile : null;
    let openingDeploymentSchedule = null;
    let scheduledDeploymentConcept = null;
    let scheduledPublicSummaryText = null;
    if (!presetLock && missionProfile) {
      const supplyAuthority = {
        armyAuditResultHash: finalVerdict.auditResultHash,
        missionScoringProfileHash: missionProfile.missionScoringProfileHash,
        gameLengthRounds: missionProfile.gameLengthRounds,
        startingSupply: missionProfile.startingSupply,
        extraSupplyPerRound: missionProfile.extraSupplyPerRound,
        units: finalVerdict.audit.units.map((unit) => ({
          unitInstanceId: unit.unitInstanceId,
          startingSupply: unit.unitCompositionResult.startingSupply,
        })),
        finalRoundUnlimited: true,
        placementAndPathVerified: false,
      };
      const baseNodes = [
        sealNode("selected-roster", "rules_verified_immutable_roster", {
          candidate: selected.candidate,
          auditResultHash: finalVerdict.auditResultHash,
          rosterMayNotChange: true,
        }),
        sealNode("round-supply-authority",
          "rules_owned_army_and_mission_audits", supplyAuthority),
        sealNode("selected-strategy", "agent_deliberation_public", {
          scoreRoute, opponentHypotheses, counterResponses,
          deploymentConcept: comparisonSelection.deploymentConcept,
          publicSummaryText: comparisonSelection.publicSummaryText,
        }),
        sealNode("response-schema", "platform", {
          roundKind: AGENT_ARRIVAL_SCHEDULE_ROUND_KIND,
          outputSchemaName:
            AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1.schemaName,
          fields: ["openingDeploymentSchedule",
            "revisedDeploymentConcept", "publicSummaryText"],
          publicFieldsOnly: true,
          strictProviderJsonSchemaEnforced: true,
        }),
      ];
      const baseContextSeed = {
        sessionId, roundKind: AGENT_ARRIVAL_SCHEDULE_ROUND_KIND,
        provenanceHash: provenance.provenanceHash,
        selectedCandidateHash: selected.candidate.candidateHash,
        armyAuditResultHash: finalVerdict.auditResultHash,
        missionScoringProfileHash: missionProfile.missionScoringProfileHash,
        comparisonHash: comparison.comparisonHash,
      };
      const firstMessage = "The selected Rules-legal roster is now fixed. "
            + "Choose the first deployment round for every Unit exactly "
            + "once. All Units start in Reserves. Do not exceed the "
            + "cumulative on-table Supply capacity in any finite round; "
            + "the final round is unlimited. Give a public reason for each "
            + "arrival, then align deployment concept and summary with "
            + "those arrival windows and the existing victory plan. "
            + "Do not change roster, invent Supply, claim exact placement "
            + "or path legality, or emit hidden reasoning.";
      let priorRejection = null;
      // At most three model-owned attempts. A failed Rules check becomes a
      // typed, source-bound correction question; the Host never moves a Unit
      // to a later round on the model's behalf.
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const roundIndex = comparisonRoundIndex + attempt;
        const nodes = priorRejection
          ? [...baseNodes, sealNode("prior-arrival-rejection",
            "rules_owned_correction_evidence", priorRejection)]
          : baseNodes;
        const contextSeed = priorRejection
          ? { ...baseContextSeed, correctionOfOutputHash:
              priorRejection.outputHash,
            rulesRejectionCode: priorRejection.code,
            rulesRejectionDetails: priorRejection.details }
          : baseContextSeed;
        const scheduleTrace = {
          roundIndex, roundKind: AGENT_ARRIVAL_SCHEDULE_ROUND_KIND,
          attemptOrdinal: attempt,
          outputContractRef: AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_REF_V1,
          promptNodeHashes: nodes.map((node) => node.nodeHash),
          informationNeedOutcomes: [],
          ...(priorRejection ? { correctionOfOutputHash:
            priorRejection.outputHash } : {}),
        };
        const scheduleDeliberation = await deliberateRound(deliberation,
          buildRoundRequest({ sessionId, roundIndex,
            roundKind: AGENT_ARRIVAL_SCHEDULE_ROUND_KIND, nodes,
            userMessage: priorRejection
              ? "The previous public arrival schedule failed the "
                + "Rules-owned check stated in prior-arrival-rejection. "
                + "Capacity is cumulative on the table, not new arrivals "
                + "per round: already deployed Units still count in every "
                + "later round. Rechoose first-arrival rounds for every "
                + "Unit exactly once, explain the changed choices, and "
                + "align deployment prose and summary. Do not alter the "
                + "roster, Supply values or Rules verdict; do not output "
                + "hidden reasoning."
              : firstMessage,
            contextSeed,
            outputContract: AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1,
            outputContractRef:
              AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_REF_V1,
            decisionCandidateSource:
              "agent_round_selection_for_rules_verified_roster_only",
          }), traceSink);
        const output = scheduleDeliberation.output;
        scheduleTrace.contextHash = hashStarcraftTmgContract(contextSeed);
        scheduleTrace.outputHash = hashStarcraftTmgContract(output);
        scheduleTrace.outputNormalizationReceipt =
          scheduleDeliberation.normalizationReceipt;
        scheduleTrace.outputPruningReceipt =
          scheduleDeliberation.pruningReceipt;
        try {
          validateEnvelope(output, AGENT_ARRIVAL_SCHEDULE_ROUND_KIND);
          exactKeys(output, ["schemaVersion", "roundKind",
            "openingDeploymentSchedule", "revisedDeploymentConcept",
            "publicSummaryText"], "ROSTER_STRATEGIST_ARRIVAL_INVALID");
          openingDeploymentSchedule = createPlannedPresetRoundSupplyScheduleV1({
            proposedEntries: output.openingDeploymentSchedule,
            rosterCandidate: selected.candidate,
            armyAudit: finalVerdict.audit,
            missionProfile,
          });
          scheduledDeploymentConcept = createRosterDeploymentConceptV1(
            output.revisedDeploymentConcept);
          const selectedUnitIds = new Set(selected.candidate.units.map(
            (unit) => unit.unitInstanceId));
          if (scheduledDeploymentConcept.activationOrder.some((entry) =>
            !selectedUnitIds.has(entry.unitInstanceId))) {
            fail("ROSTER_STRATEGIST_ARRIVAL_ACTIVATION_UNIT_INVALID");
          }
          scheduledPublicSummaryText = narrative(output.publicSummaryText,
            "ROSTER_STRATEGIST_ARRIVAL_INVALID",
            { path: "publicSummaryText" });
          scheduleTrace.scheduleHash = openingDeploymentSchedule.scheduleHash;
          trace.push(roundReceipt(scheduleTrace));
          break;
        } catch (error) {
          const code = String(error?.message || error).split(":")[0];
          if (!code.startsWith("PLANNED_PRESET_ROUND_SUPPLY_")
            && !["ROSTER_STRATEGIST_ARRIVAL_INVALID",
              "ROSTER_STRATEGIST_ARRIVAL_ACTIVATION_UNIT_INVALID",
              "ROSTER_STRATEGIST_OUTPUT_INVALID"].includes(code)) {
            throw error;
          }
          scheduleTrace.rulesRejection = {
            code, details: clone(error?.details ?? null),
          };
          trace.push(roundReceipt(scheduleTrace));
          if (attempt === 3) throw error;
          priorRejection = {
            outputHash: scheduleTrace.outputHash, code,
            details: clone(error?.details ?? null),
            proposedSchedule: clone(output.openingDeploymentSchedule ?? null),
            rosterCandidateHash: selected.candidate.candidateHash,
            missionScoringProfileHash:
              missionProfile.missionScoringProfileHash,
          };
        }
      }
    }

    const componentPurposes = comparisonSelection.componentPurposes.map((entry) => (
      createRosterComponentPurposeV1(entry)));
    const deploymentConcept = scheduledDeploymentConcept
      || createRosterDeploymentConceptV1(
        comparisonSelection.deploymentConcept);
    const lossResourceBudget = comparisonSelection.lossResourceBudget
      ? createRosterLossResourceBudgetV1({
        lossBudgetStatus: comparisonSelection.lossResourceBudget.lossBudgetStatus,
        plannedLossBudget:
          comparisonSelection.lossResourceBudget.plannedLossBudget,
        mineralSpendIntent: {
          status: "declared",
          mineralBudget,
          plannedMineralSpend: finalVerdict.summary.mineralSpent,
        },
      })
      : createRosterLossResourceBudgetV1({
        lossBudgetStatus: "unknown",
        mineralSpendIntent: {
          status: "declared",
          mineralBudget,
          plannedMineralSpend: finalVerdict.summary.mineralSpent,
        },
      });

    // A locked preset keeps the exact existing roster and its version chain;
    // formal budget acceptance controls only whether this deepened plan may
    // close as active.
    const budgetAcceptance = createRosterPlanBudgetAcceptanceV1({
      mineralBudget,
      mineralSpent: finalVerdict.summary.mineralSpent,
      nearCapThresholdMinerals,
      vespeneSpent: finalVerdict.summary.vespeneSpent,
      vespeneLimitNumerator: menu.vespeneLimitForBudget?.numerator ?? 1,
      vespeneLimitDenominator: menu.vespeneLimitForBudget?.denominator ?? 1,
    });
    const formalBudgetMet =
      budgetAcceptance.status !== "unmet_severe_underspend";
    const agentExactBudgetTargetMet = !requireExactBudgetForActive
      || finalVerdict.summary.mineralSpent === mineralBudget;
    const mapReadiness = evaluatePregameMapReadinessV1({
      mapSummary, candidateMapAccess,
      selectedCandidateId: selected.candidate.candidateId,
    });
    const mapReadyForActive = !requireCertifiedMapForActive
      || mapReadiness.status === "certified_route_evidence";
    const planInput = {
      planId,
      planVersion: presetLock
        ? presetLock.baselinePlan.planVersion + 1 : 1,
      planStatus: formalBudgetMet && agentExactBudgetTargetMet
        && mapReadyForActive
        && (presetLock || openingDeploymentSchedule)
        ? "active" : "draft", sideKey,
      provenance,
      rosterCandidate: selected.candidate,
      scoreRoute,
      lossResourceBudget,
      componentPurposes,
      deploymentConcept,
      opponentHypotheses,
      counterResponses,
      invalidationTriggers,
      revisions: [],
      comparisons: comparison ? [comparison] : [],
      toolReceiptReferences: toolReceipts,
      publicSummaryText: scheduledPublicSummaryText
        || comparisonSelection.publicSummaryText,
      budgetAcceptance,
    };
    const basePlan = presetLock
      ? createPlannedPresetRosterPlanV2({
        ...planInput, baselinePlan: presetLock.baselinePlan,
        ...(agentSelectedArrivalSchedule ? { openingDeploymentSchedule:
          agentSelectedArrivalSchedule } : {}),
      })
      : createRosterPlanV1(planInput);
    const plan = !presetLock && openingDeploymentSchedule
      && basePlan.planStatus === "active"
      ? createAgentScheduledRosterPlanV1({
        sourcePlan: basePlan, openingDeploymentSchedule,
        armyAudit: finalVerdict.audit, missionProfile,
      }) : basePlan;
    if (presetLock) verifyPlannedPresetRosterPlanRoundTripV2(plan);
    else if (plan === basePlan) verifyRosterPlanRoundTripV1(plan);
    else verifyAgentScheduledRosterPlanRoundTripV1(plan);

    const sessionReceipt = hashedReceipt({
      schema: presetLock
        ? ROSTER_STRATEGIST_PRESET_SESSION_RECEIPT_SCHEMA
        : ROSTER_STRATEGIST_SESSION_RECEIPT_SCHEMA,
      sessionId,
      planId: plan.planId,
      planHash: plan.planHash,
      planStatus: plan.planStatus,
      rosterCandidateHash: selected.candidate.candidateHash,
      finalAuditResultHash: finalVerdict.auditResultHash,
      finalVerdictHash: finalVerdict.verdictHash,
      mineralSpent: finalVerdict.summary.mineralSpent,
      vespeneSpent: finalVerdict.summary.vespeneSpent,
      provenanceHash: provenance.provenanceHash,
      enumerationReceiptHash: enumeration.receiptHash,
      skillRouteReceiptHash: route.receipt.receiptHash,
      comparisonHash: comparison?.comparisonHash ?? null,
      ...(selectionJustification ? { selectionJustificationPolicyVersion:
        ROSTER_SELECTION_JUSTIFICATION_POLICY_V1,
        selectionArgumentCoverageComplete: true,
        selectionArgumentSourceTruthReviewed: false,
        selectionArgumentStrategicSuperiorityProven: false } : {}),
      ...(presetLock ? {
        planningMode: "planned_preset_locked_roster",
        baselinePlanHash: presetLock.baselinePlan.planHash,
        presetRosterLockHash: presetLock.lockHash,
        presetDeepeningOutputContractHash:
          selectionDeepeningRef.hash,
      } : {}),
      ...(teachCycle ? { teachCycleHash: teachCycle.cycleHash,
        teachReview: {
          challengeTargetCanonicalizations:
            teachCycle.challengeTargetNormalizations.length,
          unsupportedEvidenceReferences:
            teachCycle.answerEvidenceNormalizations.length,
          unsupportedAnswerDemotions:
            teachCycle.answerDispositionDemotions.length,
          retainedTargetChangeWarnings:
            clone(teachCycle.retainedTargetChangeWarnings),
        } } : {}),
      roundReceiptHashes: trace.map((entry) => entry.receiptHash),
      toolReceiptReferenceHashes: toolReceipts.map((entry) => entry.referenceHash),
      rejectionReceiptHashes: rejections.map((entry) => entry.receiptHash),
      deliberationCallCount: deliberationReceipts.length,
      deliberationReceiptHashes: deliberationReceipts.map((entry) => (
        entry?.receiptHash ?? null)),
      deliberationKind: deliberationDescriptor.kind,
      modelVersion: deliberationDescriptor.modelVersion,
      promptVersion: deliberationDescriptor.promptVersion,
      outputNormalizationAliasRegistryVersion:
        ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
      outputNormalizationReceiptHashes: trace.map((entry) => (
        entry.outputNormalizationReceipt?.receiptHash ?? null)),
      outputPruningReceiptHashes: trace.map((entry) => (
        entry.outputPruningReceipt?.receiptHash ?? null)),
      outputContractSetHash:
        ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
      structuredGenerationEnforced: true,
      // Schedule-grounding and budget-utilization outcomes (sub-slices
      // 269.13/269.14), bound publicly in the session receipt.
      missionScoringAuthorityStatus: missionAuthority.resultStatus,
      missionScoringAuthorityReceiptHash: missionAuthority.receiptHash,
      scoreRouteAuthorityStatus: foundation.scoreRouteAuthority.status,
      nearCapThresholdMinerals,
      nearCapLegalCandidateAvailable:
        comparisonSelection.resourceUtilization.nearCapCandidateAvailable,
      selectedCandidateNearCap:
        comparisonSelection.resourceUtilization.selectedCandidateNearCap,
      // Formal budget acceptance outcomes (Slice 272), bound publicly:
      // whether the selection met the versioned product-contract floor (or
      // the menu-derived near-cap exemption), the exact utilization, the
      // vespene-cap compliance and the closing plan status consequence.
      formalBudgetContractVersion: ROSTER_FORMAL_BUDGET_CONTRACT_V1.version,
      formalBudgetContractHash: ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash,
      budgetFloorCandidateAvailable:
        comparisonSelection.resourceUtilization.budgetFloorCandidateAvailable,
      selectedCandidateMeetsFormalBudgetFloor:
        comparisonSelection.resourceUtilization
          .selectedCandidateMeetsBudgetFloor,
      budgetAcceptanceStatus: budgetAcceptance.status,
      mineralUtilizationBasisPoints:
        budgetAcceptance.utilizationBasisPoints,
      vespeneWithinFormalCap: budgetAcceptance.vespeneWithinFormalCap,
      severeUnderspendClosedAsDraft: !formalBudgetMet,
      agentCompletionPolicyVersion: requireExactBudgetForActive
        ? "agent_exact_budget_or_draft_v1" : "legacy_floor_v1",
      agentExactBudgetTargetRequired: requireExactBudgetForActive,
      agentExactBudgetTargetMet: agentExactBudgetTargetMet,
      agentExactBudgetShortfallMinerals: requireExactBudgetForActive
        ? mineralBudget - finalVerdict.summary.mineralSpent : null,
      agentExactBudgetCandidateAvailable: requireExactBudgetForActive
        ? legalProposals.some((entry) =>
          entry.verdictOrRejection.summary.mineralSpent === mineralBudget)
        : null,
      agentExactBudgetClosedAsDraft: requireExactBudgetForActive
        && !agentExactBudgetTargetMet,
      mapEvidencePolicyVersion: requireCertifiedMapForActive
        ? "certified_route_or_draft_v1" : "legacy_map_advisory_v1",
      mapEvidenceStatus: mapReadiness.status,
      mapEvidenceUnknownReason: mapReadiness.reason,
      mapSummaryReceiptHash: mapReadiness.mapSummaryReceiptHash,
      selectedRouteReceiptHash: mapReadiness.selectedRouteReceiptHash,
      mapEvidenceClosedAsDraft: requireCertifiedMapForActive
        && !mapReadyForActive,
      retainedResourceJustificationStatus:
        comparisonSelection.resourceUtilization
          .retainedResourceJustificationStatus,
      narrativeCapacityPolicy:
        "display_target_soft_warning_full_text_preserved_v1",
      narrativeDisplayWarningCount: trace.reduce((sum, entry) => (
        sum + (entry.narrativeDisplayWarnings?.length || 0)), 0),
      selectedByAgentDeliberation: !presetLock,
      openingDeploymentScheduleHash:
        openingDeploymentSchedule?.scheduleHash ?? null,
      arrivalScheduleOutputContractHash:
        openingDeploymentSchedule
          ? AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_REF_V1.hash : null,
      hostPreferenceWeights: false,
      hiddenChainOfThoughtRequested: false,
      hiddenChainOfThoughtPersisted: false,
      rulesRemainSoleLegalityAuthority: true,
      unknownStaysUnknown: true,
      trainingTruth: false,
    });

    return freezeDeep({
      plan,
      openingDeploymentSchedule,
      finalVerdict,
      provenance,
      enumerationReceipt: enumeration,
      skillRoute: route,
      candidates: evaluated.map((entry) => entry.candidate),
      candidateInputs: evaluated.map((entry) => clone(entry.candidateInput)),
      rejections,
      comparison,
      ...(selectionJustification ? { selectionJustification } : {}),
      ...(presetLock ? { presetRosterLock: presetLock } : {}),
      toolReceiptReferences: toolReceipts,
      planningTrace: trace,
      ...(teachCycle ? { teachCycle } : {}),
      deliberationReceipts: deliberationReceipts.map((entry) => clone(entry)),
      budgetBranchReceipts: budgetBranchReceipts.map((entry) => clone(entry)),
      sessionReceipt,
    });
  }

  async function planRoster(sessionInput = {}, options = {}) {
    return planRosterInternal(sessionInput, options);
  }

  async function planPresetRoster(sessionInput = {}, options = {}) {
    if (!options.presetRosterLock) {
      fail("ROSTER_STRATEGIST_PRESET_LOCK_REQUIRED");
    }
    if (!options.teachPorts) {
      fail("ROSTER_STRATEGIST_PRESET_TEACH_REQUIRED");
    }
    return planRosterInternal(sessionInput, options,
      options.presetRosterLock);
  }

  // -------------------------------------------------------- revise plan

  async function repairReviewedClaims(request, deliberation,
    reasonText, triggerIds, revisedSectionKeys) {
    const plan = request.plan;
    const presetRevision = plan.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA;
    const code = "ROSTER_STRATEGIST_CLAIM_REPAIR_INVALID";
    const userRequestedRevision = request.revisionPurpose
      === "user_requested_claim_revision_v1";
    const teachFeedbackRevision = request.revisionPurpose === 'teach_feedback_revision_v1';
    const publicClaims = new Map(rosterPublicClaimTextEntriesV1(plan));
    const allowed = new Set([...publicClaims].filter(([, text]) => typeof text === "string")
      .map(([path]) => path));
    const purposeByPath = new Map();
    for (const purpose of plan.componentPurposes || []) {
      const claimPath = `componentPurposes.${purpose.instanceId}`;
      purposeByPath.set(claimPath, purposeByPath.has(claimPath)
        ? null : purpose);
    }
    const paths = textList(request.targetedClaimPaths, code,
      { allowEmpty: false, max: teachFeedbackRevision ? publicClaims.size + purposeByPath.size : 64 });
    if (teachFeedbackRevision && (!request.teachFrameworkExperience?.investigation?.completed
      || !request.teachFrameworkExperience.synthesis?.answers?.some(a => a.disposition === 'revise')
      || request.teachFrameworkSourceBinding?.sourceTeachPlanHash !== plan.planHash
      || request.teachFrameworkSourceBinding?.targetPlanHash !== plan.planHash)) {
      fail(code, 'completed_current_teach_required');
    }
    const purposePaths = paths.filter((path) => (
      path.startsWith("componentPurposes.")));
    const teachEvidence = request.teachFrameworkExperience
      ? createRosterRevisionTeachEvidenceV1(request.teachFrameworkExperience, request.toolReceipts || [],
        request.teachFrameworkSourceBinding || null) : null;
    // Typed tools own their schema. Do not first construct the superseded
    // 64-field legacy text schema for a larger, source-derived formal manifest.
    let outputContract = [STRUCTURED_PLAN_TOOLS_PROTOCOL_V1, STRUCTURED_PLAN_TOOLS_PROTOCOL_V2, STRUCTURED_PLAN_TOOLS_PROTOCOL_V3].includes(request.planEditProtocol)
      ? null : teachEvidence
      ? createAgentScheduledClaimRepairOutputContractV4(paths)
      : paths.length > 5
      ? createAgentScheduledClaimRepairOutputContractV3(paths)
      : paths.some((path) => !AGENT_SCHEDULED_LEGACY_CLAIM_REPAIR_PATHS_V1
        .includes(path))
        ? createAgentScheduledClaimRepairOutputContractV2(paths)
      : { contract: AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_V1,
        contractRef: AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_REF_V1 };
    const review = request.finalPlanReview;
    const currentReviewBound = review?.status === "completed"
      && review.planHash === plan.planHash && review.review?.planHash === plan.planHash;
    const retainedFindings = (request.retainedClaimFindings || []).filter(entry =>
      entry.currentPlanHash === plan.planHash
        && HASH_PATTERN.test(String(entry.sourcePlanHash || ""))
        && HASH_PATTERN.test(String(entry.sourceReviewHash || ""))
        && entry.claimPath === entry.finding?.claimPath
        && entry.currentClaimText === (entry.claimPath === "publicSummaryText"
          ? plan.publicSummaryText : entry.claimPath.startsWith("componentPurposes.")
            ? purposeByPath.get(entry.claimPath)?.publicPurposeText
            : publicClaims.get(entry.claimPath)))
      .map(entry => entry.finding);
    const citedFindings = [
      ...effectiveRosterFinalPlanReviewFindingsV1({ plan, review: review?.review }),
      ...retainedFindings,
    ];
    // Independently derive allowed linked scope from bound review findings,
    // never from arbitrary paths supplied by a caller.
    const reviewedRepairPaths = new Set(rosterRelatedRepairClaimPathsV1(plan,
      citedFindings.map(finding => finding.claimPath)));
    const relatedConsistencyPaths = paths.filter(path => reviewedRepairPaths.has(path)
      && !citedFindings.some(finding => finding.claimPath === path));
    if (![AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA, PLANNED_PRESET_ROSTER_PLAN_SCHEMA]
        .includes(plan.schema)
      || new Set(paths).size !== paths.length
      || paths.some((path) => !allowed.has(path)
        && !purposeByPath.get(path))
      || (!userRequestedRevision && !currentReviewBound)
      || (review !== undefined && !currentReviewBound)
      || request.armyAudit?.resultHash
        !== plan.openingDeploymentSchedule.armyAuditResultHash
      || request.missionProfile?.missionScoringProfileHash
        !== plan.openingDeploymentSchedule.missionScoringProfileHash
      || (!userRequestedRevision && !teachFeedbackRevision && !paths.some((path) => citedFindings.some((finding) => (
        finding.claimPath === path && finding.severity === "high"))))
      || (!userRequestedRevision && !teachFeedbackRevision && paths.some((path) => path !== "publicSummaryText"
        && !reviewedRepairPaths.has(path)))
      || paths.some((path) => !revisedSectionKeys.includes(
        path === "publicSummaryText" ? path
          : path.startsWith("scoreRoute.") ? "scoreRoute"
            : path.startsWith("componentPurposes.")
              ? "componentPurposes" : rosterPublicClaimSectionV1(plan, path)))) {
      fail(code, "binding_or_reviewed_paths");
    }
    if (presetRevision) {
      verifyPlannedPresetRosterPlanRoundTripV2(plan);
      if (request.baselinePlan?.planHash !== plan.presetBinding.baselinePlanHash
        || request.armyAudit?.resultHash !== plan.presetBinding.armyAuditResultHash) {
        fail(code, "immutable_preset_binding");
      }
    } else verifyAgentScheduledRosterPlanV1(plan);
    const currentText = (path) => path === "publicSummaryText"
      ? plan.publicSummaryText
      : path.startsWith("scoreRoute.")
        ? plan.scoreRoute[path.split(".")[1]]
        : path.startsWith("componentPurposes.")
          ? purposeByPath.get(path).publicPurposeText
        : publicClaims.get(path);
    const factPacket = buildRosterReviewFactPacketV1({
      plan, toolReceipts: request.toolReceipts || [],
      teachState: request.teachFrameworkExperience || null,
      armyAudit: request.armyAudit,
      selectionUnitRules: input.selectionUnitRules || [],
      selectionSupportRules: input.selectionSupportRules || [],
      selectionJustificationPolicyVersion: request.selectionJustificationPolicyVersion || null,
      selectedCandidateInputHash:
        request.selectedCandidateInputHash || null,
    });
    const hostSources = request.planEditProtocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V3;
    const planEditTools = [STRUCTURED_PLAN_TOOLS_PROTOCOL_V1, STRUCTURED_PLAN_TOOLS_PROTOCOL_V2, STRUCTURED_PLAN_TOOLS_PROTOCOL_V3].includes(request.planEditProtocol)
      ? createRosterPlanEditToolsV1({ plan, paths, factPacket, protocol:request.planEditProtocol,
        ...(teachFeedbackRevision ? {currentClaimTexts:Object.fromEntries(paths.map(path=>[path,currentText(path)]))} : {}) }) : null;
    if (planEditTools) outputContract = planEditTools.outputContract({ allowEvidenceReads: Boolean(teachEvidence) });
    const qualification = review?.review?.reviewAdjudication?.reconciliation;
    const repairChallenges = citedFindings.filter(f => paths.includes(f.claimPath)).map(f => {
      const findingIndex = review?.review?.findings.findIndex(original =>
        original.claimPath === f.claimPath && original.claimQuote === f.claimQuote) ?? -1;
      const proof = qualification?.judgments?.find(j => j.findingIndex === findingIndex);
      return { claimPath: f.claimPath, claimQuote: f.claimQuote, category: f.category,
        severity: f.severity, reviewerConclusionIsNotFact: true,
        qualification: proof ? { claimAssessment: proof.claimAssessment,
          publicReason: proof.publicReason, factChecks: proof.factChecks,
          sourceEvidence: proof.sourceEvidence } : { status: "needs_evidence",
          publicReason: "Independently compare this literal assertion with shared facts. The earlier reviewer interpretation was not proven." } };
    });
    const nodes = [
      sealNode("revision-request", "public_revision_instruction", {
        reasonText,
        revisionPurpose: request.revisionPurpose || "reviewed_claim_repair_v1",
        sourceReviewStillRequired: true,
        relatedConsistencyPaths,
        relatedConsistencyInstruction: 'Related paths are included through explicit hypothesis/response links, not because the host judged them false. Reconcile them with verified facts and the corrected hypothesis. Preserve valid strategic intent. This editor cannot commit structural army/schedule changes; that does not prohibit the ordinary journey from replanning them. Do not claim an alternative has already been applied.',
        ...(request.selectionJustificationPolicyVersion
          === ROSTER_SELECTION_JUSTIFICATION_POLICY_V1 ? {
          selectionArgumentInstruction: ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1,
        } : {}),
      }),
      sealNode("reviewed-current-claims", "agent_deliberation_public", {
        planHash: plan.planHash,
        claims: paths.map((claimPath) => ({ claimPath,
          currentText: currentText(claimPath) })),
      }),
      ...(request.revisionStrategyGuidance ? [sealNode('skill-guidance', 'strategy_skills_advisory',
        clone(request.revisionStrategyGuidance))] : []),
      sealNode("cited-final-review", "advisory_cited_challenges", {
        reviewHash: review?.review?.reviewHash || null,
        findings: repairChallenges,
        retainedClaimSources: (request.retainedClaimFindings || []).map(entry => ({
          claimPath: entry.claimPath, sourcePlanHash: entry.sourcePlanHash,
          sourceReviewHash: entry.sourceReviewHash, oldReviewerReasonIsNotAuthority: true })),
      }),
      currentArrivalScheduleNode(plan),
      sealNode("verified-plan-facts", "rules_and_receipt_checked", {
        sourceFacts: factPacket.sourceFacts, arithmetic: factPacket.arithmetic,
        ...(!planEditTools ? { numericPremises: factPacket.premiseFacts.numbers } : {}),
        sourceCatalogueHash: factPacket.sourceCatalogueHash,
      }),
      ...(planEditTools ? [sealNode("plan-edit-tools", "host_owned_executable_tools",
        planEditTools.descriptor())] : []),
      ...(request.teachFrameworkExperience ? [sealNode("teach-framework-experience",
        "advisory_questions_and_actual_tool_receipts", {
          experience: teachEvidence.experience,
          retainedEvidenceTool: { name: "retained_evidence", readOnly: true,
            responseField: "evidenceRequests", lookupBatchesAvailable: 3,
            instruction: `Return evidenceRequests with ${planEditTools ? 'toolCalls' : 'repairs'}:[] to read exact saved originals before revising. Each request is {receiptHash,path}; dot paths and child indexes are supported. No new simulation is performed. Current synthesis is advice, not Rules authority; unknown remains unknown.` },
          instruction: "Use the shared Teach framework for the whole Plan. Adopt, reject with reasons, or leave conditional its evidence-backed proposals. Unknown is not proof. This text revision cannot reselect a roster: record any required reselection for the selecting Agent, not as a claim that reselection is forbidden. Framework feedback is for later evolution, not Rules authority.",
        })] : []),
      ...[sealNode("whole-plan-claim-index",
        "agent_deliberation_public", {
          scoreRoute: clone(plan.scoreRoute),
          deploymentConcept: clone(plan.deploymentConcept),
          publicSummaryText: plan.publicSummaryText,
          componentPurposes: plan.componentPurposes.map((purpose) => ({
            instanceId: purpose.instanceId,
            publicPurposeText: purpose.publicPurposeText,
          })),
          opponentHypotheses: clone(plan.opponentHypotheses),
          counterResponses: clone(plan.counterResponses),
          invalidationTriggers: clone(plan.invalidationTriggers),
        })],
      ...(purposePaths.length ? [sealNode("current-plan-alignment",
        "agent_deliberation_public", {
          deploymentConcept: clone(plan.deploymentConcept),
          scoreRoute: clone(plan.scoreRoute),
          publicSummaryText: plan.publicSummaryText,
        })] : []),
      ...(paths.some((path) => path.startsWith("scoreRoute.")) ? [sealNode(
        "mission-scoring-authority", "rules_checked_immutable_scoring", {
          missionScoringProfileHash:
            request.missionProfile.missionScoringProfileHash,
          markerScoringStartsRound:
            request.missionProfile.markerScoringStartsRound,
          destroyedEnemySupplyVpPerSupply:
            request.missionProfile.destroyedEnemySupplyVpPerSupply,
          scoringConditions:
            request.missionProfile.sourceText.scoringConditions,
          targetVpScheduleMustRemainUnchanged: true,
        })] : []),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "revision",
        outputSchemaName: outputContract.contract.schemaName,
        requestedClaimPaths: paths,
        fullReplacementForEachRequestedPath: !planEditTools,
        ...(planEditTools ? { planEditProtocol: request.planEditProtocol,
          mutationByHostToolsOnly: true, allFieldsRequiredBeforeAtomicCommit: true } : {}),
        ...(teachEvidence ? { fullReplacementRequiredOnlyForFinalReply: true,
          optionalRetainedEvidenceRequests: true } : {}),
        noOtherPlanFieldsReturned: true,
        strictProviderJsonSchemaEnforced: true,
      }),
    ];
    const sink = { deliberationReceipts: [] };
    let response;
    const lookupResults = [];
    const completedReplyFeedback = [];
    let lookupRound = 0;
    let planToolCorrectionCount = 0;
    let planToolSnapshot = null;
    const interruptedDrafts = hostSources ? (request.interruptedPlanEdits || [])
      .map(rosterInterruptedEditDraftV1).filter(Boolean) : [];
    let incompleteWithoutProgress = 0;
    for (;;) {
      const finalOnly = teachEvidence && lookupRound >= 3;
      if (hostSources) outputContract = planEditTools.outputContract({allowEvidenceReads:Boolean(teachEvidence && !finalOnly),
        maxBatchSize:interruptedDrafts.length ? 1 : null});
      if (finalOnly) outputContract = planEditTools
        ? planEditTools.outputContract({ allowEvidenceReads: false, ...(hostSources && interruptedDrafts.length ? {maxBatchSize:1} : {}) })
        : createAgentScheduledClaimRepairOutputContractV3(paths);
      const roundRequest = buildRoundRequest({
      sessionId: `${plan.planId}-revision-${plan.planVersion + 1}`,
      roundIndex: plan.planVersion + 1,
      roundKind: "revision", nodes: [...nodes.map(node => node.nodeType === "response-schema"
        ? sealNode(node.nodeType, node.authority, { ...node.content,
          outputSchemaName: outputContract.contract.schemaName,
          ...(teachEvidence ? { optionalRetainedEvidenceRequests: !finalOnly,
            lookupBatchesRemaining: Math.max(0, 3 - lookupRound) } : {}) }) : node),
        ...(lookupResults.length ? [sealNode("revision-retained-evidence",
          "actual_saved_evidence_not_new_simulation", { results: lookupResults })] : []),
        ...(completedReplyFeedback.length ? [sealNode("revision-completed-reply-feedback",
          "host_observed_public_output_error", completedReplyFeedback.at(-1))] : []),
        ...(interruptedDrafts.length ? [sealNode('interrupted-plan-edit-drafts','unreviewed_model_output',{
          drafts:interruptedDrafts,oneArgumentPerReply:true,
          instruction:'Finish one missing Plan argument per reply. All original facts, Skills and whole-Plan context remain available. Valid staged arguments are retained; only the complete set can commit. Do not copy machine source IDs.'})] : []),
        ...(planToolSnapshot ? [sealNode("plan-edit-tool-results", "host_executed_not_model_authored",
          hostSources ? projectStagedRosterPlanArgumentsV1(planToolSnapshot) : { results: planToolSnapshot.results, stagedClaimPaths: planToolSnapshot.stagedClaimPaths,
            missingClaimPaths: planToolSnapshot.missingClaimPaths, applied: false,
            instruction: "Correct only missing or invalid calls. Valid staged calls remain available; no partial Plan is applied." })] : [])],
      userMessage: planEditTools
        ? (teachFeedbackRevision
          ? 'Apply the completed Teach to this formal Plan. For each field choose plan.fill_argument in toolCalls to revise or plan.retain_argument in retainedCalls to preserve its exact supported text with a reason. Do not rewrite unchanged fields or labels. You may submit successive batches; valid calls are retained. When reading evidence, both toolCalls and retainedCalls must be empty. '
          : "Use the executable plan.fill_argument tool to fill each requested Plan argument. ")
          + "These arguments ARE the final playable Plan, not an editorial patch description. State the game strategy itself. "
          + "Do not tell another writer to rewrite a sentence or keep the rest unchanged; include all still-relevant strategy from the current field. "
          + "Alternatives must be alternative game choices, and conditions must be observable in-match replanning triggers, not alternatives about wording. "
          + "Separate objective, actions/actors/locations/timing, causal reasons, alternatives, and risk/replanning conditions. "
          + (hostSources ? "The host binds the complete verified source packet and keeps its original scopes. Explain factual bases in the argument without copying machine source IDs or payloads. An independent review still checks each assertion; source availability is not proof. "
            : "Select factIds from the shared catalogue; the host binds values and scopes and generates receipts. Select only sources used by this argument; do not reproduce the entire fact catalogue. ")
          + "Do not return replacementText, computed facts, success flags or receipts. Tool success means a staged edit, not strategy approval. "
          + "Preserve sound strategic choices; the review is a challenge, not Rules authority. This atomic argument editor does not write the army, arrival schedule or unrequested fields; that is an editor boundary, not a game-rule restriction. "
          + "The ordinary journey can reopen the Plan/schedule and, when authorized, the army through their existing tools. Do not claim a timing alternative is forbidden or already applied merely because this particular edit tool cannot commit it. "
          + (teachEvidence && !finalOnly ? "Use evidenceRequests with toolCalls:[] if more saved evidence is needed; otherwise evidenceRequests:[]. " : "")
          + "If tools report errors, retry only missing/invalid fields; previously valid fields are staged. Never claim exact geometry or control without corresponding execution evidence."
        : (userRequestedRevision
        ? "Revise the named public arguments to satisfy revision-request. "
          + "This is an explicit quality revision, not just a source-error "
          + "repair: correct circular or inadequate strategic comparisons "
          + "even when they were not High findings. Preserve the structured "
          + "public selection arguments inside the named texts, updating "
          + "their reasons, alternatives and switch conditions consistently. "
        : "Repair only the named public claim texts in the cited final-plan review. ")
        + (teachEvidence && !finalOnly
          ? "If more original evidence is needed, return evidenceRequests and repairs:[] first; the host will return actual saved fields. Otherwise set evidenceRequests:[] and finalize. "
          : finalOnly ? "The three read-only lookup batches are used. Return the coordinated revision using delivered evidence; explicitly leave any unsupported claim conditional. No evidenceRequests field in this final reply. " : "")
        + "For the final revision, return exactly one complete replacement for "
        + "each requested path and nothing else. Keep every Unit, card, "
        + "upgrade, first-arrival round, score target and unrelated plan "
        + "field unchanged during this argument edit only. The current schedule is a model-chosen proposal, not an immutable Rules constraint; the ordinary journey may replan it through the Rules-audited arrival tool. "
        + (paths.length > 5
          ? "The named paths form ONE coordinated plan revision. Make "
            + "their scoring, Supply, map, arrival and fallback statements "
            + "mutually consistent with the verified facts and untouched "
            + "claims. A conditional tactical intent is not certified "
            + "movement or guaranteed VP. Do not erase a strategic option "
            + "merely because exact placement awaits in-match Rules. "
          : "")
        + "the review is a cited challenge, not Rules authority. Do not "
        + "follow an unqualified reviewer conclusion: compare the original assertion to the shared facts yourself. "
        + (userRequestedRevision
          ? "Keep legal strategic preferences, but justify them by causal trade-offs and factual evidence. "
          : "Keep correct conditional strategy and repair only unsupported source claims or false numbers. ")
        + "State the scoring actor, marker group and per-marker versus group amount explicitly. "
        + "Do not claim unverified paths or hidden reasoning.",
      contextSeed: { planHash: plan.planHash,
        revisionPurpose: request.revisionPurpose || "reviewed_claim_repair_v1",
        reasonText,
        reviewHash: review?.review?.reviewHash || null,
        sourceCatalogueHash: factPacket.sourceCatalogueHash,
        scheduleHash: plan.openingDeploymentSchedule.scheduleHash,
        targetedClaimPaths: paths,
        ...(planEditTools ? { planEditProtocol: hostSources ? request.planEditProtocol : STRUCTURED_PLAN_TOOLS_PROTOCOL_V1,
          stagedPlanEdits: planToolSnapshot?.edits || [], planToolCorrectionCount } : {}),
        ...(interruptedDrafts.length ? {interruptedDrafts} : {}),
        ...(hostSources && planToolSnapshot ? {stagedArgumentContextVersion:'staged_argument_context_v1'} : {}),
        ...(completedReplyFeedback.length ? { completedReplyFeedback } : {}),
        ...(teachEvidence ? { teachEvidenceVersion: teachEvidence.experience.version,
          teachArchiveReference: teachEvidence.experience.archiveReference.receiptHash,
          lookupRound, lookupResults } : {}) },
      outputContract: outputContract.contract,
      outputContractRef: outputContract.contractRef,
      decisionCandidateSource: presetRevision
        ? "rules_verified_immutable_room_roster_only"
        : "rules_verified_selected_agent_roster_only",
      });
      try { response = await deliberateRound(deliberation, roundRequest, sink); }
      catch (error) {
        const draft = hostSources && error?.code === 'ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE'
          && error.providerIncompleteReason === 'max_output_tokens'
          ? rosterInterruptedEditDraftV1(error.failedOutputRecord) : null;
        if (!draft || ++incompleteWithoutProgress >= 3) throw error;
        if (!interruptedDrafts.some(old => old.rawTextHash === draft.rawTextHash)) interruptedDrafts.push(draft);
        continue; // New bounded continuation, never a replay of the paid request.
      }
      if (planEditTools) {
        validateEnvelope(response.output, "revision");
        exactKeys(response.output, ["schemaVersion", "roundKind", "toolCalls",
          ...(teachFeedbackRevision ? ['retainedCalls'] : []),
          ...(teachEvidence && !finalOnly ? ["evidenceRequests"] : [])], code);
        const requests = response.output.evidenceRequests || [];
        if (requests.length) {
          for (const query of requests) {
            const result = teachEvidence.read(query);
            if (!lookupResults.some(old => old.request.receiptHash === query.receiptHash
              && old.request.path === query.path)) lookupResults.push(result);
          }
          if (response.output.toolCalls.length || response.output.retainedCalls?.length) {
            // Reads may inform the proposed edits. Complete only the read lane
            // and return an explicit write receipt; never silently drop calls
            // or stage a mutation before the model has consumed its evidence.
            // Previously staged valid fields remain in planToolSnapshot.
            completedReplyFeedback.push({ code: "PLAN_EDIT_READ_WRITE_MIXED",
              applied: false, readOnlyRequestsCompleted: true,
              previousOutputHash: hashStarcraftTmgContract(response.output),
              deferredToolCalls: clone([...response.output.toolCalls,...(response.output.retainedCalls || [])]),
              instruction: "The read-only requests were processed; their results are in revision-retained-evidence. The tool calls in this mixed reply were NOT executed or staged. Review those results, then submit the desired missing/invalid calls with evidenceRequests:[]. Previously valid staged fields are unchanged. This is delivery feedback, not a rejection of your strategy." });
          }
          lookupRound++;
          continue;
        }
        const previousStagedCount = planToolSnapshot?.stagedClaimPaths.length || 0;
        for (const call of [...response.output.toolCalls,...(response.output.retainedCalls || [])]) planEditTools.callTool(call);
        planToolSnapshot = planEditTools.snapshot();
        if (!planToolSnapshot.missingClaimPaths.length) break;
        if (planToolSnapshot.stagedClaimPaths.length > previousStagedCount) incompleteWithoutProgress = 0;
        if (planToolSnapshot.stagedClaimPaths.length > previousStagedCount) {
          planToolCorrectionCount = 0; // A new valid batch is progress, not a failed correction.
        } else if (++planToolCorrectionCount > 2) fail(code, "plan_tool_correction_nonconvergent");
        continue;
      }
      if (teachEvidence && !finalOnly) {
        exactKeys(response.output, ["schemaVersion", "roundKind", "repairs", "evidenceRequests"], code);
        const requests = response.output.evidenceRequests;
        if (!Array.isArray(requests) || requests.length > 8) fail(code, "evidence_requests");
        if (requests.length) {
          // A read-only query does not consume a semantic-correction attempt
          // and never applies a partial Plan. Keep its separate existing bound.
          for (const query of requests) {
            exactKeys(query, ["receiptHash", "path"], code);
            if (typeof query.receiptHash !== "string" || typeof query.path !== "string") fail(code, "evidence_request_type");
            const result = teachEvidence.read(query);
            if (!lookupResults.some(old => old.request.receiptHash === query.receiptHash
              && old.request.path === query.path)) lookupResults.push(result);
          }
          lookupRound++;
          continue;
        }
      }
      const repairs = response.output.repairs;
      const completeUnchanged = Array.isArray(repairs) && repairs.length === paths.length
        && new Set(repairs.map(item => item.claimPath)).size === paths.length
        && repairs.every(item => paths.includes(item.claimPath)
          && typeof item.replacementText === "string"
          && item.replacementText.trim() === currentText(item.claimPath));
      if (!completeUnchanged) break;
      // The real B reply copied every requested old claim. Previously this
      // failed after the Provider loop, so no correction ever reached it.
      // Replay can reuse each exact paid prefix on resume; feedback gives the
      // next reply a distinct stable context without resetting the bound.
      if (completedReplyFeedback.length >= 2) fail(code, "no_effect");
      completedReplyFeedback.push({ code: `${code}:no_effect`,
        attempt: completedReplyFeedback.length + 1,
        previousOutputHash: hashStarcraftTmgContract(response.output),
        unchangedClaimPaths: paths,
        instruction: "Every returned replacement is identical to the delivered current text. Address revision-request and the actual evidence, not just copy the old Plan. No new tactical preference is required: retain sound choices, but explain any evidence-based decision to retain them in a requested public-summary field. Do not invent facts, cosmetic changes or certainty merely to create a diff. Return the complete coordinated replacement, or use the remaining evidence lookup if needed." });
    }
    // Rendering is a host tool result, not a rewritten Provider reply/receipt.
    const output = planEditTools ? { schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
      roundKind: "revision", repairs: planToolSnapshot.repairs,
      ...(Object.hasOwn(outputContract.contract.providerSchema.properties, "evidenceRequests")
        ? { evidenceRequests: [] } : {}) } : response.output;
    validateEnvelope(output, "revision");
    exactKeys(output, ["schemaVersion", "roundKind", "repairs",
      ...(Object.hasOwn(outputContract.contract.providerSchema.properties, "evidenceRequests") ? ["evidenceRequests"] : [])], code);
    if (!Array.isArray(output.repairs)
      || output.repairs.length !== paths.length) fail(code, "count");
    const replacements = new Map();
    const unchangedRequestedClaimPaths = [];
    const revisionWarnings = [];
    activeNarrativeWarnings = revisionWarnings;
    let revised;
    try {
      for (const item of output.repairs) {
        exactKeys(item, ["claimPath", "replacementText"], code);
        if (!paths.includes(item.claimPath)
          || replacements.has(item.claimPath)) fail(code, "path");
        const replacement = narrative(item.replacementText, code,
          { path: item.claimPath });
        if (replacement === currentText(item.claimPath)) {
          // A paid, otherwise valid batch can contain one no-op. Preserve
          // the other corrections and let the independent review keep this
          // exact claim High if its cited problem remains unresolved.
          unchangedRequestedClaimPaths.push(item.claimPath);
        }
        replacements.set(item.claimPath, replacement);
      }
      if (replacements.size !== paths.length) fail(code, "missing_path");
      if (unchangedRequestedClaimPaths.length === paths.length) {
        fail(code, "no_effect");
      }
      const revisedConcept = createRosterDeploymentConceptV1({
        ...plan.deploymentConcept,
        ...Object.fromEntries([...replacements].filter(([path]) => (
          path.startsWith("deploymentConcept."))).map(([path, value]) => (
          [path.split(".")[1], value]))),
      });
      const scoreTextReplacements = [...replacements].filter(([path]) => (
        path.startsWith("scoreRoute.")));
      const revisedScoreRoute = scoreTextReplacements.length
        ? createRosterScoreRouteV1({ ...plan.scoreRoute,
          ...Object.fromEntries(scoreTextReplacements.map(([path, value]) => (
            [path.split(".")[1], value]))) })
        : plan.scoreRoute;
      const revisedPurposes = purposePaths.length
        ? plan.componentPurposes.map((purpose) => {
          const replacement = replacements.get(
            `componentPurposes.${purpose.instanceId}`);
          return replacement === undefined ? purpose
            : createRosterComponentPurposeV1({ ...purpose,
              publicPurposeText: replacement });
        }) : plan.componentPurposes;
      const revision = createRosterPlanRevisionEventV1({
        revisionId: `${plan.planId}-revision-${plan.planVersion + 1}`,
        planId: plan.planId,
        fromPlanVersion: plan.planVersion,
        toPlanVersion: plan.planVersion + 1,
        previousPlanHash: plan.planHash,
        reasonText, triggerIds, revisedSectionKeys,
      });
      const revisedBase = createRosterPlanV1({ ...plan,
        // Both locked-roster adapters share the semantic prose patch. Only
        // the final adapter restores its immutable roster/schedule identity.
        presetRoster: false, presetBinding: null,
        planVersion: plan.planVersion + 1,
        planStatus: plan.planStatus === "draft" ? "draft" : "revised",
        deploymentConcept: revisedConcept,
        scoreRoute: revisedScoreRoute,
        componentPurposes: revisedPurposes,
        ...rosterPublicClaimReplacementSectionsV1(plan, replacements),
        publicSummaryText: replacements.get("publicSummaryText")
          ?? plan.publicSummaryText,
        revisions: [...plan.revisions, revision],
      });
      revised = presetRevision
        ? createPlannedPresetRosterPlanV2({ ...revisedBase,
          baselinePlan: request.baselinePlan,
          openingDeploymentSchedule: plan.openingDeploymentSchedule })
        : createAgentScheduledRosterPlanV1({ sourcePlan: revisedBase,
          openingDeploymentSchedule: plan.openingDeploymentSchedule });
      if (presetRevision) verifyPlannedPresetRosterPlanRoundTripV2(revised);
      else verifyAgentScheduledRosterPlanRoundTripV1(revised);
    } finally {
      activeNarrativeWarnings = null;
    }
    return freezeDeep({
      plan: revised,
      openingDeploymentSchedule: clone(revised.openingDeploymentSchedule),
      revisionEvent: revised.revisions[revised.revisions.length - 1],
      unchangedRequestedClaimPaths,
      claimRepairCoverage: {
        requestedClaimPaths: paths,
        replacedClaimPaths: paths.filter(path =>
          !unchangedRequestedClaimPaths.includes(path)),
        unchangedRequestedClaimPaths,
        completedReplyFeedback: clone(completedReplyFeedback),
        highClaimPathsNotRequested: [...new Set((review?.review?.findings || []).filter(
          finding => String(finding.severity).toLowerCase() === "high"
            && !paths.includes(finding.claimPath)).map(finding => finding.claimPath))],
        semanticReviewStillRequired: true,
        rosterAndScheduleUnchanged: true,
        trainingTruth: false,
      },
      narrativeDisplayWarnings: revisionWarnings,
      ...(teachEvidence ? { teachEvidenceDelivery: teachEvidence.receipt() } : {}),
      outputNormalizationReceipt: clone(response.normalizationReceipt),
      outputShapeRecoveryReceipt:
        clone(response.outputShapeRecoveryReceipt),
      deliberationReceipts: sink.deliberationReceipts.map(clone),
      ...(planEditTools ? { planEditToolExecution: { ...planToolSnapshot,
        applied: true, toPlanHash: revised.planHash, toPlanVersion: revised.planVersion,
        applicationAuthority: "existing_plan_builders_and_validators",
        correctionRounds: planToolCorrectionCount } } : {}),
    });
  }

  async function reviseRosterPlan(request = {}, options = {}) {
    const plan = request.plan;
    if (!object(plan) || !HASH_PATTERN.test(String(plan?.planHash || ""))) {
      fail("ROSTER_STRATEGIST_REVISION_PLAN_INVALID");
    }
    const deliberation = options.deliberation;
    if (typeof deliberation?.deliberate !== "function") {
      fail("ROSTER_STRATEGIST_DELIBERATION_PORT_INVALID");
    }
    const code = "ROSTER_STRATEGIST_REVISION_INVALID";
    const reasonText = nonEmpty(request.reasonText, code);
    const triggerIds = textList(request.triggerIds || [], code);
    const revisedSectionKeys = textList(request.revisedSectionKeys || [], code,
      { allowEmpty: false });
    const presetRevision = plan.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA;
    const agentScheduledRevision =
      plan.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA;
    if (agentScheduledRevision) verifyAgentScheduledRosterPlanV1(plan);
    const initialPresetScheduling = presetRevision
      && !plan.openingDeploymentSchedule;
    // A freshly taught preset has no immutable arrival schedule yet.
    // Create it through the existing model/Rules schedule round first;
    // the claim-only adapter must never dereference or invent that schedule.
    if (request.targetedClaimPaths !== undefined
      && !initialPresetScheduling) {
      return repairReviewedClaims(request, deliberation, reasonText,
        triggerIds, revisedSectionKeys);
    }
    const currentReview = request.finalPlanReview;
    const highClaimPaths = currentReview?.status === "completed"
      && currentReview.planHash === plan.planHash
      && currentReview.review?.planHash === plan.planHash
      ? [...new Set(effectiveRosterFinalPlanReviewFindingsV1({ plan,
        review: currentReview.review }).filter(finding =>
        String(finding.severity).toLowerCase() === "high")
        .map(finding => finding.claimPath))] : [];
    if ((presetRevision || agentScheduledRevision)
      && !initialPresetScheduling && highClaimPaths.length > 0) {
      // A normal "repair this reviewed plan" request must not silently omit
      // challenged components. Deduplicate current High paths and include the
      // derived public summary; keep an explicit caller's targeted subset
      // above scoped, with remaining High paths recorded in coverage.
      const paths = [...new Set([...highClaimPaths, "publicSummaryText"])];
      const sections = [...new Set([...revisedSectionKeys, ...paths.map(path =>
        path === "publicSummaryText" ? path : path.split(".")[0])])];
      return repairReviewedClaims({ ...request, targetedClaimPaths: paths },
        deliberation, reasonText, triggerIds, sections);
    }
    const repairRevision = agentScheduledRevision
      || (presetRevision && plan.revisions.length > 0);
    const sourceAudit = repairRevision
      ? auditRosterPlanVpReceiptsV1({ plan,
        toolReceipts: request.toolReceipts || [] }) : null;
    let supplyAuthority = null;
    if (presetRevision || agentScheduledRevision) {
      if (presetRevision) verifyPlannedPresetRosterPlanRoundTripV2(plan);
      const baseline = request.baselinePlan;
      const audit = request.armyAudit;
      const mission = request.missionProfile;
      if (presetRevision) {
        if (baseline?.planHash !== plan.presetBinding?.baselinePlanHash
          || audit?.resultHash !== plan.presetBinding?.armyAuditResultHash
          || !HASH_PATTERN.test(String(mission?.missionScoringProfileHash || ""))
          || !revisedSectionKeys.includes("deploymentConcept")) {
          fail("ROSTER_STRATEGIST_PRESET_REVISION_SOURCE_INVALID");
        }
      } else if (audit?.resultHash
          !== plan.openingDeploymentSchedule?.armyAuditResultHash
        || mission?.missionScoringProfileHash
          !== plan.openingDeploymentSchedule?.missionScoringProfileHash
        || !revisedSectionKeys.includes("deploymentConcept")) {
        fail("ROSTER_STRATEGIST_AGENT_SCHEDULED_REVISION_SOURCE_INVALID");
      }
      if (repairRevision && (!plan.openingDeploymentSchedule
        || plan.openingDeploymentSchedule.armyAuditResultHash
          !== audit.resultHash
        || plan.openingDeploymentSchedule.missionScoringProfileHash
          !== mission.missionScoringProfileHash)) {
        fail("ROSTER_STRATEGIST_REPAIR_SCHEDULE_INVALID");
      }
      if (request.finalPlanReview
        && (request.finalPlanReview.planHash !== plan.planHash
          || request.finalPlanReview.review?.planHash !== plan.planHash)) {
        fail("ROSTER_STRATEGIST_REVIEW_BINDING_INVALID");
      }
      supplyAuthority = {
        armyAuditResultHash: audit.resultHash,
        missionScoringProfileHash: mission.missionScoringProfileHash,
        gameLengthRounds: mission.gameLengthRounds,
        startingSupply: mission.startingSupply,
        extraSupplyPerRound: mission.extraSupplyPerRound,
        units: audit.units.map((unit) => ({
          unitInstanceId: unit.unitInstanceId,
          startingSupply: unit.unitCompositionResult.startingSupply,
        })),
        roundCapacity: Array.from({ length: mission.gameLengthRounds },
          (_, index) => ({ round: index + 1,
            capacity: index + 1 === mission.gameLengthRounds ? null
              : mission.startingSupply
                + mission.extraSupplyPerRound * index })),
        finalRoundUnlimited: true,
        modelMayChooseRoundsButNotSupplyValues: true,
      };
    }
    // Generation, ordinary revision and claim repair must use the same
    // receipt-backed facts as final review. Missing route witnesses remain
    // unknown; advisory review prose cannot replace that source contract.
    const canonicalFacts = presetRevision || agentScheduledRevision
      ? buildRosterFinalPlanVerifiedFactsV1({
        plan, toolReceipts: request.toolReceipts || [],
        selectionUnitRules: input.selectionUnitRules || [],
        selectionSupportRules: input.selectionSupportRules || [],
        selectionJustificationPolicyVersion: request.selectionJustificationPolicyVersion || null,
        selectedCandidateInputHash: request.selectedCandidateInputHash || null,
      }).sourceFacts : null;
    const nodes = [
      sealNode("current-plan", "agent_deliberation_public", {
        planHash: plan.planHash, planVersion: plan.planVersion,
        planStatus: plan.planStatus, scoreRoute: clone(plan.scoreRoute),
        deploymentConcept: clone(plan.deploymentConcept),
        publicSummaryText: plan.publicSummaryText }),
      sealNode("revision-request", "agent_deliberation_public", {
        reasonText, triggerIds, revisedSectionKeys }),
      ...(initialPresetScheduling ? [sealNode("initial-schedule-review-context",
        "advisory_cited_challenges", {
          componentPurposes: clone(plan.componentPurposes),
          findings: clone(request.finalPlanReview?.review?.findings || []),
          deferredClaimPaths: clone(request.targetedClaimPaths || highClaimPaths),
          scheduleMustBeChosenBeforeClaimOnlyRepair: true,
          sourceReviewStillRequired: true,
        })] : []),
      ...(canonicalFacts ? [sealNode("verified-plan-facts",
        "rules_and_receipt_checked", { sourceFacts: canonicalFacts })] : []),
      ...(repairRevision ? [currentArrivalScheduleNode(plan), sealNode("component-purposes",
        "current_plan_public", {
          purposes: clone(plan.componentPurposes),
        }), sealNode("math-source-audit",
        "read_only_receipt_evidence", {
          audit: clone(sourceAudit),
        }), ...(request.finalPlanReview ? [sealNode("final-plan-review",
          "advisory_cited_challenges", {
            reviewHash: request.finalPlanReview.review.reviewHash,
            findings: clone(request.finalPlanReview.review.findings),
            modelReviewDoesNotOverrideRules: true,
          })] : [])] : []),
      ...(supplyAuthority ? [sealNode("round-supply-authority",
        "rules_owned_army_and_mission_audits", supplyAuthority)] : []),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "revision",
        fields: ["publicSummaryText", "revisedScoreRoute",
          "revisedDeploymentConcept",
          ...(presetRevision && !repairRevision
            ? ["openingDeploymentSchedule"] : []),
          ...(repairRevision ? ["componentPurposeRevisions"] : [])],
        publicFieldsOnly: true,
        envelopeAtTopLevelNoChannelsWrapper: true,
        outputSchemaName: agentScheduledRevision
          ? AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_V1.schemaName
          : repairRevision
            ? PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1.schemaName
          : presetRevision
            ? PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1.schemaName
          : rosterStrategistRoundOutputContractV1("revision").schemaName,
        strictProviderJsonSchemaEnforced: true }),
    ];
    const sink = { deliberationReceipts: [] };
    const revisionDeliberation = await deliberateRound(deliberation,
      buildRoundRequest({
        sessionId: `${plan.planId}-revision-${plan.planVersion + 1}`,
        roundIndex: plan.planVersion + 1, roundKind: "revision", nodes,
        userMessage: repairRevision
          ? "Repair the currently scheduled roster plan in light "
            + "of the cited final-plan review. Keep every Unit, upgrade, "
            + "card and first-arrival round unchanged in this text-edit operation only, not as a game-rule restriction. The ordinary journey may reopen its model-chosen schedule through the Rules-audited arrival tool. Correct timing and "
            + "scoring assumptions consistently across score route, "
            + "deployment, summary and any affected component purposes. "
            + "Publish componentPurposeRevisions only for existing component "
            + "kind/instance IDs, with exact identities from the supplied "
            + "plan. The review is advisory; Rules and verified arrival "
            + "facts are authoritative. Any math receipt marked stale for "
            + "the current VP schedule must not be cited as validation; "
            + "remove its old proof claim or state that it is obsolete. "
            + "Do not claim unproven path or "
            + "position legality. Public reasons only, no hidden reasoning."
          : presetRevision
            ? "Revise the immutable roster's public deployment plan for the "
            + "Rules-owned per-round Supply capacities. List every locked "
            + "Unit exactly once in openingDeploymentSchedule with the first "
            + "round it enters and a public strategic reason. All Units begin "
            + "in Reserves; cumulative deployed Supply cannot exceed each "
            + "finite round capacity, while the final round is unlimited. "
            + "Keep prose and schedule consistent. Do not change the roster, "
            + "invent Supply values, or claim placement/path legality."
          : "Publish the revised public plan sections for the declared "
            + "revision triggers. Public fields only.",
        contextSeed: { planHash: plan.planHash, roundKind: "revision",
          revisedSectionKeys,
          ...(canonicalFacts ? { verifiedFactsHash:
            hashStarcraftTmgContract(canonicalFacts) } : {}),
          ...(repairRevision ? { lockedScheduleHash:
            plan.openingDeploymentSchedule.scheduleHash,
            mathSourceAuditHash: sourceAudit.auditHash,
            finalPlanReviewHash:
              request.finalPlanReview?.review.reviewHash || null } : {}),
          ...(supplyAuthority ? { armyAuditResultHash:
            supplyAuthority.armyAuditResultHash,
            missionScoringProfileHash:
              supplyAuthority.missionScoringProfileHash } : {}) },
        ...(presetRevision || agentScheduledRevision ? {
          outputContract: agentScheduledRevision
            ? AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_V1
            : repairRevision
              ? PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1
              : PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1,
          outputContractRef: agentScheduledRevision
            ? AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_REF_V1
            : repairRevision
              ? PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_REF_V1
              : PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_REF_V1,
          promptPack: presetRevision
            ? ROSTER_STRATEGIST_PRESET_PROMPT_PACK_V1
            : ROSTER_STRATEGIST_PROMPT_PACK_V1,
          decisionCandidateSource: presetRevision
            ? "rules_verified_immutable_room_roster_only"
            : "rules_verified_selected_agent_roster_only",
        } : {}),
      }), sink);
    const output = revisionDeliberation.output;
    const revisionWarnings = [];
    activeNarrativeWarnings = revisionWarnings;
    let revised;
    try {
      validateEnvelope(output, "revision");
      exactKeys(output, ["schemaVersion", "roundKind", "publicSummaryText",
        "revisedScoreRoute", "revisedDeploymentConcept",
        ...(presetRevision && !repairRevision
          ? ["openingDeploymentSchedule"] : []),
        ...(repairRevision ? ["componentPurposeRevisions"] : [])], code);
      const openingDeploymentSchedule = presetRevision
        ? repairRevision ? plan.openingDeploymentSchedule
          : createPlannedPresetRoundSupplyScheduleV1({
            proposedEntries: output.openingDeploymentSchedule,
            rosterCandidate: plan.rosterCandidate,
            armyAudit: request.armyAudit,
            missionProfile: request.missionProfile,
          }) : null;
      const purposeChanges = new Map();
      if (repairRevision) {
        const existing = new Set(plan.componentPurposes.map((entry) => (
          `${entry.componentKind}:${entry.instanceId}`)));
        for (const entry of output.componentPurposeRevisions) {
          const key = `${entry.componentKind}:${entry.instanceId}`;
          if (!existing.has(key) || purposeChanges.has(key)) {
            fail("ROSTER_STRATEGIST_PURPOSE_REPAIR_TARGET_INVALID");
          }
          purposeChanges.set(key, narrative(entry.publicPurposeText, code,
            { path: `componentPurposeRevisions.${key}` }));
        }
        if (purposeChanges.size > 0
          && !revisedSectionKeys.includes("componentPurposes")) {
          fail("ROSTER_STRATEGIST_PURPOSE_REPAIR_SCOPE_INVALID");
        }
      }
      const revision = createRosterPlanRevisionEventV1({
        revisionId: `${plan.planId}-revision-${plan.planVersion + 1}`,
        planId: plan.planId,
        fromPlanVersion: plan.planVersion,
        toPlanVersion: plan.planVersion + 1,
        previousPlanHash: plan.planHash,
        reasonText,
        triggerIds,
        revisedSectionKeys,
      });
      const revisedInput = {
        planId: plan.planId,
        planVersion: plan.planVersion + 1,
        // A section revision never changes the roster, so a budget-unmet
        // draft stays a draft; only a met plan advances to revised.
        planStatus: plan.planStatus === "draft" ? "draft" : "revised",
        sideKey: plan.sideKey,
        provenance: plan.provenance,
        rosterCandidate: plan.rosterCandidate,
        scoreRoute: revisedSectionKeys.includes("scoreRoute")
          && object(output.revisedScoreRoute)
          ? createRosterScoreRouteV1(validateScoreRoute(output.revisedScoreRoute, code))
          : plan.scoreRoute,
        lossResourceBudget: plan.lossResourceBudget,
        componentPurposes: purposeChanges.size > 0
          ? plan.componentPurposes.map((entry) => {
            const replacement = purposeChanges.get(
              `${entry.componentKind}:${entry.instanceId}`);
            return replacement
              ? createRosterComponentPurposeV1({ ...entry,
                publicPurposeText: replacement }) : entry;
          }) : plan.componentPurposes,
        deploymentConcept: revisedSectionKeys.includes("deploymentConcept")
          && object(output.revisedDeploymentConcept)
          ? createRosterDeploymentConceptV1({
            deploymentConceptText: narrative(
              output.revisedDeploymentConcept.deploymentConceptText, code,
              { path: "revisedDeploymentConcept.deploymentConceptText" }),
            activationOrderStatus:
              output.revisedDeploymentConcept.activationOrderStatus === "declared"
                ? "declared" : "unknown",
            activationOrder: (output.revisedDeploymentConcept.activationOrder || [])
              .map((entry) => ({
                ordinal: Number(entry?.ordinal),
                unitInstanceId: nonEmpty(entry?.unitInstanceId, code),
                phase: nonEmpty(entry?.phase, code) })),
            reinforcementPolicyText: narrative(
              output.revisedDeploymentConcept.reinforcementPolicyText, code,
              { path: "revisedDeploymentConcept.reinforcementPolicyText" }),
            threatTradeText: narrative(
              output.revisedDeploymentConcept.threatTradeText, code,
              { path: "revisedDeploymentConcept.threatTradeText" }),
            objectiveControlText: narrative(
              output.revisedDeploymentConcept.objectiveControlText, code,
              { path: "revisedDeploymentConcept.objectiveControlText" }) })
          : plan.deploymentConcept,
        opponentHypotheses: plan.opponentHypotheses,
        counterResponses: plan.counterResponses,
        invalidationTriggers: plan.invalidationTriggers,
        revisions: [...(plan.revisions || []), revision],
        comparisons: plan.comparisons,
        toolReceiptReferences: plan.toolReceiptReferences,
        publicSummaryText: narrative(output.publicSummaryText, code,
          { path: "publicSummaryText" }),
        // The roster is unchanged by a section revision, so the Rules-derived
        // budget acceptance carries over byte-identically.
        budgetAcceptance: plan.budgetAcceptance ?? null,
      };
      const revisedBase = presetRevision
        ? createPlannedPresetRosterPlanV2({ ...revisedInput,
          baselinePlan: request.baselinePlan,
          openingDeploymentSchedule })
        : createRosterPlanV1(revisedInput);
      revised = agentScheduledRevision
        ? createAgentScheduledRosterPlanV1({
          sourcePlan: revisedBase,
          openingDeploymentSchedule: plan.openingDeploymentSchedule,
        }) : revisedBase;
      if (presetRevision) verifyPlannedPresetRosterPlanRoundTripV2(revised);
      else if (agentScheduledRevision) {
        verifyAgentScheduledRosterPlanRoundTripV1(revised);
      } else verifyRosterPlanRoundTripV1(revised);
    } finally {
      activeNarrativeWarnings = null;
    }
    return freezeDeep({
      plan: revised,
      openingDeploymentSchedule:
        presetRevision || agentScheduledRevision
          ? clone(revised.openingDeploymentSchedule) : null,
      revisionEvent: revised.revisions[revised.revisions.length - 1],
      ...(initialPresetScheduling ? { claimRepairCoverage: {
        requestedClaimPaths: clone(request.targetedClaimPaths || highClaimPaths),
        deferredClaimPaths: clone(request.targetedClaimPaths || highClaimPaths),
        scheduleCreatedByModelAndCheckedByRules: true,
        semanticReviewStillRequired: true,
        initialScheduleIsNotClaimRepairCompletion: true,
        trainingTruth: false,
      } } : {}),
      narrativeDisplayWarnings: revisionWarnings,
      outputNormalizationReceipt:
        clone(revisionDeliberation.normalizationReceipt),
      outputShapeRecoveryReceipt:
        clone(revisionDeliberation.outputShapeRecoveryReceipt),
      deliberationReceipts: sink.deliberationReceipts.map((entry) => clone(entry)),
    });
  }

  return freezeDeep({
    runtimeDescriptor: () => descriptor,
    selectSkillRoute,
    planRoster,
    planPresetRoster,
    reviseRosterPlan,
  });
}

export function verifyRosterStrategistDescriptorV1(value) {
  if (!object(value) || value.schema !== ROSTER_STRATEGIST_DESCRIPTOR_SCHEMA
    || value.descriptorHash !== hashStarcraftTmgContract(
      without(value, ["descriptorHash"]))
    || value.hostPreferenceWeights !== false
    || value.promptPreferenceWeights !== false
    || value.runtimeRanksOrScoresCandidates !== false
    || value.rulesRemainSoleLegalityAuthority !== true
    || value.hiddenChainOfThoughtRequested !== false
    || value.hiddenChainOfThoughtPersisted !== false
    || value.unknownStaysUnknown !== true
    || value.trainingTruth !== false) {
    fail("ROSTER_STRATEGIST_DESCRIPTOR_INVALID");
  }
  return true;
}

export function verifyRosterStrategistSessionReceiptV1(value) {
  if (!object(value) || value.schema !== ROSTER_STRATEGIST_SESSION_RECEIPT_SCHEMA
    || value.receiptHash !== hashStarcraftTmgContract(
      without(value, ["receiptHash"]))
    || value.selectedByAgentDeliberation !== true
    || value.hostPreferenceWeights !== false
    || value.hiddenChainOfThoughtRequested !== false
    || value.hiddenChainOfThoughtPersisted !== false
    || value.rulesRemainSoleLegalityAuthority !== true
    || value.unknownStaysUnknown !== true
    || value.trainingTruth !== false
    || !HASH_PATTERN.test(String(value.planHash || ""))
    || !HASH_PATTERN.test(String(value.finalAuditResultHash || ""))) {
    fail("ROSTER_STRATEGIST_SESSION_RECEIPT_INVALID");
  }
  return true;
}

export function verifyRosterStrategistPresetSessionReceiptV1(value) {
  if (!object(value)
    || value.schema !== ROSTER_STRATEGIST_PRESET_SESSION_RECEIPT_SCHEMA
    || value.receiptHash !== hashStarcraftTmgContract(
      without(value, ["receiptHash"]))
    || value.planningMode !== "planned_preset_locked_roster"
    || value.selectedByAgentDeliberation !== false
    || value.hostPreferenceWeights !== false
    || value.hiddenChainOfThoughtRequested !== false
    || value.hiddenChainOfThoughtPersisted !== false
    || value.rulesRemainSoleLegalityAuthority !== true
    || value.unknownStaysUnknown !== true
    || value.trainingTruth !== false
    || ![value.planHash, value.baselinePlanHash,
      value.presetRosterLockHash, value.finalAuditResultHash]
      .every((entry) => HASH_PATTERN.test(String(entry || "")))
    || value.comparisonHash !== null
    || value.rejectionReceiptHashes?.length !== 0) {
    fail("ROSTER_STRATEGIST_PRESET_SESSION_RECEIPT_INVALID");
  }
  return true;
}
