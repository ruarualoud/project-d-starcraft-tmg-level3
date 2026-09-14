import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, seal, sha256 } from '../packages/skill-production/common.mjs';

// Fixed read-only production target; no --live, credential, fetch or source
// refresh route. Synthetic in-memory Provider responses are used by subtests.
if (process.argv.length !== 2) fail('PREEXECUTION_ACCEPTS_NO_LIVE_ARGUMENTS');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }
const scripts = [
  'verify-ticket-18-strategy-case-compiler-v1.mjs',
  'verify-ticket-18-strategy-preexecution-v1.mjs',
  'verify-ticket-18-structured-generation-contracts-v1.mjs',
  'verify-ticket-18-context-capsule-and-failure-routing-v1.mjs',
  'verify-ticket-18-faction-strategy-workflow-v1.mjs',
  'verify-ticket-18-faction-continuation-v1.mjs',
  'verify-ticket-18-faction-structured-local-editor-runtime-v1.mjs',
  'verify-ticket-18-faction-structured-review-runtime-v1.mjs',
];
const files = ['package.json', 'scripts/verify-ticket-18-preexecution-v1.mjs', ...scripts.map(s => `scripts/${s}`),
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'scripts/support/strategy-case-fixture-v1.mjs',
  ...(await readdir(path.join(root, 'packages/strategy-skills'))).filter(f => f.endsWith('.mjs')).map(f => `packages/strategy-skills/${f}`),
  'packages/rule-atoms/official-marine-optional-stimpack-move-executor-v3.mjs',
  'packages/rule-atoms/official-strategy-case-runtime-v1.mjs', 'packages/rule-atoms/official-faq-rule-router-v2.mjs',
  'packages/skill-production-v3/faction-prompt-lineage-v1.mjs', 'packages/skill-production-v3/faction-repair-conflict-history-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
async function run(script, args = []) {
  const result = await promisify(execFile)(process.execPath, [path.join(root, 'scripts', script), ...args],
    { cwd: root, timeout: 900000, maxBuffer: 256 * 1024 });
  const data = JSON.parse(result.stdout.trim().split('\n').at(-1));
  if (data.passed !== true && data.ready !== true) fail('PREEXECUTION_CHILD_NOT_PASSED', { script });
  if (data.providerCalls !== undefined && data.providerCalls !== 0) fail('PREEXECUTION_PROVIDER_CALL_DETECTED', { script });
  console.log(JSON.stringify({ check: script, passed: true, providerCalls: 0 }));
  return { script, args, result: data };
}
const results = [];
for (const script of scripts) results.push(await run(script));
const lineage = await run('run-ticket-18-faction-strategy-production-v1.mjs', ['--preflight', '--overall-run',
  'guide-repair-bab46109030e9073f739', '--continue-from', 'faction-v1-f037c375d47fc41a5121']);
assert.equal(lineage.result.reusableRoles, 190);
assert.equal(lineage.result.legacyPromptRoles, 37);
assert.equal(lineage.result.firstUncachedRole, 'faction.terran_armed_forces.objectives.1.editor.2.2');
assert.equal(lineage.result.firstUncachedRoute, 'responses_json_schema');
results.push(lineage);
// A green result cannot attest code that changed while tests were running.
for (const row of codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('PREEXECUTION_CODE_CHANGED_DURING_CHECKS');
const report = seal({ schema: 'ticket18_unified_preexecution_readiness_v1', ticket: 18, slice: 174, passed: true,
  repairItems: ['current_frozen_move_adapter', 'explicit_faq46_corrected_consumer', 'case_metrics_coverage_privacy',
    'shared_structured_generation_and_local_reflection', 'prompt_lineage_and_no_duplicate_billing', 'unified_zero_paid_preflight'],
  codeHashes, results, providerCalls: 0, sourceRefreshPerformed: false,
  productionResumePreflightPassed: true, newStrategyLiveCapabilityProbePassed: false,
  actualStrategyProductionComplete: false, sourceOrStrategyAcceptanceInherited: false,
  runtimeAccepted: false, trainingTruth: false });
const output = path.join(root, 'build/ticket-18-strategy-preexecution-v1');
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'unified-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, groups: results.length, localRepairItems: 6,
  reusableRoles: 190, firstUncachedRole: lineage.result.firstUncachedRole, providerCalls: 0, hash: report.hash }));
