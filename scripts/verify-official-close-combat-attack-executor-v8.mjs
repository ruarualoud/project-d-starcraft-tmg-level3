#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialCombatEffectDenominatorV1 } from
  "../packages/rule-atoms/official-combat-effect-denominator-v1.mjs";
import {
  applyOfficialCloseCombatAttackV8,
  enumerateOfficialCloseCombatAttackV8,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
} from "../packages/rule-atoms/official-close-combat-attack-executor-v8.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV8,
  verifyOfficialCloseCombatAttackRuleSliceV8,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v8.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH } from
  "../packages/rule-atoms/official-dodge-resolution-kernel-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialAttackProfileCatalogueV2 } from
  "../packages/source-data/official-attack-profile-catalogue-v2.mjs";
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
const RAPTOR_RECORD_KEY = "army_units:kerrigan_swarm_raptor__zergling_";

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v7-report.json"),
  "utf8",
));
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
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
const firstFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const secondFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: firstFactionApplication.firestorePayload,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
});
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({
  snapshot,
  firestorePayloads: {
    ...basePayloads,
    faction_cards: secondFactionApplication.firestorePayload,
  },
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  missionRecordKey: "faction_cards:mission_hold_position",
  unitRecordKeys: [RAPTOR_RECORD_KEY, "army_units:kerrigan", "army_units:marine"],
  attackProfileData: true,
});
const attackProfileCatalogue = createOfficialAttackProfileCatalogueV2({
  previousCatalogue: gameplayDataBundle.attackProfileCatalogue,
});
const combatEffectDenominator = createOfficialCombatEffectDenominatorV1({
  previousSlice: previousReport.slice,
  attackProfileCatalogue,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
const slice = createOfficialCloseCombatAttackRuleSliceV8({
  previousSlice: previousReport.slice,
  combatEffectDenominator,
});
const sliceAudit = verifyOfficialCloseCombatAttackRuleSliceV8({
  previousSlice: previousReport.slice,
  combatEffectDenominator,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const historicalLedger = createOfficialSupplyLossLedgerV1({
  round: 1,
  rulesRuntimeHash: historicalRuntime.descriptor.runtimeHash,
});
const historicalMatchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: historicalRuntime.descriptor.runtimeHash },
};

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
    maxModels: input.maxModels,
    currentSupply: input.currentSupply,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [model(input.modelId, input.xInches, input.baseDiameterInches)],
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function powerField() {
  return {
    id: "p2-power-field",
    sideKey: "player2",
    cardKind: "tactical",
    officialCardRecordKey: "tactical_cards:power_field",
    sourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    readiness: "ready",
    face: "up",
    activeEffects: [],
  };
}

function state(input = {}) {
  const attackerRecordKey = input.attackerRecordKey || RAPTOR_RECORD_KEY;
  const raptor = attackerRecordKey === RAPTOR_RECORD_KEY;
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
    supplyLossLedger: structuredClone(input.supplyLossLedger || historicalLedger),
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
    cardResources: { player1: [], player2: [powerField()] },
    pieces: [
      piece({
        id: raptor ? "p1-raptor" : "p1-kerrigan",
        modelId: raptor ? "p1-raptor-model" : "p1-kerrigan-model",
        sideKey: "player1",
        recordKey: attackerRecordKey,
        maxModels: raptor ? 6 : 1,
        currentSupply: raptor ? 0 : 1,
        xInches: 10,
        baseDiameterInches: raptor ? 1.26 : 1.575,
      }),
      piece({
        id: "p2-marine",
        modelId: "p2-marine-model",
        sideKey: "player2",
        recordKey: "army_units:marine",
        maxModels: 1,
        currentSupply: 0,
        xInches: 11.8,
        baseDiameterInches: 1.26,
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

function instantCandidate(current, matchBinding = historicalMatchBinding) {
  return enumerateOfficialCloseCombatAttackV8(current, {
    sideKey: "player1",
    matchBinding,
  }).candidates.find((candidate) => (
    candidate.actionType === "fight" && candidate.weaponName === "Claws"
  ));
}

function engineWithKeys(refereeKeys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: { ...refereeKeys, hmacSecret },
  });
}

function seatCredentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-${sideKey}-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `${envelope.roomId}-${sideKey}-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
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

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("slice_promotes_one_atom_and_corrects_effect_denominator_explicitly", () => {
  assert.equal(sliceAudit.counts.executableRuleAtoms, 327);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 1);
  assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 585);
  assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(slice.effectKernel.registeredEffectAtoms, 14);
  assert.equal(slice.effectKernel.executableEffectAtomIds.length, 9);
  assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 5);
  assert.equal(slice.effectDenominatorCorrection.historicalSliceMutationAllowed, false);
});

check("latest_raptor_claws_is_one_direct_instant_fight", () => {
  const before = state();
  const candidate = instantCandidate(before);
  assert.ok(candidate, JSON.stringify(enumerateOfficialCloseCombatAttackV8(before, {
    sideKey: "player1",
    matchBinding: historicalMatchBinding,
    includeDisabled: true,
  }), null, 2));
  assert.equal(candidate.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID);
  assert.deepEqual(candidate.chance.layout, { hit: 2, surge: 1, armour: 2, evade: 0 });
  assert.equal(candidate.details.enemyReactionDeclarationAllowed, false);
  assert.equal(candidate.details.enemyReactionResolutionAllowed, false);
  assert.equal(candidate.details.instantPlanHash.length, 64);
});

check("instant_suppresses_power_field_and_surge_d6_kills_marine", () => {
  const before = state();
  const completed = applyOfficialCloseCombatAttackV8(
    before,
    action(instantCandidate(before)),
    {
      matchBinding: historicalMatchBinding,
      postRevision: 1,
      chanceReveals: [6, 6, 6, 1, 1],
    },
  );
  const event = completed.events.find((entry) => entry.type === "close_combat_attack");
  assert.equal(event.reaction.offered, false);
  assert.equal(event.reaction.reason, "instant_enemy_reactions_prohibited");
  assert.equal(event.surgePool.bypassedArmourHits, 2);
  assert.equal(event.armourPool.dice, 0);
  assert.deepEqual(event.armourPool.unusedPreallocatedRolls, [1, 1]);
  assert.equal(event.damagePool.totalDamage, 2);
  assert.equal(completed.state.pieces[1].isDestroyed, true);
  assert.equal(completed.state.cardResources.player2[0].readiness, "ready");
  assert.equal("reactionUsage" in completed.state, false);
  assert.equal("pendingAttack" in completed.state, false);
});

check("zero_hits_still_complete_without_opening_reaction", () => {
  const before = state();
  const completed = applyOfficialCloseCombatAttackV8(
    before,
    action(instantCandidate(before)),
    {
      matchBinding: historicalMatchBinding,
      postRevision: 1,
      chanceReveals: [1, 1, 6, 6, 6],
    },
  );
  const event = completed.events.find((entry) => entry.type === "close_combat_attack");
  assert.equal(event.attackPool.hits, 0);
  assert.equal(event.damagePool.totalDamage, 0);
  assert.equal(completed.state.pieces[1].isDestroyed, false);
  assert.equal(completed.state.cardResources.player2[0].readiness, "ready");
  assert.equal(completed.state.activeSideKey, "player2");
});

check("nonlatest_and_tampered_actions_fail_closed", () => {
  const oldBundle = structuredClone(gameplayDataBundle);
  oldBundle.sourceSnapshotHash = "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c";
  const oldState = state();
  oldState.officialGameplayDataBundle = oldBundle;
  assert.equal(enumerateOfficialCloseCombatAttackV8(oldState, {
    sideKey: "player1",
    matchBinding: {
      ...historicalMatchBinding,
      dataSnapshotHash: hashStarcraftTmgContract(oldBundle),
    },
  }).candidates.some((candidate) => candidate.weaponName === "Claws"), false);

  const before = state();
  const tampered = action(instantCandidate(before));
  tampered.chance.count = 4;
  assert.throws(() => applyOfficialCloseCombatAttackV8(before, tampered, {
    matchBinding: historicalMatchBinding,
    chanceReveals: [6, 6, 6, 1],
  }), /CLOSE_COMBAT_ATTACK_V8_ACTION_MISMATCH/);
});

check("historical_guardian_shell_actions_delegate_through_v8", () => {
  const before = state({ attackerRecordKey: "army_units:kerrigan" });
  const declaration = enumerateOfficialCloseCombatAttackV8(before, {
    sideKey: "player1",
    matchBinding: historicalMatchBinding,
  }).candidates.find((candidate) => candidate.actionType === "declare_fight");
  assert.ok(declaration);
  assert.equal(declaration.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID);
  const declared = applyOfficialCloseCombatAttackV8(before, action(declaration), {
    matchBinding: historicalMatchBinding,
    postRevision: 1,
    chanceReveals: [4, 4, 1, 1, 1, 1],
  });
  assert.equal(declared.delegatedExecutor.executorId,
    "authority.close-combat-attack-v7");
  assert.equal(declared.state.pendingAttack.stage, "reaction_open");
  const defender = enumerateOfficialCloseCombatAttackV8(declared.state, {
    sideKey: "player2",
    matchBinding: historicalMatchBinding,
  }).candidates.map((candidate) => candidate.actionType).sort();
  assert.deepEqual(defender, ["pass_reaction", "use_reaction"]);
});

check("runtime_legal_space_and_apply_use_v8_lineage", () => {
  const runtimeLedger = createOfficialSupplyLossLedgerV1({
    round: 1,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  const runtimeBinding = {
    dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  };
  const before = state({ supplyLossLedger: runtimeLedger });
  const candidate = runtime.enumerate(before, {
    sideKey: "player1",
    matchBinding: runtimeBinding,
  }).candidates.find((entry) => entry.weaponName === "Claws");
  assert.ok(candidate);
  const completed = runtime.apply(before, action(candidate), {
    matchBinding: runtimeBinding,
    postRevision: 1,
    chanceReveals: [6, 6, 6, 1, 1],
  });
  assert.equal(completed.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID);
  assert.equal(completed.events[0].reaction.offered, false);
  assert.equal(runtime.descriptor.executableRuleAtomCount, 327);
  assert.equal(runtime.descriptor.productionRoomEligible, false);
});

check("authority_preview_confirm_apply_replay_and_tamper_rejection_are_exact", () => {
  const runtimeLedger = createOfficialSupplyLossLedgerV1({
    round: 1,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  const refereeKeys = generateKeyPairSync("ed25519");
  const engine = engineWithKeys(refereeKeys, "ticket-11-instant-short-seal-v1");
  const initial = engine.createEnvelope({
    roomId: "official-instant-authority-room",
    dataVersion:
      `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: {
        artifactId: "official-command-center-snapshot-2026-08-26",
        content: snapshot,
      },
      dataSnapshot: {
        artifactId: "official-instant-gameplay-data-bundle",
        content: gameplayDataBundle,
      },
    },
    state: state({ supplyLossLedger: runtimeLedger }),
  });
  registerReplayDependencies(engine, initial);
  const credentials = seatCredentials(engine, initial, "player1", "instant");
  const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
  const finite = legal.finiteActions.find((entry) => entry.action.weaponName === "Claws");
  assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
  const preview = engine.preview({
    envelope: initial,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  assert.equal(preview.preview.core.chanceTicket.tickets.length, 5);
  const confirmed = engine.confirmPreview({
    envelope: initial,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope: initial,
    expectedStateRevision: initial.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey: "official-instant-authority-room-apply",
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  assert.equal(applied.receipt.action.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID);
  assert.equal(applied.receipt.events[0].reaction.offered, false);
  assert.equal(applied.envelope.state.cardResources.player2[0].readiness, "ready");
  assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(applied.receipt.eligibleForTraining, false);

  const responder = seatCredentials(engine, applied.envelope, "player2", "after-instant");
  const responderLegal = engine.legalSpace(applied.envelope, {
    seatAuthority: responder.authority,
  });
  assert.equal(responderLegal.finiteActions.some((entry) => (
    ["use_reaction", "pass_reaction"].includes(entry.action.actionType)
  )), false);

  const replayEngine = engineWithKeys(
    refereeKeys,
    "ticket-11-instant-rotated-short-seal-v2",
  );
  registerReplayDependencies(replayEngine, initial);
  const replay = replayEngine.replay({
    initialEnvelope: initial,
    journal: [applied.receipt],
  });
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

  const tampered = structuredClone(applied.receipt);
  tampered.events[0].reaction.offered = true;
  const rejected = replayEngine.replay({
    initialEnvelope: initial,
    journal: [tampered],
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "SIGNATURE_INVALID");
});

check("ctx2skill_harness_memory_and_training_promotion_stay_closed", () => {
  assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.equal(slice.harness.harnessLoopUsed, true);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.harness.memoryTraceEvidence,
    "no-memory-write-or-promotion-attempted");
  assert.equal(slice.rulesEligible, false);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_close_combat_attack_rule_slice_v8_report",
  generatedAt: new Date().toISOString(),
  verifier: "official-close-combat-attack-rule-slice-v8",
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  combatEffectDenominatorHash: combatEffectDenominator.denominatorHash,
  combatEffectCorrectionReceiptHash:
    combatEffectDenominator.correction.correctionReceiptHash,
  latestOfficialData: {
    sourceSnapshotHash: snapshot.snapshotHash,
    datasetHash: dataset.datasetHash,
    dataVersions: dataset.dataVersions,
    repositoryFallbackAllowed: false,
  },
  audit: sliceAudit,
  sliceAudit,
  slice,
  runtime: runtime.descriptor,
  runtimeDescriptor: runtime.descriptor,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  canAffectRules: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v8-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  generatedAt: report.generatedAt,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  sourceSnapshotHash: report.sourceSnapshotHash,
  normalizedDatasetHash: report.normalizedDatasetHash,
  combatEffectDenominatorHash: report.combatEffectDenominatorHash,
  combatEffectCorrectionReceiptHash: report.combatEffectCorrectionReceiptHash,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  counts: sliceAudit.counts,
  effectCounts: combatEffectDenominator.counts,
  harness: {
    harnessLoopUsed: slice.harness.harnessLoopUsed,
    trainingTraceCandidates: slice.harness.trainingTraceCandidates,
  },
  canAffectRules: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
