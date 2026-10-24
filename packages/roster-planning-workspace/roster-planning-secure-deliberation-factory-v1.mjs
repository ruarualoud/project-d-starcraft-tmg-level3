// Ticket 27 / Slice 271 — product-owned secure roster deliberation adapter.
// Keychain bytes enter only this server process, move into the isolated
// structured Worker, and are zeroed in the parent. Attaching does not send
// a Provider request; only an explicit workspace Generate/Revise does.

import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 } from
  "../../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../secure-provider-runtime/provider-profile-registry-v2.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../secure-provider-runtime/structured-provider-worker-port-v1.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../secure-provider-runtime/provider-response-outcome-v1.mjs";
import { reconcileStarcraftTmgProviderDispatchV1, isExplicitlyRecoverableProviderDispatchV1 } from
  "../secure-provider-runtime/provider-dispatch-recovery-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1,
  assertStarcraftTmgProviderJsonSchemaSubsetV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { ROSTER_STRATEGIST_PROMPT_PACK_V1 } from
  "../roster-strategist/roster-strategist-runtime-v1.mjs";
import { encodeRosterProviderInputV1 } from '../roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import { rosterDecisionRoleInstructionsV1 } from '../roster-strategist/roster-decision-role-instructions-v1.mjs';

export const ROSTER_PLANNING_SECURE_DELIBERATION_MODULE =
  "packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
const CALL_WARNING_THRESHOLD = 12;
const AUTH_STOP = new Set([401, 402, 403]);
const FORBIDDEN_PUBLIC_KEYS = new Set([
  "hidden", "chainofthought", "cot", "scratchpad", "reasoning",
  "reasoningtrace", "internalmonologue", "thinking", "internalnotes",
]);
const INSTRUCTION_PARTS = [
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
  "Keep the supplied candidate unchanged during a single evidence-bound "
    + "Teach/review/text-revision round. This temporary restriction is not "
    + "a reason to prefer it over alternatives. A genuinely user-locked "
    + "preset stays fixed; an Agent-selected candidate can reopen its army "
    + "and arrival schedule in the subsequent selecting-Agent feedback step. "
    + "Compare real strategic trade-offs even while the review snapshot is fixed.",
];
const INSTRUCTIONS = INSTRUCTION_PARTS.join('\n');
const SELECTION_INSTRUCTIONS = [...INSTRUCTION_PARTS.slice(0, -1),
  'This is the selecting phase. Develop the army and Plan together. A Builder-legal '
    + 'partial candidate is editable, not a frozen review snapshot. The supplied '
    + 'queryCapabilities describe the currently installed tools and prerequisites. '
    + 'Use them to investigate or revise the working hypothesis; only final '
    + 'publication requires the exact budget and accepted evidence. Never mutate a live room.'
].join('\n');

