import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { verifyCurrentOfficialSkillStagedInputV1 } from
  "./current-official-evidence-v1.mjs";

export const TEACH_CTX2SKILL_ROLE_GRAPH_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_role_graph_v1";
export const TEACH_CTX2SKILL_ROLE_REQUEST_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_role_request_v1";
export const TEACH_CTX2SKILL_ROLE_RECEIPT_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_role_receipt_v1";
export const TEACH_CTX2SKILL_CANDIDATE_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_candidate_v1";
export const TEACH_CTX2SKILL_EMISSION_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_candidate_emission_v1";
export const TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_candidate_emission_ack_v1";
export const TEACH_CTX2SKILL_RUN_RESULT_SCHEMA =
  "starcraft_tmg_teach_ctx2skill_run_result_v1";
export const TEACH_CTX2SKILL_ROLE_GRAPH_HASH =
  "20246d7c90478a4150951a0e9e752cbc94685bd59e91993196dae2859abda639";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[a-z0-9][a-z0-9_.:/@+>-]{0,191}$/u;
const FAILURE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,95}$/u;
const MAX_OUTPUT_BYTES = 131072;
const CLAIM_TYPES = new Set([
  "source_fact",
  "legality",
  "strategy",
  "uncertainty",
]);
const PROBE_KINDS = new Set([
  "missing_precondition",
  "illegal_boundary",
  "counterexample",
  "source_conflict",
  "cross_time_drift",
]);
const RESOLUTION_DISPOSITIONS = new Set([
  "defended",
  "conceded",
  "uncertain",
]);
const SKILL_TYPES = new Set([
  "turn_flow",
  "movement",
  "combat",
  "scoring",
  "resource",
  "hidden_info",
  "exception",
  "strategy",
]);
const JUDGE_TEST_KINDS = new Set([
  "positive",
  "negative",
  "counterexample",
  "cross_time",
]);
const FORBIDDEN_OUTPUT_KEY = /(?:chain.?of.?thought|reasoning|thoughts|analysis|raw.?prompt|raw.?response|credential|api.?key|authorization|secret|tool.?calls?|candidate.?emissions?|emit.?candidate.?skill|publish|training.?truth|can.?affect.?rules|promotion.?eligible)/iu;
const CREDENTIAL_PATTERN = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization|credential|secret)\s*[:=]\s*[^\s,;}]{6,})/iu;

const ROLE_NODES = Object.freeze([
  {
    nodeId: "teach.plan",
    role: "planner",
    phase: "teach",
    executorKind: "bounded_role_executor",
    dependencies: [],
    contextRoles: [],
  },
  {
    nodeId: "teach.tutor",
    role: "tutor",
    phase: "teach",
    executorKind: "bounded_role_executor",
    dependencies: ["teach.plan"],
    contextRoles: ["planner"],
  },
  {
    nodeId: "teach.student",
    role: "student",
    phase: "teach",
    executorKind: "bounded_role_executor",
    dependencies: ["teach.tutor"],
    contextRoles: ["planner", "tutor"],
  },
  {
    nodeId: "ctx2skill.challenge",
    role: "challenger",
    phase: "ctx2skill",
    executorKind: "bounded_role_executor",
    dependencies: ["teach.student"],
    contextRoles: ["tutor", "student"],
  },
  {
    nodeId: "ctx2skill.resolve",
    role: "reasoner",
    phase: "ctx2skill",
    executorKind: "bounded_role_executor",
    dependencies: ["ctx2skill.challenge"],
    contextRoles: ["challenger"],
  },
  {
    nodeId: "ctx2skill.fact_judge",
    role: "fact_judge",
    phase: "ctx2skill",
    executorKind: "deterministic_fact_judge",
    dependencies: ["ctx2skill.resolve"],
    contextRoles: ["tutor", "student", "challenger", "reasoner"],
  },
  {
    nodeId: "ctx2skill.propose",
    role: "proposer",
    phase: "ctx2skill",
    executorKind: "bounded_role_executor",
    dependencies: ["ctx2skill.fact_judge"],
    contextRoles: ["fact_judge"],
  },
  {
    nodeId: "ctx2skill.generate",
    role: "generator",
    phase: "ctx2skill",
    executorKind: "bounded_role_executor",
    dependencies: ["ctx2skill.propose"],
    contextRoles: ["fact_judge", "proposer"],
  },
  {
    nodeId: "ctx2skill.cross_time",
    role: "cross_time_gate",
    phase: "ctx2skill",
    executorKind: "deterministic_cross_time_gate",
    dependencies: ["ctx2skill.generate"],
    contextRoles: ["fact_judge", "proposer", "generator"],
  },
]);

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function hashEnvelope(body, hashKey) {
  return freeze({ ...body, [hashKey]: hashStarcraftTmgContract(body) });
}

function assertHashEnvelope(value, hashKey, code) {
  if (!object(value) || !HASH_PATTERN.test(String(value[hashKey] || ""))
    || value[hashKey] !== hashStarcraftTmgContract(without(value, [hashKey]))) {
    fail(code);
  }
}

function requiredString(value, code, maximum = 8192) {
  const result = String(value || "").trim();
  if (!result || result.length > maximum) fail(code);
  return result;
}

function requiredId(value, code) {
  const result = requiredString(value, code, 192);
  if (!ID_PATTERN.test(result)) fail(code);
  return result;
}

function exactKeys(value, required, optional, code) {
  if (!object(value)) fail(code);
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key))
    || Object.keys(value).some((key) => !allowed.has(key))) {
    fail(code);
  }
}

function stringArray(value, code, { nonEmpty = false, maximum = 128 } = {}) {
  if (!Array.isArray(value) || value.length > maximum || (nonEmpty && value.length === 0)) {
    fail(code);
  }
  return value.map((entry) => requiredString(entry, code));
}

function idArray(value, code, options = {}) {
  const ids = stringArray(value, code, options).map((entry) => requiredId(entry, code));
  if (new Set(ids).size !== ids.length) fail(code);
  return ids;
}

function evidenceIdArray(value, code, options = {}) {
  const ids = stringArray(value, code, options)
    .map((entry) => requiredString(entry, code, 256));
  if (new Set(ids).size !== ids.length) fail(code);
  return ids;
}

function codeArray(value, code, options = {}) {
  const values = stringArray(value, code, options);
  if (values.some((entry) => !FAILURE_CODE_PATTERN.test(entry))
    || new Set(values).size !== values.length) fail(code);
  return values;
}

function assertSafeOutput(value, code) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    fail(code);
  }
  if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_OUTPUT_BYTES
    || CREDENTIAL_PATTERN.test(serialized)) fail(code);
  const visit = (node) => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!object(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_OUTPUT_KEY.test(key)) fail(code, key);
      visit(child);
    }
  };
  visit(value);
}

