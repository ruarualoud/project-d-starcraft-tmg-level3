// Ticket 27 / Slice 271 — isolated roster-planning workspace service.
//
// One isolated service that wires the EXISTING injected ports — the
// Rules-owned Army Builder query port (sole legality authority, read-only),
// the Slice-270 pregame scene laboratory (deep-clone isolation with a
// mutation-zero proof), the Slice-269 Roster Strategist runtime and the
// frozen portable strategy Skill pack — into a session-oriented planning
// workspace: setup, explicit generate, asynchronous round progress, typed
// error/cancel states, candidate compare, manual override through the Builder
// port (plan evidence marked stale until an explicit revision), resumable
// persisted drafts, retained-reply zero-cost replay resume and secret-free
// export/import.
//
// The service never receives a Room runtime and cannot mutate any source
// Room; the laboratory's mutation-zero proof is re-run after every planning
// session. It never holds a credential: live deliberation arrives only as an
// injected factory (the manifest's authorized browser verifier attaches the
// Keychain credential to the isolated Worker inside its own process). No
// opaque automatic retry: cancellation before a send never sends; explicitly
// enabled, ledgered network recovery permits one same-request attempt, while
// other uncertain/rejected dispatches stop with a typed failure. Retained
// completed replies allow a byte-identical local replay resume at zero
// additional Provider cost.

import { randomUUID } from "node:crypto";
import { canReencodeRejectedRosterReviewV1, isUndispatchedCurrentRosterReviewV1, ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1 }
  from '../roster-strategist/roster-review-catalogue-transport-v1.mjs';
import { isDeepStrictEqual } from "node:util";
import { resumeRosterTeachCapabilityDiscoveryV1, resumeRosterTeachDependentQueriesV1,
  configureRosterTeachProductInvestigationV1, rosterTeachInvestigationWindowV1 } from '../roster-strategist/roster-teach-capability-guide-v1.mjs';
import { beginRosterTeachFactProbeV1, beginRosterTeachSynthesisReviewV1,
  isRosterTeachSynthesisReviewPendingV1 } from '../roster-strategist/roster-teach-fact-probe-v1.mjs';
import { withRosterTeachPlanHistoryV1, createRosterTeachHistoryEvidenceV1 } from '../roster-strategist/roster-teach-history-view-v1.mjs';
import { STRUCTURED_PLAN_TOOLS_PROTOCOL_V1, STRUCTURED_PLAN_TOOLS_PROTOCOL_V2, STRUCTURED_PLAN_TOOLS_PROTOCOL_V3 } from '../roster-strategist/roster-plan-edit-tools-v1.mjs';
import { createRosterPlanEditRecoveryPortV1, rosterPlanRevisionRecoveryV1 } from '../roster-strategist/roster-plan-edit-recovery-v1.mjs';
import { rosterRelatedRepairClaimPathsV1 } from '../roster-strategist/roster-public-claim-paths-v1.mjs';
import { projectRosterTeachSourceReviewV1 } from '../roster-strategist/roster-teach-source-review-v1.mjs';

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import {
  parseRosterPlanV1,
  ROSTER_PLAN_SCHEMA,
  ROSTER_FORMAL_BUDGET_CONTRACT_V1,
  serializeRosterPlanV1,
  verifyRosterPlanRoundTripV1,
} from "../roster-strategist/roster-plan-contracts-v1.mjs";
import {
  PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  createPlannedPresetRoundSupplyScheduleV2,
  parsePlannedPresetRosterPlanV2,
  serializePlannedPresetRosterPlanV2,
  verifyPlannedPresetRosterPlanRoundTripV2,
} from "../roster-strategist/planned-preset-roster-plan-v2.mjs";
import {
  AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
  parseAgentScheduledRosterPlanV1,
  serializeAgentScheduledRosterPlanV1,
  verifyAgentScheduledRosterPlanRoundTripV1,
} from "../roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { createVerifiedBuilderLockedRosterForTeachV1 } from
  "../roster-strategist/verified-preset-roster-lock-v1.mjs";
import { verifyIterativeRosterTeachHandoffV1, verifyIterativeRosterSelectionEvidenceV1 } from
  "../roster-strategist/iterative-roster-teach-handoff-v1.mjs";
import { projectIterativeRosterEvidenceV1, mergeIterativeSelectionQueryReceiptsV1 } from '../roster-strategist/iterative-roster-tool-port-v1.mjs';
import { verifyAgentSelectedTeachSessionReceiptV1 } from
  "../roster-strategist/agent-selected-teach-plan-bridge-v1.mjs";
import { createRosterTeachRolePortsV1, normalizeRosterTeachPublicOutputV1 } from
  "../roster-strategist/roster-teach-role-ports-v1.mjs";
import { recoverRosterFailedProviderOutputV1 } from
  "./roster-planning-secure-deliberation-factory-v1.mjs";
import { reviewRosterFinalPlanV3, buildRosterReviewFactPacketV1, effectiveRosterFinalPlanReviewFindingsV1,
  reconcileRosterFinalPlanReviewV1, countRosterReviewDispatchesV1, countRosterReviewCapacityRefusalsV1,
  needsRosterFinalPlanReconciliationV1,
  ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION,
  ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3 } from
  "../roster-strategist/roster-final-plan-review-v1.mjs";
import { ROSTER_PLAN_SOURCE_AUDIT_VERSION } from
  "../roster-strategist/roster-plan-source-audit-v1.mjs";
import { collectRosterClaimRepairBacklogV1 } from
  "../roster-strategist/roster-claim-repair-backlog-v1.mjs";
import { projectCurrentRosterSelectionJustificationV1 } from
  "../roster-strategist/roster-selection-justification-v1.mjs";
import { runReviewedRosterPlanRepairV1 } from "./reviewed-plan-auto-repair-v1.mjs";
import { createPresetRosterJourneyV1 } from './preset-roster-journey-v1.mjs';
import { ROSTER_PLANNING_EVIDENCE_POLICY_V1, rosterTeachIssueLedgerV1, prepareRosterTeachContextV1, isUnsentInitialRosterPlanningV1 }
  from '../roster-strategist/roster-planning-workflow-v1.mjs';
import { reconcileStarcraftTmgProviderDispatchV1 } from
  "../secure-provider-runtime/provider-dispatch-recovery-v1.mjs";
import { deriveNearCapThresholdMineralsV1,
  normalizeRosterStrategistReplyForRequestV1,
  ROSTER_STRATEGIST_PROMPT_PACK_V1 } from
  "../roster-strategist/roster-strategist-runtime-v1.mjs";
import { queryRosterBudgetBranchesV1 } from
  "../roster-strategist/roster-budget-branch-query-v1.mjs";
import { ROSTER_PLANNING_SESSION_SCHEMA } from
  "./roster-planning-draft-store-v1.mjs";
import { runRosterTeachFrameworkSessionV1, deriveRosterTeachSavedEvidenceBindingV1,
  ROSTER_TEACH_EVIDENCE_BINDING_VERSION,
  validateRosterTeachInvestigationProgressV1,
  ROSTER_TEACH_FRAMEWORK_VERSION } from
  "../roster-strategist/roster-teach-framework-v1.mjs";
import { hasRosterTeachCorrectableContinuationV1 } from
  "../roster-strategist/roster-teach-query-recovery-v1.mjs";
import { isRecoverableProviderNetworkFailureV1 } from
  '../secure-provider-runtime/provider-network-resilience-v1.mjs';

export const ROSTER_PLANNING_WORKSPACE_MODULE =
  "packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs";
export const ROSTER_PLANNING_WORKSPACE_VERSION = "1.1.0";
export const ROSTER_WORKSPACE_EXPORT_SCHEMA =
  "starcraft_tmg_roster_workspace_export_v1";
export const ROSTER_WORKSPACE_SESSION_PROJECTION_SCHEMA =
  "starcraft_tmg_roster_workspace_session_projection_v1";
export const ROSTER_WORKSPACE_OPPONENT_INFORMATION_BOUNDARIES = Object.freeze([
  "open_roster",
  "unknown_roster",
]);
export const ROSTER_WORKSPACE_REVISABLE_SECTION_KEYS = Object.freeze([
  "scoreRoute",
  "deploymentConcept",
  "componentPurposes",
  "publicSummaryText",
  "opponentHypotheses",
  "counterResponses",
  "invalidationTriggers",
]);

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SECRET_KEY_PATTERN =
  /api[-_]?key|secret|credential|password|authorization|seat[-_]?token|recovery[-_]?token|bearer|private[-_]?key/iu;
const MAX_EXPORT_BYTES = 2 * 1024 * 1024;
const SECRET_SCAN_MAX_DEPTH = 16;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) wsFail(code);
  return text;
}
function wsFail(code, detail = "", httpStatus = 400) {
  throw Object.assign(new Error(detail ? `${code}:${detail}` : code),
    { code, httpStatus, workspaceError: true });
}
function errorCode(error, fallback = "ROSTER_WORKSPACE_INTERNAL_FAILURE") {
  const value = String(error?.code || "").toUpperCase();
  if (/^[A-Z][A-Z0-9_]{2,95}$/u.test(value)) return value;
  const message = String(error?.message || "").split(":")[0];
  return /^[A-Z][A-Z0-9_]{2,95}$/u.test(message) ? message : fallback;
}

function parseWorkspacePlan(serialized) {
  let shape;
  try { shape = JSON.parse(String(serialized)); }
  catch { wsFail("ROSTER_WORKSPACE_PLAN_SERIALIZATION_INVALID"); }
  if (shape?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    return parsePlannedPresetRosterPlanV2(serialized);
  }
  if (shape?.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
    return parseAgentScheduledRosterPlanV1(serialized);
  }
  return parseRosterPlanV1(serialized);
}

function serializeWorkspacePlan(plan) {
  if (plan?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    return serializePlannedPresetRosterPlanV2(plan);
  }
  if (plan?.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
    return serializeAgentScheduledRosterPlanV1(plan);
  }
  return serializeRosterPlanV1(plan);
}

function verifyWorkspacePlanRoundTrip(plan) {
  if (plan?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    return verifyPlannedPresetRosterPlanRoundTripV2(plan);
  }
  if (plan?.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
    return verifyAgentScheduledRosterPlanRoundTripV1(plan);
  }
  return verifyRosterPlanRoundTripV1(plan);
}

// A retained v1 comparison-only Agent plan may gain a model-chosen,
// Rules-checked arrival schedule without rewriting its six paid replies.
// This is an explicit generation upgrade, never ordinary replay hash drift:
// only schedule-facing public prose may change. Every other plan field must
// remain byte-identical to the previously stored plan.
function isAgentArrivalGenerationUpgrade(previous, next,
  previousReceipt, nextReceipt) {
  if (previous?.schema !== ROSTER_PLAN_SCHEMA
    || next?.schema !== AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
    || previous.planStatus !== "active"
    || next.planStatus !== "active"
    || previous.planVersion !== next.planVersion
    || previous.revisions.length !== 0
    || previousReceipt?.planHash !== previous.planHash
    || nextReceipt?.planHash !== next.planHash
    || nextReceipt?.openingDeploymentScheduleHash
      !== next.openingDeploymentSchedule?.scheduleHash) return false;
  const allowedToChange = new Set(["schema", "planHash",
    "deploymentConcept", "publicSummaryText",
    "sourcePlanHash", "openingDeploymentSchedule"]);
  const stable = (plan) => Object.fromEntries(Object.entries(plan)
    .filter(([key]) => !allowedToChange.has(key)));
  return isDeepStrictEqual(stable(previous), stable(next));
}

// Re-derive the Builder candidate input shape from the public RosterCandidate
// contract (manual override starts from this). Exported so the acceptance
// harness can restore a working list to the exact plan candidate without
// duplicating the mapping.
export function deriveRosterWorkspaceCandidateInputV1(candidate) {
  return {
    sideKey: candidate.sideKey,
    scaleId: candidate.scaleId,
    mineralBudget: candidate.mineralBudget,
    factionRecordKey: candidate.factionRecordKey,
    tacticalCardRecordKeys: [...candidate.tacticalCardRecordKeys],
    units: candidate.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgrades: unit.upgradeSelections.map((upgrade) => ({
        ...(upgrade.upgradeName
          ? { upgradeName: upgrade.upgradeName } : {}),
        ...(upgrade.purchasableUpgradeProfileId
          ? { purchasableUpgradeProfileId:
            upgrade.purchasableUpgradeProfileId } : {}),
        ...(upgrade.nominatedModelId
          ? { nominatedModelId: upgrade.nominatedModelId } : {}),
      })),
    })),
  };
}

// Secret-hygiene gate for imported export documents: any key that looks like
// credential material AND carries a non-empty string value fails the import
// closed. Boolean hygiene declarations (containsNoSecrets:false-style fields)
// carry no material and are allowed; a real secret is always a string.
function assertNoSecretKeys(value, path = "$", depth = 0) {
  if (depth > SECRET_SCAN_MAX_DEPTH) {
    wsFail("ROSTER_WORKSPACE_IMPORT_SECRET_REJECTED", `${path}:depth`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretKeys(
      entry, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!object(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key) && typeof child === "string"
      && child.trim().length > 0) {
      wsFail("ROSTER_WORKSPACE_IMPORT_SECRET_REJECTED", `${path}.${key}`);
    }
    assertNoSecretKeys(child, `${path}.${key}`, depth + 1);
  }
}

// Multiset diff between two Builder candidate inputs (content-addressed, not
// positional): units keyed by recordKey+compositionKind, upgrades and
// tactical cards as multisets. Pure presentation; legality always comes from
// the Builder port verdicts, never from this diff.
export function diffRosterCandidateInputsV1(selectedInput, otherInput) {
  const unitKey = (unit) => `${unit.recordKey}|${unit.compositionKind}`;
  const upgradeList = (unit) => (unit.upgrades || [])
    .map((upgrade) => String(
      upgrade.upgradeName ?? upgrade.purchasableUpgradeProfileId ?? ""))
    .sort();
  const multiset = (units) => {
    const map = new Map();
    for (const unit of units || []) {
      const key = unitKey(unit);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ upgrades: upgradeList(unit) });
    }
    return map;
  };
  const selected = multiset(selectedInput?.units);
  const other = multiset(otherInput?.units);
  const added = [];
  const removed = [];
  const changed = [];
  for (const [key, list] of other) {
    const reference = selected.get(key) || [];
    for (let index = 0; index < list.length; index += 1) {
      if (index >= reference.length) {
        added.push({ unitKey: key, upgrades: list[index].upgrades });
      } else if (JSON.stringify(list[index].upgrades)
        !== JSON.stringify(reference[index].upgrades)) {
        changed.push({ unitKey: key,
          selectedUpgrades: reference[index].upgrades,
          candidateUpgrades: list[index].upgrades });
      }
    }
  }
  for (const [key, list] of selected) {
    const reference = other.get(key) || [];
    if (list.length > reference.length) {
      for (let index = reference.length; index < list.length; index += 1) {
        removed.push({ unitKey: key });
      }
    }
  }
  const tally = (keys) => {
    const map = new Map();
    for (const key of keys || []) map.set(key, (map.get(key) || 0) + 1);
    return map;
  };
  const selectedTactical = tally(selectedInput?.tacticalCardRecordKeys);
  const otherTactical = tally(otherInput?.tacticalCardRecordKeys);
  const tacticalAdded = [];
  const tacticalRemoved = [];
  for (const [key, count] of otherTactical) {
    const base = selectedTactical.get(key) || 0;
    if (count > base) tacticalAdded.push({ recordKey: key, count: count - base });
  }
  for (const [key, count] of selectedTactical) {
    const base = otherTactical.get(key) || 0;
    if (count > base) tacticalRemoved.push({ recordKey: key, count: count - base });
  }
  return Object.freeze({
    unitsAdded: added, unitsRemoved: removed, unitsChanged: changed,
    tacticalCardsAdded: tacticalAdded, tacticalCardsRemoved: tacticalRemoved,
    presentationOnlyNotALegalityVerdict: true,
  });
}

// Retained-reply replay port (workspace-side, zero Provider cost): replays
// the sanitized public answers retained from a previous paid run
// byte-identically (fidelity re-hash per round). A round without a retained
// reply falls through to the injected live port when present, otherwise fails
// closed — a replay resume never fabricates a model answer.
export function createRetainedReplayDeliberationPortV1(input = {}) {
  const retainedOutputs = Array.isArray(input.retainedOutputs)
    ? input.retainedOutputs : [];
  const livePort = input.livePort || null;
  const onEvent = typeof input.onEvent === "function" ? input.onEvent : null;
  const requireContextBoundReplay = input.requireContextBoundReplay === true;
  const modelVersion = nonEmpty(
    input.modelVersion || "retained-replay", "ROSTER_WORKSPACE_REPLAY_INVALID");
  const consumed = new Set();
  function compatibleContract(candidate, request, requestedContract) {
    const retainedContract = candidate.outputContractRef;
    if (retainedContract?.id !== requestedContract.id) return false;
    if (retainedContract.version === requestedContract.version
      && retainedContract.hash === requestedContract.hash) return true;
    const major = value => /^(\d+)\./u.exec(String(value || ""))?.[1];
    // Metadata drift within the same interface major is not content drift.
    // Revalidate through the SAME consumer normalization, while returning the
    // unchanged paid bytes for its ordinary downstream Rules/semantic checks.
    // the caller still requires the same role, round, context and output hash.
    // Rules/semantic validation after replay remains authoritative.
    if (major(retainedContract.version) === undefined
      || major(retainedContract.version) !== major(requestedContract.version)
      || !object(request.responseFormat?.schema)
      || !object(candidate.sanitizedOutput)) return false;
    try {
      const nodes = Array.isArray(request.promptNodes) ? request.promptNodes : [];
      const normalized = ["teach_challenge", "teach_revision"]
          .includes(request.roundKind)
        ? normalizeRosterTeachPublicOutputV1(request.roundKind,
          candidate.sanitizedOutput, {
            initialFoundation: nodes.find(node =>
              node.kind === "initial-small-plan")?.foundation ?? null,
            challenges: nodes.find(node =>
              node.kind === "independent-challenges-and-read-only-evidence")
              ?.challenges ?? null,
          })
        : normalizeRosterStrategistReplyForRequestV1({
          output: candidate.sanitizedOutput, request,
        });
      return validateStarcraftTmgProviderJsonSchemaValueV1(
        request.responseFormat.schema, normalized.output).ok;
    } catch { return false; }
  }
  return Object.freeze({
    descriptor: () => Object.freeze({
      kind: livePort
        ? "workspace_retained_replay_plus_live_remainder"
        : "workspace_retained_replay_zero_provider",
      modelVersion,
      promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
      paidProviderCalls: 0,
      realProviderCalls: 0,
      retainedReplyCount: retainedOutputs.length,
      trainingTruth: false,
    }),
    async deliberate(request) {
      const requestedContract = request?.responseFormat?.outputContractRef;
      if (!object(requestedContract)
        || !String(requestedContract.id || "").trim()
        || !String(requestedContract.version || "").trim()
        || !HASH_PATTERN.test(String(requestedContract.hash || ""))) {
        wsFail("ROSTER_WORKSPACE_ROUND_CONTRACT_INVALID", "replay_contract", 409);
      }
      const entry = retainedOutputs.find((candidate, index) => (
        !consumed.has(index)
          && candidate.roundKind === request.roundKind
          && Number(candidate.roundIndex) === Number(request.roundIndex)
          && (candidate.contextHash === request.contextHash
            || !requireContextBoundReplay
              && candidate.contextHash === undefined)
          && compatibleContract(candidate, request, requestedContract)
          && object(candidate.sanitizedOutput)
          && hashStarcraftTmgContract(candidate.sanitizedOutput)
            === candidate.outputHash));
      if (entry) {
        consumed.add(retainedOutputs.indexOf(entry));
        const startedAt = new Date().toISOString();
        if (onEvent) {
          await onEvent({ type: "round_started", roundKind: request.roundKind,
            roundIndex: request.roundIndex, replayed: true, at: startedAt });
        }
        const receiptBody = {
          providerKind: "workspace_retained_replay_zero_provider",
          modelVersion,
          promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
          roundKind: request.roundKind,
          contextHash: request.contextHash,
          outputHash: entry.outputHash,
          outputContractRef: clone(requestedContract),
          ...(entry.outputContractRef.hash !== requestedContract.hash
            || entry.outputContractRef.version !== requestedContract.version
            ? { retainedOutputContractRef: clone(entry.outputContractRef),
              outputContractCompatibility: "same_major_current_schema_revalidated",
              retainedOutputHashUnchanged: true } : {}),
          usage: null,
          usageStatus: "not_applicable_retained_replay",
          latencyMs: null,
          paidProviderCall: false,
          replayedRetainedReply: true,
          trainingTruth: false,
        };
        const receipt = Object.freeze({ ...receiptBody,
          receiptHash: hashStarcraftTmgContract(receiptBody) });
        if (onEvent) {
          await onEvent({ type: "round_completed", roundKind: request.roundKind,
            roundIndex: request.roundIndex, replayed: true,
            paidProviderCall: false, receiptHash: receipt.receiptHash,
            outputHash: entry.outputHash, at: new Date().toISOString() });
        }
        return Object.freeze({ output: clone(entry.sanitizedOutput), receipt });
      }
      if (!livePort) {
        const sameRound = retainedOutputs.filter((candidate) => (
          candidate.roundKind === request.roundKind
            && Number(candidate.roundIndex) === Number(request.roundIndex)));
        const sameContext = sameRound.filter((candidate) => (
          candidate.contextHash === request.contextHash
            || !requireContextBoundReplay
              && candidate.contextHash === undefined));
        if (sameContext.some((candidate) => (
          candidate.outputContractRef?.id !== requestedContract.id
            || candidate.outputContractRef?.version
              !== requestedContract.version
            || candidate.outputContractRef?.hash
              !== requestedContract.hash))) {
          wsFail("ROSTER_WORKSPACE_RESUME_OUTPUT_CONTRACT_MISMATCH",
            `${request.roundKind}#${request.roundIndex}:retained_legacy_or_drifted`,
            409);
        }
        wsFail("ROSTER_WORKSPACE_RESUME_OUTPUT_MISSING",
          `${request.roundKind}#${request.roundIndex}:`+
          `requested_context=${String(request.contextHash || "").slice(0, 12)}`+
          `:retained_contexts=${sameRound.map((candidate) =>
            String(candidate.contextHash || "unbound").slice(0, 12)).join(",")}`,
          409);
      }
      return livePort.deliberate(request);
    },
  });
}