export function projectRosterProviderInstructionsV1({request,runKind,phaseAuthority,
  version='role_scoped_v3'}) {
  if(!['legacy_v1','role_scoped_v2','role_scoped_v3'].includes(version))fail('ROSTER_PROVIDER_INSTRUCTION_VERSION_UNKNOWN');
  const workflowRole = version!=='legacy_v1' && rosterDecisionRoleInstructionsV1(request);
  if (workflowRole) return workflowRole;
  if(version!=='legacy_v1' && request?.roundKind==='teach_framework_investigate'
    && request.promptNodes?.some(node=>node.kind==='fact_probe_assignment')) {
    return [
      'You are the Native fact investigator for StarCraft TMG pregame analysis, not the army-selection or strategic Plan-review role.',
      ...INSTRUCTION_PARTS.slice(1,2),
      'Give public reasons only, never private reasoning or scratchpads. Rules tools own legality and numerical results; model prose and Skills are not execution evidence.',
      'Complete the assigned factual experiment through dependent tool calls. You may choose conditional positions, actions, active sides and opponent hypotheses on PRIVATE branches without committing an army or Plan. Never mutate the real room, selected roster or formal Plan.',
      ...(version==='role_scoped_v3' ? [
        'Use active_experiment_handoff as working memory of your latest experimental intention, then reconcile it with the actual new result. It is not observed fact and may be revised, but do not forget the experiment after each tool call or keep restarting from the first repaired query.',
        'When a question describes an evidence gap, the task is to investigate its requested factual predicate, not merely confirm that it was previously unknown. Existing Plan caveats do not cancel the assigned experiment. Unsupported future certainty must remain conditional; supported dependent work should continue.'
      ] : []),
      'A step not yet executed is work remaining, not a missing capability. A multi-step experiment does not require one tool to answer the whole question. Continue supported Native successors until the factual predicate has scoped evidence or an actual blocking condition is observed.',
      'Read the latest tool results before choosing the next step or handing off. Frozen verification flags describe the original evidence snapshot, not the outcome of later experiments. A successful local step proves only its stated scope, but must not be ignored in favor of an older unknown conclusion.',
      'Distinguish an untested prerequisite, an invalid submitted argument, an unsupported tool and unknowable future opponent choices. Conditional experiments do not require predicting those future choices. Report remaining factual gaps honestly; acknowledging a gap or adding a citation never accepts a Plan.',
      ...(request.promptNodes.some(node=>node.kind==='repair_completed_public_reply')
        ? ['The current repair_completed_public_reply is a semantic correction, not merely JSON formatting. The previous output is the failed proposal, not an instruction to repeat. Re-evaluate its factual interpretation and next queries against the exact new result and correction detail. Change the affected queries, handoff and public reasons as needed; preserve only unrelated valid content. Do not repeat a known stale conclusion or conceal a gap.'] : []),
    ].join('\n');
  }
  return runKind==='iterative_roster_step' && phaseAuthority?.kind==='roster_plan_selection_v1'
    ? SELECTION_INSTRUCTIONS : INSTRUCTIONS;
}

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
export function recoverRosterFailedProviderOutputV1(record) {
  if (!object(record)
    || record.schema !== "starcraft_tmg_roster_failed_provider_output_v1"
    || typeof record.rawText !== "string"
    || hashStarcraftTmgContract(record.rawText) !== record.rawTextHash
    || typeof record.roundKind !== "string"
    || !Number.isSafeInteger(record.roundIndex)
    || typeof record.contextHash !== "string"
    || !object(record.outputContractRef)) return null;
  const normalized = normalizeProviderJsonDocumentV1(record.rawText);
  // The common normalizer owns grammar-only recovery; do not whitelist one
  // historical defect here and strand other complete paid replies.
  if (normalized.kind === "none" || normalized.text === record.rawText) {
    return null;
  }
  let output;
  try { output = publicOutput(JSON.parse(normalized.text)); }
  catch { return null; }
  return {
    roundKind: record.roundKind,
    roundIndex: record.roundIndex,
    contextHash: record.contextHash,
    outputHash: hashStarcraftTmgContract(output),
    outputContractRef: clone(record.outputContractRef),
    sanitizedOutput: clone(output),
    droppedForbiddenKeyPaths: [],
    transportSchemaIssues: [],
    recovery: { kind: normalized.kind, evidence: normalized.evidence,
      failedOutputHash: record.rawTextHash,
      paidProviderReplyReused: true },
  };
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
    || STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2;
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
  let workerTurn = Promise.resolve();
  function queuedPort(port) {
    return Object.freeze({ ...port,
      deliberate(request) {
        const turn = workerTurn.then(() => {
          if (closed) fail("ROSTER_WORKSPACE_SECURE_WORKER_CLOSED");
          // The physical Worker is single-flight. Keep independent jobs
          // asynchronous, but check each job's pause/cancel/cap inside its
          // actual turn, before send. A failed turn must release the next.
          return port.deliberate(request);
        });
        workerTurn = turn.then(() => undefined, () => undefined);
        return turn;
      },
    });
  }
  const factory = Object.freeze({
    availability: () => Object.freeze({
      available: !closed,
      reason: closed ? "ROSTER_WORKSPACE_SECURE_WORKER_CLOSED" : null,
      kind: "keychain_isolated_worker_structured_flash",
      modelVersion: profile.model,
      paidProvider: true,
    }),
    async reconcileDispatch(input = {}) {
      return reconcileStarcraftTmgProviderDispatchV1(input);
    },
    async createForRun({ sessionId, runKind, planHash = null, retryDispatch = null,
      control, onEvent, recoverNetworkDispatch = null, phaseAuthority = null } = {}) {
      if (closed || !String(sessionId || "").trim()) {
        fail("ROSTER_WORKSPACE_SECURE_WORKER_CLOSED");
      }
      let sentAttempts = 0;
      let retryConsumed = false;
      let callWarningEmitted = false;
      const warnCallCount = async (request) => {
        if (sentAttempts < CALL_WARNING_THRESHOLD || callWarningEmitted) return;
        callWarningEmitted = true;
        await onEvent?.({ type: 'run_call_warning', code: 'ROSTER_WORKSPACE_RUN_CALL_WARNING',
          sessionId, runKind, sentAttempts, threshold: CALL_WARNING_THRESHOLD,
          roundKind: request.roundKind, roundIndex: request.roundIndex,
          contextHash: request.contextHash, action: 'continue_distinct_work',
          perErrorConvergenceAndNetworkRecoveryUnchanged: true, at: new Date().toISOString() });
      };
      return queuedPort({
        descriptor: () => Object.freeze({
          kind: "keychain_isolated_worker_structured_flash",
          modelVersion: profile.model,
          promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
          paidProviderCalls: true,
          trainingTruth: false,
        }),
        async deliberate(request) {
          const format = clone(request?.responseFormat);
          if (format?.kind !== "provider_strict_json_schema"
            || !String(format.schemaName || "").trim()
            || !object(format.schema)
            || !object(format.outputContractRef)
            || !String(request?.roundKind || "").trim()) {
            fail("ROSTER_WORKSPACE_ROUND_CONTRACT_INVALID");
          }
          // This is our local contract, not model output. Validate before any
          // dispatch/charge; a bad schema must not discard an already-paid reply.
          // Keep a detached copy so it cannot change during the asynchronous send.
          try { assertStarcraftTmgProviderJsonSchemaSubsetV1(format.schema); }
          catch (error) {
            await onEvent?.({ type: 'round_failed', roundKind: request.roundKind,
              roundIndex: request.roundIndex, paidProviderCall: false,
              code: 'ROSTER_WORKSPACE_OUTPUT_CONTRACT_INVALID',
              localContractIssue: String(error.message).slice(0,500),
              at: new Date().toISOString() });
            fail('ROSTER_WORKSPACE_OUTPUT_CONTRACT_INVALID');
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
          if (control?.paused?.() === true) {
            await stopBeforeSend("ROSTER_WORKSPACE_PAUSED");
          }
          // Total task size is not a failed-attempt budget. Sharded reviews
          // may legitimately exceed twelve calls; their own correction and
          // reconciliation policies still bound retries of a failed item.
          await warnCallCount(request);
          sentAttempts += 1;
          // Common egress for initial Plan, Teach, revisions, review and
          // iterative selection. Semantic context/retained replies stay intact.
          // An explicit retry of an older dispatch must preserve its body.
          const encoding = encodeRosterProviderInputV1(request, retryDispatch
            ? retryDispatch.inputEncodingVersion || 'verbatim_v1'
            : request.providerInputEncodingVersion || 'same_request_evidence_v1');
          const providerInstructionsVersion = retryDispatch && !retryConsumed
            ? retryDispatch.providerInstructionsVersion || 'legacy_v1' : 'role_scoped_v3';
          const body = {
            model: binding.model,
            instructions: projectRosterProviderInstructionsV1({request,runKind,phaseAuthority,
              version:providerInstructionsVersion}),
            input: encoding.input,
            reasoning: { effort: "none" },
            temperature: binding.temperature, top_p: binding.topP,
            max_output_tokens: Math.min(Number(request.maxOutputUnits)
              || binding.maxOutputUnits, binding.maxOutputUnits),
            stream: false,
            text: { format: { type: "json_schema",
              name: format.schemaName, schema: clone(format.schema) } },
          };
          const started = Date.now();
          let dispatch = {
            schemaVersion: "starcraft_tmg_provider_dispatch_record_v1",
            requestId: `roster-${runKind || "run"}-${randomUUID()}`,
            sessionId, runKind: runKind || "run", planHash,
            roundKind: request.roundKind, roundIndex: request.roundIndex,
            contextHash: request.contextHash,
            requestBodyHash: hashStarcraftTmgContract(body),
            inputEncodingVersion: encoding.version,
            providerInstructionsVersion,
            inputCharactersBeforeEncoding: encoding.beforeCharacters,
            inputCharactersAfterEncoding: encoding.afterCharacters,
            outputContractRef: clone(format.outputContractRef),
            status: "reserved", costStatus: "not_sent",
          };
          // A Teach run may issue several distinct investigations/corrections
          // under the same kind/index. Consumption belongs to the authorized
          // request, not that entire phase. New evidence is a new dispatch;
          // the identical consumed request must still never be resent here.
          if (retryDispatch && retryConsumed
            && retryDispatch.roundKind === request.roundKind
            && retryDispatch.roundIndex === request.roundIndex
            && retryDispatch.contextHash === request.contextHash
            && retryDispatch.requestBodyHash === dispatch.requestBodyHash) {
            await stopBeforeSend("ROSTER_WORKSPACE_RETRY_AUTHORIZATION_CONSUMED");
          }
          if (retryDispatch && !retryConsumed) {
            const standingResume = retryDispatch.standingNetworkResumeConsent === true;
            const explicitSingleRetry = retryDispatch.explicitSingleRetry === true;
            if (retryDispatch.sessionId !== sessionId
              || retryDispatch.planHash !== planHash
              || (!explicitSingleRetry && !standingResume && (retryDispatch.status !== "ambiguous" || retryDispatch.retryOfRequestId))
              || (!explicitSingleRetry && standingResume && !["sending", "ambiguous"].includes(retryDispatch.status))
              || (explicitSingleRetry && !isExplicitlyRecoverableProviderDispatchV1(retryDispatch))
              || retryDispatch.roundKind !== request.roundKind
              || retryDispatch.roundIndex !== request.roundIndex
              || retryDispatch.contextHash !== request.contextHash
              || retryDispatch.requestBodyHash !== dispatch.requestBodyHash
              || !retryDispatch.retryAuthorizationId) {
              await stopBeforeSend("ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED");
            }
            dispatch.retryOfRequestId = retryDispatch.requestId;
            dispatch.retryAuthorizationId = retryDispatch.retryAuthorizationId;
            retryConsumed = true;
          }
          const recordDispatch = async (status, details = {}) => {
            Object.assign(dispatch, details, { status });
            await onEvent?.({ type: "provider_dispatch", dispatch: clone(dispatch),
              at: new Date().toISOString() });
          };
          // The caller must persist these events before egress. Failure at
          // either barrier returns without calling the physical Worker.
          await recordDispatch("reserved");
          await recordDispatch("sending", { costStatus: "unknown" });
          let result;
          for (let networkRecoveryAttempt = 0; ; networkRecoveryAttempt++) {
          try {
            result = await worker.send({ workerRef,
              requestId: dispatch.requestId,
              endpoint: clone(binding.endpoint), body,
              outputContractRef: clone(format.outputContractRef) });
            break;
          } catch (error) {
            const safeReceipt = error?.safeReceipt;
            const status = Number(safeReceipt?.status);
            const code = AUTH_STOP.has(status)
              ? "ROSTER_WORKSPACE_PROVIDER_AUTH_STOP"
              : safeReceipt?.requestDefinitelyNotSent === true
                ? "ROSTER_WORKSPACE_PROVIDER_SEND_FAILED"
                : "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP";
            const notSent = safeReceipt?.requestDefinitelyNotSent === true;
            const cause = String(safeReceipt?.code || error?.code || "");
            const transportFailure = {
              // Retain controlled transport codes, not arbitrary error text,
              // request bodies, headers, credentials or private model output.
              code: /^[A-Z][A-Z0-9_]{0,159}$/u.test(cause)
                ? cause : "UNCLASSIFIED_PROVIDER_WORKER_FAILURE",
              receiptHash: safeReceipt?.receiptHash || null,
              status: safeReceipt?.status ?? null,
              requestDefinitelyNotSent: notSent,
              requestMayHaveBeenSent: safeReceipt?.requestMayHaveBeenSent === true,
              physicalAttempts: safeReceipt?.physicalAttempts ?? null,
              transportProgress: clone(safeReceipt?.transportProgress || null),
              networkErrorCode: safeReceipt?.networkErrorCode || null,
              ...(safeReceipt?.dnsRecovery ? { dnsRecovery: clone(safeReceipt.dnsRecovery) } : {}),
            };
            await recordDispatch(notSent ? "definitely_not_sent" : "ambiguous", {
              costStatus: notSent ? "not_sent" : "unknown",
              providerReceiptHash: safeReceipt?.receiptHash || null,
              transportFailure,
            });
            // Resume this exact logical turn: no rebuilt scene, new prompt,
            // cleared history or false failed-Teach status during recovery.
            const recovery = networkRecoveryAttempt === 0 && !dispatch.retryOfRequestId
              && typeof recoverNetworkDispatch === 'function'
              ? await recoverNetworkDispatch(clone(dispatch)) : null;
            if (recovery) {
              if (recovery.requestId !== dispatch.requestId || recovery.contextHash !== dispatch.contextHash
                || recovery.requestBodyHash !== dispatch.requestBodyHash || recovery.planHash !== planHash
                || recovery.sessionId !== sessionId
                || (!notSent && !recovery.retryAuthorizationId)) {
                await stopBeforeSend('ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED');
              }
              if (control?.cancelled?.() === true) await stopBeforeSend('ROSTER_WORKSPACE_CANCELLED');
              if (control?.paused?.() === true) await stopBeforeSend('ROSTER_WORKSPACE_PAUSED');
              await warnCallCount(request);
              const old = dispatch;
              dispatch = { schemaVersion: old.schemaVersion,
                requestId: `roster-${runKind || 'run'}-${randomUUID()}`, sessionId, runKind: old.runKind, planHash,
                roundKind: old.roundKind, roundIndex: old.roundIndex, contextHash: old.contextHash,
                requestBodyHash: old.requestBodyHash, outputContractRef: clone(old.outputContractRef),
                inputEncodingVersion: old.inputEncodingVersion,
                inputCharactersBeforeEncoding: old.inputCharactersBeforeEncoding,
                inputCharactersAfterEncoding: old.inputCharactersAfterEncoding,
                status: 'reserved', costStatus: 'not_sent',
                ...(notSent ? { retryOfNotSentRequestId: old.requestId } : {
                  retryOfRequestId: old.requestId, retryAuthorizationId: recovery.retryAuthorizationId }),
                networkRecoveryVersion: 1 };
              await recordDispatch('reserved');
              await recordDispatch('sending', { costStatus: 'unknown' });
              sentAttempts++;
              continue;
            }
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              paidProviderCall: notSent ? false : null, code,
              dispatchRequestId: dispatch.requestId,
              providerTransport: clone(transportFailure),
              at: new Date().toISOString() });
            fail(code, transportFailure.code);
          }
          }
          const payload = result.payload;
          const usage = usageFrom(payload);
          await recordDispatch("response_received", {
            costStatus: usage ? "known" : "unknown",
            usage: clone(usage),
            providerReceiptHash: result.transportReceipt?.receiptHash || null,
          });
          const latencyMs = Date.now() - started;
          const failure = async (code, failedOutputRecord = null,
            safeFailureDetail = null) => {
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              paidProviderCall: usage ? true : null, usage, latencyMs,
              dispatchRequestId: dispatch.requestId,
              receiptHash: result.transportReceipt?.receiptHash || null,
              ...(failedOutputRecord ? { failedOutputRecord } : {}),
              ...(safeFailureDetail || {}),
              code, at: new Date().toISOString() });
            if (code === "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE") {
              // Only the controlled, provider-reported reason may select a
              // capacity recovery. Unknown/auth/transport failures stay stops.
              throw Object.assign(new Error(code), { code,
                failedOutputRecord: clone(failedOutputRecord),
                providerIncompleteReason: safeFailureDetail?.providerIncompleteReason
                  || "unreported" });
            }
            if (code === 'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED') {
              throw Object.assign(new Error(code), { code,
                providerRejection: clone(safeFailureDetail?.providerRejection || null) });
            }
            fail(code);
          };
          if (AUTH_STOP.has(Number(result.status))) {
            await failure("ROSTER_WORKSPACE_PROVIDER_AUTH_STOP");
          }
          if (result.status >= 200 && result.status < 300
            && payload?.status === "incomplete") {
            const reason = payload?.incomplete_details?.reason;
            const providerIncompleteReason = reason === "max_output_tokens"
              ? reason : reason ? "other" : "unreported";
            // Keep public text segments even when a message itself is marked
            // incomplete. This separate diagnostic schema cannot enter the
            // completed-response recovery path, even if its JSON looks valid.
            const rawTextSegments = (Array.isArray(payload.output)
              ? payload.output : []).filter(entry => entry?.type === "message"
                && entry.role === "assistant")
              .flatMap(entry => Array.isArray(entry.content) ? entry.content : [])
              .filter(entry => entry?.type === "output_text"
                && typeof entry.text === "string")
              .map(entry => entry.text);
            const rawText = rawTextSegments.join("");
            await failure("ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE",
              { schema: "starcraft_tmg_roster_incomplete_provider_output_v1",
                roundKind: request.roundKind,
                roundIndex: request.roundIndex,
                contextHash: request.contextHash,
                outputContractRef: clone(format.outputContractRef),
                providerStatus: "incomplete", providerIncompleteReason,
                rawText, rawTextSegments,
                rawTextHash: hashStarcraftTmgContract(rawText),
                transportReceiptHash:
                  result.transportReceipt?.receiptHash || null,
                eligibleForCompletedReplyRecovery: false },
              { providerIncompleteReason });
          }
          if (result.status < 200 || result.status >= 300
            || payload?.status !== "completed") {
            const safeCode = value => /^[a-zA-Z0-9_.-]{1,160}$/u.test(String(value || ""))
              ? String(value) : null;
            const rejection = { httpStatus: Number(result.status),
              providerStatus: safeCode(payload?.status),
              providerErrorCode: safeCode(payload?.error?.code),
              providerErrorType: safeCode(payload?.error?.type),
              contextLengthExceeded: /context.{0,24}(length|limit)|maximum.{0,24}token|too.{0,8}many.{0,8}token/iu
                .test(String(payload?.error?.message || "")) };
            await recordDispatch("response_rejected", { rejection });
            await failure("ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED", null,
              { providerRejection: rejection });
          }
          if (!usage) await failure("ROSTER_WORKSPACE_PROVIDER_USAGE_UNKNOWN");
          const rawText = outputText(payload);
          if (!rawText) await failure("ROSTER_WORKSPACE_OUTPUT_MISSING");
          const normalized = normalizeProviderJsonDocumentV1(rawText);
          let decoded;
          try { decoded = JSON.parse(normalized.text); }
          catch {
            // A completed, billed response must remain inspectable even if
            // grammar-only recovery cannot parse it. This private draft
            // record is never projected to the browser or treated as a valid
            // planning answer; no field is invented and no request retried.
            await failure("ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE", {
              schema: "starcraft_tmg_roster_failed_provider_output_v1",
              roundKind: request.roundKind,
              roundIndex: request.roundIndex,
              contextHash: request.contextHash,
              outputContractRef: clone(format.outputContractRef),
              rawText,
              normalizedText: normalized.text,
              normalizationKind: normalized.kind,
              rawTextHash: hashStarcraftTmgContract(rawText),
              normalizedTextHash: hashStarcraftTmgContract(normalized.text),
              transportReceiptHash:
                result.transportReceipt?.receiptHash || null,
            });
          }
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
            sessionId: request.sessionId,
            roundIndex: request.roundIndex,
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
            dispatchRequestId: dispatch.requestId,
            sanitizedOutputRecord: { roundKind: request.roundKind,
              roundIndex: request.roundIndex,
              contextHash: request.contextHash, outputHash,
              dispatchRequestId: dispatch.requestId,
              outputContractRef: clone(format.outputContractRef),
              sanitizedOutput: clone(output),
              droppedForbiddenKeyPaths: [],
              transportSchemaIssues },
            at: new Date().toISOString() });
          await recordDispatch("completed", { outputHash });
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