function sameSet(left, right) {
  return left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function currentBindingFrom(stagedInput) {
  return freeze({
    stagedInputHash: stagedInput.stagedInputHash,
    sourceLockHash: stagedInput.bindings.source.sourceLockHash,
    sourceSnapshotHash: stagedInput.bindings.source.sourceSnapshotHash,
    normalizedDatasetHash: stagedInput.bindings.source.normalizedDatasetHash,
    rulesReceiptHash: stagedInput.bindings.rules.receiptHash,
    rulesCatalogueHash: stagedInput.bindings.rules.catalogueHash,
    rulesRuntimeHash: stagedInput.bindings.rules.runtimeHash,
    rulesGraphHash: stagedInput.bindings.rules.graphHash,
  });
}

function roleGraphBody() {
  return {
    schemaVersion: TEACH_CTX2SKILL_ROLE_GRAPH_SCHEMA,
    gameId: "starcraft-tmg",
    graphVersion: "teach_ctx2skill_v1",
    nodes: clone(ROLE_NODES),
    sequence: ROLE_NODES.map((node) => node.role),
    phases: {
      teach: ["planner", "tutor", "student"],
      ctx2skill: [
        "challenger",
        "reasoner",
        "fact_judge",
        "proposer",
        "generator",
        "cross_time_gate",
      ],
    },
    roleExecutorMayEmitCandidate: false,
    candidateEmissionTool: "emit_candidate_skill",
    candidateEmissionMaximum: 1,
    candidateEmissionAfter: "cross_time_gate",
    rawReasoningPersisted: false,
    modelMayJudgeOwnClaims: false,
    rulesAuthority: "authoritative_rules_service_only",
    outputAuthority: "candidate_unreviewed_only",
    productionReady: false,
    trainingTruth: false,
  };
}

export const TEACH_CTX2SKILL_ROLE_GRAPH_V1 = hashEnvelope(
  roleGraphBody(),
  "graphHash",
);

export function verifyTeachCtx2SkillRoleGraphV1(graph = TEACH_CTX2SKILL_ROLE_GRAPH_V1) {
  assertHashEnvelope(graph, "graphHash", "TEACH_CTX2SKILL_GRAPH_HASH_INVALID");
  if (graph.schemaVersion !== TEACH_CTX2SKILL_ROLE_GRAPH_SCHEMA
    || graph.gameId !== "starcraft-tmg"
    || graph.graphHash !== TEACH_CTX2SKILL_ROLE_GRAPH_HASH
    || graph.nodes?.length !== 9
    || graph.roleExecutorMayEmitCandidate !== false
    || graph.candidateEmissionTool !== "emit_candidate_skill"
    || graph.candidateEmissionMaximum !== 1
    || graph.candidateEmissionAfter !== "cross_time_gate"
    || graph.rawReasoningPersisted !== false
    || graph.modelMayJudgeOwnClaims !== false
    || graph.rulesAuthority !== "authoritative_rules_service_only"
    || graph.outputAuthority !== "candidate_unreviewed_only"
    || graph.productionReady !== false
    || graph.trainingTruth !== false) {
    fail("TEACH_CTX2SKILL_GRAPH_INVALID");
  }
  const nodes = new Map(graph.nodes.map((node) => [node.nodeId, node]));
  if (nodes.size !== graph.nodes.length
    || new Set(graph.sequence).size !== graph.sequence.length
    || graph.sequence.join(",") !== ROLE_NODES.map((node) => node.role).join(",")) {
    fail("TEACH_CTX2SKILL_GRAPH_NODE_INVALID");
  }
  const visited = new Set();
  for (const node of graph.nodes) {
    if (!Array.isArray(node.dependencies)
      || node.dependencies.some((dependency) => !visited.has(dependency))) {
      fail("TEACH_CTX2SKILL_GRAPH_DEPENDENCY_INVALID", node.nodeId);
    }
    visited.add(node.nodeId);
  }
  return true;
}

function taskRef(stagedInput) {
  return freeze({
    taskId: stagedInput.task.taskId,
    taskHash: stagedInput.task.taskHash,
    family: stagedInput.task.family,
    subjectId: stagedInput.task.subjectId,
  });
}

function evidenceIndex(stagedInput) {
  return new Map(stagedInput.evidence.map((row) => [row.evidenceId, row]));
}

function evidenceRef(row) {
  return freeze({
    evidenceId: row.evidenceId,
    kind: row.kind,
    contentHash: row.contentHash,
    locatorHash: row.locator.locatorHash,
    rulesReceiptHash: row.rulesReceipt?.receiptHash || null,
  });
}

function normalizeClaim(input, context) {
  exactKeys(input,
    ["claimId", "claimType", "statement", "evidenceIds", "advisoryOnly"],
    ["supersedesClaimId", "correctionTargetId"],
    "TEACH_CTX2SKILL_CLAIM_SHAPE_INVALID");
  const claimId = requiredId(input.claimId, "TEACH_CTX2SKILL_CLAIM_ID_INVALID");
  const claimType = requiredString(input.claimType,
    "TEACH_CTX2SKILL_CLAIM_TYPE_INVALID", 32);
  if (!CLAIM_TYPES.has(claimType)) fail("TEACH_CTX2SKILL_CLAIM_TYPE_INVALID", claimId);
  const evidenceIds = evidenceIdArray(input.evidenceIds,
    "TEACH_CTX2SKILL_CLAIM_EVIDENCE_INVALID", {
      nonEmpty: claimType !== "uncertainty",
      maximum: 64,
    });
  const rows = evidenceIds.map((id) => context.evidenceById.get(id));
  if (rows.some((row) => !row)) fail("TEACH_CTX2SKILL_CLAIM_EVIDENCE_UNSTAGED", claimId);
  if (claimType === "legality" && !rows.some((row) => (
    ["current_rule_atom", "current_rule_index"].includes(row.kind)
    && row.rulesReceipt?.receiptHash === context.currentBinding.rulesReceiptHash
  ))) {
    fail("TEACH_CTX2SKILL_LEGALITY_CLAIM_RULES_RECEIPT_REQUIRED", claimId);
  }
  if (["strategy", "uncertainty"].includes(claimType) && input.advisoryOnly !== true) {
    fail("TEACH_CTX2SKILL_ADVISORY_CLAIM_REQUIRED", claimId);
  }
  if (["source_fact", "legality"].includes(claimType) && input.advisoryOnly !== false) {
    fail("TEACH_CTX2SKILL_FACT_CLAIM_AUTHORITY_INVALID", claimId);
  }
  const supersedesClaimId = input.supersedesClaimId === undefined
    ? null
    : requiredId(input.supersedesClaimId,
      "TEACH_CTX2SKILL_SUPERSEDED_CLAIM_INVALID");
  const correctionTargetId = input.correctionTargetId === undefined
    ? null
    : requiredId(input.correctionTargetId,
      "TEACH_CTX2SKILL_CORRECTION_TARGET_INVALID");
  if ((supersedesClaimId === null) !== (correctionTargetId === null)) {
    fail("TEACH_CTX2SKILL_CORRECTION_LINEAGE_INCOMPLETE", claimId);
  }
  const body = {
    claimId,
    claimType,
    statement: requiredString(input.statement,
      "TEACH_CTX2SKILL_CLAIM_STATEMENT_INVALID"),
    evidenceRefs: rows.map(evidenceRef),
    advisoryOnly: input.advisoryOnly,
    supersedesClaimId,
    correctionTargetId,
  };
  return hashEnvelope(body, "claimHash");
}

function normalizeClaims(value, context, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || value.length > 128 || (nonEmpty && value.length === 0)) {
    fail("TEACH_CTX2SKILL_CLAIMS_INVALID");
  }
  const claims = value.map((claim) => normalizeClaim(claim, context));
  if (new Set(claims.map((claim) => claim.claimId)).size !== claims.length) {
    fail("TEACH_CTX2SKILL_CLAIM_ID_DUPLICATE");
  }
  return claims;
}

function normalizeQuestions(value, context) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail("TEACH_CTX2SKILL_PLANNER_QUESTIONS_INVALID");
  }
  const questions = value.map((question) => {
    exactKeys(question, ["questionId", "prompt", "evidenceIds"], [],
      "TEACH_CTX2SKILL_PLANNER_QUESTION_INVALID");
    const evidenceIds = evidenceIdArray(question.evidenceIds,
      "TEACH_CTX2SKILL_PLANNER_QUESTION_EVIDENCE_INVALID", {
        nonEmpty: true,
        maximum: 64,
      });
    if (evidenceIds.some((id) => !context.evidenceById.has(id))) {
      fail("TEACH_CTX2SKILL_PLANNER_QUESTION_EVIDENCE_UNSTAGED");
    }
    return freeze({
      questionId: requiredId(question.questionId,
        "TEACH_CTX2SKILL_PLANNER_QUESTION_ID_INVALID"),
      prompt: requiredString(question.prompt,
        "TEACH_CTX2SKILL_PLANNER_QUESTION_PROMPT_INVALID"),
      evidenceIds,
    });
  });
  if (new Set(questions.map((question) => question.questionId)).size !== questions.length) {
    fail("TEACH_CTX2SKILL_PLANNER_QUESTION_ID_DUPLICATE");
  }
  return questions;
}

function claimIdsFromReceipts(receipts) {
  return receipts.flatMap((receipt) => receipt.output?.claims || []);
}

function normalizePlannerOutput(output, context) {
  exactKeys(output, ["summary", "questions", "learningObjectives"], [],
    "TEACH_CTX2SKILL_PLANNER_OUTPUT_INVALID");
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    questions: normalizeQuestions(output.questions, context),
    learningObjectives: stringArray(output.learningObjectives,
      "TEACH_CTX2SKILL_LEARNING_OBJECTIVES_INVALID", {
        nonEmpty: true,
        maximum: 64,
      }),
  });
}

function normalizeTutorOutput(output, context) {
  exactKeys(output, ["summary", "claims", "lessonSteps"], [],
    "TEACH_CTX2SKILL_TUTOR_OUTPUT_INVALID");
  const claims = normalizeClaims(output.claims, context, { nonEmpty: true });
  const claimIds = new Set(claims.map((claim) => claim.claimId));
  if (!Array.isArray(output.lessonSteps) || output.lessonSteps.length === 0
    || output.lessonSteps.length > 64) fail("TEACH_CTX2SKILL_LESSON_STEPS_INVALID");
  const lessonSteps = output.lessonSteps.map((step) => {
    exactKeys(step, ["stepId", "summary", "claimIds"], [],
      "TEACH_CTX2SKILL_LESSON_STEP_INVALID");
    const ids = idArray(step.claimIds, "TEACH_CTX2SKILL_LESSON_CLAIM_INVALID", {
      nonEmpty: true,
    });
    if (ids.some((id) => !claimIds.has(id))) fail("TEACH_CTX2SKILL_LESSON_CLAIM_UNKNOWN");
    return freeze({
      stepId: requiredId(step.stepId, "TEACH_CTX2SKILL_LESSON_STEP_ID_INVALID"),
      summary: requiredString(step.summary, "TEACH_CTX2SKILL_LESSON_STEP_SUMMARY_INVALID"),
      claimIds: ids,
    });
  });
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    claims,
    lessonSteps,
  });
}

