import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_TEACH_CYCLE_SCHEMA =
  "starcraft_tmg_roster_teach_cycle_v1";
export const ROSTER_TEACH_CHALLENGER_ROUTE =
  "ticket27.roster_teach.challenger.v1";
export const ROSTER_TEACH_STUDENT_ROUTE =
  "ticket27.roster_teach.student.v1";

const HASH = /^[a-f0-9]{64}$/u;
const TARGET_KINDS = new Set([
  "score_route", "opponent_hypothesis", "counter_response",
  "invalidation_trigger",
]);
const DISPOSITIONS = new Set(["retain", "revise", "unresolved"]);
const EVIDENCE_STATUSES = new Set(["exact", "advisory", "unknown"]);

function fail(code) { throw new Error(code); }
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function text(value, code) {
  if (typeof value !== "string" || !value.trim()) fail(code);
  return value.trim();
}
function hash(value, code) {
  if (!HASH.test(String(value || ""))) fail(code);
  return value;
}
function frozen(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) frozen(child);
  return Object.freeze(value);
}
function withoutHash(value) {
  const { cycleHash, ...body } = value;
  return body;
}
function targetExists(foundation, challenge) {
  switch (challenge.targetKind) {
    case "score_route": return challenge.targetId === "scoreRoute"
      && object(foundation.scoreRoute);
    case "opponent_hypothesis": return (foundation.opponentHypotheses || [])
      .some((item) => item.hypothesisId === challenge.targetId);
    case "counter_response": return (foundation.counterResponses || [])
      .some((item) => item.responseId === challenge.targetId);
    case "invalidation_trigger": return (foundation.invalidationTriggers || [])
      .some((item) => item.triggerId === challenge.targetId);
    default: return false;
  }
}
function targetValue(foundation, challenge) {
  switch (challenge.targetKind) {
    case "score_route": return foundation.scoreRoute;
    case "opponent_hypothesis": return foundation.opponentHypotheses
      ?.find((item) => item.hypothesisId === challenge.targetId);
    case "counter_response": return foundation.counterResponses
      ?.find((item) => item.responseId === challenge.targetId);
    case "invalidation_trigger": return foundation.invalidationTriggers
      ?.find((item) => item.triggerId === challenge.targetId);
    default: return null;
  }
}
function verifyShape(cycle) {
  if (!object(cycle) || cycle.schema !== ROSTER_TEACH_CYCLE_SCHEMA
    || cycle.canAffectRules !== false || cycle.trainingTruth !== false
    || cycle.hiddenChainOfThoughtStored !== false
    || cycle.humanReviewed !== false
    || !object(cycle.initialFoundation)
    || !object(cycle.revisedFoundation)
    || !HASH.test(String(cycle.initialFoundationHash || ""))
    || !HASH.test(String(cycle.revisedFoundationHash || ""))
    || cycle.initialFoundationHash
      !== hashStarcraftTmgContract(cycle.initialFoundation)
    || cycle.revisedFoundationHash
      !== hashStarcraftTmgContract(cycle.revisedFoundation)
    || !Array.isArray(cycle.sourceHashes)
    || !Array.isArray(cycle.challenges) || cycle.challenges.length < 1
    || !Array.isArray(cycle.answers)
    || !Array.isArray(cycle.evidenceReceipts)
    || !object(cycle.roleReceipts)
    || cycle.challengePromptRoute !== ROSTER_TEACH_CHALLENGER_ROUTE
    || cycle.revisionPromptRoute !== ROSTER_TEACH_STUDENT_ROUTE) {
    fail("ROSTER_TEACH_CYCLE_INVALID");
  }
  const sourceHashes = new Set(cycle.sourceHashes.map((value) =>
    hash(value, "ROSTER_TEACH_SOURCE_INVALID")));
  for (const role of ["challenger", "student"]) {
    const receipt = cycle.roleReceipts[role];
    if (receipt !== null && (!object(receipt)
      || !HASH.test(String(receipt.receiptHash || "")))) {
      fail("ROSTER_TEACH_ROLE_RECEIPT_INVALID");
    }
  }
  if (sourceHashes.size !== cycle.sourceHashes.length
    || sourceHashes.size < 1) fail("ROSTER_TEACH_SOURCE_INVALID");
  const challengeIds = new Set();
  for (const challenge of cycle.challenges) {
    if (!object(challenge) || !TARGET_KINDS.has(challenge.targetKind)
      || !targetExists(cycle.initialFoundation, challenge)) {
      fail("ROSTER_TEACH_CHALLENGE_TARGET_INVALID");
    }
    const id = text(challenge.challengeId, "ROSTER_TEACH_CHALLENGE_INVALID");
    if (challengeIds.has(id)) fail("ROSTER_TEACH_CHALLENGE_DUPLICATE");
    challengeIds.add(id);
    text(challenge.claimText, "ROSTER_TEACH_CHALLENGE_INVALID");
    text(challenge.questionText, "ROSTER_TEACH_CHALLENGE_INVALID");
    text(challenge.falsificationText, "ROSTER_TEACH_CHALLENGE_INVALID");
    if (challenge.evidenceRequest !== null
      && (!object(challenge.evidenceRequest)
        || !text(challenge.evidenceRequest.kind,
          "ROSTER_TEACH_EVIDENCE_REQUEST_INVALID"))) {
      fail("ROSTER_TEACH_EVIDENCE_REQUEST_INVALID");
    }
  }
  const evidence = new Map();
  for (const receipt of cycle.evidenceReceipts) {
    if (!object(receipt) || !challengeIds.has(receipt.challengeId)
      || !EVIDENCE_STATUSES.has(receipt.status)) {
      fail("ROSTER_TEACH_EVIDENCE_INVALID");
    }
    const receiptHash = hash(receipt.receiptHash,
      "ROSTER_TEACH_EVIDENCE_INVALID");
    if (evidence.has(receiptHash)) fail("ROSTER_TEACH_EVIDENCE_DUPLICATE");
    evidence.set(receiptHash, receipt);
  }
  const answers = new Set();
  let revised = false;
  for (const answer of cycle.answers) {
    if (!object(answer) || !challengeIds.has(answer.challengeId)
      || !DISPOSITIONS.has(answer.disposition)
      || answers.has(answer.challengeId)) fail("ROSTER_TEACH_ANSWER_INVALID");
    answers.add(answer.challengeId);
    text(answer.publicReason, "ROSTER_TEACH_ANSWER_INVALID");
    if (!Array.isArray(answer.evidenceRefs)) {
      fail("ROSTER_TEACH_ANSWER_EVIDENCE_INVALID");
    }
    const refs = new Set(answer.evidenceRefs.map((reference) =>
      hash(reference, "ROSTER_TEACH_ANSWER_EVIDENCE_INVALID")));
    if (refs.size !== answer.evidenceRefs.length
      || [...refs].some((reference) =>
        !sourceHashes.has(reference) && !evidence.has(reference))) {
      fail("ROSTER_TEACH_ANSWER_EVIDENCE_INVALID");
    }
    const challenge = cycle.challenges.find((entry) =>
      entry.challengeId === answer.challengeId);
    const queryEvidence = [...refs].filter((reference) =>
      evidence.get(reference)?.challengeId === answer.challengeId
        && evidence.get(reference)?.status !== "unknown");
    if (answer.disposition === "unresolved") {
      text(answer.replanTrigger, "ROSTER_TEACH_UNRESOLVED_TRIGGER_REQUIRED");
    } else if (refs.size === 0
      || challenge.evidenceRequest !== null && queryEvidence.length === 0) {
      fail("ROSTER_TEACH_SUPPORTED_ANSWER_REQUIRED");
    }
    if (answer.disposition === "revise") {
      text(answer.revisedClaimText, "ROSTER_TEACH_REVISION_REQUIRED");
      if (hashStarcraftTmgContract(targetValue(cycle.initialFoundation,
          challenge) ?? null) === hashStarcraftTmgContract(targetValue(
          cycle.revisedFoundation, challenge) ?? null)) {
        fail("ROSTER_TEACH_TARGET_NOT_REVISED");
      }
      revised = true;
    } else if (answer.disposition === "retain"
      && hashStarcraftTmgContract(targetValue(cycle.initialFoundation,
        challenge) ?? null) !== hashStarcraftTmgContract(targetValue(
        cycle.revisedFoundation, challenge) ?? null)) {
      fail("ROSTER_TEACH_RETAINED_TARGET_CHANGED");
    }
  }
  if (answers.size !== challengeIds.size
    || revised && cycle.initialFoundationHash === cycle.revisedFoundationHash) {
    fail("ROSTER_TEACH_REVISION_INCOMPLETE");
  }
  return true;
}

