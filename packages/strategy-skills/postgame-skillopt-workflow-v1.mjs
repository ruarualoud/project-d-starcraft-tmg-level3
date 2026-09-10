import {
  clone,
  fail,
  freeze,
  hash,
  safe,
  seal,
  verifySeal,
} from "../skill-production/common.mjs";

export const STARCRAFT_TMG_POSTGAME_SKILLOPT_WORKFLOW_VERSION =
  "starcraft_tmg_postgame_skillopt_workflow_v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const DIRECTION = /^(terran_to_zerg|zerg_to_terran)$/u;

function digest(value, field) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!SHA256.test(normalized)) fail("SKILLOPT_HASH_INVALID", { field });
  return normalized;
}

function nonEmpty(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail("SKILLOPT_FIELD_REQUIRED", { field });
  return normalized;
}

function caseDirection(caseId) {
  const match = /^matchup\.(terran_to_zerg|zerg_to_terran)\./u.exec(caseId || "");
  if (!match) fail("SKILLOPT_CASE_DIRECTION_INVALID", { caseId });
  return match[1];
}

function stateSummary(state = {}) {
  return freeze({
    round: state.round,
    phase: state.phase,
    activeSideKey: state.activeSideKey,
    firstPlayerSideKey: state.firstPlayerSideKey,
    scores: clone(state.scores || {}),
    board: {
      widthInches: state.board?.widthInches,
      heightInches: state.board?.heightInches,
      centerMarkers: clone(state.board?.centerMarkers || []),
      terrain: clone(state.board?.terrain || []),
      effectMarkers: clone(state.board?.effectMarkers || []),
      tokens: clone(state.board?.tokens || []),
    },
    pieces: (state.pieces || []).map((piece) => ({
      id: piece.id,
      name: piece.name,
      sideKey: piece.sideKey,
      officialUnitRecordKey: piece.officialUnitRecordKey,
      currentModels: piece.currentModels,
      currentSupply: piece.currentSupply,
      damageMarker: piece.damageMarker,
      statuses: clone(piece.statuses || []),
      activatedPhases: clone(piece.activatedPhases || {}),
      isOnField: piece.isOnField,
      isDestroyed: piece.isDestroyed,
      models: (piece.models || []).map((model) => ({
        id: model.id,
        xInches: model.xInches,
        yInches: model.yInches,
        baseShape: model.baseShape,
        baseWidthInches: model.baseWidthInches,
        baseDepthInches: model.baseDepthInches,
        elevation: model.elevation,
        isOnField: model.isOnField,
        isDestroyed: model.isDestroyed,
      })),
    })),
  });
}