function normalizeStudentOutput(output, context) {
  exactKeys(output, ["summary", "claims", "answers", "uncertainties"], [],
    "TEACH_CTX2SKILL_STUDENT_OUTPUT_INVALID");
  const planner = context.receiptByRole.get("planner");
  const questionIds = planner.output.questions.map((question) => question.questionId);
  const availableClaims = new Set([
    ...claimIdsFromReceipts([...context.receiptByRole.values()])
      .map((claim) => claim.claimId),
  ]);
  const claims = normalizeClaims(output.claims, context);
  for (const claim of claims) availableClaims.add(claim.claimId);
  if (!Array.isArray(output.answers) || output.answers.length !== questionIds.length) {
    fail("TEACH_CTX2SKILL_STUDENT_ANSWERS_INVALID");
  }
  const answers = output.answers.map((answer) => {
    exactKeys(answer, ["questionId", "answerSummary", "claimIds"], [],
      "TEACH_CTX2SKILL_STUDENT_ANSWER_INVALID");
    const ids = idArray(answer.claimIds, "TEACH_CTX2SKILL_STUDENT_ANSWER_CLAIMS_INVALID", {
      nonEmpty: true,
    });
    if (ids.some((id) => !availableClaims.has(id))) {
      fail("TEACH_CTX2SKILL_STUDENT_ANSWER_CLAIM_UNKNOWN");
    }
    return freeze({
      questionId: requiredId(answer.questionId,
        "TEACH_CTX2SKILL_STUDENT_ANSWER_QUESTION_INVALID"),
      answerSummary: requiredString(answer.answerSummary,
        "TEACH_CTX2SKILL_STUDENT_ANSWER_SUMMARY_INVALID"),
      claimIds: ids,
    });
  });
  if (!sameSet(answers.map((answer) => answer.questionId), questionIds)) {
    fail("TEACH_CTX2SKILL_STUDENT_QUESTION_COVERAGE_INVALID");
  }
  if (!Array.isArray(output.uncertainties) || output.uncertainties.length > 64) {
    fail("TEACH_CTX2SKILL_STUDENT_UNCERTAINTIES_INVALID");
  }
  const uncertainties = output.uncertainties.map((uncertainty) => {
    exactKeys(uncertainty,
      ["uncertaintyId", "questionId", "summary", "evidenceIds"], [],
      "TEACH_CTX2SKILL_STUDENT_UNCERTAINTY_INVALID");
    const evidenceIds = evidenceIdArray(uncertainty.evidenceIds,
      "TEACH_CTX2SKILL_STUDENT_UNCERTAINTY_EVIDENCE_INVALID");
    if (!questionIds.includes(uncertainty.questionId)
      || evidenceIds.some((id) => !context.evidenceById.has(id))) {
      fail("TEACH_CTX2SKILL_STUDENT_UNCERTAINTY_REFERENCE_INVALID");
    }
    return freeze({
      uncertaintyId: requiredId(uncertainty.uncertaintyId,
        "TEACH_CTX2SKILL_STUDENT_UNCERTAINTY_ID_INVALID"),
      questionId: uncertainty.questionId,
      summary: requiredString(uncertainty.summary,
        "TEACH_CTX2SKILL_STUDENT_UNCERTAINTY_SUMMARY_INVALID"),
      evidenceIds,
    });
  });
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    claims,
    answers,
    uncertainties,
  });
}

function normalizeChallengerOutput(output, context) {
  exactKeys(output, ["summary", "probes"], [],
    "TEACH_CTX2SKILL_CHALLENGER_OUTPUT_INVALID");
  const claims = claimIdsFromReceipts([...context.receiptByRole.values()]);
  const claimIds = new Set(claims.map((claim) => claim.claimId));
  if (!Array.isArray(output.probes) || output.probes.length === 0
    || output.probes.length > 128) fail("TEACH_CTX2SKILL_PROBES_INVALID");
  const probes = output.probes.map((probe) => {
    exactKeys(probe, ["probeId", "kind", "targetClaimId", "prompt"], [],
      "TEACH_CTX2SKILL_PROBE_INVALID");
    const kind = requiredString(probe.kind, "TEACH_CTX2SKILL_PROBE_KIND_INVALID", 64);
    if (!PROBE_KINDS.has(kind) || !claimIds.has(probe.targetClaimId)) {
      fail("TEACH_CTX2SKILL_PROBE_REFERENCE_INVALID");
    }
    return freeze({
      probeId: requiredId(probe.probeId, "TEACH_CTX2SKILL_PROBE_ID_INVALID"),
      kind,
      targetClaimId: probe.targetClaimId,
      prompt: requiredString(probe.prompt, "TEACH_CTX2SKILL_PROBE_PROMPT_INVALID"),
    });
  });
  if (new Set(probes.map((probe) => probe.probeId)).size !== probes.length) {
    fail("TEACH_CTX2SKILL_PROBE_ID_DUPLICATE");
  }
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    probes,
  });
}

function normalizeReasonerOutput(output, context) {
  exactKeys(output, ["summary", "claims", "resolutions"], [],
    "TEACH_CTX2SKILL_REASONER_OUTPUT_INVALID");
  const challenger = context.receiptByRole.get("challenger");
  const probeIds = challenger.output.probes.map((probe) => probe.probeId);
  const claims = normalizeClaims(output.claims, context);
  const allClaimIds = new Set([
    ...claimIdsFromReceipts([...context.receiptByRole.values()])
      .map((claim) => claim.claimId),
    ...claims.map((claim) => claim.claimId),
  ]);
  if (!Array.isArray(output.resolutions) || output.resolutions.length !== probeIds.length) {
    fail("TEACH_CTX2SKILL_RESOLUTIONS_INVALID");
  }
  const resolutions = output.resolutions.map((resolution) => {
    exactKeys(resolution,
      ["probeId", "disposition", "decisionSummary", "claimIds"], [],
      "TEACH_CTX2SKILL_RESOLUTION_INVALID");
    const disposition = requiredString(resolution.disposition,
      "TEACH_CTX2SKILL_RESOLUTION_DISPOSITION_INVALID", 32);
    const claimIds = idArray(resolution.claimIds,
      "TEACH_CTX2SKILL_RESOLUTION_CLAIMS_INVALID", { nonEmpty: true });
    if (!RESOLUTION_DISPOSITIONS.has(disposition)
      || claimIds.some((id) => !allClaimIds.has(id))) {
      fail("TEACH_CTX2SKILL_RESOLUTION_REFERENCE_INVALID");
    }
    return freeze({
      probeId: requiredId(resolution.probeId,
        "TEACH_CTX2SKILL_RESOLUTION_PROBE_INVALID"),
      disposition,
      decisionSummary: requiredString(resolution.decisionSummary,
        "TEACH_CTX2SKILL_RESOLUTION_SUMMARY_INVALID"),
      claimIds,
    });
  });
  if (!sameSet(resolutions.map((resolution) => resolution.probeId), probeIds)) {
    fail("TEACH_CTX2SKILL_RESOLUTION_COVERAGE_INVALID");
  }
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    claims,
    resolutions,
  });
}

function normalizeEvaluator(value, code) {
  exactKeys(value, ["id", "version", "hash", "independentContext"], [], code);
  if (!HASH_PATTERN.test(String(value.hash || "")) || value.independentContext !== true) {
    fail(code);
  }
  return freeze({
    id: requiredId(value.id, code),
    version: requiredString(value.version, code, 128),
    hash: value.hash,
    independentContext: true,
  });
}

function normalizeJudgeResult(value, claim) {
  assertSafeOutput(value, "TEACH_CTX2SKILL_FACT_JUDGE_OUTPUT_UNSAFE");
  exactKeys(value, ["passed", "failureCodes", "findingCodes", "evaluator"], [],
    "TEACH_CTX2SKILL_FACT_JUDGE_RESULT_INVALID");
  const failureCodes = codeArray(value.failureCodes,
    "TEACH_CTX2SKILL_FACT_JUDGE_FAILURE_CODES_INVALID");
  const findingCodes = codeArray(value.findingCodes,
    "TEACH_CTX2SKILL_FACT_JUDGE_FINDING_CODES_INVALID");
  if (typeof value.passed !== "boolean"
    || (value.passed && failureCodes.length > 0)
    || (!value.passed && failureCodes.length === 0)) {
    fail("TEACH_CTX2SKILL_FACT_JUDGE_DISPOSITION_INVALID", claim.claimId);
  }
  return freeze({
    claimId: claim.claimId,
    claimHash: claim.claimHash,
    passed: value.passed,
    failureCodes,
    findingCodes,
    evidenceRefs: claim.evidenceRefs,
    evaluator: normalizeEvaluator(value.evaluator,
      "TEACH_CTX2SKILL_FACT_JUDGE_EVALUATOR_INVALID"),
  });
}

function normalizeProposerOutput(output, context) {
  exactKeys(output, ["summary", "revisionTargets", "candidatePlan"], [],
    "TEACH_CTX2SKILL_PROPOSER_OUTPUT_INVALID");
  const factJudge = context.receiptByRole.get("fact_judge");
  const failed = factJudge.output.verdicts.filter((verdict) => !verdict.passed);
  if (!Array.isArray(output.revisionTargets) || output.revisionTargets.length > 128) {
    fail("TEACH_CTX2SKILL_REVISION_TARGETS_INVALID");
  }
  const revisionTargets = output.revisionTargets.map((target) => {
    exactKeys(target,
      ["targetId", "targetClaimId", "targetClaimHash", "factJudgeReceiptHash",
        "failureCodes", "patchSummary"], [],
      "TEACH_CTX2SKILL_REVISION_TARGET_INVALID");
    const verdict = failed.find((row) => row.claimId === target.targetClaimId);
    if (!verdict || target.targetClaimHash !== verdict.claimHash
      || target.factJudgeReceiptHash !== factJudge.receiptHash
      || !sameSet(target.failureCodes, verdict.failureCodes)) {
      fail("TEACH_CTX2SKILL_REVISION_LINEAGE_INVALID");
    }
    return freeze({
      targetId: requiredId(target.targetId,
        "TEACH_CTX2SKILL_REVISION_TARGET_ID_INVALID"),
      targetClaimId: target.targetClaimId,
      targetClaimHash: target.targetClaimHash,
      factJudgeReceiptHash: target.factJudgeReceiptHash,
      failureCodes: codeArray(target.failureCodes,
        "TEACH_CTX2SKILL_REVISION_FAILURE_CODES_INVALID", { nonEmpty: true }),
      patchSummary: requiredString(target.patchSummary,
        "TEACH_CTX2SKILL_REVISION_PATCH_INVALID"),
    });
  });
  if (new Set(revisionTargets.map((target) => target.targetId)).size
    !== revisionTargets.length) {
    fail("TEACH_CTX2SKILL_REVISION_TARGET_ID_DUPLICATE");
  }
  if (!sameSet(revisionTargets.map((target) => target.targetClaimId),
    failed.map((verdict) => verdict.claimId))) {
    fail("TEACH_CTX2SKILL_REVISION_COVERAGE_INVALID");
  }
  exactKeys(output.candidatePlan,
    ["skillId", "version", "skillType", "title", "focusClaimIds"], [],
    "TEACH_CTX2SKILL_CANDIDATE_PLAN_INVALID");
  const passedClaimIds = new Set(factJudge.output.verdicts
    .filter((verdict) => verdict.passed).map((verdict) => verdict.claimId));
  const focusClaimIds = idArray(output.candidatePlan.focusClaimIds,
    "TEACH_CTX2SKILL_CANDIDATE_PLAN_CLAIMS_INVALID");
  if (focusClaimIds.some((id) => !passedClaimIds.has(id))) {
    fail("TEACH_CTX2SKILL_CANDIDATE_PLAN_UNJUDGED_CLAIM");
  }
  if (focusClaimIds.length === 0 && revisionTargets.length === 0) {
    fail("TEACH_CTX2SKILL_CANDIDATE_PLAN_EMPTY");
  }
  const skillType = requiredString(output.candidatePlan.skillType,
    "TEACH_CTX2SKILL_SKILL_TYPE_INVALID", 32);
  if (!SKILL_TYPES.has(skillType)) fail("TEACH_CTX2SKILL_SKILL_TYPE_INVALID");
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    revisionTargets,
    candidatePlan: {
      skillId: requiredId(output.candidatePlan.skillId,
        "TEACH_CTX2SKILL_SKILL_ID_INVALID"),
      version: requiredString(output.candidatePlan.version,
        "TEACH_CTX2SKILL_SKILL_VERSION_INVALID", 64),
      skillType,
      title: requiredString(output.candidatePlan.title,
        "TEACH_CTX2SKILL_SKILL_TITLE_INVALID", 256),
      focusClaimIds,
    },
  });
}

