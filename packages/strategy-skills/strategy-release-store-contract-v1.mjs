import {
  clone,
  fail,
  freeze,
  hash,
  seal,
  verifySeal,
} from "../skill-production/common.mjs";

export const STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION =
  "starcraft_tmg_strategy_release_store_v1";

export const STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS = Object.freeze([
  "initialize",
  "putArtifact",
  "getArtifact",
  "createJob",
  "acquireLease",
  "completeJob",
  "recoverExpiredLeases",
  "getJob",
  "health",
  "close",
]);

const ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function identifier(value, field) {
  const normalized = String(value || "").trim();
  if (!ID.test(normalized)) fail("STRATEGY_RELEASE_ID_INVALID", { field });
  return normalized;
}

function digest(value, field) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!SHA256.test(normalized)) fail("STRATEGY_RELEASE_HASH_INVALID", { field });
  return normalized;
}

function instant(value, field) {
  let normalized;
  try {
    normalized = new Date(value).toISOString();
  } catch {
    fail("STRATEGY_RELEASE_TIME_INVALID", { field });
  }
  if (normalized !== value) fail("STRATEGY_RELEASE_TIME_INVALID", { field });
  return normalized;
}

function revision(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("STRATEGY_RELEASE_REVISION_INVALID", { field });
  }
  return value;
}

function hashList(value, field) {
  if (!Array.isArray(value) || new Set(value).size !== value.length) {
    fail("STRATEGY_RELEASE_HASH_LIST_INVALID", { field });
  }
  return value.map((entry) => digest(entry, field));
}

export function assertStarcraftTmgStrategyReleaseStoreV1(store) {
  for (const method of STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS) {
    if (typeof store?.[method] !== "function") {
      fail("STRATEGY_RELEASE_STORE_METHOD_MISSING", { method });
    }
  }
  return store;
}

