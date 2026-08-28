#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialRangedAttackV4,
  enumerateOfficialRangedAttackActionsV4,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-ranged-attack-executor-v4.mjs";
import {
  createOfficialRangedAttackRuleSliceV4,
  verifyOfficialRangedAttackRuleSliceV4,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v4.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
  verifyOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

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
const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v3-report.json"),
  "utf8",
));
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-report.json"),
  "utf8",
));
const basePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const factionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const firestorePayloads = {
  ...basePayloads,
  faction_cards: factionApplication.firestorePayload,
};
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:adept", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(verifyOfficialGameplayDataBundleV1(gameplayDataBundle), true);
const matchBinding = { dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle) };
const slice = createOfficialRangedAttackRuleSliceV4({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialRangedAttackRuleSliceV4({
  previousSlice: previousReport.slice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

function profile(recordKey) {
  return gameplayDataBundle.combatProfileBundle.profilesByRecordKey[recordKey];
}

function piece(input) {
  const combatProfile = profile(input.recordKey);
  return {
    id: input.id,
    name: combatProfile.unitName,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: combatProfile.sourceRecordHash,
    currentModels: 1,
    currentSupply: 0,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    selectedUpgradeNames: [],
    combatEffects: [],
    assaultEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [{
      id: `${input.id}-m1`,
      baseShape: "round",
      baseWidthInches: input.baseWidthInches,
      baseDepthInches: input.baseWidthInches,
      xInches: input.xInches,
      yInches: 5,
      isOnField: true,
      isDestroyed: false,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
    }],
  };
}

function state(input = {}) {
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
      piece({
        id: "p1-adept",
        sideKey: "player1",
        recordKey: "army_units:adept",
        baseWidthInches: 1.575,
        xInches: 5,
      }),
      piece({
        id: "p2-marine",
        sideKey: "player2",
        recordKey: "army_units:marine",
        baseWidthInches: 1.26,
        xInches: input.targetXInches ?? 7,
      }),
    ],
    log: [],
  };
}

function action(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...result
  } = candidate;
  return result;
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

function engineWithKeys(refereeKeys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-25T00:00:00.000Z",
    cryptoOptions: { ...refereeKeys, hmacSecret },
  });
}

function registerReplayDependencies(engine, initial) {
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
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    }],
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v1",
    }],
  ]) {
    engine.registerDependency({
      kind,
      artifactId: initial.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

check("slice_promotes_sixteen_evade_atoms_and_preserves_v3_history", () => {
  assert.equal(OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS.length, 16);
  assert.equal(sliceAudit.counts.executableRuleAtoms, 299);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 16);
  assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 44);
  assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 613);
  assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(
    historicalRuntime.descriptor.runtimeHash,
    "bdb88261239e1041b30a27ff556046f5648399f411c98dd965e22b17e506b19a",
  );
});

check("adept_glaive_cannon_is_legal_only_against_its_engaged_marine", () => {
  const candidates = enumerateOfficialRangedAttackActionsV4(state(), {
    sideKey: "player1",
    matchBinding,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].weaponName, "Glaive Cannon");
  assert.equal(candidates[0].executorId, OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID);
  assert.equal(candidates[0].executorVersion, OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION);
  assert.deepEqual(candidates[0].chance.layout, { hit: 2, surge: 1, armour: 2, evade: 2 });
  assert.equal(candidates[0].chance.count, 7);
  assert.equal(candidates[0].details.engagedTarget, true);
  assert.equal(candidates[0].details.baseEvadeThreshold, 5);
  assert.equal(candidates[0].details.effectiveEvadeThreshold, 6);
  assert.equal(candidates[0].details.antiEvadeModifier, -1);

  assert.deepEqual(enumerateOfficialRangedAttackActionsV4(state({ targetXInches: 9 }), {
    sideKey: "player1",
    matchBinding,
  }), []);
  const disabled = enumerateOfficialRangedAttackActionsV4(state({ targetXInches: 9 }), {
    sideKey: "player1",
    matchBinding,
    includeDisabled: true,
  });
  assert.equal(disabled[0].disabledReason, "RANGED_ATTACK_V4_ENGAGED_TARGET_REQUIRED");
});