function normalizeJudgeTests(value, availableClaimIds) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 128) {
    fail("TEACH_CTX2SKILL_JUDGE_TESTS_INVALID");
  }
  const tests = value.map((test) => {
    exactKeys(test, ["testId", "kind", "claimIds", "expected"], [],
      "TEACH_CTX2SKILL_JUDGE_TEST_INVALID");
    const kind = requiredString(test.kind, "TEACH_CTX2SKILL_JUDGE_TEST_KIND_INVALID", 32);
    const claimIds = idArray(test.claimIds,
      "TEACH_CTX2SKILL_JUDGE_TEST_CLAIMS_INVALID", { nonEmpty: true });
    if (!JUDGE_TEST_KINDS.has(kind)
      || !["pass", "reject"].includes(test.expected)
      || claimIds.some((id) => !availableClaimIds.has(id))) {
      fail("TEACH_CTX2SKILL_JUDGE_TEST_REFERENCE_INVALID");
    }
    return freeze({
      testId: requiredId(test.testId, "TEACH_CTX2SKILL_JUDGE_TEST_ID_INVALID"),
      kind,
      claimIds,
      expected: test.expected,
    });
  });
  if (new Set(tests.map((test) => test.testId)).size !== tests.length
    || !tests.some((test) => test.expected === "pass")
    || !tests.some((test) => test.expected === "reject")) {
    fail("TEACH_CTX2SKILL_JUDGE_TEST_DENOMINATOR_INVALID");
  }
  return tests;
}

function normalizeGeneratorOutput(output, context) {
  exactKeys(output, ["summary", "claims", "candidateDraft"], [],
    "TEACH_CTX2SKILL_GENERATOR_OUTPUT_INVALID");
  const claims = normalizeClaims(output.claims, context);
  const proposer = context.receiptByRole.get("proposer");
  const factJudge = context.receiptByRole.get("fact_judge");
  const passedClaims = claimIdsFromReceipts([...context.receiptByRole.values()])
    .filter((claim) => factJudge.output.verdicts.some((verdict) => (
      verdict.claimId === claim.claimId && verdict.passed
    )));
  const availableClaims = new Map(passedClaims.map((claim) => [claim.claimId, claim]));
  for (const claim of claims) {
    if (availableClaims.has(claim.claimId)) fail("TEACH_CTX2SKILL_GENERATOR_CLAIM_DUPLICATE");
    availableClaims.set(claim.claimId, claim);
  }
  const revisions = new Map(proposer.output.revisionTargets
    .map((target) => [target.targetId, target]));
  for (const claim of claims.filter((row) => row.supersedesClaimId !== null)) {
    const target = revisions.get(claim.correctionTargetId);
    if (!target || target.targetClaimId !== claim.supersedesClaimId) {
      fail("TEACH_CTX2SKILL_GENERATOR_CORRECTION_LINEAGE_INVALID", claim.claimId);
    }
  }
  const draft = output.candidateDraft;
  exactKeys(draft,
    ["skillId", "version", "skillType", "title", "summary", "claimIds",
      "procedure", "legalityChecks", "illegalPatterns", "examples",
      "counterExamples", "judgeTests", "unresolvedClaims"], [],
    "TEACH_CTX2SKILL_CANDIDATE_DRAFT_INVALID");
  const plan = proposer.output.candidatePlan;
  if (draft.skillId !== plan.skillId || draft.version !== plan.version
    || draft.skillType !== plan.skillType || draft.title !== plan.title) {
    fail("TEACH_CTX2SKILL_CANDIDATE_PLAN_DRIFT");
  }
  const claimIds = idArray(draft.claimIds,
    "TEACH_CTX2SKILL_CANDIDATE_CLAIMS_INVALID", { nonEmpty: true });
  if (claimIds.some((id) => !availableClaims.has(id))) {
    fail("TEACH_CTX2SKILL_CANDIDATE_CLAIM_UNJUDGED");
  }
  if (!plan.focusClaimIds.every((id) => claimIds.includes(id))) {
    fail("TEACH_CTX2SKILL_CANDIDATE_FOCUS_DROPPED");
  }
  if (!Array.isArray(draft.unresolvedClaims) || draft.unresolvedClaims.length > 128) {
    fail("TEACH_CTX2SKILL_UNRESOLVED_CLAIMS_INVALID");
  }
  const unresolvedClaims = draft.unresolvedClaims.map((item) => {
    exactKeys(item,
      ["unresolvedId", "targetClaimId", "failureCodes", "summary"], [],
      "TEACH_CTX2SKILL_UNRESOLVED_CLAIM_INVALID");
    const target = proposer.output.revisionTargets.find((row) => (
      row.targetClaimId === item.targetClaimId
    ));
    if (!target || !sameSet(item.failureCodes, target.failureCodes)) {
      fail("TEACH_CTX2SKILL_UNRESOLVED_LINEAGE_INVALID");
    }
    return freeze({
      unresolvedId: requiredId(item.unresolvedId,
        "TEACH_CTX2SKILL_UNRESOLVED_ID_INVALID"),
      targetClaimId: item.targetClaimId,
      failureCodes: codeArray(item.failureCodes,
        "TEACH_CTX2SKILL_UNRESOLVED_FAILURE_CODES_INVALID", { nonEmpty: true }),
      summary: requiredString(item.summary,
        "TEACH_CTX2SKILL_UNRESOLVED_SUMMARY_INVALID"),
    });
  });
  if (new Set(unresolvedClaims.map((item) => item.unresolvedId)).size
    !== unresolvedClaims.length) fail("TEACH_CTX2SKILL_UNRESOLVED_ID_DUPLICATE");
  for (const target of proposer.output.revisionTargets) {
    const corrections = claims.filter((claim) => (
      claim.correctionTargetId === target.targetId
    ));
    const unresolved = unresolvedClaims.filter((item) => (
      item.targetClaimId === target.targetClaimId
    ));
    if (corrections.length + unresolved.length !== 1) {
      fail("TEACH_CTX2SKILL_REVISION_TARGET_ADDRESS_INVALID", target.targetId);
    }
    if (corrections.length === 1 && !claimIds.includes(corrections[0].claimId)) {
      fail("TEACH_CTX2SKILL_CORRECTION_NOT_IN_CANDIDATE", corrections[0].claimId);
    }
  }
  const selectedClaims = claimIds.map((id) => availableClaims.get(id));
  const judgeTests = normalizeJudgeTests(draft.judgeTests, new Set(claimIds));
  return freeze({
    summary: requiredString(output.summary, "TEACH_CTX2SKILL_SUMMARY_INVALID"),
    claims,
    candidateDraft: {
      skillId: draft.skillId,
      version: draft.version,
      skillType: draft.skillType,
      title: draft.title,
      summary: requiredString(draft.summary,
        "TEACH_CTX2SKILL_CANDIDATE_SUMMARY_INVALID"),
      claims: selectedClaims,
      procedure: stringArray(draft.procedure,
        "TEACH_CTX2SKILL_CANDIDATE_PROCEDURE_INVALID", { nonEmpty: true }),
      legalityChecks: stringArray(draft.legalityChecks,
        "TEACH_CTX2SKILL_CANDIDATE_LEGALITY_INVALID", { nonEmpty: true }),
      illegalPatterns: stringArray(draft.illegalPatterns,
        "TEACH_CTX2SKILL_CANDIDATE_ILLEGAL_PATTERNS_INVALID", { nonEmpty: true }),
      examples: stringArray(draft.examples,
        "TEACH_CTX2SKILL_CANDIDATE_EXAMPLES_INVALID"),
      counterExamples: stringArray(draft.counterExamples,
        "TEACH_CTX2SKILL_CANDIDATE_COUNTEREXAMPLES_INVALID"),
      judgeTests,
      unresolvedClaims,
    },
  });
}

function normalizeRoleOutput(role, output, context) {
  assertSafeOutput(output, "TEACH_CTX2SKILL_ROLE_OUTPUT_UNSAFE");
  switch (role) {
    case "planner": return normalizePlannerOutput(output, context);
    case "tutor": return normalizeTutorOutput(output, context);
    case "student": return normalizeStudentOutput(output, context);
    case "challenger": return normalizeChallengerOutput(output, context);
    case "reasoner": return normalizeReasonerOutput(output, context);
    case "proposer": return normalizeProposerOutput(output, context);
    case "generator": return normalizeGeneratorOutput(output, context);
    default: fail("TEACH_CTX2SKILL_ROLE_OUTPUT_UNSUPPORTED", role);
  }
}

