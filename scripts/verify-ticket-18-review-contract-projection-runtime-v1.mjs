import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionReviewContractProjectionRuntimeV1, verifyFactionReviewContractProjectionRoleV1 }
  from '../packages/skill-production-v3/faction-review-contract-projection-runtime-v1.mjs';
import { loadFactionContractProjectionActualFixturesV1 } from './support/faction-contract-projection-actual-fixture-v1.mjs';

assert.equal(process.argv.length, 2);
const fixtures = await loadFactionContractProjectionActualFixturesV1();
const original = new DatabaseSync(fixtures[0].filename, { readOnly: true });
const before = hash(original.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const dsh = await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' });
const directory = await mkdtemp('build/ticket-18-faction-production-v1/contract-projection-runtime-');
let calls = 0, checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const outputs = [];
for (const f of fixtures) {
  const filename = directory + '/' + f.name + '.sqlite';
  const options = { runId: 'projection-' + f.name, recipeHash: hash({ directory, name: f.name }) };
  let journal = openProductionStore(filename, options);
  const reader = async () => {
    const fresh = (await loadFactionContractProjectionActualFixturesV1()).find(row => row.name === f.name);
    return { originalEvidence: fresh.originalEvidence };
  };
  const wrappedDsh = { ...dsh, async run(q) { calls++; return dsh.run(q); } };
  const runtime = () => createFactionReviewContractProjectionRuntimeV1({ input: f.input,
    store: withProductionExecutionPolicyV1(journal, f.recipe.executionPolicyBinding), dsh: wrappedDsh, readEvidence: reader });
  let value;
  try { value = await runtime().run(f.prepared); eq(journal.summary().calls, 0); }
  finally { journal.close(); }
  const count = calls;
  journal = openProductionStore(filename, options);
  try {
    eq((await runtime().run(f.prepared)).hash, value.hash); eq(calls, count);
    const proof = verifyFactionReviewContractProjectionRoleV1({ ...f, value, dshBindingHash: dsh.binding.hash });
    eq(proof.semanticAcceptance, false); eq(proof.providerReceiptHashes.length, 1);
    const { hash: ignored, ...body } = value;
    assert.throws(() => verifyFactionReviewContractProjectionRoleV1({ ...f,
      value: seal({ ...body, semanticAcceptance: true }), dshBindingHash: dsh.binding.hash })); checks++;
    assert.throws(() => verifyFactionReviewContractProjectionRoleV1({ ...f,
      value: seal({ ...body, output: { ...value.output, injected: 'changed' } }), dshBindingHash: dsh.binding.hash })); checks++;
    outputs.push({ name: f.name, roleHash: value.hash, materializationHash: value.materialization.hash });
  } finally { journal.close(); }
}
eq(calls, 2); eq(hash(original.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before); original.close();
const files = ['packages/skill-production-v3/faction-review-contract-projection-v1.mjs',
  'packages/skill-production-v3/faction-review-contract-projection-runtime-v1.mjs',
  'scripts/support/faction-contract-projection-actual-fixture-v1.mjs', 'scripts/verify-ticket-18-review-contract-projection-runtime-v1.mjs'];
const report = seal({ version: 'faction_review_contract_projection_runtime_v1', passed: true, checks, outputs, directory,
  actualDshSessions: calls, providerCalls: 0, restartWithoutRepeatedDshOrProvider: true, originalJournalUnchanged: true,
  productionMainWired: false, fullColdStackWired: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile('build/ticket-18-faction-production-v1/review-contract-projection-runtime-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, directory, hash: report.hash, actualDshSessions: calls, providerCalls: 0,
  productionMainWired: false }));
