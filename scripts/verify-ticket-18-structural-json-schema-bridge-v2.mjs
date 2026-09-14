import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { decodeStructuralJsonV1 } from '../packages/structured-generation/adapters/structural-json-recovery-v1.mjs';
import { decodeStructuralJsonV2 } from '../packages/structured-generation/adapters/structural-json-recovery-v2.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as parsedBinding } from '../packages/structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { authenticateFactionStructuralReviewV1 } from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { prepareFactionStructuralJsonSchemaRepairV2, verifyFactionStructuralJsonSchemaCorrectionV2, coalesceFactionParsedReviewPartsV2 }
  from '../packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const files = ['packages/structured-generation/adapters/structural-json-recovery-v1.mjs',
  'packages/structured-generation/adapters/structural-json-recovery-v2.mjs',
  'packages/structured-generation/authenticated-structural-json-recovery-v2.mjs',
  'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs',
  'scripts/diagnose-ticket-18-current-structural-json-v1.mjs',
  'scripts/verify-ticket-18-structural-json-schema-bridge-v2.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const source = new DatabaseSync(filename, { readOnly: true });
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const reseal = (value, patch) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...patch }); };
const ledgerHash = () => hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledgerHash();
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
try {
  const ref = id => ({ id, version: 'v1', hash: hash(id) });
  const schema = { type: 'object', additionalProperties: false,
    properties: { items: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { reason: { type: 'string' }, sourceSlots: { type: 'array', items: { type: 'integer' } } },
      required: ['reason', 'sourceSlots'] } }, coverage: { type: 'array', items: { type: 'integer' } } },
    required: ['items', 'coverage'] };
  const bounded = schema => {
    if (schema.type === 'object') return { ...schema, required: Object.keys(schema.properties),
      properties: Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, bounded(value)])) };
    if (schema.type === 'array') return { minItems: 0, maxItems: 128, ...schema, items: bounded(schema.items) };
    if (schema.type === 'string') return { minLength: 0, maxLength: 2000, ...schema };
    if (schema.type === 'integer') return { minimum: -1000, maximum: 1000, ...schema };
    return schema;
  };
  const contractFor = (schema, suffix = '') => createStarcraftTmgOutputContractV1({
    id: 'fixture.structural-json-bridge' + suffix, version: 'v2', schemaName: 'structural_bridge_test', providerSchema: bounded(schema),
    modelOwnedFields: Object.keys(schema.properties), hostOwnedFields: ['receipt'],
    mapperRef: ref('fixture.mapper'), semanticValidatorRef: ref('fixture.validator'), description: 'Injected non-game parser test.' });
  const contract = contractFor(schema);
  const malformed = value => JSON.stringify(value).replace(',"coverage":', '}],"coverage":');
  const value = { items: [{ reason: 'Do not charge after a failed charge.', sourceSlots: [0, 1] }], coverage: [] };
  assert.throws(() => decodeStructuralJsonV1(malformed(value), contract), { code: 'STRUCTURAL_JSON_SYNTAX_UNSUPPORTED' }); checks++;
  for (let n = 0; n < 60; n++) {
    const original = { ...value, items: [{ reason: '中文😀\\引号" [] } 换行\n' + n, sourceSlots: [0, 1, n] }] };
    const text = malformed(original), result = decodeStructuralJsonV2(text, contract);
    eq(result.value, original); eq(result.validation.ok, true); eq(result.receipt.edits.length, 2);
    eq(result.receipt.scalarEdits, 0); eq(result.receipt.fieldsRemoved, 0);
    let rebuilt = text;
    for (const edit of [...result.receipt.edits].reverse()) {
      assert.equal(rebuilt[edit.offsetUtf16], edit.removed);
      rebuilt = rebuilt.slice(0, edit.offsetUtf16) + rebuilt.slice(edit.offsetUtf16 + 1);
    }
    eq(JSON.parse(rebuilt), original);
  }
  const extra = { ...value, extra: 'Keep this rejected evidence; do not silently delete it.' };
  const parsedExtra = decodeStructuralJsonV2(malformed(extra), contract);
  eq(parsedExtra.value, extra); eq(parsedExtra.validation.ok, false);
  eq(parsedExtra.receipt.nextStage, 'bounded_schema_correction_required');
  const wrongType = { ...value, items: [{ reason: 27, sourceSlots: [0] }] };
  eq(decodeStructuralJsonV2(malformed(wrongType), contract).validation.ok, false);
  const missing = { ...value, items: [{ sourceSlots: [0] }] };
  eq(decodeStructuralJsonV2(malformed(missing), contract).validation.ok, false);
  const ambiguousSchema = { type: 'object', additionalProperties: false,
    properties: { a: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { x: { type: 'integer' }, y: { type: 'integer', enum: [2] } }, required: ['x'] } },
    y: { type: 'integer', enum: [1] } }, required: ['a'] };
  // Value enums would favour one interpretation. They MUST NOT select it.
  assert.throws(() => decodeStructuralJsonV2('{"a":[{"x":0}],"y":1}]}', contractFor(ambiguousSchema, '.ambiguous')),
    { code: 'STRUCTURAL_JSON_V2_AMBIGUOUS_STRUCTURE' }); checks++;
  for (const text of [
    malformed(value).replace('"reason":', '"reason":"duplicate","reason":'),
    malformed(value).replace('"reason":', '"rea\\u0073on":"duplicate","reason":'),
  ]) { assert.throws(() => decodeStructuralJsonV2(text, contract), { code: 'STRUCTURAL_JSON_V2_DUPLICATE_KEY' }); checks++; }
  for (const text of [JSON.stringify(value).slice(0, -1), malformed(value) + ' explanation',
    malformed(value).replace('[0,1]', '[0,]'), malformed(value).replace('[0,1]', '[0 1]'),
    malformed(value).replace('[0,1]', '[9007199254740993]'),
    '```json\n' + malformed(value), malformed(value).replace('sourceSlots', 'bad\nkey'),
    malformed(value).replace('[0,1]', '[NaN]'), malformed(value).replace('[0,1]', '[1e400]'),
    ' '.repeat(65537), malformed(value).replace('}],"coverage"', '}}}]]],"coverage"')]) {
    assert.throws(() => decodeStructuralJsonV2(text, contract), error => /^STRUCTURAL_JSON_V2_/u.test(error.code)); checks++;
  }
  assert.throws(() => decodeStructuralJsonV2(JSON.stringify(value), contract), { code: 'STRUCTURAL_JSON_V2_NOT_APPLICABLE' }); checks++;

  const runId = 'faction-v1-961f12e8417c1f17beb9';
  const attemptId = 'structured-ce87d54764cb17e20fe85662a936b6cfc3c56ca5aaaa0871';
  const artifact = id => verifySeal(JSON.parse(source.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, id).artifact)).value;
  const json = async suffix => verifySeal(JSON.parse(await readFile(base + runId + '/' + suffix + '.json', 'utf8')));
  const ownerRecipe = await json('recipe'), input = await json('zerg_swarm-input');
  const issue = artifact(attemptId + '.wire-issue-v2');
  const origin = { runId, attemptId, issueHash: issue.hash };
  const draft = artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction').draft;
  const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 6);
  const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
  const request = { packet, roleId: issue.invocation.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
    task: 'Reconstruct the exact complete original failed role, without any Provider send.',
    workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
      coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
    idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  eq(prepared.capsule.hash, issue.invocation.contextManifestRef.hash);
  const helperRef = await inspectFactionWireKeyHelperV2();
  const authArgs = { filename, origin, ownerRecipe, prepared, executionPolicy, helperRef, parsedRecoveryBinding: parsedBinding };
  const first = await authenticateFactionStructuralReviewV1(authArgs);
  const second = await authenticateFactionStructuralReviewV1(authArgs);
  eq(first.proof.hash, second.proof.hash);
  assert.notEqual(first.accessReceiptHash, second.accessReceiptHash); checks++;
  eq(hash(first.proof.providerValue), 'bf70fa0404dcee91324f76d059aa50bee2106d240169879c9a0f4593ee277255');
  eq(first.proof.validation.issues, [{ path: '$.coverage[0].recommendationSlotsNote', code: 'additional_property_forbidden', additionalProperties: false }]);
  eq(first.proof.normalization.fieldsRemoved, 0);
  const preparation = prepareFactionStructuralJsonSchemaRepairV2({ capsule: prepared.capsule, authenticated: first.proof });
  for (const field of ['immutableBase', 'section', 'dependencyGraph', 'sourceIndexRef', 'expansionToolRef', 'omittedDomains'])
    eq(preparation.context[field], prepared.capsule[field]);
  for (const [key, val] of Object.entries(prepared.capsule.localIssue)) eq(preparation.context.localIssue[key], val);
  eq(preparation.allowedChangedPaths, ['$.coverage[0].recommendationSlotsNote']);
  eq(preparation.context.instructions.includes('Select at most eight'), false);
  // Explicitly injected correction. Not a real new Provider judgment/DSH run.
  const corrected = structuredClone(preparation.rejected.providerValue);
  delete corrected.coverage[0].recommendationSlotsNote;
  eq(first.proof.providerValue.verdicts.length, 2);
  eq(preparation.rejected.providerValue.verdicts.length, 1);
  eq(preparation.rejected.targetPartsReceipt.allReasonsPreserved, true);
  eq(preparation.context.localIssue.structuralJsonRecovery.originalProviderValue, first.proof.providerValue);
  eq(preparation.rejected.providerValue.verdicts[0].reason, first.proof.providerValue.verdicts.map(r => r.reason).join('\n\n'));
  eq([...new Set(preparation.rejected.providerValue.verdicts[0].sourceSlots)].sort((a, b) => a - b),
    [...new Set(first.proof.providerValue.verdicts.flatMap(r => r.sourceSlots))].sort((a, b) => a - b));
  for (const [mutate, code] of [
    [v => { v.verdicts[1].verdict = 'unsupported'; }, 'TARGET_PARTS_CONFLICT'],
    [v => { v.verdicts[1].targetSlot = 1; }, 'TARGET_PARTS_UNKNOWN_SLOT'],
    [v => { v.verdicts = []; }, 'TARGET_PARTS_MISSING_TARGET'],
    [v => { v.verdicts[1].extraNote = 'do not silently erase'; }, 'TARGET_PARTS_SHAPE_INVALID'],
  ]) {
    const value = structuredClone(first.proof.providerValue); mutate(value);
    assert.throws(() => coalesceFactionParsedReviewPartsV2({ capsule: prepared.capsule, providerValue: value }),
      { code: 'FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_' + code }); checks++;
  }
  const correction = verifyFactionStructuralJsonSchemaCorrectionV2({ preparation, capsule: prepared.capsule,
    authenticated: second.proof, correctedOutput: corrected });
  eq(correction.scope.allOtherValuesHashEqual, true); eq(correction.actualProviderExecutionProven, false);
  for (const mutate of [v => { v.verdicts[0].reason += ' rewritten'; },
    v => { v.verdicts[0].sourceSlots.pop(); }, v => { v.coverage[0].recommendationSlots = [1]; },
    v => { v.verdicts[0].verdict = 'unsupported'; }]) {
    const changed = structuredClone(corrected); mutate(changed);
    if (hash(changed) === hash(corrected)) continue;
    assert.throws(() => verifyFactionStructuralJsonSchemaCorrectionV2({ preparation, capsule: prepared.capsule,
      authenticated: second.proof, correctedOutput: changed })); checks++;
  }
  assert.throws(() => verifyFactionStructuralJsonSchemaCorrectionV2({ preparation, capsule: prepared.capsule,
    authenticated: second.proof, correctedOutput: first.proof.providerValue }), { code: 'FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_CORRECTION_SCHEMA_INVALID' }); checks++;
  for (const patch of [{ parsedRecoveryBinding: reseal(parsedBinding, { additionalProviderAttempts: 1 }) },
    { origin: { ...origin, issueHash: hash('wrong-issue') } },
    { prepared: { ...prepared, capsule: reseal(prepared.capsule, { instructions: 'shortened' }) } },
    { executionPolicy: { ...executionPolicy, maxOutputUnits: 4097 } }]) {
    await assert.rejects(authenticateFactionStructuralReviewV1({ ...authArgs, ...patch })); checks++;
  }
  assert.throws(() => prepareFactionStructuralJsonSchemaRepairV2({ capsule: prepared.capsule,
    authenticated: reseal(first.proof, { validation: { ...first.proof.validation, ok: true } }) })); checks++;
  eq(ledgerHash(), before);
  eq(await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))), codeHashes);
  const report = seal({ version: 'faction_structural_json_schema_bridge_component_v2', passed: true, checks,
    origin, contextHash: prepared.capsule.hash, authenticatedProof: first.proof, preparation, correction,
    actualPaidOwnerAuthenticated: true, originalCompleteRequestRebuilt: true,
    independentSecondRawAuthenticationPassed: true, originalLedgerUnchanged: true,
    injectedSchemaCorrectionOnly: true, actualDshSessions: 0, providerCalls: 0,
    formalRuntimeWired: false, productionResumed: false, semanticAcceptance: false, runtimeAccepted: false,
    trainingTruth: false, codeHashes });
  await writeFile(base + 'structural-json-schema-bridge-component-v2.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, checks, hash: report.hash, proofHash: first.proof.hash,
    contextHash: prepared.capsule.hash, actualRawRecovered: true, originalSchemaStillRejected: true,
    providerCalls: 0, actualDshSessions: 0, formalRuntimeWired: false }));
} finally { source.close(); }
