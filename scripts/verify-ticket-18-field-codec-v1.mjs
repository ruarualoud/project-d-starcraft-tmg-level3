import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createStructuredFieldCodecV1, STRUCTURED_FIELD_CODEC_BINDING_V1 as binding,
  STRUCTURED_FIELD_CODEC_BINDING_V2 as emptyExtensionBinding,
  STRUCTURED_FIELD_CODEC_BINDING_V3 as auditedExtensionBinding } from '../packages/structured-generation/field-codec-v1.mjs';
import { createStarcraftTmgOutputContractV1, validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import * as reviews from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as nativeContracts,
  FACTION_NATIVE_PRODUCTION_PROBE_SAMPLES_V1 as nativeSamples } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as editorContract } from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const codec = createStructuredFieldCodecV1(contract);
for (const c of [...Object.values(reviews).filter(v => v?.schemaVersion === 'starcraft_tmg_output_contract_v1'), contract]) {
  const tool = createStructuredFieldCodecV1(c), a = tool.compile(), b = tool.compile('deepseek_strict_tool');
  eq(hash(a.localSchema), hash(c.providerSchema));
  eq(hash(b.localSchema), hash(c.providerSchema));
  eq(a.deferredConstraints, []);
  eq(b.providerCapabilityVerified, false);
  eq(b.deferredConstraints.every(row => ['minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength'].includes(row.keyword)), true);
  eq(b.rows, a.rows);
  eq(a.rows.find(row => row.path === '$.verdicts[].sourceSlots').constraints.maxItems,
    c.providerSchema.properties.verdicts.items.properties.sourceSlots.maxItems);
}
rejects(() => codec.compile('guess'), 'FIELD_CODEC_TRANSPORT_UNSUPPORTED');
for (const [kind, c] of Object.entries(nativeContracts)) {
  const tool = createStructuredFieldCodecV1(c), sample = nativeSamples[kind];
  eq(tool.compile().localSchema, c.providerSchema);
  eq(tool.complete(tool.inspect(sample)).value, sample);
  eq(tool.complete(tool.inspect({ ...sample, extension: null })).value, sample);
  const key = Object.keys(sample)[0], partial = structuredClone(sample); delete partial[key];
  const plan = tool.inspect(partial);
  eq(plan.jobs.map(row => row.pointer), ['/' + key]);
  eq(tool.complete(plan, { field0: sample[key] }).value, sample);
  eq(tool.inspect({ ...sample, warning: 'unsupported source' }).status, 'needs_adjudication');
}
eq(createStructuredFieldCodecV1(editorContract).compile().localSchema, editorContract.providerSchema);
rejects(() => createStructuredFieldCodecV1({ ...contract, contractHash: hash('wrong') }));
eq(codec.compile().instructions.includes('"maxItems":128'), true);
eq(codec.compile().instructions.includes('Select at most eight'), false);

const ref = id => ({ id, version: 'v1', hash: hash(id) });
const simpleContract = createStarcraftTmgOutputContractV1({ id: 'test.field', version: 'v1', schemaName: 'test_field',
  providerSchema: { type: 'object', properties: {
    answer: { type: 'string', minLength: 1, maxLength: 64 },
    flags: { type: 'array', items: { type: 'boolean' }, minItems: 1, maxItems: 3 },
    count: { type: 'integer', minimum: 0, maximum: 3 },
  }, required: ['answer', 'flags', 'count'], additionalProperties: false },
  modelOwnedFields: ['answer', 'flags', 'count'], hostOwnedFields: ['ownerId'],
  mapperRef: ref('test.mapper'), semanticValidatorRef: ref('test.validator'), description: 'Independent role fixture' });
const simple = createStructuredFieldCodecV1(simpleContract), valid = { answer: 'retain negative: unsupported', flags: [false], count: 1 };
const simpleV2 = createStructuredFieldCodecV1(simpleContract,
  { binding: emptyExtensionBinding });
const simpleV3 = createStructuredFieldCodecV1(simpleContract,
  { binding: auditedExtensionBinding });
eq(simple.complete(simple.inspect(valid)).value, valid);
eq(simple.inspect({ ...valid, extra: '' }).status, 'needs_adjudication');
const emptyExtension = simpleV2.inspect({ ...valid, extra: '' });
eq(emptyExtension.status, 'shape_ready');
eq(simpleV2.complete(emptyExtension).value, valid);
eq(emptyExtension.sidecar[0].reason, 'unknown_empty_string_extension');
eq(simpleV2.inspect({ ...valid, extra: ' ' }).status, 'needs_adjudication');
for (const value of ['', ' ', 'do not accept', false, 0, [], {}, { verdict: 'unsupported' }]) {
  const p = simpleV3.inspect({ ...valid, extra: value });
  eq(p.status, 'shape_ready');
  eq(p.sidecar[0].value, value);
  eq(simpleV3.complete(p).value, valid);
}
for (const key of ['memo', 'extra', 'field_with_slash/x', 'field.with.dot', 'tilde~test']) {
  const original = { ...valid, [key]: null }, p = simple.inspect(original), r = simple.complete(p);
  eq(p.status, 'shape_ready'); eq(r.value, valid); eq(r.sidecar[0].value, null);
  eq(Object.hasOwn(original, key), true); eq(simple.verify({ originalValue: original, completion: r }).hash, r.hash);
}
for (const value of ['do not accept', false, 0, [], {}, { verdict: 'unsupported' }]) {
  const p = simple.inspect({ ...valid, extra: value });
  eq(p.status, 'needs_adjudication'); eq(p.sidecar[0].value, value);
  rejects(() => simple.complete(p), 'FIELD_CODEC_ADJUDICATION_REQUIRED');
}
for (const key of ['ownerId', 'trainingTruth', 'runtimeAccepted', 'constructor', '__proto__']) {
  const p = simple.inspect(JSON.parse(JSON.stringify(valid).slice(0, -1) + ',' + JSON.stringify(key) + ':null}'));
  eq(p.status, 'needs_adjudication'); rejects(() => simple.complete(p), 'FIELD_CODEC_ADJUDICATION_REQUIRED');
}
for (const bad of [undefined, NaN, Infinity, -0, new Date(), { a: undefined }, { a: 9007199254740992 },
  Object.defineProperty({}, 'x', { enumerable: true, get() { throw new Error('getter must not execute'); } })])
  rejects(() => simple.inspect(bad), 'FIELD_CODEC_NON_JSON_VALUE');
