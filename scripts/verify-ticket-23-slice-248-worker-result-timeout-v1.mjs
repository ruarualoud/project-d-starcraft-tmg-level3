#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as profile } from
  "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV1 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs";

// Reproduce the production V1 port's parent deadline, not a network timeout.
// The child only speaks local IPC and never contacts a Provider.
const fixturePath = fileURLToPath(new URL(
  "./fixtures/provider-egress-worker-ipc-fixture-v1.mjs", import.meta.url));
let childStarts = 0;
for (const [mode, expectedCode] of [
  ["no_result", "PROVIDER_WORKER_RESULT_TIMEOUT"],
  ["child_handler_failure", "PROVIDER_WORKER_PROTOCOL_REJECTED"],
]) {
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: profile, completionPath: "/beta/chat/completions",
      transportTimeoutMs: 25 }],
    allowedProviders: [profile.provider],
  });
  const port = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
    handshakeTimeoutMs: 1_000,
    spawnProcess: () => {
      childStarts += 1;
      return spawn(process.execPath, [fixturePath, mode], {
        shell: false,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        serialization: "advanced",
        env: { NODE_NO_WARNINGS: "1" },
      });
    },
  });
  let attachment;
  try {
    attachment = await port.attachCredential({
      attachmentId: `slice248-result-timeout-${mode}`,
      providerProfile: profile,
      credentialBytes: Buffer.from("fixture-development-only", "utf8"),
    });
    await assert.rejects(port.complete({
      workerRef: attachment.workerRef,
      providerRequest: { requestId: `slice248-result-timeout-${mode}` },
    }), (error) => {
      assert.equal(error.code, expectedCode);
      assert.equal(error.safeReceipt.requestMayHaveBeenSent, true);
      assert.equal(error.safeReceipt.physicalAttempts, 1);
      assert.equal(error.safeReceipt.automaticRetries, 0);
      return true;
    });
  } finally {
    if (attachment) await port.detachCredential({
      workerRef: attachment.workerRef,
      reason: "slice248_result_timeout_fixture_complete",
    });
    await port.close();
  }
}
assert.equal(childStarts, 2);
process.stdout.write(JSON.stringify({
  workerResultDeadlineClassified: true,
  protocolRejectionStillDistinct: true,
  automaticRetries: 0, providerCalls: 0, roomMutations: 0,
}) + "\n");
