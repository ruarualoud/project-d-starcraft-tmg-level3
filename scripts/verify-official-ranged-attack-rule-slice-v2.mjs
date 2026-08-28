#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
  verifyOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import {
  applyOfficialRangedAttackV2,
  enumerateOfficialRangedAttackActionsV2,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
  OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-ranged-attack-executor-v2.mjs";
import {
  createOfficialRangedAttackRuleSliceV2,
  verifyOfficialRangedAttackRuleSliceV2,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";

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
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v1-report.json"),
  "utf8",
));
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
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:goliath", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(verifyOfficialGameplayDataBundleV1(gameplayDataBundle), true);
const matchBinding = { dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle) };

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const slice = createOfficialRangedAttackRuleSliceV2({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialRangedAttackRuleSliceV2({
  previousSlice: previousReport.slice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});

check("slice_promotes_only_four_long_range_atoms", () => {
  assert.equal(OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS.length, 4);
  assert.equal(sliceAudit.counts.executableRuleAtoms, 282);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 4);
  assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 39);
  assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 630);
  assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(runtime.descriptor.executableRuleAtomCount, 282);
  assert.equal(
    historicalRuntime.descriptor.runtimeHash,
    "01ed2a06eb361059f598f5e60cab0791065acc7409c60ef6cf333f50d5f54b79",
  );
});

check("room_bundle_embeds_complete_atomic_profile_catalogue", () => {
  assert.equal(gameplayDataBundle.attackProfileCatalogue.profiles.length, 51);
  assert.equal(gameplayDataBundle.attackProfileCatalogue.effectRegistry.length, 13);
  assert.equal(gameplayDataBundle.attackProfileCatalogue.unknownEffects.length, 0);
  assert.equal(gameplayDataBundle.attackProfileCatalogue.trainingTruth, false);
});

function piece(input) {
  const profile = gameplayDataBundle.combatProfileBundle
    .profilesByRecordKey[input.recordKey];
  return {
    id: input.id,
    name: profile.unitName,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: 1,
    currentSupply: input.recordKey === "army_units:goliath" ? 2 : 0,
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
      baseWidthInches: input.recordKey === "army_units:goliath" ? 3.15 : 1.26,
      baseDepthInches: input.recordKey === "army_units:goliath" ? 3.15 : 1.26,
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

function restriction(tacticalMass) {
  const body = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_v1",
    declaredRound: 3,
    appliesToPhase: "assault",
    engagedEnemyUnitIds: ["p2-target"],
    enemySupplyByUnit: { "p2-target": 1 },
    ownCurrentSupply: tacticalMass ? 2 : 0,
    combinedEngagedEnemySupply: 1,
    tacticalMass,
    rangedAttackProhibited: !tacticalMass,
    chargeProhibited: !tacticalMass,
    evaluatedAtDeclaration: true,
    trainingTruth: false,
  };
  return { ...body, restrictionHash: hashStarcraftTmgContract(body) };
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
        id: "p1-attacker",
        sideKey: "player1",
        recordKey: input.attackerRecordKey || "army_units:goliath",
        xInches: 5,
        yInches: 5,
        disengageAssaultRestriction: input.disengageAssaultRestriction,
      }),
      piece({
        id: "p2-target",
        sideKey: "player2",
        recordKey: "army_units:marine",
        xInches: input.targetXInches ?? 15,
        yInches: 5,
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

check("marine_c14_uses_atomic_surge_with_v1_chance_shape", () => {
  const candidates = enumerateOfficialRangedAttackActionsV2(state({
    attackerRecordKey: "army_units:marine",
  }), { sideKey: "player1", matchBinding });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].weaponName, "C-14 rifle");
  assert.equal(candidates[0].executorId, OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID);
  assert.equal(candidates[0].executorVersion, OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION);
  assert.deepEqual(candidates[0].chance.layout, { hit: 2, surge: 1, armour: 2, evade: 0 });
  assert.equal(candidates[0].chance.count, 5);
  assert.deepEqual(candidates[0].details.effectAtomIds, [
    "attack-effect:surge-armour-bypass-v1",
  ]);
});

check("goliath_autocannon_normal_band_is_4_plus", () => {
  const candidates = enumerateOfficialRangedAttackActionsV2(state(), {
    sideKey: "player1",
    matchBinding,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].weaponName, "Autocannon");
  assert.equal(candidates[0].details.rangeBand, "normal");
  assert.equal(candidates[0].details.effectiveHitThreshold, 4);
  assert.equal(candidates[0].chance.count, 18);
  assert.deepEqual(candidates[0].chance.layout, { hit: 9, surge: 0, armour: 9, evade: 0 });
});

check("goliath_autocannon_extended_band_is_5_plus", () => {
  const candidates = enumerateOfficialRangedAttackActionsV2(state({ targetXInches: 22 }), {
    sideKey: "player1",
    matchBinding,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].details.rangeBand, "extended");
  assert.equal(candidates[0].details.effectiveHitThreshold, 5);
  assert.equal(candidates[0].details.maximumRangeInches, 18);
});

check("goliath_autocannon_beyond_18_inches_is_not_legal", () => {
  assert.deepEqual(enumerateOfficialRangedAttackActionsV2(state({ targetXInches: 25.5 }), {
    sideKey: "player1",
    matchBinding,
  }), []);
  const disabled = enumerateOfficialRangedAttackActionsV2(state({ targetXInches: 25.5 }), {
    sideKey: "player1",
    matchBinding,
    includeDisabled: true,
  });
  assert.equal(disabled.length, 1);
  assert.equal(disabled[0].disabledReason, "ATTACK_TARGET_OUT_OF_RANGE");
});

