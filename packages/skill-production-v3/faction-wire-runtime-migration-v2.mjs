import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from '../structured-generation/structured-generation-runtime-v2.mjs';

export function validateFactionWireRuntimeMigrationV2({ filename, parentRunId, parent, next, readiness }) {
  const fields = ['wireRuntimeBinding', 'wireRuntimeReadinessHash', 'wireKeyHelperRef'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness) fail('FACTION_WIRE_MIGRATION_UNSCOPED'); return null;
  }
  if (fields.some(f => next[f] === undefined)) fail('FACTION_WIRE_BINDING_REMOVED_OR_PARTIAL');
  [next.wireRuntimeBinding, next.wireKeyHelperRef, readiness].forEach(verifySeal);
  const evidence = readiness.actualFailureReplay;
  if (next.wireRuntimeBinding.hash !== STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash
    || parent.wireRuntimeBinding && parent.wireRuntimeBinding.hash !== next.wireRuntimeBinding.hash
    || parent.wireKeyHelperRef && parent.wireKeyHelperRef.hash !== next.wireKeyHelperRef.hash
    || !readiness.passed || readiness.providerCalls !== 0 || readiness.hash !== next.wireRuntimeReadinessHash
    || readiness.binding?.hash !== next.wireRuntimeBinding.hash || readiness.helperRef?.hash !== next.wireKeyHelperRef.hash
    || !readiness.component?.passed || !readiness.component.actualSqliteRestartPassed
    || !readiness.component.partialJournalCrashRecoveryPassed || !readiness.component.globalPaymentStopPassed
    || !readiness.component.parallelIsolationPassed || !readiness.component.actualOsKeychainUsed
    || !readiness.callersWired || !readiness.failureObserversPreserved || !evidence?.passed
    || !evidence.actualContextAndInvocationRebuilt || evidence.providerCalls !== 0 || evidence.rawPayloadRecovered !== false
    || !parent.wireRuntimeBinding && evidence.originRunId !== parentRunId
    || !next.inputHashes.includes(evidence.inputHash) || hash(next.inputHashes) !== hash(parent.inputHashes)
    || !factionLimitsCompatibleV1(parent, next)) fail('FACTION_WIRE_MIGRATION_INVALID');
  const frozen = ['packages/structured-generation/structured-generation-runtime-v1.mjs',
    'packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs', 'packages/skill-production/store.mjs'];
  for (const file of frozen) {
    const before = parent.codeHashes.find(r => r.file === file), after = next.codeHashes.find(r => r.file === file);
    if (before && before.hash !== after?.hash) fail('FACTION_WIRE_LEGACY_CORE_DRIFT');
  }
  for (const c of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === c.file)?.hash !== c.hash) fail('FACTION_WIRE_MIGRATION_CODE_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n)
      fail('FACTION_WIRE_MIGRATION_PARENT_NOT_TERMINAL');
    const row = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(evidence.originRunId, evidence.originAttemptId);
    const originalIssue = verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(evidence.originRunId, evidence.originAttemptId + '.issue')?.artifact || 'null')).value;
    const receipt = row?.response && verifySeal(JSON.parse(row.response)).value;
    if (row?.state !== 'failed' || row.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      || receipt.receiptHash !== evidence.originalReceiptHash || row.request_hash !== hash(evidence.providerRequest)
      || originalIssue.invocationHash !== hash(evidence.invocation) || originalIssue.hash !== evidence.originalIssueHash
      || originalIssue.rawPayloadPersisted !== false || originalIssue.rejectedCandidateRef !== null
      || evidence.newWireIssue?.originalProviderReceiptHash !== receipt.receiptHash
      || evidence.newWireIssue?.class !== 'wire_syntax' || evidence.newWireIssue?.rawPayloadPersisted !== false
      || evidence.newWireIssue?.invocationHash !== originalIssue.invocationHash
      || evidence.originalSettledMicros !== row.settled)
      fail('FACTION_WIRE_MIGRATION_PAID_ORIGIN_DRIFT');
    verifySeal(evidence.newWireIssue);
  } finally { db.close(); }
  return seal({ version: 'faction_wire_runtime_migration_v2', bindingHash: next.wireRuntimeBinding.hash,
    helperRefHash: next.wireKeyHelperRef.hash, readinessHash: readiness.hash,
    originRunId: evidence.originRunId, originAttemptId: evidence.originAttemptId,
    originalReceiptHash: evidence.originalReceiptHash, files: readiness.codeHashes.map(r => r.file),
    oldFailureAndAccountingPreserved: true, rawPayloadRecovered: false, semanticAcceptanceInherited: false,
    accountingReset: false, trainingTruth: false });
}
