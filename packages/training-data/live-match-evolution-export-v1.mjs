import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "./player-view-trajectory-v1.mjs";
import { createStarcraftTmgTrainingExportRuntimeV1 } from
  "./training-export-v1.mjs";
import { createStarcraftTmgTrainingGovernanceV1 } from
  "./training-governance-v1.mjs";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgScenarioReviewEpisodeV2 } from
  "../strategy-skills/postgame-scenario-review-runtime-v2.mjs";

export const STARCRAFT_TMG_LIVE_MATCH_EVOLUTION_EXPORT_VERSION =
  "starcraft_tmg_live_match_evolution_export_v1";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function versionedSkillRefsBySeat(experimentCell) {
  if (!object(experimentCell?.seats)) {
    throw new TypeError("experimentCell.seats is required");
  }
  return Object.fromEntries(Object.entries(experimentCell.seats).map(
    ([seatKey, seat]) => {
      if (!Array.isArray(seat?.skillRefs) || seat.skillRefs.length === 0) {
        throw new TypeError(`experimentCell.seats.${seatKey}.skillRefs is required`);
      }
      return [seatKey, clone(seat.skillRefs)];
    },
  ));
}

function splitIdentity(input, experimentCell, episodeId) {
  const scenario = experimentCell.scenario || {};
  const rosterIds = Object.values(scenario.rosterIdsBySeat || {}).sort();
  const seatSkillHashes = Object.values(experimentCell.seats || {})
    .flatMap((seat) => (seat.skillRefs || []).map((entry) => entry.hash))
    .sort();
  return {
    runFamilyId: required(input?.runFamilyId
      || experimentCell.experimentId || episodeId, "splitIdentity.runFamilyId"),
    seedFamilyId: required(input?.seedFamilyId
      || `${experimentCell.rng?.scheme || "rng"}:${experimentCell.rng?.seed || "seed"}`,
    "splitIdentity.seedFamilyId"),
    mirrorFamilyId: required(input?.mirrorFamilyId
      || `${scenario.mapId || "map"}:${scenario.missionId || "mission"}:unmirrored`,
    "splitIdentity.mirrorFamilyId"),
    rosterVariantFamilyId: required(input?.rosterVariantFamilyId
      || rosterIds.join(":") || `${episodeId}:rosters`,
    "splitIdentity.rosterVariantFamilyId"),
    opponentSnapshotFamilyId: required(input?.opponentSnapshotFamilyId
      || seatSkillHashes.join(":") || `${episodeId}:skills`,
    "splitIdentity.opponentSnapshotFamilyId"),
  };
}

function ref(id, version, valueOrHash) {
  return {
    id: required(id, "ref.id"),
    version: required(version, "ref.version"),
    hash: /^[a-f0-9]{64}$/u.test(String(valueOrHash || ""))
      ? String(valueOrHash)
      : hashStarcraftTmgContract(valueOrHash),
  };
}

function snapshotRef(value, field, fallbackVersion) {
  if (object(value) && value.id && value.version && value.hash) {
    return ref(value.id, value.version, value.hash);
  }
  const identity = required(object(value)
    ? value.id || value.model || value.promptPack || value.name
    : value, field);
  return ref(`${field}:${identity}`, object(value)
    ? value.version || fallbackVersion : fallbackVersion, value);
}

function skillSetRef(experimentCell, seatKey) {
  const skillRefs = experimentCell.seats?.[seatKey]?.skillRefs || [];
  return ref(
    `${experimentCell.experimentId}:${seatKey}:skill-set`,
    experimentCell.versions?.strategy || "strategy-snapshot-v1",
    { seatKey, skillRefs },
  );
}