export function verifyRosterTeachCycleV1(cycle) {
  verifyShape(cycle);
  if (!HASH.test(String(cycle.cycleHash || ""))
    || cycle.cycleHash !== hashStarcraftTmgContract(withoutHash(cycle))) {
    fail("ROSTER_TEACH_CYCLE_HASH_INVALID");
  }
  return true;
}

export async function runRosterTeachCycleV1(input = {}) {
  const initialFoundation = clone(input.initialFoundation);
  if (!object(initialFoundation)
    || typeof input.challengerPort?.challenge !== "function"
    || typeof input.studentPort?.revise !== "function"
    || typeof input.evidencePort?.query !== "function"
    || input.evidencePort?.descriptor?.()?.readOnly !== true) {
    fail("ROSTER_TEACH_PORT_INVALID");
  }
  const sourceHashes = [...new Set(input.sourceHashes || [])];
  const sourceContext = clone(input.sourceContext || {});
  const initialFoundationHash = hashStarcraftTmgContract(initialFoundation);
  const challengeOutput = await input.challengerPort.challenge(frozen({
    promptRoute: ROSTER_TEACH_CHALLENGER_ROUTE,
    initialFoundation: clone(initialFoundation), initialFoundationHash,
    sourceHashes: clone(sourceHashes),
    sourceContext: clone(sourceContext),
    canAffectRules: false, trainingTruth: false,
  }));
  const challenges = clone(challengeOutput?.challenges || []);
  // Check all challenger targets before a tool is called or a student sees it.
  verifyShape({ schema: ROSTER_TEACH_CYCLE_SCHEMA,
    initialFoundation, initialFoundationHash,
    revisedFoundation: initialFoundation,
    revisedFoundationHash: initialFoundationHash,
    sourceHashes, challenges,
    answers: challenges.map((challenge) => ({
      challengeId: challenge.challengeId, disposition: "unresolved",
      publicReason: "Pending student response",
      evidenceRefs: [], replanTrigger: "Pending student response",
    })),
    evidenceReceipts: [],
    roleReceipts: { challenger: null, student: null },
    challengePromptRoute: ROSTER_TEACH_CHALLENGER_ROUTE,
    revisionPromptRoute: ROSTER_TEACH_STUDENT_ROUTE,
    canAffectRules: false, trainingTruth: false,
    hiddenChainOfThoughtStored: false, humanReviewed: false,
  });
  const evidenceReceipts = [];
  for (const challenge of challenges) {
    if (challenge.evidenceRequest === null) continue;
    const receipt = await input.evidencePort.query(frozen({
      challengeId: challenge.challengeId,
      request: clone(challenge.evidenceRequest),
      initialFoundationHash,
      sourceHashes: clone(sourceHashes),
      mutationAuthority: false,
    }));
    evidenceReceipts.push({ ...clone(receipt),
      challengeId: challenge.challengeId });
  }
  const studentOutput = await input.studentPort.revise(frozen({
    promptRoute: ROSTER_TEACH_STUDENT_ROUTE,
    initialFoundation: clone(initialFoundation), initialFoundationHash,
    challenges: clone(challenges),
    evidenceReceipts: clone(evidenceReceipts),
    sourceHashes: clone(sourceHashes),
    sourceContext: clone(sourceContext),
    canAffectRules: false, trainingTruth: false,
  }));
  const revisedFoundation = clone(studentOutput?.revisedFoundation);
  if (!object(revisedFoundation)) fail("ROSTER_TEACH_REVISION_INVALID");
  const body = {
    schema: ROSTER_TEACH_CYCLE_SCHEMA,
    initialFoundation, initialFoundationHash,
    revisedFoundation,
    revisedFoundationHash: hashStarcraftTmgContract(revisedFoundation),
    sourceHashes, challenges,
    evidenceReceipts,
    answers: clone(studentOutput?.answers || []),
    roleReceipts: {
      challenger: clone(challengeOutput?.receipt ?? null),
      student: clone(studentOutput?.receipt ?? null),
    },
    challengePromptRoute: ROSTER_TEACH_CHALLENGER_ROUTE,
    revisionPromptRoute: ROSTER_TEACH_STUDENT_ROUTE,
    canAffectRules: false, trainingTruth: false,
    hiddenChainOfThoughtStored: false, humanReviewed: false,
  };
  const cycle = { ...body, cycleHash: hashStarcraftTmgContract(body) };
  verifyRosterTeachCycleV1(cycle);
  return frozen(cycle);
}
