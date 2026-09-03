import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { validateStarcraftTmgDialogueVisualCueV1 } from
  "../character-agent/dynamic-dialogue-portrait-v1.mjs";
import { createStarcraftTmgOnlineRoleContextRuntimeV1 } from
  "./role-context-runtime-v1.mjs";

export const STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION =
  "starcraft_tmg_online_role_turn_runtime_v1";
export const STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION =
  "starcraft_tmg_online_role_output_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const OUTPUT_FIELDS = new Set([
  "schemaVersion",
  "channels",
  "visualCue",
  "evidenceRefIds",
]);
const TEXT_CHANNEL_FIELDS = new Set(["text"]);
const DECISION_FIELDS = new Set([
  "candidateId",
  "selectedReason",
  "scoreOrPositionValue",
  "risk",
  "memoryInfluence",
  "rejectedAlternatives",
]);
const MEMORY_INFLUENCE_FIELDS = new Set(["kind", "refIds"]);
const REJECTED_ALTERNATIVE_FIELDS = new Set(["candidateId", "reason"]);
const MODE_CHANNELS = Object.freeze({
  tutor: Object.freeze(["speech", "teaching"]),
  opponent: Object.freeze(["decision", "speech"]),
  commentator: Object.freeze(["speech"]),
  companion: Object.freeze(["speech", "teaching"]),
});
const MODE_REQUIRED_CHANNELS = Object.freeze({
  tutor: Object.freeze({ explain: ["teaching"], chat: [] }),
  opponent: Object.freeze({ take_turn: ["decision"], chat: ["speech"] }),
  commentator: Object.freeze({ commentate: ["speech"] }),
  companion: Object.freeze({ reflect: ["speech"], chat: ["speech"] }),
});

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > maximum) {
    throw new TypeError(`${field} exceeds ${maximum} characters`);
  }
  return normalized;
}

function boundedText(value, field, maximum = 8_000) {
  const normalized = requiredString(value, field, maximum);
  if (Buffer.byteLength(normalized, "utf8") > maximum * 4) {
    throw new TypeError(`${field} exceeds its byte budget`);
  }
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) {
    throw new TypeError(`${field} must be a sha256 hash`);
  }
  return normalized;
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbidden = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (forbidden.length) {
    throw Object.assign(new TypeError(`${label} contains forbidden fields`), {
      code: "provider_output_rejected",
      forbiddenFields: forbidden,
    });
  }
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function safeReason(value) {
  const normalized = String(value || "unknown").trim();
  return /^[A-Za-z0-9._:-]{1,120}$/u.test(normalized)
    ? normalized
    : "unknown";
}

function rejectionReceipt(input, reason, details = {}) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.output-receipt`,
    sessionId: input.session.sessionId,
    sessionBindingHash: input.session.binding.sessionBindingHash,
    connectionEpoch: input.session.connection.epoch,
    mode: input.session.binding.mode,
    intent: input.intent,
    providerOutputHash: input.providerOutputHash,
    status: "rejected",
    reason,
    unsafeOutputRetained: false,
    ...clone(details),
    modelConfirmCalls: 0,
    modelApplyCalls: 0,
    eligibleForTraining: false,
    reviewStatus: "rejected",
    occurredAt: input.occurredAt,
    trainingTruth: false,
  }, "receiptHash");
}

function roleRejection(input, reason, details = {}, harnessToolsCalled = []) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.rejection`,
    reason,
    receipt: rejectionReceipt(input, reason, details),
    harnessToolsCalled: [...harnessToolsCalled],
    trainingTruth: false,
  });
}

function evidenceCatalog(gathered) {
  const refs = [{
    evidenceId: "current_room_projection",
    kind: "room_projection",
    id: gathered.roomProjection.room.roomId,
    version: String(gathered.roomProjection.room.stateRevision),
    hash: hashStarcraftTmgContract(gathered.roomProjection),
    authority: "viewer_scoped_room_runtime",
  }];
  if (gathered.legalSpace) {
    refs.push({
      evidenceId: "current_legal_space",
      kind: "legal_space",
      id: gathered.legalSpace.roomId,
      version: String(gathered.legalSpace.stateRevision),
      hash: gathered.legalSpace.legalSpaceHash,
      authority: "external_rules_service",
    });
  }
  for (const skill of gathered.ruleSkills.skillRefs) {
    refs.push({
      evidenceId: `rule_skill:${skill.hash}`,
      kind: "rule_skill",
      id: skill.id,
      version: skill.version,
      hash: skill.hash,
      authority: "accepted_same_game_rule_skill",
    });
  }
  if (gathered.publicEvents) {
    refs.push({
      evidenceId: "current_public_events",
      kind: "public_events",
      id: gathered.publicEvents.roomId,
      version: "current",
      hash: gathered.publicEvents.eventsHash,
      authority: "public_room_journal",
    });
  }
  const ids = new Set();
  for (const ref of refs) {
    if (ids.has(ref.evidenceId)) throw new TypeError("duplicate evidence identity");
    ids.add(ref.evidenceId);
  }
  return deepFreeze(refs);
}

