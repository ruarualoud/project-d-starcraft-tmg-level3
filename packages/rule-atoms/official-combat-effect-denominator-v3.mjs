import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
  OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
  OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_ID,
  OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_VERSION,
} from "./official-sidearm-pinpoint-effect-kernel-v1.mjs";

export const OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V3_SCHEMA =
  "starcraft_tmg_official_combat_effect_denominator_v3";

const EXPECTED_PREVIOUS_SLICE_HASH =
  "20b4f2b66597a347e6b7213d8c4fc1c6a3ad59ad136b3c36713925e79ceb4121";
const EXPECTED_PREVIOUS_DENOMINATOR_HASH =
  "931c1cbcd31d0a1cb5d332b4d20113153ff36f215cec8d3ce82a1bf961374b3c";
const PREVIOUS_EXECUTABLE = Object.freeze([
  "attack-effect:anti-evade-v1",
  "attack-effect:bulky-v1",
  "attack-effect:burst-fire-v1",
  "attack-effect:critical-hit-v1",
  "attack-effect:dodge-v1",
  "attack-effect:instant-v1",
  "attack-effect:long-range-v1",
  "attack-effect:pierce-v1",
  "attack-effect:specialist-v1",
  "attack-effect:surge-armour-bypass-v1",
]);
const EXPECTED_REMAINING = Object.freeze([
  "attack-effect:indirect-fire-v1",
  "attack-effect:locked-in-v1",
]);

function fail(code) {
  throw new Error(code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function verifyPrevious(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.combatEffectDenominatorHash !== EXPECTED_PREVIOUS_DENOMINATOR_HASH
    || previousSlice.effectKernel?.registeredEffectAtoms !== 14
    || previousSlice.effectKernel?.knownUnimplementedEffectAtoms !== 4
    || !isDeepStrictEqual(previousSlice.effectKernel.executableEffectAtomIds,
      PREVIOUS_EXECUTABLE)
    || !isDeepStrictEqual(previousSlice.effectKernel.knownUnimplementedEffectAtomIds, [
      ...EXPECTED_REMAINING,
      OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
      OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
    ].sort((left, right) => left.localeCompare(right)))) {
    fail("COMBAT_EFFECT_V3_PREVIOUS_SLICE_INVALID");
  }
}

export function createOfficialCombatEffectDenominatorV3(input = {}) {
  verifyPrevious(input.previousSlice);
  const kernel = input.sidearmPinpointKernelDescriptor;
  if (!object(kernel)
    || kernel.kernelId !== OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_ID
    || kernel.kernelVersion !== OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_VERSION
    || !isDeepStrictEqual(kernel.effectAtomIds, [
      OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
      OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
    ])
    || kernel.kernelHash !== hashStarcraftTmgContract(without(kernel, ["kernelHash"]))
    || kernel.indirectFireExecutionAuthorized !== false
    || kernel.lockedInExecutionAuthorized !== false
    || kernel.dataChangeCannotGrantRuleAuthority !== true
    || kernel.trainingTruth !== false) {
    fail("COMBAT_EFFECT_V3_SIDEARM_PINPOINT_KERNEL_INVALID");
  }
  const executableEffectAtomIds = [
    ...PREVIOUS_EXECUTABLE,
    OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
    OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
  ].sort((left, right) => left.localeCompare(right));
  const body = {
    schema: OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V3_SCHEMA,
    previousDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    promotions: kernel.effectAtomIds.map((effectAtomId) => ({
      effectAtomId,
      implementationStatus: "executable_subset",
      kernelId: kernel.kernelId,
      kernelVersion: kernel.kernelVersion,
      kernelHash: kernel.kernelHash,
      exactScope: effectAtomId === OFFICIAL_SIDEARM_EFFECT_ATOM_ID
        ? "one_goliath_autocannon_underbelly_haywire_optional_multi_batch_lifecycle"
        : "underbelly_machine_gun_unengaged_attacker_to_engaged_marine_target_override",
    })),
    executableEffectAtomIds,
    knownUnimplementedEffectAtomIds: [...EXPECTED_REMAINING],
    counts: {
      profileEffectAtoms: 13,
      contextualEffectAtoms: 1,
      registeredEffectAtoms: 14,
      executableEffectAtoms: 12,
      knownUnimplementedEffectAtoms: 2,
    },
    historicalDenominatorMutationAllowed: false,
    silentCompatibilityAllowed: false,
    unknownEffectPolicy: "quarantine_and_fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    canAffectRules: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, denominatorHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCombatEffectDenominatorV3(denominator) {
  if (!object(denominator)
    || denominator.schema !== OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V3_SCHEMA
    || denominator.denominatorHash
      !== hashStarcraftTmgContract(without(denominator, ["denominatorHash"]))
    || denominator.previousDenominatorHash !== EXPECTED_PREVIOUS_DENOMINATOR_HASH
    || denominator.counts?.registeredEffectAtoms !== 14
    || denominator.counts?.executableEffectAtoms !== 12
    || denominator.counts?.knownUnimplementedEffectAtoms !== 2
    || !isDeepStrictEqual(denominator.knownUnimplementedEffectAtomIds,
      EXPECTED_REMAINING)
    || denominator.silentCompatibilityAllowed !== false
    || denominator.trainingTruth !== false) {
    fail("COMBAT_EFFECT_DENOMINATOR_V3_INVALID");
  }
  return denominator;
}