function scenarioContext(step, experimentCell, scalePoints) {
  const state = step.actorInput.viewerState || {};
  const pieces = Array.isArray(state.pieces) ? state.pieces : [];
  return {
    missionId: experimentCell.scenario.missionId,
    mapId: experimentCell.scenario.mapId,
    scalePoints,
    round: Number(state.round || 0),
    phase: String(state.phase || "unknown"),
    actingSeat: step.toPlay,
    initiativeSeat: state.initiativeSideKey
      || state.firstActorSideKey || state.firstPlayerSideKey || null,
    scoreBySeat: clone(state.scores || {}),
    factionBySeat: Object.fromEntries(Object.entries(
      experimentCell.seats || {},
    ).map(([seatKey, seat]) => [seatKey, seat.factionRecordKey])),
    rosterArchetypeBySeat: clone(
      experimentCell.scenario.rosterIdsBySeat || {},
    ),
    positionFingerprint: hashStarcraftTmgContract({
      board: state.board || null,
      pieces: pieces.map((piece) => ({
        id: piece.id || piece.pieceId || null,
        sideKey: piece.sideKey || null,
        position: piece.position || null,
        models: (piece.models || []).map((model) => ({
          id: model.id || model.modelId || null,
          position: model.position || {
            xInches: model.xInches ?? null,
            yInches: model.yInches ?? null,
            elevation: model.elevation || null,
          },
          base: {
            shape: model.baseShape || null,
            widthInches: model.baseWidthInches ?? null,
            depthInches: model.baseDepthInches ?? null,
          },
          isDestroyed: model.isDestroyed === true,
          isOnField: model.isOnField !== false,
        })),
      })),
    }),
    resourceFingerprint: hashStarcraftTmgContract({
      supply: state.supply || state.supplyBySeat || null,
      cardResources: state.cardResources || null,
      scores: state.scores || null,
    }),
    statusFingerprint: hashStarcraftTmgContract({
      round: state.round ?? null,
      phase: state.phase || null,
      activeSideKey: state.activeSideKey || null,
      pieces: pieces.map((piece) => ({
        id: piece.id || piece.pieceId || null,
        statuses: piece.statuses || piece.status || null,
        damageMarker: piece.damageMarker ?? null,
        currentModels: piece.currentModels ?? null,
      })),
    }),
    tags: [
      `action:${step.actionEncoding.actionType}`,
      `round:${Number(state.round || 0)}`,
      `phase:${String(state.phase || "unknown")}`,
      `map:${experimentCell.scenario.mapId}`,
      `mission:${experimentCell.scenario.missionId}`,
    ],
  };
}

function publicDecisionSummary(step) {
  const binding = step.decisionBinding || {};
  return {
    summary: clone(binding.publicDecisionSummary || null),
    openedPlan: clone(binding.plan || null),
    assessment: clone(binding.assessment || null),
    planRevision: clone(binding.planRevision || null),
    actionIntent: clone(binding.intent || null),
    hiddenChainOfThoughtStored: false,
  };
}

