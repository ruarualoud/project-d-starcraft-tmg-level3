#!/usr/bin/env node

import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createHttpStarcraftTmgAuthoritativeTransportAdapter,
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { createStarcraftTmgClientDomain } from
  "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } from
  "../packages/http-adapter/handler-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createInMemoryStarcraftTmgRoomStore } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { STARCRAFT_TMG_ROOM_ACCESS_RECOVERY_V1 as contract } from
  "../content/client/room-access-recovery-v1.mjs";
import {
  buildStarcraftTmgRoomAccessUrl,
  parseStarcraftTmgRoomAccessUrl,
  scrubStarcraftTmgSensitiveWebUrl,
} from "../apps/starcraft-tmg-expo/lib/level3/room-access-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const BUILD_ROOT = path.join(ROOT, "build/ticket-14-slice-131-room-access-recovery-v1");
const REPORT_PATH = path.join(BUILD_ROOT, "report.json");
const OCCURRED_AT = "2026-09-03T08:00:00.000Z";
const EXPECTED_TABS = ["index", "army", "tools", "match", "settings"];
const PROBE_INVITE_TOKEN = "i".repeat(43);
const PROBE_RECOVERY_TOKEN = "r".repeat(43);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bearer(token) {
  return { authorization: `Bearer ${token}` };
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function deterministicIdFactory(label) {
  let sequence = 0;
  return (kind) => `${kind}-${label}-${String(sequence += 1).padStart(4, "0")}`;
}

function initialStateAuthority(state, dataVersion, source, serverSeatPlan = [
  { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
]) {
  const stateCopy = clone(state);
  return {
    source: "server_factory",
    state: stateCopy,
    dataVersion,
    receiptHash: hashStarcraftTmgContract({ source, state: stateCopy }),
    serverSeatPlan,
  };
}

async function createFixture({ roomId, state, dataVersion, store, audit, authorityEngine }) {
  const now = () => audit.value;
  const engine = authorityEngine || createStarcraftTmgAuthoritativeEngine({ now });
  const runtime = createStarcraftTmgRoomRuntime({
    authorityEngine: engine,
    roomStore: store,
    now,
    inviteTtlMs: 1_000,
    recoveryTtlMs: 1_000,
  });
  const authority = initialStateAuthority(state, dataVersion, `slice-131:${roomId}`);
  const created = await runtime.createRoom({
    roomId,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    initialStateAuthority: authority,
    serverSeatPlan: authority.serverSeatPlan,
  });
  assert(created.ok, `fixture room ${roomId} failed: ${created.reason || "unknown"}`);
  return { runtime, store, created, host: created.credentials.host, audit, authorityEngine: engine };
}

async function expectRoomAccessError(operation, code) {
  try {
    await operation();
  } catch (error) {
    assert(error?.code === code, `expected ${code}, received ${error?.code || error}`);
    return;
  }
  throw new Error(`expected ${code}`);
}

const checks = [];
const failures = [];
async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

const data = await loadStarcraftTmgData(PROJECT_ROOT);
const state = createStarcraftTmgSampleState(data);
state.board.terrain = [];
state.activeSideKey = "player1";

let primary;
let issuedInvite;
let recoveredFixture;
let recoveredCredential;
let firstLease;
let secondLease;
let clientEvidence = null;
let httpEvidence = null;
let receiptEvidence = null;

await check("hash_sealed_contract_fixes_the_room_access_authority_boundary", () => {
  assert(contract.contractHash === hashStarcraftTmgContract(without(contract, ["contractHash"])),
    "room access contract hash mismatch");
  assert(contract.roomLocator.capabilityLocation === "url_fragment_only"
    && contract.accessCapabilities.exchange === "one_time_atomic_compare_and_swap",
  "locator or exchange policy drifted");
  assert(contract.roomLocator.productionCapabilityOrigin === "verified_https_universal_or_app_link_only"
    && contract.accessReceipts.longTermProof === "ed25519_room_access_receipt_signature"
    && contract.accessReceipts.shortTermProof === "hmac_sha256_room_access_receipt_seal",
  "production link or access receipt crypto policy drifted");
  assert(contract.recovery.createsControlLease === false
    && contract.control.policy === "latest_successful_claim_fences_earlier_claims",
  "recovery/control boundary drifted");
  assert(contract.authority.trainingTruth === false, "Slice 131 overclaimed training truth");
});

await check("room_urls_are_bounded_locators_and_never_side_role_transport_or_revision_authority", () => {
  const parsed = parseStarcraftTmgRoomAccessUrl(
    `https://play.example.test/room/slice131-room?side=player2&sideKey=player2&role=supervisor&roleMode=supervisor&baseUrl=https%3A%2F%2Fevil.test&apiOrigin=https%3A%2F%2Fevil.test&revision=99&expectedRoomRevision=99&confirmed=true&confirmationBoolean=true&seatToken=forged#invite=${PROBE_INVITE_TOKEN}`,
    { trustedOrigins: ["https://play.example.test"] },
  );
  assert(parsed.locator.roomId === "slice131-room" && parsed.access?.kind === "invite"
    && parsed.access.token === PROBE_INVITE_TOKEN, "valid locator/capability was not parsed");
  assert(parsed.ignoredClaims.length === 11, `expected eleven ignored URL authority claims, got ${parsed.ignoredClaims.length}`);
  assert(Object.values(parsed.authority).every((value) => value === false), "a URL claim gained authority");
  assert(parsed.scrubbedWebPath === "/room/slice131-room", "sensitive URL claims were not scrubbed");

  const built = buildStarcraftTmgRoomAccessUrl({
    roomId: "slice131-room",
    access: { kind: "recovery", token: PROBE_RECOVERY_TOKEN },
  });
  const roundTrip = parseStarcraftTmgRoomAccessUrl(built);
  assert(roundTrip.originKind === "custom_scheme" && roundTrip.access?.kind === "recovery"
    && roundTrip.locator.roomId === "slice131-room", "custom-scheme build/parse round trip failed");
  assert(scrubStarcraftTmgSensitiveWebUrl(
    "https://play.example.test/room/slice131-room?side=x#invite=secret",
  ) === "/room/slice131-room", "browser scrub target retained a sensitive claim");
});

await check("malformed_ambiguous_query_leaked_or_untrusted_room_capabilities_fail_closed", async () => {
  await expectRoomAccessError(() => parseStarcraftTmgRoomAccessUrl(
    "http://play.example.test/room/r#invite=x", { trustedOrigins: ["http://play.example.test"] },
  ), "ROOM_URL_ORIGIN_INVALID");
  await expectRoomAccessError(() => parseStarcraftTmgRoomAccessUrl(
    "https://evil.example.test/room/r#invite=x", { trustedOrigins: ["https://play.example.test"] },
  ), "ROOM_URL_ORIGIN_UNTRUSTED");
  await expectRoomAccessError(() => parseStarcraftTmgRoomAccessUrl(
    "https://play.example.test/room/r?invite=x", { trustedOrigins: ["https://play.example.test"] },
  ), "ROOM_CAPABILITY_LOCATION_INVALID");
  await expectRoomAccessError(() => parseStarcraftTmgRoomAccessUrl(
    "https://play.example.test/room/r#invite=x&recovery=y", { trustedOrigins: ["https://play.example.test"] },
  ), "ROOM_CAPABILITY_AMBIGUOUS");
  await expectRoomAccessError(() => parseStarcraftTmgRoomAccessUrl(
    "https://play.example.test/room/r#invite=too-short", { trustedOrigins: ["https://play.example.test"] },
  ), "ROOM_CAPABILITY_INVALID");
  await expectRoomAccessError(() => parseStarcraftTmgRoomAccessUrl(
    "https://play.example.test/room/r/extra#invite=x", { trustedOrigins: ["https://play.example.test"] },
  ), "ROOM_PATH_INVALID");
  await expectRoomAccessError(() => buildStarcraftTmgRoomAccessUrl({
    roomId: "r",
    access: { kind: "invite", token: PROBE_INVITE_TOKEN },
    environment: "production",
  }), "ROOM_CUSTOM_SCHEME_DEVELOPMENT_ONLY");
  await expectRoomAccessError(() => buildStarcraftTmgRoomAccessUrl({
    roomId: "r",
    origin: "https://untrusted.example.test",
    trustedOrigins: ["https://play.example.test"],
    access: { kind: "invite", token: PROBE_INVITE_TOKEN },
    environment: "production",
  }), "ROOM_LINK_ORIGIN_UNTRUSTED");
  const appLink = buildStarcraftTmgRoomAccessUrl({
    roomId: "r",
    origin: "https://play.example.test",
    trustedOrigins: ["https://play.example.test"],
    access: { kind: "invite", token: PROBE_INVITE_TOKEN },
    environment: "production",
  });
  assert(appLink === `https://play.example.test/room/r#invite=${PROBE_INVITE_TOKEN}`,
    "verified production HTTPS App Link did not round-trip exactly");
});

await check("room_id_alone_never_mints_a_grant_and_only_a_capable_host_can_issue_an_invite", async () => {
  const audit = { value: OCCURRED_AT };
  primary = await createFixture({
    roomId: "slice-131-primary",
    state,
    dataVersion: data.version,
    store: createInMemoryStarcraftTmgRoomStore(),
    audit,
  });
  const unsafe = await primary.runtime.joinRoom({ roomId: primary.created.room.roomId });
  assert(!unsafe.ok && unsafe.reason === "INVITE_REQUIRED", "roomId-only join minted a grant");
  const observerIssue = await primary.runtime.issueInvite({ roomId: primary.created.room.roomId });
  assert(!observerIssue.ok && observerIssue.reason === "AUTHENTICATION_REQUIRED", "unauthenticated caller issued an invite");
  const forged = await primary.runtime.issueInvite({
    roomId: primary.created.room.roomId,
    seatToken: primary.host.seatToken,
    seatKey: "player2",
  });
  assert(!forged.ok && forged.reason === "CLIENT_AUTHORITY_FIELD_REJECTED", "client-chosen invite seat was accepted");
  issuedInvite = await primary.runtime.issueInvite({
    roomId: primary.created.room.roomId,
    seatToken: primary.host.seatToken,
    expectedRoomRevision: 0,
  });
  assert(issuedInvite.ok && issuedInvite.invite.inviteToken.length >= 43, "host invite was not issued with 256-bit entropy");
  assert(primary.authorityEngine.verifyRoomAccessReceipt(issuedInvite.receipt).ok,
    "invite receipt signature or current seal did not verify");
});

await check("raw_access_tokens_never_enter_room_private_or_recovery_persistence", async () => {
  const aggregate = await primary.store.loadRoom(primary.created.room.roomId);
  const privateJournal = await primary.store.readJournal(primary.created.room.roomId, "private", 0);
  const recoveryLedger = await primary.store.readJournal(primary.created.room.roomId, "seat_recovery", 0);
  const serialized = JSON.stringify({ aggregate, privateJournal, recoveryLedger });
  assert(!serialized.includes(issuedInvite.invite.inviteToken), "raw invite token entered persistent room material");
  assert(serialized.includes(issuedInvite.receipt.tokenDigest), "room-bound invite digest is absent from the recovery ledger");
  assert(aggregate.stateRevision === 0 && aggregate.envelope.stateHash === primary.created.room.stateHash,
    "access issuance mutated Rules state or GameClock");
});

await check("signed_access_receipts_survive_response_loss_and_hmac_rotation_without_persisting_bearers", async () => {
  const keyPair = generateKeyPairSync("ed25519");
  const audit = { value: OCCURRED_AT };
  const currentCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    hmacSecret: Buffer.alloc(32, 0x31),
    keyId: "slice-131-durable-receipt-key",
  });
  const rotatedCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    hmacSecret: Buffer.alloc(32, 0x32),
    keyId: "slice-131-durable-receipt-key",
  });
  const currentEngine = createStarcraftTmgAuthoritativeEngine({
    now: () => audit.value,
    refereeCrypto: currentCrypto,
  });
  const rotatedEngine = createStarcraftTmgAuthoritativeEngine({
    now: () => audit.value,
    refereeCrypto: rotatedCrypto,
  });
  const fixture = await createFixture({
    roomId: "slice-131-durable-receipt",
    state,
    dataVersion: data.version,
    store: createSqliteStarcraftTmgRoomStore({ filename: ":memory:", now: () => audit.value }),
    audit,
    authorityEngine: currentEngine,
  });
  const issued = await fixture.runtime.issueInvite({
    roomId: fixture.created.room.roomId,
    seatToken: fixture.host.seatToken,
    expectedRoomRevision: 0,
  });
  assert(issued.ok, "durable receipt fixture did not issue an invite");
  const privateRows = await fixture.store.readJournal(fixture.created.room.roomId, "private", 0);
  const recoveryRows = await fixture.store.readJournal(fixture.created.room.roomId, "seat_recovery", 0);
  const privateReceipt = privateRows.find((entry) => entry.payload?.type === "invite_issued")?.payload?.payload?.receipt;
  const recoveryReceipt = recoveryRows.find((entry) => entry.payload?.status === "active")?.payload?.receipt;
  assert(privateReceipt?.receiptHash === issued.receipt.receiptHash
    && recoveryReceipt?.receiptHash === issued.receipt.receiptHash,
  "the full signed receipt was not durably recoverable from both encrypted ledgers");
  assert(currentEngine.verifyRoomAccessReceipt(recoveryReceipt).ok,
    "persisted receipt failed current Ed25519/HMAC verification");
  const afterRotation = rotatedEngine.verifyRoomAccessReceipt(recoveryReceipt, { requireCurrentSeal: false });
  assert(afterRotation.ok && afterRotation.longTermValid && afterRotation.shortTermValid === false,
    "HMAC rotation did not preserve long-term Ed25519 verification while invalidating the old seal");
  assert(rotatedEngine.verifyRoomAccessReceipt(recoveryReceipt).ok === false,
    "old HMAC seal was accepted as current after rotation");

  const tamperedContent = clone(recoveryReceipt);
  tamperedContent.status = "used";
  assert(currentEngine.verifyRoomAccessReceipt(tamperedContent, { requireCurrentSeal: false }).longTermValid === false,
    "tampered receipt content retained long-term validity");
  const tamperedSignature = clone(recoveryReceipt);
  tamperedSignature.refereeSignature.signature = `${tamperedSignature.refereeSignature.signature[0] === "A" ? "B" : "A"}${tamperedSignature.refereeSignature.signature.slice(1)}`;
  assert(currentEngine.verifyRoomAccessReceipt(tamperedSignature, { requireCurrentSeal: false }).longTermValid === false,
    "tampered Ed25519 signature retained long-term validity");
  const tamperedSeal = clone(recoveryReceipt);
  tamperedSeal.accessSeal.mac = `${tamperedSeal.accessSeal.mac[0] === "A" ? "B" : "A"}${tamperedSeal.accessSeal.mac.slice(1)}`;
  assert(currentEngine.verifyRoomAccessReceipt(tamperedSeal).shortTermValid === false,
    "tampered HMAC seal retained short-term validity");
  const persisted = JSON.stringify({ privateRows, recoveryRows });
  assert(!persisted.includes(issued.invite.inviteToken) && !persisted.includes(fixture.host.seatToken),
    "a raw invite or seat bearer was persisted beside its receipt");
  receiptEvidence = {
    contentHashBound: true,
    ed25519LongTermSignatureVerified: true,
    hmacCurrentSealVerified: true,
    fullReceiptPersistedInEncryptedLedgers: true,
    hmacRotationPreservesLongTermVerification: true,
    tamperRejectionVerified: true,
    rawBearerPersisted: false,
  };
});

