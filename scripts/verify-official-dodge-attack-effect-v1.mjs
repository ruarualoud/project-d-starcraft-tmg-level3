#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCriticalHitResolutionKernelV2 } from
  "../packages/rule-atoms/official-critical-hit-resolution-kernel-v2.mjs";
import { createOfficialDodgeResolutionKernelV1 } from
  "../packages/rule-atoms/official-dodge-resolution-kernel-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const DODGE_SOURCE = "power_field_guardian_shell_current_official_card";
const DODGE = createOfficialDodgeResolutionKernelV1();
const CRITICAL = createOfficialCriticalHitResolutionKernelV2();

function profile() {
  const body = {
    schema: "starcraft_tmg_official_attack_profile_v2",
    profileKey: "army_units:kerrigan::combat::Blades",
    previousProfileHash:
      "8f718bc26b4a42fdc369c0d8f1c7f145f4080cd8b137dc316986a2f9be316c97",
    sourceRecordHash:
      "9555e809c6f8f6a764a6469ba8911fa76224f4fc4147e637a9146f8f9de7c7b0",
    phase: "combat",
    weaponName: "Blades",
    rateOfAttack: 6,
    hitThreshold: 4,
    damage: 2,
    range: { kind: "engagement" },
    targetTags: ["ground"],
    surge: null,
    effects: [{
      effectAtomId: "attack-effect:critical-hit-v1",
      parameters: { bypassArmourDice: 2 },
      sourceKind: "weapon_keyword",
    }],
    canAffectRules: false,
    rulesTruth: "official_profile_data_v2_with_rule_authority_external",
    trainingTruth: false,
  };
  return { ...body, profileHash: hashStarcraftTmgContract(body) };
}