function createRoleRequest(node, context) {
  const directParents = node.dependencies.map((dependency) => {
    const receipt = context.receiptByNode.get(dependency);
    if (!receipt) fail("TEACH_CTX2SKILL_ROLE_PARENT_MISSING", dependency);
    return { nodeId: dependency, role: receipt.role, receiptHash: receipt.receiptHash };
  });
  const contextReceiptRefs = node.contextRoles.map((role) => {
    const receipt = context.receiptByRole.get(role);
    if (!receipt) fail("TEACH_CTX2SKILL_ROLE_CONTEXT_MISSING", role);
    return { role, receiptHash: receipt.receiptHash };
  });
  const body = {
    schemaVersion: TEACH_CTX2SKILL_ROLE_REQUEST_SCHEMA,
    runId: context.runId,
    nodeId: node.nodeId,
    role: node.role,
    phase: node.phase,
    sequenceIndex: ROLE_NODES.findIndex((row) => row.nodeId === node.nodeId),
    graphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    taskRef: taskRef(context.stagedInput),
    stagedInputHash: context.stagedInput.stagedInputHash,
    currentBinding: context.currentBinding,
    directParents,
    contextReceiptRefs,
    capabilities: {
      readStagedEvidence: true,
      writeRoleOutput: true,
      emitCandidateSkill: false,
      judgeOwnClaims: false,
      readRawRepository: false,
      readHostSecrets: false,
      network: false,
      room: false,
      mutableRulesRuntime: false,
      memoryWrite: false,
      skillPublish: false,
      trainingWrite: false,
    },
    rawReasoningRequested: false,
    candidateAuthority: "unreviewed_only",
    trainingTruth: false,
  };
  return hashEnvelope(body, "requestHash");
}

function createRoleReceipt(node, request, output, context) {
  const body = {
    schemaVersion: TEACH_CTX2SKILL_ROLE_RECEIPT_SCHEMA,
    runId: context.runId,
    nodeId: node.nodeId,
    role: node.role,
    phase: node.phase,
    sequenceIndex: request.sequenceIndex,
    executorKind: node.executorKind,
    graphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    taskRef: taskRef(context.stagedInput),
    stagedInputHash: context.stagedInput.stagedInputHash,
    currentBinding: context.currentBinding,
    requestHash: request.requestHash,
    parentReceiptHashes: request.directParents.map((parent) => parent.receiptHash),
    output,
    outputHash: hashStarcraftTmgContract(output),
    rawReasoningPersisted: false,
    canAffectRules: false,
    canAffectStrategy: false,
    promotionEligible: false,
    trainingTruth: false,
  };
  return hashEnvelope(body, "receiptHash");
}

async function executeModelRole(node, context, executeRole) {
  const request = createRoleRequest(node, context);
  const exposedContext = node.contextRoles.map((role) => context.receiptByRole.get(role));
  const rawOutput = await executeRole(freeze({
    request,
    stagedInput: context.stagedInput,
    contextReceipts: exposedContext,
  }));
  const output = normalizeRoleOutput(node.role, rawOutput, context);
  return createRoleReceipt(node, request, output, context);
}

async function executeFactJudge(node, context, judgeClaim) {
  const request = createRoleRequest(node, context);
  const claims = claimIdsFromReceipts([...context.receiptByRole.values()]);
  const unique = new Map();
  for (const claim of claims) {
    const existing = unique.get(claim.claimId);
    if (existing) fail("TEACH_CTX2SKILL_CLAIM_ID_CONFLICT", claim.claimId);
    unique.set(claim.claimId, claim);
  }
  if (unique.size === 0) fail("TEACH_CTX2SKILL_FACT_JUDGE_DENOMINATOR_EMPTY");
  const verdicts = [];
  for (const claim of unique.values()) {
    const raw = await judgeClaim(freeze({
      phase: "fact_judge",
      claim,
      stagedInput: context.stagedInput,
      currentBinding: context.currentBinding,
      request,
    }));
    verdicts.push(normalizeJudgeResult(raw, claim));
  }
  verdicts.sort((left, right) => left.claimId.localeCompare(right.claimId));
  const output = freeze({
    summary: "Independent evidence-bound fact verdicts; no model self-judgement.",
    verdicts,
    allClaimsPassed: verdicts.every((verdict) => verdict.passed),
  });
  return createRoleReceipt(node, request, output, context);
}

function createCandidate(context) {
  const generator = context.receiptByRole.get("generator");
  const proposer = context.receiptByRole.get("proposer");
  const factJudge = context.receiptByRole.get("fact_judge");
  const draft = generator.output.candidateDraft;
  const evidenceRefs = new Map();
  for (const claim of draft.claims) {
    for (const ref of claim.evidenceRefs) evidenceRefs.set(ref.evidenceId, ref);
  }
  const body = {
    schemaVersion: TEACH_CTX2SKILL_CANDIDATE_SCHEMA,
    status: "candidate_unreviewed",
    gameId: "starcraft-tmg",
    runId: context.runId,
    taskRef: taskRef(context.stagedInput),
    stagedInputHash: context.stagedInput.stagedInputHash,
    graphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    currentBinding: context.currentBinding,
    skillArtifact: clone(draft),
    provenance: {
      proposerReceiptHash: proposer.receiptHash,
      generatorReceiptHash: generator.receiptHash,
      factJudgeReceiptHash: factJudge.receiptHash,
      evidenceRefs: [...evidenceRefs.values()]
        .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId)),
      correctionTargetRefs: proposer.output.revisionTargets.map((target) => ({
        targetId: target.targetId,
        targetClaimId: target.targetClaimId,
        targetClaimHash: target.targetClaimHash,
        factJudgeReceiptHash: target.factJudgeReceiptHash,
      })),
    },
    authority: {
      humanReviewed: false,
      canAffectStrategy: false,
      canAffectRules: false,
      promotionEligible: false,
      mayPublishSkill: false,
      memoryWrite: false,
      trainingTruth: false,
    },
    productionReady: false,
    trainingTruth: false,
  };
  return hashEnvelope(body, "candidateHash");
}

function normalizeCrossTimeResult(value, candidate, context, claimVerdicts) {
  assertSafeOutput(value, "TEACH_CTX2SKILL_CROSS_TIME_OUTPUT_UNSAFE");
  exactKeys(value,
    ["passed", "failureCodes", "replayedJudgeTestIds", "currentBinding",
      "evaluator"], [],
    "TEACH_CTX2SKILL_CROSS_TIME_RESULT_INVALID");
  const failureCodes = codeArray(value.failureCodes,
    "TEACH_CTX2SKILL_CROSS_TIME_FAILURE_CODES_INVALID");
  const replayedJudgeTestIds = idArray(value.replayedJudgeTestIds,
    "TEACH_CTX2SKILL_CROSS_TIME_TESTS_INVALID", { nonEmpty: true });
  const expectedTestIds = candidate.skillArtifact.judgeTests.map((test) => test.testId);
  if (typeof value.passed !== "boolean"
    || (value.passed && failureCodes.length > 0)
    || (!value.passed && failureCodes.length === 0)
    || !sameSet(replayedJudgeTestIds, expectedTestIds)
    || hashStarcraftTmgContract(value.currentBinding)
      !== hashStarcraftTmgContract(context.currentBinding)
    || claimVerdicts.some((verdict) => !verdict.passed)) {
    fail("TEACH_CTX2SKILL_CROSS_TIME_DISPOSITION_INVALID");
  }
  return freeze({
    candidateHash: candidate.candidateHash,
    claimVerdicts,
    replayedJudgeTestIds,
    currentBinding: context.currentBinding,
    passed: value.passed,
    failureCodes,
    evaluator: normalizeEvaluator(value.evaluator,
      "TEACH_CTX2SKILL_CROSS_TIME_EVALUATOR_INVALID"),
  });
}

async function executeCrossTime(node, context, candidate, judgeClaim,
  replayCandidate) {
  const request = createRoleRequest(node, context);
  const claimVerdicts = [];
  for (const claim of candidate.skillArtifact.claims) {
    const raw = await judgeClaim(freeze({
      phase: "cross_time_candidate",
      claim,
      candidate,
      stagedInput: context.stagedInput,
      currentBinding: context.currentBinding,
      request,
    }));
    claimVerdicts.push(normalizeJudgeResult(raw, claim));
  }
  const rawReplay = await replayCandidate(freeze({
    request,
    candidate,
    stagedInput: context.stagedInput,
    currentBinding: context.currentBinding,
    priorReceiptRefs: [...context.receiptByRole.values()].map((receipt) => ({
      role: receipt.role,
      receiptHash: receipt.receiptHash,
    })),
    claimVerdicts,
  }));
  const output = normalizeCrossTimeResult(rawReplay, candidate, context, claimVerdicts);
  if (!output.passed) fail("TEACH_CTX2SKILL_CROSS_TIME_GATE_REJECTED");
  return createRoleReceipt(node, request, output, context);
}