await check("memory_and_sqlite_adapters_each_allow_exactly_one_concurrent_invite_exchange", async () => {
  const adapters = [
    ["memory", () => createInMemoryStarcraftTmgRoomStore()],
    ["sqlite", () => createSqliteStarcraftTmgRoomStore({ filename: ":memory:", now: () => OCCURRED_AT })],
  ];
  for (const [name, createStore] of adapters) {
    const fixture = await createFixture({
      roomId: `slice-131-cas-${name}`,
      state,
      dataVersion: data.version,
      store: createStore(),
      audit: { value: OCCURRED_AT },
    });
    const invitation = await fixture.runtime.issueInvite({
      roomId: fixture.created.room.roomId,
      seatToken: fixture.host.seatToken,
      expectedRoomRevision: 0,
    });
    const outcomes = await Promise.all([
      fixture.runtime.exchangeInvite({ roomId: fixture.created.room.roomId, inviteToken: invitation.invite.inviteToken }),
      fixture.runtime.exchangeInvite({ roomId: fixture.created.room.roomId, inviteToken: invitation.invite.inviteToken }),
    ]);
    assert(outcomes.filter((entry) => entry.ok).length === 1,
      `${name} did not produce exactly one successful invite exchange`);
    assert(outcomes.filter((entry) => entry.reason === "REVISION_CONFLICT").length === 1,
      `${name} did not fence the losing exchange with CAS`);
    const aggregate = await fixture.store.loadRoom(fixture.created.room.roomId);
    assert(Object.values(aggregate.grants).filter((grant) => grant.seatKey === "player2").length === 1,
      `${name} minted duplicate player2 grants`);
  }
});