const sparse = []; sparse[1] = false; rejects(() => simple.inspect(sparse), 'FIELD_CODEC_NON_JSON_VALUE');
const cyclic = {}; cyclic.self = cyclic; rejects(() => simple.inspect(cyclic), 'FIELD_CODEC_VALUE_LIMIT');
const missing = simple.inspect({ answer: valid.answer, flags: valid.flags });
eq(missing.jobs.map(row => row.pointer), ['/count']);
eq(missing.jobs[0].requiresSemanticReview, true);
rejects(() => simple.complete(missing), 'FIELD_CODEC_VALUES_REQUIRED');
rejects(() => simple.complete(missing, { field0: 1, answer: 'rewrite' }), 'FIELD_CODEC_REPLACEMENTS_INVALID');
rejects(() => simple.complete(missing, { field0: 5 }), 'FIELD_CODEC_REPLACEMENTS_INVALID');
const repaired = simple.complete(missing, { field0: 1 }); eq(repaired.value, valid);
eq(repaired.changedPointers, ['/count']); eq(repaired.semanticAcceptance, false);
eq(simple.verify({ originalValue: missing.originalValue, completion: repaired, replacements: { field0: 1 } }).hash, repaired.hash);
rejects(() => simple.complete(reseal(missing, { jobs: [] })), 'FIELD_CODEC_INSPECTION_DRIFT');
rejects(() => simple.verify({ originalValue: missing.originalValue, completion: reseal(repaired, { value: { ...valid, answer: 'forged' } }),
  replacements: { field0: 1 } }), 'FIELD_CODEC_COMPLETION_DRIFT');
rejects(() => simple.complete(simple.inspect(valid), { field0: 1 }), 'FIELD_CODEC_UNREQUESTED_REPLACEMENTS');
const badArray = simple.inspect({ ...valid, flags: ['wrong', true, true, true] });
eq(badArray.jobs.map(row => row.pointer), ['/flags']);
eq(simple.complete(badArray, { field0: [false] }).value, valid);

const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try {
  const snapshot = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
  const before = snapshot(), run = 'faction-v1-5fdab77171f213a6e7c9';
  eq(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const candidate = id => verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(run, id + '.rejected-candidate').artifact)).value);
  const original = candidate('structured-2a9e1746184bbd7392e41f800c4325cd595a4cb79299809a');
  const paidRepair = candidate('structured-20d631c3ce82ca5ef16385820507886c67d85d446ab8c9c1');
  const pending = codec.inspect(original.providerValue), normalized = codec.inspect(paidRepair.providerValue);
  eq(pending.status, 'needs_values'); eq(pending.jobs.map(row => row.pointer), ['/coverage']);
  eq(Object.keys(pending.repairContract.providerSchema.properties), ['field0']);
  rejects(() => codec.complete(pending), 'FIELD_CODEC_VALUES_REQUIRED');
  eq(normalized.status, 'shape_ready'); eq(normalized.sidecar.length, 1);
  eq(normalized.sidecar[0].pointer, '/coverage/0/recommendationSlots_note');
  const recovered = codec.complete(normalized);
  eq(hash(recovered.value.verdicts), hash(original.providerValue.verdicts));
  eq(validate(contract.providerSchema, recovered.value).ok, true);
  eq(codec.verify({ originalValue: paidRepair.providerValue, completion: recovered }).hash, recovered.hash);
  // Reuse already-paid missing judgments, never label them fresh model output.
  const completed = codec.complete(pending, { field0: recovered.value.coverage });
  eq(completed.value, recovered.value); eq(completed.newModelValuesUsed, true);
  eq(completed.semanticAcceptance, false); eq(pending.originalValidation.ok, false);
  eq(snapshot(), before);
  const files = ['packages/structured-generation/field-codec-v1.mjs', 'scripts/verify-ticket-18-field-codec-v1.mjs'];
  const report = seal({ version: 'structured_field_codec_proof_v1', bindingHash: binding.hash,
    passed: true, checks, actualCandidateHashes: [original.hash, paidRepair.hash],
    recoveredValueHash: recovered.valueHash, originalVerdictsPreserved: true,
    completionHash: recovered.hash, typedMissingCoverageHash: completed.hash,
    originalLedgerUnchanged: true, providerCalls: 0, actualDshSessions: 0,
    productionWired: false, semanticAcceptance: false, trainingTruth: false,
    codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
  await writeFile('build/ticket-18-faction-production-v1/field-codec-v1.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { db.close(); }