function dodge(reduction = 2) {
  return {
    present: true,
    reduction,
    source: DODGE_SOURCE,
    sourceRecordHash:
      "65bc452416df2ab8c4275810e8333d5557e990de1ce9ae88bc135771637bdc58",
    abilityName: "Guardian Shell",
    duration: "this_armour_roll",
  };
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

check("dodge_reduces_one_combined_resolve_surge_transfer_budget", () => {
  const plan = DODGE.plan({
    armourPoolDice: 4,
    targetDodge: dodge(2),
    transferRequests: [
      { effectAtomId: "attack-effect:surge-armour-bypass-v1", requestedDice: 3 },
      { effectAtomId: "attack-effect:critical-hit-v1", requestedDice: 2 },
    ],
  });
  const receipt = DODGE.resolve(plan);
  assert.equal(receipt.requestedTransferDice, 5);
  assert.equal(receipt.transferDiceBeforeDodge, 4);
  assert.equal(receipt.dodgeReductionApplied, 2);
  assert.equal(receipt.transferredDamagePoolDice, 2);
  assert.equal(receipt.remainingArmourPoolDice, 2);
  assert.deepEqual(receipt.transferEffectAtomIds, [
    "attack-effect:surge-armour-bypass-v1",
    "attack-effect:critical-hit-v1",
  ]);
});

check("dodge_never_reduces_below_zero_or_moves_more_than_armour_pool", () => {
  const receipt = DODGE.resolve(DODGE.plan({
    armourPoolDice: 2,
    targetDodge: dodge(9),
    transferRequests: [{
      effectAtomId: "attack-effect:critical-hit-v1",
      requestedDice: 9,
    }],
  }));
  assert.equal(receipt.transferDiceBeforeDodge, 2);
  assert.equal(receipt.dodgeReductionApplied, 2);
  assert.equal(receipt.transferredDamagePoolDice, 0);
  assert.equal(receipt.remainingArmourPoolDice, 2);
});

check("absent_dodge_preserves_the_capped_transfer", () => {
  const receipt = DODGE.resolve(DODGE.plan({
    armourPoolDice: 3,
    targetDodge: {
      present: false,
      reduction: 0,
      source: "target_official_profile_and_effect_state",
    },
    transferRequests: [{
      effectAtomId: "attack-effect:surge-armour-bypass-v1",
      requestedDice: 2,
    }],
  }));
  assert.equal(receipt.dodgeReductionApplied, 0);
  assert.equal(receipt.transferredDamagePoolDice, 2);
  assert.equal(receipt.remainingArmourPoolDice, 1);
});

check("critical_hit_v2_composes_guardian_shell_without_extra_hits", () => {
  const plan = CRITICAL.plan({
    profile: profile(),
    attackPoolDice: 6,
    targetDodge: dodge(2),
  });
  const receipt = CRITICAL.resolve(plan, { attackPoolHits: 2 });
  assert.equal(receipt.maximumBypassArmourDice, 2);
  assert.equal(receipt.transferDiceBeforeDodge, 2);
  assert.equal(receipt.dodgeReductionApplied, 2);
  assert.equal(receipt.bypassedArmourDice, 0);
  assert.equal(receipt.armourPoolDice, 2);
  assert.equal(receipt.damagePoolBypassDice, 0);
  assert.equal(receipt.generatedAdditionalHits, 0);
});

check("critical_hit_v2_preserves_historical_no_dodge_semantics", () => {
  const plan = CRITICAL.plan({
    profile: profile(),
    attackPoolDice: 6,
    targetDodge: {
      present: false,
      reduction: 0,
      source: "target_official_profile_and_effect_state",
    },
  });
  const receipt = CRITICAL.resolve(plan, { attackPoolHits: 2 });
  assert.equal(receipt.bypassedArmourDice, 2);
  assert.equal(receipt.armourPoolDice, 0);
});

check("dodge_requires_exact_source_bound_evidence", () => {
  assert.throws(() => DODGE.plan({
    armourPoolDice: 2,
    targetDodge: { ...dodge(2), sourceRecordHash: "0".repeat(64) },
    transferRequests: [{
      effectAtomId: "attack-effect:critical-hit-v1",
      requestedDice: 2,
    }],
  }), /DODGE_SOURCE_RECORD_MISMATCH/);
});

check("unsupported_transfer_effects_fail_closed", () => {
  assert.throws(() => DODGE.plan({
    armourPoolDice: 2,
    targetDodge: dodge(2),
    transferRequests: [{ effectAtomId: "attack-effect:invented", requestedDice: 2 }],
  }), /DODGE_TRANSFER_EFFECT_UNSUPPORTED/);
});

check("invalid_reduction_and_armour_denominators_fail_closed", () => {
  assert.throws(() => DODGE.plan({
    armourPoolDice: -1,
    targetDodge: dodge(2),
    transferRequests: [],
  }), /DODGE_ARMOUR_POOL_INVALID/);
  assert.throws(() => DODGE.plan({
    armourPoolDice: 2,
    targetDodge: dodge(1.5),
    transferRequests: [],
  }), /DODGE_REDUCTION_INVALID/);
});

check("tampered_plans_and_receipts_fail_hash_verification", () => {
  const plan = DODGE.plan({
    armourPoolDice: 2,
    targetDodge: dodge(2),
    transferRequests: [{
      effectAtomId: "attack-effect:critical-hit-v1",
      requestedDice: 2,
    }],
  });
  const tamperedPlan = structuredClone(plan);
  tamperedPlan.armourPoolDice = 99;
  assert.throws(() => DODGE.resolve(tamperedPlan), /DODGE_PLAN_INVALID/);
  const receipt = DODGE.resolve(plan);
  const tamperedReceipt = structuredClone(receipt);
  tamperedReceipt.transferredDamagePoolDice = 99;
  assert.throws(() => DODGE.verifyReceipt(tamperedReceipt), /DODGE_RECEIPT_INVALID/);
});

check("descriptors_bind_shared_resolve_surge_order_and_no_training_truth", () => {
  assert.deepEqual(DODGE.descriptor.supportedTransferEffectAtomIds, [
    "attack-effect:surge-armour-bypass-v1",
    "attack-effect:critical-hit-v1",
  ]);
  assert.equal(DODGE.descriptor.timing, "resolve_surge");
  assert.equal(DODGE.descriptor.sharedReductionBudget, true);
  assert.equal(DODGE.descriptor.trainingTruth, false);
  assert.equal(CRITICAL.descriptor.dodgeInteraction, "official_dodge_kernel_v1");
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_dodge_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  dodgeKernel: DODGE.descriptor,
  criticalHitKernel: CRITICAL.descriptor,
  officialPowerFieldSourceRecordHash:
    "65bc452416df2ab8c4275810e8333d5557e990de1ce9ae88bc135771637bdc58",
  officialCorePdfHash:
    "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  rulesTruth: "official_dodge_shared_resolve_surge_reduction_kernel",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-dodge-attack-effect-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  dodgeKernelHash: DODGE.descriptor.kernelHash,
  criticalHitKernelHash: CRITICAL.descriptor.kernelHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
