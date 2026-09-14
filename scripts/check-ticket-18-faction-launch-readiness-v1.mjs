import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';

// Read-only fast lint of all active gate manifests. Run before the expensive
// authenticated history replay, never instead of it. No Provider or Keychain.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.argv[2];
if (process.argv.length !== 3 || !/^faction-v1-[a-f0-9]{20}$/u.test(runId || '')) fail('FACTION_LAUNCH_CHECK_ARGUMENTS');
const base = 'build/ticket-18-faction-production-v1/';
const json = async file => verifySeal(JSON.parse(await readFile(path.join(root, file), 'utf8')));
const parent = await json(base + runId + '/recipe.json');
const names = ['input-readiness', 'workflow-readiness', 'dsh-context-readiness', 'continuation-readiness',
  'json-recovery-readiness', 'targeted-corrections-readiness', 'review-evidence-readiness',
  'parallel-readiness', 'teach-recovery-readiness', 'catalogue-review-readiness', 'event-loop-fairness-readiness',
  'structured-teach-readiness', 'review-recovery-budget-readiness', 'teach-output-budget-readiness', 'native-production-readiness',
  'teach-uncertainty-recovery-readiness', 'review-focus-capacity-readiness',
  'metadata-recovery-readiness',
  'target-completion-readiness',
  'native-output-capacity-readiness',
  'target-id-review-readiness',
  'explicit-slot-review-readiness-v1',
  'wire-runtime-readiness-v2',
  'review-decomposition-readiness-v1',
  'wire-address-recovery-readiness-v1',
  'zerg-unit-timing-readiness-v1',
  'unit-role-field-repair-readiness', 'unit-role-repair-workflow-readiness', 'unit-role-field-dsh-readiness',
  'source-field-repair-v2-readiness', 'source-field-dsh-v2-readiness', 'source-repair-workflow-v2-readiness',
  'command-envelope-readiness', 'review-focus-normalization-readiness', 'execution-policy-readiness-v1'];
names.push('slot-review-dsh-runtime-v1', 'slot-review-readiness-v1',
  'field-recovery-readiness-v1',
  'field-value-readiness-v1',
  'field-source-readiness-v1',
  'mixed-review-readiness-v1',
  'resume-reliability-readiness-v1',
  'contract-projection-readiness-v1',
  'structural-json-recovery-component-v1', 'authenticated-structural-json-v1', 'structural-json-readiness-v1',
  'review-source-expansion-component-v1', 'source-expansion-dsh-runtime-v1', 'source-expansion-readiness-v1',
  'structural-json-schema-bridge-component-v2', 'parsed-wire-dsh-runtime-v2', 'parsed-wire-schema-readiness-v2',
  'observed-source-repair-readiness', 'planning-repair-readiness',
  'bounded-generation-readiness-v2', 'draft-policy-readiness-v2');
if (parent.executionModelBinding) names.push('execution-model-readiness-v1');
if (parent.budgetExtension) names.push('budget-extension-readiness');
if (parent.fieldRepairBinding) names.push('field-seed-readiness');
if (parent.phaseFieldBinding) names.push('phase-field-seed-readiness');
if (parent.reviewTransactionBindings) names.push('review-transaction-readiness');
const files = [...names.map(n => base + n + '.json'),
  ...(parent.additionalCommandRecoveryBindings || []).map(b => base + b.parentRunId + '/review-metadata-recovery-readiness.json'),
  'build/ticket-17-production-redesign-v1/readiness.json',
  'build/ticket-18-structured-generation-v1/r6-structured-local-editor-runtime-readiness.json',
  'build/ticket-18-structured-generation-v1/r6-structured-review-runtime-readiness.json'];
const issues = [], cache = new Map();
for (const file of files) {
  try {
    const report = await json(file);
    if (!report.passed || !Array.isArray(report.codeHashes)) { issues.push({ gate: file, code: 'GATE_NOT_PASSED' }); continue; }
    for (const row of report.codeHashes) {
      try {
        if (!cache.has(row.file)) cache.set(row.file, sha256(await readFile(path.join(root, row.file))));
        if (cache.get(row.file) !== row.hash) issues.push({ gate: file, file: row.file, code: 'CODE_HASH_DRIFT' });
      } catch (error) { issues.push({ gate: file, file: row.file, code: error.code || 'READ_ERROR' }); }
    }
    if (file === 'build/ticket-17-production-redesign-v1/readiness.json') {
      for (const n of (await readdir(path.join(root, 'packages/skill-production'))).filter(n => n.endsWith('.mjs')))
        if (!report.codeHashes.some(row => row.file === 'packages/skill-production/' + n))
          issues.push({ gate: file, file: 'packages/skill-production/' + n, code: 'FROZEN_PACKAGE_EXTRA_FILE' });
    }
  } catch (error) { issues.push({ gate: file, code: error.code || 'INVALID_GATE' }); }
}
console.log(JSON.stringify({ ready: issues.length === 0, gatesChecked: files.length, codeFilesChecked: cache.size,
  issues, authenticatedHistoryReplayStillRequired: true, paidCalls: 0, artifactsModified: false }));
if (issues.length) process.exitCode = 1;
