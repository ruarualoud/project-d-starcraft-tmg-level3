import { classifyCompanionProviderOutputV1, resolveCompanionProviderOutputBudgetV1 } from '../companion-backend-module-v1/provider-output-budget-v1.mjs';
const clone = value => structuredClone(value);
function ensure(condition, code, detail) { if (!condition) throw Object.assign(new Error(code), {code, detail}); }
const LIVE_ALLOWED_CHANNELS = Object.freeze(['companion_reply']);
const LIVE_OUTPUT_BUDGET = resolveCompanionProviderOutputBudgetV1({allowedChannels:[...LIVE_ALLOWED_CHANNELS]});
const STORY_OUTPUT_BUDGET = resolveCompanionProviderOutputBudgetV1({allowedChannels:[...LIVE_ALLOWED_CHANNELS],textFloorUnits:1024,ceilingUnits:1536});
const isLoreStory = request => ['lore_story','lore_relationship'].includes(request.metadata?.responseMode)
  && request.metadata?.loreLibraryRef?.id === 'starcraft-tmg.kerrigan-lore';
const isStandardRoleplay=request=>request.metadata?.responseMode==='standard_roleplay'
  && ['chara_card_v2','chara_card_v3'].includes(request.metadata?.standardCardRef?.spec);
export const LIVE_ADAPTER_ID = "secure-worker-live-byok-v1";
export const LIVE_ADAPTER_NETWORK = "isolated_worker_https_egress";

export function liveProviderRequestFromCompanion(request, maxPromptBytes=1024*1024) {
  const story = isLoreStory(request);
  const reference = request.metadata?.responseMode === 'lore_reference'
    && request.metadata?.loreLibraryRef?.id === 'starcraft-tmg.kerrigan-lore';
  const promptNodes = request.messages.map((message, index) => ({
    nodeType: `companion_${message.role}`,
    authority: message.role === "system" ? "platform" : "participant",
    sequence: index,
    content: message.content,
  }));
  const userMessage = "以上是按序排列的同伴角色设定与会话上下文（promptNodes）。"
    + (isStandardRoleplay(request) ? "请按已经排好的角色卡定义、世界信息、示例与聊天历史，继续该角色的对话，回应最后一条消息。保持卡片指定的身份、语气与场景。"
      : reference ? "用户本次明确询问出处或官方设定，请用简短中文查证，区分故事事实与作者评论，不把作者视角说成角色亲历。"
      : story ? "请保持该角色的第一人称身份，用自然中文讲述所给记忆中的经历或关系，按内容写一到三小段。不要变成资料摘要，不主动罗列未被问到的细节空白，也不转成战术口号。"
      : "请以该同伴的身份，只用一到两句简短中文回复指挥官的最后一句话，")
    + "仅依据其中的公开信息，不要编造规则事实。"
    + "输出严格 JSON：{\"channels\":{\"companion_reply\":{\"text\":\"<回复文本>\"}}}";
  const body = {
    schemaVersion: "starcraft_tmg_direct_provider_request_v1",
    requestId: String(request.requestId),
    intent: "chat",
    promptPack: "companion_group_chat_live_v1",
    promptNodes,
    userMessage,
    responseContract: {
      allowedChannels: [...LIVE_ALLOWED_CHANNELS],
      decisionCandidateSource: "forbidden",
    },
    maxOutputUnits: (story||isStandardRoleplay(request) ? STORY_OUTPUT_BUDGET : LIVE_OUTPUT_BUDGET).maxOutputUnits,
  };
  const byteLength = Buffer.byteLength(JSON.stringify(body), "utf8");
  ensure(byteLength <= maxPromptBytes,
    "LIVE_PROVIDER_REQUEST_TOO_LARGE", { byteLength });
  return Object.freeze(body);
}

