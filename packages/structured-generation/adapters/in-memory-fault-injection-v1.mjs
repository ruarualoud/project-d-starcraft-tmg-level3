import { hashStarcraftTmgContract } from
  "../../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_IN_MEMORY_STRUCTURED_FAULT_ADAPTER_VERSION =
  "starcraft_tmg_in_memory_structured_fault_adapter_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function responsePayload(kind, step, body) {
  const usage = step.usage === undefined ? {
    input_tokens: 120,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens: 40,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 160,
  } : clone(step.usage);
  const common = {
    id: `response-${String(step.id || kind)}`,
    object: "response",
    created_at: 1788688800,
    model: body.model,
    usage,
    error: null,
    incomplete_details: null,
  };
  if (kind === "success") return {
    ...common,
    status: "completed",
    output: [{ type: "message", id: "message-1", status: "completed",
      role: "assistant", content: [{ type: "output_text",
        text: JSON.stringify(step.output) }] }],
  };
  if (kind === "invalid_schema") return {
    ...common,
    status: "completed",
    output: [{ type: "message", id: "message-1", status: "completed",
      role: "assistant", content: [{ type: "output_text",
        text: JSON.stringify(step.output || { unexpected: true }) }] }],
  };
  if (kind === "invalid_json") return {
    ...common,
    status: "completed",
    output: [{ type: "message", id: "message-1", status: "completed",
      role: "assistant", content: [{ type: "output_text",
        text: step.text || "{not-json" }] }],
  };
  if (kind === "refusal") return {
    ...common,
    status: "completed",
    output: [{ type: "message", id: "message-1", status: "completed",
      role: "assistant", content: [{ type: "refusal",
        refusal: "bounded synthetic refusal" }] }],
  };
  if (kind === "incomplete") return {
    ...common,
    status: "incomplete",
    incomplete_details: { reason: step.reason || "max_output_tokens" },
    output: [],
  };
  if (kind === "failed") return {
    ...common,
    status: "failed",
    error: { code: step.code || "synthetic_upstream_failure",
      message: "synthetic failure" },
    output: [],
  };
  if (kind === "usage_unknown") return {
    ...common,
    status: "completed",
    usage: null,
    output: [{ type: "message", id: "message-1", status: "completed",
      role: "assistant", content: [{ type: "output_text",
        text: JSON.stringify(step.output) }] }],
  };
  throw new TypeError(`Unknown fault step: ${kind}`);
}

export function createStarcraftTmgInMemoryStructuredFaultAdapterV1(
  options = {}) {
  const queue = Array.isArray(options.steps) ? options.steps.map(clone) : [];
  const calls = [];
  let sequence = 0;
  async function send(input = {}) {
    const step = queue.shift();
    if (!step) throw new Error("IN_MEMORY_FAULT_SCRIPT_EXHAUSTED");
    sequence += 1;
    const requestBodyHash = hashStarcraftTmgContract(input.body);
    calls.push(freeze({ sequence, requestId: input.requestId,
      outputContractRef: clone(input.outputContractRef), requestBodyHash,
      kind: step.kind }));
    if (step.kind === "definitely_not_sent" || step.kind === "ambiguous_send") {
      const error = new Error(step.kind);
      error.code = step.code || (step.kind === "definitely_not_sent"
        ? "SYNTHETIC_PRE_EGRESS" : "SYNTHETIC_SOCKET_RESET");
      const body = {
        schemaVersion:
          `${STARCRAFT_TMG_IN_MEMORY_STRUCTURED_FAULT_ADAPTER_VERSION}.failure`,
        code: error.code,
        requestDefinitelyNotSent: step.kind === "definitely_not_sent",
        requestMayHaveBeenSent: step.kind === "ambiguous_send",
        status: null,
        physicalAttempts: step.kind === "ambiguous_send" ? 1 : 0,
        automaticRetries: 0,
        trainingTruth: false,
      };
      error.safeReceipt = freeze({ ...body,
        receiptHash: hashStarcraftTmgContract(body) });
      throw error;
    }
    const status = Number.isInteger(step.status) ? step.status : 200;
    const payload = responsePayload(step.kind, step, input.body);
    const receiptBody = {
      schemaVersion:
        `${STARCRAFT_TMG_IN_MEMORY_STRUCTURED_FAULT_ADAPTER_VERSION}.transport`,
      requestId: input.requestId,
      outputContractRef: clone(input.outputContractRef),
      requestedModel: input.body.model,
      requestBodyHash,
      schemaHash: hashStarcraftTmgContract(input.body.text.format.schema),
      payloadHash: hashStarcraftTmgContract(payload),
      status,
      physicalAttempts: 1,
      automaticRetries: 0,
      trainingTruth: false,
    };
    return freeze({ delivery: "response_received", status, payload,
      physicalAttempts: 1, transportReceipt: { ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody) } });
  }
  function inspect() {
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_IN_MEMORY_STRUCTURED_FAULT_ADAPTER_VERSION}.inspection`,
      calls: clone(calls),
      remainingSteps: queue.length,
      networkUsed: false,
      credentialUsed: false,
      trainingTruth: false,
    });
  }
  return Object.freeze({ send, inspect });
}
