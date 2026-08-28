#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  applyOfficialRangedAttackV6,
  enumerateOfficialRangedAttackActionsV6,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-ranged-attack-executor-v6.mjs";
import {
  createOfficialRangedAttackRuleSliceV6,
  verifyOfficialRangedAttackRuleSliceV6,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v6.mjs";
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
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v5-report.json"),
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
  unitRecordKeys: ["army_units:jim_raynor", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(verifyOfficialGameplayDataBundleV1(gameplayDataBundle), true);
const matchBinding = { dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle) };
const slice = createOfficialRangedAttackRuleSliceV6({ previousSlice: previousReport.slice });
const sliceAudit = verifyOfficialRangedAttackRuleSliceV6({
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
    currentSupply: input.currentSupply,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    selectedUpgradeNames: input.selectedUpgradeNames,
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
        id: "p1-raynor",
        sideKey: "player1",
        recordKey: "army_units:jim_raynor",
        currentSupply: 1,
        selectedUpgradeNames: input.raynorUpgradeNames ?? [],
        baseWidthInches: 1.575,
        xInches: 5,
      }),
      piece({
        id: "p2-marine",
        sideKey: "player2",
        recordKey: "army_units:marine",
        currentSupply: 0,
        selectedUpgradeNames: [],
        baseWidthInches: 1.26,
        xInches: input.targetXInches ?? 14,
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

check("slice_promotes_one_bulky_atom_and_preserves_v5_history", () => {
  assert.deepEqual(OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS, [
    "rule-atom:singleton:core-11-bulky-engaged-ranged-prohibition:2efe88629073",
  ]);
  assert.equal(sliceAudit.counts.executableRuleAtoms, 305);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 1);
  assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 65);
  assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 607);
  assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(
    historicalRuntime.descriptor.runtimeHash,
    "36aa2c6d931f3002fb5ca2651f727da6f47b348b186b4edbfdb64b7fd6dbd388",
  );
});

check("default_commando_rifle_is_legal_only_for_an_unengaged_raynor", () => {
  const candidates = enumerateOfficialRangedAttackActionsV6(state(), {
    sideKey: "player1",
    matchBinding,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].weaponName, "Commando Rifle");
  assert.equal(candidates[0].executorId, OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID);
  assert.equal(candidates[0].executorVersion, OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION);
  assert.deepEqual(candidates[0].chance.layout, { hit: 3, surge: 1, armour: 3, evade: 0 });
  assert.equal(candidates[0].chance.count, 7);
  assert.equal(candidates[0].details.attackerEngaged, false);
  assert.equal(candidates[0].details.bulkyEngagedProhibitionChecked, true);
  assert.match(candidates[0].details.weaponLoadoutHash, /^[a-f0-9]{64}$/u);

  assert.deepEqual(enumerateOfficialRangedAttackActionsV6(state({ targetXInches: 7 }), {
    sideKey: "player1",
    matchBinding,
  }), []);
  const disabled = enumerateOfficialRangedAttackActionsV6(state({ targetXInches: 7 }), {
    sideKey: "player1",
    matchBinding,
    includeDisabled: true,
  }).find((entry) => entry.weaponName === "Commando Rifle");
  assert.equal(disabled.disabledReason, "ATTACK_BULKY_ENGAGED_PROHIBITION");
});

check("commando_resolution_reuses_surge_pierce_armour_and_damage_stages", () => {
  const before = state();
  const candidate = enumerateOfficialRangedAttackActionsV6(before, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const transition = applyOfficialRangedAttackV6(before, action(candidate), {
    matchBinding,
    postRevision: 1,
    chanceReveals: [3, 1, 1, 1, 1, 6, 6],
  });
  const event = transition.events[0];
  assert.equal(transition.ok, true);
  assert.equal(event.bulky.attackerEngaged, false);
  assert.equal(event.bulky.prohibitionCheckedBeforeChance, true);
  assert.equal(event.weaponLoadout.availableWeaponNames.includes("Commando Rifle"), true);
  assert.equal(event.weaponLoadout.availableWeaponNames.includes("C-14 rifle"), false);
  assert.equal(event.attackPool.hits, 1);
  assert.equal(event.surgePool.matched, false);
  assert.equal(event.pierce.matched, false);
  assert.equal(event.armourPool.dice, 1);
  assert.equal(event.damagePool.totalDamage, 1);
  assert.equal(transition.state.pieces[1].damageMarker, 1);
});

check("selected_c14_action_delegates_to_the_frozen_v5_executor", () => {
  const before = state({ raynorUpgradeNames: ["C-14 rifle"] });
  const candidate = enumerateOfficialRangedAttackActionsV6(before, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.equal(candidate.weaponName, "C-14 rifle");
  assert.equal(candidate.details.delegatedExecutorId, "authority.ranged-attack-v5");
  const transition = applyOfficialRangedAttackV6(before, action(candidate), {
    matchBinding,
    postRevision: 1,
    chanceReveals: Array.from({ length: 19 }, () => 1),
  });
  assert.equal(transition.delegatedExecutor.executorId, "authority.ranged-attack-v5");
  assert.equal(transition.action.executorId, OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID);
});

check("authority_preview_apply_and_ed25519_replay_survive_hmac_rotation", () => {
  const refereeKeys = generateKeyPairSync("ed25519");
  const engine = engineWithKeys(refereeKeys, "ticket-11-bulky-short-seal-v1");
  const initial = engine.createEnvelope({
    roomId: "official-bulky-authority-room",
    dataVersion:
      `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot-2026-08-25", content: snapshot },
      dataSnapshot: { artifactId: "official-bulky-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state: state(),
  });
  const credentials = playerCredentials(engine, initial);
  const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
  const ranged = legal.finiteActions.find((entry) => (
    entry.action.weaponName === "Commando Rifle"
  ));
  assert.ok(ranged);
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
    idempotencyKey: "ticket-11-bulky-apply-v1",
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.receipt.action.executorId, OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID);
  assert.equal(applied.receipt.chanceReveal.reveals.length, 7);
  assert.equal(applied.receipt.eligibleForTraining, false);

  const replayEngine = engineWithKeys(
    refereeKeys,
    "ticket-11-bulky-rotated-short-seal-v2",
  );
  registerReplayDependencies(replayEngine, initial);
  const replay = replayEngine.replay({
    initialEnvelope: initial,
    journal: [applied.receipt],
  });
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

  const tampered = structuredClone(applied.receipt);
  tampered.action.weaponName = "C-14 rifle";
  const tamperedReplay = engine.replay({ initialEnvelope: initial, journal: [tampered] });
  assert.equal(tamperedReplay.ok, false);
  assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
});

check("runtime_latest_data_harness_and_training_boundaries_are_exact", () => {
  assert.equal(snapshot.snapshotHash, "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c");
  assert.equal(dataset.datasetHash, "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021");
  assert.equal(runtime.descriptor.catalogueHash, slice.catalogueHash);
  assert.equal(runtime.descriptor.executableRuleAtomCount, 305);
  assert.equal(runtime.descriptor.productionRoomEligible, false);
  assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 7);
  assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
  assert.equal(slice.ctx2skill.promotions.length, 0);
  assert.equal(slice.harness.trainingTraceCandidates.length, 0);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_ranged_attack_rule_slice_v6_report",
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
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
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
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v6-report.json"),
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