await check("room_binding_invalid_tokens_replay_and_exact_audit_expiry_fail_closed", async () => {
  const other = await createFixture({
    roomId: "slice-131-other-room",
    state,
    dataVersion: data.version,
    store: createInMemoryStarcraftTmgRoomStore(),
    audit: { value: OCCURRED_AT },
  });
  const crossRoom = await other.runtime.exchangeInvite({
    roomId: other.created.room.roomId,
    inviteToken: issuedInvite.invite.inviteToken,
  });
  assert(!crossRoom.ok && crossRoom.reason === "INVITE_INVALID", "invite capability crossed its room binding");
  const invalid = await primary.runtime.exchangeInvite({ roomId: primary.created.room.roomId, inviteToken: "not-a-real-token" });
  assert(!invalid.ok && invalid.reason === "INVITE_INVALID", "invalid invite token was accepted");
  const accepted = await primary.runtime.exchangeInvite({
    roomId: primary.created.room.roomId,
    inviteToken: issuedInvite.invite.inviteToken,
  });
  assert(accepted.ok && accepted.credential.seatKey === "player2", "valid invite was not server-bound to player2");
  const replayed = await primary.runtime.exchangeInvite({
    roomId: primary.created.room.roomId,
    inviteToken: issuedInvite.invite.inviteToken,
  });
  assert(!replayed.ok && replayed.reason === "INVITE_ALREADY_USED", "used invite was replayable");

  const expiryAudit = { value: OCCURRED_AT };
  const expiry = await createFixture({
    roomId: "slice-131-expiry",
    state,
    dataVersion: data.version,
    store: createInMemoryStarcraftTmgRoomStore(),
    audit: expiryAudit,
  });
  const expiring = await expiry.runtime.issueInvite({
    roomId: expiry.created.room.roomId,
    seatToken: expiry.host.seatToken,
    expectedRoomRevision: 0,
  });
  expiryAudit.value = new Date(Date.parse(OCCURRED_AT) + 1_000).toISOString();
  const expired = await expiry.runtime.exchangeInvite({
    roomId: expiry.created.room.roomId,
    inviteToken: expiring.invite.inviteToken,
  });
  assert(!expired.ok && expired.reason === "INVITE_EXPIRED", "exact audit-deadline invite did not expire");
  assert(expiry.authorityEngine.verifyRoomAccessReceipt(expired.receipt).ok,
    "expiry receipt signature or current seal did not verify");
  const aggregate = await expiry.store.loadRoom(expiry.created.room.roomId);
  assert(aggregate.stateRevision === 0 && aggregate.envelope.stateHash === expiry.created.room.stateHash,
    "invite expiry mutated Rules state or GameClock");
});

