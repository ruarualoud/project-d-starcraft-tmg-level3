// Regression for the actual A/r1 tool continuation rejected before dispatch.
// Uses the real transport validator, frozen profile and captured tool messages;
// the DNS boundary is an explicit local spy. No network or Provider call occurs.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { createStarcraftTmgProviderEgressTransportV1 } from
  "../packages/secure-provider-runtime/provider-egress-transport-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES } from
  "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as profile } from
  "../content/provider/ticket-23-live-provider-profiles-v1.mjs";

const [roomDirectory, evidencePath] = process.argv.slice(2);
assert(roomDirectory && evidencePath);
const db = new DatabaseSync(`${roomDirectory}/seats/player1/provider/live-decisions.sqlite`,
  { readOnly: true });
const record = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
  "SELECT record_json FROM sc_live_decision_records LIMIT 1").get().record_json);
db.close();
const choice = Object.values(record.decisions).find(c => c.authority.stateRevision === 1);
assert(choice);
const messages = structuredClone(choice.providerContinuationMessages);
const tool = messages.find(m => m.role === "tool");
assert(tool && tool.content.length > 256 * 1024,
  "fixture must contain the actual oversized tool reply, not synthetic padding");
const originalMessages = JSON.stringify(messages);
const registry = createStarcraftTmgProviderProfileRegistryV1({
  entries: [{ providerProfile: profile, completionPath: "/beta/chat/completions" }],
  allowedProviders: [profile.provider],
});
const resolved = await registry.resolveEgressBinding({ profileRef: {
  id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash,
} });
assert(resolved.ok);
let dnsBoundaryCalls = 0;
const transport = createStarcraftTmgProviderEgressTransportV1({
  resolveAddresses: async () => { dnsBoundaryCalls += 1; return []; },
  requestImplementation: () => { throw new Error("REAL_NETWORK_FORBIDDEN"); },
});
const request = {
  schemaVersion: "starcraft_tmg_direct_provider_request_v1",
  requestId: "captured-A-r1-tool-capacity", intent: "chat",
  promptPack: "selfplay_agent_prompt", promptNodes: [],
  userMessage: "Continue the captured tool request.",
  responseContract: { allowedChannels: ["planning_result"],
    decisionCandidateSource: "current_legal_space" },
  maxOutputUnits: 64,
  agentLoop: { mode: "native_tools", toolChoice: "auto",
    tools: [{ type: "function", function: { name: "query_spatial_rules",
      description: "Captured spatial query.", parameters: { type: "object" } } }],
    continuationMessages: messages },
};
const credentialBytes = Buffer.from("local-regression-not-a-real-credential");
let errorCode = null;
try { await transport.complete({ egressBinding: resolved.egressBinding,
  credentialBytes, providerRequest: request }); }
catch (error) { errorCode = error.code; }
const proof = { capturedRevision: 1, toolReplyBytes: Buffer.byteLength(tool.content),
  dnsBoundaryCalls, observedError: errorCode, physicalProviderCalls: 0,
  originalMessagesUnchanged: JSON.stringify(messages) === originalMessages,
  trainingTruth: false };
await writeFile(evidencePath, JSON.stringify(proof, null, 2), { mode: 0o600 });
assert.equal(errorCode, "PROVIDER_DNS_PUBLIC_ADDRESS_REQUIRED",
  "the actual tool reply must pass local request validation before the fake DNS boundary");
assert.equal(dnsBoundaryCalls, 1);
assert.equal(JSON.stringify(messages), originalMessages, "must not trim tool evidence");

// The aggregate transport envelope remains authoritative after removing the
// smaller per-tool limit: an oversized whole request still must not dispatch.
const oversized = structuredClone(request);
oversized.agentLoop.continuationMessages.find(m => m.role === "tool").content =
  "x".repeat(STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES);
await assert.rejects(transport.complete({ egressBinding: resolved.egressBinding,
  credentialBytes, providerRequest: oversized }),
  error => error.code === "PROVIDER_REQUEST_TOO_LARGE");
assert.equal(dnsBoundaryCalls, 1, "oversized aggregate must stop before DNS");
assert.equal(JSON.stringify(messages), originalMessages);
await writeFile(evidencePath, JSON.stringify({ ...proof, passed: true,
  aggregateLimitRetained: true, originalMessagesUnchanged: true }, null, 2),
  { mode: 0o600 });
console.log(JSON.stringify({ ...proof, passed: true, aggregateLimitRetained: true }));
