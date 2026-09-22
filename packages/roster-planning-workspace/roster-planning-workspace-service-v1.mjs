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
// automatic retry: cancellation before a send never sends, an uncertain or
// rejected dispatch stops the run with a typed failure, and retained
// completed replies allow a byte-identical local replay resume at zero
// additional Provider cost.

import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  parseRosterPlanV1,
  serializeRosterPlanV1,
  verifyRosterPlanRoundTripV1,
} from "../roster-strategist/roster-plan-contracts-v1.mjs";
import { ROSTER_STRATEGIST_PROMPT_PACK_V1 } from
  "../roster-strategist/roster-strategist-runtime-v1.mjs";
import { ROSTER_PLANNING_SESSION_SCHEMA } from
  "./roster-planning-draft-store-v1.mjs";

export const ROSTER_PLANNING_WORKSPACE_MODULE =
  "packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs";
export const ROSTER_PLANNING_WORKSPACE_VERSION = "1.0.0";
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
  "publicSummaryText",
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
  const modelVersion = nonEmpty(
    input.modelVersion || "retained-replay", "ROSTER_WORKSPACE_REPLAY_INVALID");
  const consumed = new Set();
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
      const entry = retainedOutputs.find((candidate, index) => (
        !consumed.has(index)
          && candidate.roundKind === request.roundKind
          && Number(candidate.roundIndex) === Number(request.roundIndex)
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
        wsFail("ROSTER_WORKSPACE_RESUME_OUTPUT_MISSING",
          `${request.roundKind}#${request.roundIndex}`, 409);
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

  function candidateInputFromCandidate(candidate) {
    // Re-derive the Builder candidate input shape from the public
    // RosterCandidate contract (manual override starts from this).
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
        upgrades: unit.upgradeSelections.map((upgrade) => (
          upgrade.upgradeName !== null && upgrade.upgradeName !== undefined
            ? { upgradeName: upgrade.upgradeName,
              ...(upgrade.nominatedModelId
                ? { nominatedModelId: upgrade.nominatedModelId } : {}) }
            : { purchasableUpgradeProfileId:
              upgrade.purchasableUpgradeProfileId,
              ...(upgrade.nominatedModelId
                ? { nominatedModelId: upgrade.nominatedModelId } : {}) })),
      })),
    };
  }

  function projectSession(session) {
    const plan = session.planSerialized
      ? parseRosterPlanV1(session.planSerialized) : null;
    const availability = deliberationAvailability();
    const usage = session.usage;
    const estimatedCost = usage && estimateCost && usage.totalUnits > 0
      ? estimateCost(usage) : null;
    return {
      schema: ROSTER_WORKSPACE_SESSION_PROJECTION_SCHEMA,
      sessionId: session.sessionId,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      setup: clone(session.setup),
      fixture: clone(fixture),
      progress: clone(session.progress),
      plan: plan ? clone(plan) : null,
      candidates: session.candidates.map((entry, index) => ({
        candidate: clone(entry),
        candidateInput: clone(session.candidateInputs[index] || null),
        verdictSummary: clone(session.candidateSummaries[index] || null),
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
        verdictSummary: summarizeVerdict(session.working.verdict),
        overrideHistory: clone(session.working.overrideHistory),
      } : null,
      planEvidenceStale: session.planEvidenceStale === true,
      evidence: {
        toolReceipts: clone(session.toolReceipts),
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
      resumeAvailable: (session.publicOutputs || []).length > 0,
      failure: clone(session.failure),
      cancelRequested: session.cancelRequested === true,
      deliberation: availability,
      selectedCandidateInput: clone(session.selectedCandidateInput),
      trainingTruth: false,
    };
  }

  async function persist(session) {
    session.updatedAt = now();
    await draftStore.save(clone(session));
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
      status: "draft",
      progress: { phase: "idle", rounds: [], activeRoundKind: null },
      planSerialized: null,
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
      sessionReceipt: null,
      skillRouteReceipt: null,
      mutationZeroProof: null,
      publicOutputs: [],
      usage: null,
      failure: null,
      cancelRequested: false,
      deliberationDescriptor: null,
      resumeReceipts: [],
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
        factionRecordKey: "tactical_cards:terran_armed_forces",
        opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
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

  // ------------------------------------------------------------ sessions

  async function createSession(inputSetup = {}) {
    const setup = validateSetup(inputSetup);
    const session = newSessionRecord(setup, createSessionId());
    sessions.set(session.sessionId, session);
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
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          factionRecordKey: session.setup.factionRecordKey,
          opponentFactionRecordKey: session.setup.opponentFactionRecordKey,
          engagementScale: session.setup.engagementScale,
          mineralBudget: session.setup.mineralBudget,
          planHash: session.planSerialized
            ? parseRosterPlanV1(session.planSerialized).planHash : null,
          planVersion: session.planSerialized
            ? parseRosterPlanV1(session.planSerialized).planVersion : null,
          planEvidenceStale: session.planEvidenceStale === true,
          providerCalls: session.usage?.calls || 0,
          failureCode: session.failure?.code || null,
        })),
      quarantinedDrafts: clone(quarantinedDrafts),
      deliberation: deliberationAvailability(),
      planningBusy: activeRun !== null,
      trainingTruth: false,
    };
  }

  function readSession(sessionId) {
    return projectSession(requireSession(sessionId));
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
      round.paidProviderCall = event.paidProviderCall === true;
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
            && entry.outputHash === record.outputHash));
        if (!duplicate) session.publicOutputs.push(record);
      }
      return;
    }
    if (event.type === "round_failed" && round) {
      round.status = "failed";
      round.finishedAt = event.at || now();
      round.failureCode = event.code || null;
      session.progress.activeRoundKind = null;
      if (event.paidProviderCall === true) accumulateUsage(session, event);
    }
  }

  async function executePlanning(session, { replayOnly }) {
    const sink = { toolReceipts: [] };
    const laboratory = input.createRunLaboratory(sink);
    const strategist = input.createStrategist({ laboratory });
    const control = { cancelled: () => session.cancelRequested === true };
    const onEvent = async (event) => {
      recordRoundEvent(session, event);
      // Persist at round boundaries so a crash or reload never loses a
      // completed (possibly paid) round reply.
      if (event.type !== "round_started" || event.replayed) {
        await persist(session).catch(() => {});
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
          sessionId: session.sessionId, runKind: "resume", control, onEvent });
      }
      deliberation = createRetainedReplayDeliberationPortV1({
        retainedOutputs: retained,
        livePort,
        onEvent,
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
        sessionId: session.sessionId, runKind: "initial", control, onEvent });
    }
    session.deliberationDescriptor = clone(deliberation.descriptor());
    if (session.usage) {
      session.usage.deliberationKind = session.deliberationDescriptor.kind;
      session.usage.modelVersion = session.deliberationDescriptor.modelVersion;
    }
    const sessionResult = await strategist.planRoster({
      sessionId: session.sessionId,
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
    }, { deliberation, maxProposalRounds: 2 });

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
    const mutationProof = laboratoryCore.proveMutationZero();
    if (mutationProof.sourceStateMutationCount !== 0) {
      wsFail("ROSTER_WORKSPACE_SOURCE_MUTATION_DETECTED", "laboratory", 500);
    }

    const reconstructed = session.generatedPlanHash !== null
      || session.planSerialized !== null;
    if (reconstructed) {
      // Replay resume over an already-generated session: the retained replies
      // must reconstruct the exact GENERATED plan (a later revision bumps the
      // version/hash, so compare against the generation-time hash). Usage
      // stays untouched — replayed rounds are zero new paid calls.
      const referenceHash = session.generatedPlanHash
        || parseRosterPlanV1(session.planSerialized).planHash;
      if (referenceHash !== sessionResult.plan.planHash) {
        wsFail("ROSTER_WORKSPACE_RESUME_PLAN_HASH_DRIFT",
          `${referenceHash}!=${sessionResult.plan.planHash}`, 500);
      }
      session.resumeReceipts.push({
        at: now(),
        replayedRounds: session.progress.rounds
          .filter((entry) => entry.status === "replayed").length,
        planHash: sessionResult.plan.planHash,
        newPaidCalls: session.progress.rounds
          .filter((entry) => entry.paidProviderCall === true).length,
        resumeReceiptHash: hashStarcraftTmgContract({
          sessionId: session.sessionId, at: now(),
          planHash: sessionResult.plan.planHash }),
      });
      session.status = "planned";
      session.progress.phase = "completed";
      session.failure = null;
      session.mutationZeroProof = clone(mutationProof);
      return { sessionResult, reconstructed: true };
    }

    session.planSerialized = serializeRosterPlanV1(sessionResult.plan);
    session.generatedPlanHash = sessionResult.plan.planHash;
    session.candidates = sessionResult.candidates.map((entry) => clone(entry));
    session.candidateInputs = sessionResult.candidateInputs.map(
      (entry) => clone(entry));
    session.candidateSummaries = candidateSummaries;
    session.selectedCandidateInput = selectedCandidateInput;
    session.comparison = clone(sessionResult.comparison);
    session.rejections = sessionResult.rejections.map((entry) => clone(entry));
    session.toolReceipts = sink.toolReceipts.map((entry) => clone(entry));
    session.sessionReceipt = clone(sessionResult.sessionReceipt);
    session.skillRouteReceipt = clone(sessionResult.skillRoute.receipt);
    session.mutationZeroProof = clone(mutationProof);
    session.working = {
      candidateInput: candidateInputFromCandidate(
        sessionResult.plan.rosterCandidate),
      verdict: armyBuilderPort.evaluateRosterCandidate(
        clone(selectedCandidateInput)),
      overrideHistory: [],
    };
    session.planEvidenceStale = false;
    session.status = "planned";
    session.progress.phase = "completed";
    session.failure = null;
    if (!session.usage) {
      session.usage = {
        calls: 0, inputUnits: 0, outputUnits: 0, totalUnits: 0, latencyMs: 0,
        receiptHashes: [],
      };
    }
    session.usage.deliberationKind = session.deliberationDescriptor.kind;
    session.usage.modelVersion = session.deliberationDescriptor.modelVersion;
    return { sessionResult, reconstructed: false };
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
    const retainedCount = (session.publicOutputs || []).length;
    if (session.status === "planned" && !resume) {
      wsFail("ROSTER_WORKSPACE_ALREADY_PLANNED",
        "use_revise_or_resume_or_new_session", 409);
    }
    if (resume || replayOnly) {
      if (retainedCount === 0) {
        wsFail("ROSTER_WORKSPACE_RESUME_OUTPUT_MISSING",
          "no_retained_replies", 409);
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
    session.status = "running";
    session.progress = { phase: "running", rounds: [], activeRoundKind: null };
    session.failure = null;
    session.cancelRequested = false;
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
      session.sessionReceipt = null;
      session.working = null;
      session.planEvidenceStale = false;
      session.usage = null;
      session.resumeReceipts = [];
    }
    await persist(session);
    const runId = randomUUID();
    activeRun = { sessionId: session.sessionId, runId };
    const finish = async (error) => {
      if (activeRun?.runId === runId) activeRun = null;
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
      await persist(session).catch(() => {});
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
    if (session.status !== "running"
      || activeRun?.sessionId !== session.sessionId) {
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

  // ------------------------------------------------------------ revision

  async function revisePlan(sessionId, request = {}) {
    const session = requireSession(sessionId);
    if (activeRun) {
      wsFail("ROSTER_WORKSPACE_PLANNING_BUSY", activeRun.sessionId, 409);
    }
    if (session.status !== "planned" || !session.planSerialized) {
      wsFail("ROSTER_WORKSPACE_NOT_PLANNED", sessionId, 409);
    }
    if (!deliberationFactory) {
      wsFail("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE",
        "no_live_deliberation_factory_attached", 503);
    }
    const reasonText = nonEmpty(request.reasonText,
      "ROSTER_WORKSPACE_REVISION_INVALID");
    const triggerIds = Array.isArray(request.triggerIds)
      ? request.triggerIds.map((entry) => String(entry)) : [];
    const revisedSectionKeys = Array.isArray(request.revisedSectionKeys)
      ? request.revisedSectionKeys.map((entry) => String(entry)) : [];
    if (revisedSectionKeys.length === 0
      || revisedSectionKeys.some((key) => (
        !ROSTER_WORKSPACE_REVISABLE_SECTION_KEYS.includes(key)))) {
      wsFail("ROSTER_WORKSPACE_REVISION_INVALID", "revisedSectionKeys");
    }
    const plan = parseRosterPlanV1(session.planSerialized);
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
      if (activeRun?.runId === runId) activeRun = null;
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
      await persist(session).catch(() => {});
    };
    void (async () => {
      try {
        const laboratory = input.createRunLaboratory({ toolReceipts: [] });
        const strategist = input.createStrategist({ laboratory });
        const control = { cancelled: () => session.cancelRequested === true };
        const onEvent = async (event) => {
          recordRoundEvent(session, event);
          if (event.type !== "round_started" || event.replayed) {
            await persist(session).catch(() => {});
          }
        };
        const deliberation = await deliberationFactory.createForRun({
          sessionId: session.sessionId, runKind: "revision", control,
          onEvent });
        const result = await strategist.reviseRosterPlan({
          plan,
          reasonText,
          triggerIds,
          revisedSectionKeys,
        }, { deliberation });
        session.planSerialized = serializeRosterPlanV1(result.plan);
        session.planEvidenceStale = false;
        session.status = "planned";
        session.progress.phase = "completed";
        session.failure = null;
        await finish(null);
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
    const candidateInput = request.candidateInput;
    if (!object(candidateInput)) {
      wsFail("ROSTER_WORKSPACE_OVERRIDE_INVALID", "candidateInput");
    }
    // Manual edits always go through the authoritative Builder port; the UI
    // verdict below is the Rules kernel's own audit, never a client guess.
    const verdict = armyBuilderPort.evaluateRosterCandidate(
      clone(candidateInput));
    const selectedHash = session.selectedCandidateInput
      ? hashStarcraftTmgContract(clone(session.selectedCandidateInput)) : null;
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
    // Plan evidence (score route, counters, tool receipts) was produced for
    // the selected candidate; once the working list differs, that evidence is
    // stale until an explicit revision refreshes the public plan sections.
    session.planEvidenceStale = verdict.candidateHash !== selectedHash;
    await persist(session);
    return projectSession(session);
  }

  // ------------------------------------------------------------ export/import

  function exportSession(sessionId) {
    const session = requireSession(sessionId);
    const plan = session.planSerialized
      ? JSON.parse(serializeRosterPlanV1(
        parseRosterPlanV1(session.planSerialized))) : null;
    const exportDocument = {
      schema: ROSTER_WORKSPACE_EXPORT_SCHEMA,
      exportId: `export-${randomUUID()}`,
      exportedAt: now(),
      setup: clone(session.setup),
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

  async function importSession(request = {}) {
    const exportDocument = request.exportDocument;
    if (!object(exportDocument)
      || exportDocument.schema !== ROSTER_WORKSPACE_EXPORT_SCHEMA) {
      wsFail("ROSTER_WORKSPACE_IMPORT_INVALID", "schema");
    }
    assertNoSecretKeys(exportDocument);
    const setup = validateSetup(exportDocument.setup);
    const session = newSessionRecord(setup, createSessionId());
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
      const plan = parseRosterPlanV1(JSON.stringify(exportDocument.plan));
      verifyRosterPlanRoundTripV1(plan);
      session.planSerialized = serializeRosterPlanV1(plan);
      session.status = "planned";
      session.progress = { phase: "completed", rounds: [],
        activeRoundKind: null };
      session.selectedCandidateInput = candidateInputFromCandidate(
        plan.rosterCandidate);
      if (session.working) {
        const selectedHash = hashStarcraftTmgContract(
          clone(session.selectedCandidateInput));
        session.planEvidenceStale =
          session.working.verdict.candidateHash !== selectedHash;
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
    await persist(session);
    sessions.set(session.sessionId, session);
    return projectSession(session);
  }

  // ------------------------------------------------------------ lifecycle

  async function loadPersisted() {
    const { sessions: loaded, quarantined } = await draftStore.loadAll();
    quarantinedDrafts = quarantined;
    for (const session of loaded) {
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
      hiddenChainOfThoughtRequested: false,
      hiddenChainOfThoughtPersisted: false,
      unknownStaysUnknown: true,
      laboratoryDescriptorHash:
        laboratoryCore.labDescriptor().descriptorHash,
      deliberation: deliberationAvailability(),
      trainingTruth: false,
    };
  }

  return Object.freeze({
    descriptor,
    loadPersisted,
    readCatalogue,
    readEnumeration,
    createSession,
    listSessions,
    readSession,
    deleteSession,
    startPlanning,
    cancelPlanning,
    revisePlan,
    applyManualOverride,
    exportSession,
    importSession,
  });
}
