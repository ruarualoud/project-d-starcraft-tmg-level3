#!/usr/bin/env node

import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";

const WIRE_VERSION = "starcraft_tmg_provider_egress_worker_child_v1";
const MODE = process.argv[2] || "success";
const ALLOWED_ENVIRONMENT_KEYS = new Set(["NODE_NO_WARNINGS"]);

for (const key of Object.keys(process.env)) {
  if (!ALLOWED_ENVIRONMENT_KEYS.has(key)) delete process.env[key];
}

let binding = null;
let credentialBytes = null;
let initialized = false;
let ordinal = 0;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function envelope(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}

function reply(message, callback = undefined) {
  process.send?.(message, callback);
}

function scrub() {
  credentialBytes?.fill(0);
  credentialBytes = null;
  binding = null;
  initialized = false;
}

function claim(evidenceId, claimId, statement) {
  return {
    claimId,
    claimType: "legality",
    statement,
    evidenceIds: [evidenceId],
    advisoryOnly: false,
  };
}

function roleOutput(prompt) {
  const role = prompt.roleRequest.role;
  const contract = prompt.roleOutputContract;
  const evidenceId = prompt.stagedInput.evidence[0].evidenceId;
  if (role === "planner") return {
    summary: "Plan the one current How-to-Play routing Skill.",
    questions: [{
      questionId: "question.how-to-play.workflow",
      prompt:
        "How does one total Skill route a live question to an exact RuleAtom and authoritative Rules decision?",
      evidenceIds: [evidenceId],
    }],
    learningObjectives: [
      "Route by phase and chapter before retrieving an exact current RuleAtom.",
      "Keep legality and state transitions in the Rules/Referee service.",
    ],
  };
  if (role === "tutor") return {
    summary: "Teach the complete index and authority boundary.",
    claims: [
      claim(evidenceId, "claim.index.binding",
        "One How-to-Play Skill routes 1,163 hash-bound RuleAtom references through 10 chapters: 1,049 executable current atoms and 114 display-only historical atoms."),
      claim(evidenceId, "claim.rules.authority",
        "The chapter index is retrieval evidence only; current Rules/Referee LegalSpace and state-transition authority decide legality and mutation."),
    ],
    lessonSteps: [{
      stepId: "lesson.how-to-play.contract",
      summary:
        "Select a chapter, retrieve and verify an exact atom, then ask Rules.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    }],
  };
  if (role === "student") return {
    summary: "Restate the total-Skill lookup and execution boundary.",
    claims: [],
    answers: [{
      questionId: "question.how-to-play.workflow",
      answerSummary:
        "Route the current phase or topic to a chapter, retrieve exact evidence, and let current LegalSpace decide legality.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    }],
    uncertainties: [],
  };
  if (role === "challenger") return {
    summary: "Probe misuse of summaries and historical display atoms.",
    probes: [{
      probeId: "probe.illegal.index-as-authority",
      kind: "illegal_boundary",
      targetClaimId: "claim.rules.authority",
      prompt:
        "May an index summary or display-only atom decide live legality without exact retrieval and current Rules verification?",
    }],
  };
  if (role === "reasoner") return {
    summary: "Defend exact retrieval and the confirmed action lifecycle.",
    claims: [
      claim(evidenceId, "claim.atom.retrieval",
        "Retrieve the full current RuleAtom by evidenceId and verify its content hash, locator hash, and current Rules receipt hash before use."),
      claim(evidenceId, "claim.action.lifecycle",
        "Request current LegalSpace, Preview the enabled proposal, obtain human confirmation, Apply it, and verify AcceptedReceipt plus Replay; fail closed on missing or drifted evidence."),
    ],
    resolutions: [{
      probeId: "probe.illegal.index-as-authority",
      disposition: "defended",
      decisionSummary:
        "An index routes retrieval but never supplies legality; display-only atoms cannot seed current claims.",
      claimIds: ["claim.atom.retrieval", "claim.action.lifecycle"],
    }],
  };
  if (role === "proposer") return {
    summary: "Plan one total How-to-Play candidate from passed claims.",
    revisionTargets: [],
    candidatePlan: clone(contract.fixedValues.candidatePlan),
  };
  if (role === "generator") return {
    summary: "Materialize the bounded unreviewed total rules-routing candidate.",
    claims: [],
    candidateDraft: {
      ...clone(contract.fixedValues.candidateIdentity),
      summary:
        "One total How-to-Play Skill routes all phases through the complete current index while authoritative Rules/Referee services retain legality and state-transition authority.",
      claimIds: clone(contract.fixedValues.claimIds),
      procedure: [
        "Read the live phase and topic, then select the matching chapter from the 10-chapter index.",
        "Retrieve the full current RuleAtom by evidenceId and verify its content hash, locator hash, and Rules receipt hash.",
        "Ask the authoritative Rules/Referee service for current LegalSpace and use only an enabled proposal.",
        "Preview the proposal, obtain human confirmation, Apply it, then verify AcceptedReceipt and Replay.",
      ],
      legalityChecks: [
        "Fail closed when a RuleAtom, content hash, locator hash, Rules receipt, LegalSpace result, or state transition is missing or drifted.",
        "Keep all 114 display-only atoms readable for history but never use them to seed a current legality claim.",
      ],
      illegalPatterns: [
        "Reject treating a chapter summary as executable rule authority.",
        "Reject creating one deployable Skill per RuleAtom or bypassing current LegalSpace.",
      ],
      examples: [
        "For a movement question, select its chapter, retrieve the exact movement RuleAtom, then Preview the Rules-enabled action.",
      ],
      counterExamples: [
        "Do not infer legality from a display-only historical atom or apply an action without human confirmation.",
      ],
      judgeTests: [
        {
          testId: "judge.positive.exact-routing",
          kind: "positive",
          claimIds: [
            "claim.index.binding", "claim.rules.authority",
            "claim.atom.retrieval", "claim.action.lifecycle",
          ],
          expected: "pass",
        },
        {
          testId: "judge.negative.index-authority",
          kind: "negative",
          claimIds: ["claim.rules.authority", "claim.atom.retrieval"],
          expected: "reject",
        },
      ],
      unresolvedClaims: [],
    },
  };
  throw new Error(`Unsupported fixture role: ${role}`);
}

function mutate(value) {
  if (MODE === "shape") return { ...value, forbidden: true };
  if (MODE === "near_output_limit") {
    value.output.fixturePadding = "x".repeat(240 * 1024);
    return value;
  }
  if (MODE === "output_size") {
    value.output.fixturePadding = "x".repeat(300 * 1024);
    return value;
  }
  const receipt = value.usageReceipt;
  if (MODE === "receipt_hash") receipt.receiptHash = "0".repeat(64);
  if (MODE === "request_binding") receipt.requestId = "wrong-request-binding";
  if (MODE === "profile_binding") {
    receipt.providerProfileRef.hash = "0".repeat(64);
  }
  if (MODE === "provider_identity") receipt.providerId = "wrong-provider";
  if (MODE === "usage") receipt.usage.totalUnits = 0;
  if (MODE === "network_proof") receipt.tlsServerName = "invalid.example";
  if (MODE === "attempt_proof") receipt.physicalAttempts = 2;
  if (MODE === "safety") receipt.trainingTruth = true;
  if (!new Set([
    "receipt_hash", "success", "near_output_limit", "output_size", "shape",
  ])
    .has(MODE)) {
    const { receiptHash: _discarded, ...body } = receipt;
    value.usageReceipt = envelope(body, "receiptHash");
  }
  return value;
}

function successValue(providerRequest) {
  ordinal += 1;
  const output = {
    schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
    channels: {
      skill_generation_role_output: roleOutput(providerRequest.promptNodes[0]),
    },
  };
  const inputUnits = 800 + ordinal;
  const outputUnits = 120 + ordinal;
  const body = {
    schemaVersion: "starcraft_tmg_provider_egress_transport_v1.success",
    requestId: providerRequest.requestId,
    providerProfileRef: clone(binding.providerProfileRef),
    egressPolicyHash: binding.policyHash,
    providerId: binding.providerId,
    requestedModel: binding.model,
    reportedModel: binding.model,
    providerRequestIdHash: hashStarcraftTmgContract(`ipc-fixture-${ordinal}`),
    providerSystemFingerprintHash: hashStarcraftTmgContract("ipc-fixture-model"),
    status: 200,
    usage: {
      inputUnits,
      outputUnits,
      totalUnits: inputUnits + outputUnits,
      inputCacheHitUnits: 80,
      inputCacheMissUnits: inputUnits - 80,
    },
    responseFingerprint: hashStarcraftTmgContract(output),
    dnsAddressSetHash: hashStarcraftTmgContract(["93.184.216.34"]),
    tlsServerName: binding.endpoint.hostname,
    tlsCertificateVerificationDisabled: false,
    redirectFollowed: false,
    proxyUsed: false,
    physicalAttempts: 1,
    automaticRetries: 0,
    startedAt: new Date(Date.UTC(2026, 8, 4, 21, 1, ordinal)).toISOString(),
    finishedAt: new Date(Date.UTC(2026, 8, 4, 21, 2, ordinal)).toISOString(),
    trainingTruth: false,
  };
  return mutate({ output, usageReceipt: envelope(body, "receiptHash") });
}

function isolation() {
  return {
    processIsolated: true,
    environmentInheritedFromParent: false,
    environmentKeys: Object.keys(process.env).sort(),
    environmentAllowlistPassed: true,
    credentialPersistence: "child_process_session_memory_only",
    credentialReturnedOverIpc: false,
    providerTransportMounted: true,
    networkRequestMadeAtInitialization: false,
    rulesRoomAgentSkillMemoryOrDshImported: false,
    trainingTruth: false,
  };
}

process.on("message", (message) => {
  if (message?.type === "initialize") {
    binding = clone(message.egressBinding);
    credentialBytes = Buffer.from(message.credentialBytes);
    message.credentialBytes.fill(0);
    initialized = true;
    reply({
      type: "initialized",
      requestId: message.requestId,
      attachmentId: message.attachmentId,
      ok: true,
      workerVersion: WIRE_VERSION,
      providerProfileHash: binding.providerProfileRef.hash,
      egressPolicyHash: binding.policyHash,
      isolation: isolation(),
      trainingTruth: false,
    });
    return;
  }
  if (message?.type === "complete" && initialized) {
    if (MODE === "provider_response_contract_failure") {
      const body = {
        schemaVersion: "starcraft_tmg_provider_egress_transport_v1.failure",
        code: "PROVIDER_RESPONSE_CONTRACT_REJECTED",
        requestDefinitelyNotSent: false,
        requestMayHaveBeenSent: true,
        status: null,
        physicalAttempts: 1,
        automaticRetries: 0,
        trainingTruth: false,
      };
      reply({
        type: "provider_result",
        requestId: message.requestId,
        ok: false,
        code: body.code,
        safeReceipt: envelope(body, "receiptHash"),
        workerVersion: WIRE_VERSION,
        trainingTruth: false,
      });
      return;
    }
    const value = successValue(message.providerRequest);
    const result = {
      type: "provider_result",
      requestId: message.requestId,
      ok: true,
      value,
      workerVersion: WIRE_VERSION,
      trainingTruth: false,
    };
    if (MODE === "envelope_request_binding") {
      result.requestId = "slice170-wrong-parent-request-binding";
    }
    if (MODE === "envelope_shape") result.forbidden = true;
    if (MODE === "envelope_identity") result.workerVersion = "wrong-worker-version";
    reply(result);
    return;
  }
  if (message?.type === "cancel") {
    reply({
      type: "cancel_complete",
      requestId: message.requestId,
      targetRequestId: message.targetRequestId,
      ok: true,
      matched: false,
      workerVersion: WIRE_VERSION,
      trainingTruth: false,
    });
    return;
  }
  if (message?.type === "shutdown") {
    scrub();
    reply({
      type: "shutdown_complete",
      requestId: message.requestId,
      ok: true,
      reason: message.reason,
      workerVersion: WIRE_VERSION,
      sensitiveBytesZeroed: true,
      trainingTruth: false,
    }, () => process.disconnect?.());
  }
});

process.on("disconnect", () => {
  scrub();
  process.exit(0);
});