function buildReviewEpisode(trajectory, experimentCell, reviewContext = {}) {
  const modelSnapshots = reviewContext.modelSnapshotsBySeat || {};
  const promptPacks = reviewContext.promptPackSnapshotsBySeat || {};
  const scalePoints = Number(reviewContext.scalePoints
    ?? experimentCell.scenario?.scalePoints);
  if (!Number.isSafeInteger(scalePoints) || scalePoints < 1) {
    throw new TypeError("reviewContext.scalePoints is required");
  }
  const seatKeys = Object.keys(experimentCell.seats || {});
  const skillSnapshotsBySeat = Object.fromEntries(seatKeys.map((seatKey) =>
    [seatKey, skillSetRef(experimentCell, seatKey)]));
  const modelSnapshotsBySeat = Object.fromEntries(seatKeys.map((seatKey) =>
    [seatKey, snapshotRef(modelSnapshots[seatKey],
      `model:${seatKey}`, "model-snapshot-v1")]));
  const promptPackSnapshotsBySeat = Object.fromEntries(seatKeys.map((seatKey) =>
    [seatKey, snapshotRef(promptPacks[seatKey],
      `prompt-pack:${seatKey}`, "prompt-pack-v1")]));
  const decisions = trajectory.steps.map((step) => ({
    decisionId: `${trajectory.episodeId}:decision:${step.stepIndex + 1}`,
    sequence: step.stepIndex + 1,
    actingSeat: step.toPlay,
    checkpoint: {
      checkpointId: `${trajectory.roomId}:revision:${step.revision.before}`,
      stateRevision: step.revision.before,
      stateHash: step.actorInput.stateHash,
      rngCursor: hashStarcraftTmgContract({
        scheme: experimentCell.rng.scheme,
        seed: experimentCell.rng.seed,
        privateJournalSequence: step.source.privateJournalSequence,
        preStateHash: step.actorInput.stateHash,
      }),
      replayRef: ref(
        `${trajectory.roomId}:accepted:${step.source.privateJournalSequence}`,
        step.source.receiptSchemaVersion,
        step.outcome.journalHash,
      ),
    },
    scenarioContext: scenarioContext(step, experimentCell, scalePoints),
    observationRef: ref(
      `${trajectory.episodeId}:observation:${step.stepIndex + 1}`,
      step.actorInput.schemaVersion,
      step.actorInput,
    ),
    legalSpaceRef: ref(
      `${trajectory.episodeId}:legal-space:${step.stepIndex + 1}`,
      step.actorInput.legalSpace.schemaVersion,
      step.actorInput.legalSpaceHash,
    ),
    actionSpaceRef: ref(
      `${trajectory.episodeId}:action-space:${step.stepIndex + 1}`,
      step.actionEncoding.schemaVersion,
      step.actionEncoding,
    ),
    actualAction: {
      proposal: clone(step.action.proposal),
      appliedAction: clone(step.action.appliedAction),
      actionEncoding: clone(step.actionEncoding),
    },
    actualOutcome: {
      events: clone(step.outcome.events),
      postStateHash: step.outcome.postStateHash,
      targets: clone(step.targets),
    },
    skillSnapshotsBySeat,
    modelSnapshotsBySeat,
    promptPackSnapshotsBySeat,
    publicDecisionSummary: publicDecisionSummary(step),
  }));
  return createStarcraftTmgScenarioReviewEpisodeV2({
    episodeId: trajectory.episodeId,
    evaluationSplit: reviewContext.evaluationSplit || "development",
    matchMode: experimentCell.mode,
    versions: {
      data: trajectory.versions.data.version,
      rules: trajectory.versions.rules.version,
      actionSpace: trajectory.versions.actionSpace.version,
      harness: experimentCell.versions.harness,
    },
    rng: clone(experimentCell.rng),
    decisions,
    terminalEvidence: {
      terminal: trajectory.terminal.terminal === true,
      replayMatchesCurrent:
        trajectory.sourceLineage.deterministicReplayMatchesCurrent === true,
      trajectoryHash: trajectory.contentIdentity.hash,
      finalStateHash: trajectory.sourceLineage.finalStateHash,
      journalTailHash: trajectory.sourceLineage.journalTailHash,
    },
  });
}

