#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV1,
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../packages/source-data/official-attack-profile-catalogue-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialAttackResolutionKernelV1 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v1.mjs";

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

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

function rebindSnapshotCollection(originalSnapshot, collectionId, payload) {
  const rebound = structuredClone(originalSnapshot);
  const collection = rebound.firestoreCollections.find((entry) => (
    entry.collectionId === collectionId
  ));
  collection.rawResponseHash = hashStarcraftTmgContract(payload);
  const byDocumentId = new Map(payload.documents.map((document) => {
    const documentId = document.name.split("/").at(-1);
    return [documentId, document];
  }));
  collection.recordIndex = collection.recordIndex.map((record) => {
    const document = byDocumentId.get(record.documentId);
    return {
      ...record,
      fieldHash: hashStarcraftTmgContract(document.fields),
      recordHash: hashStarcraftTmgContract({
        documentId: record.documentId,
        fields: document.fields,
      }),
    };
  });
  collection.semanticContentHash = hashStarcraftTmgContract(
    collection.recordIndex.map((record) => ({
      documentId: record.documentId,
      recordHash: record.recordHash,
    })),
  );
  const { snapshotHash: _snapshotHash, ...body } = rebound;
  rebound.snapshotHash = hashStarcraftTmgContract(body);
  return rebound;
}

function expectFailure(code, fn) {
  assert.throws(fn, (error) => String(error?.message || error).startsWith(code));
}

const catalogue = createOfficialAttackProfileCatalogueV1({ snapshot, dataset });
const audit = verifyOfficialAttackProfileCatalogueV1(catalogue);

check("latest_official_profile_denominator_is_complete", () => {
  assert.deepEqual(catalogue.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(audit.counts.unitRecords, 26);
  assert.equal(audit.counts.attackProfiles, 51);
  assert.equal(audit.counts.byPhase.assault, 23);
  assert.equal(audit.counts.byPhase.combat, 28);
  assert.equal(audit.counts.unknownEffects, 0);
});

check("effect_registry_is_atomic_and_exact", () => {
  assert.deepEqual(catalogue.effectRegistry.map((effect) => effect.effectAtomId), [
    "attack-effect:anti-evade-v1",
    "attack-effect:bulky-v1",
    "attack-effect:burst-fire-v1",
    "attack-effect:critical-hit-v1",
    "attack-effect:indirect-fire-v1",
    "attack-effect:instant-v1",
    "attack-effect:locked-in-v1",
    "attack-effect:long-range-v1",
    "attack-effect:pierce-v1",
    "attack-effect:pinpoint-v1",
    "attack-effect:sidearm-v1",
    "attack-effect:specialist-v1",
    "attack-effect:surge-armour-bypass-v1",
  ]);
  assert.equal(new Set(catalogue.profiles.map((profile) => profile.profileHash)).size, 51);
});

const c14 = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:marine",
  phase: "assault",
  weaponName: "C-14 rifle",
});
const autocannon = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:goliath",
  phase: "assault",
  weaponName: "Autocannon",
});

check("c14_compiles_to_base_attributes_plus_surge_effect", () => {
  assert.deepEqual({
    range: c14.range,
    targetTags: c14.targetTags,
    rateOfAttack: c14.rateOfAttack,
    hitThreshold: c14.hitThreshold,
    damage: c14.damage,
    effects: c14.effects,
  }, {
    range: { kind: "inches", normalRangeInches: 12 },
    targetTags: ["all"],
    rateOfAttack: 2,
    hitThreshold: 3,
    damage: 1,
    effects: [{
      effectAtomId: "attack-effect:surge-armour-bypass-v1",
      parameters: { diceExpression: "D3", targetTags: ["light"] },
      sourceKind: "surge",
    }],
  });
});

check("long_range_keyword_compiles_to_parameterized_effect", () => {
  assert.deepEqual(autocannon.range, { kind: "inches", normalRangeInches: 12 });
  assert.equal(autocannon.rateOfAttack, 9);
  assert.equal(autocannon.hitThreshold, 4);
  assert.equal(autocannon.surge, null);
  assert.deepEqual(autocannon.effects, [{
    effectAtomId: "attack-effect:long-range-v1",
    parameters: { maximumRangeInches: 18 },
    sourceKind: "weapon_keyword",
  }]);
});

const kernel = createOfficialAttackResolutionKernelV1();
check("kernel_declares_only_proven_effect_handlers", () => {
  assert.deepEqual(kernel.descriptor.supportedEffectAtomIds, [
    "attack-effect:long-range-v1",
    "attack-effect:surge-armour-bypass-v1",
  ]);
  assert.equal(kernel.descriptor.trainingTruth, false);
});

