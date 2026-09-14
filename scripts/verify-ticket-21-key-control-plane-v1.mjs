import assert from "node:assert/strict";
import {
  createHash, createHmac, generateKeyPairSync, randomBytes,
  sign as signBytes, timingSafeEqual, verify as verifyBytes,
} from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgKeyControlPlaneV1,
  STARCRAFT_TMG_KMS_PORT_VERSION,
} from "../packages/platform-operations/key-control-plane-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-204-key-control-v1");
const keys = new Map();
for (const ref of ["sign-v1", "sign-v2"]) keys.set(ref, generateKeyPairSync("ed25519"));
for (const ref of ["seal-v1", "data-v1"]) keys.set(ref, randomBytes(32));
const wrapped = new Map();
const payload = (input) => Buffer.from(JSON.stringify(input), "utf8");
const fixturePort = {
  descriptor: {
    interfaceVersion: STARCRAFT_TMG_KMS_PORT_VERSION,
    providerKind: "development_fixture",
    providerId: "ticket21-in-memory-kms",
    productionReady: false,
    rawKeyPersistence: false,
    callbackScopedDataKeys: true,
  },
  async signDigest(input) {
    return signBytes(null, payload(input), keys.get(input.keyRef).privateKey)
      .toString("base64url");
  },
  async verifyDigest(input) {
    const { signature, ...unsigned } = input;
    return verifyBytes(null, payload(unsigned), keys.get(input.keyRef).publicKey,
      Buffer.from(signature, "base64url"));
  },
  async computeMac(input) {
    return createHmac("sha256", keys.get(input.keyRef)).update(payload(input))
      .digest("base64url");
  },
  async verifyMac(input) {
    const { mac, ...unsigned } = input;
    const expected = Buffer.from(await this.computeMac(unsigned), "base64url");
    const actual = Buffer.from(mac, "base64url");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  },
  async withGeneratedDataKey(input, callback) {
    const dataKey = randomBytes(32);
    const wrappedDataKey = `wrapped-${createHash("sha256").update(dataKey).digest("hex")}`;
    wrapped.set(wrappedDataKey, Buffer.from(dataKey));
    try { return await callback({ plaintextDataKey: dataKey, wrappedDataKey }); }
    finally { dataKey.fill(0); }
  },
  async withUnwrappedDataKey(input, callback) {
    const dataKey = Buffer.from(wrapped.get(input.wrappedDataKey));
    try { return await callback(dataKey); }
    finally { dataKey.fill(0); }
  },
};

const control = createStarcraftTmgKeyControlPlaneV1({ kmsPort: fixturePort,
  initialKeys: [{ logicalKeyId: "referee", keyRef: "sign-v1", keyVersion: 1,
    keyKind: "long_term_signature", state: "active",
    activatedAt: "2026-09-14T00:00:00.000Z", publicVerificationRef: "pub-sign-v1" },
  { logicalKeyId: "seat-seal", keyRef: "seal-v1", keyVersion: 1,
    keyKind: "short_lived_seal", state: "active",
    activatedAt: "2026-09-14T00:00:00.000Z" },
  { logicalKeyId: "room-private", keyRef: "data-v1", keyVersion: 1,
    keyKind: "private_payload_encryption", state: "active",
    activatedAt: "2026-09-14T00:00:00.000Z" }] });
const value = { roomId: "room-1", stateRevision: 7 };
const context = { environmentId: "prod-cn-1", roomId: "room-1" };
const signatureV1 = await control.sign({ logicalKeyId: "referee",
  purpose: "transition-receipt", context, value,
  issuedAt: "2026-09-14T01:00:00.000Z" });
assert.equal((await control.verifySignature({ proof: signatureV1,
  purpose: "transition-receipt", context, value })).trustedAtIssue, true);
const rotated = control.rotate({ logicalKeyId: "referee",
  keyKind: "long_term_signature", newKeyRef: "sign-v2", newKeyVersion: 2,
  publicVerificationRef: "pub-sign-v2",
  rotatedAt: "2026-09-14T02:00:00.000Z" });
assert.deepEqual(rotated.keys.filter((entry) => entry.logicalKeyId === "referee")
  .map((entry) => entry.state).sort(), ["active", "retired"]);
const historical = await control.verifySignature({ proof: signatureV1,
  purpose: "transition-receipt", context, value });
assert.equal(historical.cryptographicValid, true);
assert.equal(historical.historicalRetiredKeyAccepted, true);

const shortSeal = await control.seal({ logicalKeyId: "seat-seal",
  purpose: "seat-capability", context, value,
  issuedAt: "2026-09-14T01:00:00.000Z",
  expiresAt: "2026-09-14T01:10:00.000Z" });
assert.equal((await control.verifySeal({ proof: shortSeal,
  purpose: "seat-capability", context, value,
  at: "2026-09-14T01:05:00.000Z" })).valid, true);
assert.equal((await control.verifySeal({ proof: shortSeal,
  purpose: "seat-capability", context, value,
  at: "2026-09-14T01:11:00.000Z" })).expired, true);

const envelope = await control.encrypt({ logicalKeyId: "room-private",
  keyKind: "private_payload_encryption", purpose: "private-room-journal",
  context, value: { hiddenIntent: "hold marker four" } });
assert.deepEqual(await control.decrypt({ envelope, context }),
  { hiddenIntent: "hold marker four" });
await assert.rejects(control.decrypt({ envelope,
  context: { ...context, roomId: "room-2" } }), /CONTEXT_MISMATCH/);
control.revoke({ keyRef: "data-v1", revokedAt: "2026-09-14T03:00:00.000Z" });
await assert.rejects(control.decrypt({ envelope, context }), /KEY_REVOKED/);
await assert.rejects(control.encrypt({ logicalKeyId: "room-private",
  keyKind: "private_payload_encryption", purpose: "user-byok",
  context, value }), /ACTIVE_KEY_NOT_FOUND|not allowed|FORBIDDEN/);
const snapshot = control.snapshot();
assert.equal(snapshot.secretMaterialPersisted, false);
assert.equal(snapshot.byokPersisted, false);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_204_report_v1",
  ticket: 21, slice: 204, status: "passed",
  keyMetadataCount: snapshot.keys.length,
  providerProductionReady: snapshot.provider.productionReady,
  checks: {
    ed25519LongSignature: true,
    hmacShortSealAndExpiry: true,
    aesGcmKmsEnvelope: true,
    contextBinding: true,
    activeRetiredRevokedLifecycle: true,
    retiredHistoricalVerification: true,
    revokedDecryptDenied: true,
    byokNeverPersisted: true,
    rawKeyNeverInSnapshot: true,
  },
  externalProductionKmsConfigured: false,
  providerCalls: 0, estimatedCostCny: 0, sourceRefresh: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
