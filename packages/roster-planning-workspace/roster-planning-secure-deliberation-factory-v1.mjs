// Ticket 27 / Slice 271 — product-owned secure roster deliberation adapter.
// Keychain bytes enter only this server process, move into the isolated
// structured Worker, and are zeroed in the parent. Attaching does not send
// a Provider request; only an explicit workspace Generate/Revise does.

import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V1 } from
  "../../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../secure-provider-runtime/provider-profile-registry-v2.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../secure-provider-runtime/structured-provider-worker-port-v1.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../secure-provider-runtime/provider-response-outcome-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { ROSTER_STRATEGIST_PROMPT_PACK_V1 } from
  "../roster-strategist/roster-strategist-runtime-v1.mjs";

export const ROSTER_PLANNING_SECURE_DELIBERATION_MODULE =
  "packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
const MAX_CALLS_PER_RUN = 12;
const AUTH_STOP = new Set([401, 402, 403]);
const FORBIDDEN_PUBLIC_KEYS = new Set([
  "hidden", "chainofthought", "cot", "scratchpad", "reasoning",
  "reasoningtrace", "internalmonologue", "thinking", "internalnotes",
]);
const INSTRUCTIONS = [
  "You are the StarCraft TMG Roster Strategist answering one bounded "
    + "pregame planning round.",
  "Return one public JSON object conforming exactly to the attached strict "
    + "schema. Include its required schemaVersion and roundKind values; "
    + "do not add fields from another round.",
  "Use the supplied Skills as advisory strategy. The Rules-owned Army "
    + "Builder is the sole legality authority. Never invent legal options.",
  "Do not emit hidden reasoning, scratchpads or private thinking. Give "
    + "public reasons and cite only supplied source/tool evidence.",
  "Unknown stays unknown. Unspent minerals are lost. Ground scoring and "
    + "deployment claims in the sealed mission and laboratory evidence.",
  "For a locked preset roster, keep every model, upgrade and card fixed; "
    + "deepen its strategy rather than selecting a new list.",
].join("\n");

function fail(code, detail = "") {
  throw Object.assign(new Error(detail ? `${code}:${detail}` : code), { code });
}
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function publicOutput(value) {
  if (Array.isArray(value)) return value.map(publicOutput);
  if (!object(value)) return value;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_PUBLIC_KEYS.has(key.toLowerCase().replace(/[-_]/gu, ""))) {
      fail("ROSTER_WORKSPACE_HIDDEN_OUTPUT_REJECTED");
    }
  }
  return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, publicOutput(child)]));
}
function usageFrom(payload) {
  const inputUnits = payload?.usage?.input_tokens;
  const outputUnits = payload?.usage?.output_tokens;
  const totalUnits = payload?.usage?.total_tokens;
  if (![inputUnits, outputUnits, totalUnits].every((value) => (
    Number.isSafeInteger(value) && value >= 0))
    || totalUnits !== inputUnits + outputUnits) return null;
  const usage = { inputUnits, outputUnits, totalUnits };
  const hit = payload.usage.input_tokens_details?.cached_tokens;
  if (Number.isSafeInteger(hit) && hit >= 0 && hit <= inputUnits) {
    usage.inputCacheHitUnits = hit;
    usage.inputCacheMissUnits = inputUnits - hit;
  }
  const reasoning = payload.usage.output_tokens_details?.reasoning_tokens;
  if (Number.isSafeInteger(reasoning) && reasoning >= 0
    && reasoning <= outputUnits) usage.reasoningOutputUnits = reasoning;
  return usage;
}
function outputText(payload) {
  const messages = Array.isArray(payload?.output)
    ? payload.output.filter((entry) => entry?.type === "message") : [];
  const message = messages.length === 1 ? messages[0] : null;
  if (message?.role !== "assistant" || message.status !== "completed"
    || !Array.isArray(message.content) || message.content.length !== 1
    || message.content[0]?.type !== "output_text"
    || typeof message.content[0].text !== "string") return null;
  return message.content[0].text;
}

