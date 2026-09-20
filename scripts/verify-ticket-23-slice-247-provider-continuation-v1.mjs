#!/usr/bin/env node

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1 as liveProfile } from
  "../content/provider/ticket-16-live-provider-closure-v1.mjs";
import { createStarcraftTmgProviderEgressTransportV1 } from
  "../packages/secure-provider-runtime/provider-egress-transport-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";

const registry = createStarcraftTmgProviderProfileRegistryV1({
  entries: [{ providerProfile: liveProfile, completionPath: "/chat/completions" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const resolved = await registry.resolveEgressBinding({
  profileRef: {
    id: liveProfile.providerProfileId,
    version: liveProfile.version,
    hash: liveProfile.integrity.hash,
  },
});
assert.equal(resolved.ok, true);

const observation = {};
const payload = JSON.stringify({
  id: "fixture-ticket-23-slice-247",
  model: "deepseek-v4-flash",
  choices: [{
    finish_reason: "tool_calls",
    message: {
      role: "assistant",
      content: null,
      tool_calls: [{
        id: "call_exact_successor",
        type: "function",
        function: {
          name: "preview_finite_successor",
          arguments: JSON.stringify({ candidateId: "pass-current-phase" }),
        },
      }],
    },
  }],
  usage: { prompt_tokens: 80, completion_tokens: 12, total_tokens: 92 },
});

function requestImplementation(_options, callback) {
  const request = new EventEmitter();
  request.destroy = () => {};
  request.setTimeout = () => {};
  request.end = (body) => {
    observation.body = JSON.parse(body);
    queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.headers = {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(Buffer.byteLength(payload)),
        "x-request-id": "fixture-ticket-23-slice-247",
      };
      response.destroy = () => {};
      callback(response);
      queueMicrotask(() => {
        response.emit("data", Buffer.from(payload));
        response.emit("end");
      });
    });
  };
  return request;
}

const transport = createStarcraftTmgProviderEgressTransportV1({
  resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
  requestImplementation,
  now: () => "2026-09-15T10:00:00.000Z",
});
const credential = Buffer.from("fixture-ticket-23-slice-247-only", "utf8");
const result = await transport.complete({
  egressBinding: resolved.egressBinding,
  credentialBytes: credential,
  providerRequest: {
    schemaVersion: "starcraft_tmg_direct_provider_request_v1",
    requestId: "ticket-23-slice-247-request-001",
    intent: "take_turn",
    promptPack: "starcraft_tmg_agent_planner_v2",
    promptNodes: [{ nodeType: "platform", authority: "host" }],
    userMessage: "Inspect exact successor evidence before choosing pass.",
    responseContract: {
      allowedChannels: ["planning"],
      decisionCandidateSource: "current_spatial_action_space_only",
    },
    agentLoop: {
      mode: "native_tools",
      tools: [{
        type: "function",
        function: {
          name: "preview_finite_successor",
          description: "Return the exact Rules-owned successor for a finite action.",
          parameters: {
            type: "object",
            properties: { candidateId: { type: "string" } },
            required: ["candidateId"],
            additionalProperties: false,
          },
        },
      }, {
        type: "function",
        function: {
          name: "inspect_current_phase",
          description: "Return the exact current phase.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      }],
      continuationMessages: [{
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_previous_observation",
          type: "function",
          function: {
            name: "inspect_current_phase",
            arguments: "{}",
          },
        }],
      }, {
        role: "tool",
        tool_call_id: "call_previous_observation",
        name: "inspect_current_phase",
        content: JSON.stringify({ phase: "movement", exact: true }),
      }],
    },
    maxOutputUnits: 64,
  },
});
credential.fill(0);

assert.equal(observation.body.messages.length, 4);
assert.equal(observation.body.messages[2].role, "assistant");
assert.equal(observation.body.messages[3].role, "tool");
assert.equal(observation.body.tools[0].function.name,
  "preview_finite_successor");
assert.equal(observation.body.tool_choice, "auto");
assert.equal(observation.body.response_format, undefined);
assert.deepEqual(result.output, {
  providerTurn: {
    kind: "tool_calls",
    toolCalls: [{
      callId: "call_exact_successor",
      name: "preview_finite_successor",
      arguments: { candidateId: "pass-current-phase" },
    }],
  },
});
assert.equal(result.usageReceipt.usage.totalUnits, 92);

process.stdout.write("ticket-23 slice-247 provider continuation gate passed\n");
