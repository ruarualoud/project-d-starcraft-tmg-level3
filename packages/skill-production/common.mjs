import { createHash } from "node:crypto";
import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from "../online-agent-session/portable-credential-material-v1.mjs";

export const hash = hashStarcraftTmgContract;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const clone = (value) => structuredClone(value);
export function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function seal(value) { return freeze({ ...clone(value), hash: hash(value) }); }
export function verifySeal(value) {
  if (!value || typeof value !== "object") fail("ARTIFACT_MISSING");
  const { hash: identity, ...body } = value;
  if (identity !== hash(body)) fail("ARTIFACT_HASH_MISMATCH");
  return value;
}
export function fail(code, fields = {}) { throw Object.assign(new Error(code), { code, ...fields }); }
export function safe(value) {
  if (containsStarcraftTmgOnlineCredentialMaterialV1(value)) fail("SENSITIVE_MATERIAL_REJECTED");
  return value;
}
export function exact(value, keys, code = "OUTPUT_SCHEMA_INVALID") {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))
    || keys.some((key) => !Object.hasOwn(value, key))) fail(code);
}
export function text(value, max = 4000) {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail("TEXT_INVALID");
  safe(value);
  return value;
}
export function integer(value, min = 0, max = 1e9) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail("INTEGER_INVALID");
  return value;
}
export const NO_AUTHORITY = freeze({ canAffectRules: false, canOperateRoom: false,
  canPublishSkill: false, humanReviewed: false, trainingTruth: false });
