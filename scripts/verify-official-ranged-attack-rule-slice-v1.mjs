#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialAssaultRangedProfileBundleV1,
  getOfficialAssaultRangedProfileV1,
  verifyOfficialAssaultRangedProfileBundleV1,
} from "../packages/source-data/official-assault-ranged-profile-bundle-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
  verifyOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialRangedAttackV1,
  enumerateOfficialRangedAttackActionsV1,
  OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-ranged-attack-executor-v1.mjs";
import {
  applyOfficialAssaultHoldV2,
  enumerateOfficialAssaultHoldActionsV2,
  OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
  OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-assault-hold-executor-v2.mjs";
import {
  createOfficialRangedAttackRuleSliceV1,
  verifyOfficialRangedAttackRuleSliceV1,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v1.mjs";
import { OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS } from
  "../packages/rule-atoms/official-ranged-attack-executor-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);

const liveReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
  "utf8",
));
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const snapshot = liveReport.commandSnapshot;
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-disengage-casualty-rule-slice-v1-report.json"),
  "utf8",
));
assert.equal(OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS.length, 39);
const slice = createOfficialRangedAttackRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialRangedAttackRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(sliceAudit.counts.executableRuleAtoms, 278);
assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 39);
assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 3);
assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 634);
assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 278);
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "e94bd5d6ef839fb96c1077da532c5d4314c1c0d7c60754523a410613aaea4541",
);

const rangedBundle = createOfficialAssaultRangedProfileBundleV1({
  snapshot,
  dataset,
  recordKeys: ["army_units:marine"],
});
assert.equal(verifyOfficialAssaultRangedProfileBundleV1(rangedBundle), true);
assert.deepEqual(rangedBundle.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});

const marine = getOfficialAssaultRangedProfileV1(rangedBundle, "army_units:marine");
assert.equal(marine.unitId, "marine");
assert.deepEqual(marine.combatTags, ["biological", "ground", "light"]);
assert.equal(marine.armourThreshold, 5);
assert.equal(marine.evadeThreshold, 5);
assert.equal(marine.hitPoints, 2);
assert.equal(marine.assaultWeapons.length, 3);
const c14 = marine.assaultWeapons.find((weapon) => weapon.weaponName === "C-14 rifle");
assert.deepEqual(c14, {
  weaponName: "C-14 rifle",
  linkedTo: "-",
  costSmall: 0,
  costLarge: 0,
  rangeInches: 12,
  targetTags: ["all"],
  rateOfAttack: 2,
  hitThreshold: 3,
  damage: 1,
  surge: { targetTag: "light", dice: "D3" },
  behaviorText: "",
  sourceTextHash: c14.sourceTextHash,
});
assert.match(c14.sourceTextHash, /^[a-f0-9]{64}$/u);
assert.equal(rangedBundle.repositoryFallbackAllowed, false);
assert.equal(rangedBundle.trainingTruth, false);

const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  assaultRangedData: true,
});
assert.equal(verifyOfficialGameplayDataBundleV1(gameplayDataBundle), true);
assert.equal(gameplayDataBundle.assaultRangedProfileBundle.bundleHash, rangedBundle.bundleHash);
assert.match(gameplayDataBundle.gameplayDataBundleHash, /^[a-f0-9]{64}$/u);

function marinePiece(input) {
  return {
    id: input.id,
    name: "Marine",
    sideKey: input.sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash: marine.sourceRecordHash,
    currentModels: 1,
    currentSupply: 0,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    selectedUpgradeNames: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [{
      id: `${input.id}-m1`,
      baseShape: "round",
      baseWidthInches: 1.26,
      baseDepthInches: 1.26,
      xInches: input.xInches,
      yInches: input.yInches,
      isOnField: true,
      isDestroyed: false,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
    }],
    ...(input.disengageAssaultRestriction
      ? { disengageAssaultRestriction: input.disengageAssaultRestriction }
      : {}),
  };
}

