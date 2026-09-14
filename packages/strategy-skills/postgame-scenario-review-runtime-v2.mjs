import {
  clone,
  fail,
  freeze,
  hash,
  safe,
  seal,
  verifySeal,
} from "../skill-production/common.mjs";

export const STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION =
  "starcraft_tmg_postgame_scenario_review_runtime_v2";

const SEVERITIES = new Set(["Critical", "High", "Important", "Medium", "Low"]);
const BLOCKING_SEVERITIES = new Set(["Critical", "High"]);
const SPLITS = new Set(["development", "heldout"]);
const REVIEW_CALLS = ["discover", "judge", "propose"];

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function withoutHiddenReasoning(value) {
  if (Array.isArray(value)) return value.map(withoutHiddenReasoning);
  if (!object(value)) return clone(value);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(?:chain_?of_?thought|hidden_?reasoning|raw_?reasoning|thinking)$/iu
      .test(key))
    .map(([key, child]) => [key, withoutHiddenReasoning(child)]));
}

function required(value, field, maximum = 4_000) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maximum) {
    fail("POSTGAME_REVIEW_FIELD_INVALID", { field });
  }
  return normalized;
}

function integer(value, field, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)
    || normalized < minimum || normalized > maximum) {
    fail("POSTGAME_REVIEW_INTEGER_INVALID", { field });
  }
  return normalized;
}

function finite(value, field) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    fail("POSTGAME_REVIEW_NUMBER_INVALID", { field });
  }
  return normalized;
}

function strings(value, field, minimum = 0) {
  if (!Array.isArray(value)) {
    fail("POSTGAME_REVIEW_ARRAY_INVALID", { field });
  }
  const normalized = value.map((entry, index) =>
    required(entry, `${field}[${index}]`));
  if (normalized.length < minimum) {
    fail("POSTGAME_REVIEW_ARRAY_INVALID", { field });
  }
  return normalized;
}

function ref(value, field) {
  if (!object(value)) fail("POSTGAME_REVIEW_REF_INVALID", { field });
  return freeze({
    id: required(value.id, `${field}.id`, 500),
    version: required(value.version, `${field}.version`, 240),
    hash: required(value.hash, `${field}.hash`, 160),
  });
}

function scenario(value, field) {
  if (!object(value)) fail("POSTGAME_REVIEW_SCENARIO_INVALID", { field });
  return freeze({
    missionId: required(value.missionId, `${field}.missionId`, 300),
    mapId: required(value.mapId, `${field}.mapId`, 300),
    scalePoints: integer(value.scalePoints, `${field}.scalePoints`, 1, 100_000),
    round: integer(value.round, `${field}.round`, 0, 1_000),
    phase: required(value.phase, `${field}.phase`, 160),
    actingSeat: required(value.actingSeat, `${field}.actingSeat`, 120),
    initiativeSeat: value.initiativeSeat === null
      ? null : required(value.initiativeSeat, `${field}.initiativeSeat`, 120),
    scoreBySeat: clone(value.scoreBySeat || {}),
    factionBySeat: clone(value.factionBySeat || {}),
    rosterArchetypeBySeat: clone(value.rosterArchetypeBySeat || {}),
    positionFingerprint: required(value.positionFingerprint,
      `${field}.positionFingerprint`, 500),
    resourceFingerprint: required(value.resourceFingerprint,
      `${field}.resourceFingerprint`, 500),
    statusFingerprint: required(value.statusFingerprint,
      `${field}.statusFingerprint`, 500),
    tags: strings(value.tags || [], `${field}.tags`),
  });
}

function snapshotBySeat(value, field) {
  if (!object(value) || !Object.keys(value).length) {
    fail("POSTGAME_REVIEW_SEAT_SNAPSHOT_INVALID", { field });
  }
  return freeze(Object.fromEntries(Object.entries(value).map(([seat, entry]) =>
    [required(seat, `${field}.seat`, 120), ref(entry, `${field}.${seat}`)])));
}

function decision(value, episodeId, index, split) {
  if (!object(value)) {
    fail("POSTGAME_REVIEW_DECISION_INVALID", { episodeId, index });
  }
  const decisionId = required(value.decisionId,
    `episodes.${episodeId}.decisions[${index}].decisionId`, 500);
  const checkpoint = value.checkpoint;
  if (!object(checkpoint)) {
    fail("POSTGAME_REVIEW_CHECKPOINT_INVALID", { decisionId });
  }
  return freeze({
    decisionId,
    sequence: integer(value.sequence, `${decisionId}.sequence`, 1),
    evaluationSplit: split,
    actingSeat: required(value.actingSeat, `${decisionId}.actingSeat`, 120),
    checkpoint: {
      checkpointId: required(checkpoint.checkpointId,
        `${decisionId}.checkpoint.checkpointId`, 500),
      stateRevision: integer(checkpoint.stateRevision,
        `${decisionId}.checkpoint.stateRevision`),
      stateHash: required(checkpoint.stateHash,
        `${decisionId}.checkpoint.stateHash`, 160),
      rngCursor: required(checkpoint.rngCursor,
        `${decisionId}.checkpoint.rngCursor`, 500),
      replayRef: ref(checkpoint.replayRef, `${decisionId}.checkpoint.replayRef`),
    },
    scenarioContext: scenario(value.scenarioContext,
      `${decisionId}.scenarioContext`),
    observationRef: ref(value.observationRef, `${decisionId}.observationRef`),
    legalSpaceRef: ref(value.legalSpaceRef, `${decisionId}.legalSpaceRef`),
    actionSpaceRef: ref(value.actionSpaceRef, `${decisionId}.actionSpaceRef`),
    actualAction: withoutHiddenReasoning(value.actualAction || {}),
    actualOutcome: withoutHiddenReasoning(value.actualOutcome || {}),
    skillSnapshotsBySeat: snapshotBySeat(value.skillSnapshotsBySeat,
      `${decisionId}.skillSnapshotsBySeat`),
    modelSnapshotsBySeat: snapshotBySeat(value.modelSnapshotsBySeat,
      `${decisionId}.modelSnapshotsBySeat`),
    promptPackSnapshotsBySeat: snapshotBySeat(value.promptPackSnapshotsBySeat,
      `${decisionId}.promptPackSnapshotsBySeat`),
    publicDecisionSummary: withoutHiddenReasoning(
      value.publicDecisionSummary || null),
    hiddenChainOfThoughtStored: false,
    trainingTruth: false,
  });
}

