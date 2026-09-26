#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as profile } from
  "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";

const fixturePath = fileURLToPath(new URL(
  "./fixtures/provider-egress-worker-ipc-fixture-v1.mjs", import.meta.url));
const registry = createStarcraftTmgProviderProfileRegistryV1({
  entries: [{ providerProfile: profile, completionPath: "/beta/chat/completions" }],
  allowedProviders: [profile.provider],
});
const port = createStarcraftTmgProviderEgressWorkerPortV2({
  providerProfileRegistry: registry,
  spawnProcess: () => spawn(process.execPath,
    [fixturePath, "child_handler_failure"], {
      shell: false,
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      serialization: "advanced",
      env: { NODE_NO_WARNINGS: "1" },
    }),
});
let attachment;
try {
  attachment = await port.attachCredential({
    attachmentId: "slice248-child-failure-fixture",
    providerProfile: profile,
    credentialBytes: Buffer.from("fixture-development-only", "utf8"),
  });
  await assert.rejects(port.complete({
    workerRef: attachment.workerRef,
    providerRequest: { requestId: "slice248-child-failure-request" },
  }), (error) => {
    assert.equal(error.code, "PROVIDER_WORKER_CHILD_HANDLER_FAILED");
    assert.equal(error.safeReceipt.requestMayHaveBeenSent, true);
    assert.equal(error.safeReceipt.physicalAttempts, 1);
    return true;
  });
  process.stdout.write(
    "worker_failure_classified; providerCalls=0; roomMutations=0\n");
} finally {
  if (attachment) await port.detachCredential({
    workerRef: attachment.workerRef,
    reason: "slice248_child_failure_fixture_complete",
  });
  await port.close();
}