await check("memory_and_sqlite_recovery_capabilities_are_one_time_cas_bound_and_expire_on_audit_time", async () => {
  for (const [name, createStore] of [
    ["memory", () => createInMemoryStarcraftTmgRoomStore()],
    ["sqlite", () => createSqliteStarcraftTmgRoomStore({ filename: ":memory:", now: () => OCCURRED_AT })],
  ]) {
    const fixture = await createFixture({
      roomId: `slice-131-recovery-cas-${name}`,
      state,
      dataVersion: data.version,
      store: createStore(),
      audit: { value: OCCURRED_AT },
    });
    const ticket = await fixture.runtime.issueSeatRecovery({
      roomId: fixture.created.room.roomId,
      seatToken: fixture.host.seatToken,
      expectedRoomRevision: 0,
    });
    const outcomes = await Promise.all([
      fixture.runtime.recoverSeat({ roomId: fixture.created.room.roomId, recoveryToken: ticket.recovery.recoveryToken }),
      fixture.runtime.recoverSeat({ roomId: fixture.created.room.roomId, recoveryToken: ticket.recovery.recoveryToken }),
    ]);
    assert(outcomes.filter((entry) => entry.ok).length === 1
      && outcomes.filter((entry) => entry.reason === "REVISION_CONFLICT").length === 1,
    `${name} recovery exchange did not have exactly one CAS winner`);
    const replay = await fixture.runtime.recoverSeat({
      roomId: fixture.created.room.roomId,
      recoveryToken: ticket.recovery.recoveryToken,
    });
    assert(!replay.ok && replay.reason === "RECOVERY_TOKEN_ALREADY_USED",
      `${name} recovery capability remained replayable`);
  }

  const audit = { value: OCCURRED_AT };
  const expiry = await createFixture({
    roomId: "slice-131-recovery-expiry",
    state,
    dataVersion: data.version,
    store: createInMemoryStarcraftTmgRoomStore(),
    audit,
  });
  const ticket = await expiry.runtime.issueSeatRecovery({
    roomId: expiry.created.room.roomId,
    seatToken: expiry.host.seatToken,
    expectedRoomRevision: 0,
  });
  audit.value = new Date(Date.parse(OCCURRED_AT) + 1_000).toISOString();
  const expired = await expiry.runtime.recoverSeat({
    roomId: expiry.created.room.roomId,
    recoveryToken: ticket.recovery.recoveryToken,
  });
  assert(!expired.ok && expired.reason === "RECOVERY_TOKEN_EXPIRED"
    && expiry.authorityEngine.verifyRoomAccessReceipt(expired.receipt).ok,
  "recovery capability did not expire exactly on audit time with a valid receipt");
});

await check("seat_recovery_creates_a_second_same_seat_grant_without_a_control_lease", async () => {
  recoveredFixture = await createFixture({
    roomId: "slice-131-recovery",
    state,
    dataVersion: data.version,
    store: createInMemoryStarcraftTmgRoomStore(),
    audit: { value: OCCURRED_AT },
  });
  const issued = await recoveredFixture.runtime.issueSeatRecovery({
    roomId: recoveredFixture.created.room.roomId,
    seatToken: recoveredFixture.host.seatToken,
    expectedRoomRevision: 0,
  });
  assert(issued.ok && issued.recovery.recoveryToken, "recovery capability was not issued");
  const persistedBefore = JSON.stringify({
    aggregate: await recoveredFixture.store.loadRoom(recoveredFixture.created.room.roomId),
    private: await recoveredFixture.store.readJournal(recoveredFixture.created.room.roomId, "private", 0),
    recovery: await recoveredFixture.store.readJournal(recoveredFixture.created.room.roomId, "seat_recovery", 0),
  });
  assert(!persistedBefore.includes(issued.recovery.recoveryToken), "raw recovery token entered persistence");
  const recovered = await recoveredFixture.runtime.recoverSeat({
    roomId: recoveredFixture.created.room.roomId,
    recoveryToken: issued.recovery.recoveryToken,
  });
  assert(recovered.ok, `seat recovery failed: ${recovered.reason || "unknown"}`);
  recoveredCredential = recovered.credential;
  assert(recoveredCredential.seatKey === recoveredFixture.host.seatKey
    && recoveredCredential.roleMode === recoveredFixture.host.roleMode,
  "seat recovery changed the server-bound seat or role");
  const aggregate = await recoveredFixture.store.loadRoom(recoveredFixture.created.room.roomId);
  assert(Object.values(aggregate.grants).filter((grant) => grant.seatKey === recoveredFixture.host.seatKey).length === 2,
    "same-seat recovery did not retain both grants");
  assert(Object.keys(aggregate.leases).length === 0, "seat recovery silently created a ControlLease");
  const oldRead = await recoveredFixture.runtime.readRoom({
    roomId: recoveredFixture.created.room.roomId,
    seatToken: recoveredFixture.host.seatToken,
  });
  const newRead = await recoveredFixture.runtime.readRoom({
    roomId: recoveredFixture.created.room.roomId,
    seatToken: recoveredCredential.seatToken,
  });
  assert(oldRead.ok && newRead.ok, "one of the same-seat devices lost viewer access");
});