export function createTeachCtx2SkillCandidateEmitterV1(input = {}) {
  if (typeof input.emitCandidate !== "function") {
    fail("TEACH_CTX2SKILL_EMISSION_PORT_REQUIRED");
  }
  let calls = 0;
  let closed = false;
  return freeze({
    get calls() { return calls; },
    async emit(emission) {
      if (closed || calls !== 0) fail("TEACH_CTX2SKILL_EMISSION_CARDINALITY_EXCEEDED");
      assertHashEnvelope(emission, "emissionHash",
        "TEACH_CTX2SKILL_EMISSION_HASH_INVALID");
      if (emission.schemaVersion !== TEACH_CTX2SKILL_EMISSION_SCHEMA
        || emission.tool !== "emit_candidate_skill"
        || emission.cardinality?.maximum !== 1
        || emission.cardinality?.ordinal !== 1
        || emission.authority?.candidateOnly !== true
        || emission.authority?.mayPublishSkill !== false
        || emission.authority?.canAffectRules !== false
        || emission.authority?.trainingTruth !== false) {
        fail("TEACH_CTX2SKILL_EMISSION_INVALID");
      }
      calls += 1;
      const rawAck = await input.emitCandidate(emission);
      assertSafeOutput(rawAck, "TEACH_CTX2SKILL_EMISSION_ACK_UNSAFE");
      exactKeys(rawAck,
        ["schemaVersion", "accepted", "emissionId", "emissionHash",
          "candidateHash", "candidateOnly"], [],
        "TEACH_CTX2SKILL_EMISSION_ACK_INVALID");
      if (rawAck.schemaVersion !== TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA
        || rawAck.accepted !== true
        || rawAck.emissionHash !== emission.emissionHash
        || rawAck.candidateHash !== emission.candidate.candidateHash
        || rawAck.candidateOnly !== true) {
        fail("TEACH_CTX2SKILL_EMISSION_ACK_INVALID");
      }
      return hashEnvelope({
        schemaVersion: `${TEACH_CTX2SKILL_EMISSION_SCHEMA}.receipt`,
        tool: "emit_candidate_skill",
        emissionId: requiredId(rawAck.emissionId,
          "TEACH_CTX2SKILL_EMISSION_ID_INVALID"),
        emissionHash: emission.emissionHash,
        candidateHash: emission.candidate.candidateHash,
        acceptedAs: "candidate_unreviewed",
        invocationCount: calls,
        providerAttempts: 0,
        tokenUsage: {
          input: 0,
          output: 0,
          cacheHit: 0,
          cacheMiss: 0,
          total: 0,
        },
        estimatedCost: 0,
        promotionGranted: false,
        canAffectRules: false,
        trainingTruth: false,
      }, "receiptHash");
    },
    close() {
      if (calls !== 1) fail("TEACH_CTX2SKILL_EMISSION_CARDINALITY_INVALID");
      closed = true;
      return true;
    },
  });
}

function appendReceipt(context, receipt) {
  assertHashEnvelope(receipt, "receiptHash", "TEACH_CTX2SKILL_ROLE_RECEIPT_HASH_INVALID");
  context.receiptByNode.set(receipt.nodeId, receipt);
  context.receiptByRole.set(receipt.role, receipt);
  context.receipts.push(receipt);
}

function assertCandidateClaim(claim, stagedInput) {
  exactKeys(claim,
    ["claimId", "claimType", "statement", "evidenceRefs", "advisoryOnly",
      "supersedesClaimId", "correctionTargetId", "claimHash"], [],
    "TEACH_CTX2SKILL_CANDIDATE_CLAIM_INVALID");
  assertHashEnvelope(claim, "claimHash", "TEACH_CTX2SKILL_CANDIDATE_CLAIM_HASH_INVALID");
  requiredId(claim.claimId, "TEACH_CTX2SKILL_CANDIDATE_CLAIM_ID_INVALID");
  requiredString(claim.statement, "TEACH_CTX2SKILL_CANDIDATE_CLAIM_STATEMENT_INVALID");
  if (!CLAIM_TYPES.has(claim.claimType)
    || !Array.isArray(claim.evidenceRefs)
    || (claim.claimType !== "uncertainty" && claim.evidenceRefs.length === 0)
    || (["strategy", "uncertainty"].includes(claim.claimType)
      && claim.advisoryOnly !== true)
    || (["source_fact", "legality"].includes(claim.claimType)
      && claim.advisoryOnly !== false)
    || (claim.supersedesClaimId === null) !== (claim.correctionTargetId === null)) {
    fail("TEACH_CTX2SKILL_CANDIDATE_CLAIM_INVALID", String(claim.claimId || ""));
  }
  const byId = evidenceIndex(stagedInput);
  for (const ref of claim.evidenceRefs) {
    const row = byId.get(ref.evidenceId);
    if (!row || hashStarcraftTmgContract(ref) !== hashStarcraftTmgContract(evidenceRef(row))) {
      fail("TEACH_CTX2SKILL_CANDIDATE_EVIDENCE_REF_INVALID", claim.claimId);
    }
  }
  if (claim.claimType === "legality" && !claim.evidenceRefs.some((ref) => (
    ["current_rule_atom", "current_rule_index"].includes(ref.kind)
    && ref.rulesReceiptHash === stagedInput.bindings.rules.receiptHash
  ))) fail("TEACH_CTX2SKILL_CANDIDATE_RULES_RECEIPT_REQUIRED", claim.claimId);
}

export function verifyTeachCtx2SkillCandidateV1(candidate, stagedInput) {
  verifyCurrentOfficialSkillStagedInputV1(stagedInput);
  exactKeys(candidate,
    ["schemaVersion", "status", "gameId", "runId", "taskRef",
      "stagedInputHash", "graphHash", "currentBinding", "skillArtifact",
      "provenance", "authority", "productionReady", "trainingTruth",
      "candidateHash"], [],
    "TEACH_CTX2SKILL_CANDIDATE_INVALID");
  assertHashEnvelope(candidate, "candidateHash", "TEACH_CTX2SKILL_CANDIDATE_HASH_INVALID");
  exactKeys(candidate.taskRef, ["taskId", "taskHash", "family", "subjectId"], [],
    "TEACH_CTX2SKILL_CANDIDATE_TASK_REF_INVALID");
  exactKeys(candidate.authority,
    ["humanReviewed", "canAffectStrategy", "canAffectRules",
      "promotionEligible", "mayPublishSkill", "memoryWrite", "trainingTruth"], [],
    "TEACH_CTX2SKILL_CANDIDATE_AUTHORITY_INVALID");
  if (candidate.schemaVersion !== TEACH_CTX2SKILL_CANDIDATE_SCHEMA
    || candidate.status !== "candidate_unreviewed"
    || candidate.gameId !== "starcraft-tmg"
    || candidate.stagedInputHash !== stagedInput.stagedInputHash
    || candidate.graphHash !== TEACH_CTX2SKILL_ROLE_GRAPH_HASH
    || hashStarcraftTmgContract(candidate.taskRef)
      !== hashStarcraftTmgContract(taskRef(stagedInput))
    || hashStarcraftTmgContract(candidate.currentBinding)
      !== hashStarcraftTmgContract(currentBindingFrom(stagedInput))
    || candidate.authority?.humanReviewed !== false
    || candidate.authority?.canAffectStrategy !== false
    || candidate.authority?.canAffectRules !== false
    || candidate.authority?.promotionEligible !== false
    || candidate.authority?.mayPublishSkill !== false
    || candidate.authority?.memoryWrite !== false
    || candidate.authority?.trainingTruth !== false
    || candidate.productionReady !== false
    || candidate.trainingTruth !== false) {
    fail("TEACH_CTX2SKILL_CANDIDATE_INVALID");
  }
  const artifact = candidate.skillArtifact;
  exactKeys(artifact,
    ["skillId", "version", "skillType", "title", "summary", "claims",
      "procedure", "legalityChecks", "illegalPatterns", "examples",
      "counterExamples", "judgeTests", "unresolvedClaims"], [],
    "TEACH_CTX2SKILL_CANDIDATE_ARTIFACT_INVALID");
  requiredId(artifact.skillId, "TEACH_CTX2SKILL_CANDIDATE_SKILL_ID_INVALID");
  requiredString(artifact.version, "TEACH_CTX2SKILL_CANDIDATE_VERSION_INVALID", 64);
  requiredString(artifact.title, "TEACH_CTX2SKILL_CANDIDATE_TITLE_INVALID", 256);
  requiredString(artifact.summary, "TEACH_CTX2SKILL_CANDIDATE_SUMMARY_INVALID");
  if (!object(artifact) || !SKILL_TYPES.has(artifact.skillType)
    || !Array.isArray(artifact.claims) || artifact.claims.length === 0
    || !Array.isArray(artifact.judgeTests) || artifact.judgeTests.length < 2
    || !artifact.judgeTests.some((test) => test.expected === "pass")
    || !artifact.judgeTests.some((test) => test.expected === "reject")
    || !Array.isArray(artifact.unresolvedClaims)) {
    fail("TEACH_CTX2SKILL_CANDIDATE_ARTIFACT_INVALID");
  }
  for (const claim of artifact.claims) assertCandidateClaim(claim, stagedInput);
  const claimIds = artifact.claims.map((claim) => claim.claimId);
  if (new Set(claimIds).size !== claimIds.length) {
    fail("TEACH_CTX2SKILL_CANDIDATE_CLAIM_ID_DUPLICATE");
  }
  normalizeJudgeTests(artifact.judgeTests, new Set(claimIds));
  for (const [field, nonEmpty] of [
    ["procedure", true],
    ["legalityChecks", true],
    ["illegalPatterns", true],
    ["examples", false],
    ["counterExamples", false],
  ]) {
    stringArray(artifact[field], "TEACH_CTX2SKILL_CANDIDATE_ARTIFACT_INVALID", {
      nonEmpty,
    });
  }
  const unresolvedIds = new Set();
  for (const item of artifact.unresolvedClaims) {
    exactKeys(item, ["unresolvedId", "targetClaimId", "failureCodes", "summary"], [],
      "TEACH_CTX2SKILL_CANDIDATE_UNRESOLVED_INVALID");
    const unresolvedId = requiredId(item.unresolvedId,
      "TEACH_CTX2SKILL_CANDIDATE_UNRESOLVED_ID_INVALID");
    if (unresolvedIds.has(unresolvedId)) {
      fail("TEACH_CTX2SKILL_CANDIDATE_UNRESOLVED_ID_DUPLICATE");
    }
    unresolvedIds.add(unresolvedId);
    requiredId(item.targetClaimId,
      "TEACH_CTX2SKILL_CANDIDATE_UNRESOLVED_TARGET_INVALID");
    codeArray(item.failureCodes,
      "TEACH_CTX2SKILL_CANDIDATE_UNRESOLVED_FAILURE_INVALID", { nonEmpty: true });
    requiredString(item.summary,
      "TEACH_CTX2SKILL_CANDIDATE_UNRESOLVED_SUMMARY_INVALID");
  }
  const evidenceRefs = new Map();
  for (const claim of artifact.claims) {
    for (const ref of claim.evidenceRefs) evidenceRefs.set(ref.evidenceId, ref);
  }
  if (hashStarcraftTmgContract(candidate.provenance?.evidenceRefs)
    !== hashStarcraftTmgContract([...evidenceRefs.values()]
      .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId)))) {
    fail("TEACH_CTX2SKILL_CANDIDATE_PROVENANCE_INVALID");
  }
  exactKeys(candidate.provenance,
    ["proposerReceiptHash", "generatorReceiptHash", "factJudgeReceiptHash",
      "evidenceRefs", "correctionTargetRefs"], [],
    "TEACH_CTX2SKILL_CANDIDATE_PROVENANCE_INVALID");
  for (const field of [
    "proposerReceiptHash",
    "generatorReceiptHash",
    "factJudgeReceiptHash",
  ]) {
    if (!HASH_PATTERN.test(String(candidate.provenance?.[field] || ""))) {
      fail("TEACH_CTX2SKILL_CANDIDATE_PROVENANCE_INVALID", field);
    }
  }
  if (!Array.isArray(candidate.provenance.correctionTargetRefs)) {
    fail("TEACH_CTX2SKILL_CANDIDATE_PROVENANCE_INVALID", "correctionTargetRefs");
  }
  for (const ref of candidate.provenance.correctionTargetRefs) {
    exactKeys(ref,
      ["targetId", "targetClaimId", "targetClaimHash", "factJudgeReceiptHash"], [],
      "TEACH_CTX2SKILL_CANDIDATE_CORRECTION_REF_INVALID");
    requiredId(ref.targetId, "TEACH_CTX2SKILL_CANDIDATE_CORRECTION_REF_INVALID");
    requiredId(ref.targetClaimId, "TEACH_CTX2SKILL_CANDIDATE_CORRECTION_REF_INVALID");
    if (!HASH_PATTERN.test(ref.targetClaimHash)
      || ref.factJudgeReceiptHash !== candidate.provenance.factJudgeReceiptHash) {
      fail("TEACH_CTX2SKILL_CANDIDATE_CORRECTION_REF_INVALID");
    }
  }
  return true;
}

