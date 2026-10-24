import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
  const pending = structuredClone(draft.teachFramework.state.replyCorrections.findLast(r => r.status === 'pending'
    && r.correction?.code === 'ROSTER_TEACH_FRAMEWORK_OUTPUT_INVALID'));
  assert(pending, 'Use the actual saved A extra-field failure');
  const original = structuredClone(pending.correction.previousOutput);
  const contract = framework.rosterTeachFrameworkContractV1(pending.kind);
  const inspect = value => framework.inspectRosterTeachPublicOutputV1
    ? framework.inspectRosterTeachPublicOutputV1(contract, value)
    : { value, validation: validate(contract.providerSchema, value), normalization: null };
  let normalized;
  const rechecked = framework.revalidateRetainedRosterTeachReplyV1(pending, value => {
    normalized = inspect(value);
    assert(normalized.validation.ok, 'A paid valid map.inspect repair must not fail solely because of dispositionNote');
    const { schemaVersion, roundKind, ...choice } = normalized.value;
    assert.equal(choice.kind, 'spatial');
    assert.equal(JSON.parse(choice.toolRequestJson).queryKind, 'map.inspect');
    return choice;
  });
  assert.equal(rechecked.accepted, true, rechecked.error?.message);
  assert.equal(pending.revalidation.newModelCalls, 0);
  assert.deepEqual(pending.correction.previousOutput, original);
  const expected = structuredClone(original); delete expected.dispositionNote;
  assert.deepEqual(normalized.value, expected);
  assert.deepEqual(normalized.normalization.sidecar.map(x => [x.pointer, x.value]), [['/dispositionNote', '']]);
  report.checks.push('actual_paid_reply_reused_zero_calls_exact_core_preserved_raw_and_extra_kept');
  const explanatory = inspect({ ...original, extraReason: 'Additional public commentary' });
  assert.equal(explanatory.validation.ok, true);
  assert.deepEqual(explanatory.value, expected);
  assert(explanatory.normalization.sidecar.some(x => x.pointer === '/extraReason'));
  const missing = structuredClone(original); delete missing.toolRequestJson;
  assert.equal(inspect(missing).validation.ok, false);
  const privileged = inspect({ ...original, trainingTruth: true });
  assert.equal(privileged.validation.ok, false);
  const nested = inspect({ ...original, toolRequestJson: '{"queryKind":"map.inspect","argumentsJson":"{}","unrecognizedArgument":true}' });
  assert.equal(nested.value.toolRequestJson, '{"queryKind":"map.inspect","argumentsJson":"{}","unrecognizedArgument":true}');
  report.checks.push('unknown_commentary_is_sidecar_missing_core_and_host_authority_still_fail_native_arguments_untouched');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