await check("two_same_seat_devices_can_read_but_only_the_latest_claim_controls", async () => {
  const roomId = recoveredFixture.created.room.roomId;
  firstLease = await recoveredFixture.runtime.claimControl({
    roomId,
    seatToken: recoveredFixture.host.seatToken,
    sessionId: "slice-131-device-a",
  });
  secondLease = await recoveredFixture.runtime.claimControl({
    roomId,
    seatToken: recoveredCredential.seatToken,
    sessionId: "slice-131-device-b",
  });
  assert(firstLease.ok && secondLease.ok
    && secondLease.controlLease.leaseFence === firstLease.controlLease.leaseFence + 1,
  "ControlLease fencing did not advance for the recovered device");
  const oldProjection = await recoveredFixture.runtime.readRoom({ roomId, seatToken: recoveredFixture.host.seatToken });
  const newProjection = await recoveredFixture.runtime.readRoom({ roomId, seatToken: recoveredCredential.seatToken });
  assert(oldProjection.ok && oldProjection.projection.control.ownedByViewer === false,
    "old device was still projected as controller");
  assert(newProjection.ok && newProjection.projection.control.ownedByViewer === true,
    "latest claimant was not projected as controller");
  const fenced = await recoveredFixture.runtime.applyAction({
    roomId,
    seatToken: recoveredFixture.host.seatToken,
    leaseId: firstLease.controlLease.leaseId,
    leaseFence: firstLease.controlLease.leaseFence,
    idempotencyKey: "slice-131-stale-device-must-not-apply",
    previewId: "must-not-reach-preview",
    expectedStateRevision: 0,
  });
  assert(!fenced.ok && fenced.reason === "CONTROL_LEASE_FENCED", "stale device lease reached mutation processing");
  const after = await recoveredFixture.store.loadRoom(roomId);
  assert(after.stateRevision === 0 && after.envelope.stateHash === recoveredFixture.created.room.stateHash,
    "stale device changed Rules state or GameClock");
});

await check("viewer_projections_expose_control_status_without_tokens_leases_sessions_or_seals", async () => {
  const roomId = recoveredFixture.created.room.roomId;
  const publicView = await recoveredFixture.runtime.readRoom({ roomId });
  const seatView = await recoveredFixture.runtime.readRoom({ roomId, seatToken: recoveredCredential.seatToken });
  assert(publicView.ok && publicView.projection.control.visible === false,
    "public observer received a seat control projection");
  assert(seatView.ok && seatView.projection.viewer.seatKey === "player1"
    && seatView.projection.control.currentLeaseFence === secondLease.controlLease.leaseFence,
  "seat viewer lost its scoped control summary");
  const serialized = JSON.stringify({ public: publicView.projection, seat: seatView.projection });
  for (const secret of [recoveredFixture.host.seatToken, recoveredCredential.seatToken,
    firstLease.controlLease.leaseId, secondLease.controlLease.leaseId,
    "slice-131-device-a", "slice-131-device-b"]) {
    assert(!serialized.includes(secret), "viewer projection leaked credential, lease, or session material");
  }
});

await check("http_create_issue_and_exchange_paths_preserve_the_same_secure_contract", async () => {
  const audit = { value: OCCURRED_AT };
  const runtime = createStarcraftTmgRoomRuntime({
    authorityEngine: createStarcraftTmgAuthoritativeEngine({ now: () => audit.value }),
    now: () => audit.value,
  });
  const roomId = "slice-131-http";
  const adapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: runtime,
    createRoomId: () => roomId,
    initialStateFactory: () => initialStateAuthority(state, data.version, "slice-131:http"),
  });
  const created = await adapter.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms`,
    body: { setupId: "slice-131" },
  });
  assert(created.status === 200 && created.response.result.credential?.seatKey === "player1",
    "HTTP create did not return the host credential");
  assert(created.response.result.credentials === undefined, "HTTP create leaked the server credential map");
  const denied = await adapter.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${roomId}/join`,
    body: {},
  });
  assert(denied.status === 401 && denied.response.error === "INVITE_REQUIRED", "HTTP roomId-only join was accepted");
  const invitation = await adapter.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${roomId}/invites`,
    headers: bearer(created.response.result.credential.seatToken),
    body: { expectedRoomRevision: created.response.result.room.roomRevision },
  });
  const exchanged = await adapter.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${roomId}/invite-exchange`,
    body: { inviteToken: invitation.response.result.invite?.inviteToken },
  });
  assert(invitation.status === 200 && exchanged.status === 200
    && exchanged.response.result.credential.seatKey === "player2",
  "HTTP invite issue/exchange contract failed");
  httpEvidence = {
    roomId,
    inviteReceiptReturned: Boolean(invitation.response.result.receipt?.receiptHash),
    exchangeReceiptReturned: Boolean(exchanged.response.result.receipt?.receiptHash),
    hostOnlyCreateCredential: true,
  };
});

