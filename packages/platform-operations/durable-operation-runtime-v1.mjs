import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_DURABLE_OPERATION_VERSION =
  "starcraft_tmg_durable_operation_runtime_v1";

const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const JOB_KINDS = new Set([
  "provider_inference", "skill_generation", "skill_review", "selfplay",
  "trajectory_export", "subject_deletion", "release_publish",
  "incident_recovery",
]);
const SECRET_KEY = /^(?:api.?key|authorization|cookie|credential(?:value|bytes|material)|secret(?:value|bytes|material)|access.?token|refresh.?token|seat.?token|bearer(?:token|value|bytes|material))$/iu;
const SECRET_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function id(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function digest(value, field) {
  const result = String(value || "").toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function time(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    throw new TypeError(`${field} is invalid`);
  }
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function noSecrets(value, path = "$", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`DURABLE_JOB_SECRET_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => noSecrets(entry, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`DURABLE_JOB_SECRET_FIELD_FORBIDDEN:${path}.${key}`);
    noSecrets(child, `${path}.${key}`, seen);
  }
}

function sealed(body) {
  const value = clone(body);
  return freeze({ ...value, hash: hashStarcraftTmgContract(value) });
}

function assertStore(store) {
  const methods = ["initialize", "putArtifact", "getArtifact", "createJob",
    "acquireLease", "completeJob", "recoverExpiredLeases", "getJob",
    "health", "close"];
  if (methods.some((method) => typeof store?.[method] !== "function")) {
    throw new TypeError("durable job store is invalid");
  }
  return store;
}

export function createStarcraftTmgDurableOperationRuntimeV1(options = {}) {
  const store = assertStore(options.jobStore);

  async function enqueue(input = {}) {
    noSecrets(input);
    const jobId = id(input.jobId, "jobId");
    const kind = id(input.kind, "kind");
    if (!JOB_KINDS.has(kind)) throw new TypeError("job kind is invalid");
    const createdAt = time(input.createdAt, "createdAt");
    const inputArtifact = sealed({
      schema: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.input`,
      jobId,
      kind,
      payloadRefHash: digest(input.payloadRefHash, "payloadRefHash"),
      principalHash: digest(input.principalHash, "principalHash"),
      environmentAssessmentHash: digest(input.environmentAssessmentHash,
        "environmentAssessmentHash"),
      retryPolicy: {
        automaticProviderRetry: false,
        unknownDeliveryRequiresExplicitApproval: kind === "provider_inference"
          || kind === "skill_generation" || kind === "skill_review",
      },
      createdAt,
      trainingTruth: false,
    });
    const inputArtifactId = `queue-input.${jobId}`;
    const stored = await store.putArtifact({ artifactId: inputArtifactId,
      kind: "durable_operation_input", artifact: inputArtifact,
      expectedHash: inputArtifact.hash, createdAt });
    const created = await store.createJob({ jobId,
      inputHash: inputArtifact.hash,
      budgetRefHash: digest(input.budgetRefHash, "budgetRefHash"),
      createdAt });
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.enqueue`,
      inputArtifactId,
      inputArtifactHash: inputArtifact.hash,
      inputCached: stored.cached,
      job: created.job,
      jobCached: created.cached,
      trainingTruth: false,
    });
  }

  async function claim(input = {}) {
    const job = await store.getJob(id(input.jobId, "jobId"));
    if (!job) throw new Error("DURABLE_JOB_NOT_FOUND");
    return store.acquireLease({ jobId: job.jobId,
      ownerId: id(input.ownerId, "ownerId"),
      expectedRevision: input.expectedRevision ?? job.revision,
      acquiredAt: time(input.acquiredAt, "acquiredAt"),
      expiresAt: time(input.expiresAt, "expiresAt") });
  }

  async function complete(input = {}) {
    noSecrets(input.output);
    const jobId = id(input.jobId, "jobId");
    const ownerId = id(input.ownerId, "ownerId");
    const completedAt = time(input.completedAt, "completedAt");
    const output = sealed({
      schema: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.output`,
      jobId,
      ownerId,
      fence: Number(input.fence),
      result: clone(input.output),
      completedAt,
      acceptedOnlyWhenJobCompletionCommits: true,
      trainingTruth: false,
    });
    const artifactId = `queue-output.${jobId}.${input.fence}.${output.hash}`;
    await store.putArtifact({ artifactId, kind: "durable_operation_output",
      artifact: output, expectedHash: output.hash, createdAt: completedAt });
    const completion = await store.completeJob({ jobId, ownerId,
      expectedRevision: Number(input.expectedRevision),
      fence: Number(input.fence), outputArtifactHashes: [output.hash],
      attemptRefHashes: (input.attemptRefHashes || []).map((entry) =>
        digest(entry, "attemptRefHashes")), completedAt });
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.completion`,
      outputArtifactId: artifactId,
      outputArtifactHash: output.hash,
      job: completion.job,
      trainingTruth: false,
    });
  }

  async function recover(input = {}) {
    return store.recoverExpiredLeases({
      recoveredAt: time(input.recoveredAt, "recoveredAt"),
    });
  }

  async function inspect(jobIdValue) {
    const jobId = id(jobIdValue, "jobId");
    const job = await store.getJob(jobId);
    const inputArtifact = await store.getArtifact(`queue-input.${jobId}`);
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.inspection`,
      job,
      inputArtifact: inputArtifact?.artifact || null,
      trainingTruth: false,
    });
  }

  async function health() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.health`,
      store: await store.health(),
      supportedJobKinds: [...JOB_KINDS].sort(),
      leaseFencing: true,
      revisionCas: true,
      durableInputReference: true,
      automaticProviderRetry: false,
      trainingTruth: false,
    });
  }

  return freeze({ version: STARCRAFT_TMG_DURABLE_OPERATION_VERSION,
    enqueue, claim, complete, recover, inspect, health });
}

function finding(code, severity, detail) {
  return { code, severity, detail,
    integrationBlocking: severity === "Critical" || severity === "High" };
}

export function assessStarcraftTmgPersistenceReadinessV1(input = {}) {
  const environment = input.environmentAssessment;
  const room = input.roomStoreHealth;
  const queue = input.queueHealth;
  const queueAdapter = queue?.store?.adapter;
  const instanceCount = Number(input.instanceCount);
  const findings = [];
  if (!object(environment) || environment.ready !== true) {
    findings.push(finding("ENVIRONMENT_NOT_READY", "High", "assessment"));
  }
  if (!object(room) || room.healthy !== true
    || !room.atomicCasContract) {
    findings.push(finding("ROOM_STORE_UNHEALTHY_OR_NO_CAS", "High", "room"));
  }
  if (!object(queue) || queue.leaseFencing !== true
    || queue.revisionCas !== true || queue.store?.durable !== true) {
    findings.push(finding("DURABLE_QUEUE_UNHEALTHY", "High", "queue"));
  }
  const productionClass = environment?.environmentClass === "production_room";
  if (productionClass) {
    if (room?.adapter !== "postgresql" || room?.productionReady !== true
      || room?.transactionIsolation
        !== "serializable_with_row_lock_and_revision_cas") {
      findings.push(finding("PRODUCTION_ROOM_POSTGRES_CAS_REQUIRED", "High",
        room?.adapter || "missing"));
    }
    if (queueAdapter?.adapter !== "postgresql"
      || queueAdapter?.transactionMode !== "serializable"
      || queueAdapter?.leaseLock !== "select_for_update") {
      findings.push(finding("PRODUCTION_QUEUE_POSTGRES_LEASE_REQUIRED", "High",
        queueAdapter?.adapter || "missing"));
    }
    if (!Number.isSafeInteger(instanceCount) || instanceCount < 2) {
      findings.push(finding("MULTI_INSTANCE_EVIDENCE_REQUIRED", "High",
        String(input.instanceCount ?? "missing")));
    }
  }
  const blocking = findings.filter((entry) => entry.integrationBlocking);
  const body = {
    schemaVersion: `${STARCRAFT_TMG_DURABLE_OPERATION_VERSION}.persistence-readiness`,
    environmentAssessmentHash: environment?.assessmentHash || null,
    environmentClass: environment?.environmentClass || null,
    roomStore: clone(room),
    queue: clone(queue),
    instanceCount: Number.isSafeInteger(instanceCount) ? instanceCount : null,
    findings,
    ready: blocking.length === 0,
    productionReady: productionClass && blocking.length === 0,
    fixtureEvidenceOnly: room?.adapter !== "postgresql"
      || queueAdapter?.adapter !== "postgresql",
    trainingTruth: false,
  };
  return freeze({ ...body, assessmentHash: hashStarcraftTmgContract(body) });
}

