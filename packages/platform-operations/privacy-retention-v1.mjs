import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_PRIVACY_RETENTION_VERSION =
  "starcraft_tmg_privacy_retention_v1";

const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const SECRET_KEY = /^(?:api.?key|authorization|cookie|credential(?:value|bytes|material)|secret(?:value|bytes|material)|access.?token|refresh.?token|seat.?token|bearer(?:token|value|bytes|material))$/iu;
const SECRET_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

const CLASS_POLICY = Object.freeze({
  room_private_journal: { disposition: "delete_on_request", minimumDays: 0,
    invalidatesDependents: false },
  room_public_journal: { disposition: "pseudonymize_on_request", minimumDays: 0,
    invalidatesDependents: false },
  character_private_config: { disposition: "delete_on_request", minimumDays: 0,
    invalidatesDependents: false },
  private_worldbook: { disposition: "delete_on_request", minimumDays: 0,
    invalidatesDependents: false },
  provider_prompt_artifact: { disposition: "delete_on_request", minimumDays: 0,
    invalidatesDependents: false },
  provider_attempt_audit: { disposition: "minimum_retention", minimumDays: 30,
    invalidatesDependents: false },
  selfplay_private_trace: { disposition: "delete_on_request", minimumDays: 0,
    invalidatesDependents: true },
  training_dataset_member: { disposition: "delete_on_request", minimumDays: 0,
    invalidatesDependents: true },
  immutable_release_audit: { disposition: "minimum_retention", minimumDays: 365,
    invalidatesDependents: false },
  security_incident: { disposition: "minimum_retention", minimumDays: 365,
    invalidatesDependents: false },
});

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

function instant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    throw new TypeError(`${field} is invalid`);
  }
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function noSecrets(value, path = "$", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`PRIVACY_SECRET_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => noSecrets(entry, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`PRIVACY_SECRET_FIELD_FORBIDDEN:${path}.${key}`);
    noSecrets(child, `${path}.${key}`, seen);
  }
}

function addDays(iso, days) {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

function seal(body, hashField) {
  const cloned = clone(body);
  return freeze({ ...cloned, [hashField]: hashStarcraftTmgContract(cloned) });
}

export function describeStarcraftTmgPrivacyPolicyV1() {
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PRIVACY_RETENTION_VERSION}.policy`,
    classes: clone(CLASS_POLICY),
    subjectIdentity: "one_way_hash_only",
    apiKeysPersisted: false,
    seatCredentialsPersisted: false,
    legalHoldOverridesDeletion: true,
    trainingTruth: false,
  };
  return seal(body, "policyHash");
}

export function createStarcraftTmgGovernedArtifactV1(input = {}) {
  noSecrets(input);
  const artifactClass = id(input.artifactClass, "artifactClass");
  const policy = CLASS_POLICY[artifactClass];
  if (!policy) throw new TypeError("artifactClass is unsupported");
  const createdAt = instant(input.createdAt, "createdAt");
  const subjectRefHash = input.subjectRefHash == null ? null
    : digest(input.subjectRefHash, "subjectRefHash");
  const legalHoldActive = input.legalHold?.active === true;
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PRIVACY_RETENTION_VERSION}.artifact`,
    artifactRef: id(input.artifactRef, "artifactRef"),
    artifactHash: digest(input.artifactHash, "artifactHash"),
    locatorHash: digest(input.locatorHash, "locatorHash"),
    artifactClass,
    subjectRefHash,
    createdAt,
    retention: {
      disposition: policy.disposition,
      minimumDays: policy.minimumDays,
      retainUntil: policy.minimumDays > 0 ? addDays(createdAt, policy.minimumDays) : null,
    },
    legalHold: {
      active: legalHoldActive,
      holdRefHash: legalHoldActive
        ? digest(input.legalHold?.holdRefHash, "legalHold.holdRefHash") : null,
    },
    dependentArtifactHashes: [...new Set(input.dependentArtifactHashes || [])]
      .map((entry) => digest(entry, "dependentArtifactHashes")).sort(),
    invalidatesDependents: policy.invalidatesDependents,
    rawSubjectIdentityRetained: false,
    secretMaterialRetained: false,
    trainingTruth: false,
  };
  return seal(body, "recordHash");
}

export function createStarcraftTmgSubjectDeletionPlanV1(input = {}) {
  const subjectRefHash = digest(input.subjectRefHash, "subjectRefHash");
  const requestedAt = instant(input.requestedAt, "requestedAt");
  const records = (input.records || []).map((record) => clone(record))
    .filter((record) => record.subjectRefHash === subjectRefHash)
    .sort((left, right) => left.artifactRef.localeCompare(right.artifactRef));
  const operations = [];
  const preserved = [];
  for (const record of records) {
    const { recordHash, ...body } = record;
    if (hashStarcraftTmgContract(body) !== recordHash) {
      throw new Error(`GOVERNED_ARTIFACT_TAMPERED:${record.artifactRef}`);
    }
    const deletionConditionHash = hashStarcraftTmgContract({
      recordHash, retention: record.retention, legalHold: record.legalHold,
    });
    if (record.legalHold.active) {
      preserved.push({ artifactRef: record.artifactRef,
        reason: "LEGAL_HOLD_ACTIVE", deletionConditionHash });
    } else if (record.retention.retainUntil
      && record.retention.retainUntil > requestedAt) {
      preserved.push({ artifactRef: record.artifactRef,
        reason: "MINIMUM_RETENTION_ACTIVE",
        retainUntil: record.retention.retainUntil, deletionConditionHash });
    } else {
      operations.push({ artifactRef: record.artifactRef,
        action: record.retention.disposition === "pseudonymize_on_request"
          ? "pseudonymize" : "delete",
        deletionConditionHash,
        dependentArtifactHashes: record.invalidatesDependents
          ? record.dependentArtifactHashes : [],
      });
    }
  }
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PRIVACY_RETENTION_VERSION}.deletion-plan`,
    subjectRefHash,
    requestedAt,
    policyHash: describeStarcraftTmgPrivacyPolicyV1().policyHash,
    discoveryHash: hashStarcraftTmgContract(records),
    discoveredCount: records.length,
    operations,
    preserved,
    unrelatedRecordsIncluded: false,
    trainingTruth: false,
  };
  return seal(body, "planHash");
}