await check("client_domain_exchanges_access_internally_and_never_caches_or_projects_raw_credentials", async () => {
  const fixture = await createFixture({
    roomId: "slice-131-client",
    state,
    dataVersion: data.version,
    store: createInMemoryStarcraftTmgRoomStore(),
    audit: { value: OCCURRED_AT },
  });
  const invitation = await fixture.runtime.issueInvite({
    roomId: fixture.created.room.roomId,
    seatToken: fixture.host.seatToken,
    expectedRoomRevision: 0,
  });
  const backingMap = new Map();
  const lifecycle = createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" });
  const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: fixture.runtime });
  let transportCalls = 0;
  let rejectAuthentication = false;
  const client = createStarcraftTmgClientDomain({
    transport: {
      async execute(request) {
        transportCalls += 1;
        if (rejectAuthentication && request.operation === "read_room") return { ok: false, reason: "SEAT_GRANT_INVALID" };
        return baseTransport.execute(request);
      },
    },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap }),
    lifecycle,
    now: () => OCCURRED_AT,
    createId: deterministicIdFactory("client-a"),
  });
  const bootstrapped = await client.bootstrap({
    route: { roomId: fixture.created.room.roomId },
    principal: { access: { kind: "invite", token: invitation.invite.inviteToken } },
    surface: "expo_web",
    locale: "zh-CN",
  });
  assert(bootstrapped.ok && client.read().phase === "ready"
    && client.read().roomProjection.viewer.seatKey === "player2",
  "Client Domain did not exchange invite and bind its viewer projection");
  assert(client.read().accessReceipt?.kind === "invite", "safe invite receipt reference is absent");
  assert(!JSON.stringify(client.read()).includes(invitation.invite.inviteToken)
    && !JSON.stringify([...backingMap.values()]).includes(invitation.invite.inviteToken),
  "raw invite capability entered Client Domain view or cache");

  const recoveryIssued = await client.dispatch({ type: "issue_recovery" });
  assert(recoveryIssued.ok && recoveryIssued.credential?.ephemeral === true
    && recoveryIssued.credential.persistenceAllowed === false,
  "Client Domain did not return a visibly ephemeral recovery capability");
  const recoveryToken = recoveryIssued.credential.token;
  assert(!JSON.stringify(recoveryIssued.view).includes(recoveryToken)
    && !JSON.stringify(client.read()).includes(recoveryToken)
    && !JSON.stringify([...backingMap.values()]).includes(recoveryToken),
  "raw recovery capability entered view or projection cache");

  const secondMap = new Map();
  const secondClient = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: secondMap }),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
    now: () => OCCURRED_AT,
    createId: deterministicIdFactory("client-b"),
  });
  const recovered = await secondClient.bootstrap({
    route: { roomId: fixture.created.room.roomId },
    principal: { access: { kind: "recovery", token: recoveryToken } },
    surface: "expo_native",
    locale: "zh-CN",
  });
  assert(recovered.ok && secondClient.read().roomProjection.viewer.seatKey === "player2",
    "Client Domain recovery exchange did not restore the same viewer scope");
  await client.dispatch({ type: "claim_control" });
  await secondClient.dispatch({ type: "claim_control" });
  await client.dispatch({ type: "refresh" });
  assert(client.read().control.status === "fenced"
    && secondClient.read().control.status === "claimed",
  "Client Domain did not reconcile two-device fence ownership");

  const beforeForbidden = transportCalls;
  const forbidden = await client.dispatch({ type: "claim_control", sessionId: "forged-session" });
  assert(!forbidden.ok && forbidden.rejection.code === "CLIENT_AUTHORITY_FIELD_REJECTED"
    && transportCalls === beforeForbidden,
  "caller-chosen control session reached transport");
  const beforeOffline = transportCalls;
  lifecycle.emit({ online: false });
  const offline = await client.dispatch({ type: "issue_invite" });
  assert(!offline.ok && offline.rejection.code === "OFFLINE_READ_ONLY"
    && client.read().roomProjection?.room?.roomId === fixture.created.room.roomId
    && transportCalls === beforeOffline,
  "offline Client Domain did not retain read-only projection or block mutation");
  lifecycle.emit({ online: true });
  await client.dispatch({ type: "refresh" });
  rejectAuthentication = true;
  const rejected = await client.dispatch({ type: "refresh" });
  assert(!rejected.ok && client.read().phase === "authentication_required"
    && backingMap.size === 0,
  "credential rejection did not erase the bound viewer cache");

  const maliciousMap = new Map();
  const malicious = createStarcraftTmgClientDomain({
    transport: { execute: async () => ({
      ok: true,
      projection: {
        room: { roomId: "slice-131-malicious", stateRevision: 0, stateHash: "a".repeat(64) },
        viewer: { seatToken: "server-must-never-project-this" },
        state: {},
      },
    }) },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: maliciousMap }),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
    now: () => OCCURRED_AT,
  });
  const leakedProjection = await malicious.bootstrap({
    route: { roomId: "slice-131-malicious" },
    principal: {},
    surface: "verifier",
  });
  assert(!leakedProjection.ok
    && leakedProjection.rejection.code === "PROJECTION_CREDENTIAL_LEAK_REJECTED"
    && maliciousMap.size === 0,
  "structurally credential-bearing projection reached the view cache");
  clientEvidence = {
    inviteExchangeInternal: true,
    recoveryExchangeInternal: true,
    rawCapabilityPersisted: false,
    twoDeviceFenceReconciled: true,
    offlineMutationBlocked: true,
    rejectedCredentialCacheErased: true,
    credentialBearingProjectionRejected: true,
  };
});

