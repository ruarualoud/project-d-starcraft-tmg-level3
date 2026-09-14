import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { loadFactionParsedValueActualFixtureV1 } from './support/faction-parsed-value-actual-fixture-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1 as binding, inspectFactionParsedReviewValueV1,
  verifyFactionParsedReviewValueRecordV1, materializeFactionParsedReviewValueV1 } from '../packages/skill-production-v3/faction-parsed-review-value-v1.mjs';

const args = process.argv.slice(2); assert(args.length === 0 || args.length === 1 && args[0] === '--dsh');
const base = 'build/ticket-18-faction-production-v1/', actual = await loadFactionParsedValueActualFixtureV1();
const { prepared, authenticated } = actual;
const original = new DatabaseSync(actual.filename, { readOnly: true });
const paid = () => original.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(actual.runId, actual.origin.attemptId);
const before = hash(paid());
let checks = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const reseal = ({ hash: ignored, ...body }, patch) => seal({ ...body, ...patch });
eq(authenticated.proof.validation.ok, true);
eq(authenticated.proof.normalization.edits.length, 1);
eq(authenticated.proof.normalization.edits[0].removed, '}');
eq(inspectFactionParsedReviewValueV1({ capsule: prepared.capsule, authenticated: authenticated.proof }), authenticated.proof.providerValue);
for (const patch of [{ nativeSuccessReceiptInvented: true }, { runtimeAccepted: true }, { additionalProviderAttempts: 1 },
  { contextManifestRef: { hash: hash('foreign') } }, { validation: { ok: false } },
  { providerValue: { ...authenticated.proof.providerValue, verdicts: [] } },
  { normalization: reseal(authenticated.proof.normalization, { scalarEdits: 1 }) }]) {
  assert.throws(() => inspectFactionParsedReviewValueV1({ capsule: prepared.capsule,
    authenticated: reseal(authenticated.proof, patch) }), { code: 'FACTION_PARSED_REVIEW_VALUE_ORIGIN_INVALID' }); checks++;
}
const directory = await mkdtemp(base + 'parsed-review-value-'), filename = directory + '/journal.sqlite';
const options = { runId: 'parsed-value-fixture', recipeHash: hash(directory), maxCalls: 1 };
const fakeBinding = seal({ fixtureOnly: true, injectedDsh: true });
let sessions = 0;
const implementation = args.includes('--dsh') ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: fakeBinding, async run(q) { const result = await q.callModel(); return seal({ runtimeBinding: fakeBinding,
    sandboxReceipt: { fixtureOnly: true }, calls: 1, toolTrace: [], final: result.command.content,
    transcript: [{ call: 1, receiptHash: result.receiptHash, commandHash: sha256(JSON.stringify(result.command)) }],
    directNetworkUsed: false, trainingTruth: false }); } };
const dsh = { ...implementation, async run(q) { sessions++; return implementation.run(q); } };
const readAuthenticated = () => actual.reader(prepared);
let store = openProductionStore(filename, options), record;
try {
  record = await materializeFactionParsedReviewValueV1({ capsule: prepared.capsule, readAuthenticated, store, dsh });
  eq(store.summary().calls, 0); eq(sessions, 1);
} finally { store.close(); }
store = openProductionStore(filename, options);
try {
  eq((await materializeFactionParsedReviewValueV1({ capsule: prepared.capsule, readAuthenticated, store, dsh })).hash, record.hash);
  eq(store.summary().calls, 0); eq(sessions, 1);
} finally { store.close(); }
const fresh = await readAuthenticated();
eq(verifyFactionParsedReviewValueRecordV1({ record, capsule: prepared.capsule, authenticated: fresh.proof,
  dshBindingHash: dsh.binding.hash }).output, authenticated.proof.providerValue);
assert.throws(() => verifyFactionParsedReviewValueRecordV1({ record: reseal(record, { semanticAcceptance: true }),
  capsule: prepared.capsule, authenticated: fresh.proof, dshBindingHash: dsh.binding.hash })); checks++;
const host = materializeFactionSlotReviewV1({ ...prepared.mapping, capsule: prepared.capsule,
  providerOutput: record.loop.final, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
eq(host.receipt.semanticAcceptanceInherited, false);
eq(host.receipt.runtimeAccepted, false);
eq(hash(paid()), before); original.close();
const files = ['packages/skill-production-v3/faction-parsed-review-value-v1.mjs',
  'scripts/support/faction-parsed-value-actual-fixture-v1.mjs', 'scripts/verify-ticket-18-parsed-review-value-v1.mjs'];
const report = seal({ passed: true, checks, bindingHash: binding.hash, origin: actual.origin, record,
  hostMaterializationHash: host.receipt.hash, providerCalls: 0, actualDshSessions: args.includes('--dsh') ? sessions : 0,
  dshInjectionUsed: !args.includes('--dsh'), productionMainWired: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + (args.includes('--dsh') ? 'parsed-review-value-dsh-v1' : 'parsed-review-value-fixture-v1') + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0,
  actualDshSessions: report.actualDshSessions, productionMainWired: false }));
