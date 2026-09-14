import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, hash, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { verifyOutputCapRecoveryCompactness } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { FACTION_REVIEW_RECOVERY_BUDGET_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-review-recovery-budget-v2.mjs';
const root = new URL('../', import.meta.url);
const db = new DatabaseSync(new URL('build/ticket-17-production-redesign-v1/production.sqlite', root).pathname, { readOnly: true });
const originRunId = 'faction-v1-d637b50c71522a56cea4';
const originAttemptId = 'structured-5fbe70f00c0f86c3a84a4a91c553d2b22ca75cde4bb512b3';
let candidate, usage, response;
try {
  const c = db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(originRunId, originAttemptId + '.candidate');
  const a = db.prepare('SELECT response,usage FROM attempts WHERE run=? AND id=? AND state=?').get(originRunId, originAttemptId, 'received');
  candidate = verifySeal(JSON.parse(c.artifact)).value;
  usage = verifySeal(JSON.parse(a.usage)).value; response = verifySeal(JSON.parse(a.response)).value;
} finally { db.close(); }
assert.equal(response.usageReceipt.receiptHash, candidate.providerReceiptHash);
assert.equal(hash(response.output), hash(candidate.providerValue));
assert.equal(usage.outputUnits, 861);
assert.equal(candidate.providerValue.verdicts[0].sourceSlots.length, 5);
const args = { outputContractRef: candidate.outputContractRef, binding };
assert.throws(() => verifyOutputCapRecoveryCompactness(candidate.providerValue, 861),
  { code: 'FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT' });
verifyOutputCapRecoveryCompactness(candidate.providerValue, 861, args);
assert.throws(() => verifyOutputCapRecoveryCompactness(candidate.providerValue, 3073, args),
  { code: 'FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT' });
assert.throws(() => verifyOutputCapRecoveryCompactness(candidate.providerValue, 861,
  { ...args, outputContractRef: { ...args.outputContractRef, hash: hash('old-or-foreign') } }),
{ code: 'FACTION_REVIEW_RECOVERY_BUDGET_BINDING_INVALID' });
const negative = structuredClone(candidate.providerValue); negative.verdicts[0].verdict = 'unsupported';
negative.verdicts[0].reason = 'An explicit negative remains negative. '.repeat(32);
verifyOutputCapRecoveryCompactness(negative, 1200, args);
assert.equal(negative.verdicts[0].verdict, 'unsupported');
assert.throws(() => verifyOutputCapRecoveryCompactness(negative, 1200),
  { code: 'FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT' });
const unknown = structuredClone(candidate.providerValue); unknown.verdicts[0].sourceSlots.push(512);
assert.throws(() => verifyOutputCapRecoveryCompactness(unknown, 861, args));
const files = ['packages/skill-production-v3/faction-review-recovery-budget-v2.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'scripts/verify-ticket-18-faction-review-recovery-budget-v2.mjs'];
const report = seal({ passed: true, checks: 12, binding, originRunId, originAttemptId,
  candidateHash: candidate.hash, providerReceiptHash: candidate.providerReceiptHash,
  originalOutputUnits: usage.outputUnits, citationsPreserved: 5, historicalDefaultStillRejects: true,
  negativeJudgmentsPreserved: true, sourceMembershipValidationStillRequired: true,
  providerCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(new URL(file, root))) }))) });
await writeFile(new URL('build/ticket-18-faction-production-v1/review-recovery-budget-readiness.json', root), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 12, outputUnits: 861, citationsPreserved: 5, providerCalls: 0, hash: report.hash }));
