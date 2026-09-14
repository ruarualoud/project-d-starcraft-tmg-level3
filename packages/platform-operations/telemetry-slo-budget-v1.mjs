import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_TELEMETRY_VERSION =
  "starcraft_tmg_telemetry_slo_budget_v1";

const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const SUBSYSTEMS = new Set([
  "room", "agent", "queue", "provider", "skill", "training", "release",
  "privacy", "security",
]);
const OUTCOMES = new Set(["success", "failure", "cancelled", "unknown_delivery"]);
const SEVERITIES = new Set(["Info", "Medium", "High", "Critical"]);
const LABEL_KEYS = new Set([
  "environmentClass", "providerId", "requestedModel", "jobKind",
  "actionKind", "target", "resultClass",
]);
const SECRET_KEY = /(?:api.?key|authorization|cookie|credential|secret|access.?token|refresh.?token|seat.?token|bearer|prompt|reasoning|private.?state|worldbook|raw.?identity)/iu;
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

function instant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    throw new TypeError(`${field} is invalid`);
  }
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function integer(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0 || result > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return result;
}

function noSecrets(value, path = "$", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`TELEMETRY_SECRET_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => noSecrets(entry, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`TELEMETRY_FIELD_FORBIDDEN:${path}.${key}`);
    noSecrets(child, `${path}.${key}`, seen);
  }
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)];
}

function seal(body, field) {
  const value = clone(body);
  return freeze({ ...value, [field]: hashStarcraftTmgContract(value) });
}

export function createInMemoryStarcraftTmgTelemetrySinkV1() {
  const events = [];
  return freeze({
    descriptor: freeze({ adapter: "memory", durable: false,
      productionReady: false, rawEventAccess: "internal_only" }),
    async append(event) {
      if (events.some((entry) => entry.eventId === event.eventId)) {
        const existing = events.find((entry) => entry.eventId === event.eventId);
        if (existing.eventHash !== event.eventHash) {
          throw new Error("TELEMETRY_EVENT_IDEMPOTENCY_CONFLICT");
        }
        return clone(existing);
      }
      events.push(clone(event));
      return clone(event);
    },
    async read(query = {}) {
      return events.filter((event) =>
        (!query.epochId || event.epochId === query.epochId)
        && (!query.runWindowId || event.runWindowId === query.runWindowId)
        && (!query.from || event.occurredAt >= query.from)
        && (!query.to || event.occurredAt <= query.to)).map(clone);
    },
    async health() { return clone(this.descriptor); },
  });
}

export function createStarcraftTmgTelemetryRuntimeV1(options = {}) {
  const sink = options.sink;
  if (!object(sink?.descriptor) || typeof sink.append !== "function"
    || typeof sink.read !== "function" || typeof sink.health !== "function") {
    throw new TypeError("telemetry sink is invalid");
  }

  async function record(input = {}) {
    noSecrets(input);
    const subsystem = id(input.subsystem, "subsystem");
    const outcome = id(input.outcome, "outcome");
    const severity = id(input.severity || (outcome === "success" ? "Info" : "High"),
      "severity");
    if (!SUBSYSTEMS.has(subsystem) || !OUTCOMES.has(outcome)
      || !SEVERITIES.has(severity)) throw new TypeError("telemetry classification is invalid");
    const labels = object(input.labels) ? clone(input.labels) : {};
    if (Object.keys(labels).some((key) => !LABEL_KEYS.has(key))
      || Object.values(labels).some((value) => typeof value !== "string"
        || value.length > 120)) throw new TypeError("telemetry labels are invalid");
    const body = {
      schemaVersion: `${STARCRAFT_TMG_TELEMETRY_VERSION}.event`,
      eventId: id(input.eventId, "eventId"),
      occurredAt: instant(input.occurredAt, "occurredAt"),
      epochId: id(input.epochId, "epochId"),
      runWindowId: id(input.runWindowId, "runWindowId"),
      subsystem,
      operation: id(input.operation, "operation"),
      outcome,
      severity,
      latencyMs: integer(input.latencyMs || 0, "latencyMs", 3_600_000),
      queueAgeMs: integer(input.queueAgeMs || 0, "queueAgeMs", 604_800_000),
      providerCallCount: integer(input.providerCallCount || 0,
        "providerCallCount", 1_000_000),
      inputUnits: integer(input.inputUnits || 0, "inputUnits"),
      outputUnits: integer(input.outputUnits || 0, "outputUnits"),
      costMicrosCny: integer(input.costMicrosCny || 0, "costMicrosCny"),
      scopeHash: digest(input.scopeHash, "scopeHash"),
      traceHash: digest(input.traceHash, "traceHash"),
      errorCode: input.errorCode == null ? null : id(input.errorCode, "errorCode"),
      labels,
      rawPromptRetained: false,
      rawPrivateStateRetained: false,
      credentialMaterialRetained: false,
      trainingTruth: false,
    };
    const event = seal(body, "eventHash");
    await sink.append(event);
    return event;
  }

  async function summarize(input = {}) {
    const epochId = id(input.epochId, "epochId");
    const events = await sink.read({ epochId,
      runWindowId: input.runWindowId == null ? undefined
        : id(input.runWindowId, "runWindowId"),
      from: input.from == null ? undefined : instant(input.from, "from"),
      to: input.to == null ? undefined : instant(input.to, "to") });
    const success = events.filter((entry) => entry.outcome === "success").length;
    const failures = events.filter((entry) => entry.outcome !== "success").length;
    const errorsByCode = {};
    for (const event of events) {
      if (event.errorCode) errorsByCode[event.errorCode]
        = (errorsByCode[event.errorCode] || 0) + 1;
    }
    const body = {
      schemaVersion: `${STARCRAFT_TMG_TELEMETRY_VERSION}.summary`,
      epochId,
      runWindowId: input.runWindowId || null,
      eventCount: events.length,
      successCount: success,
      failureCount: failures,
      availability: events.length ? success / events.length : null,
      errorRate: events.length ? failures / events.length : null,
      latencyP50Ms: percentile(events.map((entry) => entry.latencyMs), 0.5),
      latencyP95Ms: percentile(events.map((entry) => entry.latencyMs), 0.95),
      oldestQueueAgeMs: events.length
        ? Math.max(...events.map((entry) => entry.queueAgeMs)) : null,
      providerCallCount: events.reduce((sum, entry) =>
        sum + entry.providerCallCount, 0),
      inputUnits: events.reduce((sum, entry) => sum + entry.inputUnits, 0),
      outputUnits: events.reduce((sum, entry) => sum + entry.outputUnits, 0),
      costMicrosCny: events.reduce((sum, entry) => sum + entry.costMicrosCny, 0),
      errorsByCode,
      rawEventsIncluded: false,
      scopeHashesIncluded: false,
      trainingTruth: false,
    };
    return seal(body, "summaryHash");
  }

  function evaluateSlo(input = {}) {
    const summary = input.summary;
    const policy = {
      minimumAvailability: Number(input.policy?.minimumAvailability ?? 0.99),
      maximumErrorRate: Number(input.policy?.maximumErrorRate ?? 0.01),
      maximumP95LatencyMs: integer(input.policy?.maximumP95LatencyMs ?? 2000,
        "maximumP95LatencyMs"),
      maximumQueueAgeMs: integer(input.policy?.maximumQueueAgeMs ?? 30000,
        "maximumQueueAgeMs"),
    };
    const findings = [];
    if (summary.eventCount === 0) findings.push({ code: "SLO_NO_TRAFFIC",
      severity: "Medium", integrationBlocking: false });
    if (summary.availability !== null
      && summary.availability < policy.minimumAvailability) {
      findings.push({ code: "SLO_AVAILABILITY_BREACH", severity: "High",
        integrationBlocking: true });
    }
    if (summary.errorRate !== null && summary.errorRate > policy.maximumErrorRate) {
      findings.push({ code: "SLO_ERROR_RATE_BREACH", severity: "High",
        integrationBlocking: true });
    }
    if (summary.latencyP95Ms > policy.maximumP95LatencyMs) {
      const severity = summary.latencyP95Ms > policy.maximumP95LatencyMs * 2
        ? "High" : "Medium";
      findings.push({ code: "SLO_LATENCY_BREACH", severity,
        integrationBlocking: severity === "High" });
    }
    if (summary.oldestQueueAgeMs > policy.maximumQueueAgeMs) {
      findings.push({ code: "SLO_QUEUE_AGE_BREACH", severity: "High",
        integrationBlocking: true });
    }
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_TELEMETRY_VERSION}.slo-evaluation`,
      summaryHash: summary.summaryHash,
      policy,
      findings,
      passed: !findings.some((entry) => entry.integrationBlocking),
      onlyCriticalHighBlock: true,
      trainingTruth: false,
    });
  }

  function evaluateBudget(input = {}) {
    const summary = input.summary;
    const noticeIncrementMicrosCny = integer(
      input.noticeIncrementMicrosCny ?? 100_000_000,
      "noticeIncrementMicrosCny");
    if (noticeIncrementMicrosCny < 1) throw new TypeError("notice increment is invalid");
    const lastNotifiedMicrosCny = integer(input.lastNotifiedMicrosCny || 0,
      "lastNotifiedMicrosCny");
    const maxCallsPerRunWindow = integer(input.maxCallsPerRunWindow ?? 100,
      "maxCallsPerRunWindow");
    const notices = [];
    const first = Math.floor(lastNotifiedMicrosCny / noticeIncrementMicrosCny) + 1;
    const last = Math.floor(summary.costMicrosCny / noticeIncrementMicrosCny);
    for (let index = first; index <= last; index += 1) {
      notices.push({ kind: "cost_threshold", severity: "Medium",
        thresholdMicrosCny: index * noticeIncrementMicrosCny,
        action: "alert_continue", integrationBlocking: false });
    }
    if (summary.providerCallCount > maxCallsPerRunWindow) {
      notices.push({ kind: "run_window_call_threshold", severity: "Medium",
        observedCalls: summary.providerCallCount,
        thresholdCalls: maxCallsPerRunWindow,
        action: "alert_continue", integrationBlocking: false });
    }
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_TELEMETRY_VERSION}.budget-evaluation`,
      summaryHash: summary.summaryHash,
      epochId: summary.epochId,
      runWindowId: summary.runWindowId,
      cumulativeCostMicrosCny: summary.costMicrosCny,
      providerCallsInCurrentRunWindow: summary.providerCallCount,
      notices,
      nextNoticeMicrosCny: (last + 1) * noticeIncrementMicrosCny,
      costThresholdAction: "alert_continue",
      maxCallThresholdAction: "alert_continue",
      newRunWindowResetsCallCount: true,
      providerPaymentRequiredStillTerminal: true,
      trainingTruth: false,
    });
  }

  async function projectAdministratorView(input = {}) {
    if (input.authorizationDecision?.allowed !== true
      || input.authorizationDecision.action !== "telemetry.admin.read") {
      throw new Error("TELEMETRY_ADMIN_AUTHORIZATION_REQUIRED");
    }
    const summary = await summarize(input);
    const slo = evaluateSlo({ summary, policy: input.sloPolicy });
    const budget = evaluateBudget({ summary,
      noticeIncrementMicrosCny: input.noticeIncrementMicrosCny,
      lastNotifiedMicrosCny: input.lastNotifiedMicrosCny,
      maxCallsPerRunWindow: input.maxCallsPerRunWindow });
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_TELEMETRY_VERSION}.administrator-view`,
      summary, slo, budget,
      containsRawEvents: false,
      containsScopeHashes: false,
      containsCredentials: false,
      trainingTruth: false,
    });
  }

  return freeze({ version: STARCRAFT_TMG_TELEMETRY_VERSION,
    record, summarize, evaluateSlo, evaluateBudget, projectAdministratorView });
}

