import {materializePostgameResearchReadsV1} from './postgame-research-artifacts-v1.mjs';
import {normalizePostgameLearningContextV1,projectPostgameLearningModelContextV1} from './postgame-development-feedback-v1.mjs';
import {
  clone,
  fail,
  freeze,
  hash,
  safe,
  seal,
  verifySeal,
} from "../skill-production/common.mjs";
import { bindPostgameSkillEditV1, compilePostgameSkillMaterialsV1,
  compilePostgameWikiSourcesV1, createPostgameLearningAssetServiceV1, normalizePostgameLearningScopeV1 }
  from './postgame-learning-assets-v1.mjs';
import { POSTGAME_INCREMENTAL_EDIT_V1, POSTGAME_INCREMENTAL_EDIT_V2 } from './postgame-incremental-skill-edit-v1.mjs';
import { POSTGAME_WIKI_NAVIGATION_V1, POSTGAME_WIKI_NAVIGATION_V2, POSTGAME_WIKI_OPERATION_PHASE_V1, compilePostgameWikiNavigationRequestV1,
  resolvePostgameWikiNavigationChoiceV1, preparePostgameWikiEditReadsV1, normalizePostgameWikiAbstentionV1 } from './postgame-wiki-navigation-v1.mjs';
import { compilePostgameProceduralSkillV1 } from './postgame-procedural-skill-v1.mjs';

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
    const selectedSkill = value.skillHandle
      ? context.targetSkills[compilePostgameSkillMaterialsV1(context.targetSkills)
        .findIndex(s => s.handle === value.skillHandle)] : null;
    if (value.skillHandle && (!selectedSkill
      || (value.targetSkillHash && value.targetSkillHash !== selectedSkill.hash))) {
      fail('POSTGAME_EDIT_SELECTION_CONFLICT');
    }
    const targetSkillHash = required(selectedSkill?.hash || value.targetSkillHash,
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
  value = bindPostgameSkillEditV1(value, context.targetSkills);
  const proposalId = required(value.proposalId || `proposal-${index + 1}`,
    `skillPatches[${index}].proposalId`, 500);
  const findingIds = strings(value.findingIds || [], `${proposalId}.findingIds`);
  const wikiTopicHandles = strings(value.wikiTopicHandles || [], `${proposalId}.wikiTopicHandles`);
  const wikiTopicRefs = wikiTopicHandles.map(handle => {
    const topic = context.wikiMaterial?.topics.find(t => t.handle === handle);
    if (!topic) fail('POSTGAME_WIKI_TOPIC_NOT_DELIVERED');
    return { wikiId: context.wikiMaterial.wikiId, version: context.wikiMaterial.version,
      topic: topic.topic, sources: clone(topic.sources), modelAssessment: topic.modelAssessment };
  });
  const targetSkillHash = required(value.targetSkillHash,
    `${proposalId}.targetSkillHash`, 160);
  const operation = required(value.operation, `${proposalId}.operation`, 100);
  if ((!findingIds.length && !wikiTopicRefs.length) || !context.targetByHash.has(targetSkillHash)
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
    ...(wikiTopicRefs.length ? { wikiTopicRefs } : {}),
    targetSkillHash,
    operation,
    path: required(value.path, `${proposalId}.path`, 1_000),
    value: clone(value.value),
    ...(value.incrementalEdit ? { incrementalEdit: clone(value.incrementalEdit) } : {}),
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
  const assetService = options.assetService || createPostgameLearningAssetServiceV1({ store, now });
  if (!reviewer) throw new TypeError('reviewer is required');
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
    // The navigation workflow supports one historical match as well as a batch.
    // Legacy multi-episode hypothesis review retains its original minimum.
    const singleWiki = ['RW', 'RH'].includes(input.assetScope?.route)
      && input.wikiProposerMode === 'wiki_react_navigation_v2';
    const learningContext = normalizePostgameLearningContextV1(input.learningContext);
    const wholeGameWiki = singleWiki && learningContext?.wholeGames?.length > 0;
    if (!Array.isArray(input.episodes) || input.episodes.length < (wholeGameWiki ? 0 : singleWiki ? 1 : 2)
      || !Array.isArray(input.targetSkills) || !input.targetSkills.length
      || !Array.isArray(input.opponentPolicies) || !input.opponentPolicies.length) {
      fail("POSTGAME_REVIEW_INPUT_INVALID");
    }
    const episodes = input.episodes.map(reviewEpisode);
    const targets = input.targetSkills.map(targetSkill);
    const policies = input.opponentPolicies.map(opponentPolicy);
    const assetScope = input.assetScope ? normalizePostgameLearningScopeV1(input.assetScope) : null;
    const usesWiki = assetScope?.route === 'RW'
      || (assetScope?.route === 'RH' && input.wikiProposerMode != null);
    const wikiProposerMode = input.wikiProposerMode || null;
    const wikiMaintenanceMode = input.wikiMaintenanceMode || null;
    if (wikiMaintenanceMode && (wikiMaintenanceMode !== 'wiki_maintenance_v2'
      || wikiProposerMode !== POSTGAME_WIKI_NAVIGATION_V2)) fail('POSTGAME_WIKI_MAINTENANCE_MODE_INVALID');
    if (wikiProposerMode && (!usesWiki || ![POSTGAME_WIKI_NAVIGATION_V1, POSTGAME_WIKI_NAVIGATION_V2].includes(wikiProposerMode))) {
      fail('POSTGAME_WIKI_PROPOSER_MODE_INVALID');
    }
    if(input.factReview&&(!usesWiki||!input.factReview.issues?.length||!input.factReview.evidence?.length))
      fail('POSTGAME_WIKI_FACT_REVIEW_INVALID');
    const roleCalls = usesWiki ? ['wiki', 'propose'] : REVIEW_CALLS;
    if (roleCalls.some(kind => typeof reviewer[kind] !== 'function')) fail('POSTGAME_REVIEW_ROLE_REQUIRED');
    const parentWikiId = input.parentWikiId || null;
    if (parentWikiId && !usesWiki) fail('POSTGAME_WIKI_ROUTE_INVALID');
    if (parentWikiId) {
      const inherited = await assetService.readWiki({ wikiId: parentWikiId, scope: assetScope });
      const hiddenIds = new Set(episodes.filter(e => e.evaluationSplit !== 'development').map(e => e.episodeId));
      if ([...inherited.topics, ...(inherited.archivedTopics || [])].some(t =>
        t.sources.some(s => hiddenIds.has(s.episodeId)))) fail('POSTGAME_WIKI_HELDOUT_LINEAGE_OVERLAP');
    }
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
    if (!developmentDecisions.length && !wholeGameWiki) fail("POSTGAME_REVIEW_DEVELOPMENT_REQUIRED");
    const maxPairs = integer(input.budgets?.maxExperimentPairs,
      "budgets.maxExperimentPairs", 1, 100_000);
    const inputIdentity = hash({
      episodeHashes: episodes.map((entry) => entry.hash),
      ...(learningContext ? {learningContext} : {}),
      targetSkillHashes: targets.map((entry) => entry.hash),
      policies,
      maxPairs,
      ...(input.factReview ? { factReview: clone(input.factReview) } : {}),
      ...(assetScope ? { assetScope } : {}),
      ...(parentWikiId ? { parentWikiId } : {}),
      ...(wikiProposerMode ? { wikiProposerMode } : {}),
      ...(wikiMaintenanceMode ? { wikiMaintenanceMode } : {}),
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
      phase: usesWiki ? 'wiki' : "discovery",
      createdAt: now(),
      updatedAt: now(),
      inputIdentity,
      episodes,
      ...(learningContext ? {learningContext} : {}),
      targetSkills: targets,
      ...(input.factReview ? { factReview: clone(input.factReview) } : {}),
      ...(assetScope ? { assetScope } : {}),
      ...(usesWiki ? { parentWikiId } : {}),
      ...(wikiMaintenanceMode ? { wikiMaintenanceMode } : {}),
      ...(wikiProposerMode ? { wikiProposerMode, wikiNavigation: {
        protocolVersion: wikiProposerMode,
        turn: 1, delivered: [], lastRead: null, lastError: null,
        noProgressReads: 0, correctionFailures: 0, events: [],
      } } : {}),
      opponentPolicies: policies,
      budgets: {
        maxExperimentPairs: maxPairs,
        maxReviewCalls: wikiProposerMode ? null : roleCalls.length,
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
      calls: Object.fromEntries(roleCalls.map((kind) => [kind, {
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
      targetSkills: record.targetSkills,
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
      const recovered = await reviewer.readCall({ callId: call.callId, kind: call.method || kind });
      if (recovered?.status === "completed") {
        return persist(record, (next) => {
          next.calls[kind] = { ...next.calls[kind], status: "completed",
            result: clone(recovered.result), recoveredAfterRestart: true };
        });
      }
      if (recovered?.status === 'completed_output_truncated') {
        return persist(record, next => {
          next.calls[kind] = { ...next.calls[kind], status: 'failed_output_truncated',
            outputFailure: clone(recovered) };
          next.status = 'paused_output_truncated';
        });
      }
      if (recovered?.status === 'retryable_local_rejection') {
        return persist(record, next => {
          next.calls[kind] = { ...next.calls[kind], status: 'pending',
            localRecovery: clone(recovered), recoveredAfterRestart: true };
          // Keep the failed attempt and count. The next request is an explicit
          // migration of a pre-network rejection, not a fabricated old success.
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

  async function invokeReview(record, kind, payload, method = kind) {
    record = await reconcileCall(record, kind);
    if (record.status !== "running") return record;
    let call = record.calls[kind];
    if (call.status === "completed") return record;
    if (typeof reviewer[method] !== 'function') fail('POSTGAME_REVIEW_ROLE_REQUIRED', { kind: method });
    if (record.budgets.maxReviewCalls !== null
      && record.budgets.reviewCallsUsed >= record.budgets.maxReviewCalls) {
      return persist(record, (next) => {
        next.status = "blocked";
        next.findings.push({ findingId: "review-call-budget-exhausted",
          severity: "High", blocksIntegration: true,
          claim: "The bounded review-call budget was exhausted." });
      });
    }
    record = await persist(record, (next) => {
      next.calls[kind].status = "running";
      if (method !== kind) next.calls[kind].method = method;
      next.calls[kind].requestHash = hash(payload);
      next.budgets.reviewCallsUsed += 1;
    });
    const result = await reviewer[method]({ ...clone(payload),
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
      targetSkills: compilePostgameSkillMaterialsV1(record.targetSkills),
      ...(record.wikiRef ? { researchWiki: await assetService.readWiki({
        wikiId: record.wikiRef.wikiId, scope: record.assetScope }) } : {}),
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

  async function buildWiki(record, { reconsumeCallKind = null } = {}) {
    // A registered factual correction already has a complete parent Wiki.
    // Its cited sources define the repair batch; discovery keeps its full-game batches.
    const factualHandles = record.factReview?.sourceEvidenceHandles;
    const scopedRevision = Boolean(record.parentWikiId && factualHandles);
    const batches = scopedRevision ? [] : (record.learningContext?.wholeGames || []).flatMap(g=>g.rounds.map(r=>({gameId:g.id,round:r.round,handles:r.actionHandles})));
    const cursor = record.wholeGameWikiCursor || 0;
    const parentWikiId = record.wholeGameWikiParentId || record.parentWikiId;
    const previous = parentWikiId ? await assetService.readWiki({wikiId:parentWikiId, scope:record.assetScope}) : null;
    const maintenance = record.wikiMaintenanceMode === 'wiki_maintenance_v2';
    const state = record.wikiMaintenance || { turn: 1, failures: 0, lastError: null, events: [] };
    const kind = reconsumeCallKind || (batches.length ? 'wiki_round_'+cursor+'_edit_'+state.turn : maintenance && state.turn > 1 ? `wiki_edit_${state.turn}` : 'wiki');
    const allSources=compilePostgameWikiSourcesV1(record.episodes,record.learningContext);
    const batch=batches[cursor];
    if(scopedRevision && (!Array.isArray(factualHandles) || !factualHandles.length
      || factualHandles.some(h=>!allSources.some(p=>p.handle===h)))) fail('POSTGAME_WIKI_FACT_SOURCE_UNKNOWN');
    const revisionSourceHandles = new Set(factualHandles || []);
    if(scopedRevision) for(const topic of previous?.topics || []) {
      if(!topic.sources.some(src=>allSources.some(p=>factualHandles.includes(p.handle)&&p.source.decisionId===src.decisionId))) continue;
      for(const source of topic.sources) for(const page of allSources)
        if(page.source.decisionId===source.decisionId) revisionSourceHandles.add(page.handle);
    }
    const sources=scopedRevision?allSources.filter(p=>revisionSourceHandles.has(p.handle))
      :batch?allSources.filter(p=>batch.handles.includes(p.handle)||cursor===0&&!p.source.wholeGameId):allSources;
    const deliveredSourceHandles=scopedRevision?sources.map(p=>p.handle)
      :batch?[...new Set([...(record.wholeGameWikiDelivered||[]),...sources.map(p=>p.handle)])]:null;
    const request = freeze({ role: 'research_wiki_editor',
      ...(scopedRevision?{factSourcePolicy:'affected_topic_sources_v1',factSourceScope:{requested:factualHandles,attached:[...revisionSourceHandles],instruction:'Existing cited actions of affected topics are attached with the factual issue. Reuse only supplied source handles; unaffected topics need not be restated.'}}:{}),
      ...(record.learningContext?{learningContext:projectPostgameLearningModelContextV1(record.learningContext,{includeWholeGameTimeline:false,role:'wiki'})}:{}),
      ...(record.factReview?{factReview:clone(record.factReview),revisionInstruction:'Address the supplied factual issues in the existing topics; revise or supersede their titles rather than leaving erroneous active topics. Preserve historical observations. Do not treat correction as proof of strategy benefit.'}:{}),
      ...(batch?{wholeGameReading:{batch:cursor+1,total:batches.length,gameId:batch.gameId,round:batch.round,completeGameNotYetRead:cursor+1<batches.length,finalStrategySelectionAfterAllRounds:true}}:{}),
      sources: sources.map(({ action, outcome, ...page }) => page.source.wholeGameId?{...page,interpretation:page.interpretation?{authority:page.interpretation.authority,publicDecisionSummary:page.interpretation.publicDecisionSummary,intent:{currentGoal:page.interpretation.intent?.currentGoal,expectedOwnOutcome:page.interpretation.intent?.expectedOwnOutcome},planRef:page.interpretation.planRef}:null}:page),
      previousWiki: previous && maintenance ? { ...previous, archivedTopics: previous.archivedTopics.map(t =>
        ({ handle: t.handle, topic: t.topic, supersededBy: t.supersededBy })) } : previous,
      ...(maintenance ? { protocol: record.wikiMaintenanceMode } : {}),
      ...(maintenance ? { correction: clone(state.lastError) } : {}),
      instruction: 'Analyze the actual action sequences and environment feedback, comparing useful and unsuccessful behaviours. Diagnose possible causes, not just symptoms or error messages. '
        + 'Check how recorded plans and consulted Skills relate to choices. Independently choose meaningful patterns; no required research topic or tactical conclusion. '
        + 'For each pattern, explain the observed sequence, possible mechanism, actionable alternative or reason to retain, conditions and contrary evidence. Update prior patterns with new evidence rather than repeating summaries. '
        + 'A round is a reading batch within a task, not an independent learning experiment. A winning game does not prove every action was good. If the evidence is insufficient, preserve an unresolved hypothesis without inventing a solution. '
        + 'Use observedFacts for action ownership, resolution stage and measured values. A defender casualty selection is not a new attack. '
        + 'Historical model explanations may be wrong; distinguish them from Native events. Score changes are separate from loss ledgers. '
        + 'A single observed roll is not an expected value or proof that an untested alternative is better. '
        + 'Preserve the exact faction, mission, phase and decision conditions of each source. '
        + 'Separate your interpretation from observed facts. Preserve unresolved/contradicted hypotheses. '
        + 'Do not choose game actions, modify Skills, expand the experiment, or claim proven general superiority.'
        + (maintenance ? ' Reuse the same topic title to revise it. Link related or contradictory prior topics by their handles. '
          + 'Merge only genuinely overlapping topics using supersedesTopicHandles; their original observations and revisions remain archived. '
          + 'A contradiction is your research interpretation, not a factual verdict. No edit is also valid.' : ''),
      responseInterface: { wikiEdits: [{ topic: 'behavioural pattern chosen from evidence', conditions: ['explicit conditions'],
        lesson: 'observed sequence, possible cause, alternative or retention, and supporting/contrary evidence; interpretations are not rule facts', limitations: ['limits'], assessment: 'conditional | unresolved | contradicted',
        ...(maintenance ? { relatedTopicHandles: ['optional prior topic handles'],
          contradictsTopicHandles: ['optional prior topic handles'], supersedesTopicHandles: ['optional prior topics to merge'] } : {}),
        sourceEvidenceHandles: ['choose handles from sources'] }],
        retentionReason: 'Explain if no edits are needed' },
      hiddenHeldoutIncluded: false, trainingTruth: false });
    if (maintenance && !record.calls[kind]?.request) record = await persist(record, next => {
      next.calls[kind] = { ...(next.calls[kind] || { status: 'pending', callId: `${next.reviewId}.${kind}`, result: null }),
        method: 'wiki', request: clone(request) };
    });
    record = await invokeReview(record, kind, record.calls[kind]?.request || request, 'wiki');
    if (record.status !== 'running') return record;
    let wikiRef;
    try {
      wikiRef = await assetService.stageWiki({ reviewId: batch?record.reviewId+':round:'+cursor:record.reviewId, scope: record.assetScope,
        parentWikiId, episodes: record.episodes, learningContext:record.learningContext, reply: record.calls[kind].result, deliveredSourceHandles,
        maintenanceVersion: record.wikiMaintenanceMode || null });
    } catch (error) {
      const code = error.code || error.message;
      const semantic = ['POSTGAME_WIKI_EDITS_REQUIRED', 'POSTGAME_WIKI_SEMANTIC_CHOICE_REQUIRED',
        'POSTGAME_WIKI_SOURCE_NOT_DELIVERED', 'POSTGAME_WIKI_TOPIC_CONFLICT',
        'POSTGAME_WIKI_RELATION_NOT_DELIVERED', 'POSTGAME_WIKI_RELATION_SELF',
        'POSTGAME_WIKI_RELATION_CONFLICT', 'POSTGAME_WIKI_MERGE_CONFLICT'];
      // Storage, scope and lifecycle faults remain engineering errors. Only
      // the editor's semantic selection goes back to that same editor.
      if (!maintenance || !semantic.includes(code)) throw error;
      return persist(record, next => {
        next.wikiMaintenance = { ...clone(state), turn: state.turn + 1, failures: state.failures + 1,
          lastError: { code, details: Object.fromEntries(Object.entries(error).filter(([key]) => key !== 'code')),
            choice: clone(next.calls[kind].result) },
          events: [...state.events, { callId: next.calls[kind].callId, outcome: 'semantic_choice_required', code }] };
        if (next.wikiMaintenance.failures >= 3) next.status = 'paused_semantic_correction';
      });
    }
    // WikiSkill proposes from its research knowledge first. It must not be
    // silently turned into RS's pre-edit experiment loop. Independent candidate
    // evaluation is downstream of this quarantined asset boundary.
    return persist(record, next => { next.wikiRef = wikiRef;
      if (maintenance) next.wikiMaintenance = { ...clone(state), lastError: null,
        events: [...state.events, { callId: next.calls[kind].callId, outcome: 'knowledge_saved' }] };
      if(batch){next.wholeGameWikiCursor=cursor+1;next.wholeGameWikiParentId=wikiRef.wikiId;next.wholeGameWikiDelivered=deliveredSourceHandles;}
      if(batch && cursor+1<batches.length)return;
      next.phase = next.wikiProposerMode ? 'wiki_navigation' : 'proposing'; });
  }

  async function navigateWiki(record) {
    const wiki = await assetService.readWiki({ wikiId: record.wikiRef.wikiId, scope: record.assetScope });
    let kind = `wiki_navigation_${record.wikiNavigation.turn}`;
    const oldCall = record.calls[kind];
    // One explicit interface migration of a completed, truncated whole-section
    // reply. Keep its original call, fees and failures; do not retry unknown I/O.
    if (oldCall?.status === 'running' && ![POSTGAME_INCREMENTAL_EDIT_V1,POSTGAME_INCREMENTAL_EDIT_V2].includes(oldCall.request?.editMode)
      && !record.wikiNavigation.incrementalRecovery && reviewer.readCall) {
      const saved = await reviewer.readCall({ callId: oldCall.callId, kind: 'propose' });
      if (saved?.status === 'completed_output_truncated') {
        record = await persist(record, next => {
          const nav = next.wikiNavigation;
          next.calls[kind] = { ...next.calls[kind], status: 'failed_output_truncated', outputFailure: clone(saved) };
          nav.turn++;
          nav.incrementalRecovery = { fromCallId: oldCall.callId, authorTurn: nav.turn,
            editMode: POSTGAME_INCREMENTAL_EDIT_V1, additionalAuthorCalls: 1 };
          nav.events.push({ outcome: 'whole_section_truncation_to_incremental_interface',
            fromCallId: oldCall.callId, modelCall: false });
          nav.lastError = null; nav.pendingProposal = null;
        });
        kind = `wiki_navigation_${record.wikiNavigation.turn}`;
      }
    }
    // One versioned transport change after a definite HTTP rejection. Preserve
    // the failed call and all billing; unknown I/O never authorizes this path.
    if(record.learningContext?.discoveryMode==='autonomous_patterns_v1'&&oldCall?.status==='running'
      &&oldCall.request?.readingTransport!=='paged_workspace_v1'&&!record.wikiNavigation.readWindowRecovery&&reviewer.readCall){
      const saved=await reviewer.readCall({callId:oldCall.callId,kind:'propose'});
      if(saved?.status==='completed_http_rejected'&&saved.httpStatus===400){
        record=await persist(record,next=>{const nav=next.wikiNavigation;
          next.calls[kind]={...next.calls[kind],status:'failed_http_rejected',transportFailure:clone(saved)};
          nav.turn++;nav.readWindowRecovery={fromCallId:oldCall.callId,transport:'paged_workspace_v1',oldBillingPreserved:true};
          nav.events.push({outcome:'known_http_rejection_to_paged_read_window',fromCallId:oldCall.callId,modelCall:false});
        });kind='wiki_navigation_'+record.wikiNavigation.turn;
      }
    }
    const input = { skills: record.targetSkills, episodes: record.episodes,
      wiki, navigation: record.wikiNavigation, assetScope:record.assetScope, learningContext:record.learningContext,
      ...(record.factReview?{factReview:record.factReview}:{}),
      ...(record.wikiMaintenanceMode ? { sourceArchive: await assetService.readWikiSources({
        wikiId: record.wikiRef.wikiId, scope: record.assetScope }) } : {}) };
    const payload = compilePostgameWikiNavigationRequestV1(input);
    if (!record.calls[kind]) record = await persist(record, next => {
      next.calls[kind] = { status: 'pending', callId: `${next.reviewId}.${kind}`, result: null,
        method: 'propose', request: clone(payload) };
    });
    record = await invokeReview(record, kind, record.calls[kind].request, 'propose');
    if (record.status !== 'running') return record;
    let resolved;
    try {
      resolved = resolvePostgameWikiNavigationChoiceV1({ ...input, editMode: record.calls[kind].request.editMode, readingPolicy: record.calls[kind].request.readingPolicy, learnerScope:record.calls[kind].request.learnerScope, choice: record.calls[kind].result });
    } catch (error) {
      if (!String(error.code || error.message).startsWith('POSTGAME_WIKI_CHOICE_')) throw error;
      // A missing semantic choice belongs to the proposer, not the Rules or
      // Wiki editor. Keep its paid reply and the already-read material.
      return persist(record, next => {
        const nav = next.wikiNavigation;
        const repeated=nav.lastError?.code===(error.code||error.message)
          &&hash(nav.lastError.choice)===hash(next.calls[kind].result);
        nav.pendingProposal=null;
        nav.lastError = { code: error.code || error.message,
          details: Object.fromEntries(Object.entries(error).filter(([key]) => key !== 'code')),
          choice: clone(next.calls[kind].result) };
        nav.events.push({ callId: next.calls[kind].callId, outcome: 'semantic_choice_required', error: nav.lastError.code });
        nav.turn++; nav.correctionFailures++;
        if (repeated || nav.patchTargetRecovery || nav.correctionFailures >= 3) next.status = 'paused_semantic_correction';
      });
    }
    resolved = await materializePostgameResearchReadsV1(resolved);
    return persist(record, next => {
      const nav = next.wikiNavigation;
      nav.lastError = null;
      nav.events.push({ callId: next.calls[kind].callId, outcome: resolved.kind,
        ...(resolved.kind === 'read' ? { handles: resolved.results.map(r => r.handle), newPageCount: resolved.newPages.length } : {}) });
      nav.turn++;
      if (resolved.kind === 'read') {
        nav.delivered.push(...clone(resolved.newPages));
        if(resolved.proposedChoice)nav.pendingProposal=clone(resolved.proposedChoice);
        nav.lastRead = { handles: resolved.results.map(r => r.handle),
          reusedHandles: resolved.results.filter(r => r.cached).map(r => r.handle),
          newPageCount: resolved.newPages.length,...(resolved.deferredHandles?{deferredHandles:resolved.deferredHandles}:{}) };
        nav.noProgressReads = resolved.newPages.length||resolved.reattached ? 0 : nav.noProgressReads + 1;
        if (nav.noProgressReads >= 2) next.status = 'paused_no_progress';
        if(nav.deliveryRecovery&&nav.turn>nav.deliveryRecovery.authorTurn)next.status='paused_delivery_confirmation_boundary';
        if(nav.incrementalRecovery&&nav.turn>nav.incrementalRecovery.authorTurn)next.status='paused_incremental_confirmation_boundary';
        if(nav.patchTargetRecovery&&nav.turn>nav.patchTargetRecovery.authorTurn)next.status='paused_patch_target_confirmation_boundary';
      } else {
        nav.pendingProposal=null;
        // This is an engineering-compiled semantic proposal, not another
        // model request. The original candidate and asset consumers stay shared.
        next.calls.propose = { ...next.calls.propose, status: 'completed',
          result: clone(resolved.result), compiledFromNavigation: kind };
        next.phase = 'proposing';
      }
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
    const developmentPairs = record.pairs.filter(pair => pair.evaluationSplit === 'development');
    const payload = freeze({
      schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.judge-request`,
      reviewId: record.reviewId,
      hypotheses: clone(record.hypotheses),
      experimentPairs: developmentPairs.map((pair) => ({
        pairId: pair.pairId,
        hypothesisId: pair.hypothesisId,
        decisionId: pair.decisionId,
        evaluationSplit: pair.evaluationSplit,
        scenarioContext: clone(pair.scenarioContext),
        opponentPolicyId: pair.opponentPolicyId,
        baseline: clone(pair.arms.baseline.result),
        candidate: clone(pair.arms.candidate.result),
      })),
      payoffMatrix: payoffMatrix(developmentPairs, record.hypotheses),
      instruction: "Judge only the paired Rules-replayed evidence. Critical/High block integration; Important/Medium/Low are tracked. Bind every conclusion to its scenario and tested opponent policy.",
      maximumReviewCycles: 3,
      trainingTruth: false,
    });
    record = await invokeReview(record, "judge", payload);
    if (record.status !== "running") return record;
    const ctx = context(record);
    ctx.pairById = new Map(developmentPairs.map(pair => [pair.pairId, pair]));
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
    const wikiMaterial = record.wikiRef ? await assetService.readWiki({
      wikiId: record.wikiRef.wikiId, scope: record.assetScope }) : null;
    const developmentPairIds = new Set(record.pairs.filter((pair) =>
      pair.evaluationSplit === "development").map((pair) => pair.pairId));
    // Filtering IDs is insufficient: mixed findings can contain hidden outcome
    // text. Forward only whole findings whose sources were all development.
    const developmentFindings = record.findings.filter(finding =>
      finding.pairIds?.length && finding.pairIds.every(id => developmentPairIds.has(id)));
    const payload = freeze({
      schema: `${STARCRAFT_TMG_POSTGAME_SCENARIO_REVIEW_RUNTIME_VERSION}.proposal-request`,
      reviewId: record.reviewId,
      targetSkillRefs: record.targetSkills.map((entry) => ({ id: entry.skillId,
        version: entry.version, hash: entry.hash })),
      targetSkills: compilePostgameSkillMaterialsV1(record.targetSkills),
      ...(wikiMaterial ? { researchWiki: wikiMaterial } : {}),
      editInterface: { version: 'semantic_sections_v1',
        fields: ['skillHandle', 'sectionHandle', 'value', 'findingIds', 'wikiTopicHandles', 'applicableWhen', 'reviseIf', 'expectedBenefit', 'knownRisk'],
        hostOwned: ['targetSkillHash', 'path', 'operation', 'proposalId', 'version'],
        noChange: { skillPatches: [], mementos: [], retentionReason: 'Explain why to keep the current assets.' } },
      findings: clone(developmentFindings),
      payoffClassification: clone(record.payoffMatrix?.classifications || []),
      instruction: "Propose the smallest typed strategy-only diff. State explicit applicableWhen and reviseIf conditions. Do not change rules, publish, or use hidden held-out examples.",
      heldoutScenarioContentsIncluded: false,
      automaticPromotion: false,
      trainingTruth: false,
    });
    record = await invokeReview(record, "propose", payload);
    if (record.status !== "running") return record;
    const ctx = context(record);
    ctx.wikiMaterial = wikiMaterial;
    ctx.findingById = new Map(developmentFindings.map((entry) =>
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
          ...(proposal.wikiTopicRefs ? { wikiTopicRefs: clone(proposal.wikiTopicRefs) } : {}),
          payoffMatrixHash: record.payoffMatrix?.hash || null,
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
        mementoId: required(entry.mementoId || `memory-${index + 1}`,
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
    const creations = record.calls.propose.result?.skillCreations || [];
    if (creations.length && (record.wikiProposerMode !== POSTGAME_WIKI_NAVIGATION_V2
      || creations.length !== 1 || candidates.length || mementos.length)) fail('POSTGAME_WIKI_CREATION_SCOPE_INVALID');
    const createdSkills = creations.map(creation => compilePostgameProceduralSkillV1({
      reviewId: record.reviewId, scope: record.assetScope, creation, targetSkills: record.targetSkills, wiki: wikiMaterial }));
    return persist(record, (next) => {
      next.skillOptCandidates = candidates;
      next.mementoCandidates = mementos;
      if (createdSkills.length) next.createdSkills = createdSkills;
      next.status = record.assetScope ? 'running' : next.findingsSummary.blocking > 0
        ? "completed_integration_blocked" : "completed_review_ready";
      next.phase = record.assetScope ? 'candidate_assets' : "completed";
      if (!record.assetScope) next.completedAt = now();
      next.hiddenHeldoutVisibleToSkillProposer = false;
      next.automaticPromotion = false;
      next.eligibleForTraining = false;
    });
  }

  async function stageAssets(record) {
    // Durable candidate first, durable parent successor second. If the caller
    // loses the second commit, the same asset identity is read on cold resume.
    const receipt = await assetService.stageReview({ record, scope: record.assetScope });
    return persist(record, next => {
      next.learningAssetRef = receipt;
      next.phase = 'completed';
      next.status = next.findingsSummary.blocking > 0
        ? 'completed_integration_blocked' : 'completed_review_ready';
      next.completedAt = now();
    });
  }

  async function advance(reviewIdInput) {
    const reviewId = required(reviewIdInput, "reviewId", 500);
    let record = await store.load(reviewId);
    if (!record) fail("POSTGAME_REVIEW_NOT_FOUND", { reviewId });
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki_navigation'
      &&record.learningContext?.discoveryMode==='autonomous_patterns_v1'
      &&record.wikiNavigation?.lastError?.code==='POSTGAME_WIKI_CHOICE_READING_REQUIRED'
      &&!record.wikiNavigation.abstentionRecovery){
      const nav=record.wikiNavigation,kind='wiki_navigation_'+(nav.turn-1),call=record.calls[kind];
      const choice=normalizePostgameWikiAbstentionV1(call?.result);
      if(call?.status==='completed'&&choice?.operation==='retain'){
        const wiki=await assetService.readWiki({wikiId:record.wikiRef.wikiId,scope:record.assetScope});
        const sourceArchive=await assetService.readWikiSources({wikiId:record.wikiRef.wikiId,scope:record.assetScope});
        const resolved=resolvePostgameWikiNavigationChoiceV1({factReview:record.factReview,skills:record.targetSkills,episodes:record.episodes,
          learningContext:record.learningContext,wiki,sourceArchive,navigation:nav,
          editMode:call.request.editMode,readingPolicy:call.request.readingPolicy,
          learnerScope:call.request.learnerScope,choice});
        record=await persist(record,next=>{
          const state=next.wikiNavigation;
          state.abstentionRecovery={version:'explicit_no_candidate_v1',fromCallId:call.callId,
            unreadKinds:clone(state.lastError.details.missingKinds),previousError:clone(state.lastError),
            additionalAuthorCalls:0,originalCountersRetained:true};
          state.events.push({outcome:'explicit_no_candidate_saved',callId:call.callId,modelCall:false});
          state.lastError=null;state.pendingProposal=null;
          next.calls.propose={...next.calls.propose,status:'completed',result:clone(resolved.result),compiledFromNavigation:kind};
          next.status='running';next.phase='proposing';
        });
      }
    }
    // Earlier paged requests exposed edit while original action bodies were
    // unread. Migrate that exact contract once; never reset failures or treat a
    // directory as evidence. A failure under the new phase remains stopped.
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki_navigation'
      &&record.learningContext?.discoveryMode==='autonomous_patterns_v1'
      &&record.wikiNavigation?.lastError?.code==='POSTGAME_WIKI_CHOICE_READING_REQUIRED'
      &&!record.wikiNavigation.operationPhaseRecovery){
      const previous=record.calls['wiki_navigation_'+(record.wikiNavigation.turn-1)];
      if(previous?.status==='completed'&&previous.request?.readingTransport==='paged_workspace_v1'
        &&previous.request?.operationPhaseVersion!==POSTGAME_WIKI_OPERATION_PHASE_V1){
        record=await persist(record,next=>{const nav=next.wikiNavigation;
          nav.operationPhaseRecovery={version:POSTGAME_WIKI_OPERATION_PHASE_V1,fromCallId:previous.callId,
            previousError:clone(nav.lastError),originalCountersRetained:true};
          nav.events.push({outcome:'read_only_operation_contract_restored',fromCallId:previous.callId,modelCall:false});
          next.status='running';
        });
      }
    }
    // An earlier scoped repair omitted citations of the affected parent topics.
    // Deliver their actual frozen sources once; keep every failed reply/count.
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki'
      &&record.factReview?.sourceEvidenceHandles?.length&&record.parentWikiId
      &&record.wikiMaintenance?.lastError?.code==='POSTGAME_WIKI_SOURCE_NOT_DELIVERED'
      &&!record.wikiMaintenance.sourceClosureRecovery){
      const call=Object.values(record.calls).find(c=>c.callId===record.wikiMaintenance.events.at(-1)?.callId);
      if(call?.status==='completed'&&call.request?.factSourcePolicy!=='affected_topic_sources_v1')
        record=await persist(record,next=>{
          next.wikiMaintenance.sourceClosureRecovery={version:'affected_topic_sources_v1',fromCallId:call.callId,
            previousError:clone(next.wikiMaintenance.lastError),additionalMaintenanceCalls:1,originalCountersRetained:true};
          next.status='running';
        });
    }
    // A same-title revision's redundant self-related edge is a Host binding
    // concern. Reconsume its completed reply once, keeping every old failure and
    // call. Other self-contradiction/merge semantics still need the author.
    if (record.status === 'paused_semantic_correction' && record.phase === 'wiki'
      && record.wikiMaintenance?.lastError?.code === 'POSTGAME_WIKI_RELATION_SELF'
      && !record.wikiMaintenance.relationRecovery) {
      const event = record.wikiMaintenance.events.at(-1);
      const pair = Object.entries(record.calls).find(([, call]) => call.callId === event?.callId);
      const [kind, call] = pair || [];
      const titles = new Map((call?.request?.previousWiki?.topics || []).map(t => [t.handle, t.topic]));
      const edits = call?.result?.wikiEdits || [];
      const self = (edit, key) => (edit[key] || []).some(h => titles.get(h) === edit.topic?.trim());
      if (call?.status === 'completed' && edits.some(e => self(e, 'relatedTopicHandles'))
        && edits.every(e => !self(e, 'contradictsTopicHandles') && !self(e, 'supersedesTopicHandles'))) {
        record = await persist(record, next => {
          next.wikiMaintenance.relationRecovery = { version: 'host_revision_self_relation_v1',
            fromCallId: call.callId, previousError: clone(next.wikiMaintenance.lastError),
            additionalAuthorCalls: 0, originalCountersRetained: true };
        });
        record = await buildWiki({ ...record, status: 'running' }, { reconsumeCallKind: kind });
        return publicRecord(record);
      }
    }
    // Reconsume an already-paid semantic choice after source-kind binding is
    // fixed. No new author turn, no reset and no bypass for unread/unlinked data.
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki_navigation'
      &&record.wikiNavigation?.lastError?.code==='POSTGAME_WIKI_CHOICE_SOURCE_NOT_READ'
      &&!record.wikiNavigation.sourceBindingRecovery){
      const kind=`wiki_navigation_${record.wikiNavigation.turn-1}`,call=record.calls[kind];
      const wiki=await assetService.readWiki({wikiId:record.wikiRef.wikiId,scope:record.assetScope});
      const sourceArchive=await assetService.readWikiSources({wikiId:record.wikiRef.wikiId,scope:record.assetScope});
      let resolved=null;try{resolved=resolvePostgameWikiNavigationChoiceV1({factReview:record.factReview,skills:record.targetSkills,episodes:record.episodes,
        learningContext:record.learningContext,wiki,sourceArchive,navigation:record.wikiNavigation,
        editMode:call?.request?.editMode,readingPolicy:call?.request?.readingPolicy,learnerScope:call?.request?.learnerScope,
        choice:record.wikiNavigation.lastError.choice});}catch(e){if(!String(e.code||e.message).startsWith('POSTGAME_WIKI_CHOICE_'))throw e;}
      if(resolved?.kind==='final')record=await persist(record,next=>{
        const nav=next.wikiNavigation;nav.sourceBindingRecovery={version:'read_linked_sources_v1',fromCallId:call.callId,
          previousError:clone(nav.lastError),additionalAuthorCalls:0,originalCountersRetained:true};
        nav.events.push({outcome:'host_bound_read_supporting_sources',callId:call.callId,modelCall:false});
        nav.lastError=null;nav.pendingProposal=null;
        next.calls.propose={...next.calls.propose,status:'completed',result:clone(resolved.result),compiledFromNavigation:kind};
        next.phase='proposing';next.status='running';
      });
    }
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki_navigation'
      &&['POSTGAME_WIKI_CHOICE_TARGET_NOT_READ','POSTGAME_WIKI_CHOICE_SOURCE_NOT_READ'].includes(record.wikiNavigation?.lastError?.code)
      &&!record.wikiNavigation.deliveryRecovery){
      const wiki=await assetService.readWiki({wikiId:record.wikiRef.wikiId,scope:record.assetScope});
      const sourceArchive=await assetService.readWikiSources({wikiId:record.wikiRef.wikiId,scope:record.assetScope});
      const reads=preparePostgameWikiEditReadsV1({skills:record.targetSkills,episodes:record.episodes,wiki,sourceArchive,
        navigation:record.wikiNavigation,choice:record.wikiNavigation.lastError.choice});
      if(reads)record=await persist(record,next=>{
        const nav=next.wikiNavigation;nav.delivered.push(...clone(reads.newPages));nav.pendingProposal=clone(reads.proposedChoice);
        nav.deliveryRecovery={kind:'selected_edit_dependencies_v1',authorTurn:nav.turn,previousError:clone(nav.lastError),additionalAuthorCalls:1};
        nav.events.push({outcome:'host_delivered_selected_edit_dependencies',handles:reads.newPages.map(p=>p.handle),modelCall:false});
        nav.lastError=null;next.status='running';
      });
    }
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki_navigation'
      &&record.wikiNavigation?.lastError?.code==='POSTGAME_WIKI_CHOICE_PATCH_TARGET_NOT_FOUND'
      &&!record.wikiNavigation.patchTargetRecovery
      &&!record.calls[`wiki_navigation_${record.wikiNavigation.turn-1}`]?.request?.patchRepairContext){
      record=await persist(record,next=>{
        const nav=next.wikiNavigation;
        nav.patchTargetRecovery={kind:'missing_patch_target_v1',authorTurn:nav.turn,
          previousError:clone(nav.lastError),additionalAuthorCalls:1};
        nav.pendingProposal=null;next.status='running';
      });
    }
    if(record.status==='paused_semantic_correction'&&record.phase==='wiki_navigation'
      &&record.wikiNavigation?.lastError?.code==='POSTGAME_WIKI_CHOICE_PATCH_TARGET_NOT_FOUND'
      &&!record.wikiNavigation.valueHandleRecovery
      &&record.calls[`wiki_navigation_${record.wikiNavigation.turn-1}`]?.request?.editMode!==POSTGAME_INCREMENTAL_EDIT_V2){
      record=await persist(record,next=>{
        const nav=next.wikiNavigation;
        nav.valueHandleRecovery={kind:'host_text_handles_v2',authorTurn:nav.turn,previousError:clone(nav.lastError),additionalAuthorCalls:1};
        nav.pendingProposal=null;next.status='running';
      });
    }
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === 'wiki') record = await buildWiki(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === 'wiki_navigation') record = await navigateWiki(record);
    if (record.status !== 'running' || record.phase === 'wiki_navigation') return publicRecord(record);
    if (record.phase === "discovery") record = await discover(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "planning") record = await plan(record);
    if (record.phase === "experiments") record = await runExperiments(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "judging") record = await judge(record);
    if (record.status !== "running") return publicRecord(record);
    if (record.phase === "proposing") record = await propose(record);
    if (record.phase === 'candidate_assets') record = await stageAssets(record);
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