export function createStarcraftTmgLiveMatchEvolutionExportV1(options = {}) {
  const compiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
    authorityEngine: options.authorityEngine,
    roomStore: options.roomStore,
  });
  const governance = createStarcraftTmgTrainingGovernanceV1({
    trajectoryVerifier: compiler.verify,
  });
  const exportRuntime = createStarcraftTmgTrainingExportRuntimeV1({
    trajectoryVerifier: compiler.verify,
  });

  async function compile(input = {}) {
    const roomId = required(input.roomId, "roomId");
    const episodeId = required(input.episodeId || roomId, "episodeId");
    if (!object(input.experimentCell)) {
      throw new TypeError("experimentCell is required");
    }
    const trajectory = await compiler.compile({
      roomId,
      episodeId,
      splitIdentity: splitIdentity(input.splitIdentity,
        input.experimentCell, episodeId),
      decisionBindings: clone(input.decisionBindings || []),
      versionedStrategySkillRefsBySeat:
        versionedSkillRefsBySeat(input.experimentCell),
      experimentCell: clone(input.experimentCell),
    });
    if (input.requireTerminal !== false
      && trajectory.terminal?.terminal !== true) {
      throw Object.assign(new Error("terminal authoritative episode is required"), {
        code: "LIVE_MATCH_EVOLUTION_EPISODE_NOT_TERMINAL",
      });
    }
    const audit = governance.auditTrajectory(trajectory);
    if (!audit.passed) {
      throw Object.assign(new Error(
        "live match trajectory contains Critical/High governance findings"), {
        code: "LIVE_MATCH_EVOLUTION_GOVERNANCE_BLOCKED",
        findings: audit.findings.filter((entry) => entry.integrationBlocking),
      });
    }
    const eligibility = governance.assessEligibility({
      trajectory,
      audit,
      independentApproval: input.independentApproval || null,
      infrastructureFailure: input.infrastructureFailure === true,
    });
    const ndjson = exportRuntime.exportNdjson(trajectory);
    const muzero = exportRuntime.exportMuzero(trajectory);
    const rlds = exportRuntime.exportRlds(trajectory);
    const roundTrips = {
      ndjson: exportRuntime.verifyRoundTrip(trajectory,
        exportRuntime.importNdjson(ndjson)),
      muzero: exportRuntime.verifyRoundTrip(trajectory,
        exportRuntime.importMuzero(muzero)),
      rlds: exportRuntime.verifyRoundTrip(trajectory,
        exportRuntime.importRlds(rlds)),
    };
    const reviewEpisode = buildReviewEpisode(trajectory,
      input.experimentCell, input.reviewContext);
    const summary = deepFreeze({
      schemaVersion: STARCRAFT_TMG_LIVE_MATCH_EVOLUTION_EXPORT_VERSION,
      roomId,
      episodeId,
      trajectoryHash: trajectory.contentIdentity.hash,
      stepCount: trajectory.steps.length,
      terminal: trajectory.terminal?.terminal === true,
      winnerSeat: trajectory.terminal?.winnerSeat || null,
      deterministicReplayMatchesCurrent:
        trajectory.sourceLineage.deterministicReplayMatchesCurrent === true,
      exactAcceptedTransitionLabels: trajectory.steps.length,
      sampledParameterizedAlternativesAreTrainingTruth: false,
      advisoryFormationOptionsAreTrainingTruth: false,
      hiddenChainOfThoughtIncluded: false,
      governance: {
        passed: audit.passed,
        criticalHighFindings: audit.counts.blocking,
        mediumFindings: audit.counts.medium,
      },
      eligibility: {
        technicalChecksPassed:
          eligibility.technicalEligibilityChecksPassed,
        independentApprovalPresent:
          eligibility.independentTrainingApprovalPresent,
        eligibleForTraining: eligibility.eligibleForTraining,
        reasons: clone(eligibility.reasons),
      },
      formats: {
        ndjson: roundTrips.ndjson.exactCanonicalParity === true,
        muzero: roundTrips.muzero.exactCanonicalParity === true,
        rlds: roundTrips.rlds.exactCanonicalParity === true,
      },
      postgameReviewEpisodeReady: true,
      postgameReviewEpisodeHash: reviewEpisode.hash,
      postgameReviewDecisionCount: reviewEpisode.decisions.length,
      automaticSkillPromotion: false,
      automaticTrainingApproval: false,
      trainingTruth: false,
    });
    return deepFreeze({
      summary,
      trajectory,
      audit,
      eligibility,
      exports: { ndjson, muzero, rlds },
      reviewEpisode,
      roundTrips,
      trainingTruth: false,
    });
  }

  return Object.freeze({ compile });
}