export async function createRosterPlanningSecureDeliberationFactoryV1(
  options = {}) {
  const profile = options.profile
    || STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V1;
  const readCredential = options.readCredential
    || readStarcraftTmgDeepSeekCredentialFromKeychainV1;
  const createRegistry = options.createRegistry
    || createStarcraftTmgProviderProfileRegistryV2;
  const createWorker = options.createWorker
    || createStarcraftTmgStructuredProviderWorkerPortV1;
  const registry = createRegistry({
    entries: [{ providerProfile: profile, responsePath: "/responses" }],
    allowedProviders: [profile.provider],
  });
  const resolved = await registry.resolveEgressBinding({
    profileRef: { id: profile.providerProfileId,
      version: profile.version, hash: profile.integrity.hash },
  });
  if (resolved?.ok !== true || !object(resolved.egressBinding)) {
    fail("ROSTER_WORKSPACE_PROVIDER_PROFILE_UNAVAILABLE");
  }
  const binding = resolved.egressBinding;
  const worker = createWorker({ providerProfileRegistry: registry,
    handshakeTimeoutMs: 5_000 });
  let credential = null;
  let workerRef = null;
  try {
    const ingress = await readCredential();
    credential = ingress?.credentialBytes;
    if (!Buffer.isBuffer(credential)) {
      fail("ROSTER_WORKSPACE_CREDENTIAL_UNAVAILABLE");
    }
    const attached = await worker.attachCredential({
      attachmentId: `roster-workspace-${randomUUID()}`,
      providerProfile: profile, credentialBytes: credential,
    });
    if (attached?.ok !== true || !attached.workerRef) {
      fail("ROSTER_WORKSPACE_CREDENTIAL_ATTACHMENT_FAILED");
    }
    workerRef = attached.workerRef;
  } catch (error) {
    await worker.close().catch(() => {});
    throw error;
  } finally {
    if (Buffer.isBuffer(credential)) credential.fill(0);
  }

  let closed = false;
  const factory = Object.freeze({
    availability: () => Object.freeze({
      available: !closed,
      reason: closed ? "ROSTER_WORKSPACE_SECURE_WORKER_CLOSED" : null,
      kind: "keychain_isolated_worker_structured_flash",
      modelVersion: profile.model,
      paidProvider: true,
    }),
    async createForRun({ sessionId, runKind, control, onEvent } = {}) {
      if (closed || !String(sessionId || "").trim()) {
        fail("ROSTER_WORKSPACE_SECURE_WORKER_CLOSED");
      }
      let sentAttempts = 0;
      return Object.freeze({
        descriptor: () => Object.freeze({
          kind: "keychain_isolated_worker_structured_flash",
          modelVersion: profile.model,
          promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
          paidProviderCalls: true,
          trainingTruth: false,
        }),
        async deliberate(request) {
          const format = request?.responseFormat;
          if (format?.kind !== "provider_strict_json_schema"
            || !String(format.schemaName || "").trim()
            || !object(format.schema)
            || !object(format.outputContractRef)
            || !String(request?.roundKind || "").trim()) {
            fail("ROSTER_WORKSPACE_ROUND_CONTRACT_INVALID");
          }
          await onEvent?.({ type: "round_started",
            roundKind: request.roundKind, roundIndex: request.roundIndex,
            replayed: false, at: new Date().toISOString() });
          const stopBeforeSend = async (code) => {
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              paidProviderCall: false, code,
              at: new Date().toISOString() });
            fail(code);
          };
          if (control?.cancelled?.() === true) {
            await stopBeforeSend("ROSTER_WORKSPACE_CANCELLED");
          }
          if (sentAttempts >= MAX_CALLS_PER_RUN) {
            await stopBeforeSend("ROSTER_WORKSPACE_RUN_CALL_CAP_REACHED");
          }
          sentAttempts += 1;
          const body = {
            model: binding.model,
            instructions: INSTRUCTIONS,
            input: JSON.stringify({ promptPack: request.promptPack,
              promptNodes: request.promptNodes,
              userMessage: request.userMessage,
              responseContract: request.responseContract }),
            reasoning: { effort: "none" },
            temperature: binding.temperature, top_p: binding.topP,
            max_output_tokens: Math.min(Number(request.maxOutputUnits)
              || binding.maxOutputUnits, binding.maxOutputUnits),
            stream: false,
            text: { format: { type: "json_schema",
              name: format.schemaName, schema: clone(format.schema) } },
          };
          const started = Date.now();
          let result;
          try {
            result = await worker.send({ workerRef,
              requestId: `roster-${runKind || "run"}-${randomUUID()}`,
              endpoint: clone(binding.endpoint), body,
              outputContractRef: clone(format.outputContractRef) });
          } catch (error) {
            const safeReceipt = error?.safeReceipt;
            const status = Number(safeReceipt?.status);
            const code = AUTH_STOP.has(status)
              ? "ROSTER_WORKSPACE_PROVIDER_AUTH_STOP"
              : safeReceipt?.requestDefinitelyNotSent === true
                ? "ROSTER_WORKSPACE_PROVIDER_SEND_FAILED"
                : "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP";
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              paidProviderCall: false, code,
              at: new Date().toISOString() });
            fail(code);
          }
          const payload = result.payload;
          const usage = usageFrom(payload);
          const latencyMs = Date.now() - started;
          const failure = async (code) => {
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              paidProviderCall: Boolean(usage), usage, latencyMs,
              receiptHash: result.transportReceipt?.receiptHash || null,
              code, at: new Date().toISOString() });
            fail(code);
          };
          if (AUTH_STOP.has(Number(result.status))) {
            await failure("ROSTER_WORKSPACE_PROVIDER_AUTH_STOP");
          }
          if (result.status >= 200 && result.status < 300
            && payload?.status === "incomplete") {
            await failure("ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE");
          }
          if (result.status < 200 || result.status >= 300
            || payload?.status !== "completed") {
            await failure("ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED");
          }
          if (!usage) await failure("ROSTER_WORKSPACE_PROVIDER_USAGE_UNKNOWN");
          const rawText = outputText(payload);
          if (!rawText) await failure("ROSTER_WORKSPACE_OUTPUT_MISSING");
          const normalized = normalizeProviderJsonDocumentV1(rawText);
          let decoded;
          try { decoded = JSON.parse(normalized.text); }
          catch { await failure("ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE"); }
          if (!object(decoded)) {
            await failure("ROSTER_WORKSPACE_OUTPUT_OBJECT_REQUIRED");
          }
          let output;
          try { output = publicOutput(decoded); }
          catch { await failure("ROSTER_WORKSPACE_HIDDEN_OUTPUT_REJECTED"); }
          // Keep a syntactically complete, public Provider reply even if its
          // raw shape differs from the strict contract. The Strategist's
          // versioned alias/envelope normalizer runs next, followed by its
          // full schema and Rules audit. Rejecting here would preempt that
          // boundary and lose a paid reply before diagnosis or local replay.
          const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
            format.schema, output);
          const transportSchemaIssues = validation.issues.map((issue) => ({
            path: issue.path, code: issue.code,
          }));
          const outputHash = hashStarcraftTmgContract(output);
          const receiptBody = {
            providerKind: "keychain_isolated_worker_structured_flash",
            modelVersion: typeof payload.model === "string"
              ? payload.model : profile.model,
            promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
            roundKind: request.roundKind,
            contextHash: request.contextHash,
            outputHash,
            outputContractRef: clone(format.outputContractRef),
            providerSchemaValid: validation.ok,
            providerSchemaIssueCount: transportSchemaIssues.length,
            usage: clone(usage), latencyMs,
            providerReceiptHash: result.transportReceipt?.receiptHash || null,
            paidProviderCall: true,
            trainingTruth: false,
          };
          const receipt = Object.freeze({ ...receiptBody,
            receiptHash: hashStarcraftTmgContract(receiptBody) });
          await onEvent?.({ type: "round_completed",
            roundKind: request.roundKind, roundIndex: request.roundIndex,
            replayed: false, paidProviderCall: true,
            usage: clone(usage), latencyMs,
            receiptHash: receipt.receiptHash,
            sanitizedOutputRecord: { roundKind: request.roundKind,
              roundIndex: request.roundIndex, outputHash,
              sanitizedOutput: clone(output),
              droppedForbiddenKeyPaths: [],
              transportSchemaIssues },
            at: new Date().toISOString() });
          return Object.freeze({ output: clone(output), receipt });
        },
      });
    },
  });
  return Object.freeze({ factory,
    close: async () => {
      if (closed) return;
      closed = true;
      await worker.close();
    },
  });
}