function assertPlan(plan) {
  if (!object(plan)) throw new TypeError("deletion plan is required");
  const { planHash, ...body } = clone(plan);
  if (hashStarcraftTmgContract(body) !== planHash) {
    throw new Error("SUBJECT_DELETION_PLAN_TAMPERED");
  }
  return plan;
}

function assertAdapters(artifactStore, checkpointStore) {
  if (!["discoverBySubject", "snapshotUnrelated", "applyDisposition"]
    .every((name) => typeof artifactStore?.[name] === "function")
    || !["create", "get", "compareAndSwap"]
      .every((name) => typeof checkpointStore?.[name] === "function")) {
    throw new TypeError("privacy deletion adapters are invalid");
  }
}

export function createStarcraftTmgSubjectDeletionRuntimeV1(options = {}) {
  const artifactStore = options.artifactStore;
  const checkpointStore = options.checkpointStore;
  assertAdapters(artifactStore, checkpointStore);

  async function start(input = {}) {
    const plan = assertPlan(input.plan);
    const authorization = input.authorizationDecision;
    if (authorization?.allowed !== true
      || authorization.action !== "privacy.subject.delete"
      || authorization.resource?.subjectRefHash !== plan.subjectRefHash) {
      throw new Error("SUBJECT_DELETION_AUTHORIZATION_REQUIRED");
    }
    const currentRecords = await artifactStore.discoverBySubject(plan.subjectRefHash);
    if (hashStarcraftTmgContract(currentRecords) !== plan.discoveryHash) {
      throw new Error("SUBJECT_DELETION_DISCOVERY_DRIFT");
    }
    const jobId = id(input.jobId, "jobId");
    const body = {
      schemaVersion: `${STARCRAFT_TMG_PRIVACY_RETENTION_VERSION}.deletion-job`,
      jobId,
      plan,
      authorizationDecisionHash: authorization.decisionHash,
      state: "running",
      revision: 0,
      cursor: 0,
      operationReceipts: [],
      unrelatedBefore: await artifactStore.snapshotUnrelated(plan.subjectRefHash,
        [...plan.operations, ...plan.preserved].map((entry) => entry.artifactRef)),
      finalProof: null,
      startedAt: instant(input.startedAt, "startedAt"),
      trainingTruth: false,
    };
    const job = seal(body, "jobHash");
    await checkpointStore.create(job);
    return job;
  }

  async function step(jobIdValue, atValue) {
    const jobId = id(jobIdValue, "jobId");
    const at = instant(atValue, "at");
    const current = await checkpointStore.get(jobId);
    if (!current) throw new Error("SUBJECT_DELETION_JOB_NOT_FOUND");
    if (current.state !== "running") return current;
    let next;
    const operation = current.plan.operations[current.cursor];
    if (operation) {
      const receipt = await artifactStore.applyDisposition({ ...operation,
        subjectRefHash: current.plan.subjectRefHash, appliedAt: at });
      next = seal({ ...Object.fromEntries(Object.entries(current)
        .filter(([key]) => key !== "jobHash")),
      revision: current.revision + 1,
      cursor: current.cursor + 1,
      operationReceipts: [...current.operationReceipts, receipt] }, "jobHash");
    } else {
      const planArtifactRefs = [...current.plan.operations,
        ...current.plan.preserved].map((entry) => entry.artifactRef);
      const unrelatedAfter = await artifactStore.snapshotUnrelated(
        current.plan.subjectRefHash, planArtifactRefs);
      if (unrelatedAfter.stateHash !== current.unrelatedBefore.stateHash
        || unrelatedAfter.recordCount !== current.unrelatedBefore.recordCount) {
        throw new Error("UNRELATED_RECORD_INVARIANT_VIOLATED");
      }
      const proof = seal({
        schemaVersion: `${STARCRAFT_TMG_PRIVACY_RETENTION_VERSION}.deletion-proof`,
        jobId, planHash: current.plan.planHash,
        subjectRefHash: current.plan.subjectRefHash,
        deletedOrPseudonymized: current.operationReceipts,
        preservedByPolicy: current.plan.preserved,
        invalidatedDependentArtifactHashes: [...new Set(
          current.plan.operations.flatMap((entry) =>
            entry.dependentArtifactHashes))].sort(),
        unrelatedBefore: current.unrelatedBefore,
        unrelatedAfter,
        completedAt: at,
        completeWithPolicyBlocks: current.plan.preserved.length > 0,
        secretMaterialProcessed: false,
        trainingTruth: false,
      }, "proofHash");
      next = seal({ ...Object.fromEntries(Object.entries(current)
        .filter(([key]) => key !== "jobHash")),
      state: "complete", revision: current.revision + 1,
      finalProof: proof }, "jobHash");
    }
    await checkpointStore.compareAndSwap(current, next);
    return next;
  }

  async function inspect(jobIdValue) {
    return checkpointStore.get(id(jobIdValue, "jobId"));
  }

  return freeze({ version: STARCRAFT_TMG_PRIVACY_RETENTION_VERSION,
    start, step, inspect });
}

