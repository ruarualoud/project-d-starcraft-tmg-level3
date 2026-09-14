import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { factionReviewDecompositionArgsV1, collectFactionReviewDecompositionStepsV1 }
  from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { prepareFactionReviewDecompositionV1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionParallelControlV1, runFactionLanesV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { createProductionFailureRouterV1 } from '../packages/skill-production/production-failure-routing-v1.mjs';

// Reproduce the actual saved quarantine and scheduler boundary without network,
// credentials, DSH, or mutations of the original journal. Not a main CLI run.
const root = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async file => verifySeal(JSON.parse(await readFile(root + file, 'utf8')));
const parentRunId = 'faction-v1-961f12e8417c1f17beb9';
const recipe = await json(parentRunId + '/recipe.json');
const diagnosis = await json('terran-wire-context-diagnosis-v2.json');
const input = await json(diagnosis.originRunId + '/terran_armed_forces-input.json');
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
const plan = prepareFactionReviewDecompositionV1(args);
const quarantine = recipe.continuation.reviewDecompositionMigration.childContinuation.quarantinedTasks[0];
const db = new DatabaseSync(filename, { readOnly: true });
let failure, isolated, before;
try {
  assert.equal(db.prepare('SELECT count(*) n FROM attempts WHERE code=?').get('PROVIDER_PAYMENT_REQUIRED').n, 0);
  assert.equal(db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId).recipe, recipe.hash);
  const all = () => db.prepare('SELECT * FROM attempts ORDER BY run,id').all();
  before = hash(all());
  failure = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId);
  const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'")
    .all(quarantine.originRunId).filter(row => row.id.startsWith(failure.id))
    .map(row => ({ id: row.id, inputHash: row.input_hash, artifact: verifySeal(JSON.parse(row.artifact)).value }));
  isolated = collectFactionReviewDecompositionStepsV1({ args, rows, attempts: [failure],
    dshBindingHash: recipe.dshBindingHash, egressBinding: {},
    resolveCapability: () => assert.fail('Unknown output is not a capability'),
    readSuccessEvidence: () => assert.fail('Unknown output is not a success'),
    fullRoleId: diagnosis.request.packet.id + '.' + diagnosis.request.roleId,
    packetHash: diagnosis.request.packet.hash, allowedRunIds: [failure.run],
    executionPolicyBinding: recipe.executionPolicyBinding });
  assert.deepEqual(isolated.proof.quarantinedTasks, [quarantine]);
  assert.equal(hash(all()), before);
} finally { db.close(); }
const code = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
const gateStillPresent = code.includes("if (quarantinesForInput(input).length) throw Object.assign(new Error('Unresolved original delivery; independent lane remains eligible'),");
const router = createProductionFailureRouterV1({ readArtifact: () => null, readAttempt: () => null });
const control = createFactionParallelControlV1({}, { failureRouter: router });
const lanes = await runFactionLanesV1({ inputs: [input, { factionRecordKey: 'faction:zerg_swarm' }], control,
  failureRouter: router, runLane: async (_, index) => {
    if (index === 0 && gateStillPresent && isolated.proof.quarantinedTasks.length)
      throw Object.assign(new Error('Unresolved original delivery; independent lane remains eligible'), { code: 'AMBIGUOUS_EGRESS_NO_RETRY' });
    return { fixtureOnly: true, providerCalls: 0 };
  } });
assert.equal(lanes.results[1].status, 'fulfilled');
assert.equal(control.stoppedCode, null);
const receipt = verifySeal(JSON.parse(failure.response)).value;
const report = seal({ version: 'terran_quarantine_diagnosis_v1', parentRunId, parentRecipeHash: recipe.hash,
  originalAttemptHash: hash(failure), originRunId: failure.run, originAttemptId: failure.id,
  receiptHash: receipt.receiptHash, originalUnknownReserveMicros: failure.reserve,
  originalUsageKnown: receipt.usageKnown, quarantine, planHash: plan.hash,
  jobs: plan.jobs.map(job => ({ id: job.id, kind: job.kind })),
  mainLiteralQuarantineGatePresent: gateStillPresent, actualMainExecuted: false,
  terranAtReproducedBoundary: lanes.results[0].status,
  independentLaneCanProceed: lanes.results[1].status === 'fulfilled',
  globalStop: control.stoppedCode, originalAttemptsUnchanged: true, providerCalls: 0,
  fullSourceContextRebuilt: true, runtimeAccepted: false, trainingTruth: false });
await writeFile(root + 'terran-quarantine-diagnosis-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (process.argv.includes('--require-terran-dispatch'))
  assert.equal(lanes.results[0].status, 'fulfilled', 'TERRAN_AUTHORIZED_REPLACEMENT_NOT_WIRED');