await check("client_domain_rejects_tampered_receipts_swapped_grants_and_mismatched_viewer_projections", async () => {
  const scenarios = [
    {
      name: "tampered-receipt",
      expectedCode: "ACCESS_EXCHANGE_RECEIPT_INVALID",
      mutate(operation, result) {
        if (operation === "exchange_invite" && result.ok) {
          result.receipt.refereeSignature.signature = `${result.receipt.refereeSignature.signature[0] === "A" ? "B" : "A"}${result.receipt.refereeSignature.signature.slice(1)}`;
        }
      },
    },
    {
      name: "swapped-grant",
      expectedCode: "ACCESS_EXCHANGE_BINDING_INVALID",
      mutate(operation, result) {
        if (operation === "exchange_invite" && result.ok) result.credential.seatKey = "player1";
      },
    },
    {
      name: "mismatched-viewer",
      expectedCode: "ACCESS_EXCHANGE_BINDING_INVALID",
      mutate(operation, result) {
        if (operation === "read_room" && result.ok) result.projection.viewer.seatKey = "player1";
      },
    },
  ];
  for (const scenario of scenarios) {
    const fixture = await createFixture({
      roomId: `slice-131-client-${scenario.name}`,
      state,
      dataVersion: data.version,
      store: createInMemoryStarcraftTmgRoomStore(),
      audit: { value: OCCURRED_AT },
    });
    const invitation = await fixture.runtime.issueInvite({
      roomId: fixture.created.room.roomId,
      seatToken: fixture.host.seatToken,
      expectedRoomRevision: 0,
    });
    const rawCapability = invitation.invite.inviteToken;
    const backingMap = new Map();
    const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: fixture.runtime });
    const client = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          const result = clone(await baseTransport.execute(request));
          scenario.mutate(request.operation, result);
          return result;
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
      now: () => OCCURRED_AT,
      createId: deterministicIdFactory(scenario.name),
    });
    const bootstrapped = await client.bootstrap({
      route: { roomId: fixture.created.room.roomId },
      principal: { access: { kind: "invite", token: rawCapability } },
      surface: "verifier",
    });
    assert(!bootstrapped.ok && bootstrapped.rejection.code === scenario.expectedCode,
      `${scenario.name} produced ${bootstrapped.rejection?.code || "success"}`);
    assert(backingMap.size === 0 && !JSON.stringify(client.read()).includes(rawCapability),
      `${scenario.name} persisted or projected rejected credential material`);
  }
});

await check("http_and_in_memory_transport_adapters_relay_the_same_access_operation_contract", async () => {
  const operations = [];
  const fetchImpl = async (url, init) => {
    operations.push({ url, method: init.method, body: init.body || null, hasBearer: Boolean(init.headers.authorization) });
    return { text: async () => JSON.stringify({
      schemaVersion: "starcraft_tmg_level3_http_v2",
      result: { ok: false, reason: "EXPECTED_PROBE_REJECTION" },
    }) };
  };
  const transport = createHttpStarcraftTmgAuthoritativeTransportAdapter({
    baseUrl: "https://level3.example.test",
    fetchImpl,
  });
  for (const [operation, payload, seatToken] of [
    ["issue_invite", { expectedRoomRevision: 4 }, "seat"],
    ["exchange_invite", { inviteToken: "invite" }, ""],
    ["issue_recovery", { expectedRoomRevision: 5 }, "seat"],
    ["exchange_recovery", { recoveryToken: "recovery" }, ""],
  ]) await transport.execute({ operation, roomId: "adapter-room", payload, seatToken });
  assert(operations.map((entry) => new URL(entry.url).pathname).join("/") === [
    `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/adapter-room/invites`,
    `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/adapter-room/invite-exchange`,
    `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/adapter-room/recovery-tickets`,
    `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/adapter-room/recovery-exchange`,
  ].join("/"), "HTTP access operation paths drifted");
  assert(operations[0].hasBearer && !operations[1].hasBearer
    && operations[2].hasBearer && !operations[3].hasBearer,
  "issue/exchange bearer boundary drifted");
});

let expoEvidence = null;
await check("tracked_expo_product_mounts_room_routes_lifecycle_ingress_and_ephemeral_share_controls", async () => {
  const files = {
    rootLayout: "apps/starcraft-tmg-expo/app/_layout.tsx",
    tabLayout: "apps/starcraft-tmg-expo/app/(tabs)/_layout.tsx",
    match: "apps/starcraft-tmg-expo/app/(tabs)/match.tsx",
    roomRoute: "apps/starcraft-tmg-expo/app/room/[roomId].tsx",
    provider: "apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx",
    access: "apps/starcraft-tmg-expo/lib/level3/room-access-v1.mjs",
    appConfig: "apps/starcraft-tmg-expo/app.config.ts",
    runtime: "packages/room-runtime/in-memory-room-v1.mjs",
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, relative]) => (
    [key, await readFile(path.join(ROOT, relative), "utf8")]
  ))));
  const tabs = [...sources.tabLayout.matchAll(/<Tabs\.Screen\s+[\s\S]*?name=["']([^"']+)["']/gu)]
    .map((match) => match[1]);
  assert(JSON.stringify(tabs) === JSON.stringify(EXPECTED_TABS), "room route work changed the five-tab product shell");
  assert(sources.rootLayout.includes('name="room/[roomId]"')
    && sources.roomRoute.includes("router.replace") && sources.roomRoute.includes("/(tabs)/match"),
  "bounded room route is not mounted into Expo Router");
  assert(sources.roomRoute.includes("roomAccess.roomId === routeRoomId")
    && sources.roomRoute.includes('roomAccess.status === "rejected" && roomAccess.roomId === null'),
  "room route can settle from another room or hang after ingress failure");
  assert(sources.provider.includes("Linking.getInitialURL")
    && sources.provider.includes("Linking.addEventListener")
    && sources.provider.includes("history.replaceState")
    && sources.provider.includes("NetInfo.addEventListener")
    && sources.provider.includes("let nativeOnline = false"),
  "Provider does not consume/scrub deep links or subscribe to Native connectivity");
  assert(sources.match.includes("issue_invite") && sources.match.includes("issue_recovery")
    && sources.match.includes("claim_control"),
  "Match UI does not expose the three typed room access intents");
  assert(sources.match.includes("Share.share") && sources.match.includes("Clipboard.setStringAsync")
    && /dismiss|clear/iu.test(sources.match),
  "ephemeral invite/recovery sharing lacks share, copy, or dismissal controls");
  assert(sources.appConfig.includes("associatedDomains")
    && sources.appConfig.includes("autoVerify: true")
    && sources.appConfig.includes("EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN is required")
    && sources.match.includes("linkConfiguration.available")
    && sources.access.includes("ROOM_CAPABILITY_REQUIRES_HTTPS_APP_LINK"),
  "production bearer sharing is not fail-closed behind verified HTTPS Universal/App Links");
  assert(!sources.runtime.includes("controllerGrantId"),
    "another device's controller Grant ID is exposed by a projection contract");
  for (const [name, source] of Object.entries(sources)) {
    assert(!/saveMatchRecord|FIREBASE_PROJECT_ID|firestore\.googleapis\.com/iu.test(source),
      `legacy/client authority is reachable from ${name}`);
  }
  expoEvidence = {
    fiveTabsPreserved: true,
    hiddenRoomRouteMounted: true,
    initialAndEventDeepLinksMounted: true,
    browserHistoryScrubMounted: true,
    nativeConnectivitySubscriptionMounted: true,
    routeSettlementBoundToRoomId: true,
    productionVerifiedHttpsLinksRequired: true,
    ephemeralShareControlsMounted: true,
    realBrowserEvidence: false,
    realNativeDeviceEvidence: false,
  };
});

