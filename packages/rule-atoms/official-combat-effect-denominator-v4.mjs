import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
  OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_ID,
  OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_VERSION,
  OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
} from "./official-indirect-fire-locked-in-effect-kernel-v1.mjs";

export const OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V4_SCHEMA =
  "starcraft_tmg_official_combat_effect_denominator_v4";

const EXPECTED_PREVIOUS_SLICE_HASH =
  "6bdaab04298bd7d3345ccc35161f1d2230c778a08ce91fa789d77281813a89dc";
const EXPECTED_PREVIOUS_DENOMINATOR_HASH =
  "080df4f5f8d065a5be79a21901003c65424d990bd9508a230c39317c2b402307";
const PREVIOUS_EXECUTABLE = Object.freeze([
  "attack-effect:anti-evade-v1",
  "attack-effect:bulky-v1",
  "attack-effect:burst-fire-v1",
  "attack-effect:critical-hit-v1",
  "attack-effect:dodge-v1",
  "attack-effect:instant-v1",
  "attack-effect:long-range-v1",
  "attack-effect:pierce-v1",
  "attack-effect:pinpoint-v1",
  "attack-effect:sidearm-v1",
  "attack-effect:specialist-v1",
  "attack-effect:surge-armour-bypass-v1",
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
    || previousSlice.combatEffectDenominatorHash
      !== EXPECTED_PREVIOUS_DENOMINATOR_HASH
    || previousSlice.effectKernel?.registeredEffectAtoms !== 14
    || previousSlice.effectKernel?.knownUnimplementedEffectAtoms !== 2
    || !isDeepStrictEqual(previousSlice.effectKernel.executableEffectAtomIds,
      PREVIOUS_EXECUTABLE)
    || !isDeepStrictEqual(previousSlice.effectKernel.knownUnimplementedEffectAtomIds, [
      OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
      OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
    ])) {
    fail("COMBAT_EFFECT_V4_PREVIOUS_SLICE_INVALID");
  }
}

export function createOfficialCombatEffectDenominatorV4(input = {}) {
  verifyPrevious(input.previousSlice);
  const kernel = input.indirectFireLockedInKernelDescriptor;
  if (!object(kernel)
    || kernel.kernelId !== OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_ID
    || kernel.kernelVersion !== OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_VERSION
    || !isDeepStrictEqual(kernel.effectAtomIds, [
      OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
      OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
    ])
    || kernel.kernelHash !== hashStarcraftTmgContract(without(kernel, ["kernelHash"]))
    || kernel.indirectFirePolicy?.mayIgnoreLineOfSight !== true
    || kernel.indirectFirePolicy?.mustRemainWithinRange !== true
    || kernel.indirectFirePolicy?.offLineOfSightTargetMayEvade !== true
    || kernel.lockedInPolicy?.status !== "stationary"
    || kernel.lockedInPolicy?.additionalRateOfAttack !== 6
    || kernel.dataChangeCannotGrantRuleAuthority !== true
    || kernel.trainingTruth !== false) {
    fail("COMBAT_EFFECT_V4_INDIRECT_LOCKED_KERNEL_INVALID");
  }
  const executableEffectAtomIds = [
    ...PREVIOUS_EXECUTABLE,
    OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
    OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
  ].sort((left, right) => left.localeCompare(right));
  const body = {
    schema: OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V4_SCHEMA,
    previousDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    promotions: kernel.effectAtomIds.map((effectAtomId) => ({
      effectAtomId,
      implementationStatus: "executable_subset",
      kernelId: kernel.kernelId,
      kernelVersion: kernel.kernelVersion,
      kernelHash: kernel.kernelHash,
      exactScope: effectAtomId === OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID
        ? "scatter_missiles_may_ignore_one_proven_full_cover_los_barrier_remains_range_bound_and_grants_off_los_evade"
        : "scatter_missiles_add_six_effective_roa_against_target_with_stationary_status",
    })),
    executableEffectAtomIds,
    knownUnimplementedEffectAtomIds: [],
    counts: {
      profileEffectAtoms: 13,
      contextualEffectAtoms: 1,
      registeredEffectAtoms: 14,
      executableEffectAtoms: 14,
      knownUnimplementedEffectAtoms: 0,
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

export function verifyOfficialCombatEffectDenominatorV4(denominator) {
  if (!object(denominator)
    || denominator.schema !== OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V4_SCHEMA
    || denominator.denominatorHash
      !== hashStarcraftTmgContract(without(denominator, ["denominatorHash"]))
    || denominator.previousDenominatorHash !== EXPECTED_PREVIOUS_DENOMINATOR_HASH
    || denominator.counts?.registeredEffectAtoms !== 14
    || denominator.counts?.executableEffectAtoms !== 14
    || denominator.counts?.knownUnimplementedEffectAtoms !== 0
    || !isDeepStrictEqual(denominator.knownUnimplementedEffectAtomIds, [])
    || denominator.silentCompatibilityAllowed !== false
    || denominator.trainingTruth !== false) {
    fail("COMBAT_EFFECT_DENOMINATOR_V4_INVALID");
  }
  return denominator;
}