check("exact_reveals_resolve_armour_then_evade_then_damage", () => {
  const before = state();
  const candidate = enumerateOfficialRangedAttackActionsV4(before, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const transition = applyOfficialRangedAttackV4(before, action(candidate), {
    matchBinding,
    postRevision: 1,
    chanceReveals: [3, 3, 1, 6, 6, 5, 6],
  });
  const event = transition.events[0];
  assert.equal(transition.ok, true);
  assert.equal(event.attackPool.hits, 2);
  assert.equal(event.surgePool.bypassedArmourHits, 2);
  assert.equal(event.armourPool.dice, 0);
  assert.equal(event.evadePool.damagePoolBeforeEvade, 2);
  assert.equal(event.evadePool.effectiveThreshold, 6);
  assert.equal(event.evadePool.saves, 1);
  assert.equal(event.evadePool.confirmedDamageDice, 1);
  assert.equal(event.damagePool.totalDamage, 1);
  assert.equal(event.targetDestroyed, false);
  assert.equal(transition.state.pieces[1].damageMarker, 1);
  assert.equal(transition.state.pieces[0].activatedPhases.assault, true);
});

check("wrong_data_or_unreviewed_modifiers_fail_closed", () => {
  assert.deepEqual(enumerateOfficialRangedAttackActionsV4(state(), {
    sideKey: "player1",
    matchBinding: { dataSnapshotHash: "0".repeat(64) },
  }), []);
  const modified = state();
  modified.pieces[1].statuses = ["hidden"];
  assert.deepEqual(enumerateOfficialRangedAttackActionsV4(modified, {
    sideKey: "player1",
    matchBinding,
  }), []);
});

check("authority_preview_apply_and_ed25519_replay_survive_hmac_rotation", () => {
  const refereeKeys = generateKeyPairSync("ed25519");
  const engine = engineWithKeys(refereeKeys, "ticket-11-anti-evade-short-seal-v1");
  const initial = engine.createEnvelope({
    roomId: "official-anti-evade-authority-room",
    dataVersion:
      `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot-2026-08-25", content: snapshot },
      dataSnapshot: { artifactId: "official-anti-evade-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state: state(),
  });
  const credentials = playerCredentials(engine, initial);
  const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
  const ranged = legal.finiteActions.find((entry) => entry.action.actionType === "ranged_attack");
  assert.ok(ranged);
  assert.equal(ranged.action.executorId, OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID);
  const preview = engine.preview({
    envelope: initial,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: ranged.actionKey },
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.preview.core.chanceTicket.tickets.length, 7);
  assert.deepEqual(preview.preview.core.result.events, []);
  const confirmation = engine.confirmPreview({
    envelope: initial,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  const applied = engine.apply({
    envelope: initial,
    expectedStateRevision: initial.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey: "ticket-11-anti-evade-apply-v1",
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.receipt.action.executorId, OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID);
  assert.equal(applied.receipt.chanceReveal.reveals.length, 7);
  assert.equal(applied.receipt.eligibleForTraining, false);

  const replayEngine = engineWithKeys(
    refereeKeys,
    "ticket-11-anti-evade-rotated-short-seal-v2",
  );
  registerReplayDependencies(replayEngine, initial);
  const replay = replayEngine.replay({
    initialEnvelope: initial,
    journal: [applied.receipt],
  });
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

  const tampered = structuredClone(applied.receipt);
  tampered.chanceReveal.reveals[0].outcome =
    tampered.chanceReveal.reveals[0].outcome === 6 ? 5 : 6;
  const tamperedReplay = engine.replay({ initialEnvelope: initial, journal: [tampered] });
  assert.equal(tamperedReplay.ok, false);
  assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
});

check("runtime_slice_latest_data_and_training_boundaries_are_exact", () => {
  assert.equal(snapshot.snapshotHash, "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c");
  assert.equal(dataset.datasetHash, "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021");
  assert.equal(runtime.descriptor.catalogueHash, slice.catalogueHash);
  assert.equal(runtime.descriptor.executableRuleAtomCount, 299);
  assert.equal(runtime.descriptor.productionRoomEligible, false);
  assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 9);
  assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
  assert.equal(slice.ctx2skill.promotions.length, 0);
  assert.equal(slice.harness.trainingTraceCandidates.length, 0);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_ranged_attack_rule_slice_v4_report",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  atomicProfileCatalogueHash: gameplayDataBundle.attackProfileCatalogue.catalogueHash,
  slice,
  audit: sliceAudit,
  sliceAudit,
  executor: {
    executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
  },
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  counts: {
    assertions: acceptance.length,
    passed: acceptance.length - failures.length,
    failed: failures.length,
  },
  acceptance,
  failures,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v4-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
if (failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  schema: report.schema,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  kernelHash: slice.effectKernel.kernelHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  counts: report.counts,
  sliceCounts: sliceAudit.counts,
  trainingTruth: false,
}, null, 2));
