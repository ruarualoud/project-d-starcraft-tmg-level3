#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { estimateStarcraftTmgAttackProbabilityV1 } from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { isOfficialCurrentProductUnitOnCreepV1 } from
  "../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs";
import { isOfficialSelectedRosterUnitOnCreepV1 } from
  "../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RUN = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1/20260921061209346");
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
const skipForkSmoke = process.argv.includes("--skip-fork-smoke");
const runDirectory = path.resolve(ROOT, runArgument
  ? runArgument.slice("--run-directory=".length) : DEFAULT_RUN);
const runId = path.basename(runDirectory);
const privateState = JSON.parse(await readFile(path.join(runDirectory,
  "runner-private.json"), "utf8"));
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec: createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${runId}`,
    trustLevel: "development_persistent",
  }),
});

function sourceDomain(value) {
  return value?.sourceDomain || value;
}

function resetForAssault(source) {
  const state = structuredClone(source);
  state.phase = "assault";
  state.stage = "unit_activation";
  state.activeSideKey = "player1";
  state.pendingAction = null;
  state.pendingReactionWindow = null;
  state.selectedRosterActivationWindow = null;
  delete state.pendingCurrentProductRangedSequence;
  delete state.pendingCurrentProductRangedCasualtyChoice;
  state.players.player1.passedPhases = {
    ...(state.players.player1.passedPhases || {}), assault: false,
  };
  state.phaseFirstActorByRound = {
    ...(state.phaseFirstActorByRound || {}),
    [`${state.round}:assault`]: {
      round: Number(state.round), phase: "assault",
      markerHolderSideKey: state.firstPlayerSideKey,
      chosenFirstActorSideKey: "player1",
    },
  };
  return state;
}

async function verifyForkServer(throughRevision) {
  const startedAt = performance.now();
  const child = spawn(process.execPath, [
    path.join(ROOT, "scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs"),
    `--fork-source-directory=${runDirectory}`,
    `--fork-through-revision=${throughRevision}`,
    "--fork-preflight-only",
  ], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let stdout = "";
  const startup = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`SLICE265_FORK_SMOKE_TIMEOUT:${stderr}`));
    }, 360_000);
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      for (const line of stdout.split(/\r?\n/gu).filter(Boolean)) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.schemaVersion
            === "ticket25_slice265_fork_preflight_v1") {
            clearTimeout(timeout);
            resolve(parsed);
            return;
          }
        } catch {}
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`SLICE265_FORK_SMOKE_EXIT_${code}:${stderr}`));
      }
    });
  });
  await new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      if (child.exitCode === 0) resolve();
      else reject(new Error(`SLICE265_FORK_SMOKE_EXIT_${child.exitCode}:${stderr}`));
      return;
    }
    child.once("exit", (code) => code === 0 ? resolve()
      : reject(new Error(`SLICE265_FORK_SMOKE_EXIT_${code}:${stderr}`)));
  });
  assert.equal(startup.providerCalls, 0);
  assert.equal(startup.providerStacksCreated, false);
  assert.equal(startup.webServerCreated, false);
  assert.equal(startup.stateRevision, throughRevision);
  assert.equal(startup.fork?.throughStateRevision, throughRevision);
  assert.equal(startup.fork?.replayedTransitions?.length, throughRevision);
  assert.equal(startup.fork?.invalidSuffixCopied, false);
  assert(startup.fork?.continuitySeeds?.some((entry) =>
    entry.sideKey === "player1"
      && entry.status === "seeded_for_reassessment"));
  return {
    branchRoomId: startup.roomId,
    branchDataDirectory: startup.dataDirectory,
    replayedTransitionCount: startup.fork.replayedTransitions.length,
    continuitySeedCount: startup.fork.continuitySeeds.length,
    elapsedMs: Math.round(performance.now() - startedAt),
    providerStacksCreated: false,
    webServerCreated: false,
  };
}

try {
  const aggregate = await roomStore.loadRoom(privateState.roomId);
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: { seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [] },
    maxAppliedActions: 180,
    enableSpatialPreexecution: false,
    autoDrive: false,
    attachBot: false,
    issueHumanRecovery: false,
    roomStore,
    refereeCrypto: createStarcraftTmgRefereeCrypto({
      privateKey: privateState.refereePrivateKeyPem,
      publicKey: privateState.refereePublicKeyPem,
      hmacSecret: privateState.refereeHmacSecret,
      keyId: `ticket23-slice248-referee-${runId}`,
      trustLevel: "development_persistent",
    }),
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
    botDecisionPort: { async decide() {
      throw new Error("FOCUSED_GATE_MUST_NOT_CALL_PROVIDER");
    } },
    player1DecisionPort: { async decide() {
      throw new Error("FOCUSED_GATE_MUST_NOT_CALL_PROVIDER");
    } },
  });
  const forkSmoke = skipForkSmoke ? {
    skippedForFocusedRuleProbeDiagnosis: true,
    providerStacksCreated: false,
    webServerCreated: false,
  } : await verifyForkServer(4);
  const omegaCreationRoundState = structuredClone(aggregate.envelope.state);
  const omega = omegaCreationRoundState.pieces.find((piece) =>
    piece.officialUnitRecordKey === "army_units:omega_worm");
  assert(omega, "the preserved failed suffix must contain the created Omega Worm");
  assert.equal(Number(omega.structureRules.specialAbilitiesDisabledThroughRound),
    Number(omegaCreationRoundState.round));
  const creationRoundLegal = fixture.rulesRuntime.enumerate(
    omegaCreationRoundState, { sideKey: "player2", includeDisabled: false });
  assert.equal(creationRoundLegal.parameterDomains.some((entry) =>
    sourceDomain(entry).effectKind === "omega_network_deploy"), false,
  "new Omega Worm must not deploy reserves in its creation round");
  const isolatedCreepState = structuredClone(omegaCreationRoundState);
  isolatedCreepState.board.tokens = [];
  const isolatedOmega = isolatedCreepState.pieces.find((piece) =>
    piece.id === omega.id);
  const creepProbe = isolatedCreepState.pieces.find((piece) =>
    piece.sideKey === "player2" && piece.isOnField === true
      && piece.isStructure !== true && piece.combatTags?.includes("ground"));
  assert(creepProbe, "creation-round Creep source test needs a friendly Ground Unit");
  for (const model of creepProbe.models.filter((entry) =>
    entry.isDestroyed !== true)) {
    model.xInches = isolatedOmega.models[0].xInches;
    model.yInches = isolatedOmega.models[0].yInches;
  }
  assert.equal(isOfficialSelectedRosterUnitOnCreepV1(
    isolatedCreepState, creepProbe), false,
  "new Omega Worm must not provide selected-roster Creep in its creation round");
  assert.equal(isOfficialCurrentProductUnitOnCreepV1(
    isolatedCreepState, creepProbe), false,
  "new Omega Worm must not provide battlefield-asset Creep in its creation round");

  const nextRoundEquivalent = structuredClone(omegaCreationRoundState);
  const enabledOmega = nextRoundEquivalent.pieces.find((piece) =>
    piece.id === omega.id);
  enabledOmega.structureRules.specialAbilitiesDisabledThroughRound =
    Number(nextRoundEquivalent.round) - 1;
  const enabledCreepState = structuredClone(nextRoundEquivalent);
  const enabledCreepOmega = enabledCreepState.pieces.find((piece) =>
    piece.id === omega.id);
  const enabledProbe = enabledCreepState.pieces.find((piece) =>
    piece.id === creepProbe.id);
  for (const model of enabledProbe.models.filter((entry) =>
    entry.isDestroyed !== true)) {
    model.xInches = enabledCreepOmega.models[0].xInches;
    model.yInches = enabledCreepOmega.models[0].yInches;
  }
  enabledCreepState.board.tokens = [];
  assert.equal(isOfficialSelectedRosterUnitOnCreepV1(
    enabledCreepState, enabledProbe), true,
  "Omega Worm must resume selected-roster Creep after its creation round");
  assert.equal(isOfficialCurrentProductUnitOnCreepV1(
    enabledCreepState, enabledProbe), true,
  "Omega Worm must resume battlefield-asset Creep after its creation round");
  const enabledLegal = fixture.rulesRuntime.enumerate(nextRoundEquivalent, {
    sideKey: "player2", includeDisabled: false,
  });
  const reserveDeploy = enabledLegal.parameterDomains.filter((entry) =>
    sourceDomain(entry).effectKind === "omega_network_deploy")
    .sort((left, right) => {
      const leftPiece = nextRoundEquivalent.pieces.find((piece) =>
        piece.id === sourceDomain(left).pieceId);
      const rightPiece = nextRoundEquivalent.pieces.find((piece) =>
        piece.id === sourceDomain(right).pieceId);
      return Number(leftPiece?.currentModels || Number.MAX_SAFE_INTEGER)
        - Number(rightPiece?.currentModels || Number.MAX_SAFE_INTEGER)
        || sourceDomain(left).pieceId.localeCompare(
          sourceDomain(right).pieceId);
    })[0];
  assert(reserveDeploy,
    "an older enabled Omega Worm must expose a reserve deployment");
  const formationProbeState = structuredClone(nextRoundEquivalent);
  const probeOmega = formationProbeState.pieces.find((piece) =>
    piece.id === omega.id);
  const probeGoliath = formationProbeState.pieces.find((piece) =>
    piece.id === "player1-goliath-1");
  assert(probeOmega && probeGoliath,
    "formation risk probe requires Omega Worm and Goliath");
  for (const piece of formationProbeState.pieces) {
    if ([probeOmega.id, probeGoliath.id].includes(piece.id)) continue;
    piece.isOnField = false;
    for (const model of piece.models || []) model.isOnField = false;
  }
  for (const model of probeOmega.models.filter((entry) =>
    entry.isDestroyed !== true)) {
    model.isOnField = true;
    model.xInches = 18;
    model.yInches = 18;
    model.elevation = "ground";
    model.supportTerrainIds = [];
    model.adjacentAccessPointIds = [];
  }
  probeOmega.isOnField = true;
  for (const model of probeGoliath.models.filter((entry) =>
    entry.isDestroyed !== true)) {
    model.isOnField = true;
    model.xInches = 30;
    model.yInches = 18;
    model.elevation = "ground";
    model.supportTerrainIds = [];
    model.adjacentAccessPointIds = [];
  }
  probeGoliath.isOnField = true;
  formationProbeState.board.terrain = [];
  formationProbeState.board.accessPoints = [];
  const formation = searchStarcraftTmgLegalFormationOptionsV1({
    state: formationProbeState,
    domain: reserveDeploy,
    request: {
      maximumOptions: 4,
      tacticalPurpose:
        "compare objective access against exact incoming stationary fire",
      formationObjectives: [
        { kind: "avoid_threat", weight: 5,
          targetIds: ["player1-goliath-1"] },
        { kind: "disperse", weight: 3, targetIds: [] },
      ],
    },
    instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
    instantiateOptions: {
      matchBinding: aggregate.envelope.matchBinding,
    },
  });
  assert(formation.optionCount > 0,
    `enabled Omega Worm deployment must retain legal formation options:${
      JSON.stringify({
        pieceId: sourceDomain(reserveDeploy).pieceId,
        actionType: sourceDomain(reserveDeploy).actionType,
        effectKind: sourceDomain(reserveDeploy).effectKind,
        searchCoverage: formation.searchCoverage,
        failureCounts: formation.failureCounts,
      })}`);
  const incomingRows = formation.formationOptions.map((option) =>
    option.relationshipComparison?.incomingStationaryFireEstimate);
  assert(incomingRows.some((entry) =>
    entry?.status === "current_position_stationary_attacks_estimated"
      && entry.attackEstimates?.some((estimate) =>
        estimate.targetUnitId === sourceDomain(reserveDeploy).pieceId
          && Array.isArray(estimate.outcomes.lossStateDistribution)
          && estimate.outcomes.lossStateDistribution.length > 0)),
  `formation options in the Goliath fire zone must expose casualty and Supply loss states:${
    JSON.stringify(incomingRows.map((entry) => ({
      status: entry?.status || null,
      reason: entry?.reason || null,
      attackEstimateCount: entry?.attackEstimateCount ?? null,
      disabledAttackDiagnostics: entry?.disabledAttackDiagnostics || [],
      targets: (entry?.attackEstimates || []).map((estimate) => ({
        targetUnitId: estimate.targetUnitId,
        lossStateCount: estimate.outcomes?.lossStateDistribution?.length ?? null,
      })),
    })))}`);
  assert(formation.formationOptions.some((option) =>
    option.relationshipComparison?.relationships?.some((relationship) =>
      relationship.targetId === "player1-goliath-1"
        && relationship.enemyMoveThenAttackProfileKeys?.length > 0)),
  "Goliath move-then-attack profiles must remain visible as additional risk");
  const moveThenFireRows = formation.formationOptions.map((option) =>
    option.relationshipComparison?.incomingMoveThenFireEstimate);
  assert(moveThenFireRows.some((entry) =>
    entry?.opponentMovementRiskIncluded === true
      && entry.unknownPathOrLosNeverPromotedToSafeOrZero === true
      && entry.threats?.some((threat) =>
        threat.enemyUnitId === "player1-goliath-1"
          && Number.isFinite(threat.minimumMovementRequiredMilliInches)
          && Number.isFinite(threat.printedAttackDiceAtCurrentContributorCount))),
  `move-then-fire must expose bounded reach and conditional firepower:${
    JSON.stringify(moveThenFireRows)}`);

  const assaultState = resetForAssault(aggregate.envelope.state);
  const assaultLegal = fixture.rulesRuntime.enumerate(assaultState, {
    sideKey: "player1", includeDisabled: false,
  });
  const attackDomain = assaultLegal.parameterDomains.find((entry) => {
    const domain = sourceDomain(entry);
    return domain.pieceId === "player1-goliath-1"
      && domain.parameterSchema?.targetUnitId?.enum?.some((targetId) =>
        String(targetId).includes("swarmling"));
  });
  assert(attackDomain, "Goliath must have a ranged domain against Swarmling");
  const attack = estimateStarcraftTmgAttackProbabilityV1({
    state: assaultState,
    domain: attackDomain,
    parameters: {
      targetUnitId: sourceDomain(attackDomain).parameterSchema
        .targetUnitId.enum.find((targetId) => String(targetId)
          .includes("swarmling")),
    },
    sampleBudget: 216,
  });
  assert.equal(attack.outcomes.currentSupplyBefore, 1);
  assert.equal(attack.reactionOpportunitySet.status,
    "exact_current_reaction_choice_sets");
  assert.equal(attack.reactionOpportunitySet.unknownWindowCount, 0);
  assert.equal(attack.reactionOpportunitySet.windows.length, 5);
  assert(attack.reactionOpportunitySet.windows.every((window) =>
    window.oneReactionPerPlayerPerActivation === true
      && window.choicesMutuallyExclusivePerSidePerActivation === true));
  assert(Array.isArray(attack.outcomes.lossStateDistribution));
  assert(attack.outcomes.lossStateDistribution.every((entry) =>
    Array.isArray(entry.possibleCasualtyModelIds)
      && Array.isArray(entry.possibleLostOccupiedPositions)
      && Number.isFinite(entry.strategicConsequences
        .lostPotentialModelContributors)
      && entry.strategicConsequences
        .formationReachAndContactCoverageMustBeRecomputed === true));
  const exactLossExample = attack.outcomes.lossStateDistribution
    .filter((entry) => entry.casualtyCount > 0)
    .flatMap((entry) => entry.casualtySelectionExamples || [])[0];
  assert(exactLossExample,
    "a damaging attack estimate must expose an exact legal loss list");
  assert(Array.isArray(exactLossExample.lostModels)
    && exactLossExample.lostModels.length > 0);
  assert(exactLossExample.lostModels.every((model) =>
    model.modelId && Number.isFinite(model.position?.xMilliInches)
      && Number.isFinite(model.position?.yMilliInches)));
  assert(exactLossExample.rangedContributionLosses.every((profile) =>
    Number.isFinite(profile.printedHitDiceLost)));
  assert(exactLossExample.meleePotentialContributionLosses.every((profile) =>
    Number.isFinite(profile.printedPotentialHitDiceLost)));
  assert(Array.isArray(exactLossExample.currentMeleeContributionLosses));
  assert(exactLossExample.currentMeleeContributionLosses.every((profile) =>
    Array.isArray(profile.fightingModelIds)
      && Array.isArray(profile.supportingModelIds)
      && Number.isFinite(profile.printedHitDiceLost)));
  assert.equal(exactLossExample.missionMarkerControlConsequences?.status,
    "exact_current_geometry");
  assert(Array.isArray(
    exactLossExample.missionMarkerControlConsequences?.markers));
  assert(exactLossExample.tacticalMassConsequences
    && exactLossExample.tacticalMassConsequences.before
    && exactLossExample.tacticalMassConsequences.after
    && Object.hasOwn(exactLossExample.tacticalMassConsequences, "changed"));
  assert.equal(exactLossExample.currentSupplyBefore, 1);
  assert(Number.isFinite(exactLossExample.availableSupplyFreed));
  assert.equal(exactLossExample.missionMarkerControlSupplyContributionLost,
    exactLossExample.availableSupplyFreed);
  assert("printedMovementCharacteristicAfterInches" in exactLossExample);

  process.stdout.write(`${JSON.stringify({
    schema: "ticket25_slice265_high_strategy_recovery_report_v1",
    ok: true,
    omegaCreationRoundSpecialAbilitiesSuppressed: true,
    enabledOmegaFormationOptionCount: formation.optionCount,
    incomingStationaryEstimateOptionCount: incomingRows.filter((entry) =>
      entry?.status === "current_position_stationary_attacks_estimated").length,
    goliathMoveThenAttackRiskVisible: true,
    moveThenFireBoundedRiskProjected: true,
    reactionChoiceSetsProjected: true,
    tacticalMassConsequencesProjected: true,
    swarmlingSupplyBefore: attack.outcomes.currentSupplyBefore,
    swarmlingLossStateCount: attack.outcomes.lossStateDistribution.length,
    exactCasualtyLossVector: true,
    exactCurrentMeleeAndMarkerConsequences: true,
    forkSmoke,
    providerCalls: 0,
    paidCostCny: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
} finally {
  roomStore.close();
}