export function compileStarcraftTmgCompletedStrategyEpisodeV1(input = {}) {
  const compiledCase = verifySeal(clone(input.compiledCase));
  const result = verifySeal(clone(input.caseResult));
  if (compiledCase.schema !== "starcraft_compiled_strategy_case_v1"
    || result.schema !== "directed_matchup_final_case_result_v1"
    || result.caseHash !== compiledCase.hash
    || result.caseId !== compiledCase.prompt?.caseId
    || result.rulesReplayPassed !== true
    || result.grade?.legalCandidateSelected !== true
    || result.artifact?.kind !== "decision"
    || result.trainingTruth !== false) {
    fail("SKILLOPT_EPISODE_INPUT_INVALID", { caseId: result.caseId });
  }
  const direction = caseDirection(result.caseId);
  const selectedCandidateId = result.artifact.value?.candidateId;
  const candidate = compiledCase.prompt.candidates?.find((row) =>
    row.candidateId === selectedCandidateId);
  const outcome = compiledCase.evaluation?.outcomes?.find((row) =>
    row.candidateId === selectedCandidateId);
  if (!candidate || !outcome) {
    fail("SKILLOPT_SELECTED_OUTCOME_MISSING", { caseId: result.caseId });
  }
  const preAction = seal({
    schema: `${STARCRAFT_TMG_POSTGAME_SKILLOPT_WORKFLOW_VERSION}.pre-action`,
    caseId: result.caseId,
    direction,
    evaluationSplit: compiledCase.evaluation.split,
    seatKey: compiledCase.prompt.seatKey,
    sourceBinding: clone(compiledCase.prompt.binding.sourceBinding),
    matchBindingHash: compiledCase.prompt.binding.matchBindingHash,
    stateHash: compiledCase.prompt.binding.stateHash,
    stateRevision: compiledCase.prompt.binding.stateRevision,
    legalSpaceHash: compiledCase.prompt.binding.legalSpaceHash,
    observationHash: hash(compiledCase.prompt.observation),
    observation: stateSummary(compiledCase.prompt.observation),
    candidates: clone(compiledCase.prompt.candidates),
    objective: clone(compiledCase.prompt.objective),
    policyAxes: clone(compiledCase.prompt.policyAxes),
    visibility: "declared_player_observation_only",
    outcomesVisibleAtDecisionTime: false,
    hiddenOpponentInformationIncluded: false,
    trainingTruth: false,
  });
  const actualOutcome = seal({
    schema: `${STARCRAFT_TMG_POSTGAME_SKILLOPT_WORKFLOW_VERSION}.actual-outcome`,
    caseId: result.caseId,
    selectedCandidateId,
    selectedCandidateHash: hash(candidate),
    decisionHash: result.grade.decisionHash,
    decisionArtifactHash: result.artifact.hash,
    objectiveVector: clone(outcome.vector),
    afterStateHash: hash(outcome.after),
    afterState: stateSummary(outcome.after),
    preferredByFrozenObjective:
      compiledCase.evaluation.preferredCandidateIds.includes(selectedCandidateId),
    preferenceBasis: compiledCase.evaluation.preferenceBasis,
    rulesReplayPassed: true,
    fullGameEvidence: compiledCase.evaluation.fullGameEvidence === true,
    trainingTruth: false,
  });
  return seal({
    schema: `${STARCRAFT_TMG_POSTGAME_SKILLOPT_WORKFLOW_VERSION}.episode`,
    episodeId: result.caseId,
    direction,
    evaluationSplit: compiledCase.evaluation.split,
    preAction,
    actualOutcome,
    preActionHash: preAction.hash,
    actualOutcomeHash: actualOutcome.hash,
    hindsightBoundary: {
      decisionInputHash: preAction.hash,
      reviewOutcomeHash: actualOutcome.hash,
      outcomeAvailableToOriginalDecision: false,
      reviewMayRewriteOriginalObservation: false,
    },
    sourceProvenance: compiledCase.prompt.provenance,
    reachableFromMatchStartProven:
      compiledCase.prompt.reachableFromMatchStartProven === true,
    fullGameStrategyEffectivenessProven: false,
    eligibleForTraining: false,
    reviewStatus: "raw",
    trainingTruth: false,
  });
}

