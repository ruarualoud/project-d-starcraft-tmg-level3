#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { createOfficialCombatEffectDenominatorV1 } from
  "../packages/rule-atoms/official-combat-effect-denominator-v1.mjs";
import { createOfficialInstantAttackEffectKernelV1 } from
  "../packages/rule-atoms/official-instant-attack-effect-kernel-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialAttackProfileCatalogueV1 } from
  "../packages/source-data/official-attack-profile-catalogue-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
} from "../packages/source-data/official-attack-profile-catalogue-v2.mjs";

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
const profileCatalogueV1 = createOfficialAttackProfileCatalogueV1({ snapshot, dataset });
const profileCatalogueV2 = createOfficialAttackProfileCatalogueV2({
  previousCatalogue: profileCatalogueV1,
});
const denominator = createOfficialCombatEffectDenominatorV1({
  attackProfileCatalogue: profileCatalogueV2,
  previousSlice: previousReport.slice,
});
const kernel = createOfficialInstantAttackEffectKernelV1();
const raptorClaws = getOfficialAttackProfileV2(profileCatalogueV2, {
  recordKey: "army_units:kerrigan_swarm_raptor__zergling_",
  phase: "combat",
  weaponName: "Claws",
});
const kerriganBlades = getOfficialAttackProfileV2(profileCatalogueV2, {
  recordKey: "army_units:kerrigan",
  phase: "combat",
  weaponName: "Blades",
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

function expectFailure(code, fn) {
  assert.throws(fn, (error) => String(error?.message || error).startsWith(code));
}

check("live_current_profile_denominator_is_exact", () => {
  assert.deepEqual(dataset.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(snapshot.snapshotHash,
    "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
  assert.equal(dataset.datasetHash,
    "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
  assert.equal(profileCatalogueV2.profiles.length, 51);
  assert.equal(raptorClaws.profileHash,
    "bde03b02cbf30fbda84d03e406f9937060a1d97f8c24992f77e6b9e351efc21f");
});

check("slice_29_effect_denominator_defect_is_explicitly_corrected", () => {
  assert.equal(denominator.counts.profileEffectAtoms, 13);
  assert.equal(denominator.counts.contextualEffectAtoms, 1);
  assert.equal(denominator.counts.registeredEffectAtoms, 14);
  assert.equal(denominator.counts.executableEffectAtoms, 9);
  assert.equal(denominator.counts.knownUnimplementedEffectAtoms, 5);
  assert.equal(denominator.correction.previousReportedRegisteredEffectAtoms, 13);
  assert.equal(denominator.correction.previousReportedKnownUnimplementedEffectAtoms, 5);
  assert.equal(denominator.correction.correctedBeforeInstantExecutableEffectAtoms, 8);
  assert.equal(denominator.correction.correctedBeforeInstantKnownUnimplementedEffectAtoms, 6);
  assert.equal(denominator.correction.silentCompatibilityAllowed, false);
  assert.match(denominator.correction.correctionReceiptHash, /^[a-f0-9]{64}$/u);
});

check("remaining_effect_ids_are_complete_after_instant", () => {
  assert.deepEqual(denominator.knownUnimplementedEffectAtomIds, [
    "attack-effect:indirect-fire-v1",
    "attack-effect:locked-in-v1",
    "attack-effect:pinpoint-v1",
    "attack-effect:sidearm-v1",
    "attack-effect:specialist-v1",
  ]);
  assert(denominator.executableEffectAtomIds.includes("attack-effect:dodge-v1"));
  assert(denominator.executableEffectAtomIds.includes("attack-effect:instant-v1"));
});

check("instant_profile_suppresses_enemy_reaction_window", () => {
  const plan = kernel.plan({ profile: raptorClaws });
  assert.equal(plan.effectAtomId, "attack-effect:instant-v1");
  assert.equal(plan.enemyReactionDeclarationAllowed, false);
  assert.equal(plan.enemyReactionResolutionAllowed, false);
  assert.equal(plan.appliesOnlyInResponseToThisAttack, true);
  assert.equal(kernel.verify(plan).planHash, plan.planHash);
});

check("non_instant_profile_cannot_claim_reaction_suppression", () => {
  expectFailure("INSTANT_EFFECT_REQUIRED", () => kernel.plan({ profile: kerriganBlades }));
});

check("instant_parameters_and_source_kind_fail_closed", () => {
  const tampered = structuredClone(raptorClaws);
  const effect = tampered.effects.find((entry) => (
    entry.effectAtomId === "attack-effect:instant-v1"
  ));
  effect.parameters = { radius: 99 };
  expectFailure("INSTANT_EFFECT_PROFILE_INVALID", () => kernel.plan({ profile: tampered }));
});

check("instant_plan_hash_detects_tampering", () => {
  const tampered = structuredClone(kernel.plan({ profile: raptorClaws }));
  tampered.enemyReactionResolutionAllowed = true;
  expectFailure("INSTANT_EFFECT_PLAN_INVALID", () => kernel.verify(tampered));
});

check("rule_skill_and_training_promotion_remain_closed", () => {
  assert.equal(denominator.canAffectRules, false);
  assert.equal(denominator.trainingTruth, false);
  assert.equal(kernel.descriptor.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_instant_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  failures,
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  attackProfileCatalogueHash: profileCatalogueV2.catalogueHash,
  denominatorHash: denominator.denominatorHash,
  correctionReceiptHash: denominator.correction.correctionReceiptHash,
  kernelHash: kernel.descriptor.kernelHash,
  effectCounts: denominator.counts,
  acceptance,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "kernel_and_denominator_only_no_skill_promotion",
    promotions: [],
    blocks: ["full_authority_and_replay_slice_pending"],
    remainingRuleGaps: 586,
  },
  canAffectRules: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-instant-attack-effect-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
