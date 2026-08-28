import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCharacteristicStatusKernelV1,
} from "./official-characteristic-status-kernel-v1.mjs";
import {
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_V2_ID =
  "official-characteristic-status-kernel-v2";
export const OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_V2_VERSION = "2.0.0";
export const OFFICIAL_BUFF_VALUE_ATOM_ID =
  "rule-atom:singleton:core-11-buff-value:260df1f72f16";
export const OFFICIAL_CHARACTERISTIC_STATUS_V2_NEW_ATOM_IDS = Object.freeze([
  OFFICIAL_BUFF_VALUE_ATOM_ID,
]);

const BASE_KERNEL = createOfficialCharacteristicStatusKernelV1();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function nonNegativeNumber(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) fail(code, String(value));
  return parsed;
}

function applyValueBuff(input = {}) {
  if (!object(input)) fail("CHARACTERISTIC_VALUE_BUFF_INPUT_INVALID");
  const status = verifyOfficialStimpackStatusV1(input.status);
  const characteristic = String(input.characteristic || "").trim().toLowerCase();
  const printedValue = nonNegativeNumber(
    input.printedValue,
    "CHARACTERISTIC_VALUE_BUFF_PRINTED_VALUE_INVALID",
  );
  if (characteristic !== "speed"
    || status.speedBuff !== 3
    || status.statusKind !== "buff") {
    fail("CHARACTERISTIC_VALUE_BUFF_SCOPE_UNSUPPORTED", characteristic);
  }
  const body = {
    schema: "starcraft_tmg_official_value_characteristic_buff_resolution_v1",
    atomId: OFFICIAL_BUFF_VALUE_ATOM_ID,
    statusEffectHash: status.statusEffectHash,
    targetPieceId: status.targetPieceId,
    characteristic,
    printedValue,
    modifier: status.speedBuff,
    effectiveValue: printedValue + status.speedBuff,
    targetNumberSemanticsUsed: false,
    valueCharacteristicSemanticsUsed: true,
    generatedValueRetained: 0,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    valueBuffResolutionHash: hashStarcraftTmgContract(body),
  });
}

const descriptorBody = {
  schema: "starcraft_tmg_official_characteristic_status_kernel_descriptor_v2",
  kernelId: OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_V2_ID,
  kernelVersion: OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_V2_VERSION,
  baseKernel: {
    kernelId: BASE_KERNEL.descriptor.kernelId,
    kernelVersion: BASE_KERNEL.descriptor.kernelVersion,
    kernelHash: BASE_KERNEL.descriptor.kernelHash,
  },
  newRuleAtomIds: [...OFFICIAL_CHARACTERISTIC_STATUS_V2_NEW_ATOM_IDS],
  supportedValueBuffs: [{
    statusSchema: "starcraft_tmg_official_stimpack_status_v1",
    characteristic: "speed",
    exactModifier: 3,
    operation: "add",
  }],
  targetNumberBuffsRemainUnsupported: true,
  unknownCharacteristicOrStatusPolicy: "fail_closed",
  historicalV1Frozen: true,
  trainingTruth: false,
};

export function createOfficialCharacteristicStatusKernelV2() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    applyValueBuff,
  });
}