export function createRosterPlanningWorkspaceServiceV1(input = {}) {
  const armyBuilderPort = input.armyBuilderPort;
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.enumerateArmyBuildingChoices !== "function"
    || typeof armyBuilderPort?.listFactionChoices !== "function"
    || typeof armyBuilderPort?.listEngagementScales !== "function") {
    wsFail("ROSTER_WORKSPACE_BUILDER_PORT_INVALID",
      "missing_methods", 500);
  }
  const laboratoryCore = input.laboratoryCore;
  if (typeof laboratoryCore?.labDescriptor !== "function"
    || typeof laboratoryCore?.proveMutationZero !== "function"
    || typeof laboratoryCore?.missionScoringAuthority !== "function") {
    wsFail("ROSTER_WORKSPACE_LABORATORY_INVALID", "missing_methods", 500);
  }
  if (typeof input.createRunLaboratory !== "function"
    || typeof input.createStrategist !== "function") {
    wsFail("ROSTER_WORKSPACE_FACTORY_INVALID", "missing_methods", 500);
  }
  const pack = input.strategyPack;
  if (!Array.isArray(pack?.foundational?.entries)
    || !HASH_PATTERN.test(String(pack?.receipt?.hash || ""))) {
    wsFail("ROSTER_WORKSPACE_STRATEGY_PACK_INVALID", "pack", 500);
  }
  const draftStore = input.draftStore;
  if (typeof draftStore?.save !== "function"
    || typeof draftStore?.loadAll !== "function") {
    wsFail("ROSTER_WORKSPACE_DRAFT_STORE_INVALID", "missing_methods", 500);
  }
  const fixture = object(input.fixture) ? clone(input.fixture) : null;
  if (!fixture
    || !HASH_PATTERN.test(String(fixture.mapTopologyHash || ""))) {
    wsFail("ROSTER_WORKSPACE_FIXTURE_INVALID", "fixture", 500);
  }
  const deliberationFactory = input.deliberationFactory || null;
  const estimateCost = typeof input.estimateCost === "function"
    ? input.estimateCost : null;
  const now = typeof input.now === "function"
    ? input.now : () => new Date().toISOString();
  const createSessionId = typeof input.createSessionId === "function"
    ? input.createSessionId
    : () => `rws-${randomUUID()}`;
  const serviceId = nonEmpty(input.serviceId || "roster-planning-workspace-v1",
    "ROSTER_WORKSPACE_INVALID");

  const sessions = new Map();
  const autoRepairRuns = new Map();
  let quarantinedDrafts = [];
  let activeRun = null; // one planning job at a time; receipts stay attributable

  function deliberationAvailability() {
    if (!deliberationFactory
      || typeof deliberationFactory.availability !== "function") {
      return Object.freeze({
        available: false,
        reason: "ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
        detail: "no_live_deliberation_factory_attached",
        kind: null,
        modelVersion: null,
        paidProvider: false,
      });
    }
    const availability = deliberationFactory.availability();
    return Object.freeze({
      available: availability?.available === true,
      reason: availability?.available === true
        ? null
        : (availability?.reason || "ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE"),
      detail: availability?.detail || null,
      kind: availability?.kind || null,
      modelVersion: availability?.modelVersion || null,
      paidProvider: availability?.paidProvider === true,
    });
  }

  function summarizeVerdict(verdict) {
    if (!object(verdict)) return null;
    if (verdict.schema === "starcraft_tmg_army_builder_roster_verdict_v1") {
      return {
        status: "legal",
        candidateHash: verdict.candidateHash,
        auditResultHash: verdict.auditResultHash,
        verdictHash: verdict.verdictHash,
        mineralBudget: verdict.summary.mineralBudget,
        mineralSpent: verdict.summary.mineralSpent,
        mineralUnspent: verdict.summary.mineralUnspent,
        vespeneSpent: verdict.summary.vespeneSpent,
        unitCount: verdict.summary.unitCount,
        startingModelCount: verdict.summary.startingModelCount,
        startingSupply: verdict.summary.startingSupply,
        scaleId: verdict.summary.scaleId,
        rulesErrorCode: null,
        rejectionKind: null,
      };
    }
    return {
      status: verdict.status || "unknown",
      candidateHash: verdict.candidateHash || null,
      auditResultHash: null,
      verdictHash: verdict.receiptHash || null,
      mineralBudget: null,
      mineralSpent: null,
      mineralUnspent: null,
      vespeneSpent: null,
      unitCount: null,
      startingModelCount: null,
      startingSupply: null,
      scaleId: null,
      rulesErrorCode: verdict.rulesErrorCode || null,
      rulesErrorDetail: verdict.rulesErrorDetail || null,
      rejectionKind: verdict.rejectionKind || null,
    };
  }

  // Formal budget contract view (Slice 272): the same versioned product
  // contract the runtime enforces, with the Rules/Builder-derived threshold
  // and vespene cap for this faction/scale/budget, so the UI can display
  // the tolerance and per-list compliance exactly as the chain computes it.
  const budgetContractViewCache = new Map();
  function budgetContractView(factionRecordKey, scaleId, mineralBudget) {
    const cacheKey = `${factionRecordKey}|${scaleId}|${mineralBudget}`;
    if (budgetContractViewCache.has(cacheKey)) {
      return budgetContractViewCache.get(cacheKey);
    }
    const enumeration = armyBuilderPort.enumerateArmyBuildingChoices({
      factionRecordKey, scaleId, mineralBudget });
    const nearCapThresholdMinerals = deriveNearCapThresholdMineralsV1({
      units: enumeration.unitCandidates });
    const vespeneFormalCap = Math.floor(
      (enumeration.vespeneLimitForBudget?.numerator ?? 0)
        / (enumeration.vespeneLimitForBudget?.denominator ?? 1));
    const contract = ROSTER_FORMAL_BUDGET_CONTRACT_V1;
    const view = Object.freeze({
      contractSchema: contract.schema,
      contractVersion: contract.version,
      contractHash: contract.contractHash,
      mineralBudget,
      mineralUtilizationFloor: clone(contract.mineralUtilizationFloor),
      utilizationFloorBasisPoints: Math.round(
        (contract.mineralUtilizationFloor.numerator * 10_000)
          / contract.mineralUtilizationFloor.denominator),
      nearCapThresholdMinerals,
      nearCapThresholdDerivation: contract.nearCapExemptionThresholdDerivation,
      vespeneFormalCap,
      unspentResourceDisposition: "lost",
      agentGeneratedCompletionPolicyVersion:
        "agent_exact_budget_or_draft_v1",
      agentGeneratedCompletionTargetMinerals: mineralBudget,
      historicalFloorDoesNotCompleteAgentRoster: true,
      severeUnderspendClosesAsDraftNeverActive:
        contract.severeUnderspendClosesAsDraftNeverActive,
      toleranceDisplayTextZh: contract.toleranceDisplayTextZh,
      toleranceDisplayTextEn: contract.toleranceDisplayTextEn,
      trainingTruth: false,
    });
    budgetContractViewCache.set(cacheKey, view);
    return view;
  }
  function annotateBudget(verdictSummary, contractView) {
    if (!object(verdictSummary) || verdictSummary.status !== "legal") {
      return verdictSummary;
    }
    const floor = contractView.mineralUtilizationFloor;
    const meetsFloor = verdictSummary.mineralSpent * floor.denominator
      >= contractView.mineralBudget * floor.numerator;
    const nearCap = verdictSummary.mineralUnspent
      < contractView.nearCapThresholdMinerals;
    return Object.freeze({
      ...clone(verdictSummary),
      utilizationBasisPoints: Math.round(
        (verdictSummary.mineralSpent * 10_000) / contractView.mineralBudget),
      meetsFormalBudgetFloor: nearCap || meetsFloor,
      nearCap,
      vespeneWithinFormalCap:
        verdictSummary.vespeneSpent <= contractView.vespeneFormalCap,
    });
  }
  // Immutable Slice-272 comparison arm identity (preset roster, explicitly
  // no pregame plan), injected by the product composition and bound into
  // every catalogue/projection so the UI can show both arm identities.
  const presetArm = object(input.presetArm)
    && input.presetArm.planStatus === "no_pregame_plan"
    && HASH_PATTERN.test(String(input.presetArm.planHash || ""))
    ? clone(input.presetArm)
    : null;

  function candidateInputFromCandidate(candidate) {
    // Manual override starts from the Builder candidate input shape derived
    // from the public RosterCandidate contract.
    return deriveRosterWorkspaceCandidateInputV1(candidate);
  }

  function workingMatchesPlan(session, plan) {
    const working = session.working;
    if (!plan?.rosterCandidate || !working?.candidateInput
      || working.verdict?.schema
        !== "starcraft_tmg_army_builder_roster_verdict_v1"
      || working.verdict.auditResultHash
        !== plan.rosterCandidate.legalityReceipt?.auditResultHash) {
      return false;
    }
    if (session.lockedRoster
      && plan.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
      // The official audit sorts its semantic Unit rows; a user-locked
      // candidate keeps its original list order. Both are the same immutable
      // roster, but deriving a Builder input from the sorted plan and hashing
      // it would mark every valid preset as stale before its first revision.
      return session.lockedRoster.lock.candidate.candidateHash
          === plan.rosterCandidate.candidateHash
        && hashStarcraftTmgContract(working.candidateInput)
          === hashStarcraftTmgContract(
          session.lockedRoster.lock.candidateInput);
    }
    if (session.agentSelectionHandoffHash
      && plan.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
      // The temporary Teach lock and the promoted Agent candidate have
      // different candidate IDs and hashes by contract. The Builder audit,
      // roster fields and actual working input must remain identical.
      const locked = session.lockedRoster?.lock;
      return locked?.candidate?.sideKey === plan.rosterCandidate.sideKey
        && locked.candidate.factionRecordKey
          === plan.rosterCandidate.factionRecordKey
        && locked.candidate.scaleId === plan.rosterCandidate.scaleId
        && locked.candidate.mineralBudget
          === plan.rosterCandidate.mineralBudget
        && isDeepStrictEqual(locked.candidate.units,
          plan.rosterCandidate.units)
        && isDeepStrictEqual(locked.candidate.tacticalCardRecordKeys,
          plan.rosterCandidate.tacticalCardRecordKeys)
        && hashStarcraftTmgContract(working.candidateInput)
          === hashStarcraftTmgContract(locked.candidateInput);
    }
    return hashStarcraftTmgContract(working.candidateInput)
      === hashStarcraftTmgContract(
        candidateInputFromCandidate(plan.rosterCandidate));
  }

  function planEvidenceStale(session, plan) {
    return session.planEvidenceStale === true
      || Boolean(plan && !workingMatchesPlan(session, plan));
  }

  function projectSession(session) {
    const plan = session.planSerialized
      ? parseWorkspacePlan(session.planSerialized) : null;
    const claimRepairBacklog = collectRosterClaimRepairBacklogV1({ ...session,
      plan, planVersionHistory: (session.planVersionHistory || []).map(parseWorkspacePlan) });
    const availability = deliberationAvailability();
    const usage = session.usage;
    const estimatedCost = usage && estimateCost && usage.totalUnits > 0
      ? estimateCost(usage) : null;
    const effectiveFindings = session.planReview?.status === "completed"
      && session.planReview.planHash === plan?.planHash
      ? effectiveRosterFinalPlanReviewFindingsV1({ plan,
        review: session.planReview.review }) : [];
    // Historical unchanged/deferred claims are handled by the shared backlog;
    // an old raw High must not override a valid current source adjudication.
    const blockingHighFindings = effectiveFindings.some(finding =>
      finding.severity === "high" || finding.severity === "critical");
    const priorHighFindings = [session.planReview,
      ...(session.planReviewHistory || [])].some((entry) => (
      entry?.status === "completed"
        && entry.review?.findings.some((finding) => (
          finding.severity === "high")) === true));
    const currentReviewClean = session.planReview?.status === "completed"
      && session.planReview.planHash === plan?.planHash
      && session.planReview.review?.reviewContextVersion
        === ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3
      && !blockingHighFindings && claimRepairBacklog.length === 0;
    const contractView = budgetContractView(session.setup.factionRecordKey,
      session.setup.engagementScale, session.setup.mineralBudget);
    return {
      schema: ROSTER_WORKSPACE_SESSION_PROJECTION_SCHEMA,
      sessionId: session.sessionId,
      status: session.status,
      planningMode: session.planningMode || "agent_legacy_v1",
      agentSelectionHandoffHash:
        session.agentSelectionHandoffHash || null,
      agentSelectedCandidateHash:
        session.agentSelectedCandidateHash || null,
      agentSelectedStrategySource: clone(session.agentSelectedStrategySource || null),
      selectionJustification: projectCurrentRosterSelectionJustificationV1(
        plan, session.selectionJustification),
      agentSelectedArrivalScheduleHash:
        session.agentSelectedArrivalSchedule?.scheduleHash || null,
      completionPolicyVersion: session.completionPolicyVersion
        || "legacy_floor_v1",
      mapEvidencePolicyVersion: session.mapEvidencePolicyVersion
        || "legacy_map_advisory_v1",
      sourcePlanHash: session.sourcePlanHash || null,
      lockedTeachSourcePlan: session.lockedTeachSourcePlanSerialized
        ? clone(parseWorkspacePlan(
          session.lockedTeachSourcePlanSerialized)) : null,
      lockedTeachSourceSessionReceipt:
        clone(session.lockedTeachSourceSessionReceipt || null),
      lockedRoster: session.lockedRoster ? {
        baselinePlanId: session.lockedRoster.baselinePlan.planId,
        baselinePlanHash: session.lockedRoster.baselinePlan.planHash,
        auditResultHash: session.lockedRoster.lock.verdict.auditResultHash,
        unitCount: session.lockedRoster.lock.candidate.units.length,
        modelSelectionLocked: true,
      } : null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      setup: clone(session.setup),
      fixture: clone(fixture),
      progress: clone(session.progress),
      planRevisionRecovery: rosterPlanRevisionRecoveryV1(session,plan),
      providerDispatches: clone(session.providerDispatches || []),
      dispatchReconciliations: clone(session.dispatchReconciliations || []),
      dispatchRetryAuthorizations: clone(session.dispatchRetryAuthorizations || []),
      claimRepairHistory: clone(session.claimRepairHistory || []),
      planEditToolHistory: clone(session.planEditToolHistory || []),
      claimRepairBacklog: clone(claimRepairBacklog),
      autoPlanRepair: clone(session.autoPlanRepair || null),
      presetJourney: clone(session.presetJourney || null),
      teachFramework: session.teachFramework ? {
        status: session.teachFramework.status,
        phase: session.teachFramework.state?.phase || null,
        planHash: session.teachFramework.planHash,
        appliedToPlanHash: session.teachFramework.appliedToPlanHash || null,
        policyVersion: session.teachFramework.policyVersion,
        stale: session.teachFramework.planHash !== plan?.planHash,
        frameworkVersion: session.teachFramework.state?.framework?.version || null,
        investigationCompleted: session.teachFramework.state?.investigation?.completed === true,
        factProbeContinuation: clone(session.teachFramework.state?.investigation?.factProbeContinuation || null),
        coverage: clone(session.teachFramework.state?.coverage || null),
        issueLedger: rosterTeachIssueLedgerV1(session.teachFramework),
        revisionWorkOrder: clone(session.teachFramework.state?.revisionWorkOrder || null),
        workflow: clone(session.teachFramework.state?.workflow || null),
        failure: clone(session.teachFramework.failure || null),
        applicationStatus: session.teachFramework.state?.applicationStatus || null,
      } : null,
      retainedReplyCount: (session.publicOutputs || []).length,
      plan: plan ? clone(plan) : null,
      planVersionHistory: (session.planVersionHistory || []).map((entry) => (
        clone(parseWorkspacePlan(entry)))),
      revisionOutputShapeReceipts:
        clone(session.revisionOutputShapeReceipts || []),
      planReview: session.planReview ? {
        ...clone(session.planReview),
        stale: session.planReview.planHash !== plan?.planHash
          || planEvidenceStale(session, plan)
          || session.planReview.review?.reviewContextVersion
            !== ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3,
        blockingHighFindings,
        effectiveFindings: clone(effectiveFindings),
      } : null,
      planReviewHistory: clone(session.planReviewHistory || []),
      planReviewBlockingHighFindings: blockingHighFindings
        || claimRepairBacklog.some(entry => entry.status === "repair_required"),
      planReviewRequiredForHandoff: (priorHighFindings
        || claimRepairBacklog.length > 0) && !currentReviewClean,
      budgetContract: clone(contractView),
      candidates: session.candidates.map((entry, index) => ({
        candidate: clone(entry),
        candidateInput: clone(session.candidateInputs[index] || null),
        verdictSummary: annotateBudget(
          clone(session.candidateSummaries[index] || null), contractView),
        diffFromSelected: session.selectedCandidateInput
          && session.candidateInputs[index]
          && entry.candidateId !== plan?.rosterCandidate?.candidateId
          ? diffRosterCandidateInputsV1(
            session.selectedCandidateInput, session.candidateInputs[index])
          : null,
      })),
      comparison: clone(session.comparison),
      rejections: clone(session.rejections),
      working: session.working ? {
        candidateInput: clone(session.working.candidateInput),
        verdictSummary: annotateBudget(
          summarizeVerdict(session.working.verdict), contractView),
        overrideHistory: clone(session.working.overrideHistory),
      } : null,
      planEvidenceStale: planEvidenceStale(session, plan),
      presetComparison: clone(session.presetComparison || null),
      presetComparisonHistory:
        clone(session.presetComparisonHistory || []),
      evidence: {
        toolReceipts: clone(session.toolReceipts),
        budgetBranchReceipts: clone(session.budgetBranchReceipts || []),
        sessionReceipt: clone(session.sessionReceipt),
        skillRouteReceipt: clone(session.skillRouteReceipt),
        mutationZeroProof: clone(session.mutationZeroProof),
      },
      usage: session.usage ? {
        ...clone(session.usage),
        estimatedCost: estimatedCost ? clone(estimatedCost) : null,
        costEstimationNote: estimatedCost
          ? "provider_pricing_v2_snapshot_estimate"
          : (session.usage.totalUnits > 0
            ? "cost_estimator_unavailable" : "no_paid_usage"),
      } : null,
      retainedReplyCount: (session.publicOutputs || []).length,
      resumeAvailable: (session.publicOutputs || []).length > 0
        || session.status === "paused",
      failure: clone(session.failure),
      cancelRequested: session.cancelRequested === true,
      pauseRequested: session.pauseRequested === true,
      pauseReceipt: clone(session.pauseReceipt || null),
      pauseReceipts: clone(session.pauseReceipts || []),
      deliberation: availability,
      selectedCandidateInput: clone(session.selectedCandidateInput),
      trainingTruth: false,
    };
  }

  async function persist(session) {
    session.updatedAt = now();
    // The file store captures bytes synchronously before its first await.
    // Preserve the defensive copy for injected/legacy stores without that
    // ownership contract. No paid history or Plan/evidence hash is removed.
    const snapshot = draftStore.storeDescriptor?.().capturesCallTimeSnapshot === true
      ? session : clone(session);
    await draftStore.save(snapshot, { includeRecordHash: false, compact: true });
  }

  async function commitWorkspaceTransition(session, next, operation = 'plan_revision_commit') {
    // Publish only AFTER the atomic file commit. A retained model reply is not
    // proof that its Plan was saved; readers must keep seeing the old version
    // while this boundary is in flight. Never ask the model to repair disk I/O.
    const atomic = draftStore.storeDescriptor?.().filePerSessionAtomicWrite === true;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await persist(next);
        Object.assign(session, next);
        return;
      } catch (error) {
        const code = String(error.code || error.message || 'UNKNOWN_STORE_FAILURE');
        const mayRetry = atomic && attempt === 1
          && ['EIO', 'EINTR', 'EBUSY', 'ETIMEDOUT', 'EMFILE', 'ENFILE'].includes(code);
        const event = { operation, attempt, code,
          fromPlanHash: session.planSerialized ? parseWorkspacePlan(session.planSerialized).planHash : null,
          toPlanHash: next.planSerialized ? parseWorkspacePlan(next.planSerialized).planHash : null,
          samePlanRetry: mayRetry, modelRequestRepeated: false, at: now() };
        next.persistenceRecoveryHistory = [...(next.persistenceRecoveryHistory || []), event];
        if (!mayRetry) {
          session.persistenceRecoveryHistory = next.persistenceRecoveryHistory;
          throw Object.assign(new Error(`ROSTER_WORKSPACE_PERSISTENCE_FAILED:${code}`), {
            code: 'ROSTER_WORKSPACE_PERSISTENCE_FAILED', cause: error });
        }
      }
    }
  }

  async function persistFailureState(session, target = session) {
    try { await persist(session); }
    catch (saveError) {
      // Never turn a failed terminal-state write into apparent success. The
      // current process exposes the failure; restart reads actual saved state
      // and its retained replies before deciding whether another send is needed.
      target.failure = { code: 'ROSTER_WORKSPACE_PERSISTENCE_FAILED',
        detail: String(saveError?.code || saveError?.message || saveError).slice(0, 300),
        at: now(), automaticRetry: false, recoveryRequiresPersistedStateRead: true };
    }
  }

  function requireSession(sessionId) {
    const session = sessions.get(String(sessionId || ""));
    if (!session) {
      wsFail("ROSTER_WORKSPACE_SESSION_NOT_FOUND", String(sessionId || ""), 404);
    }
    return session;
  }

  function validateSetup(setup) {
    const code = "ROSTER_WORKSPACE_SETUP_INVALID";
    const factionRecordKey = nonEmpty(setup?.factionRecordKey, code);
    const opponentFactionRecordKey = nonEmpty(
      setup?.opponentFactionRecordKey, code);
    const factions = armyBuilderPort.listFactionChoices();
    if (!factions.factions.some((entry) => entry.recordKey === factionRecordKey)
      || !factions.factions.some((entry) => (
        entry.recordKey === opponentFactionRecordKey))) {
      wsFail(code, "faction_unknown");
    }
    const entries = pack.foundational.entries;
    const hasRoute = entries.some((entry) => entry.role === "general")
      && entries.some((entry) => entry.role === "faction"
        && entry.factionRecordKey === factionRecordKey)
      && entries.some((entry) => entry.role === "matchup"
        && entry.ownFaction === factionRecordKey
        && entry.opponentFaction === opponentFactionRecordKey);
    if (!hasRoute) {
      wsFail("ROSTER_WORKSPACE_SKILL_ROUTE_UNAVAILABLE",
        `${factionRecordKey}->${opponentFactionRecordKey}`, 409);
    }
    const scaleId = nonEmpty(setup?.engagementScale || "Standard", code);
    const scales = armyBuilderPort.listEngagementScales();
    if (!scales.scales.some((entry) => entry.scaleId === scaleId)) {
      wsFail(code, "scale_unknown");
    }
    const mineralBudget = Number(setup?.mineralBudget ?? 2_000);
    if (!Number.isSafeInteger(mineralBudget) || mineralBudget < 1
      || mineralBudget > 100_000) {
      wsFail(code, "mineralBudget");
    }
    const boundary = nonEmpty(
      setup?.opponentInformationBoundary || "open_roster", code);
    if (!ROSTER_WORKSPACE_OPPONENT_INFORMATION_BOUNDARIES.includes(boundary)) {
      wsFail(code, "opponentInformationBoundary");
    }
    return {
      sideKey: nonEmpty(setup?.sideKey || "player1", code),
      factionRecordKey,
      opponentFactionRecordKey,
      engagementScale: scaleId,
      mineralBudget,
      opponentInformationBoundary: boundary,
      missionBinding: {
        missionRecordKey: fixture.missionRecordKey,
        deploymentRecordKey: fixture.deploymentRecordKey,
        mapTopologyHash: fixture.mapTopologyHash,
      },
    };
  }

  function newSessionRecord(setup, sessionId) {
    return {
      schema: ROSTER_PLANNING_SESSION_SCHEMA,
      sessionId,
      createdAt: now(),
      updatedAt: now(),
      setup: clone(setup),
      planningMode: "agent_teach_v1",
      completionPolicyVersion: "agent_exact_budget_or_draft_v1",
      mapEvidencePolicyVersion: "certified_route_or_draft_v1",
      sourcePlanHash: null,
      lockedTeachSourcePlanSerialized: null,
      lockedTeachSourceSessionReceipt: null,
      lockedRoster: null,
      status: "draft",
      progress: { phase: "idle", rounds: [], activeRoundKind: null },
      planSerialized: null,
      planVersionHistory: [],
      revisionOutputShapeReceipts: [],
      planReview: null,
      planReviewHistory: [],
      generatedPlanHash: null,
      candidates: [],
      candidateInputs: [],
      candidateSummaries: [],
      selectedCandidateInput: null,
      comparison: null,
      rejections: [],
      working: null,
      planEvidenceStale: false,
      toolReceipts: [],
      budgetBranchReceipts: [],
      sessionReceipt: null,
      skillRouteReceipt: null,
      mutationZeroProof: null,
      publicOutputs: [],
      usage: null,
      failure: null,
      cancelRequested: false,
      pauseRequested: false,
      pauseReceipt: null,
      pauseReceipts: [],
      deliberationDescriptor: null,
      resumeReceipts: [],
      presetComparison: null,
      presetComparisonHistory: [],
      trainingTruth: false,
    };
  }

  // ------------------------------------------------------------ catalogue

  function readCatalogue() {
    const factions = armyBuilderPort.listFactionChoices();
    const scales = armyBuilderPort.listEngagementScales();
    const entries = pack.foundational.entries;
    const generalAvailable = entries.some((entry) => entry.role === "general");
    const factionSkills = new Set(entries
      .filter((entry) => entry.role === "faction")
      .map((entry) => entry.factionRecordKey));
    const matchupPairs = entries
      .filter((entry) => entry.role === "matchup")
      .map((entry) => ({
        ownFactionRecordKey: entry.ownFaction,
        opponentFactionRecordKey: entry.opponentFaction,
      }));
    const nameByRecordKey = new Map(factions.factions.map((entry) => [
      entry.recordKey, entry.factionName ]));
    const missionAuthority = laboratoryCore.missionScoringAuthority();
    return {
      schema: "starcraft_tmg_roster_workspace_catalogue_v1",
      factions: factions.factions.map((entry) => ({
        recordKey: entry.recordKey,
        factionName: entry.factionName,
        raceTag: entry.raceTag,
        skillRouteAvailable: generalAvailable
          && factionSkills.has(entry.recordKey),
      })),
      matchupRoutes: matchupPairs.map((pair) => ({
        ...pair,
        ownFactionName: nameByRecordKey.get(pair.ownFactionRecordKey) || null,
        opponentFactionName:
          nameByRecordKey.get(pair.opponentFactionRecordKey) || null,
      })),
      scales: scales.scales.map((entry) => clone(entry)),
      opponentInformationBoundaries: [
        ...ROSTER_WORKSPACE_OPPONENT_INFORMATION_BOUNDARIES],
      defaults: {
        sideKey: "player1",
        factionRecordKey: fixture.planningReferenceArmies?.player1?.factionRecordKey
          || "tactical_cards:terran_armed_forces",
        opponentFactionRecordKey: fixture.planningReferenceArmies?.player2?.factionRecordKey
          || "tactical_cards:kerrigan_s_swarm",
        engagementScale: "Standard",
        mineralBudget: 2_000,
        opponentInformationBoundary: "open_roster",
      },
      mission: {
        frozen: true,
        frozenReason:
          "workspace_laboratory_bound_to_frozen_standard_2000_source_state",
        missionRecordKey: fixture.missionRecordKey,
        deploymentRecordKey: fixture.deploymentRecordKey,
        mapTopologyHash: fixture.mapTopologyHash,
        mapEvidenceStatus: fixture.mapEvidenceStatus
          || "abstract_fixture_unknown",
        mapSeedId: fixture.mapEvidenceBinding?.seedId || null,
        mapRoomFreezeHash:
          fixture.mapEvidenceBinding?.roomFreezeHash || null,
        scoringAuthorityStatus: missionAuthority.resultStatus,
        scoringAuthorityReceiptHash: missionAuthority.receiptHash,
        scoringProfile: clone(missionAuthority.missionScoringProfile),
      },
      strategyPack: {
        receiptHash: pack.receipt.hash,
        manifestHash: pack.manifest?.hash ?? null,
        entryCount: entries.length,
        skillsAdvisoryOnly: true,
      },
      budgetContract: budgetContractView(
        fixture.planningReferenceArmies?.player1?.factionRecordKey
          || "tactical_cards:terran_armed_forces", "Standard", 2_000),
      presetComparisonArm: presetArm ? clone(presetArm) : null,
      deliberation: deliberationAvailability(),
      versionPins: {
        sourceLockHash: fixture.sourceLockHash,
        sourceSnapshotHash: fixture.sourceSnapshotHash,
        normalizedDatasetHash: fixture.normalizedDatasetHash,
        officialRulesVersion: fixture.officialRulesVersion,
        officialUnitsVersion: fixture.officialUnitsVersion,
        officialCardsVersion: fixture.officialCardsVersion,
      },
      trainingTruth: false,
    };
  }

  function readEnumeration(query = {}) {
    const factionRecordKey = nonEmpty(query.factionRecordKey,
      "ROSTER_WORKSPACE_ENUMERATION_INVALID");
    const scaleId = nonEmpty(query.scaleId || "Standard",
      "ROSTER_WORKSPACE_ENUMERATION_INVALID");
    const mineralBudget = Number(query.mineralBudget ?? 2_000);
    if (!Number.isSafeInteger(mineralBudget) || mineralBudget < 1
      || mineralBudget > 100_000) {
      wsFail("ROSTER_WORKSPACE_ENUMERATION_INVALID", "mineralBudget");
    }
    return armyBuilderPort.enumerateArmyBuildingChoices({
      factionRecordKey, scaleId, mineralBudget });
  }

  function readBudgetBranches(sessionId, query = {}) {
    const session = requireSession(sessionId);
    const candidateInput = query.candidateInput
      || session.working?.candidateInput
      || session.selectedCandidateInput;
    if (!object(candidateInput)) {
      wsFail("ROSTER_WORKSPACE_BUDGET_CANDIDATE_REQUIRED",
        "provide_a_Rules_legal_candidate", 409);
    }
    if (candidateInput.sideKey !== session.setup.sideKey
      || candidateInput.factionRecordKey !== session.setup.factionRecordKey
      || candidateInput.scaleId !== session.setup.engagementScale
      || candidateInput.mineralBudget !== session.setup.mineralBudget) {
      wsFail("ROSTER_WORKSPACE_BUDGET_CONTEXT_DRIFT",
        "candidate_does_not_match_session", 409);
    }
    return queryRosterBudgetBranchesV1({
      armyBuilderPort,
      candidateInput,
      maximumEvaluations: query.maximumEvaluations,
      startOffset: query.startOffset,
      maximumMutationDepth: query.maximumMutationDepth,
      expectedSourceCandidateHash: query.expectedSourceCandidateHash,
      expectedMenuReceiptHash: query.expectedMenuReceiptHash,
    });
  }

  // ------------------------------------------------------------ sessions

  async function createSession(inputSetup = {}) {
    const setup = validateSetup(inputSetup);
    const session = newSessionRecord(setup, createSessionId());
    sessions.set(session.sessionId, session);
    await persist(session);
    return projectSession(session);
  }

  async function createLockedReplanSession(sessionId, request = {}) {
    const source = requireSession(sessionId);
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    if (source.status !== "planned" || !source.planSerialized
      || !source.working?.candidateInput) {
      wsFail("ROSTER_WORKSPACE_NOT_PLANNED", sessionId, 409);
    }
    const oldPlan = parseWorkspacePlan(source.planSerialized);
    const strategicReplan = request.strategicReplan === true;
    if (strategicReplan && source.agentSelectedStrategySource) {
      wsFail("ROSTER_WORKSPACE_AGENT_RESELECT_VIA_JOURNEY", "do_not_turn_agent_candidate_into_user_preset", 409);
    }
    if (!strategicReplan && !planEvidenceStale(source, oldPlan)) {
      wsFail("ROSTER_WORKSPACE_REPLAN_NOT_NEEDED",
        "working_roster_still_matches_plan", 409);
    }
    const nextId = createSessionId();
    let lockedRoster;
    try {
      lockedRoster = createVerifiedBuilderLockedRosterForTeachV1({
        candidateInput: clone(source.working.candidateInput),
        armyBuilderPort,
        planId: `${nextId}-locked-plan`,
        presetSource: strategicReplan ? "workspace_preset_plan_reconsideration"
          : "workspace_manual_roster_edit",
      });
    } catch (error) {
      wsFail(errorCode(error, "ROSTER_WORKSPACE_LOCKED_ROSTER_INVALID"),
        "Rules-legal roster with supported upgrade selections required", 409);
    }
    const session = newSessionRecord(source.setup, nextId);
    session.planningMode = "locked_roster_teach_v1";
    session.completionPolicyVersion = "locked_roster_preserved_v1";
    session.sourcePlanHash = oldPlan.planHash;
    if (strategicReplan) {
      session.planImprovementRequest = { previousPlan: clone(oldPlan),
        publicReason: nonEmpty(request.reasonText, "ROSTER_WORKSPACE_REVISION_INVALID"),
        teachFramework: clone(source.teachFramework || null),
        rosterImmutable: true, planAndArrivalScheduleMayChange: true };
    }
    session.lockedRoster = clone(lockedRoster);
    session.working = {
      candidateInput: clone(lockedRoster.lock.candidateInput),
      verdict: clone(lockedRoster.lock.verdict),
      overrideHistory: [],
    };
    await persist(session);
    sessions.set(session.sessionId, session);
    return projectSession(session);
  }

  async function createPresetSession(request = {}) {
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    const setup = validateSetup(request.setup);
    const candidateInput = request.candidateInput;
    if (!object(candidateInput)
      || candidateInput.sideKey !== setup.sideKey
      || candidateInput.factionRecordKey !== setup.factionRecordKey
      || candidateInput.scaleId !== setup.engagementScale
      || candidateInput.mineralBudget !== setup.mineralBudget) {
      wsFail("ROSTER_WORKSPACE_PRESET_CONTEXT_DRIFT", "setup", 409);
    }
    const sessionId = createSessionId();
    let lockedRoster;
    try {
      lockedRoster = createVerifiedBuilderLockedRosterForTeachV1({
        candidateInput: clone(candidateInput), armyBuilderPort,
        planId: `${sessionId}-locked-plan`,
        presetSource: "workspace_user_preset_roster",
      });
    } catch (error) {
      wsFail(errorCode(error, "ROSTER_WORKSPACE_PRESET_INVALID"),
        "Rules-legal roster with supported upgrade selections required", 409);
    }
    const session = newSessionRecord(setup, sessionId);
    session.planningMode = "locked_roster_teach_v1";
    session.lockedRoster = clone(lockedRoster);
    session.working = {
      candidateInput: clone(lockedRoster.lock.candidateInput),
      verdict: clone(lockedRoster.lock.verdict),
      overrideHistory: [],
    };
    await persist(session);
    sessions.set(session.sessionId, session);
    return projectSession(session);
  }

  // Product-internal continuation of an Agent-selected exact-budget list.
  // The preset lock protects the list during Teach; it does not change who
  // selected it. The eventual public Agent plan is rebound separately.
  async function createAgentSelectedTeachSession(request = {}) {
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    const setup = validateSetup(request.setup);
    const handoff = request.handoff;
    const missionProfile = laboratoryCore.missionScoringAuthority()
      .missionScoringProfile;
    verifyIterativeRosterTeachHandoffV1(handoff, armyBuilderPort,
      missionProfile);
    const lockedRoster = handoff.lockedRoster;
    const candidateInput = lockedRoster.lock.candidateInput;
    const mapBinding = handoff.selectedMapRouteReceipt.mapBinding;
    if (candidateInput.sideKey !== setup.sideKey
      || candidateInput.factionRecordKey !== setup.factionRecordKey
      || candidateInput.scaleId !== setup.engagementScale
      || candidateInput.mineralBudget !== setup.mineralBudget
      || handoff.selectedMapRouteReceipt.status !== "certified"
      || mapBinding?.roomFreezeHash
        !== fixture.mapEvidenceBinding?.roomFreezeHash
      || mapBinding?.missionRecordKey
        !== setup.missionBinding.missionRecordKey
      || mapBinding?.deploymentRecordKey
        !== setup.missionBinding.deploymentRecordKey) {
      wsFail("ROSTER_WORKSPACE_AGENT_SELECTION_CONTEXT_DRIFT",
        "agent_selection_not_bound_to_current_lab", 409);
    }
    const session = newSessionRecord(setup, createSessionId());
    const sourceArrival = handoff.openingDeploymentSchedule;
    const teachArrival = createPlannedPresetRoundSupplyScheduleV2({
      proposedEntries: sourceArrival.entries.map((entry) => ({
        round: entry.round,
        unitInstanceId: entry.unitInstanceId,
        publicReasonText: entry.publicReasonText,
      })),
      rosterCandidate: lockedRoster.lock.candidate,
      armyAudit: lockedRoster.lock.verdict.audit,
      missionProfile,
      contextualSupplyRoutes: input.contextualSupplyRoutes,
    });
    if (teachArrival.contextualSupplyRouteBundleHash
        !== sourceArrival.contextualSupplyRouteBundleHash
      || !isDeepStrictEqual(teachArrival.entries,
        sourceArrival.entries)
      || !isDeepStrictEqual(teachArrival.rounds,
        sourceArrival.rounds)) {
      wsFail("ROSTER_WORKSPACE_AGENT_SELECTED_ARRIVAL_REBIND_DRIFT",
        "source_and_teach_supply_differ", 409);
    }
    session.planningMode = "locked_roster_teach_v1";
    session.agentSelectionHandoffHash = handoff.handoffHash;
    session.agentSelectedCandidateHash = handoff.iterativeCandidateHash;
    session.agentSelectedStrategySource = {
      iterativeSessionId: handoff.iterativeSessionId,
      iterativeRevision: handoff.iterativeRevision,
      candidateHash: handoff.iterativeCandidateHash,
      planHash: handoff.iterativeRouteHash,
      plan: clone(handoff.iterativePlanAdvisory),
      feedbackPolicy: handoff.teachFeedbackPolicy || "locked_roster_teach_v1",
      ...(handoff.selectionJustificationPolicyVersion ? {
        selectionJustificationPolicyVersion: handoff.selectionJustificationPolicyVersion } : {}),
    };
    session.agentSelectedArrivalSchedule = clone(teachArrival);
    session.selectionEvidence = clone(handoff.selectionEvidence || null);
    session.lockedRoster = clone(lockedRoster);
    session.working = {
      candidateInput: clone(candidateInput),
      verdict: clone(lockedRoster.lock.verdict),
      overrideHistory: [],
    };
    await persist(session);
    sessions.set(session.sessionId, session);
    return projectSession(session);
  }

  async function attachAgentSelectedEvidence(sessionId, source) {
    const session = requireSession(sessionId);
    if (activeRun) wsFail('ROSTER_WORKSPACE_PLANNING_BUSY', activeRun.sessionId, 409);
    // This extends an already Rules-verified snapshot; it never selects or
    // changes an army. Do not rerun Builder/arrival just to recover evidence.
    if (!session.agentSelectionHandoffHash
      || session.agentSelectedCandidateHash !== source.candidateHash
      || session.agentSelectedStrategySource?.iterativeSessionId !== source.iterativeSessionId
      || session.agentSelectedStrategySource?.planHash !== source.planHash)
      wsFail('ROSTER_WORKSPACE_AGENT_SELECTION_CONTEXT_DRIFT', 'evidence_handoff', 409);
    verifyIterativeRosterSelectionEvidenceV1(source.selectionEvidence, {
      candidateHash: session.agentSelectedCandidateHash,
      mapHash: fixture.mapEvidenceBinding.roomFreezeHash });
    const mergedReceipts = mergeIterativeSelectionQueryReceiptsV1(session.toolReceipts,source.selectionEvidence);
    if (session.selectionEvidence?.evidenceHash !== source.selectionEvidence.evidenceHash
      || mergedReceipts.length !== (session.toolReceipts || []).length) {
      session.selectionEvidence = clone(source.selectionEvidence);
      session.toolReceipts = mergedReceipts;
      await persist(session);
    }
    return projectSession(session);
  }

  // Promote only the finished, immutable Agent-selected Teach chain. The
  // product module builds and verifies the bridge against the original C
  // handoff; this workspace stores the promoted plan so the existing V3
  // review and claim-targeted revision operate on the correct object.
  async function promoteAgentSelectedTeachPlan(sessionId, bridge) {
    const session = requireSession(sessionId);
    if (activeRun || session.status !== "planned"
      || !session.agentSelectionHandoffHash
      || !session.agentSelectedCandidateHash
      || !session.planSerialized || !bridge?.plan
      || bridge.handoffHash !== session.agentSelectionHandoffHash
      || bridge.iterativeCandidateHash
        !== session.agentSelectedCandidateHash) {
      wsFail("ROSTER_WORKSPACE_AGENT_PROMOTION_UNAVAILABLE", sessionId, 409);
    }
    verifyAgentSelectedTeachSessionReceiptV1(bridge.sessionReceipt);
    verifyWorkspacePlanRoundTrip(bridge.plan);
    if (bridge.plan.schema !== AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
      || bridge.sessionReceipt.planHash !== bridge.plan.planHash
      || bridge.sessionReceipt.agentSelectionHandoffHash
        !== session.agentSelectionHandoffHash
      || bridge.sessionReceipt.finalAuditResultHash
        !== session.working?.verdict?.auditResultHash
      || bridge.sessionReceipt.openingDeploymentScheduleHash
        !== bridge.plan.openingDeploymentSchedule?.scheduleHash
      || bridge.plan.openingDeploymentSchedule
        ?.contextualSupplyRouteBundleHash
        !== session.agentSelectedArrivalSchedule
          ?.contextualSupplyRouteBundleHash
      || !isDeepStrictEqual(
        bridge.plan.openingDeploymentSchedule?.entries,
        session.agentSelectedArrivalSchedule?.entries)
      || !isDeepStrictEqual(
        bridge.plan.openingDeploymentSchedule?.rounds,
        session.agentSelectedArrivalSchedule?.rounds)) {
      wsFail("ROSTER_WORKSPACE_AGENT_PROMOTION_SOURCE_DRIFT", sessionId, 409);
    }
    const current = parseWorkspacePlan(session.planSerialized);
    if (current.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
      && current.planHash === bridge.plan.planHash) {
      return projectSession(session);
    }
    if (current.schema !== PLANNED_PRESET_ROSTER_PLAN_SCHEMA
      || current.planHash !== bridge.lockedTeachPlanHash
      || !isDeepStrictEqual(bridge.plan.rosterCandidate.units,
        current.rosterCandidate.units)
      || !isDeepStrictEqual(
        bridge.plan.rosterCandidate.tacticalCardRecordKeys,
        current.rosterCandidate.tacticalCardRecordKeys)
      || bridge.plan.rosterCandidate.sideKey
        !== current.rosterCandidate.sideKey
      || bridge.plan.rosterCandidate.factionRecordKey
        !== current.rosterCandidate.factionRecordKey
      || bridge.plan.rosterCandidate.scaleId
        !== current.rosterCandidate.scaleId
      || bridge.plan.rosterCandidate.mineralBudget
        !== current.rosterCandidate.mineralBudget) {
      wsFail("ROSTER_WORKSPACE_AGENT_PROMOTION_SOURCE_DRIFT", sessionId, 409);
    }
    const serialized = serializeWorkspacePlan(bridge.plan);
    if (!workingMatchesPlan(session, bridge.plan)) {
      wsFail("ROSTER_WORKSPACE_AGENT_PROMOTION_WORKING_LIST_DRIFT",
        sessionId, 409);
    }
    session.sourcePlanHash = current.planHash;
    session.lockedTeachSourcePlanSerialized = session.planSerialized;
    session.lockedTeachSourceSessionReceipt = clone(session.sessionReceipt);
    session.planSerialized = serialized;
    session.generatedPlanHash = bridge.plan.planHash;
    session.sessionReceipt = clone(bridge.sessionReceipt);
    session.planVersionHistory = [];
    session.planEvidenceStale = false;
    session.planReview = null;
    await persist(session);
    return projectSession(session);
  }

  async function listSessions() {
    return {
      schema: "starcraft_tmg_roster_workspace_session_list_v1",
      sessions: [...sessions.values()]
        .sort((left, right) => String(right.updatedAt)
          .localeCompare(String(left.updatedAt)))
        .map((session) => ({
          sessionId: session.sessionId,
          status: session.status,
          planningMode: session.planningMode || "agent_legacy_v1",
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          factionRecordKey: session.setup.factionRecordKey,
          opponentFactionRecordKey: session.setup.opponentFactionRecordKey,
          engagementScale: session.setup.engagementScale,
          mineralBudget: session.setup.mineralBudget,
          planHash: session.planSerialized
            ? parseWorkspacePlan(session.planSerialized).planHash : null,
          planVersion: session.planSerialized
            ? parseWorkspacePlan(session.planSerialized).planVersion : null,
          planEvidenceStale: planEvidenceStale(session,
            session.planSerialized
              ? parseWorkspacePlan(session.planSerialized) : null),
          providerCalls: session.usage?.calls || 0,
          failureCode: session.failure?.code || null,
        })),
      quarantinedDrafts: clone(quarantinedDrafts),
      deliberation: deliberationAvailability(),
      planningBusy: activeRun !== null,
      trainingTruth: false,
    };
  }

  function readSession(sessionId, { progressOnly = false } = {}) {
    const session = requireSession(sessionId);
    if (!progressOnly) return projectSession(session);
    // A heartbeat is not a strategy/admission projection. Read current flags
    // directly; never clone retained replies, evidence graphs or old Plans.
    // Consumers must request the full projection once work settles/fails.
    const plan = session.planSerialized ? parseWorkspacePlan(session.planSerialized) : null;
    return {
      sessionId: session.sessionId,
      status: session.status,
      plan: plan ? { planHash: plan.planHash } : null,
      failure: session.failure ? { code: session.failure.code } : null,
      planReview: session.planReview ? {
        status: session.planReview.status,
        planHash: session.planReview.planHash,
      } : null,
      teachFramework: session.teachFramework ? {
        status: session.teachFramework.status,
        planHash: session.teachFramework.planHash,
        investigationCompleted: session.teachFramework.state?.investigation?.completed === true,
      } : null,
    };
  }

  async function deleteSession(sessionId) {
    const session = requireSession(sessionId);
    if (activeRun?.sessionId === session.sessionId) {
      wsFail("ROSTER_WORKSPACE_SESSION_RUNNING", sessionId, 409);
    }
    sessions.delete(session.sessionId);
    await draftStore.remove(session.sessionId);
    return { deleted: true, sessionId: session.sessionId };
  }

  // ------------------------------------------------------------ planning

  function accumulateUsage(session, roundEvent) {
    if (!roundEvent?.usage) return;
    const usage = session.usage || {
      calls: 0, inputUnits: 0, outputUnits: 0, totalUnits: 0, latencyMs: 0,
      receiptHashes: [], deliberationKind: null, modelVersion: null,
    };
    usage.calls += 1;
    usage.inputUnits += Number(roundEvent.usage.inputUnits || 0);
    usage.outputUnits += Number(roundEvent.usage.outputUnits || 0);
    usage.totalUnits += Number(roundEvent.usage.totalUnits || 0);
    usage.latencyMs += Number(roundEvent.latencyMs || 0);
    if (roundEvent.receiptHash) usage.receiptHashes.push(roundEvent.receiptHash);
    session.usage = usage;
  }

  function recordRoundEvent(session, event) {
    if (event.type === "provider_dispatch") {
      const dispatch = event.dispatch;
      if (dispatch?.sessionId !== session.sessionId
        || !String(dispatch.requestId || "")
        || !HASH_PATTERN.test(String(dispatch.requestBodyHash || ""))) {
        wsFail("ROSTER_WORKSPACE_DISPATCH_IDENTITY_INVALID");
      }
      session.providerDispatches ||= [];
      const index = session.providerDispatches.findIndex(record =>
        record.requestId === dispatch.requestId);
      const next = { ...clone(dispatch), updatedAt: event.at || now() };
      if (dispatch.retryOfRequestId) {
        const authorization = (session.dispatchRetryAuthorizations || []).find(item =>
          item.authorizationId === dispatch.retryAuthorizationId
            && item.requestId === dispatch.retryOfRequestId);
        if (!authorization || authorization.planHash !== dispatch.planHash
          || authorization.contextHash !== dispatch.contextHash
          || authorization.requestBodyHash !== dispatch.requestBodyHash
          || authorization.roundKind !== dispatch.roundKind
          || authorization.roundIndex !== dispatch.roundIndex
          || authorization.status === "consumed"
            && authorization.retryRequestId !== dispatch.requestId) {
          wsFail("ROSTER_WORKSPACE_RETRY_AUTHORIZATION_INVALID");
        }
        // Consumed at the persisted reserved barrier, BEFORE the physical send.
        // A process restart must never turn one consent into another dispatch.
        authorization.status = "consumed";
        authorization.retryRequestId = dispatch.requestId;
        authorization.consumedAt ||= event.at || now();
      }
      if (index < 0) session.providerDispatches.push(next);
      else session.providerDispatches[index] = next;
      const recoveredFrom = dispatch.retryOfRequestId || dispatch.retryOfNotSentRequestId;
      if (recoveredFrom && session.progress.networkRecovery?.requestId === recoveredFrom) {
        session.progress.networkRecovery.status = dispatch.status === 'completed' ? 'recovered'
          : ['ambiguous', 'definitely_not_sent'].includes(dispatch.status) ? 'retry_exhausted' : 'retrying_once';
        session.progress.networkRecovery.retryRequestId = dispatch.requestId;
      }
      return;
    }
    const rounds = session.progress.rounds;
    if (event.type === "round_started") {
      session.progress.phase = "running";
      session.progress.activeRoundKind = event.roundKind;
      rounds.push({
        roundKind: event.roundKind,
        roundIndex: event.roundIndex,
        status: event.replayed ? "replaying" : "running",
        startedAt: event.at || now(),
        finishedAt: null,
        usage: null,
        latencyMs: null,
        receiptHash: null,
        paidProviderCall: null,
      });
      return;
    }
    const round = [...rounds].reverse().find((entry) => (
      entry.roundKind === event.roundKind
        && Number(entry.roundIndex) === Number(event.roundIndex)
        && entry.finishedAt === null));
    if (event.type === "round_completed" && round) {
      round.status = event.replayed ? "replayed" : "completed";
      round.finishedAt = event.at || now();
      round.usage = event.usage ? clone(event.usage) : null;
      round.latencyMs = event.latencyMs ?? null;
      round.receiptHash = event.receiptHash || null;
      round.paidProviderCall = typeof event.paidProviderCall === "boolean"
        ? event.paidProviderCall : null;
      session.progress.activeRoundKind = null;
      if (event.paidProviderCall === true) accumulateUsage(session, event);
      if (event.sanitizedOutputRecord
        && object(event.sanitizedOutputRecord.sanitizedOutput)
        && HASH_PATTERN.test(String(
          event.sanitizedOutputRecord.outputHash || ""))) {
        const record = clone(event.sanitizedOutputRecord);
        const duplicate = session.publicOutputs.some((entry) => (
          entry.roundKind === record.roundKind
            && Number(entry.roundIndex) === Number(record.roundIndex)
            && entry.contextHash === record.contextHash
            && entry.outputHash === record.outputHash
            && entry.outputContractRef?.id === record.outputContractRef?.id
            && entry.outputContractRef?.version
              === record.outputContractRef?.version
            && entry.outputContractRef?.hash
              === record.outputContractRef?.hash));
        if (!duplicate) session.publicOutputs.push(record);
      }
      return;
    }
    if (event.type === "round_failed" && round) {
      round.status = event.code === "ROSTER_WORKSPACE_PAUSED"
        ? "paused" : "failed";
      round.finishedAt = event.at || now();
      round.failureCode = event.code || null;
      round.usage = event.usage ? clone(event.usage) : null;
      round.latencyMs = event.latencyMs ?? null;
      round.receiptHash = event.receiptHash || null;
      round.paidProviderCall = typeof event.paidProviderCall === "boolean"
        ? event.paidProviderCall : null;
      round.dispatchRequestId = event.dispatchRequestId || null;
      if (["ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE",
        "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE"].includes(event.code)
        && object(event.failedOutputRecord)
        && event.failedOutputRecord.roundKind === event.roundKind
        && Number(event.failedOutputRecord.roundIndex)
          === Number(event.roundIndex)
        && HASH_PATTERN.test(String(
          event.failedOutputRecord.rawTextHash || ""))) {
        session.failedProviderOutputs ||= [];
        session.failedProviderOutputs.push(clone(event.failedOutputRecord));
        round.failedOutputHash = event.failedOutputRecord.rawTextHash;
      }
      session.progress.activeRoundKind = null;
      if (event.paidProviderCall === true) accumulateUsage(session, event);
    }
  }

  async function executePlanning(session, { replayOnly }) {
    const sink = { toolReceipts: clone((session.selectionEvidence?.queries || []).map(row => row.receipt)) };
    const laboratory = input.createRunLaboratory(sink, {
      setup: clone(session.setup),
      candidateInput: clone(session.lockedRoster?.lock?.candidateInput
        || session.selectedCandidateInput || session.working?.candidateInput),
    });
    const strategist = input.createStrategist({ laboratory });
    const control = {
      cancelled: () => session.cancelRequested === true,
      paused: () => session.pauseRequested === true,
    };
    const onEvent = async (event) => {
      recordRoundEvent(session, event);
      // Persist at round boundaries so a crash or reload never loses a
      // completed (possibly paid) round reply.
      if (event.type !== "round_started" || event.replayed) {
        if (event.type === "provider_dispatch" || event.type === "round_completed") {
          await persist(session);
        } else await persist(session).catch(() => {});
      }
    };
    const retained = (session.publicOutputs || []).filter((entry) => (
      object(entry.sanitizedOutput)
        && HASH_PATTERN.test(String(entry.outputHash || ""))));
    let deliberation;
    let livePort = null;
    if (retained.length > 0) {
      if (!replayOnly && deliberationFactory) {
        livePort = await deliberationFactory.createForRun({
          sessionId: session.sessionId, runKind: "resume", control, onEvent,
          recoverNetworkDispatch: networkDispatchRecovery(session) });
      }
      deliberation = createRetainedReplayDeliberationPortV1({
        retainedOutputs: retained,
        livePort,
        onEvent,
        requireContextBoundReplay: ["agent_iterative_exact_budget_v1",
          "agent_exact_budget_or_draft_v1"].includes(
          session.completionPolicyVersion),
        modelVersion: session.deliberationDescriptor?.modelVersion
          || "retained-replay",
      });
    } else {
      if (replayOnly) {
        wsFail("ROSTER_WORKSPACE_RESUME_OUTPUT_MISSING", "no_retained_replies",
          409);
      }
      if (!deliberationFactory) {
        wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
          "no_live_deliberation_factory_attached", 503);
      }
      deliberation = await deliberationFactory.createForRun({
        sessionId: session.sessionId, runKind: "initial", control, onEvent,
        recoverNetworkDispatch: networkDispatchRecovery(session) });
    }
    session.deliberationDescriptor = clone(deliberation.descriptor());
    if (session.usage) {
      session.usage.deliberationKind = session.deliberationDescriptor.kind;
      session.usage.modelVersion = session.deliberationDescriptor.modelVersion;
    }
    const sessionInput = {
      sessionId: session.sessionId,
      ...(session.lockedRoster
        ? { planId: session.lockedRoster.baselinePlan.planId } : {}),
      sideKey: session.setup.sideKey,
      factionRecordKey: session.setup.factionRecordKey,
      opponentFactionRecordKey: session.setup.opponentFactionRecordKey,
      engagementScale: session.setup.engagementScale,
      mineralBudget: session.setup.mineralBudget,
      missionBinding: clone(session.setup.missionBinding),
      opponentInformationBoundary:
        session.setup.opponentInformationBoundary,
      versionPins: {
        sourceLockHash: fixture.sourceLockHash,
        sourceSnapshotHash: fixture.sourceSnapshotHash,
        normalizedDatasetHash: fixture.normalizedDatasetHash,
        officialRulesVersion: fixture.officialRulesVersion,
        officialUnitsVersion: fixture.officialUnitsVersion,
        officialCardsVersion: fixture.officialCardsVersion,
      },
    };
    const teachPorts = session.planningMode === "agent_legacy_v1"
      ? null : createRosterTeachRolePortsV1({
        deliberation, sessionId: session.sessionId });
    const sessionResult = session.lockedRoster
      ? await strategist.planPresetRoster(sessionInput, {
        deliberation, teachPorts,
        ...(session.planImprovementRequest ? {
          planImprovementRequest: clone(session.planImprovementRequest) } : {}),
        presetRosterLock: session.lockedRoster.lock,
        ...(session.selectionEvidence ? { selectionEvidence: clone(session.selectionEvidence) } : {}),
        ...(session.agentSelectedStrategySource ? {
          agentSelectedStrategySource: clone(session.agentSelectedStrategySource) } : {}),
        ...(session.agentSelectedArrivalSchedule ? {
          agentSelectedArrivalSchedule:
            clone(session.agentSelectedArrivalSchedule) } : {}),
        requireCertifiedMapForActive: session.mapEvidencePolicyVersion
          === "certified_route_or_draft_v1",
      })
      : await strategist.planRoster(sessionInput, {
        deliberation, maxProposalRounds: session.completionPolicyVersion
          === "agent_exact_budget_or_draft_v1" ? 3 : 2,
        requireExactBudgetForActive: session.completionPolicyVersion
          === "agent_exact_budget_or_draft_v1",
        enableBudgetBranchGuidance: session.completionPolicyVersion
          === "agent_exact_budget_or_draft_v1",
        requireCertifiedMapForActive: session.mapEvidencePolicyVersion
          === "certified_route_or_draft_v1",
        ...(teachPorts ? { teachPorts } : {}),
      });

    const candidateSummaries = sessionResult.candidateInputs.map(
      (candidateInput) => summarizeVerdict(
        armyBuilderPort.evaluateRosterCandidate(clone(candidateInput))));
    const selectedIndex = sessionResult.candidates.findIndex((entry) => (
      entry.candidateId === sessionResult.plan.rosterCandidate.candidateId));
    const selectedCandidateInput = selectedIndex >= 0
      ? clone(sessionResult.candidateInputs[selectedIndex]) : null;
    if (!selectedCandidateInput) {
      wsFail("ROSTER_WORKSPACE_SELECTION_INPUT_MISSING", "selected", 500);
    }
    const mutationProof = laboratory.proveMutationZero();
    if (mutationProof.sourceStateMutationCount !== 0) {
      wsFail("ROSTER_WORKSPACE_SOURCE_MUTATION_DETECTED", "laboratory", 500);
    }

    // All result fields below form one terminal publication. Keep the live
    // session on its saved in-progress version until this complete value commits.
    // Provider events above still persist normally and remain available on error.
    const publishedSession = session;
    session = { ...session, progress: clone(session.progress),
      usage: clone(session.usage), resumeReceipts: [...session.resumeReceipts],
      planVersionHistory: [...(session.planVersionHistory || [])],
      presetComparisonHistory: [...(session.presetComparisonHistory || [])],
      pauseRequested: false };

    const reconstructed = session.generatedPlanHash !== null
      || session.planSerialized !== null;
    if (reconstructed) {
      // Replay resume over an already-generated session: the retained replies
      // must reconstruct the exact GENERATED plan (a later revision bumps the
      // version/hash, so compare against the generation-time hash). Usage
      // stays untouched — replayed rounds are zero new paid calls.
      const previousPlan = session.planSerialized
        ? parseWorkspacePlan(session.planSerialized) : null;
      const referenceHash = session.generatedPlanHash
        || previousPlan?.planHash;
      const generationUpgrade = referenceHash !== sessionResult.plan.planHash
        && referenceHash === previousPlan?.planHash
        && isAgentArrivalGenerationUpgrade(previousPlan,
          sessionResult.plan, session.sessionReceipt,
          sessionResult.sessionReceipt);
      if (referenceHash !== sessionResult.plan.planHash
        && !generationUpgrade) {
        wsFail("ROSTER_WORKSPACE_RESUME_PLAN_HASH_DRIFT",
          `${referenceHash}!=${sessionResult.plan.planHash}`, 500);
      }
      const resumeBody = {
        at: now(),
        replayedRounds: session.progress.rounds
          .filter((entry) => entry.status === "replayed").length,
        planHash: sessionResult.plan.planHash,
        newPaidCalls: session.progress.rounds
          .filter((entry) => entry.paidProviderCall === true).length,
        ...(generationUpgrade ? {
          upgradeKind: "agent_arrival_schedule_v1",
          previousPlanHash: previousPlan.planHash,
          previousSessionReceiptHash: session.sessionReceipt.receiptHash,
          arrivalScheduleHash:
            sessionResult.plan.openingDeploymentSchedule.scheduleHash,
          changedPublicSections: ["deploymentConcept",
            "publicSummaryText"],
        } : {}),
      };
      session.resumeReceipts.push({ ...resumeBody,
        resumeReceiptHash: hashStarcraftTmgContract({
          sessionId: session.sessionId, ...resumeBody }),
      });
      if (!generationUpgrade) {
        session.status = "planned";
        session.progress.phase = "completed";
        session.failure = null;
        session.mutationZeroProof = clone(mutationProof);
        await commitWorkspaceTransition(publishedSession, session, 'planning_generation_commit');
        return { sessionResult, reconstructed: true };
      }
      session.planVersionHistory ||= [];
      session.planVersionHistory.push(session.planSerialized);
      if (session.presetComparison) {
        session.presetComparisonHistory ||= [];
        session.presetComparisonHistory.push(clone(session.presetComparison));
        session.presetComparison = null;
      }
    }

    session.planSerialized = serializeWorkspacePlan(sessionResult.plan);
    session.generatedPlanHash = sessionResult.plan.planHash;
    session.candidates = sessionResult.candidates.map((entry) => clone(entry));
    session.candidateInputs = sessionResult.candidateInputs.map(
      (entry) => clone(entry));
    session.candidateSummaries = candidateSummaries;
    session.selectedCandidateInput = selectedCandidateInput;
    session.comparison = clone(sessionResult.comparison);
    // Native-only sinks omit failed requests that returned no Native receipt.
    // Keep the complete request/outcome trace for subsequent Teach and export.
    session.planningTrace = clone(sessionResult.planningTrace || []);
    session.generationTeachCycle = clone(sessionResult.teachCycle || null);
    if (sessionResult.selectionJustification) {
      session.selectionJustification = clone(sessionResult.selectionJustification);
    }
    session.rejections = sessionResult.rejections.map((entry) => clone(entry));
    session.toolReceipts = sink.toolReceipts.map((entry) => clone(entry));
    session.budgetBranchReceipts = (sessionResult.budgetBranchReceipts || [])
      .map((entry) => clone(entry));
    session.sessionReceipt = clone(sessionResult.sessionReceipt);
    session.skillRouteReceipt = clone(sessionResult.skillRoute.receipt);
    session.mutationZeroProof = clone(mutationProof);
    session.working = {
      candidateInput: clone(selectedCandidateInput),
      verdict: armyBuilderPort.evaluateRosterCandidate(
        clone(selectedCandidateInput)),
      overrideHistory: [],
    };
    session.planEvidenceStale = false;
    session.status = "planned";
    session.progress.phase = "completed";
    session.failure = null;
    if (presetArm && !session.presetComparison) {
      // Immutable Slice-272 comparison record, frozen at plan completion:
      // the Agent-built arm (public RosterPlan, budget acceptance bound)
      // against the fixed preset roster arm (explicitly no_pregame_plan),
      // matched on mission, deployment, map topology, scale, budget and
      // opponent faction. Later overrides/revisions never rewrite it; both
      // arms carry everything a later match or postgame review consumes
      // (candidate input, Builder audit hashes, plan hash/status).
      session.presetComparison = Object.freeze({
        schema: "starcraft_tmg_s272_preset_comparison_v1",
        createdAt: now(),
        matchedConditions: {
          missionRecordKey: fixture.missionRecordKey,
          deploymentRecordKey: fixture.deploymentRecordKey,
          mapTopologyHash: fixture.mapTopologyHash,
          engagementScale: session.setup.engagementScale,
          mineralBudget: session.setup.mineralBudget,
          opponentFactionRecordKey: session.setup.opponentFactionRecordKey,
          modelVersion: session.deliberationDescriptor?.modelVersion || null,
          skillRouteReceiptHash: sessionResult.skillRoute.receipt.receiptHash,
        },
        presetArm: {
          ...clone(presetArm),
          consumableByLaterMatchAndReview: true,
        },
        agentArm: {
          planStatus: sessionResult.plan.planStatus,
          planHash: sessionResult.plan.planHash,
          planFabricated: false,
          hiddenChainOfThoughtIncluded: false,
          sessionReceiptHash: sessionResult.sessionReceipt.receiptHash,
          armyAuditResultHash: sessionResult.finalVerdict.auditResultHash,
          mineralSpent: sessionResult.finalVerdict.summary.mineralSpent,
          vespeneSpent: sessionResult.finalVerdict.summary.vespeneSpent,
          selectedCandidateId:
            sessionResult.plan.rosterCandidate.candidateId,
          scoreRouteKind: sessionResult.plan.scoreRoute.routeKind,
          budgetAcceptanceStatus:
            sessionResult.plan.budgetAcceptance?.status ?? null,
          agentCompletionPolicyVersion:
            sessionResult.sessionReceipt.agentCompletionPolicyVersion,
          agentExactBudgetTargetMet:
            sessionResult.sessionReceipt.agentExactBudgetTargetMet,
          candidateInput: clone(selectedCandidateInput),
          toolReceiptReferenceCount:
            sessionResult.plan.toolReceiptReferences.length,
          consumableByLaterMatchAndReview:
            sessionResult.plan.planStatus === "active",
        },
        comparisonSeparatedListQualityFromPlayQuality:
          "pregame_list_construction_only_no_match_played",
        trainingTruth: false,
      });
    }
    if (!session.usage) {
      session.usage = {
        calls: 0, inputUnits: 0, outputUnits: 0, totalUnits: 0, latencyMs: 0,
        receiptHashes: [],
      };
    }
    session.usage.deliberationKind = session.deliberationDescriptor.kind;
    session.usage.modelVersion = session.deliberationDescriptor.modelVersion;
    await commitWorkspaceTransition(publishedSession, session, 'planning_generation_commit');
    return { sessionResult, reconstructed: false };
  }

  function retainRecoveredCompletedProviderOutput(session) {
    const failed = session.failedProviderOutputs?.at(-1);
    const recovered = recoverRosterFailedProviderOutputV1(failed);
    if (!recovered || session.publicOutputs.some((entry) =>
      entry.roundKind === recovered.roundKind
        && entry.roundIndex === recovered.roundIndex)) {
      wsFail("ROSTER_WORKSPACE_PAID_OUTPUT_RECOVERY_UNAVAILABLE",
        "failed_reply_not_uniquely_recoverable", 409);
    }
    session.publicOutputs.push(recovered);
    session.recoveredProviderOutputReceipts ||= [];
    session.recoveredProviderOutputReceipts.push(clone(recovered.recovery));
  }


  async function startPlanning(sessionId, { resume = false,
    replayOnly = false } = {}) {
    const session = requireSession(sessionId);
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    if (session.status === "running") {
      wsFail("ROSTER_WORKSPACE_SESSION_RUNNING", sessionId, 409);
    }
    if (resume && session.failure?.code
      === "ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE") {
      retainRecoveredCompletedProviderOutput(session);
    }
    const retainedCount = (session.publicOutputs || []).length;
    const unsentInitialRecovery = isUnsentInitialRosterPlanningV1(session);
    if (session.status === "planned" && !resume) {
      wsFail("ROSTER_WORKSPACE_ALREADY_PLANNED",
        "use_revise_or_resume_or_new_session", 409);
    }
    if (resume || replayOnly) {
      if (retainedCount === 0
        && !(resume && !replayOnly && (session.status === "paused" || unsentInitialRecovery))) {
        wsFail("ROSTER_WORKSPACE_RESUME_OUTPUT_MISSING",
          "no_retained_replies", 409);
      }
      if (retainedCount === 0 && !deliberationFactory) {
        wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
          "no_live_deliberation_factory_attached", 503);
      }
    } else if (!deliberationFactory) {
      wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
        "no_live_deliberation_factory_attached", 503);
    }
    if (session.status === "planned" && resume && !replayOnly
      && !deliberationFactory) {
      // A fully retained replay is still possible without the live factory;
      // only a missing round would need it. Allow and fail closed per round.
    }
    if (resume && unsentInitialRecovery) {
      session.resumeReceipts ||= [];
      session.resumeReceipts.push({ kind: 'initial_not_dispatched', at: now(),
        previousFailure: clone(session.failure), retainedReplyCount: 0,
        providerDispatchCount: 0, sameSession: true, replayedProviderCalls: 0 });
    }
    session.status = "running";
    session.progress = { phase: "running", rounds: [], activeRoundKind: null };
    session.failure = null;
    session.cancelRequested = false;
    session.pauseRequested = false;
    session.pauseReceipt = null;
    if (!resume && !replayOnly) {
      // A fresh explicit generate starts a new evidence chain; previously
      // retained replies belong to the older attempt and are archived, never
      // silently replayed as if they were new model output.
      session.publicOutputs = [];
      session.planSerialized = null;
      session.generatedPlanHash = null;
      session.candidates = [];
      session.candidateInputs = [];
      session.candidateSummaries = [];
      session.selectedCandidateInput = null;
      session.comparison = null;
      session.rejections = [];
      session.toolReceipts = [];
      session.budgetBranchReceipts = [];
      session.sessionReceipt = null;
      session.working = session.lockedRoster ? {
        candidateInput: clone(session.lockedRoster.lock.candidateInput),
        verdict: clone(session.lockedRoster.lock.verdict),
        overrideHistory: [],
      } : null;
      session.planEvidenceStale = false;
      session.usage = null;
      session.resumeReceipts = [];
    }
    await persist(session);
    const runId = randomUUID();
    activeRun = { sessionId: session.sessionId, runId };
    const finish = async (error) => {
      if (error) {
        const code = errorCode(error);
        session.status = code === "ROSTER_WORKSPACE_PAUSED"
          ? "paused" : code === "ROSTER_WORKSPACE_CANCELLED"
            ? "cancelled" : "failed";
        session.progress.phase = session.status;
        session.progress.activeRoundKind = null;
        if (session.status === "paused") {
          session.pauseRequested = false;
          const pauseBody = {
            at: now(),
            retainedReplyCount: session.publicOutputs.length,
            retainedOutputHashes: session.publicOutputs.map(
              (entry) => entry.outputHash),
            providerCalls: session.usage?.calls || 0,
            nextSendNotDispatched: true,
          };
          session.pauseReceipt = { ...pauseBody,
            pauseReceiptHash: hashStarcraftTmgContract({
              sessionId: session.sessionId, ...pauseBody,
            }),
          };
          session.pauseReceipts ||= [];
          session.pauseReceipts.push(clone(session.pauseReceipt));
          session.failure = null;
        } else {
          session.failure = {
            code,
            detail: String(error?.message || "").slice(0, 300),
            safeStatus: error?.safeStatus ?? null,
            at: now(),
            automaticRetry: false,
          };
        }
        await persistFailureState(session);
      }
      // Success has already been saved by executePlanning. Do not publish
      // before save or append a redundant second terminal write here.
      if (activeRun?.runId === runId) activeRun = null;
    };
    // Asynchronous by design: the HTTP response returns immediately and the
    // client polls the session projection for round progress.
    void (async () => {
      try {
        await executePlanning(session, { replayOnly });
        await finish(null);
      } catch (error) {
        await finish(error);
      }
    })();
    return projectSession(session);
  }

  async function cancelPlanning(sessionId) {
    const session = requireSession(sessionId);
    const journeyStopped = presetJourney.stop(sessionId);
    if ((session.status !== "running"
      && session.planReview?.status !== "running"
      && session.teachFramework?.status !== "running")
       || activeRun?.sessionId !== session.sessionId) {
      if (journeyStopped) {
        session.cancelRequested = true;
        await persist(session);
        return projectSession(session);
      }
      wsFail("ROSTER_WORKSPACE_NOT_RUNNING", sessionId, 409);
    }
    // Cancellation is checked before every deliberation send: a cancelled
    // round never reaches the Provider, so no duplicate or late paid call is
    // possible. A round already in flight is single-flight and never
    // retried; its reply is retained but not applied once cancellation was
    // requested.
    session.cancelRequested = true;
    await persist(session);
    return projectSession(session);
  }

  async function pausePlanning(sessionId) {
    const session = requireSession(sessionId);
    const journeyStopped = presetJourney.stop(sessionId);
    if ((session.status !== "running"
      && session.planReview?.status !== "running"
      && session.teachFramework?.status !== "running")
      || activeRun?.sessionId !== session.sessionId) {
      if (journeyStopped) {
        session.pauseRequested = true;
        await persist(session);
        return projectSession(session);
      }
      wsFail("ROSTER_WORKSPACE_NOT_RUNNING", sessionId, 409);
    }
    // The secure port checks this before the next Provider send. A reply
    // already in flight is retained at its round boundary; it is never
    // interrupted, discarded, or automatically sent a second time.
    session.pauseRequested = true;
    await persist(session);
    return projectSession(session);
  }

  // One ledger/authorization protocol for review and Teach. The shared
  // reconciler decides whether a saved reply or a proven-not-sent attempt is
  // reusable. Unknown-cost retries preserve the original and are consumed by
  // recordRoundEvent at the reserved barrier before physical egress.
  async function prepareInterruptedDispatchRetry(session, failed, recovery, request, failureCode) {
    if (["replay_local", "retry_not_sent"].includes(recovery.action)) return null;
    const alreadyRetried = (session.providerDispatches || []).some(record =>
      record.retryOfRequestId === failed?.requestId);
    const standingResume = recovery.action === "retry_authorized_unknown";
    const explicitSingleRetry = recovery.action === 'retry_explicit_once'
      && request.authorizeOneAdditionalDispatchRetry === true;
    if ((!standingResume && !explicitSingleRetry && request.retryAmbiguousDispatch !== true) || request.fresh === true
      || request.expectedRequestId !== failed?.requestId
      || (!standingResume && !explicitSingleRetry && (failed?.status !== "ambiguous" || failed.retryOfRequestId))
      || !failed?.requestId || !failed.requestBodyHash || !failed.contextHash
      || (!standingResume && !explicitSingleRetry && recovery.reason !== "egress_unknown_and_no_result_lookup")
      || alreadyRetried) {
      wsFail(failureCode, recovery.reason, 409);
    }
    session.dispatchRetryAuthorizations ||= [];
    let authorization = session.dispatchRetryAuthorizations.find(item =>
      item.requestId === failed.requestId);
    if (authorization?.status === "consumed") {
      wsFail(failureCode, "one_send_consent_already_consumed", 409);
    }
    if (!authorization) {
      authorization = { authorizationId: randomUUID(), requestId: failed.requestId,
        planHash: failed.planHash, roundKind: failed.roundKind,
        roundIndex: failed.roundIndex, contextHash: failed.contextHash,
        requestBodyHash: failed.requestBodyHash, status: "authorized",
        authorizedAt: now(), maximumPhysicalRetries: 1,
        originalCostStatus: "unknown", explicitOperatorConsent: true,
        standingNetworkResumeConsent: standingResume, explicitSingleRetry };
      session.dispatchRetryAuthorizations.push(authorization);
    }
    await persist(session);
    return { ...clone(failed), retryAuthorizationId: authorization.authorizationId,
      explicitSingleRetry: authorization.explicitSingleRetry === true,
      standingNetworkResumeConsent: authorization.standingNetworkResumeConsent === true };
  }

  async function prepareExplicitTerminalDispatchRetry(session, plan, request, kind) {
    const failed = session.providerDispatches?.at(-1);
    if (request.expectedPlanHash !== plan.planHash || request.fresh === true
      || request.expectedRequestId !== failed?.requestId || failed.planHash !== plan.planHash
      || !(kind === 'revision' ? failed.roundKind === 'revision'
        : String(failed.roundKind).startsWith('teach_framework_'))
      || session.progress.activeRoundKind || session.status === 'running'
      || (kind === 'revision' ? session.status !== 'failed' : session.teachFramework?.status !== 'failed')
      || session.providerDispatches.some(d => d.retryOfRequestId === failed.requestId)
      || session.publicOutputs.some(o => o.contextHash === failed.contextHash)) {
      wsFail('ROSTER_WORKSPACE_EXPLICIT_RETRY_UNAVAILABLE', 'latest_terminal_request_required', 409);
    }
    const recovery = reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: failed,
      retainedOutputs: session.publicOutputs, processInterrupted: true,
      retryAuthorizations: session.dispatchRetryAuthorizations || [],
      resumeAuthorization: { requestId: failed.requestId, contextHash: failed.contextHash,
        requestBodyHash: failed.requestBodyHash, explicitSingleRetry: true } });
    if (recovery.action !== 'retry_explicit_once') {
      wsFail('ROSTER_WORKSPACE_EXPLICIT_RETRY_UNAVAILABLE', recovery.reason, 409);
    }
    session.dispatchReconciliations ||= [];
    session.dispatchReconciliations.push({ planHash: plan.planHash, runKind: kind,
      recovery: clone(recovery), at: now() });
    return prepareInterruptedDispatchRetry(session, failed, recovery, request,
      'ROSTER_WORKSPACE_EXPLICIT_RETRY_UNAVAILABLE');
  }

  function networkDispatchRecovery(session, planHash = null) {
    if (session.providerNetworkRecovery?.standingConsent !== true) return null;
    return async failed => {
      if (session.cancelRequested || session.pauseRequested || failed.sessionId !== session.sessionId
        || failed.planHash !== planHash || failed.retryOfRequestId || failed.retryOfNotSentRequestId
        || !['ambiguous', 'definitely_not_sent'].includes(failed.status)
        || !isRecoverableProviderNetworkFailureV1(failed.transportFailure)) return null;
      const saved = session.providerDispatches?.find(d => d.requestId === failed.requestId);
      if (!saved || saved.status !== failed.status || saved.contextHash !== failed.contextHash
        || saved.requestBodyHash !== failed.requestBodyHash) return null;
      // Called ONLY after worker.send terminates with a network failure, never
      // on an observer/UI timeout while a physical request is still in flight.
      const request = { expectedRequestId: failed.requestId, resumeAfterNetworkInterrupt: true };
      const recovery = reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: saved,
        retainedOutputs: session.publicOutputs || [], processInterrupted: true,
        retryAuthorizations: session.dispatchRetryAuthorizations || [],
        resumeAuthorization: { requestId: saved.requestId, contextHash: saved.contextHash,
          requestBodyHash: saved.requestBodyHash, standingNetworkResumeConsent: true } });
      if (!['retry_not_sent', 'retry_authorized_unknown'].includes(recovery.action)) return null;
      const prepared = await prepareInterruptedDispatchRetry(session, saved, recovery, request,
        'ROSTER_WORKSPACE_NETWORK_RECOVERY_DENIED');
      session.dispatchReconciliations ||= [];
      session.dispatchReconciliations.push({ at: now(), planHash, recovery: clone(recovery),
        automaticInPlace: true, noSceneRestart: true });
      session.progress.networkRecovery = { requestId: saved.requestId, status: 'retrying_once',
        reason: saved.transportFailure.code, originalCostStatus: saved.costStatus, at: now() };
      await persist(session);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return prepared || clone(saved);
    };
  }

  // Explicit post-deepening Teach review. It is advisory and never rewrites
  // a paid plan or its Builder verdict. A completed paid reply is persisted
  // at the round boundary and replayed on the same plan after a restart.
  async function reconcileProviderDispatch(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (activeRun) wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    const plan = session.planSerialized ? parseWorkspacePlan(session.planSerialized) : null;
    const dispatchRecord = [...(session.providerDispatches || [])].reverse().find(record =>
      record.planHash === plan?.planHash);
    const recovery = reconcileStarcraftTmgProviderDispatchV1({
      dispatchRecord: dispatchRecord || null, retainedOutputs: session.publicOutputs || [],
      processInterrupted: ["ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART",
        "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP", "ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED"]
        .includes(session.planReview?.failure?.code),
      retryAuthorizations: session.dispatchRetryAuthorizations || [],
      resumeAuthorization: request.resumeAfterNetworkInterrupt === true
        && request.expectedRequestId === dispatchRecord?.requestId ? {
          requestId: dispatchRecord.requestId, contextHash: dispatchRecord.contextHash,
          requestBodyHash: dispatchRecord.requestBodyHash, standingNetworkResumeConsent: true,
        } : null,
    });
    session.dispatchReconciliations ||= [];
    session.dispatchReconciliations.push({ planHash: plan?.planHash || null,
      recovery: clone(recovery), at: now() });
    await persist(session);
    // Do not clear failed review or rewrite usage. Reconciliation is evidence,
    // and only replay_local / proven-not-sent can permit the next request.
    return { sessionId, recovery, session: projectSession(session) };
  }

  async function reviewFinalPlan(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    if (session.planReview?.failure?.code
      === "ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE") {
      retainRecoveredCompletedProviderOutput(session);
      await persist(session);
    }
    if (session.status !== "planned" || !session.planSerialized) {
      wsFail("ROSTER_WORKSPACE_NOT_PLANNED", sessionId, 409);
    }
    const plan = parseWorkspacePlan(session.planSerialized);
    if (planEvidenceStale(session, plan)) {
      wsFail("ROSTER_WORKSPACE_REPLAN_REQUIRED_AFTER_ROSTER_EDIT",
        "final_review_requires_matching_list", 409);
    }
    if (request.scope !== undefined && !["full", "changed_claims", "missing_claims"].includes(request.scope)) {
      wsFail("ROSTER_WORKSPACE_REVIEW_SCOPE_INVALID", "scope", 400);
    }
    // The product Journey and Web callers share this default. A prose repair
    // should reuse its completed review, not silently repurchase every shard.
    // The existing reviewer still verifies all non-prose dependencies and
    // falls back to a full review when those dependencies actually changed.
    if (request.scope === undefined) {
      const reviews = [session.planReview, ...(session.planReviewHistory || [])];
      const previous = [...(session.planVersionHistory || [])].reverse()
        .map(parseWorkspacePlan).find(entry => entry.planHash !== plan.planHash
          && reviews.some(review => review?.status === 'completed'
            && review.planHash === entry.planHash && review.review?.planHash === entry.planHash));
      if (previous) request = { ...request, scope: 'changed_claims', baselinePlanHash: previous.planHash };
    }
    let incrementalFrom = null;
    if (request.scope === "missing_claims") {
      if (session.planReview?.status !== "completed"
        || session.planReview.planHash !== plan.planHash
        || session.planReview.review?.planHash !== plan.planHash
        || session.planReview.review?.reviewContextVersion
          !== "all_claims_bounded_shards_source_bound_teach_evidence_v3_6") {
        wsFail("ROSTER_WORKSPACE_INCREMENTAL_REVIEW_BASELINE_MISSING",
          "current_legacy_review_required_for_missing_claims", 409);
      }
      incrementalFrom = { plan: clone(plan), review: clone(session.planReview.review) };
    }
    if (request.scope === "changed_claims") {
      const previous = (session.planVersionHistory || []).map(parseWorkspacePlan)
        .find(entry => entry.planHash === request.baselinePlanHash);
      const previousReview = [session.planReview,
        ...(session.planReviewHistory || [])].find(entry =>
        entry?.status === "completed" && entry.planHash === previous?.planHash
          && entry.review?.planHash === previous?.planHash);
      if (!previous || !previousReview || previous.planHash === plan.planHash) {
        wsFail("ROSTER_WORKSPACE_INCREMENTAL_REVIEW_BASELINE_MISSING",
          "persisted_previous_plan_and_completed_review_required", 409);
      }
      incrementalFrom = { plan: clone(previous), review: clone(previousReview.review) };
    }
    let retryDispatch = null;
    if (session.planReview?.planHash === plan.planHash
      && ["ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP",
        "ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART", "ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED"]
        .includes(session.planReview.failure?.code)) {
      const { recovery } = await reconcileProviderDispatch(sessionId, request);
      const failed = [...(session.providerDispatches || [])].reverse().find(record =>
        record.planHash === plan.planHash);
      retryDispatch = await prepareInterruptedDispatchRetry(session, failed, recovery, request,
        "ROSTER_WORKSPACE_REVIEW_AMBIGUOUS_DISPATCH_REQUIRES_RECONCILIATION");
      if (retryDispatch) {
        session.planReviewHistory ||= [];
        session.planReviewHistory.push(clone(session.planReview));
        await persist(session);
      }
    }
    if (session.planReview?.status === "completed"
      && session.planReview.planHash === plan.planHash
      && session.planReview.review?.evidenceAuditVersion
        === ROSTER_PLAN_SOURCE_AUDIT_VERSION
      && session.planReview.review?.reviewContextVersion
        === ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3
      && request.fresh !== true) return projectSession(session);
    const retained = request.fresh !== true
      && session.planReview?.planHash === plan.planHash
      && (session.planReview.review?.reviewContextVersion
        || session.planReview.reviewContextVersion)
        === ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3
      ? (session.publicOutputs || []).filter((entry) => (
        entry.roundKind === "final_plan_review"
          && Number(entry.roundIndex) >= 1
            && object(entry.sanitizedOutput))) : [];
    if (retained.length === 0 && !deliberationFactory) {
      wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
        "no_live_deliberation_factory_attached", 503);
    }
    if (session.planReview?.status === "completed"
      && (request.fresh === true
        || session.planReview.planHash !== plan.planHash
        || session.planReview.review?.evidenceAuditVersion
          !== ROSTER_PLAN_SOURCE_AUDIT_VERSION
        || session.planReview.review?.reviewContextVersion
          !== ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3)) {
      session.planReviewHistory ||= [];
      session.planReviewHistory.push(clone(session.planReview));
    }
    session.planReview = { status: "running", planHash: plan.planHash,
      reviewContextVersion: ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3,
      review: null, failure: null };
    session.cancelRequested = false;
    await persist(session);
    const runId = randomUUID();
    activeRun = { sessionId: session.sessionId, runId,
      runKind: "final_plan_review" };
    const onEvent = async (event) => {
      recordRoundEvent(session, event);
      if (event.type !== "round_started" || event.replayed) {
        if (event.type === "provider_dispatch" || event.type === "round_completed") {
          await persist(session);
        } else await persist(session).catch(() => {});
      }
    };
    void (async () => {
      try {
        const control = { cancelled: () => session.cancelRequested === true };
        const livePort = deliberationFactory
          ? await deliberationFactory.createForRun({
              sessionId: session.sessionId, runKind: "final-plan-review",
              planHash: plan.planHash,
            retryDispatch, control, onEvent,
            recoverNetworkDispatch: networkDispatchRecovery(session, plan.planHash) }) : null;
        const deliberation = retained.length > 0
          ? createRetainedReplayDeliberationPortV1({
            retainedOutputs: retained, livePort, onEvent,
            requireContextBoundReplay: true,
            modelVersion: session.deliberationDescriptor?.modelVersion
              || "retained-replay" })
          : livePort;
        const review = await reviewRosterFinalPlanV3({ plan,
          deliberation, sessionId: session.sessionId,
          teachState: withRosterTeachPlanHistoryV1(plan, session.teachFramework?.state || null, session.teachFrameworkHistory),
          armyAudit: session.working?.verdict?.audit || session.lockedRoster?.lock?.verdict?.audit,
          ...(incrementalFrom ? { incrementalFrom } : {}),
          ...(request.scope === "changed_claims" && request.relatedRepairClaimPaths ? {
            relatedRepairClaimPaths: request.relatedRepairClaimPaths,
          } : {}),
          ...(request.scope === "missing_claims" ? {
            coverageUpgradeAdditionalClaimPaths: request.additionalClaimPaths || [],
          } : {}),
          allowFullReviewOnDependencyChange: request.scope === "changed_claims",
          adaptiveReview: request.adaptiveReview !== false,
          // Host-persisted failures only. Exact context hashes bind plan/facts/
          // targets; unknown historical failures do not authorize a subdivision.
          incompleteShardContextHashes: (session.failedProviderOutputs || [])
            .filter(entry => entry.roundKind === "final_plan_review"
              && entry.providerStatus === "incomplete"
              && entry.providerIncompleteReason === "max_output_tokens"
              && HASH_PATTERN.test(String(entry.contextHash || "")))
            .map(entry => entry.contextHash),
          onShardProgress: async event => {
            session.planReview.subdivisionHistory ||= [];
            session.planReview.subdivisionHistory.push(clone(event));
            await persist(session);
          },
          toolReceipts: session.toolReceipts,
          selectionUnitRules: input.selectionUnitRules || [],
          selectionSupportRules: input.selectionSupportRules || [],
          selectionJustificationPolicyVersion: session.agentSelectedStrategySource
            ?.selectionJustificationPolicyVersion || null,
          selectedCandidateInputHash: session.selectedCandidateInput
            ? hashStarcraftTmgContract(session.selectedCandidateInput)
            : null });
        if (session.cancelRequested) {
          wsFail("ROSTER_WORKSPACE_CANCELLED", "final_plan_review", 409);
        }
        await commitWorkspaceTransition(session, { ...session,
          planReview: { status: "completed", planHash: plan.planHash,
            reviewContextVersion: ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3,
            review, failure: null },
          progress: { ...session.progress, phase: "completed", activeRoundKind: null },
        }, 'final_plan_review_commit');
      } catch (error) {
        session.planReview = { status: "failed", planHash: plan.planHash,
          reviewContextVersion: ROSTER_FINAL_PLAN_REVIEW_CONTEXT_VERSION_V3,
          review: null, failure: { code: errorCode(error),
            detail: String(error?.message || "").slice(0, 300),
            at: now(), automaticRetry: false } };
        session.progress.phase = "failed";
        session.progress.activeRoundKind = null;
        await persistFailureState(session, session.planReview);
      } finally {
        if (activeRun?.runId === runId) activeRun = null;
      }
    })();
    return projectSession(session);
  }

  async function reconcileReviewFindings(sessionId) {
    const session = requireSession(sessionId);
    if (activeRun) wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    const current = projectSession(session);
    if (current.status !== "planned" || current.planReview?.status !== "completed"
      || current.planReview.stale || current.planReview.planHash !== current.plan?.planHash) {
      wsFail("ROSTER_WORKSPACE_AUTO_REPAIR_CURRENT_REVIEW_REQUIRED", "qualification", 409);
    }
    const review = current.planReview.review;
    if (!needsRosterFinalPlanReconciliationV1(review)) return current;
    const savedQualification = session.reviewReconciliation?.failure?.code === 'ROSTER_WORKSPACE_PERSISTENCE_FAILED'
      && session.reviewReconciliation.recoveryCheckpoint?.status === 'completed'
      && session.reviewReconciliation.recoveryCheckpoint.planHash === current.plan.planHash
      && session.reviewReconciliation.recoveryCheckpoint.sourceReviewHash === review.reviewHash;
    const capacityFormatRecovery = canReencodeRejectedRosterReviewV1(session);
    if (session.reviewReconciliation?.status === "failed"
      && session.reviewReconciliation.sourceReviewHash === review.reviewHash && !savedQualification && !capacityFormatRecovery
      && !isUndispatchedCurrentRosterReviewV1(session)) {
      const { recovery } = await reconcileProviderDispatch(sessionId);
      if (!["replay_local", "retry_not_sent"].includes(recovery.action)) {
        wsFail("ROSTER_WORKSPACE_REVIEW_AMBIGUOUS_DISPATCH_REQUIRES_RECONCILIATION",
          recovery.reason, 409);
      }
    }
    const runId = randomUUID();
    const retained = (session.publicOutputs || []).filter(output =>
      ["final_review_reconciliation", "final_review_reconciliation_consistency"].includes(output.roundKind)
        && object(output.sanitizedOutput));
    const priorRecovery = clone(session.reviewReconciliation || null);
    if (capacityFormatRecovery) {
      const failed = session.providerDispatches.at(-1);
      session.dispatchReconciliations ||= [];
      session.dispatchReconciliations.push({at:now(), planHash:current.plan.planHash,
        recovery:{action:'continue_with_corrected_catalogue_format',requestId:failed.requestId,
          previousContextHash:failed.contextHash,originalCostStatus:failed.costStatus,
          transportVersion:ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1,attemptCountsReset:false,
          rejectedBodyResent:false}});
    }
    const sameRecoveryEpoch = priorRecovery?.sourceReviewHash === review.reviewHash
      && priorRecovery.policyVersion === ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION;
    if (priorRecovery) {
      session.reviewReconciliationHistory ||= [];
      session.reviewReconciliationHistory.push(priorRecovery);
    }
    const dispatchContexts = new Set([priorRecovery, ...(session.reviewReconciliationHistory || [])]
      .filter(r => r?.sourceReviewHash === review.reviewHash)
      .flatMap(r => (r.recoveryCheckpoint?.attempts || []).map(a => a.contextHash)));
    // A completed capacity rejection produced no review. It remains in the
    // physical-call/unknown-cost ledger, but does not consume a semantic review
    // round. Recovery still requires a corrected format, not a blind resend.
    const capacityRefusals = countRosterReviewCapacityRefusalsV1({contexts:[...dispatchContexts],dispatches:session.providerDispatches});
    // Standing post-fix consent permits ONE additional attempt after a proved
    // old hand-written-literal contract defect. This is tied to the saved old
    // reply/version, not to process restarts, and never resets earlier usage.
    const literalToolMigrationAllowance=Number((session.providerDispatches||[]).some(d=>
      dispatchContexts.has(d.contextHash) && d.status==='completed'
      && d.outputContractRef?.version==='4.3.0'
      && (session.publicOutputs||[]).some(o=>o.dispatchRequestId===d.requestId)));
    const maximumFreshCalls = 3 + capacityRefusals + literalToolMigrationAllowance;
    const actualDispatchCount = () => countRosterReviewDispatchesV1({
      contexts:[...dispatchContexts],dispatches:session.providerDispatches,
      fallback:sameRecoveryEpoch ? priorRecovery.freshCallsUsed || 0 : 0 });
    session.reviewReconciliation = { status: "running", sourceReviewHash: review.reviewHash,
      planHash: current.plan.planHash, startedAt: now(), automaticAmbiguousRetry: false,
      policyVersion: ROSTER_FINAL_REVIEW_RECONCILIATION_POLICY_VERSION,
      freshCallsUsed: actualDispatchCount(),
      dispatchAccounting: 'persisted_before_send_including_unknown_v1',
      maximumFreshCalls, maximumModelReviewRounds:3, postFixLiteralToolAllowance:literalToolMigrationAllowance,
      capacityRefusals, previousHistoryPreserved: true,
      recoveryCheckpoint: sameRecoveryEpoch ? priorRecovery.recoveryCheckpoint || null : null };
    activeRun = { sessionId, runId, runKind: "final_review_reconciliation" };
    await persist(session);
    const onEvent = async event => { recordRoundEvent(session, event); await persist(session); };
    try {
      const providerPort = await deliberationFactory?.createForRun({ sessionId,
        runKind: "review-reconciliation", planHash: current.plan.planHash,
        control: { cancelled: () => session.cancelRequested === true }, onEvent,
        recoverNetworkDispatch: networkDispatchRecovery(session, current.plan.planHash) });
      const livePort = providerPort && { ...providerPort, deliberate: async request => {
        dispatchContexts.add(request.contextHash);
        session.reviewReconciliation.freshCallsUsed = actualDispatchCount();
        if (session.reviewReconciliation.freshCallsUsed >= maximumFreshCalls) {
          wsFail("ROSTER_WORKSPACE_REVIEW_RECOVERY_CALL_LIMIT", "durable_recovery_epoch_limit", 409);
        }
        session.reviewReconciliation.freshCallsUsed += 1;
        await persist(session);
        return providerPort.deliberate(request);
      } };
      const deliberation = retained.length ? createRetainedReplayDeliberationPortV1({
        retainedOutputs: retained, livePort, onEvent, requireContextBoundReplay: true,
        modelVersion: session.deliberationDescriptor?.modelVersion || "retained-replay" }) : livePort;
      const qualified = await reconcileRosterFinalPlanReviewV1({ plan: current.plan,
        review, deliberation, sessionId, toolReceipts: session.toolReceipts,
        teachState: withRosterTeachPlanHistoryV1(current.plan, session.teachFramework?.state || null, session.teachFrameworkHistory),
        retainedOutputs: retained,
        providerDispatches: session.providerDispatches,
        maximumFreshCalls,
        recoveryCheckpoint: session.reviewReconciliation.recoveryCheckpoint,
        onCheckpoint: async checkpoint => {
          session.reviewReconciliation.recoveryCheckpoint = clone(checkpoint);
          await persist(session);
        },
        selectedCandidateInputHash: session.selectedCandidateInput
          ? hashStarcraftTmgContract(session.selectedCandidateInput) : null,
        selectionUnitRules: input.selectionUnitRules || [],
        selectionSupportRules: input.selectionSupportRules || [],
        selectionJustificationPolicyVersion: session.agentSelectedStrategySource
          ?.selectionJustificationPolicyVersion || null,
        armyAudit: session.working?.verdict?.audit || session.lockedRoster?.lock?.verdict?.audit });
      if (session.cancelRequested) wsFail("ROSTER_WORKSPACE_CANCELLED", "review_reconciliation", 409);
      const next = { ...session,
        planReview: { ...session.planReview, review: qualified },
        planReviewHistory: [...(session.planReviewHistory || [])],
        reviewReconciliation: { ...session.reviewReconciliation, status: 'completed',
          reviewHash: qualified.reviewHash, finishedAt: now() } };
      if (qualified.reviewHash === review.reviewAdjudication?.reconciliation?.sourceReviewHash) {
        next.planReviewHistory.push({ ...clone(session.planReview),
          recoveryNote: "redundant_qualification_progress_restored_from_exact_saved_proof" });
      }
      await commitWorkspaceTransition(session, next, 'review_qualification_commit');
      return projectSession(session);
    } catch (error) {
      Object.assign(session.reviewReconciliation, { status: "failed",
        failure: { code: errorCode(error), at: now(), automaticRetry: false,
          bindingIssues: clone(error.bindingIssues || []),
          reconciliationAttempts: clone(error.reconciliationAttempts
            || session.reviewReconciliation.recoveryCheckpoint?.attempts || []) },
        recoveryCheckpoint: clone(error.recoveryCheckpoint
          || session.reviewReconciliation.recoveryCheckpoint || null) });
      await persistFailureState(session, session.reviewReconciliation);
      throw error;
    } finally {
      if (activeRun?.runId === runId) activeRun = null;
    }
  }

  async function repairReviewedPlan(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (autoRepairRuns.has(sessionId)) return projectSession(session);
    if (activeRun) wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    const current = projectSession(session);
    if (current.status !== "planned" || !HASH_PATTERN.test(String(request.expectedPlanHash || ""))
      || current.plan?.planHash !== request.expectedPlanHash
      || current.planReview?.status !== "completed" || current.planReview.stale) {
      wsFail("ROSTER_WORKSPACE_AUTO_REPAIR_CURRENT_REVIEW_REQUIRED", "current_plan", 409);
    }
    const completedReviews = [...(session.planReviewHistory || []), session.planReview]
      .filter(review => review?.status === "completed").length;
    if (completedReviews >= 3 && request.authorizeAdditionalCycle !== true) {
      wsFail("ROSTER_WORKSPACE_SOURCE_REVIEW_NONCONVERGENT", "three_review_limit", 409);
    }
    const jobId = randomUUID();
    if (session.autoPlanRepair) {
      session.autoPlanRepairHistory ||= [];
      session.autoPlanRepairHistory.push(clone(session.autoPlanRepair));
    }
    session.autoPlanRepair = { version: "reviewed_plan_automatic_repair_v1",
      jobId, status: "running", phase: "queued", initialPlanHash: current.plan.planHash,
      authorizeAdditionalCycle: request.authorizeAdditionalCycle === true,
      maximumAdditionalCycles: request.authorizeAdditionalCycle === true ? 1 : null,
      completedCycles: 0, startedAt: now(), historyReset: false,
      automaticAmbiguousRetry: false, trainingTruth: false };
    await persist(session);
    const run = (async () => {
      try {
        const result = await runReviewedRosterPlanRepairV1({
          service: { readSession, revisePlan, reviewFinalPlan, reconcileReviewFindings }, sessionId,
          expectedPlanHash: request.expectedPlanHash,
          authorizeAdditionalCycle: request.authorizeAdditionalCycle === true,
          shouldStop: () => session.cancelRequested === true || session.pauseRequested === true,
          onProgress: async event => {
            Object.assign(session.autoPlanRepair, clone(event));
            await persist(session);
          },
        });
        Object.assign(session.autoPlanRepair, result);
      } catch (error) {
        session.autoPlanRepair.status = "blocked";
        session.autoPlanRepair.failure = { code: errorCode(error), at: now(),
          automaticRetry: false };
      } finally {
        session.autoPlanRepair.finishedAt = now();
        autoRepairRuns.delete(sessionId);
        await persist(session).catch(() => {});
      }
    })();
    autoRepairRuns.set(sessionId, run);
    return projectSession(session);
  }

  // ------------------------------------------------------------ revision

  // One product operation for A (preset) and B (reselectable). The job uses
  // the same secure Provider, Rules tools and retained paid-response ledger.
  // A different edit authority does NOT mean a shallower Plan review.
  function requireRetainedTeachSourcePlan(session, targetPlan, sourceTeachPlanHash) {
    const previous = session.teachFramework;
    const originalPlan = [session.planSerialized, ...(session.planVersionHistory || [])]
      .map(parseWorkspacePlan).find(p => p.planHash === sourceTeachPlanHash);
    if (previous?.planHash !== sourceTeachPlanHash || !originalPlan
      || !isDeepStrictEqual(previous.context?.fixture, fixture)
      || !isDeepStrictEqual(previous.context?.setup, session.setup)
      || ["sideKey", "provenance", "rosterCandidate", "openingDeploymentSchedule"]
        .some(key => !isDeepStrictEqual(originalPlan[key], targetPlan[key]))) {
      wsFail("ROSTER_WORKSPACE_RETAINED_TEACH_DEPENDENCY_CHANGED", "army_map_rules_or_schedule_changed", 409);
    }
    return originalPlan;
  }

  async function teachPlanFramework(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (request.factProbeExecutionMode !== undefined && request.factProbeExecutionMode !== 'product_evidence_led') {
      wsFail('ROSTER_WORKSPACE_FACT_PROBE_EXECUTION_MODE_INVALID');
    }
    if (activeRun) wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    if (!session.planSerialized || session.status !== "planned") {
      wsFail("ROSTER_WORKSPACE_NOT_PLANNED", sessionId, 409);
    }
    let plan = parseWorkspacePlan(session.planSerialized);
    if (request.expectedPlanHash !== plan.planHash || planEvidenceStale(session, plan)) {
      wsFail("ROSTER_WORKSPACE_TEACH_PLAN_CHANGED", "current_plan_required", 409);
    }
    if (request.automaticNetworkRecovery !== undefined) {
      if (typeof request.automaticNetworkRecovery !== 'boolean') {
        wsFail('ROSTER_WORKSPACE_NETWORK_RECOVERY_POLICY_INVALID');
      }
      session.providerNetworkRecovery = { version: 1, standingConsent: request.automaticNetworkRecovery,
        maximumAmbiguousRetriesPerRequest: 1, preserveUnknownCost: true, configuredAt: now() };
      await persist(session); // Also durable when completed Teach returns without another run.
    }
    const previous = session.teachFramework;
    if (request.revisionWorkOrderOnly !== undefined) {
      if (request.revisionWorkOrderOnly !== true || previous?.planHash !== plan.planHash
        || !previous.state?.investigation?.completed || !previous.state?.synthesis?.answers
        || ['sourceTeachPlanHash','recoverFailedQueryIds','startFactProbeForQuestionIds',
          'resumeDependentQueriesForQuestionIds','refreshQueryCapabilitiesForQuestionIds',
          'resynthesizeSavedEvidence','authorizeInvestigationSupplement'].some(key=>request[key] !== undefined)) {
        wsFail('ROSTER_WORKSPACE_TEACH_WORK_ORDER_UNAVAILABLE','completed_current_evidence_required',409);
      }
      previous.revisionWorkOrderRequested = true;
      await persist(session);
    }
    const revisionWorkOrderOnly = previous?.revisionWorkOrderRequested === true;
    if (request.resynthesizeSavedEvidence !== undefined) {
      if (request.resynthesizeSavedEvidence !== true || previous?.planHash !== plan.planHash
        || previous.status !== 'completed'
        || ['sourceTeachPlanHash', 'recoverFailedQueryIds', 'startFactProbeForQuestionIds',
          'resumeDependentQueriesForQuestionIds', 'refreshQueryCapabilitiesForQuestionIds',
          'authorizeInvestigationSupplement', 'resumeInvestigationAfterProgressFix']
          .some(key => request[key] !== undefined && request[key] !== false)) {
        wsFail('ROSTER_WORKSPACE_SYNTHESIS_REVIEW_UNAVAILABLE', 'completed_same_plan_without_query_continuation_required', 409);
      }
      if (!deliberationFactory) wsFail('ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE', 'no_live_factory', 503);
      if ((session.providerDispatches || []).some(dispatch =>
        ['ambiguous', 'reserved', 'sent', 'sending'].includes(dispatch.status)
        && !(session.publicOutputs || []).some(output => output.contextHash === dispatch.contextHash))) {
        wsFail('ROSTER_WORKSPACE_SYNTHESIS_REVIEW_UNAVAILABLE', 'reconcile_existing_dispatch_first', 409);
      }
      beginRosterTeachSynthesisReviewV1(previous.state);
    }
    let retainedQueryContinuation = null;
    if (request.sourceTeachPlanHash !== undefined) {
      // Repair the original question in its original context, not a newly
      // generated Teach agenda. This never replaces or certifies the current
      // Plan. The live laboratory is reusable only with unchanged dependencies.
      if (!Array.isArray(request.recoverFailedQueryIds)
        || request.sourceTeachPlanHash !== previous?.planHash
        || request.authorizeInvestigationSupplement === true) {
        wsFail("ROSTER_WORKSPACE_TEACH_QUERY_RECOVERY_UNAVAILABLE", "explicit_saved_teach_queries_required", 409);
      }
      const targetPlan = plan;
      const originalPlan = requireRetainedTeachSourcePlan(session, targetPlan, request.sourceTeachPlanHash);
      plan = originalPlan;
      retainedQueryContinuation = { version: 1, sourceTeachPlanHash: plan.planHash,
        targetPlanHash: targetPlan.planHash, queryIds: clone(request.recoverFailedQueryIds),
        frozenDependenciesUnchanged: true, originalQuestionAndContextPreserved: true,
        automaticallyAppliedToTargetPlan: false, historyOrUsageReset: false,
        at: now(), trainingTruth: false };
    }
    if (request.recoverFailedQueryIds !== undefined) {
      const ids = request.recoverFailedQueryIds;
      const queries = new Set([
        ...(previous?.state.agenda?.questions || []).map(q => q.questionId),
        ...(previous?.state.investigation?.operations || []).map(op => op.queryId),
      ]);
      if (previous?.planHash !== plan.planHash || !previous.state.investigation?.completed
        || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length
        || ids.some(id => !queries.has(id))) {
        wsFail("ROSTER_WORKSPACE_TEACH_QUERY_RECOVERY_UNAVAILABLE", "saved_queries_on_current_plan_required", 409);
      }
      previous.state.queryRecovery ||= { version: 1, operations: [] };
      const recovery = previous.state.queryRecovery;
      if (request.reexecuteSavedQuery !== true && previous.status === "completed" && ids.every(id => recovery.operations.some(op =>
        op.originalQueryId === id && op.completed && op.scopeAuditVersion === 1
          && !hasRosterTeachCorrectableContinuationV1(op)))) {
        return projectSession(session);
      }
      if (recovery.selection && !recovery.selection.completed
        && hashStarcraftTmgContract(recovery.selection.queryIds) !== hashStarcraftTmgContract(ids)) {
        wsFail("ROSTER_WORKSPACE_TEACH_QUERY_RECOVERY_UNAVAILABLE", "resume_pending_query_selection_first", 409);
      }
      recovery.selection ||= { queryIds: clone(ids), at: now(),
        concreteFix: "focused_model_owned_query_correction_v1", completed: false };
      if (recovery.selection.completed) recovery.selection = { queryIds: clone(ids), at: now(),
        concreteFix: "focused_model_owned_query_correction_v1", completed: false };
      recovery.selection.reexecuteSavedQuery = request.reexecuteSavedQuery === true;
    }
    if (request.startFactProbeForQuestionIds !== undefined) {
      if (previous?.planHash !== plan.planHash || previous.status !== 'completed') {
        wsFail('ROSTER_WORKSPACE_FACT_PROBE_UNAVAILABLE', 'completed_same_plan_required', 409);
      }
      beginRosterTeachFactProbeV1(previous.state, request.startFactProbeForQuestionIds);
    }
    if (request.factProbeExecutionMode === 'product_evidence_led' && previous?.planHash === plan.planHash) {
      configureRosterTeachProductInvestigationV1(previous.state);
    }
    const productiveContinuationPending = previous?.state.investigation?.productContinuationPolicy
      && rosterTeachInvestigationWindowV1(previous.state).unconsumedToolResult;
    if (request.resumeDependentQueriesForQuestionIds !== undefined) {
      if (previous?.planHash !== plan.planHash || previous.status !== 'completed') {
        wsFail('ROSTER_WORKSPACE_TEACH_DEPENDENCY_CONTINUATION_UNAVAILABLE', 'completed_same_plan_required', 409);
      }
      resumeRosterTeachDependentQueriesV1(previous.state, request.resumeDependentQueriesForQuestionIds,
        { refreshToolCatalog: request.refreshTeachToolCatalog === true });
    }
    if (request.refreshQueryCapabilitiesForQuestionIds !== undefined) {
      if (previous?.planHash !== plan.planHash || previous.status !== 'completed') {
        wsFail('ROSTER_WORKSPACE_TEACH_CAPABILITY_REFRESH_UNAVAILABLE', 'completed_same_plan_required', 409);
      }
      resumeRosterTeachCapabilityDiscoveryV1(previous.state, request.refreshQueryCapabilitiesForQuestionIds);
    }
    if (request.authorizeInvestigationSupplement === true) {
      if (previous?.planHash !== plan.planHash || !previous.state.investigation?.completed
        || previous.state.investigation.supplement) {
        wsFail("ROSTER_WORKSPACE_TEACH_SUPPLEMENT_UNAVAILABLE", "exactly_one_after_completed_cycle", 409);
      }
      previous.state.investigation.supplement = {
        startRound: previous.state.investigation.rounds.length,
        concreteFix: "authorized_single_investigation_supplement", at: now(),
        questionIds: (previous.state.synthesis?.answers || [])
          .filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId),
      };
      previous.state.investigation.completed = false;
      previous.policyVersion = ROSTER_TEACH_FRAMEWORK_VERSION;
    }
    if (request.resumeInvestigationAfterProgressFix === true) {
      const investigation = previous?.state?.investigation;
      const questionIds = (previous?.state?.synthesis?.answers || [])
        .filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId);
      if (previous?.planHash !== plan.planHash || previous.status !== 'completed'
        || !investigation?.completed || !investigation.supplement
        || investigation.supplement.progressContinuation || !questionIds.length) {
        wsFail('ROSTER_WORKSPACE_TEACH_SUPPLEMENT_UNAVAILABLE', 'one_confirmed_progress_fix_continuation_required', 409);
      }
      let provenFailure = null;
      try { validateRosterTeachInvestigationProgressV1(investigation.rounds.at(-1).output,
        previous.state, questionIds); }
      catch (error) {
        if (!['ROSTER_TEACH_INVESTIGATION_OUTSIDE_PENDING', 'ROSTER_TEACH_INVESTIGATION_UNCHANGED_QUERY']
          .includes(error.code)) throw error;
        provenFailure = error.code;
      }
      if (!provenFailure) wsFail('ROSTER_WORKSPACE_TEACH_SUPPLEMENT_UNAVAILABLE', 'saved_batch_has_no_proven_progress_bug', 409);
      investigation.supplement.progressContinuation = { version: 1,
        startRound: investigation.rounds.length, concreteFix: 'pending_question_progress_v178',
        provenFailure, at: now(), historyReset: false, standingConcreteFixAuthorization: true };
      investigation.supplement.questionIds = questionIds;
      investigation.completed = false;
    }
    if (previous?.planHash === plan.planHash && previous.status === "completed"
      && !revisionWorkOrderOnly
      && !productiveContinuationPending
      && !isRosterTeachSynthesisReviewPendingV1(previous.state)
      && previous.state.investigation?.completed === true
      && !(previous.state.queryRecovery?.selection?.reexecuteSavedQuery
        && !previous.state.queryRecovery.selection.completed)
      && !previous.state.queryRecovery?.selection?.queryIds.some(id =>
        !previous.state.queryRecovery.operations.some(op => op.originalQueryId === id
          && op.completed && op.scopeAuditVersion === 1
          && !hasRosterTeachCorrectableContinuationV1(op)))) {
      if (previous.state.evidenceBindingVersion !== ROSTER_TEACH_EVIDENCE_BINDING_VERSION) {
        if (!previous.state.synthesisRaw) {
          const contextHash = previous.state.calls.findLast(c => c.kind === 'teach_framework_synthesis')?.contextHash;
          const saved = session.publicOutputs.findLast(o => o.roundKind === 'teach_framework_synthesis'
            && o.contextHash === contextHash)?.sanitizedOutput;
          if (saved) {
            const { schemaVersion, roundKind, ...synthesis } = saved;
            previous.state.synthesisRaw = clone(synthesis);
          }
        }
        const binding = deriveRosterTeachSavedEvidenceBindingV1(previous.state, previous.context);
        if (binding.refreshed) {
          previous.state.evidenceBindingHistory ||= [];
          previous.state.evidenceBindingHistory.push({ synthesis: previous.state.synthesis,
            coverage: previous.state.coverage, ...binding.derivation });
          previous.state.synthesis = binding.synthesis;
          previous.state.coverage = binding.coverage;
          previous.state.evidenceBindingVersion = binding.evidenceBindingVersion;
          await persist(session);
        }
      }
      return projectSession(session);
    }
    // Resume the exact interrupted Teach request through the same bounded
    // dispatch protocol as review; never clear it or reset the paid ledger.
    let retryDispatch = request.authorizeOneAdditionalDispatchRetry === true
      ? await prepareExplicitTerminalDispatchRetry(session, plan, request, 'teach_framework') : null;
    const unresolved = !retryDispatch && (session.providerDispatches || []).find(d =>
      String(d.roundKind || "").startsWith("teach_framework_")
      && d.planHash === plan.planHash && ["ambiguous", "reserved", "sent", "sending"].includes(d.status)
      && !(session.publicOutputs || []).some(o => o.contextHash === d.contextHash));
    if (unresolved) {
      // Ordinary product Run preserves the same bounded consent across a
      // process restart. It does not require a UI to reconstruct opaque IDs.
      // Only a terminated, recognised network failure may use this lane;
      // reconciliation still rejects consumed consent and retry descendants.
      const recoveryRequest = session.providerNetworkRecovery?.standingConsent === true
        && !unresolved.retryOfRequestId && !unresolved.retryOfNotSentRequestId
        && previous?.failure?.code === 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP'
        && isRecoverableProviderNetworkFailureV1(unresolved.transportFailure)
        ? { ...request, resumeAfterNetworkInterrupt:true, expectedRequestId:unresolved.requestId }
        : request;
      const recovery = reconcileStarcraftTmgProviderDispatchV1({
        dispatchRecord: unresolved, retainedOutputs: session.publicOutputs || [],
        processInterrupted: previous?.status === "failed" && [
          "ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART", "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP",
          "ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED",
        ].includes(previous.failure?.code),
        retryAuthorizations: session.dispatchRetryAuthorizations || [],
        resumeAuthorization: recoveryRequest.resumeAfterNetworkInterrupt === true
          && recoveryRequest.expectedRequestId === unresolved.requestId ? {
            requestId: unresolved.requestId, contextHash: unresolved.contextHash,
            requestBodyHash: unresolved.requestBodyHash, standingNetworkResumeConsent: true,
          } : null,
      });
      session.dispatchReconciliations ||= [];
      session.dispatchReconciliations.push({ planHash: plan.planHash,
        runKind: "teach_framework", recovery: clone(recovery), at: now() });
      retryDispatch = await prepareInterruptedDispatchRetry(session, unresolved, recovery, recoveryRequest,
        "ROSTER_WORKSPACE_TEACH_AMBIGUOUS_DISPATCH_REQUIRES_RECONCILIATION");
    }
    if (!deliberationFactory) wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE", "no_live_factory", 503);
    const failedFrameworkOutput = [...(session.failedProviderOutputs || [])].reverse()
      .find(o => String(o.roundKind).startsWith("teach_framework_"));
    const recoveredFrameworkOutput = failedFrameworkOutput
      ? recoverRosterFailedProviderOutputV1(failedFrameworkOutput) : null;
    if (recoveredFrameworkOutput && !session.publicOutputs.some(o =>
      o.contextHash === recoveredFrameworkOutput.contextHash
        && o.outputHash === recoveredFrameworkOutput.outputHash)) {
      session.publicOutputs.push(recoveredFrameworkOutput);
    }
    if (previous && previous.planHash !== plan.planHash) {
      session.teachFrameworkHistory ||= [];
      session.teachFrameworkHistory.push(clone(previous));
    }
    session.teachFramework = previous?.planHash === plan.planHash ? previous : {
      policyVersion: ROSTER_TEACH_FRAMEWORK_VERSION, planHash: plan.planHash,
      state: previous?.state?.framework ? { framework: clone(previous.state.framework),
        ...(previous.context?.selectedCandidateInputHash
          === hashStarcraftTmgContract(session.selectedCandidateInput || session.working?.candidateInput
            || session.lockedRoster?.lock?.candidateInput)
          && ['normalizedDatasetHash', 'mapTopologyHash', 'missionRecordKey', 'deploymentRecordKey']
            .every(key => previous.context?.fixture?.[key] === fixture[key]) ? {
          reusableQuestionEvidence: { sourcePlanHash: previous.planHash,
            questions: clone(previous.state.agenda?.questions || []),
            evidence: clone(previous.state.evidence || []) } } : {}) } : {},
    };
    if (request.frameworkFromSessionId && !session.teachFramework.state.framework) {
      const sourceJob = requireSession(request.frameworkFromSessionId).teachFramework;
      if (sourceJob?.status !== "completed" || !sourceJob.state?.framework) {
        wsFail("ROSTER_WORKSPACE_TEACH_FRAMEWORK_UNAVAILABLE", "completed_source_session_required", 409);
      }
      // This learned version can contain mission/opponent-specific examples.
      // Equal A/B methodology is intentional; reuse on a different game
      // context needs an explicit framework rebase, not silent generalisation.
      const sourceSession = requireSession(request.frameworkFromSessionId);
      if (["factionRecordKey", "opponentFactionRecordKey", "engagementScale"]
        .some(key => sourceSession.setup[key] !== session.setup[key])
        || ["missionRecordKey", "deploymentRecordKey", "mapTopologyHash",
          "normalizedDatasetHash"].some(key => sourceJob.context?.fixture?.[key] !== fixture[key])) {
        wsFail("ROSTER_WORKSPACE_TEACH_FRAMEWORK_REBASE_REQUIRED", "different_frozen_game_context", 409);
      }
      session.teachFramework.state.framework = clone(sourceJob.state.framework);
      session.teachFramework.frameworkSourceSessionId = request.frameworkFromSessionId;
    }
    if (retainedQueryContinuation) {
      session.teachFramework.retainedQueryContinuation = retainedQueryContinuation;
      if (session.teachFramework.appliedToPlanHash) {
        session.teachFramework.previousApplications ||= [];
        session.teachFramework.previousApplications.push({
          planHash: session.teachFramework.appliedToPlanHash,
          invalidatedByQueryContinuationAt: retainedQueryContinuation.at });
        delete session.teachFramework.appliedToPlanHash;
      }
    }
    // A failed final file commit is not failed Teach reasoning. Re-publish the
    // already checkpointed result only for its exact Plan/context and an
    // ordinary resume; explicit new inquiry operations still run normally.
    const pendingTeachCommit = session.teachFramework.pendingCompletionCommit;
    const resumeCompletedTeach = pendingTeachCommit?.planHash === plan.planHash
      && pendingTeachCommit.sourceHash === session.teachFramework.state.sourceHash
      && session.teachFramework.state.phase === 'completed'
      && session.teachFramework.context
      && session.teachFramework.state.sourceHash === hashStarcraftTmgContract({
        context: session.teachFramework.context, plan })
      && Object.keys(request).every(key => ['expectedPlanHash', 'automaticNetworkRecovery'].includes(key));
    session.teachFramework.status = "running";
    session.teachFramework.failure = null;
    session.cancelRequested = false;
    session.pauseRequested = false;
    session.progress = { phase: "running", rounds: [], activeRoundKind: null };
    const runId = randomUUID();
    activeRun = { sessionId, runId, runKind: "teach_framework" };
    await persist(session);
    void (async () => {
      try {
        // Return HTTP 202 before the synchronous candidate scene compiler.
        await new Promise(resolve => setImmediate(resolve));
        if (!resumeCompletedTeach) {
        const collected = { toolReceipts: [] };
        let laboratory = null;
        let context;
        if (revisionWorkOrderOnly) {
          if (!session.teachFramework.context) wsFail('ROSTER_WORKSPACE_TEACH_WORK_ORDER_CONTEXT_MISSING');
          context=clone(session.teachFramework.context);
        } else {
        laboratory = input.createRunLaboratory(collected, { setup: clone(session.setup),
          candidateInput: clone(session.selectedCandidateInput || session.working?.candidateInput
            || session.lockedRoster?.lock?.candidateInput) });
        const strategist = input.createStrategist({ laboratory });
        const route = strategist.selectSkillRoute({ ownFactionRecordKey: session.setup.factionRecordKey,
          opponentFactionRecordKey: session.setup.opponentFactionRecordKey });
        const packet = buildRosterReviewFactPacketV1({ plan, toolReceipts: session.toolReceipts,
          teachState: withRosterTeachPlanHistoryV1(plan, session.teachFramework?.state || null, session.teachFrameworkHistory),
          armyAudit: session.working?.verdict?.audit || session.lockedRoster?.lock?.verdict?.audit,
          selectionUnitRules: input.selectionUnitRules || [],
          selectionSupportRules: input.selectionSupportRules || [],
          selectionJustificationPolicyVersion: "unit_role_comparison_v1",
          selectedCandidateInputHash: hashStarcraftTmgContract(session.selectedCandidateInput
            || session.working?.candidateInput || session.lockedRoster?.lock?.candidateInput) });
        const freshContext = {
          evidencePolicy: clone(ROSTER_PLANNING_EVIDENCE_POLICY_V1),
          selectedCandidateInputHash: hashStarcraftTmgContract(session.selectedCandidateInput
            || session.working?.candidateInput || session.lockedRoster?.lock?.candidateInput),
          ...(previous?.planHash !== plan.planHash && previous?.state?.agenda ? {
            previousInquiry: { planHash: previous.planHash, agenda: clone(previous.state.agenda),
              issueLedger: rosterTeachIssueLedgerV1(previous), synthesis: clone(previous.state.synthesis || null),
              instruction: 'Retain question IDs and exact questions whose claims and assumptions are unchanged. New or affected claims need new investigation. Historical evidence keeps its original scope; an old unknown remains unknown.' } } : {}),
          rosterEditAuthority: session.agentSelectedStrategySource
            ? "agent_may_reselect_after_evidence" : "preset_immutable",
          equalPlanScrutinyForPresetAndAgentSelected: true,
          setup: clone(session.setup), fixture: clone(fixture),
          sourceFacts: packet.sourceFacts, arithmetic: packet.arithmetic,
          skillGuidance: route.projections, skillRefs: route.skillRefs,
          mission: laboratory.missionScoringAuthority(),
          queryContext: laboratory.describeQueryContext({ base: { kind: "source" } }),
          existingEvidence: clone([...session.toolReceipts,
            ...(session.selectionEvidence?.queries || []).map(row => row.receipt)]),
          generationQueryOutcomes: clone((session.planningTrace || [])
            .flatMap(round => round.informationNeedOutcomes || [])),
          ...(session.selectionEvidence ? {
            selectionEvidence: projectIterativeRosterEvidenceV1(session.selectionEvidence),
          } : {}),
        };
        context = prepareRosterTeachContextV1({framework:session.teachFramework,
          plan, freshContext, review:session.planReview, providerDispatches:session.providerDispatches});
        session.teachFramework.context = clone(context);
        await persist(session);
        }
        const onEvent = async event => { recordRoundEvent(session, event); await persist(session); };
        const livePort = await deliberationFactory.createForRun({ sessionId,
          runKind: "teach-framework", planHash: plan.planHash,
          retryDispatch, control: { cancelled: () => session.cancelRequested === true,
            paused: () => session.pauseRequested === true }, onEvent,
          recoverNetworkDispatch: request.authorizeOneAdditionalDispatchRetry === true
            ? null : networkDispatchRecovery(session, plan.planHash) });
        const deliberation = createRetainedReplayDeliberationPortV1({ livePort, onEvent,
          retainedOutputs: (session.publicOutputs || []).filter(o =>
            String(o.roundKind).startsWith("teach_framework_")), requireContextBoundReplay: true,
          modelVersion: session.deliberationDescriptor?.modelVersion || "retained-replay" });
        await runRosterTeachFrameworkSessionV1({ sessionId, plan, context, laboratory, deliberation,
          revisionWorkOrderOnly,
          currentSourceReview: projectRosterTeachSourceReviewV1({plan,review:session.planReview}),
          retainedScenarios: clone(session.selectionEvidence?.scenarios || []),
          selectedCandidateInput: clone(session.selectedCandidateInput || session.working?.candidateInput
            || session.lockedRoster?.lock?.candidateInput),
          state: session.teachFramework.state,
          historicalEvidence: createRosterTeachHistoryEvidenceV1({ ...session.teachFramework, context }, session.teachFrameworkHistory),
          retainedDispatches: session.providerDispatches || [],
          retainedPublicOutputs: (session.publicOutputs || []).filter(o =>
            String(o.roundKind).startsWith("teach_framework_")),
          retainedIncompleteQueryOutputs: (session.failedProviderOutputs || [])
            .filter(o => o.providerStatus === 'incomplete' && o.providerIncompleteReason === 'max_output_tokens')
            .map(o => ({ roundKind: o.roundKind, contextHash: o.contextHash,
              providerStatus: o.providerStatus, providerIncompleteReason: o.providerIncompleteReason,
              rawTextHash: o.rawTextHash })),
          onCheckpoint: async state => {
            session.teachFramework.state = state;
            // Full results (not just refs) remain available to plan review,
            // human exports and later WikiSkill/EvoTest-style review.
            for (const receipt of collected.toolReceipts) {
              if (!session.toolReceipts.some(r => r.receiptHash === receipt.receiptHash)) {
                session.toolReceipts.push(clone(receipt));
              }
            }
            await persist(session);
          } });
        }
        const next = { ...session,
          teachFramework: { ...session.teachFramework, status: 'completed', failure: null,
            revisionWorkOrderRequested: false,
            pendingCompletionCommit: null },
          progress: { ...session.progress, phase: 'completed', activeRoundKind: null } };
        await commitWorkspaceTransition(session, next, 'teach_framework_completion_commit');
      } catch (error) {
        const paused = errorCode(error) === 'ROSTER_WORKSPACE_PAUSED';
        session.teachFramework.status = paused ? 'paused' : 'failed';
        session.teachFramework.failure = paused ? null : { code: errorCode(error),
          detail: String(error.message || "").slice(0, 300), at: now() };
        if (errorCode(error) === 'ROSTER_WORKSPACE_PERSISTENCE_FAILED'
          && session.teachFramework.state.phase === 'completed') {
          session.teachFramework.pendingCompletionCommit = {
            planHash: plan.planHash, sourceHash: session.teachFramework.state.sourceHash };
        }
        session.progress = { ...session.progress, phase: session.teachFramework.status,
          activeRoundKind: null };
        await persistFailureState(session, session.teachFramework);
      } finally {
        if (activeRun?.runId === runId) activeRun = null;
      }
    })();
    return projectSession(session);
  }

  async function revisePlan(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    if (!["planned", "failed", "cancelled"].includes(session.status)
      || !session.planSerialized) {
      wsFail("ROSTER_WORKSPACE_NOT_PLANNED", sessionId, 409);
    }
    const reasonText = nonEmpty(request.reasonText,
      "ROSTER_WORKSPACE_REVISION_INVALID");
    const revisionPurpose = request.revisionPurpose || "reviewed_claim_repair_v1";
    if (!["reviewed_claim_repair_v1", "user_requested_claim_revision_v1", "teach_feedback_revision_v1"]
      .includes(revisionPurpose)) {
      wsFail("ROSTER_WORKSPACE_REVISION_INVALID", "revisionPurpose");
    }
    const triggerIds = Array.isArray(request.triggerIds)
      ? request.triggerIds.map((entry) => String(entry)) : [];
    const revisedSectionKeys = Array.isArray(request.revisedSectionKeys)
      ? request.revisedSectionKeys.map((entry) => String(entry)) : [];
    if (revisedSectionKeys.length === 0
      || revisedSectionKeys.some((key) => (
        !ROSTER_WORKSPACE_REVISABLE_SECTION_KEYS.includes(key)))) {
      wsFail("ROSTER_WORKSPACE_REVISION_INVALID", "revisedSectionKeys");
    }
    const plan = parseWorkspacePlan(session.planSerialized);
    const presetRevision = plan.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA;
    const agentScheduledRevision =
      plan.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA;
    // An explicitly recovered older Teach remains about its original Plan.
    // Reuse its evidence for the current target only under the SAME frozen
    // dependency check as query continuation; never relabel or silently drop it.
    const previousTeach = session.teachFramework;
    if (request.sourceTeachPlanHash !== undefined) {
      if (previousTeach?.status !== "completed") {
        wsFail("ROSTER_WORKSPACE_RETAINED_TEACH_INCOMPLETE", "completed_saved_teach_required", 409);
      }
      requireRetainedTeachSourcePlan(session, plan, request.sourceTeachPlanHash);
    }
    const revisionTeachState = previousTeach?.status === "completed"
      && (previousTeach.planHash === plan.planHash || request.sourceTeachPlanHash !== undefined)
      ? withRosterTeachPlanHistoryV1(plan, previousTeach.state, session.teachFrameworkHistory) : null;
    if (revisionPurpose === 'teach_feedback_revision_v1'
      && (!revisionTeachState?.investigation?.completed
        || previousTeach.planHash !== plan.planHash
        || !revisionTeachState.synthesis?.answers?.some(a => a.disposition === 'revise'))) {
      wsFail('ROSTER_WORKSPACE_REVISION_INVALID', 'completed_current_teach_revision_required', 409);
    }
    const teachFrameworkSourceBinding = revisionTeachState ? {
      sourceTeachPlanHash: previousTeach.planHash, targetPlanHash: plan.planHash,
      retainedSource: previousTeach.planHash !== plan.planHash,
      frozenDependenciesUnchanged: true, originalQuestionAndContextPreserved: true,
      semanticApplicationStillRequiresReview: true, trainingTruth: false,
    } : null;
    const retainedClaimFindings = collectRosterClaimRepairBacklogV1({ ...session,
      plan, planVersionHistory: (session.planVersionHistory || []).map(parseWorkspacePlan) })
      .filter(entry => entry.status === "repair_required" && entry.finding.severity === "high");
    let targetedClaimPaths = (presetRevision || agentScheduledRevision)
      && retainedClaimFindings.length > 0
      ? [...new Set([...(request.targetedClaimPaths || []),
        ...retainedClaimFindings.map(entry => entry.claimPath),
        ...(request.targetedClaimPaths === undefined ? ["publicSummaryText"] : [])])]
      : request.targetedClaimPaths;
    if (revisionPurpose === 'reviewed_claim_repair_v1' && targetedClaimPaths?.length) {
      targetedClaimPaths = rosterRelatedRepairClaimPathsV1(plan, targetedClaimPaths);
    }
    for (const claimPath of targetedClaimPaths || []) {
      const section = claimPath.split(".")[0];
      if (!revisedSectionKeys.includes(section)) revisedSectionKeys.push(section);
    }
    let missionProfile = null;
    if (presetRevision) {
      if (!session.lockedRoster
        || (plan.revisions.length > 0
          && !plan.openingDeploymentSchedule)
        || !revisedSectionKeys.includes("deploymentConcept")
        || session.lockedRoster.baselinePlan.planHash
          !== plan.presetBinding.baselinePlanHash
        || session.lockedRoster.lock.verdict.auditResultHash
          !== plan.presetBinding.armyAuditResultHash) {
        wsFail("ROSTER_WORKSPACE_LOCKED_PLAN_REVISION_INVALID",
          "revision_requires_same_locked_list_and_schedule", 409);
      }
    }
    if (presetRevision || agentScheduledRevision) {
      const authority = laboratoryCore.missionScoringAuthority();
      missionProfile = authority.resultStatus === "derivable"
        ? authority.missionScoringProfile : null;
      if (!missionProfile) {
        wsFail("ROSTER_WORKSPACE_ROUND_SUPPLY_AUTHORITY_UNAVAILABLE",
          "frozen_mission_profile_required", 409);
      }
    }
    if (agentScheduledRevision && (session.working?.verdict?.status
        !== "legal"
      || session.working.verdict.audit?.resultHash
        !== plan.openingDeploymentSchedule?.armyAuditResultHash
      || missionProfile.missionScoringProfileHash
        !== plan.openingDeploymentSchedule?.missionScoringProfileHash
      || !revisedSectionKeys.includes("deploymentConcept"))) {
      wsFail("ROSTER_WORKSPACE_AGENT_SCHEDULED_REVISION_INVALID",
        "revision_requires_same_rules_audited_list_and_schedule", 409);
    }
    if (planEvidenceStale(session, plan)) {
      wsFail("ROSTER_WORKSPACE_REPLAN_REQUIRED_AFTER_ROSTER_EDIT",
        "prose_only_revision_cannot_rebind_changed_roster", 409);
    }
    let retainedRevision = request.fresh !== true
      ? (session.publicOutputs || []).filter((entry) => (
        entry.roundKind === "revision"
          && Number(entry.roundIndex) === plan.planVersion + 1
          && object(entry.sanitizedOutput))) : [];
    // New revisions use typed tools. An interrupted paid legacy revision keeps
    // its original protocol/context; its saved replies are not rewritten.
    const retainedToolRevision = retainedRevision.find(entry => Array.isArray(entry.sanitizedOutput.toolCalls));
    const planEditProtocol = request.planEditProtocol || (retainedRevision.length
      ? retainedToolRevision
        ? retainedToolRevision.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.v3.')
          ? STRUCTURED_PLAN_TOOLS_PROTOCOL_V3
          : retainedToolRevision.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.v2.')
          ? STRUCTURED_PLAN_TOOLS_PROTOCOL_V2 : STRUCTURED_PLAN_TOOLS_PROTOCOL_V1
        : 'legacy_claim_text_v1'
      : STRUCTURED_PLAN_TOOLS_PROTOCOL_V3);
    if (![STRUCTURED_PLAN_TOOLS_PROTOCOL_V1, STRUCTURED_PLAN_TOOLS_PROTOCOL_V2, STRUCTURED_PLAN_TOOLS_PROTOCOL_V3, 'legacy_claim_text_v1'].includes(planEditProtocol)) {
      wsFail('ROSTER_WORKSPACE_REVISION_INVALID', 'planEditProtocol');
    }
    retainedRevision = retainedRevision.filter(entry => planEditProtocol === 'legacy_claim_text_v1'
      ? !Array.isArray(entry.sanitizedOutput.toolCalls)
      : Array.isArray(entry.sanitizedOutput.toolCalls)
        && (entry.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.v3.')
          ? planEditProtocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V3
          : entry.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.v2.')
          ? planEditProtocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V2
          : planEditProtocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V1));
    const retryDispatch = request.authorizeOneAdditionalDispatchRetry === true
      ? await prepareExplicitTerminalDispatchRetry(session, plan, request, 'revision') : null;
    if (retainedRevision.length === 0 && !deliberationFactory) {
      wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
        "no_live_deliberation_factory_attached", 503);
    }
    for (const triggerId of triggerIds) {
      if (!plan.invalidationTriggers.some((entry) => (
        entry.triggerId === triggerId))) {
        wsFail("ROSTER_WORKSPACE_REVISION_INVALID",
          `trigger_unknown:${triggerId}`);
      }
    }
    session.status = "running";
    session.progress = { phase: "running", rounds: [], activeRoundKind: null };
    session.failure = null;
    session.cancelRequested = false;
    await persist(session);
    const runId = randomUUID();
    activeRun = { sessionId: session.sessionId, runId };
    const finish = async (error) => {
      if (error) {
        const code = errorCode(error);
        session.status = code === "ROSTER_WORKSPACE_CANCELLED"
          ? "cancelled" : "failed";
        session.progress.phase = session.status;
        session.progress.activeRoundKind = null;
        session.failure = {
          code,
          detail: String(error?.message || "").slice(0, 300),
          safeStatus: error?.safeStatus ?? null,
          at: now(),
          automaticRetry: false,
        };
      }
      try { await persist(session); }
      catch (storageError) {
        session.status = 'failed'; session.progress.phase = 'failed';
        session.failure = { code: 'ROSTER_WORKSPACE_PERSISTENCE_FAILED',
          detail: String(storageError.code || storageError.message), at: now(),
          automaticRetry: false, retainedRepliesRemainAvailable: true };
      } finally {
        if (activeRun?.runId === runId) activeRun = null;
      }
    };
    void (async () => {
      try {
        const laboratory = input.createRunLaboratory({ toolReceipts: [] }, {
          setup: clone(session.setup),
          candidateInput: clone(session.lockedRoster?.lock?.candidateInput
            || session.selectedCandidateInput || session.working?.candidateInput),
        });
        const strategist = input.createStrategist({ laboratory });
        const control = { cancelled: () => session.cancelRequested === true };
        const onEvent = async (event) => {
          recordRoundEvent(session, event);
          if (event.type !== "round_started" || event.replayed) {
            if (event.type === "provider_dispatch" || event.type === "round_completed") {
              await persist(session);
            } else await persist(session).catch(() => {});
          }
        };
        // A revision may read retained evidence before its final reply. Reuse
        // every exact-context paid turn after interruption, then ask only for
        // the missing remainder. Keeping just the last query loses the prefix.
        const livePort = deliberationFactory ? await deliberationFactory.createForRun({
          sessionId: session.sessionId, runKind: "revision", control,
          planHash: plan.planHash, onEvent, retryDispatch,
          recoverNetworkDispatch: request.authorizeOneAdditionalDispatchRetry === true
            ? null : networkDispatchRecovery(session, plan.planHash) }) : null;
        const retainedIncompleteEdits = (session.failedProviderOutputs || []).filter(record =>
          record.roundKind === 'revision' && record.roundIndex === plan.planVersion + 1
          && session.providerDispatches?.some(d => d.contextHash === record.contextHash
            && d.planHash === plan.planHash && d.status === 'response_received'));
        const replayPort = retainedRevision.length > 0
          ? createRetainedReplayDeliberationPortV1({
            retainedOutputs: retainedRevision, onEvent, livePort,
            requireContextBoundReplay: true,
            modelVersion: session.deliberationDescriptor?.modelVersion
              || "retained-replay" })
          : livePort;
        const deliberation = createRosterPlanEditRecoveryPortV1({port:replayPort,
          retainedIncompleteOutputs:retainedIncompleteEdits});
        // Freeze the same advisory Skill bodies at the edit boundary. Replaying
        // an older paid/sent revision must retain its exact original prompt;
        // only a genuinely new revision acquires this new input contract.
        let revisionStrategyGuidance = (session.revisionStrategyGuidanceSnapshots || [])
          .findLast(s => s.sourcePlanHash === plan.planHash && s.targetPlanVersion === plan.planVersion + 1);
        const oldRevisionDispatch = (session.providerDispatches || []).some(d => d.roundKind === 'revision'
          && d.planHash === plan.planHash);
        if (!revisionStrategyGuidance && !retainedRevision.length && !oldRevisionDispatch) {
          const frozenContext = previousTeach?.context;
          const sameFactions = frozenContext?.skillGuidance
            && frozenContext.setup?.factionRecordKey === session.setup.factionRecordKey
            && frozenContext.setup?.opponentFactionRecordKey === session.setup.opponentFactionRecordKey;
          const route = sameFactions ? {projections:frozenContext.skillGuidance,skillRefs:frozenContext.skillRefs}
            : strategist.selectSkillRoute({ownFactionRecordKey:session.setup.factionRecordKey,
              opponentFactionRecordKey:session.setup.opponentFactionRecordKey});
          revisionStrategyGuidance = {version:1,sourcePlanHash:plan.planHash,targetPlanVersion:plan.planVersion+1,
            projections:clone(route.projections),skillRefs:clone(route.skillRefs),
            skillsAdvisoryOnlyCannotAffectRules:true};
          (session.revisionStrategyGuidanceSnapshots ||= []).push(revisionStrategyGuidance);
          await persist(session); // Exact bodies survive interruption before dispatch.
        }
        const result = await strategist.reviseRosterPlan({
          plan,
          planEditProtocol,
          ...(planEditProtocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V3 ? {
            interruptedPlanEdits:retainedIncompleteEdits.filter(record =>
              !record.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.v3.'))} : {}),
          ...(revisionStrategyGuidance ? {revisionStrategyGuidance:clone(revisionStrategyGuidance)} : {}),
          ...(revisionTeachState ? {
              teachFrameworkExperience: clone(revisionTeachState),
              teachFrameworkSourceBinding: clone(teachFrameworkSourceBinding),
            } : {}),
          selectionJustificationPolicyVersion: session.agentSelectedStrategySource
            ?.selectionJustificationPolicyVersion || null,
          reasonText,
          revisionPurpose,
          triggerIds,
          revisedSectionKeys,
          ...(targetedClaimPaths !== undefined ? {
            targetedClaimPaths,
            retainedClaimFindings,
          } : {}),
          ...(presetRevision || agentScheduledRevision ? {
            ...(presetRevision ? {
              baselinePlan: session.lockedRoster.baselinePlan,
            } : {}),
            armyAudit: presetRevision
              ? session.lockedRoster.lock.verdict.audit
              : session.working.verdict.audit,
            missionProfile,
            toolReceipts: session.toolReceipts,
            selectedCandidateInputHash: session.selectedCandidateInput
              ? hashStarcraftTmgContract(session.selectedCandidateInput)
              : null,
            ...(session.planReview?.status === "completed"
              && session.planReview.planHash === plan.planHash
              ? { finalPlanReview: session.planReview } : {}),
          } : {}),
        }, { deliberation });
        // Only changed collections are copied; do not clone the full retained
        // Teach archive. The live session remains on its last committed Plan.
        const next = { ...session,
          planVersionHistory: [...(session.planVersionHistory || []), session.planSerialized] };
        if (result.teachEvidenceDelivery) {
          next.revisionTeachEvidenceHistory = [...(session.revisionTeachEvidenceHistory || []), { fromPlanHash: plan.planHash,
            toPlanHash: result.plan.planHash, delivery: clone(result.teachEvidenceDelivery), at: now() }];
        }
        if (result.claimRepairCoverage) {
          next.claimRepairHistory = [...(session.claimRepairHistory || []), {
            fromPlanHash: plan.planHash, toPlanHash: result.plan.planHash,
            coverage: clone(result.claimRepairCoverage), at: now(),
          }];
        }
        if (result.outputShapeRecoveryReceipt) {
          next.revisionOutputShapeReceipts = [...(session.revisionOutputShapeReceipts || []),
            clone(result.outputShapeRecoveryReceipt)];
        }
        if (result.planEditToolExecution) {
          next.planEditToolHistory = [...(session.planEditToolHistory || []), { fromPlanHash: plan.planHash,
            toPlanHash: result.plan.planHash, execution: clone(result.planEditToolExecution), at: now() }];
        }
        next.planSerialized = serializeWorkspacePlan(result.plan);
        if (session.teachFramework?.status === "completed"
          && session.teachFramework.planHash === plan.planHash) {
          next.teachFramework = { ...session.teachFramework,
            state: { ...session.teachFramework.state, applicationStatus: 'evidence_delivered_to_revision_pending_review' },
            appliedToPlanHash: result.plan.planHash };
        }
        next.planEvidenceStale = !workingMatchesPlan(session, result.plan);
        next.status = 'planned';
        next.progress = { ...session.progress, phase: 'completed' };
        next.failure = null;
        await commitWorkspaceTransition(session, next);
        if (activeRun?.runId === runId) activeRun = null;
      } catch (error) {
        await finish(error);
      }
    })();
    return projectSession(session);
  }

  // ------------------------------------------------------------ override

  async function applyManualOverride(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (session.status !== "planned" || !session.planSerialized) {
      wsFail("ROSTER_WORKSPACE_NOT_PLANNED", sessionId, 409);
    }
    if (session.lockedRoster) {
      wsFail("ROSTER_WORKSPACE_LOCKED_ROSTER_IMMUTABLE",
        "create_a_new_workspace_session_for_a_different_roster", 409);
    }
    const candidateInput = request.candidateInput;
    if (!object(candidateInput)) {
      wsFail("ROSTER_WORKSPACE_OVERRIDE_INVALID", "candidateInput");
    }
    // Manual edits always go through the authoritative Builder port; the UI
    // verdict below is the Rules kernel's own audit, never a client guess.
    const verdict = armyBuilderPort.evaluateRosterCandidate(
      clone(candidateInput));
    const entry = {
      overrideId: `override-${session.working.overrideHistory.length + 1}`,
      at: now(),
      candidateHash: verdict.candidateHash,
      status: verdict.status,
      rulesErrorCode: verdict.rulesErrorCode || null,
      rejectionKind: verdict.rejectionKind || null,
      summary: summarizeVerdict(verdict),
    };
    session.working = {
      candidateInput: clone(candidateInput),
      verdict,
      overrideHistory: [...session.working.overrideHistory, entry],
    };
    // Text-only revision never rebinds the structured candidate. Only an
    // exact return to the plan's original Rules-audited list clears staleness;
    // an edited list needs a fresh locked-list Teach/deepening plan.
    session.planEvidenceStale = !workingMatchesPlan(session,
      parseWorkspacePlan(session.planSerialized));
    await persist(session);
    return projectSession(session);
  }

  // ------------------------------------------------------------ export/import

  function exportSession(sessionId) {
    const session = requireSession(sessionId);
    const plan = session.planSerialized
      ? JSON.parse(serializeWorkspacePlan(
        parseWorkspacePlan(session.planSerialized))) : null;
    const exportDocument = {
      schema: ROSTER_WORKSPACE_EXPORT_SCHEMA,
      exportId: `export-${randomUUID()}`,
      exportedAt: now(),
      setup: clone(session.setup),
      selectionJustification: projectCurrentRosterSelectionJustificationV1(
        plan, session.selectionJustification),
      planningMode: session.planningMode || "agent_legacy_v1",
      completionPolicyVersion: session.completionPolicyVersion
        || "legacy_floor_v1",
      mapEvidencePolicyVersion: session.mapEvidencePolicyVersion
        || "legacy_map_advisory_v1",
      sourcePlanHash: session.sourcePlanHash || null,
      lockedRosterBaselinePlanId: session.lockedRoster
        ? session.lockedRoster.baselinePlan.planId : null,
      lockedRosterBaselinePlanHash: session.lockedRoster
        ? session.lockedRoster.baselinePlan.planHash : null,
      lockedRosterPresetSource: session.lockedRoster
        ? session.lockedRoster.baselinePlan.presetBinding.presetSource : null,
      fixture: {
        sourceLockHash: fixture.sourceLockHash,
        sourceSnapshotHash: fixture.sourceSnapshotHash,
        normalizedDatasetHash: fixture.normalizedDatasetHash,
        officialRulesVersion: fixture.officialRulesVersion,
        officialUnitsVersion: fixture.officialUnitsVersion,
        officialCardsVersion: fixture.officialCardsVersion,
        missionRecordKey: fixture.missionRecordKey,
        deploymentRecordKey: fixture.deploymentRecordKey,
        mapTopologyHash: fixture.mapTopologyHash,
      },
      workingCandidateInput: session.working
        ? clone(session.working.candidateInput)
        : (session.selectedCandidateInput
          ? clone(session.selectedCandidateInput) : null),
      workingVerdictSummary: session.working
        ? summarizeVerdict(session.working.verdict) : null,
      plan,
      teachFramework: clone(session.teachFramework || null),
      presetJourney: clone(session.presetJourney || null),
      teachFrameworkHistory: clone(session.teachFrameworkHistory || []),
      usage: session.usage ? clone(session.usage) : null,
      deliberation: session.deliberationDescriptor
        ? {
          kind: session.deliberationDescriptor.kind,
          modelVersion: session.deliberationDescriptor.modelVersion,
        } : null,
      containsNoSecrets: true,
      credentialMaterialIncluded: false,
      trainingTruth: false,
    };
    const bytes = Buffer.byteLength(JSON.stringify(exportDocument), "utf8");
    if (bytes > MAX_EXPORT_BYTES) {
      wsFail("ROSTER_WORKSPACE_EXPORT_TOO_LARGE", String(bytes), 500);
    }
    return {
      exportDocument,
      exportHash: hashStarcraftTmgContract(exportDocument),
      exportBytes: bytes,
    };
  }

  function readPlanningExperience(sessionId) {
    const session = requireSession(sessionId);
    return {
      sessionId, status: session.status, setup: clone(session.setup),
      sourceStrategy: clone(session.agentSelectedStrategySource || null),
      presetJourney: clone(session.presetJourney || null),
      teachFramework: clone(session.teachFramework || null),
      teachFrameworkHistory: clone(session.teachFrameworkHistory || []),
      selectionJustification: projectCurrentRosterSelectionJustificationV1(
        session.planSerialized ? parseWorkspacePlan(session.planSerialized) : null,
        session.selectionJustification),
      publicRounds: clone(session.publicOutputs || []),
      planningTrace: clone(session.planningTrace || []),
      generationTeachCycle: clone(session.generationTeachCycle || null),
      progress: clone(session.progress),
      providerDispatches: clone(session.providerDispatches || []),
      dispatchReconciliations: clone(session.dispatchReconciliations || []),
      toolReceipts: clone(session.toolReceipts || []),
      skillRouteReceipt: clone(session.skillRouteReceipt || null),
      plan: session.planSerialized ? clone(parseWorkspacePlan(session.planSerialized)) : null,
      planVersions: (session.planVersionHistory || []).map(entry =>
        clone(parseWorkspacePlan(entry))),
      review: clone(session.planReview || null),
      reviewHistory: clone(session.planReviewHistory || []),
      claimRepairHistory: clone(session.claimRepairHistory || []),
      failure: clone(session.failure || null), usage: clone(session.usage || null),
      containsNoSecrets: true, hiddenChainOfThoughtStored: false, trainingTruth: false,
    };
  }

  async function importSession(request = {}) {
    const exportDocument = request.exportDocument;
    if (!object(exportDocument)
      || exportDocument.schema !== ROSTER_WORKSPACE_EXPORT_SCHEMA) {
      wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "schema");
    }
    assertNoSecretKeys(exportDocument);
    const setup = validateSetup(exportDocument.setup);
    const session = newSessionRecord(setup, createSessionId());
    const importedMode = String(exportDocument.planningMode ||
      "agent_legacy_v1");
    if (!["agent_legacy_v1", "agent_teach_v1",
      "locked_roster_teach_v1"].includes(importedMode)) {
      wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "planningMode");
    }
    session.planningMode = importedMode;
    const importedCompletionPolicy = String(
      exportDocument.completionPolicyVersion || "legacy_floor_v1");
    if (!["agent_exact_budget_or_draft_v1", "legacy_floor_v1",
      "locked_roster_preserved_v1"].includes(importedCompletionPolicy)) {
      wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "completionPolicyVersion");
    }
    session.completionPolicyVersion = importedCompletionPolicy;
    const importedMapPolicy = String(
      exportDocument.mapEvidencePolicyVersion || "legacy_map_advisory_v1");
    if (!["certified_route_or_draft_v1", "legacy_map_advisory_v1"]
      .includes(importedMapPolicy)) {
      wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "mapEvidencePolicyVersion");
    }
    session.mapEvidencePolicyVersion = importedMapPolicy;
    session.sourcePlanHash = exportDocument.sourcePlanHash || null;
    if (session.sourcePlanHash
      && !HASH_PATTERN.test(String(session.sourcePlanHash))) {
      wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "sourcePlanHash");
    }
    if (object(exportDocument.workingCandidateInput)) {
      const verdict = armyBuilderPort.evaluateRosterCandidate(
        clone(exportDocument.workingCandidateInput));
      session.working = {
        candidateInput: clone(exportDocument.workingCandidateInput),
        verdict,
        overrideHistory: [{
          overrideId: "override-import-1",
          at: now(),
          candidateHash: verdict.candidateHash,
          status: verdict.status,
          rulesErrorCode: verdict.rulesErrorCode || null,
          rejectionKind: verdict.rejectionKind || null,
          summary: summarizeVerdict(verdict),
          importedFrom: String(exportDocument.exportId || "unknown"),
        }],
      };
    }
    if (object(exportDocument.plan)) {
      // Round-trip through the frozen plan contract: a tampered or drifted
      // plan fails closed here instead of entering the workspace.
      const plan = parseWorkspacePlan(JSON.stringify(exportDocument.plan));
      verifyWorkspacePlanRoundTrip(plan);
      if (plan.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
        if (importedMode !== "locked_roster_teach_v1") {
          wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "lockedMode");
        }
        let lockedRoster;
        try {
          lockedRoster = createVerifiedBuilderLockedRosterForTeachV1({
            candidateInput: candidateInputFromCandidate(
              plan.rosterCandidate),
            armyBuilderPort,
            planId: plan.planId,
            presetSource: plan.presetBinding.presetSource,
          });
        } catch (error) {
          wsFail(errorCode(error, "ROSTER_WORKSPACE_IMPORT_RULES_DRIFT"),
            "locked_roster", 409);
        }
        if (lockedRoster.baselinePlan.planHash
          !== plan.presetBinding.baselinePlanHash) {
          wsFail("ROSTER_WORKSPACE_IMPORT_RULES_DRIFT",
            "baselinePlanHash", 409);
        }
        session.lockedRoster = clone(lockedRoster);
      } else if (importedMode === "locked_roster_teach_v1") {
        wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "planSchema");
      }
      session.planSerialized = serializeWorkspacePlan(plan);
      session.status = "planned";
      session.progress = { phase: "completed", rounds: [],
        activeRoundKind: null };
      session.selectedCandidateInput = candidateInputFromCandidate(
        plan.rosterCandidate);
      if (session.working) {
        session.planEvidenceStale = !workingMatchesPlan(session, plan);
      } else {
        session.working = {
          candidateInput: clone(session.selectedCandidateInput),
          verdict: armyBuilderPort.evaluateRosterCandidate(
            clone(session.selectedCandidateInput)),
          overrideHistory: [],
        };
        session.planEvidenceStale = false;
      }
    }
    if (!session.planSerialized && importedMode === "locked_roster_teach_v1") {
      if (!session.working?.candidateInput
        || !nonEmpty(exportDocument.lockedRosterBaselinePlanId,
          "ROSTER_WORKSPACE_IMPORT_INVALID")) {
        wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "lockedDraft");
      }
      let lockedRoster;
      try {
        lockedRoster = createVerifiedBuilderLockedRosterForTeachV1({
          candidateInput: clone(session.working.candidateInput),
          armyBuilderPort,
          planId: exportDocument.lockedRosterBaselinePlanId,
          presetSource: nonEmpty(exportDocument.lockedRosterPresetSource,
            "ROSTER_WORKSPACE_IMPORT_INVALID"),
        });
      } catch (error) {
        wsFail(errorCode(error, "ROSTER_WORKSPACE_IMPORT_RULES_DRIFT"),
          "lockedDraft", 409);
      }
      if (lockedRoster.baselinePlan.planHash
        !== exportDocument.lockedRosterBaselinePlanHash) {
        wsFail("ROSTER_WORKSPACE_IMPORT_RULES_DRIFT",
          "lockedBaselinePlanHash", 409);
      }
      session.lockedRoster = clone(lockedRoster);
    }
    await persist(session);
    sessions.set(session.sessionId, session);
    return projectSession(session);
  }

  // ------------------------------------------------------------ lifecycle

  async function loadPersisted() {
    const { sessions: loaded, quarantined } = await draftStore.loadAll();
    quarantinedDrafts = quarantined;
    for (const session of loaded) {
      if (session.presetJourney?.status === 'running') {
        session.presetJourney.status = 'interrupted';
        session.presetJourney.acceptedPlanHash = null;
        await persist(session);
      }
      if (session.teachFramework?.status === "running") {
        session.teachFramework.status = "failed";
        session.teachFramework.failure = { code: "ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART",
          at: now(), retainedStagesAvailable: true };
        await persist(session);
      }
      if (session.autoPlanRepair?.status === "running") {
        session.autoPlanRepair.status = "blocked";
        session.autoPlanRepair.failure = { code: "ROSTER_WORKSPACE_AUTO_REPAIR_INTERRUPTED",
          at: now(), automaticRetry: false };
        await persist(session).catch(() => {});
      }
      // A planning run interrupted by a process restart can never resume
      // in-flight: mark it failed-closed honestly; its retained replies still
      // allow an explicit replay resume.
      if (session.status === "running") {
        session.status = "failed";
        session.progress.phase = "failed";
        session.progress.activeRoundKind = null;
        session.failure = {
          code: "ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART",
          detail: "planning run interrupted by a server restart; retained "
            + "replies allow an explicit zero-cost replay resume",
          safeStatus: null,
          at: now(),
          automaticRetry: false,
        };
        await persist(session).catch(() => {});
      }
      if (session.planReview?.status === "running") {
        session.planReview.status = "failed";
        session.planReview.failure = {
          code: "ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART",
          detail: "retained public reply can be replayed on this plan",
          at: now(), automaticRetry: false,
        };
        await persist(session).catch(() => {});
      }
      sessions.set(session.sessionId, session);
    }
    return { loaded: sessions.size, quarantined: quarantined.length };
  }

  function descriptor() {
    return {
      schema: "starcraft_tmg_roster_planning_workspace_descriptor_v1",
      module: ROSTER_PLANNING_WORKSPACE_MODULE,
      version: ROSTER_PLANNING_WORKSPACE_VERSION,
      serviceId,
      rulesRemainSoleLegalityAuthority: true,
      builderPortReadOnly: true,
      sourceRoomMutationPossible: false,
      roomRuntimeInjected: false,
      credentialHandled: false,
      liveDeliberationOnlyViaInjectedFactory: true,
      automaticRetry: false,
      cancellationCheckedBeforeEverySend: true,
      retainedRepliesEnableLocalReplayResume: true,
      formalBudgetContractDisplayedAndEnforced:
        ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash,
      presetComparisonArmAvailable: presetArm !== null,
      hiddenChainOfThoughtRequested: false,
      hiddenChainOfThoughtPersisted: false,
      unknownStaysUnknown: true,
      teachFrameworkPolicy: ROSTER_TEACH_FRAMEWORK_VERSION,
      presetAndSelectedPlanTeachEquivalent: true,
      presetProductJourneyAvailable: true,
      laboratoryDescriptorHash:
        laboratoryCore.labDescriptor().descriptorHash,
      deliberation: deliberationAvailability(),
      trainingTruth: false,
    };
  }

  const presetJourney = createPresetRosterJourneyV1({
    service: { readSession, startPlanning, reviewFinalPlan,
      reconcileReviewFindings, teachPlanFramework, revisePlan },
    readState: id => clone(requireSession(id).presetJourney || null),
    saveState: async (id, state) => {
      const session = requireSession(id);
      session.presetJourney = clone(state);
      await persist(session);
    },
  });

  return Object.freeze({
    descriptor,
    validateSetup,
    loadPersisted,
    readCatalogue,
    readEnumeration,
    readBudgetBranches,
    createSession,
    createAgentSelectedTeachSession,
    attachAgentSelectedEvidence,
    promoteAgentSelectedTeachPlan,
    createPresetSession,
    createLockedReplanSession,
    listSessions,
    readSession,
    deleteSession,
    startPlanning,
    runPresetJourney: presetJourney.run,
    pausePlanning,
    cancelPlanning,
    revisePlan,
    teachPlanFramework,
    reviewFinalPlan,
    repairReviewedPlan,
    reconcileReviewFindings,
    reconcileProviderDispatch,
    applyManualOverride,
    exportSession,
    readPlanningExperience,
    importSession,
  });
}