function requiredEvidenceKinds(mode, intent, catalog) {
  const kinds = ["room_projection"];
  if (catalog.some((entry) => entry.kind === "rule_skill")) kinds.push("rule_skill");
  if (mode === "opponent" && intent === "take_turn") kinds.push("legal_space");
  if (mode === "commentator") kinds.push("public_events");
  return kinds;
}

function strategyMemoryRefs(gathered) {
  return gathered.memorySnapshot.entries
    .filter((entry) => entry.namespace === "strategy_memory"
      && entry.mayInfluenceDecision === true)
    .map((entry) => ({
      refId: entry.refId,
      version: entry.version,
      hash: entry.entryHash,
    }));
}

function allowedChannelsFor(mode, intent) {
  if (mode === "opponent" && intent !== "take_turn") return ["speech"];
  return MODE_CHANNELS[mode];
}

function createResponseContract(input) {
  const mode = input.session.binding.mode;
  const catalog = evidenceCatalog(input.gathered);
  const requiredKinds = requiredEvidenceKinds(mode, input.intent, catalog);
  const strategyRefs = strategyMemoryRefs(input.gathered);
  const contract = seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.response-contract`,
    outputSchemaVersion: STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
    mode,
    intent: input.intent,
    allowedChannels: allowedChannelsFor(mode, input.intent),
    requiredChannels: MODE_REQUIRED_CHANNELS[mode][input.intent],
    topLevelFields: [...OUTPUT_FIELDS],
    evidenceRefs: catalog,
    requiredEvidenceKinds: requiredKinds,
    decisionCandidateSource: mode === "opponent" && input.intent === "take_turn"
      ? "current_enabled_legal_space_candidate_only"
      : "forbidden",
    strategyMemoryRefs: strategyRefs,
    strategyMemoryIsAdvisory: true,
    mayPreview: mode === "opponent" && input.intent === "take_turn",
    mayConfirm: false,
    mayApply: false,
    confirmationOwner: mode === "opponent" && input.intent === "take_turn"
      ? "human_outside_agent_runtime"
      : null,
    rulesAuthority: "external_rules_service",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "contractHash");
  return deepFreeze({
    contract,
    ref: {
      id: `starcraft-tmg.${mode}.${input.intent}.strict-online-response.v1`,
      version: "1.0.0",
      hash: contract.contractHash,
    },
  });
}

function normalizeEvidence(value, contract) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    throw new TypeError("evidenceRefIds must contain 1..32 entries");
  }
  const catalog = new Map(contract.evidenceRefs.map((entry) =>
    [entry.evidenceId, entry]));
  const seen = new Set();
  const refs = value.map((entry, index) => {
    const evidenceId = requiredString(entry, `evidenceRefIds[${index}]`, 160);
    if (seen.has(evidenceId)) throw new TypeError("evidenceRefIds must be unique");
    seen.add(evidenceId);
    const known = catalog.get(evidenceId);
    if (!known) throw new TypeError("Provider cited evidence outside the current context");
    return known;
  });
  for (const kind of contract.requiredEvidenceKinds) {
    if (!refs.some((entry) => entry.kind === kind)) {
      throw new TypeError(`Provider output is missing required ${kind} evidence`);
    }
  }
  return deepFreeze(refs.map(clone));
}

function normalizeTextChannel(value, channelName) {
  exactFields(value, TEXT_CHANNEL_FIELDS, `channels.${channelName}`);
  return deepFreeze({ text: boundedText(value.text, `channels.${channelName}.text`) });
}

function enabledCandidateMap(legalSpace) {
  const candidates = Array.isArray(legalSpace?.candidates)
    ? legalSpace.candidates.filter((entry) => entry?.isEnabled === true)
    : [];
  const result = new Map();
  for (const candidate of candidates) {
    const candidateId = requiredString(candidate.candidateId,
      "LegalSpace candidateId", 240);
    if (result.has(candidateId)) throw new TypeError("LegalSpace has duplicate candidate ids");
    result.set(candidateId, candidate);
  }
  return result;
}

function normalizeMemoryInfluence(value, gathered) {
  exactFields(value, MEMORY_INFLUENCE_FIELDS, "channels.decision.memoryInfluence");
  const kind = requiredString(value.kind,
    "channels.decision.memoryInfluence.kind", 60);
  if (!Array.isArray(value.refIds) || value.refIds.length > 16) {
    throw new TypeError("channels.decision.memoryInfluence.refIds is invalid");
  }
  const available = new Map(strategyMemoryRefs(gathered).map((entry) =>
    [entry.refId, entry]));
  const seen = new Set();
  const refs = value.refIds.map((entry, index) => {
    const refId = requiredString(entry,
      `channels.decision.memoryInfluence.refIds[${index}]`, 240);
    if (seen.has(refId)) throw new TypeError("strategy memory refs must be unique");
    seen.add(refId);
    const known = available.get(refId);
    if (!known) throw new TypeError("decision cited unavailable strategy memory");
    return known;
  });
  if (kind === "none") {
    if (refs.length) throw new TypeError("memoryInfluence none cannot cite memory");
  } else if (kind === "advisory_strategy_memory") {
    if (!refs.length) throw new TypeError("strategy memory influence requires a ref");
  } else {
    throw new TypeError("unsupported decision memory influence");
  }
  return deepFreeze({ kind, refs: refs.map(clone), rulesMayBeOverridden: false });
}

function normalizeDecision(value, input) {
  exactFields(value, DECISION_FIELDS, "channels.decision");
  if (input.session.binding.mode !== "opponent" || input.intent !== "take_turn") {
    throw new TypeError("decision output is forbidden for this role or intent");
  }
  const candidates = enabledCandidateMap(input.gathered.legalSpace);
  const candidateId = requiredString(value.candidateId,
    "channels.decision.candidateId", 240);
  const candidate = candidates.get(candidateId);
  if (!candidate) {
    throw new TypeError("decision candidate is not enabled in the current LegalSpace");
  }
  if (!Array.isArray(value.rejectedAlternatives)
    || value.rejectedAlternatives.length > 16) {
    throw new TypeError("channels.decision.rejectedAlternatives is invalid");
  }
  if (candidates.size > 1 && value.rejectedAlternatives.length === 0) {
    throw new TypeError("decision must compare at least one enabled alternative");
  }
  const rejectedIds = new Set();
  const rejectedAlternatives = value.rejectedAlternatives.map((entry, index) => {
    exactFields(entry, REJECTED_ALTERNATIVE_FIELDS,
      `channels.decision.rejectedAlternatives[${index}]`);
    const rejectedId = requiredString(entry.candidateId,
      `channels.decision.rejectedAlternatives[${index}].candidateId`, 240);
    if (rejectedId === candidateId || rejectedIds.has(rejectedId)
      || !candidates.has(rejectedId)) {
      throw new TypeError("rejected alternative is not a distinct enabled candidate");
    }
    rejectedIds.add(rejectedId);
    return {
      candidateId: rejectedId,
      candidateHash: hashStarcraftTmgContract(candidates.get(rejectedId)),
      reason: boundedText(entry.reason,
        `channels.decision.rejectedAlternatives[${index}].reason`, 2_000),
    };
  });
  return deepFreeze({
    candidateId,
    candidateHash: hashStarcraftTmgContract(candidate),
    selectedReason: boundedText(value.selectedReason,
      "channels.decision.selectedReason", 2_000),
    scoreOrPositionValue: boundedText(value.scoreOrPositionValue,
      "channels.decision.scoreOrPositionValue", 2_000),
    risk: boundedText(value.risk, "channels.decision.risk", 2_000),
    memoryInfluence: normalizeMemoryInfluence(value.memoryInfluence, input.gathered),
    rejectedAlternatives,
  });
}

function normalizeOutput(input) {
  exactFields(input.output, OUTPUT_FIELDS, "Provider output");
  if (input.output.schemaVersion !== STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION) {
    throw new TypeError("Provider output schemaVersion mismatch");
  }
  const mode = input.session.binding.mode;
  exactFields(input.output.channels,
    new Set(allowedChannelsFor(mode, input.intent)),
    "Provider output.channels");
  const channels = {};
  for (const [channelName, value] of Object.entries(input.output.channels)) {
    channels[channelName] = channelName === "decision"
      ? normalizeDecision(value, input)
      : normalizeTextChannel(value, channelName);
  }
  if (!Object.keys(channels).length) throw new TypeError("Provider output has no channel");
  for (const required of input.responseContract.requiredChannels) {
    if (!channels[required]) throw new TypeError(`Provider output requires ${required}`);
  }
  if (mode === "opponent" && input.intent !== "take_turn" && channels.decision) {
    throw new TypeError("Opponent chat cannot create a decision");
  }
  const evidenceRefs = normalizeEvidence(input.output.evidenceRefIds,
    input.responseContract);
  const visualCue = validateStarcraftTmgDialogueVisualCueV1(
    mode, input.output.visualCue);
  return deepFreeze({
    schemaVersion: STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
    channels,
    visualCue,
    evidenceRefs,
    rulesAuthority: "external_rules_service",
    modelMutationAuthority: false,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

function validatePreviewResult(result, input, decision) {
  const preview = result?.preview;
  const core = preview?.core;
  const sealValue = preview?.previewSeal;
  if (result?.ok !== true || !object(preview) || !object(core)
    || !object(sealValue)) {
    throw Object.assign(new TypeError("Preview port rejected the decision"), {
      code: result?.reason === "LEGAL_SPACE_STALE"
        ? "legal_space_stale"
        : "opponent_preview_rejected",
      roomReason: safeReason(result?.reason),
    });
  }
  const previewId = requiredString(preview.previewId, "preview.previewId", 240);
  const previewContentHash = hash(sealValue.contentHash,
    "preview.previewSeal.contentHash");
  const selectedCandidate = input.gathered.legalSpace.candidates.find((entry) =>
    entry.candidateId === decision.candidateId && entry.isEnabled === true);
  const expectedProposal = selectedCandidate?.proposal
    || { kind: "finite", actionKey: decision.candidateId };
  if (requiredString(preview.previewToken, "preview.previewToken", 1024)
      !== `${previewId}.${requiredString(sealValue.mac, "preview.previewSeal.mac", 900)}`
    || sealValue.schemaVersion !== "starcraft_tmg_referee_seal_v1"
    || sealValue.purpose !== "preview"
    || sealValue.hashAlgorithm !== "sha256"
    || sealValue.sealAlgorithm !== "hmac-sha256"
    || previewContentHash !== hashStarcraftTmgContract({ previewId, core })
    || core.roomId !== input.session.binding.roomId
    || core.matchBindingHash !== input.session.binding.roomBinding.matchBindingHash
    || core.expectedStateRevision !== input.gathered.legalSpace.stateRevision
    || core.preStateHash !== input.gathered.legalSpace.stateHash
    || core.legalSpaceHash !== input.gathered.legalSpace.legalSpaceHash
    || core.seatKey !== input.session.binding.seatKey
    || core.proposalHash !== hashStarcraftTmgContract(expectedProposal)
    || core.proposalHash !== hashStarcraftTmgContract(core.proposal)
    || core.confirmationPolicy?.requiresExplicitHuman !== true
    || result.confirmationRequired !== true) {
    throw Object.assign(new TypeError("Preview did not preserve the observed authority binding"), {
      code: "opponent_preview_binding_mismatch",
      roomReason: "preview_binding_mismatch",
    });
  }
  return seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.preview-projection`,
    previewId,
    previewToken: preview.previewToken,
    previewContentHash,
    roomId: core.roomId,
    matchBindingHash: core.matchBindingHash,
    expectedStateRevision: core.expectedStateRevision,
    preStateHash: core.preStateHash,
    legalSpaceHash: core.legalSpaceHash,
    candidateId: decision.candidateId,
    candidateHash: decision.candidateHash,
    proposal: clone(core.proposal),
    proposalHash: hash(core.proposalHash, "preview.core.proposalHash"),
    action: clone(core.action),
    result: clone(core.result),
    confirmationPolicy: clone(core.confirmationPolicy),
    confirmationRequired: true,
    confirmationOwner: "human_outside_agent_runtime",
    modelMayConfirm: false,
    modelMayApply: false,
    trainingTruth: false,
  }, "previewProjectionHash");
}