function verifyStoredFactJudgeOutput(output, context) {
  exactKeys(output, ["summary", "verdicts", "allClaimsPassed"], [],
    "TEACH_CTX2SKILL_STORED_FACT_JUDGE_INVALID");
  const claims = new Map();
  for (const claim of claimIdsFromReceipts([...context.receiptByRole.values()])) {
    if (claims.has(claim.claimId)) {
      fail("TEACH_CTX2SKILL_CLAIM_ID_CONFLICT", claim.claimId);
    }
    claims.set(claim.claimId, claim);
  }
  if (!Array.isArray(output.verdicts)
    || output.verdicts.length !== claims.size
    || !sameSet(output.verdicts.map((verdict) => verdict.claimId), [...claims.keys()])) {
    fail("TEACH_CTX2SKILL_STORED_FACT_JUDGE_DENOMINATOR_INVALID");
  }
  for (const verdict of output.verdicts) {
    const claim = claims.get(verdict.claimId);
    const normalized = normalizeJudgeResult({
      passed: verdict.passed,
      failureCodes: verdict.failureCodes,
      findingCodes: verdict.findingCodes,
      evaluator: verdict.evaluator,
    }, claim);
    if (hashStarcraftTmgContract(normalized) !== hashStarcraftTmgContract(verdict)) {
      fail("TEACH_CTX2SKILL_STORED_FACT_JUDGE_VERDICT_INVALID", verdict.claimId);
    }
  }
  if (output.allClaimsPassed !== output.verdicts.every((verdict) => verdict.passed)) {
    fail("TEACH_CTX2SKILL_STORED_FACT_JUDGE_DISPOSITION_INVALID");
  }
  return freeze(clone(output));
}

function verifyStoredCrossTimeOutput(output, candidate, context) {
  exactKeys(output,
    ["candidateHash", "claimVerdicts", "replayedJudgeTestIds", "currentBinding",
      "passed", "failureCodes", "evaluator"], [],
    "TEACH_CTX2SKILL_STORED_CROSS_TIME_INVALID");
  const failureCodes = codeArray(output.failureCodes,
    "TEACH_CTX2SKILL_STORED_CROSS_TIME_FAILURE_CODES_INVALID");
  const replayedJudgeTestIds = idArray(output.replayedJudgeTestIds,
    "TEACH_CTX2SKILL_STORED_CROSS_TIME_TESTS_INVALID", { nonEmpty: true });
  if (!Array.isArray(output.claimVerdicts)
    || output.candidateHash !== candidate.candidateHash
    || output.passed !== true
    || failureCodes.length !== 0
    || hashStarcraftTmgContract(output.currentBinding)
      !== hashStarcraftTmgContract(context.currentBinding)
    || !sameSet(replayedJudgeTestIds,
      candidate.skillArtifact.judgeTests.map((test) => test.testId))
    || !sameSet(output.claimVerdicts.map((verdict) => verdict.claimId),
      candidate.skillArtifact.claims.map((claim) => claim.claimId))) {
    fail("TEACH_CTX2SKILL_STORED_CROSS_TIME_DISPOSITION_INVALID");
  }
  for (const verdict of output.claimVerdicts) {
    const claim = candidate.skillArtifact.claims.find((row) => (
      row.claimId === verdict.claimId
    ));
    const normalized = normalizeJudgeResult({
      passed: verdict.passed,
      failureCodes: verdict.failureCodes,
      findingCodes: verdict.findingCodes,
      evaluator: verdict.evaluator,
    }, claim);
    if (!verdict.passed
      || hashStarcraftTmgContract(normalized) !== hashStarcraftTmgContract(verdict)) {
      fail("TEACH_CTX2SKILL_STORED_CROSS_TIME_VERDICT_INVALID", verdict.claimId);
    }
  }
  normalizeEvaluator(output.evaluator,
    "TEACH_CTX2SKILL_STORED_CROSS_TIME_EVALUATOR_INVALID");
  return freeze(clone(output));
}

function rawClaimFromStored(claim) {
  return {
    claimId: claim.claimId,
    claimType: claim.claimType,
    statement: claim.statement,
    evidenceIds: claim.evidenceRefs.map((ref) => ref.evidenceId),
    advisoryOnly: claim.advisoryOnly,
    ...(claim.supersedesClaimId === null
      ? {}
      : {
          supersedesClaimId: claim.supersedesClaimId,
          correctionTargetId: claim.correctionTargetId,
        }),
  };
}

function rawModelOutputFromStored(role, output) {
  const raw = clone(output);
  if (["tutor", "student", "reasoner", "generator"].includes(role)) {
    raw.claims = output.claims.map(rawClaimFromStored);
  }
  if (role === "generator") {
    raw.candidateDraft = {
      ...clone(output.candidateDraft),
      claimIds: output.candidateDraft.claims.map((claim) => claim.claimId),
    };
    delete raw.candidateDraft.claims;
  }
  return raw;
}

