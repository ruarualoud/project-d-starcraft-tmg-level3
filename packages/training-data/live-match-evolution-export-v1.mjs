import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "./player-view-trajectory-v1.mjs";
import { createStarcraftTmgTrainingExportRuntimeV1 } from
  "./training-export-v1.mjs";
import { createStarcraftTmgTrainingGovernanceV1 } from
  "./training-governance-v1.mjs";

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
      roundTrips,
      trainingTruth: false,
    });
  }

  return Object.freeze({ compile });
}