function createOutputPolicy(roomTools) {
  return Object.freeze({
    createResponseContract,
    async process(input) {
      let output;
      try {
        output = normalizeOutput(input);
      } catch (error) {
        return roleRejection(input, error?.code || "provider_output_rejected", {
          forbiddenFields: Array.isArray(error?.forbiddenFields)
            ? error.forbiddenFields
            : [],
        });
      }
      const outputHash = hashStarcraftTmgContract(output);
      const decision = output.channels.decision || null;
      let decisionReceipt = null;
      let preview = null;
      const harnessToolsCalled = [];
      if (decision) {
        decisionReceipt = seal({
          schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.decision-receipt`,
          sessionId: input.session.sessionId,
          sessionBindingHash: input.session.binding.sessionBindingHash,
          connectionEpoch: input.session.connection.epoch,
          roomId: input.session.binding.roomId,
          matchBindingHash: input.session.binding.roomBinding.matchBindingHash,
          mode: input.session.binding.mode,
          intent: input.intent,
          legalSpaceHash: input.gathered.legalSpace.legalSpaceHash,
          stateRevision: input.gathered.legalSpace.stateRevision,
          stateHash: input.gathered.legalSpace.stateHash,
          decision,
          rulesAuthority: "external_rules_service",
          memoryMayOverrideRules: false,
          confirmationRequired: true,
          confirmationOwner: "human_outside_agent_runtime",
          modelMayConfirm: false,
          modelMayApply: false,
          occurredAt: input.occurredAt,
          eligibleForTraining: false,
          reviewStatus: "raw",
          trainingTruth: false,
        }, "receiptHash");
        harnessToolsCalled.push("preview_action");
        let previewResult;
        try {
          previewResult = await roomTools.previewAction({
            gameId: "starcraft-tmg",
            roomId: input.session.binding.roomId,
            principalScopeHash: input.session.binding.principalScopeHash,
            seatKey: input.session.binding.seatKey,
            mode: input.session.binding.mode,
            sessionBindingHash: input.session.binding.sessionBindingHash,
            expectedConnectionEpoch: input.session.connection.epoch,
            roomBinding: input.session.binding.roomBinding,
            candidateId: decision.candidateId,
            expectedMatchBindingHash:
              input.session.binding.roomBinding.matchBindingHash,
            expectedLegalSpaceHash: input.gathered.legalSpace.legalSpaceHash,
            expectedStateRevision: input.gathered.legalSpace.stateRevision,
            expectedStateHash: input.gathered.legalSpace.stateHash,
            occurredAt: input.occurredAt,
          });
        } catch {
          return roleRejection(input, "opponent_preview_failed", {
            acceptedOutputHash: outputHash,
            decisionReceiptHash: decisionReceipt.receiptHash,
            roomReason: "preview_port_failed",
          }, harnessToolsCalled);
        }
        try {
          preview = validatePreviewResult(previewResult, input, decision);
        } catch (error) {
          return roleRejection(input,
            error?.code || "opponent_preview_rejected", {
              acceptedOutputHash: outputHash,
              decisionReceiptHash: decisionReceipt.receiptHash,
              roomReason: safeReason(error?.roomReason),
            }, harnessToolsCalled);
        }
      }
      const receipt = seal({
        schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.output-receipt`,
        sessionId: input.session.sessionId,
        sessionBindingHash: input.session.binding.sessionBindingHash,
        connectionEpoch: input.session.connection.epoch,
        mode: input.session.binding.mode,
        intent: input.intent,
        providerOutputHash: input.providerOutputHash,
        acceptedOutputHash: outputHash,
        evidenceRefs: output.evidenceRefs,
        decisionReceiptHash: decisionReceipt?.receiptHash || null,
        previewProjectionHash: preview?.previewProjectionHash || null,
        status: "accepted",
        unsafeOutputRetained: false,
        modelConfirmCalls: 0,
        modelApplyCalls: 0,
        eligibleForTraining: false,
        reviewStatus: "raw",
        occurredAt: input.occurredAt,
        trainingTruth: false,
      }, "receiptHash");
      return deepFreeze({
        ok: true,
        output,
        outputHash,
        decision,
        decisionReceipt,
        preview,
        confirmationRequired: Boolean(preview),
        receipt,
        harnessToolsCalled,
        trainingTruth: false,
      });
    },
  });
}

export function createStarcraftTmgOnlineRoleTurnRuntimeV1(options = {}) {
  if (typeof options.roomTools?.previewAction !== "function") {
    throw new TypeError("roomTools.previewAction is required");
  }
  const contextRuntime = createStarcraftTmgOnlineRoleContextRuntimeV1({
    ...options,
    roleOutputPolicy: createOutputPolicy(options.roomTools),
  });
  return Object.freeze({
    metadata() {
      return deepFreeze({
        ...contextRuntime.metadata(),
        schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_TURN_RUNTIME_VERSION}.metadata`,
        outputSchemaVersion: STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
        responsePolicy: "strict_role_and_intent_scoped_v1",
        decisionSource: "current_enabled_legal_space_candidate_only",
        previewBinding: "observed_legal_space_and_state_required",
        confirmationOwner: "human_outside_agent_runtime",
        modelConfirmCapability: false,
        modelApplyCapability: false,
      });
    },
    readContext: contextRuntime.readContext,
    sendTurn: contextRuntime.sendTurn,
  });
}