check("extended_attack_receipt_binds_effect_plan_resolution_and_official_bases", () => {
  const before = state({
    targetXInches: 22,
    disengageAssaultRestriction: restriction(true),
  });
  const candidate = enumerateOfficialRangedAttackActionsV2(before, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const transition = applyOfficialRangedAttackV2(before, action(candidate), {
    matchBinding,
    postRevision: 1,
    chanceReveals: [
      ...Array.from({ length: 9 }, () => ({ faces: 6, outcome: 6 })),
      ...Array.from({ length: 9 }, () => ({ faces: 6, outcome: 1 })),
    ],
  });
  const event = transition.events.find((entry) => entry.type === "ranged_attack");
  assert.equal(transition.ok, true);
  assert.equal(event.rangeBand, "extended");
  assert.equal(event.attackPool.hits, 9);
  assert.equal(event.armourPool.saves, 0);
  assert.equal(event.damagePool.totalDamage, 9);
  assert.equal(event.targetDestroyed, true);
  assert.equal(event.baseSourceBindings.attacker.printedBaseDiameter, "Ø 80MM");
  assert.match(event.attackPlanHash, /^[a-f0-9]{64}$/u);
  assert.match(event.attackResolutionHash, /^[a-f0-9]{64}$/u);
  assert.equal(event.postDisengageRestrictionConsumed, true);
});

check("post_disengage_prohibition_remains_fail_closed", () => {
  const prohibited = enumerateOfficialRangedAttackActionsV2(state({
    disengageAssaultRestriction: restriction(false),
  }), { sideKey: "player1", matchBinding });
  assert.deepEqual(prohibited, []);
  const disabled = enumerateOfficialRangedAttackActionsV2(state({
    disengageAssaultRestriction: restriction(false),
  }), { sideKey: "player1", matchBinding, includeDisabled: true });
  assert.equal(disabled[0].disabledReason, "RANGED_ATTACK_V2_POST_DISENGAGE_PROHIBITED");
});

check("wrong_room_data_binding_produces_no_legal_attack", () => {
  assert.deepEqual(enumerateOfficialRangedAttackActionsV2(state(), {
    sideKey: "player1",
    matchBinding: { dataSnapshotHash: "0".repeat(64) },
  }), []);
});

check("authority_preview_apply_and_cross_seal_replay_use_v2", () => {
  const refereeKeys = generateKeyPairSync("ed25519");
  const engine = createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-25T00:00:00.000Z",
    cryptoOptions: {
      ...refereeKeys,
      hmacSecret: "ticket-11-atomic-ranged-short-seal-v1",
    },
  });
  const initial = engine.createEnvelope({
    roomId: "official-atomic-ranged-authority-room",
    dataVersion:
      `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
      dataSnapshot: { artifactId: "official-atomic-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state: state({ targetXInches: 22 }),
  });
  const credentials = playerCredentials(engine, initial);
  const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
  const ranged = legal.finiteActions.find((entry) => (
    entry.action.actionType === "ranged_attack"
  ));
  assert.ok(ranged);
  assert.equal(ranged.action.executorId, OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID);
  assert.equal(ranged.action.chance.count, 18);
  const preview = engine.preview({
    envelope: initial,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: ranged.actionKey },
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.preview.core.chanceTicket.tickets.length, 18);
  assert.deepEqual(preview.preview.core.result.events, []);
  const confirmation = engine.confirmPreview({
    envelope: initial,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  assert.equal(confirmation.ok, true);
  const applied = engine.apply({
    envelope: initial,
    expectedStateRevision: initial.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey: "ticket-11-atomic-ranged-apply-v2",
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.receipt.action.executorId, OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID);
  assert.equal(applied.receipt.chanceReveal.reveals.length, 18);
  assert.match(applied.receipt.events[0].attackResolutionHash, /^[a-f0-9]{64}$/u);
  assert.equal(applied.receipt.eligibleForTraining, false);
  const replay = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
  assert.equal(replay.ok, true);
  assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

  const replayEngine = createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-25T00:00:00.000Z",
    cryptoOptions: {
      ...refereeKeys,
      hmacSecret: "ticket-11-atomic-ranged-rotated-short-seal-v2",
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
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    }],
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v1",
    }],
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
    journal: [applied.receipt],
  });
  assert.equal(crossSealReplay.ok, true);
  assert.equal(crossSealReplay.envelope.stateHash, applied.envelope.stateHash);

  const tampered = structuredClone(applied.receipt);
  tampered.chanceReveal.reveals[0].outcome =
    tampered.chanceReveal.reveals[0].outcome === 6 ? 5 : 6;
  const tamperedReplay = engine.replay({ initialEnvelope: initial, journal: [tampered] });
  assert.equal(tamperedReplay.ok, false);
  assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
});

const failed = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_ranged_attack_rule_slice_v2_report",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failed.length,
  acceptanceTotal: acceptance.length,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  atomicProfileCatalogueHash: gameplayDataBundle.attackProfileCatalogue.catalogueHash,
  slice,
  audit: sliceAudit,
  sliceAudit,
  executor: {
    executorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
  },
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  counts: {
    assertions: acceptance.length,
    passed: acceptance.length - failed.length,
    failed: failed.length,
  },
  acceptance,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v2-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failed.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  schema: report.schema,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  atomicProfileCatalogueHash: report.atomicProfileCatalogueHash,
  counts: report.counts,
  sliceCounts: sliceAudit.counts,
  trainingTruth: false,
}, null, 2));
