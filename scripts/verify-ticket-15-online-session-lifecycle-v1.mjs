#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1 } from
  "../content/agent/ticket-15-online-session-lifecycle-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-145-online-session-lifecycle-v1/report.json");
const packageBundle = createKerriganPrimalProductBundleV1();
const characterPackage = packageBundle.characterPackage;
const packageHash = characterPackage.integrity.hash;
const selectionHash = hashStarcraftTmgContract({
  characterId: characterPackage.characterId,
  persona: "queen-of-blades-primal",
  spoilerCeilingRank: 6,
});

function roomBinding(suffix = "a") {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: "0.112.0-official-faq-v1-current",
    dataVersion: "official-onetime-snapshot-v1",
    matchBindingHash: suffix.repeat(64),
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

function principalBinding(overrides = {}) {
  return createStarcraftTmgOnlinePrincipalBindingV1({
    roomId: "slice-145-room-a",
    principalScopeHash: "2".repeat(64),
    seatKey: "player1",
    principalType: "human",
    principalRoleMode: "player",
    bindingRevision: 4,
    allowedAgentModes: ["tutor", "companion"],
    characterId: characterPackage.characterId,
    characterPackageHash: packageHash,
    characterSelectionHash: selectionHash,
    roomBinding: roomBinding(),
    ...overrides,
  });
}

const bindings = new Map([
  ["principal-tutor", principalBinding()],
  ["principal-companion", principalBinding({ principalScopeHash: "3".repeat(64) })],
  ["principal-opponent", principalBinding({
    principalScopeHash: "4".repeat(64),
    seatKey: "player2",
    principalType: "model",
    principalRoleMode: "opponent",
    allowedAgentModes: ["opponent"],
  })],
  ["principal-commentator", principalBinding({
    principalScopeHash: "5".repeat(64),
    seatKey: "observer",
    principalType: "service",
    principalRoleMode: "commentator",
    allowedAgentModes: ["commentator"],
  })],
  ["principal-other", principalBinding({ principalScopeHash: "6".repeat(64) })],
  ["principal-same-scope-other-seat", principalBinding({ seatKey: "player9" })],
  ["principal-room-b", principalBinding({
    roomId: "slice-145-room-b",
    principalScopeHash: "7".repeat(64),
    roomBinding: roomBinding("9"),
  })],
]);

const principalCalls = [];
const characterCalls = [];
let idSequence = 0;
let instantSequence = 0;
const supervisor = createStarcraftTmgOnlineAgentSessionLifecycleV1({
  principalAuthority: {
    async resolve(input) {
      principalCalls.push(structuredClone(input));
      const binding = bindings.get(input.principalSessionRef);
      if (!binding) return { ok: false, reason: "principal_not_authenticated" };
      return { ok: true, binding };
    },
  },
  characterCatalog: {
    async resolve(input) {
      characterCalls.push(structuredClone(input));
      if (input.characterId !== characterPackage.characterId
        || input.characterPackageHash !== packageHash) {
        return { ok: false, reason: "character_not_found" };
      }
      return { ok: true, characterPackage };
    },
  },
  createId() {
    idSequence += 1;
    return `sc-agent-session-${String(idSequence).padStart(3, "0")}`;
  },
  now() {
    const instant = new Date(Date.UTC(2026, 8, 3, 23, 0, instantSequence));
    instantSequence += 1;
    return instant.toISOString();
  },
});

const acceptance = [];
async function accept(name, operation) {
  await operation();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${name}`);
}

function context(principalSessionRef) {
  return { principalSessionRef };
}

function verifyHash(value, hashField) {
  const { [hashField]: observed, ...unsigned } = value;
  assert.equal(hashStarcraftTmgContract(unsigned), observed);
}

const createdByMode = new Map();

await accept("metadata_declares_server_identity_unbounded_sessions_and_no_credentials", async () => {
  const metadata = supervisor.metadata();
  assert.equal(metadata.sessionIdentity, "server_generated");
  assert.equal(metadata.principalAuthentication, "external_server_authority_port");
  assert.deepEqual(metadata.credentialInputs, []);
  assert.equal(metadata.concurrentSessions,
    "unbounded_by_contract_resource_policy_is_external");
  assert.equal(metadata.providerMounted, false);
});

await accept("principal_bindings_are_hash_sealed_server_authority_outputs", async () => {
  for (const binding of bindings.values()) {
    verifyHash(binding.roomBinding, "roomBindingHash");
    verifyHash(binding, "bindingHash");
    assert.equal(binding.credentialFreeProjection, true);
  }
});

await accept("client_cannot_choose_session_identity_or_submit_authority_or_credentials", async () => {
  const rejected = await supervisor.createSession({
    roomId: "slice-145-room-a",
    mode: "tutor",
    characterId: characterPackage.characterId,
    sessionId: "client-session",
    seatKey: "player9",
    seatToken: "forbidden",
    apiKey: "forbidden",
  }, context("principal-tutor"));
  assert.equal(rejected.reason, "forbidden_client_field");
  assert.deepEqual(rejected.forbiddenFields,
    ["apiKey", "seatKey", "seatToken", "sessionId"]);
});

await accept("server_context_accepts_only_an_opaque_principal_reference", async () => {
  const rejected = await supervisor.createSession({
    roomId: "slice-145-room-a",
    mode: "tutor",
    characterId: characterPackage.characterId,
  }, { principalSessionRef: "principal-tutor", authorization: "Bearer forbidden" });
  assert.equal(rejected.reason, "forbidden_client_field");
  assert.deepEqual(rejected.forbiddenFields, ["authorization"]);
});

for (const [mode, principalSessionRef] of [
  ["tutor", "principal-tutor"],
  ["opponent", "principal-opponent"],
  ["commentator", "principal-commentator"],
  ["companion", "principal-companion"],
]) {
  await accept(`${mode}_session_binds_exact_room_principal_seat_role_character_and_rules`, async () => {
    const result = await supervisor.createSession({
      roomId: "slice-145-room-a",
      mode,
      characterId: characterPackage.characterId,
    }, context(principalSessionRef));
    assert.equal(result.ok, true);
    assert.match(result.session.sessionId, /^sc-agent-session-\d{3}$/u);
    assert.equal(result.session.binding.mode, mode);
    assert.equal(result.session.binding.roomId, "slice-145-room-a");
    assert.equal(result.session.binding.character.hash, packageHash);
    assert.equal(result.session.binding.character.selectionHash, selectionHash);
    assert.equal(result.session.capability.mayConfirm, false);
    assert.equal(result.session.capability.mayApply, false);
    assert.equal(result.session.connection.epoch, 1);
    verifyHash(result.session.binding, "sessionBindingHash");
    verifyHash(result.session, "projectionHash");
    verifyHash(result.receipt, "receiptHash");
    createdByMode.set(mode, result);
  });
}

await accept("role_policy_is_server_owned_and_arbitrary_modes_fail_closed", async () => {
  const denied = await supervisor.createSession({
    roomId: "slice-145-room-a",
    mode: "opponent",
    characterId: characterPackage.characterId,
  }, context("principal-tutor"));
  assert.equal(denied.reason, "agent_mode_not_authorized");
  const arbitrary = await supervisor.createSession({
    roomId: "slice-145-room-a",
    mode: "omniscient",
    characterId: characterPackage.characterId,
  }, context("principal-tutor"));
  assert.equal(arbitrary.reason, "invalid_session_request");
});

await accept("viewer_projection_contains_hashes_but_no_opaque_auth_or_secret_material", async () => {
  const serialized = JSON.stringify(createdByMode.get("tutor"));
  assert(!serialized.includes("principal-tutor"));
  assert(!serialized.includes("seatToken"));
  assert(!serialized.includes("apiKey"));
  assert(!serialized.includes("authorization"));
  assert(!serialized.includes("Bearer"));
  assert.equal(createdByMode.get("tutor").session.credentialPolicy,
    "provider_gateway_only_no_credentials_accepted");
});

await accept("same_principal_can_read_an_unchanged_hash_stable_projection", async () => {
  const created = createdByMode.get("tutor").session;
  const read = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
    mode: "tutor",
    characterId: characterPackage.characterId,
    expectedConnectionEpoch: 1,
  }, context("principal-tutor"));
  assert.equal(read.ok, true);
  assert.equal(read.session.projectionHash, created.projectionHash);
});

await accept("cross_room_cross_principal_and_cross_seat_reads_are_rejected", async () => {
  const created = createdByMode.get("tutor").session;
  const crossRoom = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: "slice-145-room-b",
  }, context("principal-room-b"));
  assert.equal(crossRoom.reason, "session_scope_mismatch");
  const crossPrincipal = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
  }, context("principal-other"));
  assert.equal(crossPrincipal.reason, "principal_scope_mismatch");
  const crossSeat = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
  }, context("principal-same-scope-other-seat"));
  assert.equal(crossSeat.reason, "seat_scope_mismatch");
});

await accept("role_and_character_scope_cannot_be_swapped_after_creation", async () => {
  const created = createdByMode.get("tutor").session;
  const role = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
    mode: "companion",
  }, context("principal-tutor"));
  assert.equal(role.reason, "role_scope_mismatch");
  const character = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
    characterId: "forged-character",
  }, context("principal-tutor"));
  assert.equal(character.reason, "character_scope_mismatch");
});

await accept("stale_principal_revision_requires_a_new_session", async () => {
  const created = await supervisor.createSession({
    roomId: "slice-145-room-a", mode: "tutor",
    characterId: characterPackage.characterId,
  }, context("principal-tutor"));
  const original = bindings.get("principal-tutor");
  bindings.set("principal-tutor", principalBinding({ bindingRevision: 5 }));
  const stale = await supervisor.readSession({
    sessionId: created.session.sessionId, roomId: "slice-145-room-a",
  }, context("principal-tutor"));
  assert.equal(stale.reason, "stale_principal_binding");
  bindings.set("principal-tutor", original);
});

await accept("stale_character_selection_requires_a_new_session", async () => {
  const created = await supervisor.createSession({
    roomId: "slice-145-room-a", mode: "companion",
    characterId: characterPackage.characterId,
  }, context("principal-companion"));
  const original = bindings.get("principal-companion");
  bindings.set("principal-companion", principalBinding({
    principalScopeHash: "3".repeat(64),
    characterSelectionHash: "8".repeat(64),
  }));
  const stale = await supervisor.readSession({
    sessionId: created.session.sessionId, roomId: "slice-145-room-a",
  }, context("principal-companion"));
  assert.equal(stale.reason, "stale_character_binding");
  bindings.set("principal-companion", original);
});

await accept("stale_room_rules_binding_requires_a_new_session", async () => {
  const created = await supervisor.createSession({
    roomId: "slice-145-room-a", mode: "commentator",
    characterId: characterPackage.characterId,
  }, context("principal-commentator"));
  const original = bindings.get("principal-commentator");
  bindings.set("principal-commentator", principalBinding({
    principalScopeHash: "5".repeat(64),
    seatKey: "observer",
    principalType: "service",
    principalRoleMode: "commentator",
    allowedAgentModes: ["commentator"],
    roomBinding: { ...roomBinding(), rulesArtifactHash: "9".repeat(64) },
  }));
  const stale = await supervisor.readSession({
    sessionId: created.session.sessionId, roomId: "slice-145-room-a",
  }, context("principal-commentator"));
  assert.equal(stale.reason, "stale_room_binding");
  bindings.set("principal-commentator", original);
});

await accept("reconnect_advances_connection_fence_and_rejects_the_old_epoch", async () => {
  const created = createdByMode.get("tutor").session;
  const reconnected = await supervisor.reconnectSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context("principal-tutor"));
  assert.equal(reconnected.ok, true);
  assert.equal(reconnected.session.sessionRevision, 1);
  assert.equal(reconnected.session.connection.epoch, 2);
  assert.equal(reconnected.receipt.operation, "reconnect_session");
  verifyHash(reconnected.receipt, "receiptHash");
  const stale = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context("principal-tutor"));
  assert.equal(stale.reason, "stale_connection");
  assert.equal(stale.observedConnectionEpoch, 2);
});

await accept("end_is_hash_receipted_idempotent_and_cannot_be_reconnected", async () => {
  const created = createdByMode.get("tutor").session;
  const ended = await supervisor.endSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
    expectedConnectionEpoch: 2,
  }, context("principal-tutor"));
  assert.equal(ended.ok, true);
  assert.equal(ended.idempotentReplay, false);
  assert.equal(ended.session.lifecycleState, "ended");
  assert.equal(ended.session.connection.epoch, 3);
  verifyHash(ended.receipt, "receiptHash");
  const replay = await supervisor.endSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
  }, context("principal-tutor"));
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.receipt.receiptHash, ended.receipt.receiptHash);
  const reconnect = await supervisor.reconnectSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
  }, context("principal-tutor"));
  assert.equal(reconnect.reason, "session_ended");
});

await accept("unknown_or_unauthenticated_sessions_fail_closed_without_identity_leakage", async () => {
  const unknown = await supervisor.readSession({
    sessionId: "sc-agent-session-999",
    roomId: "slice-145-room-a",
  }, context("principal-tutor"));
  assert.equal(unknown.reason, "session_not_found");
  const created = createdByMode.get("companion").session;
  const unauthenticated = await supervisor.readSession({
    sessionId: created.sessionId,
    roomId: created.binding.roomId,
  }, context("missing-principal"));
  assert.equal(unauthenticated.reason, "principal_not_authenticated");
  assert(!JSON.stringify(unauthenticated).includes("missing-principal"));
});

await accept("authority_and_character_ports_receive_only_bounded_hash_scoped_inputs", async () => {
  assert(principalCalls.length > 0);
  assert(principalCalls.every((call) =>
    Object.keys(call).sort().join("/") === "principalSessionRef/roomId"));
  assert(characterCalls.length >= 4);
  assert(characterCalls.every((call) => Object.keys(call).sort().join("/")
    === "characterId/characterPackageHash/characterSelectionHash/mode"));
  assert(characterCalls.every((call) => !JSON.stringify(call).includes("principal-")));
});

await accept("slice_contract_keeps_provider_byok_skill_training_and_native_work_deferred", async () => {
  const contract = STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1;
  verifyHash(contract, "lifecycleContractHash");
  assert.equal(contract.slice, 145);
  assert.deepEqual(contract.identity.persistedCredentialMaterial, []);
  assert.equal(contract.deferred.providerGatewaySupervisor, 146);
  assert.equal(contract.deferred.secureByokAndLiveProvider, 16);
  assert.deepEqual(contract.runTruth, {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  });
});

assert.equal(acceptance.length, 21);

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_15_slice_145_report_v1",
  ticket: 15,
  slice: 145,
  generatedAt: "2026-09-03T23:30:00.000Z",
  lifecycleContractHash:
    STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1.lifecycleContractHash,
  acceptanceChecks: acceptance,
  acceptanceCount: acceptance.length,
  roleModesProven: [...createdByMode.keys()],
  runtimeMetadata: supervisor.metadata(),
  authorityCallCount: principalCalls.length,
  characterResolutionCount: characterCalls.length,
  ticketProgress: "2/9",
  projectProgress: "13/22",
  nativeDeviceEvidence: "deferred_by_user_until_full_development_completion",
  runTruth: STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1.runTruth,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Ticket 15 Slice 145 online session lifecycle: ${acceptance.length}/${acceptance.length}`);
console.log(`Lifecycle contract: ${report.lifecycleContractHash}`);
console.log(`Report: ${report.reportHash}`);
console.log(`Ticket 15 progress: ${report.ticketProgress}`);
console.log(`Project progress: ${report.projectProgress}`);