export function createStarcraftTmgScenarioReviewEpisodeV2(input = {}) {
  safe(input);
  const episodeId = required(input.episodeId, "episodeId", 500);
  const split = required(input.evaluationSplit || "development",
    "evaluationSplit", 40);
  if (!SPLITS.has(split)) fail("POSTGAME_REVIEW_SPLIT_INVALID", { split });
  if (!Array.isArray(input.decisions) || !input.decisions.length) {
    fail("POSTGAME_REVIEW_EPISODE_DECISIONS_REQUIRED", { episodeId });
  }
  const decisions = input.decisions.map((entry, index) =>
    decision(entry, episodeId, index, split));
  if (new Set(decisions.map((entry) => entry.decisionId)).size
    !== decisions.length) {
    fail("POSTGAME_REVIEW_DECISION_ID_DUPLICATE", { episodeId });
  }
  if (decisions.some((entry, index) => index > 0
    && entry.sequence <= decisions[index - 1].sequence)) {
    fail("POSTGAME_REVIEW_DECISION_SEQUENCE_INVALID", { episodeId });
  }
  if (input.terminalEvidence?.terminal !== true
    || input.terminalEvidence?.replayMatchesCurrent !== true) {
    fail("POSTGAME_REVIEW_EPISODE_NOT_REPLAY_VERIFIED", { episodeId });
  }
  return seal({
    schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.episode`,
    episodeId,
    matchMode: required(input.matchMode, "matchMode", 80),
    evaluationSplit: split,
    versions: {
      data: required(input.versions?.data, "versions.data", 240),
      rules: required(input.versions?.rules, "versions.rules", 240),
      actionSpace: required(input.versions?.actionSpace,
        "versions.actionSpace", 240),
      harness: required(input.versions?.harness, "versions.harness", 240),
    },
    rng: {
      scheme: required(input.rng?.scheme, "rng.scheme", 240),
      seed: required(input.rng?.seed, "rng.seed", 500),
    },
    decisions,
    terminalEvidence: clone(input.terminalEvidence),
    reviewOutcomeAvailableToOriginalDecisions: false,
    originalDecisionInputsRewritten: false,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

function reviewEpisode(value) {
  const episode = verifySeal(clone(value));
  if (episode.schema
      !== `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.episode`
    || episode.terminalEvidence?.terminal !== true
    || episode.terminalEvidence?.replayMatchesCurrent !== true
    || episode.trainingTruth !== false) {
    fail("POSTGAME_REVIEW_EPISODE_INVALID", { episodeId: episode.episodeId });
  }
  return episode;
}

function targetSkill(value, index) {
  const skill = verifySeal(clone(value));
  if (skill.gameId !== "starcraft-tmg" || skill.skillType !== "strategy"
    || skill.canAffectRules !== false || skill.trainingTruth !== false) {
    fail("POSTGAME_REVIEW_TARGET_SKILL_INVALID", { index });
  }
  return skill;
}

function opponentPolicy(value, index) {
  if (!object(value)) fail("POSTGAME_REVIEW_OPPONENT_POLICY_INVALID", { index });
  return freeze({
    policyId: required(value.policyId, `opponentPolicies[${index}].policyId`, 500),
    seatKey: required(value.seatKey, `opponentPolicies[${index}].seatKey`, 120),
    strategySnapshotRef: ref(value.strategySnapshotRef,
      `opponentPolicies[${index}].strategySnapshotRef`),
    modelSnapshotRef: ref(value.modelSnapshotRef,
      `opponentPolicies[${index}].modelSnapshotRef`),
    promptPackSnapshotRef: ref(value.promptPackSnapshotRef,
      `opponentPolicies[${index}].promptPackSnapshotRef`),
  });
}

function normalizeHypotheses(raw, context) {
  safe(raw);
  const rows = Array.isArray(raw?.hypotheses) ? raw.hypotheses : [];
  const decisionById = context.decisionById;
  const targetByHash = context.targetByHash;
  const policyById = context.policyById;
  const ids = new Set();
  return rows.map((value, index) => {
    const hypothesisId = required(value.hypothesisId,
      `hypotheses[${index}].hypothesisId`, 500);
    const targetSkillHash = required(value.targetSkillHash,
      `${hypothesisId}.targetSkillHash`, 160);
    const decisionRefs = strings(value.decisionRefs,
      `${hypothesisId}.decisionRefs`, 1);
    const requestedPolicyIds = strings(value.requestedOpponentPolicyIds ||
      [...policyById.keys()], `${hypothesisId}.requestedOpponentPolicyIds`, 1);
    if (ids.has(hypothesisId) || !targetByHash.has(targetSkillHash)
      || decisionRefs.some((id) => !decisionById.has(id))
      || requestedPolicyIds.some((id) => !policyById.has(id))) {
      fail("POSTGAME_REVIEW_HYPOTHESIS_BINDING_INVALID", { hypothesisId });
    }
    ids.add(hypothesisId);
    const subjectSeat = required(value.subjectSeat,
      `${hypothesisId}.subjectSeat`, 120);
    if (decisionRefs.some((id) => decisionById.get(id).actingSeat !== subjectSeat)
      || requestedPolicyIds.some((id) => policyById.get(id).seatKey === subjectSeat)) {
      fail("POSTGAME_REVIEW_HYPOTHESIS_SIDE_INVALID", { hypothesisId });
    }
    return freeze({
      hypothesisId,
      subjectSeat,
      targetSkillHash,
      decisionRefs,
      requestedOpponentPolicyIds: requestedPolicyIds,
      claim: required(value.claim, `${hypothesisId}.claim`, 12_000),
      expectedEffect: required(value.expectedEffect,
        `${hypothesisId}.expectedEffect`, 8_000),
      primaryMetric: required(value.primaryMetric || "scoreDifferential",
        `${hypothesisId}.primaryMetric`, 160),
      scenarioPredicate: clone(value.scenarioPredicate || {}),
      evidencePriority: finite(value.evidencePriority ?? 0,
        `${hypothesisId}.evidencePriority`),
      changeDraft: clone(value.changeDraft || {}),
    });
  });
}

function normalizeFinding(value, index, pairById, hypothesisById) {
  const findingId = required(value.findingId, `findings[${index}].findingId`, 500);
  const hypothesisId = required(value.hypothesisId,
    `${findingId}.hypothesisId`, 500);
  const pairIds = strings(value.pairIds, `${findingId}.pairIds`, 1);
  const severity = required(value.severity || "Medium",
    `${findingId}.severity`, 40);
  if (!hypothesisById.has(hypothesisId) || !SEVERITIES.has(severity)
    || pairIds.some((id) => pairById.get(id)?.hypothesisId !== hypothesisId)) {
    fail("POSTGAME_REVIEW_FINDING_BINDING_INVALID", { findingId });
  }
  return freeze({
    findingId,
    hypothesisId,
    pairIds,
    severity,
    verdict: required(value.verdict, `${findingId}.verdict`, 160),
    claim: required(value.claim, `${findingId}.claim`, 12_000),
    limitations: strings(value.limitations || [], `${findingId}.limitations`),
    blocksIntegration: BLOCKING_SEVERITIES.has(severity),
  });
}

function normalizeProposal(value, index, context) {
  const proposalId = required(value.proposalId,
    `skillPatches[${index}].proposalId`, 500);
  const findingIds = strings(value.findingIds,
    `${proposalId}.findingIds`, 1);
  const targetSkillHash = required(value.targetSkillHash,
    `${proposalId}.targetSkillHash`, 160);
  const operation = required(value.operation, `${proposalId}.operation`, 100);
  if (!context.targetByHash.has(targetSkillHash)
    || findingIds.some((id) => !context.findingById.has(id))
    || !["add", "replace"].includes(operation)) {
    fail("POSTGAME_REVIEW_PROPOSAL_BINDING_INVALID", { proposalId });
  }
  const applicableWhen = strings(value.applicableWhen,
    `${proposalId}.applicableWhen`, 1);
  const reviseIf = strings(value.reviseIf, `${proposalId}.reviseIf`, 1);
  return freeze({
    proposalId,
    findingIds,
    targetSkillHash,
    operation,
    path: required(value.path, `${proposalId}.path`, 1_000),
    value: clone(value.value),
    applicableWhen,
    reviseIf,
    expectedBenefit: required(value.expectedBenefit,
      `${proposalId}.expectedBenefit`, 8_000),
    knownRisk: required(value.knownRisk, `${proposalId}.knownRisk`, 8_000),
  });
}

function average(rows, metric) {
  if (!rows.length) return null;
  return rows.reduce((sum, row) => sum + finite(row.metrics[metric], metric), 0)
    / rows.length;
}

function payoffMatrix(pairs, hypotheses) {
  const cells = [];
  for (const hypothesis of hypotheses) {
    const matching = pairs.filter((pair) =>
      pair.hypothesisId === hypothesis.hypothesisId
      && pair.status === "completed");
    for (const policyId of hypothesis.requestedOpponentPolicyIds) {
      for (const split of SPLITS) {
        const group = matching.filter((pair) =>
          pair.opponentPolicyId === policyId && pair.evaluationSplit === split);
        if (!group.length) continue;
        const baseline = average(group.map((pair) => pair.arms.baseline.result),
          hypothesis.primaryMetric);
        const candidate = average(group.map((pair) => pair.arms.candidate.result),
          hypothesis.primaryMetric);
        cells.push(freeze({
          hypothesisId: hypothesis.hypothesisId,
          opponentPolicyId: policyId,
          evaluationSplit: split,
          sampleCount: group.length,
          primaryMetric: hypothesis.primaryMetric,
          baseline,
          candidate,
          delta: candidate - baseline,
          pairIds: group.map((pair) => pair.pairId),
        }));
      }
    }
  }
  const classifications = hypotheses.map((hypothesis) => {
    const development = cells.filter((cell) =>
      cell.hypothesisId === hypothesis.hypothesisId
      && cell.evaluationSplit === "development");
    const deltas = development.map((cell) => cell.delta);
    const classification = !deltas.length ? "insufficient_experiment_evidence"
      : deltas.every((value) => value > 0) ? "robust_across_tested_opponents"
        : deltas.every((value) => value < 0) ? "regression_across_tested_opponents"
          : deltas.some((value) => value > 0) && deltas.some((value) => value < 0)
            ? "opponent_policy_specific" : "neutral_or_low_signal";
    return freeze({ hypothesisId: hypothesis.hypothesisId, classification,
      opponentPolicyCount: development.length });
  });
  return seal({
    schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.payoff-matrix`,
    cells,
    classifications,
    simultaneousStrategyChangesAllowed: false,
    trainingTruth: false,
  });
}