export function createLiveCompanionProviderAdapter(options = {}) {
  const {
    workerPort,
    getAttachedWorkerRef,
    claimDispatch,
    containsCredentialMaterial,
    priceUsage,
    // Epoch 1/2 keep the default one-call denominator; the epoch-3
    // continuity acceptance passes 4 (two companions x two user turns).
    // Every dispatch is separately locked via claimDispatch(dispatchIndex).
    maxDispatches = 1,
    maxPromptBytes = 1024 * 1024,
  } = options;
  const observation = {
    dispatchAttempts: 0,
    physicalProviderCalls: 0,
    maxDispatches,
    success: null,
    failure: null,
    completions: [],
    promptBytes: null,
  };
  let calls = 0;
  let claimedDispatches = 0;
  const usage = { promptTokens: 0, completionTokens: 0, reportedCostUnits: 0 };

  function rejection(reason, message) {
    return Object.freeze({
      ok: false,
      reason,
      message,
      failClosed: true,
      networkAttempts: 0,
    });
  }

  async function complete(request) {
    calls += 1;
    observation.success = null;
    observation.failure = null;
    observation.promptBytes = null;
    const workerRef = getAttachedWorkerRef();
    if (!workerRef) {
      // Missing secure attachment: stop immediately, never dispatch.
      observation.failure = { code: "PROVIDER_WORKER_NOT_ATTACHED" };
      return rejection("PROVIDER_WORKER_NOT_ATTACHED",
        "no secure Worker attachment is active; the run stops without dispatch");
    }
    observation.dispatchAttempts += 1;
    if (claimedDispatches >= maxDispatches) {
      observation.failure = { code: "LIVE_CALL_DENOMINATOR_EXCEEDED" };
      return rejection("LIVE_CALL_DENOMINATOR_EXCEEDED",
        `the ${maxDispatches}-call authorization was already consumed; no retry is ever attempted`);
    }
    let providerRequest;
    try {
      providerRequest = liveProviderRequestFromCompanion(request, maxPromptBytes);
      observation.promptBytes = Buffer.byteLength(JSON.stringify(providerRequest),'utf8');
      if (containsCredentialMaterial(providerRequest)) {
        observation.failure = { code: "LIVE_PROVIDER_REQUEST_SENSITIVE_MATERIAL" };
        return rejection("LIVE_PROVIDER_REQUEST_SENSITIVE_MATERIAL",
          "the assembled Provider request carries credential-shaped material; not dispatched");
      }
    } catch (error) {
      observation.failure = { code: String(error?.code || "LIVE_PROVIDER_REQUEST_INVALID") };
      return rejection(String(error?.code || "LIVE_PROVIDER_REQUEST_INVALID"),
        "the Provider request failed local validation before dispatch");
    }
    // The dispatch lock is claimed only after every local pre-check passed,
    // immediately before the single physical egress attempt. The dispatch
    // index is passed so multi-call epochs lock each call separately.
    try {
      await claimDispatch(claimedDispatches + 1);
    } catch (error) {
      if(error?.code==='PRODUCT_COMPANION_TRIAL_LIMIT_REACHED') {
        observation.failure = { code: error.code };
        return rejection(error.code, "the authorized trial requests have been consumed; no network request was made");
      }
      observation.failure = { code: "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED" };
      return rejection("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
        "a previous run already claimed the one-call dispatch lock; rerun needs new user authorization");
    }
    claimedDispatches += 1;
    let value;
    try {
      value = await workerPort.complete({ workerRef, providerRequest });
    } catch (error) {
      const safe = error?.safeReceipt || null;
      observation.failure = {
        code: String(error?.code || "PROVIDER_TRANSPORT_FAILED"),
        status: safe?.status ?? null,
        physicalAttempts: safe?.physicalAttempts ?? null,
        requestDefinitelyNotSent: safe?.requestDefinitelyNotSent ?? null,
        requestMayHaveBeenSent: safe?.requestMayHaveBeenSent ?? null,
      };
      return rejection(String(error?.code || "PROVIDER_TRANSPORT_FAILED"),
        "isolated Worker egress rejected the turn; zero automatic retry");
    }
    const receipt = value?.usageReceipt || null;
    const output = value?.output || null;
    // Versioned output classification (companion_output_budget_v2): the
    // egress transport's generic providerTurn protocol is classified into a
    // typed outcome. A budget-truncated envelope whose channel text string is
    // fully terminated is recovered structurally (never fabricated); a
    // mid-string cut is a typed truncation failure with budget diagnostics.
    const classification = classifyCompanionProviderOutputV1(output, {
      allowedChannels: [...LIVE_ALLOWED_CHANNELS],
      budgetUnits: providerRequest.maxOutputUnits,
    });
    if (classification.kind === "output_budget_truncated") {
      // The physical call happened but the output budget cut the sealed
      // channel JSON before the channel text could complete: record the
      // typed truncation with its diagnostics and stop; never retry.
      observation.physicalProviderCalls += receipt?.physicalAttempts ?? 1;
      observation.failure = {
        code: "LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED",
        classification: clone(classification),
        budget: clone(isLoreStory(request)||isStandardRoleplay(request) ? STORY_OUTPUT_BUDGET : LIVE_OUTPUT_BUDGET),
        receipt: clone(receipt),
      };
      return rejection("LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED",
        "the Provider reply was cut by the output budget before the sealed channel JSON completed; typed truncation recorded, zero retry");
    }
    if (classification.kind !== "channel_text") {
      // The physical call happened but the reply is not the contracted
      // channel JSON: record honestly and stop; never retry.
      observation.physicalProviderCalls += receipt?.physicalAttempts ?? 1;
      observation.failure = {
        code: "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
        classification: clone(classification),
        receipt: clone(receipt),
      };
      return rejection("LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
        "the Provider reply did not match the sealed channel contract; recorded, not retried");
    }
    observation.physicalProviderCalls += receipt.physicalAttempts;
    const priced = priceUsage(receipt);
    const pricing = priced?.pricing || null;
    const replyText = classification.text;
    const completion = {
      dispatchIndex: claimedDispatches,
      receipt: clone(receipt),
      pricing: clone(pricing),
      pricingAuthoritative: priced?.authoritative === true,
      replyText,
      recoveredFromTruncatedEnvelope:
        classification.recoveredFromTruncatedEnvelope === true,
      classification: clone(classification),
    };
    observation.completions.push(completion);
    observation.success = completion;
    const reportedCostUnits = pricing ? pricing.calculatedCostNanoUsd : 0;
    usage.promptTokens += receipt.usage.inputUnits;
    usage.completionTokens += receipt.usage.outputUnits;
    usage.reportedCostUnits += reportedCostUnits;
    return Object.freeze({
      ok: true,
      response: {
        content: replyText,
        rationale: "",
        uncertainty: "unknown",
        usage: {
          promptTokens: receipt.usage.inputUnits,
          completionTokens: receipt.usage.outputUnits,
          reportedCostUnits,
        },
      },
      receipt: {
        networkAttempts: 1,
        paidInference: "performed",
        reportedCostUnits,
        costUnit: "nano_usd_calculated_not_invoice",
        providerReceiptHash: receipt.receiptHash,
        recoveredFromTruncatedEnvelope:
          classification.recoveredFromTruncatedEnvelope === true,
      },
    });
  }

  function stats() {
    return Object.freeze({ adapterId: LIVE_ADAPTER_ID, calls, ...clone(usage) });
  }

  return Object.freeze({
    portId: "companion_provider_port_v1",
    adapterId: LIVE_ADAPTER_ID,
    implementsRealProvider: true,
    network: LIVE_ADAPTER_NETWORK,
    complete,
    stats,
    observation,
  });
}