export function verifyTeachCtx2SkillRunResultV1(result, stagedInput) {
  verifyTeachCtx2SkillRoleGraphV1();
  verifyCurrentOfficialSkillStagedInputV1(stagedInput);
  exactKeys(result,
    ["schemaVersion", "runId", "gameId", "taskRef", "stagedInputHash",
      "graphHash", "disposition", "roleReceipts", "candidate",
      "emissionReceipt", "counts", "sourceRefreshPerformed", "dshUsed",
      "modelUsed", "humanReviewed", "canAffectStrategy", "canAffectRules",
      "promotionEligible", "productionReady", "trainingTruth", "runHash"], [],
    "TEACH_CTX2SKILL_RUN_INVALID");
  assertHashEnvelope(result, "runHash", "TEACH_CTX2SKILL_RUN_HASH_INVALID");
  if (result.schemaVersion !== TEACH_CTX2SKILL_RUN_RESULT_SCHEMA
    || result.gameId !== "starcraft-tmg"
    || result.stagedInputHash !== stagedInput.stagedInputHash
    || result.graphHash !== TEACH_CTX2SKILL_ROLE_GRAPH_HASH
    || result.disposition !== "candidate_unreviewed_emitted"
    || !Array.isArray(result.roleReceipts) || result.roleReceipts.length !== 9
    || result.sourceRefreshPerformed !== false
    || result.dshUsed !== false || result.modelUsed !== false
    || result.humanReviewed !== false
    || result.canAffectStrategy !== false || result.canAffectRules !== false
    || result.promotionEligible !== false || result.productionReady !== false
    || result.trainingTruth !== false) {
    fail("TEACH_CTX2SKILL_RUN_INVALID");
  }
  const context = {
    runId: result.runId,
    stagedInput,
    currentBinding: currentBindingFrom(stagedInput),
    evidenceById: evidenceIndex(stagedInput),
    receiptByNode: new Map(),
    receiptByRole: new Map(),
    receipts: [],
  };
  let candidate = null;
  for (let index = 0; index < ROLE_NODES.length; index += 1) {
    const node = ROLE_NODES[index];
    const receipt = result.roleReceipts[index];
    exactKeys(receipt,
      ["schemaVersion", "runId", "nodeId", "role", "phase",
        "sequenceIndex", "executorKind", "graphHash", "taskRef",
        "stagedInputHash", "currentBinding", "requestHash",
        "parentReceiptHashes", "output", "outputHash",
        "rawReasoningPersisted", "canAffectRules", "canAffectStrategy",
        "promotionEligible", "trainingTruth", "receiptHash"], [],
      "TEACH_CTX2SKILL_ROLE_RECEIPT_INVALID");
    assertHashEnvelope(receipt, "receiptHash",
      "TEACH_CTX2SKILL_ROLE_RECEIPT_HASH_INVALID");
    const request = createRoleRequest(node, context);
    if (receipt.schemaVersion !== TEACH_CTX2SKILL_ROLE_RECEIPT_SCHEMA
      || receipt.runId !== result.runId
      || receipt.nodeId !== node.nodeId || receipt.role !== node.role
      || receipt.phase !== node.phase || receipt.sequenceIndex !== index
      || receipt.executorKind !== node.executorKind
      || receipt.graphHash !== TEACH_CTX2SKILL_ROLE_GRAPH_HASH
      || receipt.stagedInputHash !== stagedInput.stagedInputHash
      || receipt.requestHash !== request.requestHash
      || hashStarcraftTmgContract(receipt.parentReceiptHashes)
        !== hashStarcraftTmgContract(request.directParents
          .map((parent) => parent.receiptHash))
      || receipt.outputHash !== hashStarcraftTmgContract(receipt.output)
      || receipt.rawReasoningPersisted !== false
      || receipt.canAffectRules !== false || receipt.canAffectStrategy !== false
      || receipt.promotionEligible !== false || receipt.trainingTruth !== false) {
      fail("TEACH_CTX2SKILL_ROLE_RECEIPT_INVALID", node.role);
    }
    let normalized;
    if (node.executorKind === "bounded_role_executor") {
      normalized = normalizeRoleOutput(node.role,
        rawModelOutputFromStored(node.role, receipt.output), context);
    } else if (node.role === "fact_judge") {
      normalized = verifyStoredFactJudgeOutput(receipt.output, context);
    } else {
      if (!candidate) fail("TEACH_CTX2SKILL_STORED_CANDIDATE_MISSING");
      normalized = verifyStoredCrossTimeOutput(receipt.output, candidate, context);
    }
    if (hashStarcraftTmgContract(normalized) !== receipt.outputHash) {
      fail("TEACH_CTX2SKILL_ROLE_OUTPUT_HASH_INVALID", node.role);
    }
    appendReceipt(context, receipt);
    if (node.role === "generator") {
      candidate = createCandidate(context);
      if (candidate.candidateHash !== result.candidate?.candidateHash) {
        fail("TEACH_CTX2SKILL_CANDIDATE_RECONSTRUCTION_INVALID");
      }
    }
  }
  verifyTeachCtx2SkillCandidateV1(result.candidate, stagedInput);
  const factJudge = context.receiptByRole.get("fact_judge");
  const proposer = context.receiptByRole.get("proposer");
  const generator = context.receiptByRole.get("generator");
  const crossTime = context.receiptByRole.get("cross_time_gate");
  if (result.candidate.provenance.factJudgeReceiptHash !== factJudge.receiptHash
    || result.candidate.provenance.proposerReceiptHash !== proposer.receiptHash
    || result.candidate.provenance.generatorReceiptHash !== generator.receiptHash) {
    fail("TEACH_CTX2SKILL_CANDIDATE_ROLE_LINEAGE_INVALID");
  }
  assertHashEnvelope(result.emissionReceipt, "receiptHash",
    "TEACH_CTX2SKILL_EMISSION_RECEIPT_HASH_INVALID");
  exactKeys(result.emissionReceipt,
    ["schemaVersion", "tool", "emissionId", "emissionHash", "candidateHash",
      "acceptedAs", "invocationCount", "providerAttempts", "tokenUsage",
      "estimatedCost", "promotionGranted", "canAffectRules", "trainingTruth",
      "receiptHash"], [],
    "TEACH_CTX2SKILL_EMISSION_RECEIPT_INVALID");
  if (result.emissionReceipt.tool !== "emit_candidate_skill"
    || result.emissionReceipt.candidateHash !== result.candidate.candidateHash
    || result.emissionReceipt.acceptedAs !== "candidate_unreviewed"
    || result.emissionReceipt.invocationCount !== 1
    || result.emissionReceipt.providerAttempts !== 0
    || result.emissionReceipt.tokenUsage?.input !== 0
    || result.emissionReceipt.tokenUsage?.output !== 0
    || result.emissionReceipt.tokenUsage?.cacheHit !== 0
    || result.emissionReceipt.tokenUsage?.cacheMiss !== 0
    || result.emissionReceipt.tokenUsage?.total !== 0
    || result.emissionReceipt.estimatedCost !== 0
    || result.emissionReceipt.promotionGranted !== false
    || result.emissionReceipt.canAffectRules !== false
    || result.emissionReceipt.trainingTruth !== false
    || result.counts?.graphNodes !== 9
    || result.counts?.boundedRoleExecutions !== 7
    || result.counts?.deterministicGateExecutions !== 2
    || result.counts?.candidateEmissions !== 1
    || result.counts?.providerAttempts !== 0
    || result.counts?.inputTokens !== 0
    || result.counts?.outputTokens !== 0
    || result.counts?.totalTokens !== 0
    || result.counts?.estimatedCostCny !== 0
    || result.counts?.promotions !== 0
    || crossTime.output.candidateHash !== result.candidate.candidateHash) {
    fail("TEACH_CTX2SKILL_RUN_CLOSURE_INVALID");
  }
  return true;
}

export async function runTeachCtx2SkillRoleGraphV1(input = {}) {
  verifyTeachCtx2SkillRoleGraphV1();
  verifyCurrentOfficialSkillStagedInputV1(input.stagedInput);
  if (typeof input.executeRole !== "function") fail("TEACH_CTX2SKILL_ROLE_EXECUTOR_REQUIRED");
  if (typeof input.judgeClaim !== "function") fail("TEACH_CTX2SKILL_FACT_JUDGE_PORT_REQUIRED");
  if (typeof input.replayCandidate !== "function") fail("TEACH_CTX2SKILL_CROSS_TIME_PORT_REQUIRED");
  const runId = requiredId(input.runId, "TEACH_CTX2SKILL_RUN_ID_INVALID");
  const context = {
    runId,
    stagedInput: input.stagedInput,
    currentBinding: currentBindingFrom(input.stagedInput),
    evidenceById: evidenceIndex(input.stagedInput),
    receiptByNode: new Map(),
    receiptByRole: new Map(),
    receipts: [],
  };
  let candidate = null;
  for (const node of ROLE_NODES) {
    let receipt;
    if (node.executorKind === "bounded_role_executor") {
      receipt = await executeModelRole(node, context, input.executeRole);
      appendReceipt(context, receipt);
      if (node.role === "generator") candidate = createCandidate(context);
    } else if (node.executorKind === "deterministic_fact_judge") {
      receipt = await executeFactJudge(node, context, input.judgeClaim);
      appendReceipt(context, receipt);
    } else if (node.executorKind === "deterministic_cross_time_gate") {
      receipt = await executeCrossTime(node, context, candidate,
        input.judgeClaim, input.replayCandidate);
      appendReceipt(context, receipt);
    } else {
      fail("TEACH_CTX2SKILL_EXECUTOR_KIND_INVALID", node.executorKind);
    }
  }
  const crossTime = context.receiptByRole.get("cross_time_gate");
  const emission = hashEnvelope({
    schemaVersion: TEACH_CTX2SKILL_EMISSION_SCHEMA,
    tool: "emit_candidate_skill",
    runId,
    taskRef: taskRef(input.stagedInput),
    graphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    stagedInputHash: input.stagedInput.stagedInputHash,
    candidate,
    gateRefs: {
      factJudgeReceiptHash: context.receiptByRole.get("fact_judge").receiptHash,
      crossTimeReceiptHash: crossTime.receiptHash,
    },
    cardinality: { maximum: 1, ordinal: 1 },
    authority: {
      candidateOnly: true,
      mayPublishSkill: false,
      canAffectStrategy: false,
      canAffectRules: false,
      promotionEligible: false,
      trainingTruth: false,
    },
  }, "emissionHash");
  const emitter = createTeachCtx2SkillCandidateEmitterV1({
    emitCandidate: input.emitCandidate,
  });
  const emissionReceipt = await emitter.emit(emission);
  emitter.close();
  const body = {
    schemaVersion: TEACH_CTX2SKILL_RUN_RESULT_SCHEMA,
    runId,
    gameId: "starcraft-tmg",
    taskRef: taskRef(input.stagedInput),
    stagedInputHash: input.stagedInput.stagedInputHash,
    graphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    disposition: "candidate_unreviewed_emitted",
    roleReceipts: context.receipts,
    candidate,
    emissionReceipt,
    counts: {
      graphNodes: context.receipts.length,
      boundedRoleExecutions: context.receipts.filter((receipt) => (
        receipt.executorKind === "bounded_role_executor"
      )).length,
      deterministicGateExecutions: context.receipts.filter((receipt) => (
        receipt.executorKind !== "bounded_role_executor"
      )).length,
      candidateEmissions: emitter.calls,
      providerAttempts: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostCny: 0,
      promotions: 0,
    },
    sourceRefreshPerformed: false,
    dshUsed: false,
    modelUsed: false,
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    promotionEligible: false,
    productionReady: false,
    trainingTruth: false,
  };
  return hashEnvelope(body, "runHash");
}