function publicRecord(record) {
  const copy = clone(record);
  copy.episodes = copy.episodes.map((episode) => episode.evaluationSplit
    === "heldout" ? {
      schema: episode.schema,
      episodeId: episode.episodeId,
      evaluationSplit: episode.evaluationSplit,
      decisionCount: episode.decisions.length,
      episodeHash: episode.hash,
      contents: "evaluator_only_redacted",
      trainingTruth: false,
    } : episode);
  if (copy.calls?.propose?.result) {
    delete copy.calls.propose.result.heldoutScenarios;
  }
  return freeze(copy);
}

export function createInMemoryStarcraftTmgPostgameReviewStoreV2() {
  const records = new Map();
  return freeze({
    durability: "memory_test_only",
    async load(reviewId) {
      return records.has(reviewId) ? clone(records.get(reviewId)) : null;
    },
    async commit(reviewId, expectedRevision, next) {
      const current = records.get(reviewId);
      if ((current?.revision ?? null) !== expectedRevision
        || next.revision !== (expectedRevision === null ? 0 : expectedRevision + 1)) {
        return { ok: false, reason: "POSTGAME_REVIEW_STORE_REVISION_CONFLICT" };
      }
      records.set(reviewId, clone(next));
      return { ok: true, revision: next.revision };
    },
  });
}