const artifactPaths = [
  "content/client/room-access-recovery-v1.mjs",
  "packages/authoritative-engine/transition-v1.mjs",
  "packages/room-runtime/in-memory-room-v1.mjs",
  "packages/http-adapter/handler-v1.mjs",
  "packages/client-domain/client-domain-v1.mjs",
  "packages/client-domain/authoritative-transport-adapters-v1.mjs",
  "apps/starcraft-tmg-expo/app.config.ts",
  "apps/starcraft-tmg-expo/package.json",
  "apps/starcraft-tmg-expo/pnpm-lock.yaml",
  "apps/starcraft-tmg-expo/lib/level3/room-access-v1.mjs",
  "apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx",
  "apps/starcraft-tmg-expo/app/(tabs)/match.tsx",
  "apps/starcraft-tmg-expo/app/room/[roomId].tsx",
];
const artifactHashes = await Promise.all(artifactPaths.map(async (relative) => (
  sha256(await readFile(path.join(ROOT, relative)))
)));

const harness = {
  harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  promptPackRoutes: [],
  harnessToolsCalled: [
    "parse_room_access_url",
    "exchange_room_access_capability",
    "read_viewer_projection",
    "claim_control_lease",
    "recover_viewer_projection_cache",
  ],
  uiTraceEvidence: [
    "node_importable_web_and_native_room_locator_semantics",
    "tracked_expo_route_provider_and_match_access_control_static_trace",
  ],
  agentDecisionEvidence: "URL claims are untrusted; the server selects seat/role and only the latest explicit same-seat lease claim controls.",
  memoryTraceEvidence: [
    "raw_capabilities_absent_from_room_private_recovery_and_projection_stores",
    "authentication_rejection_erases_viewer_cache",
  ],
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: [
    "any_raw_credential_in_view_cache_journal_or_ledger_reopens_slice_131",
    "any_multi_exchange_or_unfenced_same_seat_controller_reopens_slice_131",
    "any_url_owned_side_role_transport_revision_or_confirmation_reopens_slice_131",
  ],
  userVisibleChecks: [
    "room_identity_and_viewer_scope_visible",
    "control_and_recovery_revisions_visible",
    "offline_read_only_state_visible",
    "ephemeral_share_link_requires_copy_share_or_dismiss",
  ],
  evidenceHashes: [contract.contractHash],
  artifactHashes,
  knownGaps: [
    "authoritative_battlefield_interaction_reserved_for_slice_132",
    "real_browser_build_and_acceptance_reserved_for_slice_136",
    "native_build_and_real_device_reserved_for_slice_137",
  ],
  promotionStatus: "room_access_runtime_only_not_agent_skill_or_training_promotion",
};

await check("harness_record_binds_artifacts_security_demotion_and_future_evidence_gaps", () => {
  assert(harness.harnessLoopUsed === true && harness.targetGames.join() === "starcraft-tmg",
    "Harness identity missing");
  for (const key of ["promptPackRoutes", "harnessToolsCalled", "uiTraceEvidence", "memoryTraceEvidence",
    "trainingTraceCandidates", "rollbackOrDemotionRules", "userVisibleChecks", "evidenceHashes",
    "artifactHashes", "knownGaps"]) {
    assert(Array.isArray(harness[key]), `Harness field ${key} must be an array`);
  }
  assert(harness.artifactHashes.length === artifactPaths.length
    && harness.artifactHashes.every((hash) => /^[0-9a-f]{64}$/u.test(hash)),
  "Harness artifact hashes are incomplete");
  assert(harness.knownGaps.length === 3 && harness.trainingTraceCandidates.length === 0,
    "future evidence gaps or absent training candidates are hidden");
  assert(harness.promotionStatus === "room_access_runtime_only_not_agent_skill_or_training_promotion",
    "Harness promotion status is ambiguous");
});

await mkdir(BUILD_ROOT, { recursive: true });
const reportUnsigned = {
  schemaVersion: "starcraft_tmg_ticket_14_room_access_recovery_verification_v1",
  generatedAt: OCCURRED_AT,
  ticket: 14,
  slice: 131,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  accessEvidence: {
    roomIdOnlyJoinRejected: true,
    accessEntropyBits: contract.accessCapabilities.entropyBits,
    rawAccessTokenPersisted: false,
    memoryAndSqliteCasVerified: true,
    exactAuditExpiryVerified: true,
    recoveryCreatesSecondSameSeatGrant: true,
    recoveryCreatesControlLease: false,
    staleLeaseFenced: true,
  },
  receiptEvidence,
  clientEvidence,
  httpEvidence,
  expoEvidence,
  artifacts: artifactPaths.map((artifactPath, index) => ({ path: artifactPath, sha256: artifactHashes[index] })),
  harness,
  ticketStatus: {
    plannedSlices: 11,
    completeSlices: failures.length === 0 ? 4 : 3,
    remainingSlices: failures.length === 0 ? 7 : 8,
    nextSlice: failures.length === 0 ? 132 : 131,
  },
  sourceRefreshPerformed: false,
  providerCalled: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  trainingTruth: false,
};
const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