function restriction(input) {
  const body = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_v1",
    declaredRound: 3,
    appliesToPhase: "assault",
    engagedEnemyUnitIds: ["p2-target"],
    enemySupplyByUnit: { "p2-target": 1 },
    ownCurrentSupply: input.tacticalMass ? 2 : 0,
    combinedEngagedEnemySupply: 1,
    tacticalMass: input.tacticalMass,
    rangedAttackProhibited: !input.tacticalMass,
    chargeProhibited: !input.tacticalMass,
    evaluatedAtDeclaration: true,
    trainingTruth: false,
  };
  return { ...body, restrictionHash: hashStarcraftTmgContract(body) };
}

function assaultState(input = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 3,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    phaseFirstActorByRound: {
      "3:assault": {
        round: 3,
        phase: "assault",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    board: {
      widthInches: 54,
      heightInches: 36,
      terrain: [],
      effectMarkers: [],
      tokens: [],
      markers: [],
      accessPoints: [],
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
    },
    officialGameplayDataBundle: gameplayDataBundle,
    pieces: [
      marinePiece({
        id: "p1-attacker",
        sideKey: "player1",
        xInches: 5,
        yInches: 5,
        disengageAssaultRestriction: input.disengageAssaultRestriction,
      }),
      marinePiece({ id: "p2-target", sideKey: "player2", xInches: 15, yInches: 5 }),
    ],
    log: [],
  };
}

function playerCredentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-player1-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `${envelope.roomId}-player1-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
};
const rangedActions = enumerateOfficialRangedAttackActionsV1(assaultState(), {
  sideKey: "player1",
  matchBinding,
});
assert.equal(rangedActions.length, 1);
assert.equal(rangedActions[0].actionType, "ranged_attack");
assert.equal(rangedActions[0].executorId, OFFICIAL_RANGED_ATTACK_EXECUTOR_ID);
assert.equal(rangedActions[0].executorVersion, OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION);
assert.equal(rangedActions[0].weaponName, "C-14 rifle");
assert.deepEqual(rangedActions[0].chance, {
  kind: "fixed_roll_sequence",
  faces: 6,
  count: 5,
  layout: { hit: 2, armour: 2, evade: 0, surge: 1 },
});
assert.equal(rangedActions[0].details.rangeInches, 12);
assert.equal(rangedActions[0].details.visible, true);
assert.equal(rangedActions[0].details.engaged, false);
assert.equal(rangedActions[0].details.trainingTruth, false);

const prohibited = enumerateOfficialRangedAttackActionsV1(assaultState({
  disengageAssaultRestriction: restriction({ tacticalMass: false }),
}), { sideKey: "player1", matchBinding });
assert.deepEqual(prohibited, []);
const prohibitedAudit = enumerateOfficialRangedAttackActionsV1(assaultState({
  disengageAssaultRestriction: restriction({ tacticalMass: false }),
}), { sideKey: "player1", matchBinding, includeDisabled: true });
assert.equal(prohibitedAudit.length, 1);
assert.equal(prohibitedAudit[0].isEnabled, false);
assert.equal(prohibitedAudit[0].disabledReason, "RANGED_ATTACK_POST_DISENGAGE_PROHIBITED");
assert.equal(isDeepStrictEqual(prohibitedAudit[0].chance, rangedActions[0].chance), true);

function executableAction(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

const tacticalMassState = assaultState({
  disengageAssaultRestriction: restriction({ tacticalMass: true }),
});
const tacticalMassAction = executableAction(enumerateOfficialRangedAttackActionsV1(
  tacticalMassState,
  { sideKey: "player1", matchBinding },
)[0]);
const rangedTransition = applyOfficialRangedAttackV1(
  tacticalMassState,
  tacticalMassAction,
  {
    matchBinding,
    postRevision: 1,
    chanceReveals: [
      { faces: 6, outcome: 4 },
      { faces: 6, outcome: 2 },
      { faces: 6, outcome: 5 },
      { faces: 6, outcome: 1 },
      { faces: 6, outcome: 6 },
    ],
  },
);
const rangedEvent = rangedTransition.events.find((event) => event.type === "ranged_attack");
const consumedEvent = rangedTransition.events.find((event) => (
  event.type === "post_disengage_assault_restriction_consumed"
));
assert.equal(rangedTransition.ok, true);
assert.deepEqual(rangedEvent.attackPool, {
  dice: 2,
  rolls: [4, 2],
  hitThreshold: 3,
  hits: 1,
});
assert.deepEqual(rangedEvent.surgePool, {
  dice: 1,
  rolls: [5],
  dieType: "D3",
  results: [3],
  targetTag: "light",
  matched: true,
  bypassedArmourHits: 1,
});
assert.deepEqual(rangedEvent.armourPool, {
  dice: 0,
  rolls: [],
  unusedPreallocatedRolls: [1, 6],
  armourThreshold: 5,
  saves: 0,
});
assert.deepEqual(rangedEvent.damagePool, {
  dice: 1,
  damagePerDie: 1,
  priorDamageMarker: 0,
  totalDamage: 1,
});
assert.equal(rangedEvent.postDamageMarker, 1);
assert.deepEqual(rangedEvent.casualtyModelIds, []);
assert.equal(consumedEvent.restrictionHash,
  tacticalMassState.pieces[0].disengageAssaultRestriction.restrictionHash);
const rangedAttacker = rangedTransition.state.pieces.find((piece) => piece.id === "p1-attacker");
assert.equal(rangedAttacker.activatedPhases.assault, true);
assert.equal(Object.hasOwn(rangedAttacker, "disengageAssaultRestriction"), false);
assert.equal(rangedAttacker.disengageAssaultRestrictionHistory.length, 1);
assert.equal(rangedTransition.state.activeSideKey, "player2");
assert.equal(rangedTransition.trainingTruth, false);

const holdState = assaultState({
  disengageAssaultRestriction: restriction({ tacticalMass: false }),
});
const holdCandidates = enumerateOfficialAssaultHoldActionsV2(holdState, {
  sideKey: "player1",
});
assert.equal(holdCandidates.length, 1);
assert.equal(holdCandidates[0].executorId, OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID);
assert.equal(holdCandidates[0].executorVersion, OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION);
const holdAction = executableAction(holdCandidates[0]);
const holdTransition = applyOfficialAssaultHoldV2(holdState, holdAction, { postRevision: 1 });
const holdPiece = holdTransition.state.pieces.find((piece) => piece.id === "p1-attacker");
const holdConsumption = holdTransition.events.find((event) => (
  event.type === "post_disengage_assault_restriction_consumed"
));
assert.equal(holdTransition.ok, true);
assert.equal(holdPiece.activatedPhases.assault, true);
assert.equal(Object.hasOwn(holdPiece, "disengageAssaultRestriction"), false);
assert.equal(holdPiece.disengageAssaultRestrictionHistory.length, 1);
assert.equal(holdConsumption.consumedByActionType, "hold");
assert.equal(holdConsumption.restrictionHash,
  holdState.pieces[0].disengageAssaultRestriction.restrictionHash);
assert.equal(holdTransition.trainingTruth, false);

const runtimeLegal = runtime.enumerate(tacticalMassState, {
  sideKey: "player1",
  matchBinding,
});
const runtimeRangedCandidate = runtimeLegal.candidates.find((candidate) => (
  candidate.actionType === "ranged_attack"
));
const runtimeHoldCandidate = runtimeLegal.candidates.find((candidate) => (
  candidate.actionType === "hold"
));
assert.ok(runtimeRangedCandidate);
assert.equal(runtimeHoldCandidate.executorId, OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID);
const runtimeTransition = runtime.apply(
  tacticalMassState,
  executableAction(runtimeRangedCandidate),
  {
    matchBinding,
    postRevision: 1,
    chanceReveals: [
      { faces: 6, outcome: 4 },
      { faces: 6, outcome: 2 },
      { faces: 6, outcome: 5 },
      { faces: 6, outcome: 1 },
      { faces: 6, outcome: 6 },
    ],
  },
);
assert.equal(runtimeTransition.events[0].type, "ranged_attack");
assert.equal(runtimeTransition.events[0].surgePool.results[0], 3);
assert.equal(runtimeTransition.action.executorId, OFFICIAL_RANGED_ATTACK_EXECUTOR_ID);
assert.equal(runtimeTransition.trainingTruth, false);

for (const [surgeRoll, expectedD3] of [[1, 1], [3, 2], [5, 3]]) {
  const state = assaultState();
  const action = executableAction(enumerateOfficialRangedAttackActionsV1(state, {
    sideKey: "player1",
    matchBinding,
  })[0]);
  const transition = applyOfficialRangedAttackV1(state, action, {
    matchBinding,
    chanceReveals: [
      { faces: 6, outcome: 4 },
      { faces: 6, outcome: 1 },
      { faces: 6, outcome: surgeRoll },
      { faces: 6, outcome: 6 },
      { faces: 6, outcome: 6 },
    ],
  });
  assert.equal(transition.events[0].surgePool.results[0], expectedD3);
}

const armourState = assaultState();
const armourAction = executableAction(enumerateOfficialRangedAttackActionsV1(armourState, {
  sideKey: "player1",
  matchBinding,
})[0]);
const armourTransition = applyOfficialRangedAttackV1(armourState, armourAction, {
  matchBinding,
  chanceReveals: [
    { faces: 6, outcome: 4 },
    { faces: 6, outcome: 5 },
    { faces: 6, outcome: 1 },
    { faces: 6, outcome: 6 },
    { faces: 6, outcome: 2 },
  ],
});
assert.deepEqual(armourTransition.events[0].armourPool, {
  dice: 1,
  rolls: [6],
  unusedPreallocatedRolls: [2],
  armourThreshold: 5,
  saves: 1,
});
assert.equal(armourTransition.events[0].damagePool.dice, 1);

const casualtyState = assaultState();
casualtyState.pieces.find((piece) => piece.id === "p2-target").damageMarker = 1;
const casualtyAction = executableAction(enumerateOfficialRangedAttackActionsV1(casualtyState, {
  sideKey: "player1",
  matchBinding,
})[0]);
const casualtyTransition = applyOfficialRangedAttackV1(casualtyState, casualtyAction, {
  matchBinding,
  chanceReveals: [
    { faces: 6, outcome: 4 },
    { faces: 6, outcome: 1 },
    { faces: 6, outcome: 5 },
    { faces: 6, outcome: 1 },
    { faces: 6, outcome: 1 },
  ],
});
const casualtyTarget = casualtyTransition.state.pieces.find((piece) => piece.id === "p2-target");
assert.equal(casualtyTarget.isDestroyed, true);
assert.equal(casualtyTarget.currentModels, 0);
assert.deepEqual(casualtyTransition.events[0].casualtyModelIds, ["p2-target-m1"]);

const outOfRangeState = assaultState();
outOfRangeState.pieces.find((piece) => piece.id === "p2-target").models[0].xInches = 20;
const outOfRange = enumerateOfficialRangedAttackActionsV1(outOfRangeState, {
  sideKey: "player1",
  matchBinding,
  includeDisabled: true,
});
assert.equal(outOfRange[0].disabledReason, "RANGED_ATTACK_TARGET_OUT_OF_RANGE");
assert.throws(() => applyOfficialRangedAttackV1(
  tacticalMassState,
  { ...tacticalMassAction, targetId: "wrong-target" },
  { matchBinding, chanceReveals: Array.from({ length: 5 }, () => ({ faces: 6, outcome: 1 })) },
), /RANGED_ATTACK_ACTION_STALE/u);
assert.throws(() => applyOfficialRangedAttackV1(
  tacticalMassState,
  tacticalMassAction,
  { matchBinding, chanceReveals: [{ faces: 6, outcome: 1 }] },
), /RANGED_ATTACK_CHANCE_REVEALS_REQUIRED/u);
const profileDrift = structuredClone(rangedBundle);
profileDrift.profiles[0].assaultWeapons[0].damage = 99;
assert.throws(
  () => verifyOfficialAssaultRangedProfileBundleV1(profileDrift),
  /official_assault_ranged_profile_bundle_invalid/u,
);

const refereeKeys = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => "2026-08-25T00:00:00.000Z",
  cryptoOptions: {
    ...refereeKeys,
    hmacSecret: "ticket-11-ranged-attack-short-term-seal-v1",
  },
});
const initial = engine.createEnvelope({
  roomId: "official-ranged-attack-authority-room",
  dataVersion: `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: assaultState(),
});
const credentials = playerCredentials(engine, initial);
const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
const authorityRanged = legal.finiteActions.find((entry) => (
  entry.action.actionType === "ranged_attack"
));
assert.ok(authorityRanged);
assert.equal(authorityRanged.action.executorId, OFFICIAL_RANGED_ATTACK_EXECUTOR_ID);
const preview = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: { kind: "finite", actionKey: authorityRanged.actionKey },
});
assert.equal(preview.ok, true);
assert.equal(preview.preview.core.chanceTicket.schemaVersion, "starcraft_tmg_chance_bundle_v1");
assert.equal(preview.preview.core.chanceTicket.tickets.length, 5);
assert.equal(preview.preview.core.result.chancePending, true);
assert.deepEqual(preview.preview.core.result.events, []);
const confirmation = engine.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: credentials.authority,
});
assert.equal(confirmation.ok, true);
const authorityApplied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmation.confirmation,
  seatAuthority: credentials.authority,
  controlLease: credentials.lease,
  idempotencyKey: "ticket-11-ranged-attack-apply-v1",
});
assert.equal(authorityApplied.ok, true);
assert.equal(authorityApplied.receipt.chanceReveal.schemaVersion,
  "starcraft_tmg_chance_reveal_bundle_v1");