function validateReview(value, episodes, targetSkills) {
  safe(value);
  if (value?.schema !== "starcraft_tmg_postgame_strategy_reflection_v1"
    || !Array.isArray(value.findings) || !value.findings.length
    || !Array.isArray(value.patches) || !value.patches.length
    || value.trainingTruth !== false) {
    fail("SKILLOPT_REFLECTION_SCHEMA_INVALID");
  }
  const episodeById = new Map(episodes.map((episode) => [episode.episodeId, episode]));
  const targetByHash = new Map(targetSkills.map((skill) => [skill.hash, skill]));
  const findingIds = new Set();
  const findings = value.findings.map((finding) => {
    const findingId = nonEmpty(finding.findingId, "findingId");
    if (findingIds.has(findingId) || !DIRECTION.test(finding.direction || "")
      || !Array.isArray(finding.caseIds) || finding.caseIds.length < 2
      || !Array.isArray(finding.preActionRefHashes)
      || !Array.isArray(finding.outcomeRefHashes)
      || finding.preActionRefHashes.length !== finding.caseIds.length
      || finding.outcomeRefHashes.length !== finding.caseIds.length) {
      fail("SKILLOPT_REFLECTION_FINDING_INVALID", { findingId });
    }
    findingIds.add(findingId);
    finding.caseIds.forEach((caseId, index) => {
      const episode = episodeById.get(caseId);
      if (!episode || episode.direction !== finding.direction
        || episode.preActionHash !== finding.preActionRefHashes[index]
        || episode.actualOutcomeHash !== finding.outcomeRefHashes[index]) {
        fail("SKILLOPT_REFLECTION_EVIDENCE_MISMATCH", { findingId, caseId });
      }
    });
    return freeze({
      findingId,
      direction: finding.direction,
      caseIds: clone(finding.caseIds),
      claimType: nonEmpty(finding.claimType, "claimType"),
      claim: nonEmpty(finding.claim, "claim"),
      preActionRefHashes: finding.preActionRefHashes.map((entry) =>
        digest(entry, "preActionRefHash")),
      outcomeRefHashes: finding.outcomeRefHashes.map((entry) =>
        digest(entry, "outcomeRefHash")),
      limitations: (finding.limitations || []).map((entry) =>
        nonEmpty(entry, "limitation")),
    });
  });
  const patches = value.patches.map((patch) => {
    const targetSkillHash = digest(patch.targetSkillHash, "targetSkillHash");
    const target = targetByHash.get(targetSkillHash);
    if (!target || patch.targetSkillId !== target.skillId
      || patch.operation !== "append_advisory_strategy_note"
      || patch.axis !== "opening_branches"
      || !Array.isArray(patch.evidenceFindingIds)
      || !patch.evidenceFindingIds.length
      || !patch.evidenceFindingIds.every((entry) => findingIds.has(entry))
      || !patch.lesson || !Array.isArray(patch.lesson.when)
      || !patch.lesson.when.length || !Array.isArray(patch.lesson.reviseIf)
      || !patch.lesson.reviseIf.length) {
      fail("SKILLOPT_REFLECTION_PATCH_INVALID", { targetSkillHash });
    }
    return freeze({
      targetSkillHash,
      targetSkillId: target.skillId,
      operation: patch.operation,
      axis: patch.axis,
      lesson: {
        title: nonEmpty(patch.lesson.title, "lesson.title"),
        when: patch.lesson.when.map((entry) => nonEmpty(entry, "lesson.when")),
        guidance: nonEmpty(patch.lesson.guidance, "lesson.guidance"),
        risk: nonEmpty(patch.lesson.risk, "lesson.risk"),
        reviseIf: patch.lesson.reviseIf.map((entry) =>
          nonEmpty(entry, "lesson.reviseIf")),
      },
      evidenceFindingIds: clone(patch.evidenceFindingIds),
    });
  });
  return seal({
    schema: "starcraft_tmg_postgame_strategy_reflection_v1",
    findings,
    patches,
    outcomeUsedForReviewOnly: true,
    originalDecisionInputsRewritten: false,
    automaticPromotion: false,
    fullGameStrategyEffectivenessProven: false,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

function skillOptCandidates(review, targetSkills) {
  const targetByHash = new Map(targetSkills.map((skill) => [skill.hash, skill]));
  return review.patches.map((patch, index) => {
    const parent = targetByHash.get(patch.targetSkillHash);
    return seal({
      schema: "project_d_skillopt_candidate_v1",
      gameId: "starcraft-tmg",
      candidateId: `${parent.skillId}.skillopt-candidate.${index + 1}`,
      parentSkillRef: {
        id: parent.skillId,
        version: parent.version,
        hash: parent.hash,
      },
      proposedVersion: `${parent.version}+skillopt.1`,
      change: clone(patch),
      reflectionHash: review.hash,
      status: "quarantined_candidate",
      requiresIndependentHeldoutEvaluation: true,
      requiresArenaComparison: true,
      mayReplaceAcceptedVersion: false,
      canAffectRules: false,
      runtimeAccepted: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  });
}

export function createInMemoryStarcraftTmgSkillOptStoreV1(input = {}) {
  const entries = new Map();
  if (input.snapshot) {
    const snapshot = verifySeal(clone(input.snapshot));
    if (snapshot.schema !== "starcraft_tmg_skillopt_store_snapshot_v1") {
      fail("SKILLOPT_STORE_SNAPSHOT_INVALID");
    }
    for (const row of snapshot.entries) entries.set(row.stepId, row);
  }
  function get(stepId) {
    return entries.get(stepId) || null;
  }
  function put(stepId, inputHash, value) {
    const existing = entries.get(stepId);
    if (existing) {
      if (existing.inputHash !== inputHash || hash(existing.value) !== existing.valueHash) {
        fail("SKILLOPT_STORE_STEP_DRIFT", { stepId });
      }
      return existing;
    }
    const row = freeze({
      stepId,
      inputHash,
      value: clone(value),
      valueHash: hash(value),
    });
    entries.set(stepId, row);
    return row;
  }
  function snapshot() {
    return seal({
      schema: "starcraft_tmg_skillopt_store_snapshot_v1",
      entries: [...entries.values()].map(clone),
      trainingTruth: false,
    });
  }
  return freeze({ get, put, snapshot });
}

export function createStarcraftTmgPostgameSkillOptWorkflowV1(options = {}) {
  const store = options.store;
  const reflectionProvider = options.reflectionProvider;
  if (typeof store?.get !== "function" || typeof store?.put !== "function") {
    throw new TypeError("SkillOpt store get/put is required");
  }
  if (typeof reflectionProvider?.reflect !== "function") {
    throw new TypeError("reflectionProvider.reflect is required");
  }

  async function run(input = {}) {
    const runId = nonEmpty(input.runId, "runId");
    if (!Array.isArray(input.episodes) || input.episodes.length < 2
      || !Array.isArray(input.targetSkills) || input.targetSkills.length !== 2) {
      fail("SKILLOPT_WORKFLOW_INPUT_INVALID");
    }
    const episodes = input.episodes.map((episode) => verifySeal(clone(episode)));
    const targets = input.targetSkills.map((skill) => verifySeal(clone(skill)));
    const inputHash = hash({
      runId,
      episodeHashes: episodes.map((episode) => episode.hash),
      targetSkillHashes: targets.map((skill) => skill.hash),
    });
    const episodeStepId = `${runId}.episodes`;
    const reviewStepId = `${runId}.reflection`;
    const candidateStepId = `${runId}.skillopt-candidates`;
    store.put(episodeStepId, inputHash, episodes);

    let reviewRow = store.get(reviewStepId);
    let providerCalls = 0;
    if (!reviewRow) {
      const raw = await reflectionProvider.reflect({
        schema: `${STARCRAFT_TMG_POSTGAME_SKILLOPT_WORKFLOW_VERSION}.reflection-request`,
        runId,
        episodes: episodes.map((episode) => ({
          episodeId: episode.episodeId,
          direction: episode.direction,
          evaluationSplit: episode.evaluationSplit,
          preAction: episode.preAction,
          actualOutcome: episode.actualOutcome,
          hindsightBoundary: episode.hindsightBoundary,
        })),
        targetSkillRefs: targets.map((skill) => ({
          id: skill.skillId,
          version: skill.version,
          hash: skill.hash,
        })),
        instruction:
          "Use outcome only for retrospective attribution. Never rewrite what was visible at decision time.",
        automaticPromotion: false,
        trainingTruth: false,
      });
      providerCalls = 1;
      const review = validateReview(raw, episodes, targets);
      reviewRow = store.put(reviewStepId, inputHash, review);
    }
    if (input.pauseAfterStep === "reflection") {
      return freeze({
        ok: false,
        status: "paused_after_completed_reflection",
        resumeCursor: candidateStepId,
        inputHash,
        reflectionHash: reviewRow.value.hash,
        providerCalls,
        trainingTruth: false,
      });
    }
    let candidateRow = store.get(candidateStepId);
    if (!candidateRow) {
      const candidates = skillOptCandidates(reviewRow.value, targets);
      candidateRow = store.put(candidateStepId, inputHash, candidates);
    }
    return freeze({
      ok: true,
      status: "completed",
      inputHash,
      episodeHashes: episodes.map((episode) => episode.hash),
      reflection: reviewRow.value,
      candidates: candidateRow.value,
      resumeCursor: null,
      providerCalls,
      automaticPromotion: false,
      runtimeAccepted: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  return freeze({ run });
}
