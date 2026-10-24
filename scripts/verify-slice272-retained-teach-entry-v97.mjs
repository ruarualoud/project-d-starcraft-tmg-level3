// Actual B17/Teach14 entry mismatch; exercise the product service, in memory.
// Stop at the laboratory boundary: no Provider call, game action or disk write.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
const base = process.argv[2];
const original = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json', 'utf8'));
const current = JSON.parse(original.planSerialized);
const oldHash = original.teachFramework.planHash;
const queryId = 'q-terrain-formation-route-domain-ref';
assert.notEqual(oldHash, current.planHash);
assert(original.teachFramework.state.investigation.operations.some(o => o.queryId === queryId));
const fixture = structuredClone(original.teachFramework.context.fixture);
function workspace({ changedFixture = false, legacyPrematureClose = false } = {}) {
  const d = { ...original, teachFramework: structuredClone(original.teachFramework) };
  if (changedFixture) d.teachFramework.context.fixture.mapTopologyHash = 'f'.repeat(64);
  if (legacyPrematureClose) {
    const failure = d.teachFramework.state.investigation.evidence.find(e => e.challengeId === queryId);
    d.teachFramework.state.queryRecovery = { version: 1, operations: [{
      originalQueryId: queryId, completed: true, scopeAuditVersion: 1,
      status: 'unknown', maximumAttempts: 3, choices: [{ disposition: 'retry' }],
      choice: { disposition: 'retry' }, result: { ...failure,
        queryRepair: { correctable: true } },
    }] };
  }
  let entered = 0, saves = 0;
  const never = () => assert.fail('No Rules mutation or Provider operation in entry test');
  const service = createRosterPlanningWorkspaceServiceV1({
    // projectSession reads a menu solely to render the budget contract. This
    // entry test does not assert budget values or execute a Rules action.
    armyBuilderPort: { evaluateRosterCandidate: never, enumerateArmyBuildingChoices: () => ({
      unitCandidates: [], vespeneLimitForBudget: { numerator: 0, denominator: 1 },
    }),
      listFactionChoices: never, listEngagementScales: never },
    laboratoryCore: { labDescriptor: () => ({}), proveMutationZero: never, missionScoringAuthority: never },
    strategyPack: { foundational: { entries: [] }, receipt: { hash: 'a'.repeat(64) } }, fixture,
    draftStore: { loadAll: async () => ({ sessions: [d], quarantined: [] }), save: async () => { saves++; } },
    createRunLaboratory: () => { entered++; throw Error('ENTRY_PROBE_STOP_NO_PROVIDER'); },
    createStrategist: never,
    deliberationFactory: { createForRun: never },
  });
  return { service, d, entered: () => entered, saves: () => saves };
}
const request = { expectedPlanHash: current.planHash, sourceTeachPlanHash: oldHash,
  recoverFailedQueryIds: [queryId] };
const w = workspace();
await w.service.loadPersisted();
await w.service.teachPlanFramework(w.d.sessionId, request);
for (let n = 0; !w.entered() && n < 100; n++) await new Promise(r => setTimeout(r, 10));
assert.equal(w.entered(), 1, 'Explicit retained query must reach its original execution context');
assert.equal(w.d.teachFramework.planHash, oldHash);
assert.equal(w.d.teachFramework.state.sourceHash, original.teachFramework.state.sourceHash);
assert.equal(w.d.planSerialized, original.planSerialized, 'Current Plan must not be replaced by its older revision');
assert.equal(w.d.usage.calls, original.usage.calls);
assert.equal(w.d.teachFramework.context.sourceFacts.planHash, original.teachFramework.context.sourceFacts.planHash);
assert.equal(w.d.teachFramework.retainedQueryContinuation.targetPlanHash, current.planHash);
assert.equal(w.d.teachFramework.retainedQueryContinuation.automaticallyAppliedToTargetPlan, false);

const changed = workspace({ changedFixture: true });
await changed.service.loadPersisted();
await assert.rejects(changed.service.teachPlanFramework(changed.d.sessionId, request), /RETAINED_TEACH_DEPENDENCY_CHANGED/);
assert.equal(changed.entered(), 0);
assert.equal(changed.saves(), 0);

const closed = workspace({ legacyPrematureClose: true });
await closed.service.loadPersisted();
await closed.service.teachPlanFramework(closed.d.sessionId, request);
for (let n = 0; !closed.entered() && n < 100; n++) await new Promise(r => setTimeout(r, 10));
assert.equal(closed.entered(), 1, 'The workspace shortcut must not hide remaining correctable attempts');
assert.equal(closed.d.teachFramework.state.queryRecovery.operations[0].choices.length, 1);
assert.equal(closed.d.teachFramework.state.queryRecovery.operations[0].maximumAttempts, 3);
console.log(JSON.stringify({ status: 'PASS', actualB17Teach14Entry: true,
  oldQueryContextRetained: true, currentPlanUnchanged: true, changedMapRejected: true,
  prematureCloseNotSilentlyReused: true, attemptsNotReset: true,
  providerCalls: 0, roomActions: 0, originalWorkspaceWrites: 0,
  actualModelRepairOrStrategyProven: false }));
