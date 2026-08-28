import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_ID,
  OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_VERSION,
  OFFICIAL_SPECIALIST_EFFECT_ATOM_ID,
} from "./official-specialist-batch-effect-kernel-v1.mjs";

export const OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V2_SCHEMA =
  "starcraft_tmg_official_combat_effect_denominator_v2";

const EXPECTED_PREVIOUS_SLICE_HASH =
  "08b75feed79463b757da0e6641ac2e44d120746147b0273eef73cd903732c639";
const EXPECTED_PREVIOUS_DENOMINATOR_HASH =
  "d564e91dabcc2017ff603fab3f999fd797c70f6834c99f1939d8aefc62d63961";
const PREVIOUS_EXECUTABLE = Object.freeze([
  "attack-effect:anti-evade-v1",
  "attack-effect:bulky-v1",
  "attack-effect:burst-fire-v1",
  "attack-effect:critical-hit-v1",
  "attack-effect:dodge-v1",
  "attack-effect:instant-v1",
  "attack-effect:long-range-v1",
  "attack-effect:pierce-v1",
  "attack-effect:surge-armour-bypass-v1",
]);
const EXPECTED_REMAINING = Object.freeze([
  "attack-effect:indirect-fire-v1",
  "attack-effect:locked-in-v1",
  "attack-effect:pinpoint-v1",
  "attack-effect:sidearm-v1",
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
    || previousSlice.effectKernel?.knownUnimplementedEffectAtoms !== 5
    || !isDeepStrictEqual(previousSlice.effectKernel.executableEffectAtomIds,
      PREVIOUS_EXECUTABLE)
    || !isDeepStrictEqual(previousSlice.effectKernel.knownUnimplementedEffectAtomIds,
      [...EXPECTED_REMAINING, OFFICIAL_SPECIALIST_EFFECT_ATOM_ID])) {
    fail("COMBAT_EFFECT_V2_PREVIOUS_SLICE_INVALID");
  }
}

export function createOfficialCombatEffectDenominatorV2(input = {}) {
  verifyPrevious(input.previousSlice);
  const kernel = input.specialistKernelDescriptor;
  if (!object(kernel)
    || kernel.kernelId !== OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_ID
    || kernel.kernelVersion !== OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_VERSION
    || kernel.effectAtomId !== OFFICIAL_SPECIALIST_EFFECT_ATOM_ID
    || kernel.kernelHash !== hashStarcraftTmgContract(without(kernel, ["kernelHash"]))
    || kernel.sidearmExecutionAuthorized !== false
    || kernel.indirectFireExecutionAuthorized !== false
    || kernel.dataChangeCannotGrantRuleAuthority !== true
    || kernel.trainingTruth !== false) {
    fail("COMBAT_EFFECT_V2_SPECIALIST_KERNEL_INVALID");
  }
  const executableEffectAtomIds = [...PREVIOUS_EXECUTABLE, OFFICIAL_SPECIALIST_EFFECT_ATOM_ID]
    .sort((left, right) => left.localeCompare(right));
  const body = {
    schema: OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V2_SCHEMA,
    previousDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    promotion: {
      effectAtomId: OFFICIAL_SPECIALIST_EFFECT_ATOM_ID,
      implementationStatus: "executable_subset",
      kernelId: kernel.kernelId,
      kernelVersion: kernel.kernelVersion,
      kernelHash: kernel.kernelHash,
      exactScope: "six_model_marine_one_agg12_separate_batch_lifecycle",
      sidearmExecutionAuthorized: false,
      indirectFireExecutionAuthorized: false,
    },
    executableEffectAtomIds,
    knownUnimplementedEffectAtomIds: [...EXPECTED_REMAINING],
    counts: {
      profileEffectAtoms: 13,
      contextualEffectAtoms: 1,
      registeredEffectAtoms: 14,
      executableEffectAtoms: 10,
      knownUnimplementedEffectAtoms: 4,
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

export function verifyOfficialCombatEffectDenominatorV2(denominator) {
  if (!object(denominator)
    || denominator.schema !== OFFICIAL_COMBAT_EFFECT_DENOMINATOR_V2_SCHEMA
    || denominator.denominatorHash
      !== hashStarcraftTmgContract(without(denominator, ["denominatorHash"]))
    || denominator.previousDenominatorHash !== EXPECTED_PREVIOUS_DENOMINATOR_HASH
    || denominator.counts?.registeredEffectAtoms !== 14
    || denominator.counts?.executableEffectAtoms !== 10
    || denominator.counts?.knownUnimplementedEffectAtoms !== 4
    || !isDeepStrictEqual(denominator.knownUnimplementedEffectAtomIds,
      EXPECTED_REMAINING)
    || denominator.silentCompatibilityAllowed !== false
    || denominator.trainingTruth !== false) {
    fail("COMBAT_EFFECT_DENOMINATOR_V2_INVALID");
  }
  return denominator;
}