export function createInMemoryStarcraftTmgPrivacyAdaptersV1(recordsInput = []) {
  const records = new Map(recordsInput.map((entry) => [entry.artifactRef, clone(entry)]));
  const jobs = new Map();
  const tombstones = new Map();
  async function discoverBySubject(subjectRefHash) {
    return [...records.values()].filter((entry) =>
      entry.subjectRefHash === subjectRefHash)
      .sort((left, right) => left.artifactRef.localeCompare(right.artifactRef))
      .map(clone);
  }
  async function snapshotUnrelated(subjectRefHash, excludedArtifactRefs = []) {
    const excluded = new Set(excludedArtifactRefs);
    const unrelated = [...records.values()].filter((entry) =>
      entry.subjectRefHash !== subjectRefHash && !excluded.has(entry.artifactRef))
      .sort((left, right) => left.artifactRef.localeCompare(right.artifactRef));
    return freeze({ recordCount: unrelated.length,
      stateHash: hashStarcraftTmgContract(unrelated) });
  }
  async function applyDisposition(operation) {
    const current = records.get(operation.artifactRef);
    if (!current || current.subjectRefHash !== operation.subjectRefHash) {
      throw new Error("SUBJECT_ARTIFACT_SCOPE_MISMATCH");
    }
    const expected = hashStarcraftTmgContract({ recordHash: current.recordHash,
      retention: current.retention, legalHold: current.legalHold });
    if (expected !== operation.deletionConditionHash) {
      throw new Error("SUBJECT_DELETION_CONDITION_DRIFT");
    }
    if (operation.action === "delete") records.delete(operation.artifactRef);
    else if (operation.action === "pseudonymize") records.set(operation.artifactRef,
      { ...current, subjectRefHash: null,
        recordHash: hashStarcraftTmgContract({ ...current,
          subjectRefHash: null, recordHash: undefined }) });
    else throw new Error("SUBJECT_DISPOSITION_INVALID");
    const receipt = seal({
      schemaVersion: `${STARCRAFT_TMG_PRIVACY_RETENTION_VERSION}.operation-receipt`,
      artifactRef: operation.artifactRef, action: operation.action,
      deletionConditionHash: operation.deletionConditionHash,
      appliedAt: operation.appliedAt,
      rawSubjectIdentityRetained: false,
      trainingTruth: false,
    }, "receiptHash");
    tombstones.set(operation.artifactRef, receipt);
    return receipt;
  }
  const artifactStore = freeze({ descriptor: { environment: "fixture_only" },
    discoverBySubject, snapshotUnrelated, applyDisposition });
  const checkpointStore = freeze({ descriptor: { environment: "fixture_only" },
    async create(job) {
      if (jobs.has(job.jobId)) throw new Error("DELETION_JOB_EXISTS");
      jobs.set(job.jobId, clone(job)); return clone(job);
    },
    async get(jobId) { return clone(jobs.get(jobId) || null); },
    async compareAndSwap(current, next) {
      const stored = jobs.get(current.jobId);
      if (!stored || stored.revision !== current.revision
        || stored.jobHash !== current.jobHash) throw new Error("DELETION_JOB_CAS_CONFLICT");
      jobs.set(next.jobId, clone(next)); return clone(next);
    },
  });
  return freeze({ artifactStore, checkpointStore,
    inspectRecords: () => [...records.values()].map(clone),
    inspectTombstones: () => [...tombstones.values()].map(clone) });
}
