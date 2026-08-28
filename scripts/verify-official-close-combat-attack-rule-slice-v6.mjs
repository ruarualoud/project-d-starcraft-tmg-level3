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
  applyOfficialCloseCombatAttackV6,
  enumerateOfficialCloseCombatAttackV6,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-close-combat-attack-executor-v6.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV6,
  verifyOfficialCloseCombatAttackRuleSliceV6,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v6.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

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
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-ranged-attack-rule-slice-v6-report.json"),
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
  missionRecordKey: "faction_cards:mission_hold_position",
  unitRecordKeys: ["army_units:kerrigan", "army_units:marine"],
  attackProfileData: true,
});
const previousSlice = previousReport.slice;
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousSlice.catalogue,
});
const slice = createOfficialCloseCombatAttackRuleSliceV6({ previousSlice });
const sliceAudit = verifyOfficialCloseCombatAttackRuleSliceV6({
  previousSlice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const supplyLossLedger = createOfficialSupplyLossLedgerV1({
  round: 1,
  rulesRuntimeHash: runtime.descriptor.runtimeHash,
});
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

function model(id, xInches, baseDiameterInches) {
  return {
    id,
    xInches,
    yInches: 10,
    baseShape: "round",
    baseWidthInches: baseDiameterInches,
    baseDepthInches: baseDiameterInches,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isDestroyed: false,
    isOnField: true,
  };
}

function piece(input) {
  const profile = gameplayDataBundle.combatProfileBundle
    .profilesByRecordKey[input.recordKey];
  return {
    id: input.id,
    sideKey: input.sideKey,
    name: profile.unitName,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
    currentModels: 1,
    maxModels: 1,
    currentSupply: input.currentSupply,
    damageMarker: 0,
    statuses: [],
    combatEffects: input.combatEffects || [],
    assaultEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [model(input.modelId, input.xInches, input.baseDiameterInches)],
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function state(input = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "1:combat": {
        round: 1,
        phase: "combat",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    supplyLossLedger: structuredClone(supplyLossLedger),
    board: {
      widthInches: 54,
      heightInches: 36,
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece({
        id: "p1-kerrigan",
        modelId: "p1-kerrigan-model",
        sideKey: "player1",
        recordKey: "army_units:kerrigan",
        currentSupply: 1,
        xInches: 10,
        baseDiameterInches: 1.575,
      }),
      piece({
        id: "p2-marine",
        modelId: "p2-marine-model",
        sideKey: "player2",
        recordKey: "army_units:marine",
        currentSupply: 0,
        xInches: 11.8,
        baseDiameterInches: 1.26,
        combatEffects: input.targetCombatEffects || [],
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
    now: () => OCCURRED_AT,
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

check("slice_promotes_one_critical_hit_atom_and_freezes_slice_27", () => {
  assert.deepEqual(OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS, [
    "rule-atom:singleton:core-11-critical-hit-resolution:7501d86a7392",
  ]);
  assert.equal(sliceAudit.counts.executableRuleAtoms, 306);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 1);
  assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 606);
  assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(
    historicalRuntime.descriptor.runtimeHash,
    "17c91887a32c1e8b76aeafbea5f65c7ac2f5b0f4234caf7b468521621f012562",
  );
});

check("kerrigan_blades_exposes_exact_critical_hit_chance_contract", () => {
  const candidates = enumerateOfficialCloseCombatAttackV6(state(), {
    sideKey: "player1",
    matchBinding,
  }).candidates;
  assert.equal(candidates.length, 1);
  const blades = candidates[0];
  assert.equal(blades.weaponName, "Blades");
  assert.equal(blades.closeRanksMode, "decline");
  assert.equal(blades.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID);
  assert.equal(blades.executorVersion, OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION);
  assert.deepEqual(blades.chance.layout, { hit: 6, armour: 6, evade: 0, surge: 0 });
  assert.equal(blades.chance.count, 12);
  assert.equal(blades.details.maximumBypassArmourDice, 2);
  assert.equal(blades.details.generatedAdditionalHits, 0);
});

check("critical_hit_bypasses_armour_before_armour_rolls_and_records_damage", () => {
  const before = state();
  const candidate = enumerateOfficialCloseCombatAttackV6(before, {
    sideKey: "player1",
    matchBinding,
  }).candidates[0];
  const transition = applyOfficialCloseCombatAttackV6(before, action(candidate), {
    matchBinding,
    postRevision: 1,
    chanceReveals: [4, 4, 1, 1, 1, 1, 6, 6, 6, 6, 6, 6],
  });
  const event = transition.events.find((entry) => entry.type === "close_combat_attack");
  assert.equal(event.attackPool.hits, 2);
  assert.equal(event.criticalHit.bypassedArmourDice, 2);
  assert.equal(event.criticalHit.generatedAdditionalHits, 0);
  assert.equal(event.armourPool.dice, 0);
  assert.equal(event.armourPool.unusedPreallocatedRolls.length, 6);
  assert.equal(event.damagePool.dice, 2);
  assert.equal(event.damagePool.damagePerDie, 2);
  assert.equal(event.damagePool.totalDamage, 4);
  assert.equal(transition.state.pieces[1].isDestroyed, true);
  assert.deepEqual(transition.state.supplyLossLedger.entries, []);
  assert.deepEqual(transition.state.supplyLossLedger.lossBySide, {
    player1: 0,
    player2: 0,
  });
});

check("dodge_keyword_interaction_is_not_silently_approximated", () => {
  const disabled = enumerateOfficialCloseCombatAttackV6(state({
    targetCombatEffects: [{
      effectAtomId: "attack-effect:dodge-v1",
      parameters: { reduction: 1 },
    }],
  }), {
    sideKey: "player1",
    matchBinding,
    includeDisabled: true,
  }).candidates.find((entry) => entry.weaponName === "Blades");
  assert.equal(disabled.isEnabled, false);
  assert.equal(disabled.disabledReason, "CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED");
});

check("authority_preview_apply_and_replay_bind_critical_hit", () => {
  const refereeKeys = generateKeyPairSync("ed25519");
  const engine = engineWithKeys(refereeKeys, "ticket-11-critical-hit-short-seal-v1");
  const initial = engine.createEnvelope({
    roomId: "official-critical-hit-authority-room",
    dataVersion:
      `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: {
        artifactId: "official-command-center-snapshot-2026-08-25",
        content: snapshot,
      },
      dataSnapshot: {
        artifactId: "official-critical-hit-gameplay-data-bundle",
        content: gameplayDataBundle,
      },
    },
    state: state(),
  });
  registerReplayDependencies(engine, initial);
  const credentials = playerCredentials(engine, initial);
  const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
  const fight = legal.finiteActions.find((entry) => entry.action.weaponName === "Blades");
  assert.ok(fight);
  const preview = engine.preview({
    envelope: initial,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: fight.actionKey },
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.preview.core.chanceTicket.tickets.length, 12);
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
    idempotencyKey: "ticket-11-critical-hit-apply-v1",
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.receipt.action.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID);
  assert.equal(applied.receipt.chanceReveal.reveals.length, 12);
  assert.equal(applied.receipt.eligibleForTraining, false);

  const replayEngine = engineWithKeys(
    refereeKeys,
    "ticket-11-critical-hit-rotated-short-seal-v2",
  );
  registerReplayDependencies(replayEngine, initial);
  const replay = replayEngine.replay({
    initialEnvelope: initial,
    journal: [applied.receipt],
  });
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

  const tampered = structuredClone(applied.receipt);
  tampered.events[0].criticalHit.bypassedArmourDice = 99;
  const tamperedReplay = engine.replay({ initialEnvelope: initial, journal: [tampered] });
  assert.equal(tamperedReplay.ok, false);
  assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
});

check("runtime_latest_data_and_promotion_boundaries_remain_closed", () => {
  assert.equal(snapshot.snapshotHash, "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c");
  assert.equal(dataset.datasetHash, "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021");
  assert.equal(runtime.descriptor.catalogueHash, slice.catalogueHash);
  assert.equal(runtime.descriptor.executableRuleAtomCount, 306);
  assert.equal(runtime.descriptor.productionRoomEligible, false);
  assert.equal(slice.effectKernel.executableEffectAtomIds.length, 7);
  assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 6);
  assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
  assert.equal(slice.ctx2skill.promotions.length, 0);
  assert.equal(slice.harness.trainingTraceCandidates.length, 0);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_close_combat_attack_rule_slice_v6_report",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  slice,
  audit: sliceAudit,
  sliceAudit,
  executor: {
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  },
  runtime: runtime.descriptor,
  acceptance,
  failures,
  rulesTruth: "official_critical_hit_kerrigan_blades_close_combat_subset",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v6-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  historicalRuntimeHash: report.historicalRuntimeHash,
  executableRuleAtomCount: runtime.descriptor.executableRuleAtomCount,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
