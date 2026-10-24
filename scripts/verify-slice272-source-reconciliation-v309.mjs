// D's real ordinary product resume must recover mixed source evidence before
// buying a model correction. No hand-authored Plan or replacement receipt.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { rosterPlanExperimentGroupV274 } from '../content/roster-plan-experiment-matrix-v274.mjs';

const [base] = process.argv.slice(2);
const directory = path.join(base, 'roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions');
const originalPath = path.join(directory, (await fs.readdir(directory)).find(n => n.endsWith('.json')));
const original = await fs.readFile(originalPath, 'utf8');
const envelope = JSON.parse(original), session = envelope.value ?? envelope;
const before = session.draftTeachSnapshots.at(-1);
assert.equal(before.failure.code, 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED');
const oldSource = before.failure.detail.mismatches.sourceStateHash.saved;
const currentSource = before.failure.detail.mismatches.sourceStateHash.current;
const copy = await fs.mkdtemp(path.join(base, 'source-reconciliation-v309-'));
const store = createIterativeRosterFileStoreV1({ directory: path.join(copy, 'iterative-draft') });
await store.save(session.sessionId, session);
const cfg = JSON.parse(await fs.readFile(path.join(base, 'common-v79-plan-recovery-config.private.json'), 'utf8'));
let nextModelRequest;
const product = await createRosterPlanningProductModuleV1({ root: process.cwd(),
  fixtureRoot: cfg.fixtureRoot, dataDirectory: copy, enableIterativeDraft: true,
  referenceArmyRecipes: rosterPlanExperimentGroupV274('D').referenceArmyRecipes,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')),
  deliberationFactory: { availability: () => ({ available: true }),
    createForRun: async () => ({ deliberate: async request => {
      nextModelRequest = { kind: request.roundKind, contextHash: request.contextHash };
      throw Object.assign(Error('RECOVERED_BEFORE_PROVIDER'), { code: 'RECOVERED_BEFORE_PROVIDER' });
    } }) },
});
await assert.rejects(() => product.iterativeDraft.resume(session.sessionId),
  { code: 'RECOVERED_BEFORE_PROVIDER' }, 'SOURCE_FAILURE_MUST_REACH_NORMAL_MODEL_BOUNDARY');
const afterSession = await store.load(session.sessionId);
const after = afterSession.draftTeachSnapshots.at(-1);
const reconciliation = after.state.sourceReconciliations.at(-1);
assert.equal(reconciliation.status, 'completed');
assert.equal(reconciliation.currentSourceStateHash, currentSource);
assert.ok(reconciliation.previousSourceStateHashes.includes(oldSource));
assert.ok(reconciliation.items.length > 0);
assert.ok(reconciliation.items.every(item => item.status === 'completed' && item.originalReceipt));
assert.equal(hash(after.plan), hash(before.plan));
assert.equal(hash(afterSession.currentCandidate), hash(session.currentCandidate));
assert.deepEqual(after.usage, before.usage);
assert.deepEqual(after.dispatches, before.dispatches);
assert.deepEqual(after.state.calls.slice(0, before.state.calls.length), before.state.calls);
assert.equal(after.state.queryRecovery.operations[0].maximumAttempts,
  before.state.queryRecovery.operations[0].maximumAttempts);
assert.equal(after.state.queryRecovery.operations[0].choices.length, 0);
assert.ok(!after.state.investigation.evidence.some(row => row.sourceReceipt?.sourceStateHash === oldSource));
assert.equal(after.state.evidence.length, before.state.evidence.length);
assert.deepEqual(after.state.evidence, before.state.evidence, 'Unchanged initial-root evidence is not re-executed');
assert.equal(await fs.readFile(originalPath, 'utf8'), original);
assert.ok(nextModelRequest.contextHash);
console.log(JSON.stringify({ passed: true, reconciledQueries: reconciliation.items.length,
  oldEvidencePreserved: true, armyAndPlanUnchanged: true, priorCallsAndFeesPreserved: true,
  correctionAllowanceUnchanged: true, finalPlanAccepted: false,
  providerCalls: 0, nextModelRequest, copy }));