assert.equal(authorityApplied.receipt.chanceReveal.reveals.length, 5);
assert.equal(authorityApplied.receipt.events[0].type, "ranged_attack");
assert.equal(authorityApplied.receipt.eligibleForTraining, false);
const replay = engine.replay({ initialEnvelope: initial, journal: [authorityApplied.receipt] });
assert.equal(replay.ok, true);
assert.equal(replay.envelope.stateHash, authorityApplied.envelope.stateHash);

const replayEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => "2026-08-25T00:00:00.000Z",
  cryptoOptions: {
    ...refereeKeys,
    hmacSecret: "ticket-11-ranged-attack-rotated-short-term-seal-v2",
  },
});
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
  ["dataSnapshot", gameplayDataBundle],
  ["rulesArtifact", {
    kind: "rules-artifact",
    rulesVersion: runtime.descriptor.rulesVersion,
    rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
  }],
  ["executorArtifact", {
    kind: "executor-artifact",
    authorityVersion: "starcraft_tmg_authority_v2",
    rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
    catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
    executorManifest: runtime.descriptor.executorManifest,
  }],
  ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" }],
  ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v1" }],
]) {
  replayEngine.registerDependency({
    kind,
    artifactId: initial.matchBinding.dependencies[kind].artifactId,
    content,
  });
}
replayEngine.registerDependency({
  kind: "rulesDisplay",
  artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
  mediaType: "text/markdown",
  locale: "en",
  content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const crossSealReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: [authorityApplied.receipt],
});
assert.equal(crossSealReplay.ok, true);
assert.equal(crossSealReplay.envelope.stateHash, authorityApplied.envelope.stateHash);