check("c14_resolution_preserves_slice_22_behavior", () => {
  const plan = kernel.plan({
    profile: c14,
    target: { armourThreshold: 5, combatTags: ["biological", "ground", "light"] },
    distanceInches: 10,
    evadeEligible: false,
  });
  assert.deepEqual(plan.chance.layout, { hit: 2, surge: 1, armour: 2, evade: 0 });
  const result = kernel.resolve(plan, [2, 6, 1, 5, 1]);
  assert.equal(result.stages.hit.hits, 1);
  assert.equal(result.stages.effects.bypassedArmourHits, 1);
  assert.equal(result.stages.armour.dice, 0);
  assert.equal(result.stages.damage.damagePoolDice, 1);
});

check("long_range_uses_normal_profile_inside_base_range", () => {
  const plan = kernel.plan({
    profile: autocannon,
    target: { armourThreshold: 5, combatTags: ["biological", "ground", "light"] },
    distanceInches: 12,
    evadeEligible: false,
  });
  assert.equal(plan.rangeBand, "normal");
  assert.equal(plan.effectiveHitThreshold, 4);
  assert.deepEqual(plan.chance.layout, { hit: 9, surge: 0, armour: 9, evade: 0 });
});

check("long_range_extended_band_applies_hit_penalty", () => {
  const plan = kernel.plan({
    profile: autocannon,
    target: { armourThreshold: 5, combatTags: ["biological", "ground", "light"] },
    distanceInches: 17,
    evadeEligible: false,
  });
  assert.equal(plan.rangeBand, "extended");
  assert.equal(plan.effectiveHitThreshold, 5);
  assert.equal(plan.chance.count, 18);
  const result = kernel.resolve(plan, Array.from({ length: 18 }, () => ({ faces: 6, outcome: 6 })));
  assert.equal(result.stages.hit.hits, 9);
  assert.equal(result.stages.armour.saves, 9);
  assert.equal(result.stages.damage.damagePoolDice, 0);
});

check("long_range_rejects_beyond_effect_maximum", () => {
  expectFailure("ATTACK_TARGET_OUT_OF_RANGE", () => kernel.plan({
    profile: autocannon,
    target: { armourThreshold: 5, combatTags: ["biological", "ground", "light"] },
    distanceInches: 18.001,
    evadeEligible: false,
  }));
});

check("known_but_unimplemented_effect_fails_closed", () => {
  const glaive = getOfficialAttackProfileV1(catalogue, {
    recordKey: "army_units:adept",
    phase: "assault",
    weaponName: "Glaive Cannon",
  });
  expectFailure("ATTACK_EFFECT_HANDLER_UNAVAILABLE", () => kernel.plan({
    profile: glaive,
    target: { armourThreshold: 5, combatTags: ["biological", "ground", "light"] },
    distanceInches: 8,
    evadeEligible: false,
  }));
});

check("unknown_effect_syntax_is_quarantined_at_compilation", () => {
  const tamperedPayloads = structuredClone(firestorePayloads);
  const goliath = tamperedPayloads.army_units.documents.find((document) => (
    document.fields.id.stringValue === "goliath"
  ));
  const autocannonUpgrade = goliath.fields.upgrades.arrayValue.values.find((value) => (
    value.mapValue.fields.name.stringValue === "Autocannon"
  ));
  autocannonUpgrade.mapValue.fields.description.stringValue =
    autocannonUpgrade.mapValue.fields.description.stringValue.replace(
      "LONG RANGE (18\")",
      "LONG RANGE (18\"), MYSTERY EFFECT (7)",
    );
  const driftSnapshot = rebindSnapshotCollection(
    snapshot,
    "army_units",
    tamperedPayloads.army_units,
  );
  const driftDataset = createOfficialCommandCenterDataset({
    snapshot: driftSnapshot,
    firestorePayloads: tamperedPayloads,
  });
  expectFailure("OFFICIAL_ATTACK_EFFECT_UNKNOWN", () => (
    createOfficialAttackProfileCatalogueV1({ snapshot: driftSnapshot, dataset: driftDataset })
  ));
});

check("catalogue_hash_detects_post_compile_tampering", () => {
  const tampered = structuredClone(catalogue);
  tampered.profiles[0].damage = 99;
  expectFailure("OFFICIAL_ATTACK_PROFILE_CATALOGUE_HASH_MISMATCH", () => (
    verifyOfficialAttackProfileCatalogueV1(tampered)
  ));
});

const failed = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_attack_profile_effect_denominator_report_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  catalogueHash: catalogue.catalogueHash,
  kernelHash: kernel.descriptor.kernelHash,
  acceptancePassed: acceptance.length - failed.length,
  acceptanceTotal: acceptance.length,
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
  path.join(OUTPUT_DIR, "official-attack-profile-effect-denominator-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failed.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