export function createStarcraftTmgStrategyReleaseStoreV1(options = {}) {
  const port = options.port;
  if (!port || [
    "initialize",
    "transaction",
    "getArtifact",
    "insertArtifact",
    "getJob",
    "insertJob",
    "updateJob",
    "listExpiredJobs",
    "health",
    "close",
  ].some((method) => typeof port[method] !== "function")) {
    fail("STRATEGY_RELEASE_STORE_PORT_INVALID");
  }
  let closed = false;
  let initialized = false;

  function assertOpen() {
    if (closed) fail("STRATEGY_RELEASE_STORE_CLOSED");
  }

  async function ensureInitialized() {
    assertOpen();
    if (!initialized) {
      await port.initialize();
      initialized = true;
    }
  }

  async function initialize() {
    await ensureInitialized();
    return health();
  }

  async function putArtifact(input = {}) {
    await ensureInitialized();
    const artifactId = identifier(input.artifactId, "artifactId");
    const kind = identifier(input.kind, "kind");
    const artifact = verifySeal(clone(input.artifact));
    const expectedHash = digest(input.expectedHash, "expectedHash");
    const createdAt = instant(input.createdAt, "createdAt");
    if (artifact.hash !== expectedHash) {
      fail("STRATEGY_RELEASE_ARTIFACT_HASH_MISMATCH", { artifactId });
    }
    const record = seal({
      schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.artifact-record`,
      artifactId,
      kind,
      artifactHash: artifact.hash,
      createdAt,
      immutable: true,
      runtimeAccepted: false,
      trainingTruth: false,
    });
    return port.transaction(async (tx) => {
      const existing = await port.getArtifact(tx, artifactId, true);
      if (existing) {
        if (existing.record.hash !== record.hash
          || existing.artifact.hash !== artifact.hash) {
          fail("STRATEGY_RELEASE_ARTIFACT_IDEMPOTENCY_CONFLICT", { artifactId });
        }
        return seal({
          schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.put-artifact-result`,
          record: existing.record,
          cached: true,
          trainingTruth: false,
        });
      }
      await port.insertArtifact(tx, { record, artifact });
      return seal({
        schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.put-artifact-result`,
        record,
        cached: false,
        trainingTruth: false,
      });
    });
  }

  async function getArtifact(artifactIdValue) {
    await ensureInitialized();
    const artifactId = identifier(artifactIdValue, "artifactId");
    const row = await port.getArtifact(null, artifactId, false);
    if (!row) return null;
    verifySeal(row.record);
    verifySeal(row.artifact);
    if (row.record.artifactHash !== row.artifact.hash
      || row.record.artifactId !== artifactId) {
      fail("STRATEGY_RELEASE_ARTIFACT_ROW_DRIFT", { artifactId });
    }
    return freeze(clone(row));
  }

  async function createJob(input = {}) {
    await ensureInitialized();
    const body = {
      schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.job`,
      jobId: identifier(input.jobId, "jobId"),
      inputHash: digest(input.inputHash, "inputHash"),
      budgetRefHash: digest(input.budgetRefHash, "budgetRefHash"),
      status: "queued",
      revision: 0,
      fence: 0,
      leaseOwnerId: null,
      leaseExpiresAt: null,
      outputArtifactHashes: [],
      attemptRefHashes: [],
      createdAt: instant(input.createdAt, "createdAt"),
      completedAt: null,
      runtimeAccepted: false,
      trainingTruth: false,
    };
    const job = seal(body);
    return port.transaction(async (tx) => {
      const existing = await port.getJob(tx, job.jobId, true);
      if (existing) {
        if (existing.inputHash !== job.inputHash
          || existing.budgetRefHash !== job.budgetRefHash
          || existing.createdAt !== job.createdAt) {
          fail("STRATEGY_RELEASE_JOB_IDEMPOTENCY_CONFLICT", { jobId: job.jobId });
        }
        return seal({
          schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.create-job-result`,
          job: existing,
          cached: true,
          trainingTruth: false,
        });
      }
      await port.insertJob(tx, job);
      return seal({
        schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.create-job-result`,
        job,
        cached: false,
        trainingTruth: false,
      });
    });
  }

  async function acquireLease(input = {}) {
    await ensureInitialized();
    const jobId = identifier(input.jobId, "jobId");
    const ownerId = identifier(input.ownerId, "ownerId");
    const expectedRevision = revision(input.expectedRevision, "expectedRevision");
    const acquiredAt = instant(input.acquiredAt, "acquiredAt");
    const expiresAt = instant(input.expiresAt, "expiresAt");
    if (expiresAt <= acquiredAt) fail("STRATEGY_RELEASE_LEASE_INTERVAL_INVALID");
    return port.transaction(async (tx) => {
      const current = await port.getJob(tx, jobId, true);
      if (!current) fail("STRATEGY_RELEASE_JOB_NOT_FOUND", { jobId });
      if (current.revision !== expectedRevision) {
        fail("STRATEGY_RELEASE_JOB_CAS_CONFLICT", { jobId });
      }
      if (current.status !== "queued") {
        fail("STRATEGY_RELEASE_JOB_NOT_QUEUED", { jobId });
      }
      const next = seal({
        ...Object.fromEntries(Object.entries(current)
          .filter(([key]) => key !== "hash")),
        status: "running",
        revision: current.revision + 1,
        fence: current.fence + 1,
        leaseOwnerId: ownerId,
        leaseExpiresAt: expiresAt,
      });
      await port.updateJob(tx, current, next);
      return seal({
        schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.lease-result`,
        job: next,
        acquiredAt,
        trainingTruth: false,
      });
    });
  }

  async function completeJob(input = {}) {
    await ensureInitialized();
    const jobId = identifier(input.jobId, "jobId");
    const ownerId = identifier(input.ownerId, "ownerId");
    const expectedRevision = revision(input.expectedRevision, "expectedRevision");
    const fence = revision(input.fence, "fence");
    const completedAt = instant(input.completedAt, "completedAt");
    const outputArtifactHashes = hashList(input.outputArtifactHashes,
      "outputArtifactHashes");
    const attemptRefHashes = hashList(input.attemptRefHashes,
      "attemptRefHashes");
    if (!outputArtifactHashes.length) {
      fail("STRATEGY_RELEASE_JOB_OUTPUT_REQUIRED", { jobId });
    }
    return port.transaction(async (tx) => {
      const current = await port.getJob(tx, jobId, true);
      if (!current) fail("STRATEGY_RELEASE_JOB_NOT_FOUND", { jobId });
      if (current.status !== "running"
        || current.revision !== expectedRevision
        || current.fence !== fence
        || current.leaseOwnerId !== ownerId
        || current.leaseExpiresAt <= completedAt) {
        fail("STRATEGY_RELEASE_JOB_LEASE_STALE", { jobId });
      }
      for (const artifactHash of outputArtifactHashes) {
        const row = await port.getArtifact(tx, artifactHash, false, true);
        if (!row) fail("STRATEGY_RELEASE_JOB_OUTPUT_MISSING", { artifactHash });
      }
      const next = seal({
        ...Object.fromEntries(Object.entries(current)
          .filter(([key]) => key !== "hash")),
        status: "complete",
        revision: current.revision + 1,
        leaseOwnerId: null,
        leaseExpiresAt: null,
        outputArtifactHashes,
        attemptRefHashes,
        completedAt,
      });
      await port.updateJob(tx, current, next);
      return seal({
        schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.complete-job-result`,
        job: next,
        trainingTruth: false,
      });
    });
  }

  async function recoverExpiredLeases(input = {}) {
    await ensureInitialized();
    const recoveredAt = instant(input.recoveredAt, "recoveredAt");
    return port.transaction(async (tx) => {
      const expired = await port.listExpiredJobs(tx, recoveredAt);
      const recovered = [];
      for (const current of expired) {
        const next = seal({
          ...Object.fromEntries(Object.entries(current)
            .filter(([key]) => key !== "hash")),
          status: "queued",
          revision: current.revision + 1,
          leaseOwnerId: null,
          leaseExpiresAt: null,
        });
        await port.updateJob(tx, current, next);
        recovered.push(next);
      }
      return seal({
        schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.recovery-result`,
        recoveredAt,
        recoveredJobIds: recovered.map((job) => job.jobId),
        recoveredJobHashes: recovered.map((job) => job.hash),
        recoveryCount: recovered.length,
        providerAttemptsRetried: 0,
        trainingTruth: false,
      });
    });
  }

  async function getJob(jobIdValue) {
    await ensureInitialized();
    const jobId = identifier(jobIdValue, "jobId");
    const job = await port.getJob(null, jobId, false);
    if (!job) return null;
    verifySeal(job);
    return freeze(clone(job));
  }

  async function health() {
    await ensureInitialized();
    const adapter = await port.health();
    return seal({
      schema: `${STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION}.health`,
      storeVersion: STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION,
      adapter,
      durable: true,
      automaticProviderRetry: false,
      trainingTruth: false,
    });
  }

  async function close() {
    if (!closed) {
      await port.close();
      closed = true;
    }
    return freeze({ closed: true, trainingTruth: false });
  }

  return assertStarcraftTmgStrategyReleaseStoreV1(freeze({
    initialize,
    putArtifact,
    getArtifact,
    createJob,
    acquireLease,
    completeJob,
    recoverExpiredLeases,
    getJob,
    health,
    close,
  }));
}

export function hashStarcraftTmgStrategyReleaseStoreValueV1(value) {
  return hash(value);
}