export function createStarcraftTmgPostgameScenarioReviewRuntimeV2(options = {}) {
  const store = options.store || createInMemoryStarcraftTmgPostgameReviewStoreV2();
  const reviewer = options.reviewer;
  const experiment = options.experimentPort;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  if (REVIEW_CALLS.some((method) => typeof reviewer?.[method] !== "function")) {
    throw new TypeError("reviewer discover/judge/propose are required");
  }
  for (const method of ["cloneCheckpoint", "executeArm"]) {
    if (typeof experiment?.[method] !== "function") {
      throw new TypeError(`experimentPort.${method} is required`);
    }
  }

  async function persist(record, mutate) {
    const next = clone(record);
    mutate(next);
    next.revision = record.revision + 1;
    next.updatedAt = now();
    const committed = await store.commit(record.reviewId, record.revision, next);
    if (committed?.ok !== true) {
      fail(committed?.reason || "POSTGAME_REVIEW_STORE_COMMIT_FAILED");
    }
    return next;
  }

  async function start(input = {}) {
    safe(input);
    const reviewId = required(input.reviewId, "reviewId", 500);
    const existing = await store.load(reviewId);
    if (!Array.isArray(input.episodes) || input.episodes.length < 2
      || !Array.isArray(input.targetSkills) || !input.targetSkills.length
      || !Array.isArray(input.opponentPolicies) || !input.opponentPolicies.length) {
      fail("POSTGAME_REVIEW_INPUT_INVALID");
    }
    const episodes = input.episodes.map(reviewEpisode);
    const targets = input.targetSkills.map(targetSkill);
    const policies = input.opponentPolicies.map(opponentPolicy);
    const allDecisions = episodes.flatMap((episode) => episode.decisions.map((entry) =>
      ({ ...clone(entry), episodeId: episode.episodeId,
        versions: clone(episode.versions), rng: clone(episode.rng) })));
    if (new Set(allDecisions.map((entry) => entry.decisionId)).size
      !== allDecisions.length) {
      fail("POSTGAME_REVIEW_GLOBAL_DECISION_ID_DUPLICATE");
    }
    const developmentDecisions = allDecisions.filter((entry) =>
      entry.evaluationSplit === "development");
    const heldoutDecisions = allDecisions.filter((entry) =>
      entry.evaluationSplit === "heldout");
    if (!developmentDecisions.length) fail("POSTGAME_REVIEW_DEVELOPMENT_REQUIRED");
    const maxPairs = integer(input.budgets?.maxExperimentPairs,
      "budgets.maxExperimentPairs", 1, 100_000);
    const inputIdentity = hash({
      episodeHashes: episodes.map((entry) => entry.hash),
      targetSkillHashes: targets.map((entry) => entry.hash),
      policies,
      maxPairs,
    });
    if (existing) {
      if (existing.inputIdentity !== inputIdentity) {
        fail("POSTGAME_REVIEW_RUN_INPUT_DRIFT", { reviewId });
      }
      return publicRecord(existing);
    }
    const record = {
      schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.record`,
      reviewId,
      revision: 0,
      status: "running",
      phase: "discovery",
      createdAt: now(),
      updatedAt: now(),
      inputIdentity,
      episodes,
      targetSkills: targets,
      opponentPolicies: policies,
      budgets: {
        maxExperimentPairs: maxPairs,
        maxReviewCalls: 3,
        reviewCallsUsed: 0,
        experimentPairsUsed: 0,
      },
      scan: {
        totalEpisodeCount: episodes.length,
        totalActionCount: allDecisions.length,
        developmentActionCount: developmentDecisions.length,
        heldoutActionCount: heldoutDecisions.length,
        scannedDecisionIds: developmentDecisions.map((entry) => entry.decisionId),
        fixedTopKSelectionUsed: false,
      },
      hypotheses: [],
      pairs: [],
      findings: [],
      skillOptCandidates: [],
      mementoCandidates: [],
      payoffMatrix: null,
      calls: Object.fromEntries(REVIEW_CALLS.map((kind) => [kind, {
        status: "pending", callId: `${reviewId}.${kind}.1`, result: null,
      }])),
      findingsSummary: { blocking: 0, trackedNonBlocking: 0 },
      reviewCycle: 1,
      maximumReviewCycles: 3,
      hiddenHeldoutVisibleToGameplayAgent: false,
      hiddenHeldoutVisibleToSkillProposer: false,
      realTrajectoryMutationCalls: 0,
      automaticPromotion: false,
      eligibleForTraining: false,
      trainingTruth: false,
    };
    const committed = await store.commit(reviewId, null, record);
    if (committed?.ok !== true) fail("POSTGAME_REVIEW_STORE_CREATE_FAILED");
    return publicRecord(record);
  }

  function context(record) {
    const decisions = record.episodes.flatMap((episode) => episode.decisions);
    return {
      decisionById: new Map(decisions.map((entry) => [entry.decisionId, entry])),
      targetByHash: new Map(record.targetSkills.map((entry) => [entry.hash, entry])),
      policyById: new Map(record.opponentPolicies.map((entry) => [entry.policyId, entry])),
      hypothesisById: new Map(record.hypotheses.map((entry) =>
        [entry.hypothesisId, entry])),
      pairById: new Map(record.pairs.map((entry) => [entry.pairId, entry])),
      findingById: new Map(record.findings.map((entry) => [entry.findingId, entry])),
    };
  }

  async function reconcileCall(record, kind) {
    const call = record.calls[kind];
    if (call.status !== "running") return record;
    if (typeof reviewer.readCall === "function") {
      const recovered = await reviewer.readCall({ callId: call.callId, kind });
      if (recovered?.status === "completed") {
        return persist(record, (next) => {
          next.calls[kind] = { ...next.calls[kind], status: "completed",
            result: clone(recovered.result), recoveredAfterRestart: true };
        });
      }
      if (recovered?.status === "definitely_not_started") {
        return persist(record, (next) => {
          next.calls[kind] = { ...next.calls[kind], status: "pending",
            recoveredAfterRestart: true };
          next.budgets.reviewCallsUsed -= 1;
        });
      }
    }
    return persist(record, (next) => {
      next.status = "paused_commit_unknown";
      next.commitUnknown = { kind: "review_call", callId: call.callId,
        phase: kind };
    });
  }

  async function invokeReview(record, kind, payload) {
    record = await reconcileCall(record, kind);
    if (record.status === "paused_commit_unknown") return record;
    let call = record.calls[kind];
    if (call.status === "completed") return record;
    if (record.budgets.reviewCallsUsed >= record.budgets.maxReviewCalls) {
      return persist(record, (next) => {
        next.status = "blocked";
        next.findings.push({ findingId: "review-call-budget-exhausted",
          severity: "High", blocksIntegration: true,
          claim: "The bounded review-call budget was exhausted." });
      });
    }
    record = await persist(record, (next) => {
      next.calls[kind].status = "running";
      next.calls[kind].requestHash = hash(payload);
      next.budgets.reviewCallsUsed += 1;
    });
    const result = await reviewer[kind]({ ...clone(payload),
      callId: record.calls[kind].callId });
    safe(result);
    const persistedResult = withoutHiddenReasoning(result);
    return persist(record, (next) => {
      next.calls[kind].status = "completed";
      next.calls[kind].result = persistedResult;
    });
  }

  async function discover(record) {
    const development = record.episodes.filter((episode) =>
      episode.evaluationSplit === "development");
    const payload = freeze({
      schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.discovery-request`,
      reviewId: record.reviewId,
      episodes: development.map((episode) => ({
        episodeId: episode.episodeId,
        matchMode: episode.matchMode,
        versions: clone(episode.versions),
        decisions: clone(episode.decisions),
        terminalEvidence: clone(episode.terminalEvidence),
      })),
      targetSkillRefs: record.targetSkills.map((entry) => ({ id: entry.skillId,
        version: entry.version, hash: entry.hash })),
      opponentPolicies: clone(record.opponentPolicies),
      instruction: "Scan every supplied action. Bind each hypothesis to explicit decisions and scenario conditions; do not infer hidden information or rewrite original observations.",
      hiddenHeldoutIncluded: false,
      trainingTruth: false,
    });
    record = await invokeReview(record, "discover", payload);
    if (record.status !== "running") return record;
    const discoveryContext = context(record);
    discoveryContext.decisionById = new Map(record.episodes
      .filter((episode) => episode.evaluationSplit === "development")
      .flatMap((episode) => episode.decisions)
      .map((entry) => [entry.decisionId, entry]));
    const hypotheses = normalizeHypotheses(record.calls.discover.result,
      discoveryContext);
    return persist(record, (next) => {
      next.hypotheses = hypotheses;
      next.phase = "planning";
    });
  }

  async function plan(record) {
    const ctx = context(record);
    const candidates = [];
    for (const hypothesis of [...record.hypotheses]
      .sort((left, right) => right.evidencePriority - left.evidencePriority)) {
      for (const decisionId of hypothesis.decisionRefs) {
        const row = ctx.decisionById.get(decisionId);
        for (const policyId of hypothesis.requestedOpponentPolicyIds) {
          const policy = ctx.policyById.get(policyId);
          if (policy.seatKey === hypothesis.subjectSeat) continue;
          candidates.push({ hypothesis, decision: row, policy,
            evaluationSplit: row.evaluationSplit });
        }
      }
    }
    const heldout = record.episodes.filter((episode) =>
      episode.evaluationSplit === "heldout").flatMap((episode) => episode.decisions);
    for (const hypothesis of record.hypotheses) {
      for (const row of heldout.filter((entry) =>
        entry.actingSeat === hypothesis.subjectSeat
        && entry.scenarioContext.tags.some((tag) =>
          tag === `hypothesis:${hypothesis.hypothesisId}`))) {
        for (const policyId of hypothesis.requestedOpponentPolicyIds) {
          const policy = ctx.policyById.get(policyId);
          if (policy.seatKey !== hypothesis.subjectSeat) {
            candidates.push({ hypothesis, decision: row, policy,
              evaluationSplit: "heldout" });
          }
        }
      }
    }
    const scheduled = candidates.slice(0, record.budgets.maxExperimentPairs);
    const pairs = scheduled.map((entry, index) => {
      const originalSkill = ctx.targetByHash.get(entry.hypothesis.targetSkillHash);
      const candidateSkillHash = hash({ parentSkillHash: originalSkill.hash,
        changeDraft: entry.hypothesis.changeDraft });
      const pairId = `${record.reviewId}.pair.${index + 1}`;
      const base = {
        pairId,
        hypothesisId: entry.hypothesis.hypothesisId,
        decisionId: entry.decision.decisionId,
        evaluationSplit: entry.evaluationSplit,
        subjectSeat: entry.hypothesis.subjectSeat,
        checkpoint: clone(entry.decision.checkpoint),
        scenarioContext: clone(entry.decision.scenarioContext),
        opponentPolicyId: entry.policy.policyId,
        opponentStrategyRef: clone(entry.policy.strategySnapshotRef),
        opponentModelRef: clone(entry.policy.modelSnapshotRef),
        opponentPromptPackRef: clone(entry.policy.promptPackSnapshotRef),
        subjectModelRef: clone(entry.decision
          .modelSnapshotsBySeat[entry.hypothesis.subjectSeat]),
        subjectPromptPackRef: clone(entry.decision
          .promptPackSnapshotsBySeat[entry.hypothesis.subjectSeat]),
        rng: { scheme: "paired_exact_stream_v1",
          seed: `${entry.decision.checkpoint.rngCursor}:${pairId}` },
        primaryMetric: entry.hypothesis.primaryMetric,
        clone: { status: "pending", receipt: null },
        status: "planned",
      };
      return freeze({ ...base, arms: {
        baseline: { status: "pending", executionKey: `${pairId}.baseline`,
          subjectStrategyRef: { id: originalSkill.skillId,
            version: originalSkill.version, hash: originalSkill.hash }, result: null },
        candidate: { status: "pending", executionKey: `${pairId}.candidate`,
          subjectStrategyRef: { id: originalSkill.skillId,
            version: `${originalSkill.version}+review-candidate`,
            hash: candidateSkillHash }, result: null },
      } });
    });
    return persist(record, (next) => {
      next.pairs = pairs;
      next.planning = {
        eligiblePairCount: candidates.length,
        scheduledPairCount: scheduled.length,
        skippedForBudgetCount: candidates.length - scheduled.length,
        allActionsScannedBeforeScheduling: true,
        fixedTopKSelectionUsed: false,
      };
      next.phase = "experiments";
    });
  }

  function normalizedArmResult(raw, pair, armName) {
    safe(raw);
    const arm = pair.arms[armName];
    if (raw?.ok !== true || raw?.replayMatchesCurrent !== true
      || raw?.isolatedClone !== true || raw?.realTrajectoryMutationCalls !== 0
      || raw?.executionKey !== arm.executionKey
      || raw?.checkpointId !== pair.checkpoint.checkpointId
      || raw?.rngSeed !== pair.rng.seed
      || raw?.opponentStrategyHash !== pair.opponentStrategyRef.hash
      || raw?.subjectStrategyHash !== arm.subjectStrategyRef.hash
      || !object(raw?.metrics)) {
      fail("POSTGAME_REVIEW_EXPERIMENT_RESULT_INVALID", {
        pairId: pair.pairId, armName,
      });
    }
    const metrics = Object.fromEntries(Object.entries(raw.metrics).map(([key, value]) =>
      [required(key, "metrics.key", 160), finite(value, `metrics.${key}`)]));
    if (!Object.hasOwn(metrics, pair.primaryMetric)) {
      fail("POSTGAME_REVIEW_PRIMARY_METRIC_MISSING", { pairId: pair.pairId });
    }
    return freeze({
      executionKey: arm.executionKey,
      checkpointId: pair.checkpoint.checkpointId,
      rngSeed: pair.rng.seed,
      subjectStrategyHash: arm.subjectStrategyRef.hash,
      opponentStrategyHash: pair.opponentStrategyRef.hash,
      metrics,
      trajectoryRef: ref(raw.trajectoryRef, "trajectoryRef"),
      opponentResponseTrace: withoutHiddenReasoning(
        raw.opponentResponseTrace || []),
      replayMatchesCurrent: true,
      isolatedClone: true,
      realTrajectoryMutationCalls: 0,
      hiddenEvaluatorContextProjectedToGameplayAgent: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  async function reconcileArm(record, pairIndex, armName) {
    const pair = record.pairs[pairIndex];
    const arm = pair.arms[armName];
    if (arm.status !== "running") return record;
    if (typeof experiment.readExecution === "function") {
      const recovered = await experiment.readExecution({
        executionKey: arm.executionKey,
      });
      if (recovered?.status === "completed") {
        const result = normalizedArmResult(recovered.result, pair, armName);
        return persist(record, (next) => {
          next.pairs[pairIndex].arms[armName].status = "completed";
          next.pairs[pairIndex].arms[armName].result = clone(result);
          next.pairs[pairIndex].arms[armName].recoveredAfterRestart = true;
        });
      }
      if (recovered?.status === "definitely_not_started") {
        return persist(record, (next) => {
          next.pairs[pairIndex].arms[armName].status = "pending";
          next.pairs[pairIndex].arms[armName].recoveredAfterRestart = true;
        });
      }
    }
    return persist(record, (next) => {
      next.status = "paused_commit_unknown";
      next.commitUnknown = { kind: "experiment_arm",
        pairId: pair.pairId, armName, executionKey: arm.executionKey };
    });
  }

  async function runExperiments(record) {
    for (let pairIndex = 0; pairIndex < record.pairs.length; pairIndex += 1) {
      let pair = record.pairs[pairIndex];
      if (pair.status === "completed") continue;
      if (["cloning", "pending"].includes(pair.clone.status)) {
        if (pair.clone.status === "pending") {
          record = await persist(record, (next) => {
            next.pairs[pairIndex].clone.status = "cloning";
          });
        }
        const cloned = await experiment.cloneCheckpoint({
          cloneKey: `${pair.pairId}.checkpoint`,
          checkpoint: clone(pair.checkpoint),
          scenarioContext: clone(pair.scenarioContext),
          evaluationSplit: pair.evaluationSplit,
          isolated: true,
        });
        if (cloned?.ok !== true || cloned?.exact !== true
          || cloned?.sourceCheckpointId !== pair.checkpoint.checkpointId
          || !cloned?.cloneRef) {
          fail("POSTGAME_REVIEW_CHECKPOINT_CLONE_INVALID", { pairId: pair.pairId });
        }
        record = await persist(record, (next) => {
          next.pairs[pairIndex].clone.status = "completed";
          next.pairs[pairIndex].clone.receipt = clone(cloned);
          next.pairs[pairIndex].status = "running";
        });
        pair = record.pairs[pairIndex];
      }
      for (const armName of ["baseline", "candidate"]) {
        record = await reconcileArm(record, pairIndex, armName);
        if (record.status !== "running") return record;
        pair = record.pairs[pairIndex];
        const arm = pair.arms[armName];
        if (arm.status === "completed") continue;
        record = await persist(record, (next) => {
          next.pairs[pairIndex].arms[armName].status = "running";
        });
        pair = record.pairs[pairIndex];
        const resultRaw = await experiment.executeArm({
          executionKey: arm.executionKey,
          pairId: pair.pairId,
          armName,
          clonedCheckpointRef: clone(pair.clone.receipt.cloneRef),
          sourceCheckpoint: clone(pair.checkpoint),
          scenarioContext: clone(pair.scenarioContext),
          evaluationSplit: pair.evaluationSplit,
          rng: clone(pair.rng),
          subjectSeat: pair.subjectSeat,
          subjectStrategyRef: clone(arm.subjectStrategyRef),
          subjectModelRef: clone(pair.subjectModelRef),
          subjectPromptPackRef: clone(pair.subjectPromptPackRef),
          opponentPolicy: {
            policyId: pair.opponentPolicyId,
            strategySnapshotRef: clone(pair.opponentStrategyRef),
            modelSnapshotRef: clone(pair.opponentModelRef),
            promptPackSnapshotRef: clone(pair.opponentPromptPackRef),
          },
          opponentResponseSearch: true,
          realTrajectoryMutationAllowed: false,
          hiddenEvaluatorContextVisibleToGameplayAgent: false,
        });
        const result = normalizedArmResult(resultRaw, pair, armName);
        record = await persist(record, (next) => {
          next.pairs[pairIndex].arms[armName].status = "completed";
          next.pairs[pairIndex].arms[armName].result = clone(result);
        });
      }
      record = await persist(record, (next) => {
        next.pairs[pairIndex].status = "completed";
        next.budgets.experimentPairsUsed += 1;
      });
    }
    return persist(record, (next) => {
      next.payoffMatrix = payoffMatrix(next.pairs, next.hypotheses);
      next.phase = "judging";
    });
  }

  async function judge(record) {
    const payload = freeze({
      schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.judge-request`,
      reviewId: record.reviewId,
      hypotheses: clone(record.hypotheses),
      experimentPairs: record.pairs.map((pair) => ({
        pairId: pair.pairId,
        hypothesisId: pair.hypothesisId,
        decisionId: pair.decisionId,
        evaluationSplit: pair.evaluationSplit,
        scenarioContext: clone(pair.scenarioContext),
        opponentPolicyId: pair.opponentPolicyId,
        baseline: clone(pair.arms.baseline.result),
        candidate: clone(pair.arms.candidate.result),
      })),
      payoffMatrix: clone(record.payoffMatrix),
      instruction: "Judge only the paired Rules-replayed evidence. Critical/High block integration; Important/Medium/Low are tracked. Bind every conclusion to its scenario and tested opponent policy.",
      maximumReviewCycles: 3,
      trainingTruth: false,
    });
    record = await invokeReview(record, "judge", payload);
    if (record.status !== "running") return record;
    const ctx = context(record);
    const rows = Array.isArray(record.calls.judge.result?.findings)
      ? record.calls.judge.result.findings : [];
    const findings = rows.map((entry, index) =>
      normalizeFinding(entry, index, ctx.pairById, ctx.hypothesisById));
    const blocking = findings.filter((entry) => entry.blocksIntegration).length;
    return persist(record, (next) => {
      next.findings = findings;
      next.findingsSummary = { blocking,
        trackedNonBlocking: findings.length - blocking };
      next.phase = "proposing";
    });
  }

  async function propose(record) {
    const developmentPairIds = new Set(record.pairs.filter((pair) =>
      pair.evaluationSplit === "development").map((pair) => pair.pairId));
    const payload = freeze({
      schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.proposal-request`,
      reviewId: record.reviewId,
      targetSkillRefs: record.targetSkills.map((entry) => ({ id: entry.skillId,
        version: entry.version, hash: entry.hash })),
      findings: record.findings.map((finding) => ({ ...clone(finding),
        pairIds: finding.pairIds.filter((id) => developmentPairIds.has(id)) })),
      payoffClassification: clone(record.payoffMatrix.classifications),
      instruction: "Propose the smallest typed strategy-only diff. State explicit applicableWhen and reviseIf conditions. Do not change rules, publish, or use hidden held-out examples.",
      heldoutScenarioContentsIncluded: false,
      automaticPromotion: false,
      trainingTruth: false,
    });
    record = await invokeReview(record, "propose", payload);
    if (record.status !== "running") return record;
    const ctx = context(record);
    ctx.findingById = new Map(record.findings.map((entry) =>
      [entry.findingId, entry]));
    const rawPatches = Array.isArray(record.calls.propose.result?.skillPatches)
      ? record.calls.propose.result.skillPatches : [];
    const proposals = rawPatches.map((entry, index) =>
      normalizeProposal(entry, index, ctx));
    const suffix = required(record.calls.propose.result?.candidateVersionSuffix
      || "skillopt.review-v2.1", "candidateVersionSuffix", 160);
    const candidates = proposals.map((proposal) => {
      const parent = ctx.targetByHash.get(proposal.targetSkillHash);
      return seal({
        schema: "project_d_skillopt_candidate_v2",
        gameId: "starcraft-tmg",
        candidateId: `${parent.skillId}.${proposal.proposalId}`,
        parentSkillRef: { id: parent.skillId, version: parent.version,
          hash: parent.hash },
        proposedVersion: `${parent.version}+${suffix}`,
        minimalTypedChange: clone(proposal),
        evidence: {
          reviewId: record.reviewId,
          findingIds: clone(proposal.findingIds),
          payoffMatrixHash: record.payoffMatrix.hash,
        },
        status: "quarantined_candidate",
        requiresIndependentHeldoutEvaluation: true,
        requiresCompleteGameArena: true,
        rollbackParentRef: { id: parent.skillId, version: parent.version,
          hash: parent.hash },
        humanReviewed: false,
        canAffectStrategy: true,
        canAffectRules: false,
        runtimeAccepted: false,
        published: false,
        eligibleForTraining: false,
        trainingTruth: false,
      });
    });
    const rawMementos = Array.isArray(record.calls.propose.result?.mementos)
      ? record.calls.propose.result.mementos : [];
    const mementos = rawMementos.map((entry, index) => {
      const findingId = required(entry.findingId,
        `mementos[${index}].findingId`, 500);
      if (!ctx.findingById.has(findingId)) {
        fail("POSTGAME_REVIEW_MEMENTO_FINDING_INVALID", { findingId });
      }
      return seal({
        schema: "project_d_memento_candidate_v2",
        gameId: "starcraft-tmg",
        mementoId: required(entry.mementoId,
          `mementos[${index}].mementoId`, 500),
        findingId,
        scenarioPredicate: clone(entry.scenarioPredicate || {}),
        lesson: required(entry.lesson, `mementos[${index}].lesson`, 12_000),
        reviseIf: strings(entry.reviseIf, `mementos[${index}].reviseIf`, 1),
        status: "quarantined_candidate",
        humanReviewed: false,
        canAffectRules: false,
        runtimeAccepted: false,
        eligibleForTraining: false,
        trainingTruth: false,
      });
    });
    return persist(record, (next) => {
      next.skillOptCandidates = candidates;
      next.mementoCandidates = mementos;
      next.status = next.findingsSummary.blocking > 0
        ? "completed_integration_blocked" : "completed_review_ready";
      next.phase = "completed";
      next.completedAt = now();
      next.hiddenHeldoutVisibleToSkillProposer = false;
      next.automaticPromotion = false;
      next.eligibleForTraining = false;
    });
  }

  async function advance(reviewIdInput) {
    const reviewId = required(reviewIdInput, "reviewId", 500);
    let record = await store.load(reviewId);
    if (!record) fail("POSTGAME_REVIEW_NOT_FOUND", { reviewId });
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "discovery") record = await discover(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "planning") record = await plan(record);
    if (record.phase === "experiments") record = await runExperiments(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "judging") record = await judge(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "proposing") record = await propose(record);
    return publicRecord(record);
  }

  async function run(input = {}) {
    const started = await start(input);
    return advance(started.reviewId);
  }

  async function resolveCommitUnknown(input = {}) {
    const reviewId = required(input.reviewId, "reviewId", 500);
    let record = await store.load(reviewId);
    if (!record || record.status !== "paused_commit_unknown"
      || input.definitelyNotStarted !== true) {
      fail("POSTGAME_REVIEW_COMMIT_UNKNOWN_RESOLUTION_INVALID");
    }
    record = await persist(record, (next) => {
      const unknown = next.commitUnknown;
      if (unknown.kind === "review_call") {
        next.calls[unknown.phase].status = "pending";
        next.budgets.reviewCallsUsed -= 1;
      } else {
        const pair = next.pairs.find((entry) => entry.pairId === unknown.pairId);
        pair.arms[unknown.armName].status = "pending";
      }
      next.commitUnknown = null;
      next.status = "running";
    });
    return publicRecord(record);
  }

  async function read(input = {}) {
    const reviewId = required(input.reviewId, "reviewId", 500);
    const record = await store.load(reviewId);
    if (!record) fail("POSTGAME_REVIEW_NOT_FOUND", { reviewId });
    return publicRecord(record);
  }

  return freeze({ start, advance, run, resolveCommitUnknown, read });
}