const tamperedReceipt = structuredClone(authorityApplied.receipt);
tamperedReceipt.chanceReveal.reveals[0].outcome =
  tamperedReceipt.chanceReveal.reveals[0].outcome === 6 ? 5 : 6;
const tamperedReplay = engine.replay({ initialEnvelope: initial, journal: [tamperedReceipt] });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");

const report = {
  schema: "starcraft_tmg_official_ranged_attack_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: 13,
  acceptanceTotal: 13,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  officialProfileBundleHash: rangedBundle.bundleHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  dataVersions: dataset.dataVersions,
  officialCorePdfHash:
    "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  slice,
  audit: sliceAudit,
  runtime: runtime.descriptor,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_current_profile_bound_ranged_attack_and_assault_restriction_lifecycle",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  executableRuleAtomCount: sliceAudit.counts.executableRuleAtoms,
  newlyExecutableRuleAtomCount: sliceAudit.counts.newlyExecutableRuleAtoms,
  versionReassignedRuleAtomCount: sliceAudit.counts.versionReassignedRuleAtoms,
  remainingActionableRuleAtomCount: sliceAudit.counts.reviewRequiredRuleAtoms,
  officialProfileBundleHash: rangedBundle.bundleHash,
  weaponName: c14.weaponName,
  surge: c14.surge,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));
