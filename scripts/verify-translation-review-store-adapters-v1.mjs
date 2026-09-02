#!/usr/bin/env node

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1 } from
  "../content/localization/zh-cn-core-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createPostgresStarcraftTmgTranslationReviewStoreV1 } from
  "../packages/localization/postgres-translation-review-store-v1.mjs";
import { createSqliteStarcraftTmgTranslationReviewStoreV1 } from
  "../packages/localization/sqlite-translation-review-store-v1.mjs";
import {
  verifyStarcraftTmgTranslationReviewAuditChain,
} from "../packages/localization/translation-review-store-contract-v1.mjs";
import {
  createStarcraftTmgMachineTranslationCandidate,
  createStarcraftTmgTranslationIntent,
} from "../packages/localization/translation-sidecar-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "build/ticket-12-translation-review-store-v1");
const REPORT_PATH = path.join(REPORT_DIR, "report.json");
const T0 = "2026-09-02T18:00:00.000Z";
const DATASET_HASH = hashStarcraftTmgContract({ dataset: "ticket-12-slice-116" });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function candidate({ canonicalId, canonicalText, translatedText, createdAt, requestId }) {
  const intent = createStarcraftTmgTranslationIntent({
    datasetId: "starcraft-tmg.official-command-center.localization",
    datasetVersion: "u71-c69-r48",
    datasetHash: DATASET_HASH,
    recordType: "unit",
    canonicalId,
    recordHash: hashStarcraftTmgContract({ canonicalId, canonicalText }),
    fieldPath: "army_units[].name",
    canonicalText,
    sourceLocale: "en",
    targetLocale: "zh-CN",
    glossary: STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1,
    providerClass: "direct_translation_provider",
    providerProfileRef: { id: "translation-admin-default", version: "1" },
    promptTemplateVersion: "starcraft-tmg-translation-prompt-v1",
    createdAt,
  });
  const receiptBody = {
    schema: "starcraft_tmg_direct_translation_provider_receipt_v1",
    provider: "openai-compatible-direct",
    providerClass: "direct_translation_provider",
    model: "translation-model-v1",
    requestId,
    intentHash: intent.intentHash,
    datasetHash: intent.datasetRef.datasetHash,
    glossaryHash: intent.glossaryRef.hash,
    displayOnly: true,
    mayAffectRules: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  const providerReceipt = {
    ...receiptBody,
    receiptHash: hashStarcraftTmgContract(receiptBody),
  };
  return createStarcraftTmgMachineTranslationCandidate({
    intent,
    translatedText,
    providerReceipt,
    qualitySignals: { humanReviewRequired: true },
    createdAt,
  });
}

const candidateOne = candidate({
  canonicalId: "adept",
  canonicalText: "Adept",
  translatedText: "使徒（机器草稿）",
  createdAt: T0,
  requestId: "slice116-request-1",
});
const candidateTwo = candidate({
  canonicalId: "marine",
  canonicalText: "Marine",
  translatedText: "陆战队员（机器草稿）",
  createdAt: "2026-09-02T18:00:01.000Z",
  requestId: "slice116-request-2",
});

function rowClone(row) {
  return row ? clone(row) : null;
}

class DeterministicPostgresPool {
  constructor() {
    this.initialized = false;
    this.candidates = new Map();
    this.audit = [];
    this.meta = { audit_sequence: 0, last_event_hash: null };
    this.schemaSql = "";
    this.queryLog = [];
    this.transactionSnapshot = null;
  }

  snapshot() {
    return {
      candidates: [...this.candidates.entries()].map(([key, value]) => [key, clone(value)]),
      audit: clone(this.audit),
      meta: clone(this.meta),
    };
  }

  restore(snapshot) {
    this.candidates = new Map(snapshot.candidates);
    this.audit = snapshot.audit;
    this.meta = snapshot.meta;
  }

  async connect() {
    return {
      query: (sql, params) => this.query(sql, params),
      release() {},
    };
  }

  async query(sql, params = []) {
    this.queryLog.push(String(sql));
    const marker = String(sql).match(/sc_translation:([a-z_]+)/u)?.[1];
    if (marker === "init") {
      this.initialized = true;
      this.schemaSql = String(sql);
      return { rows: [], rowCount: 0 };
    }
    if (marker === "begin") {
      this.transactionSnapshot = this.snapshot();
      return { rows: [], rowCount: 0 };
    }
    if (marker === "commit") {
      this.transactionSnapshot = null;
      return { rows: [], rowCount: 0 };
    }
    if (marker === "rollback") {
      if (this.transactionSnapshot) this.restore(this.transactionSnapshot);
      this.transactionSnapshot = null;
      return { rows: [], rowCount: 0 };
    }
    if (marker === "select_candidate" || marker === "select_candidate_for_update") {
      const row = this.candidates.get(params[0]);
      return { rows: row ? [rowClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "select_idempotency") {
      const row = [...this.candidates.values()].find((entry) => entry.idempotency_key_hash === params[0]);
      return { rows: row ? [{ candidate_hash: row.candidate_hash }] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "insert_candidate") {
      const [candidateHash, idempotencyKeyHash, datasetHash, targetLocale, candidateJson, createdAt] = params;
      if (this.candidates.has(candidateHash)
        || [...this.candidates.values()].some((row) => row.idempotency_key_hash === idempotencyKeyHash)) {
        const error = new Error("unique violation");
        error.code = "23505";
        throw error;
      }
      this.candidates.set(candidateHash, {
        candidate_hash: candidateHash,
        idempotency_key_hash: idempotencyKeyHash,
        dataset_hash: datasetHash,
        target_locale: targetLocale,
        status: "pending",
        revision: 0,
        candidate_json: JSON.parse(candidateJson),
        review_entry_json: null,
        created_at: createdAt,
        updated_at: createdAt,
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "audit_meta_for_update") {
      return { rows: [clone(this.meta)], rowCount: 1 };
    }
    if (marker === "insert_audit") {
      this.audit.push({
        sequence: Number(params[0]),
        event_hash: params[1],
        previous_event_hash: params[2],
        event_json: JSON.parse(params[3]),
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_audit_meta") {
      this.meta = { audit_sequence: Number(params[0]), last_event_hash: params[1] };
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_review") {
      const [status, entryJson, updatedAt, candidateHash, expectedRevision] = params;
      const row = this.candidates.get(candidateHash);
      if (!row || row.status !== "pending" || Number(row.revision) !== Number(expectedRevision)) {
        return { rows: [], rowCount: 0 };
      }
      row.status = status;
      row.revision += 1;
      row.review_entry_json = JSON.parse(entryJson);
      row.updated_at = updatedAt;
      return { rows: [], rowCount: 1 };
    }
    if (marker === "list_queue") {
      const [datasetHash, targetLocale, status, take, offset] = params;
      const rows = [...this.candidates.values()]
        .filter((row) => !datasetHash || row.dataset_hash === datasetHash)
        .filter((row) => !targetLocale || row.target_locale === targetLocale)
        .filter((row) => !status || row.status === status)
        .sort((left, right) => `${left.created_at}\u001f${left.candidate_hash}`
          .localeCompare(`${right.created_at}\u001f${right.candidate_hash}`))
        .slice(offset, offset + take)
        .map(rowClone);
      return { rows, rowCount: rows.length };
    }
    if (marker === "read_audit") {
      const rows = this.audit
        .filter((row) => row.sequence > params[0])
        .slice(0, params[1])
        .map((row) => ({ event_json: clone(row.event_json) }));
      return { rows, rowCount: rows.length };
    }
    if (marker === "health") {
      return {
        rows: [{
          candidates: this.initialized ? "sc_translation_candidates" : null,
          audit: this.initialized ? "sc_translation_audit" : null,
          audit_meta: this.initialized ? "sc_translation_audit_meta" : null,
          candidate_count: String(this.candidates.size),
          audit_count: String(this.audit.length),
        }],
        rowCount: 1,
      };
    }
    throw new Error(`unhandled deterministic PostgreSQL query marker: ${marker}`);
  }
}

async function runSharedContract(store) {
  const initialized = await store.initialize();
  assert(initialized.healthy, "store initialization failed");
  const first = await store.putCandidate({
    candidate: candidateOne,
    idempotencyKey: "request-one",
    actorId: "translation-provider-worker",
    createdAt: T0,
  });
  assert(first.status === "pending" && first.revision === 0, "candidate lifecycle did not start pending@0");
  const repeated = await store.putCandidate({
    candidate: candidateOne,
    idempotencyKey: "request-one",
    actorId: "translation-provider-worker",
    createdAt: T0,
  });
  assert(repeated.candidate.candidateHash === first.candidate.candidateHash, "idempotent replay changed result");
  let idempotencyConflict = false;
  try {
    await store.putCandidate({
      candidate: candidateTwo,
      idempotencyKey: "request-one",
      actorId: "translation-provider-worker",
      createdAt: "2026-09-02T18:00:01.000Z",
    });
  } catch (error) {
    idempotencyConflict = error?.code === "TRANSLATION_REVIEW_IDEMPOTENCY_CONFLICT";
  }
  assert(idempotencyConflict, "idempotency collision did not fail closed");
  await store.putCandidate({
    candidate: candidateTwo,
    idempotencyKey: "request-two",
    actorId: "translation-provider-worker",
    createdAt: "2026-09-02T18:00:01.000Z",
  });
  const pending = await store.listQueue({ datasetHash: DATASET_HASH, targetLocale: "zh-CN", status: "pending" });
  assert(pending.items.length === 2 && pending.nextCursor === null, "pending queue mismatch");
  const corrected = await store.reviewCandidate({
    candidateHash: candidateOne.candidateHash,
    expectedRevision: 0,
    decision: "approve_with_correction",
    correctedText: "使徒",
    reviewerId: "translation-admin-1",
    reviewedAt: "2026-09-02T18:00:02.000Z",
    notes: "glossary-aligned correction",
  });
  assert(corrected.status === "corrected" && corrected.revision === 1, "correction lifecycle mismatch");
  assert(corrected.reviewEntry.displayText === "使徒", "corrected text missing");
  let casConflict = false;
  try {
    await store.reviewCandidate({
      candidateHash: candidateOne.candidateHash,
      expectedRevision: 0,
      decision: "reject",
      reviewerId: "translation-admin-2",
      reviewedAt: "2026-09-02T18:00:03.000Z",
    });
  } catch (error) {
    casConflict = error?.code === "TRANSLATION_REVIEW_REVISION_CONFLICT";
  }
  assert(casConflict, "stale review CAS was accepted");
  const remaining = await store.listQueue({ status: "pending" });
  assert(remaining.items.length === 1 && remaining.items[0].candidate.candidateHash === candidateTwo.candidateHash, "queue did not remove reviewed candidate");
  const events = await store.readAudit({ afterSequence: 0, limit: 20 });
  const replay = verifyStarcraftTmgTranslationReviewAuditChain(events);
  assert(replay.eventCount === 3, "audit event denominator mismatch");
  const health = await store.health();
  assert(health.candidateCount === 2 && health.auditCount === 3, "health counts mismatch");
  const semantic = {
    first: await store.getCandidate(candidateOne.candidateHash),
    second: await store.getCandidate(candidateTwo.candidateHash),
    queue: remaining,
    events,
    replay,
  };
  return {
    semantic,
    semanticHash: hashStarcraftTmgContract(semantic),
    replayHash: replay.replayHash,
    lastEventHash: replay.lastEventHash,
  };
}

await mkdir(REPORT_DIR, { recursive: true });
const sqliteDirectory = await mkdtemp(path.join(REPORT_DIR, "sqlite-"));
const sqliteFilename = path.join(sqliteDirectory, "translation-review.sqlite");
const sqlite = createSqliteStarcraftTmgTranslationReviewStoreV1({ filename: sqliteFilename });
const pgPool = new DeterministicPostgresPool();
const postgres = createPostgresStarcraftTmgTranslationReviewStoreV1({ pool: pgPool });

const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

let sqliteResult;
let postgresResult;

await check("sqlite_m1_runs_complete_candidate_review_correction_cas_and_audit_contract", async () => {
  sqliteResult = await runSharedContract(sqlite);
});

await check("postgres_production_adapter_runs_the_same_contract_over_serializable_sql_protocol", async () => {
  postgresResult = await runSharedContract(postgres);
  assert(pgPool.schemaSql.includes("JSONB") && pgPool.schemaSql.includes("TIMESTAMPTZ"), "PostgreSQL production schema types missing");
  assert(pgPool.schemaSql.includes("sc_translation_audit_meta"), "PostgreSQL audit head schema missing");
  assert(pgPool.queryLog.some((sql) => sql.includes("BEGIN ISOLATION LEVEL SERIALIZABLE")), "PostgreSQL SERIALIZABLE transaction missing");
  assert(pgPool.queryLog.some((sql) => sql.includes("FOR UPDATE")), "PostgreSQL row/audit lock missing");
});

await check("sqlite_and_postgres_semantics_are_hash_identical", () => {
  assert(sqliteResult.semanticHash === postgresResult.semanticHash, "cross-Adapter lifecycle semantics diverged");
  assert(sqliteResult.replayHash === postgresResult.replayHash, "cross-Adapter audit replay diverged");
  assert(sqliteResult.lastEventHash === postgresResult.lastEventHash, "cross-Adapter audit head diverged");
});

await check("sqlite_file_restart_preserves_candidates_reviews_and_audit_replay", async () => {
  sqlite.close();
  const restarted = createSqliteStarcraftTmgTranslationReviewStoreV1({ filename: sqliteFilename });
  const first = await restarted.getCandidate(candidateOne.candidateHash);
  const events = await restarted.readAudit({ afterSequence: 0, limit: 20 });
  const replay = verifyStarcraftTmgTranslationReviewAuditChain(events);
  assert(first.status === "corrected" && first.revision === 1, "SQLite restart lost review state");
  assert(replay.replayHash === sqliteResult.replayHash, "SQLite restart changed audit replay");
  restarted.close();
});

await check("postgres_adapter_restart_over_same_pool_preserves_contract_state", async () => {
  const restarted = createPostgresStarcraftTmgTranslationReviewStoreV1({ pool: pgPool });
  const first = await restarted.getCandidate(candidateOne.candidateHash);
  const events = await restarted.readAudit({ afterSequence: 0, limit: 20 });
  assert(first.status === "corrected" && events.length === 3, "PostgreSQL Adapter restart lost state");
});

await check("tampered_candidate_fails_before_any_database_write", async () => {
  const tampered = clone(candidateOne);
  tampered.translatedText = "篡改";
  const isolated = createSqliteStarcraftTmgTranslationReviewStoreV1();
  let rejected = false;
  try {
    await isolated.putCandidate({ candidate: tampered, idempotencyKey: "tampered", actorId: "attacker", createdAt: T0 });
  } catch (error) {
    rejected = error?.code === "TRANSLATION_REVIEW_CANDIDATE_INVALID";
  }
  assert(rejected && (await isolated.health()).candidateCount === 0, "tampered candidate reached storage");
  isolated.close();
});

await check("credential_material_fails_before_any_database_write", async () => {
  const unsafe = clone(candidateOne);
  unsafe.providerReceipt.secretRef = "vault://must-not-persist";
  unsafe.providerReceipt.receiptHash = hashStarcraftTmgContract(without(unsafe.providerReceipt, ["receiptHash"]));
  unsafe.candidateHash = hashStarcraftTmgContract(without(unsafe, ["candidateHash"]));
  const isolated = createSqliteStarcraftTmgTranslationReviewStoreV1();
  let rejected = false;
  try {
    await isolated.putCandidate({ candidate: unsafe, idempotencyKey: "unsafe", actorId: "attacker", createdAt: T0 });
  } catch (error) {
    rejected = error?.code === "TRANSLATION_REVIEW_CANDIDATE_CREDENTIAL_MATERIAL_FORBIDDEN";
  }
  assert(rejected && (await isolated.health()).candidateCount === 0, "credential material reached storage");
  isolated.close();
});

await check("audit_chain_tamper_fails_cross_time_replay", () => {
  const tampered = clone(sqliteResult.semantic.events);
  tampered[1].actorId = "rewritten-actor";
  let rejected = false;
  try { verifyStarcraftTmgTranslationReviewAuditChain(tampered); } catch (error) {
    rejected = error?.code === "TRANSLATION_REVIEW_AUDIT_CHAIN_INVALID";
  }
  assert(rejected, "tampered audit chain replayed");
});

await check("reviewed_translation_remains_display_only_and_training_ineligible", () => {
  const entry = sqliteResult.semantic.first.reviewEntry;
  assert(entry.displayOnly === true && entry.mayAffectRules === false, "review entry gained Rules authority");
  assert(entry.eligibleForTraining === false && entry.trainingTruth === false, "review entry gained training authority");
});

const report = {
  schema: "starcraft_tmg_ticket_12_slice_116_translation_review_store_verification_v1",
  generatedAt: "2026-09-02T18:10:00.000Z",
  ticket: 12,
  slice: 116,
  status: failures.length === 0 ? "passed" : "failed",
  checks,
  counts: {
    assertions: checks.length,
    passed: checks.filter((entry) => entry.passed).length,
    failed: failures.length,
    adapterContractRuns: 2,
    candidatesPerAdapter: 2,
    auditEventsPerAdapter: 3,
  },
  evidence: {
    sqliteSemanticHash: sqliteResult?.semanticHash || null,
    postgresSemanticHash: postgresResult?.semanticHash || null,
    auditReplayHash: sqliteResult?.replayHash || null,
    auditHeadHash: sqliteResult?.lastEventHash || null,
    sqliteFileRestart: failures.length === 0 ? "passed" : "failed",
    postgresProtocolRestart: failures.length === 0 ? "passed" : "failed",
    livePostgresIntegration: "not_run_no_postgres_dsn_or_server",
    postgresProductionAdapterImplemented: true,
    productionReady: false,
    trainingTruth: false,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["fact_probe"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTests: checks.length,
    crossTimeReplayResult: failures.length === 0 ? "passed" : "failed",
    promotions: [],
    blocks: ["live_postgres_integration_requires_deployment_dsn", "translation_review_entries_remain_display_only"],
    remainingRuleGaps: 0,
  },
  dshUsed: false,
  muzeroUsed: false,
  selfPlayUsed: false,
  trainingPromotion: false,
  failures,
};
report.reportHash = hashStarcraftTmgContract(report);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
