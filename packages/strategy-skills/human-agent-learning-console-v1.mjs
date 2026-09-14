import { clone, fail, freeze, hash, seal, verifySeal } from
  "../skill-production/common.mjs";

export const STARCRAFT_TMG_HUMAN_AGENT_LEARNING_CONSOLE_VERSION =
  "starcraft_tmg_human_agent_learning_console_v1";

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail("LEARNING_CONSOLE_FIELD_REQUIRED", { field });
  return normalized;
}

function episode(value) {
  const record = verifySeal(clone(value));
  const replayPassed = record.actualOutcome?.rulesReplayPassed === true
    || (record.terminal === true
      && record.finalReplayStateHash === record.finalCurrentStateHash);
  if (!replayPassed || record.trainingTruth !== false) {
    fail("LEARNING_CONSOLE_EPISODE_NOT_REPLAY_VERIFIED");
  }
  return record;
}

export function createStarcraftTmgHumanAgentLearningConsoleV1(options = {}) {
  const skillOptWorkflow = options.skillOptWorkflow || null;
  const turnPlanRuntime = options.turnPlanRuntime || null;
  const registry = options.registry || null;
  const episodes = new Map();
  const reflections = new Map();
  const counterfactuals = new Map();
  const publicationReceipts = [];
  const rollbackReceipts = [];

  function addEpisodes(input = {}) {
    if (!Array.isArray(input.episodes) || !input.episodes.length) {
      fail("LEARNING_CONSOLE_EPISODES_REQUIRED");
    }
    const accepted = input.episodes.map(episode);
    for (const record of accepted) {
      const episodeId = required(record.episodeId || record.roomId, "episodeId");
      const existing = episodes.get(episodeId);
      if (existing && existing.hash !== record.hash) {
        fail("LEARNING_CONSOLE_EPISODE_ID_DRIFT", { episodeId });
      }
      episodes.set(episodeId, record);
    }
    return seal({
      schema: `${STARCRAFT_TMG_HUMAN_AGENT_LEARNING_CONSOLE_VERSION}.episode-import`,
      importedEpisodeIds: accepted.map((record) =>
        required(record.episodeId || record.roomId, "episodeId")),
      totalEpisodeCount: episodes.size,
      importSource: required(input.importSource || "manual_console", "importSource"),
      automaticReflectionTriggered: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  async function triggerReflection(input = {}) {
    if (input.confirmedByHuman !== true) {
      fail("LEARNING_CONSOLE_MANUAL_CONFIRMATION_REQUIRED");
    }
    if (!skillOptWorkflow?.run) {
      fail("LEARNING_CONSOLE_SKILLOPT_WORKFLOW_UNAVAILABLE");
    }
    const runId = required(input.runId, "runId");
    const selected = (input.episodeIds || []).map((episodeId) => {
      const record = episodes.get(required(episodeId, "episodeId"));
      if (!record) fail("LEARNING_CONSOLE_EPISODE_NOT_FOUND", { episodeId });
      return record;
    });
    if (selected.length < 2) {
      fail("LEARNING_CONSOLE_MULTI_EPISODE_MINIMUM_NOT_MET");
    }
    const existing = reflections.get(runId);
    const inputHash = hash({ episodeHashes: selected.map((row) => row.hash),
      targetSkillHashes: (input.targetSkills || []).map((row) => row.hash) });
    if (existing) {
      if (existing.inputHash !== inputHash) {
        fail("LEARNING_CONSOLE_REFLECTION_RUN_DRIFT", { runId });
      }
      return existing.result;
    }
    const result = await skillOptWorkflow.run({
      runId,
      episodes: selected,
      targetSkills: input.targetSkills,
      candidateVersionSuffix: input.candidateVersionSuffix,
      ...(input.pauseAfterStep ? { pauseAfterStep: input.pauseAfterStep } : {}),
    });
    reflections.set(runId, freeze({ inputHash, result: clone(result) }));
    return result;
  }

  async function pauseAtAction(input = {}) {
    if (input.confirmedByHuman !== true) {
      fail("LEARNING_CONSOLE_MANUAL_CONFIRMATION_REQUIRED");
    }
    if (!turnPlanRuntime?.dispatch) {
      fail("LEARNING_CONSOLE_COUNTERFACTUAL_RUNTIME_UNAVAILABLE");
    }
    const transition = await turnPlanRuntime.dispatch({
      ...clone(input.turnPlanInput || {}),
      command: "pause_counterfactual",
    });
    const search = transition.counterfactual || transition.result?.search;
    if (!search?.searchId) fail("LEARNING_CONSOLE_COUNTERFACTUAL_NOT_CREATED");
    counterfactuals.set(search.searchId, {
      transitionHash: transition.transitionHash,
      search: clone(search),
    });
    return transition;
  }

  function readCounterfactual(input = {}) {
    const searchId = required(input.searchId, "searchId");
    const record = counterfactuals.get(searchId);
    if (!record) fail("LEARNING_CONSOLE_COUNTERFACTUAL_NOT_FOUND", { searchId });
    if (!turnPlanRuntime?.read || !input.scope) return freeze(clone(record));
    const current = turnPlanRuntime.read({ scope: input.scope });
    return freeze({ ...clone(record), current: clone(current.counterfactual),
      realTrajectoryMutationCalls: 0, trainingTruth: false });
  }

  function publishEvaluatedSet(input = {}) {
    if (input.confirmedByHuman !== true || !input.evaluationRef) {
      fail("LEARNING_CONSOLE_EVALUATED_PUBLICATION_CONFIRMATION_REQUIRED");
    }
    if (!registry?.registerCandidates || !registry?.acceptSet) {
      fail("LEARNING_CONSOLE_REGISTRY_UNAVAILABLE");
    }
    const registration = registry.registerCandidates({
      expectedCatalogRevision: input.expectedCatalogRevision,
      entries: input.entries,
    });
    const acceptance = registry.acceptSet({
      expectedRuntimeRevision: input.expectedRuntimeRevision,
      skillHashes: input.skillHashes,
      evaluationRef: input.evaluationRef,
    });
    publicationReceipts.push(clone(acceptance));
    return freeze({ registration, acceptance, automaticPublication: false,
      trainingTruth: false });
  }

  function rollback(input = {}) {
    if (input.confirmedByHuman !== true || !input.rollbackRef) {
      fail("LEARNING_CONSOLE_ROLLBACK_CONFIRMATION_REQUIRED");
    }
    if (!registry?.rollback) fail("LEARNING_CONSOLE_REGISTRY_UNAVAILABLE");
    const receipt = registry.rollback({
      expectedRuntimeRevision: input.expectedRuntimeRevision,
      targetRuntimeRevision: input.targetRuntimeRevision,
      rollbackRef: input.rollbackRef,
    });
    rollbackReceipts.push(clone(receipt));
    return receipt;
  }

  function read() {
    const reflectionRows = [...reflections.entries()].map(([runId, row]) => ({
      runId,
      inputHash: row.inputHash,
      status: row.result.status,
      candidateCount: row.result.candidates?.length || 0,
      automaticPromotion: false,
    }));
    return seal({
      schema: `${STARCRAFT_TMG_HUMAN_AGENT_LEARNING_CONSOLE_VERSION}.projection`,
      episodeCount: episodes.size,
      episodeIds: [...episodes.keys()],
      reflections: reflectionRows,
      counterfactuals: [...counterfactuals.entries()].map(([searchId, row]) => ({
        searchId, status: row.search.status,
      })),
      publicationCount: publicationReceipts.length,
      rollbackCount: rollbackReceipts.length,
      controls: {
        reflection: "manual_only_multi_episode",
        counterfactual: "manual_pause_async_no_room_mutation",
        publication: "manual_after_independent_evaluation",
        rollback: "explicit_new_registry_revision",
      },
      providerCalls: reflectionRows.reduce((count, row) => count
        + Number(reflections.get(row.runId)?.result.providerCalls || 0), 0),
      automaticPromotion: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  return freeze({
    addEpisodes,
    triggerReflection,
    pauseAtAction,
    readCounterfactual,
    publishEvaluatedSet,
    rollback,
    read,
  });
}
