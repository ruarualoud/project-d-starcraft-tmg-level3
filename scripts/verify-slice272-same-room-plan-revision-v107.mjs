// Captured A4 live journal -> real A8 repair. No Room/Provider mutation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgTurnPlanRuntimeV1 } from '../packages/online-agent-session/turn-plan-runtime-v1.mjs';
import { createStarcraftTmgMatchDecisionContinuityV1 } from '../packages/online-agent-session/match-decision-continuity-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/transition-v1.mjs';
import { projectStarcraftTmgRosterPlanAttachmentV1 } from '../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs';

const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const base = root + '/build/ticket-23-three-arm-performance-baseline-20261010-v1';
const room = root + '/build/ticket-23-slice-248-standard-2000-aa-live-v1/query-v33-clean-A-20261013-v1';
const db = new DatabaseSync(room + '/seats/player1/match-memory.sqlite', { readOnly: true });
const original = db.prepare('SELECT record_json FROM sc_match_decision_journal ORDER BY sequence').all().map(row => JSON.parse(row.record_json));
db.close();
const draft = JSON.parse(await readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const history = draft.planVersionHistory.map(value => JSON.parse(value));
const rosterPlan = [...history, JSON.parse(draft.planSerialized)].find(plan => plan.planVersion === 8);
const source = original.filter(row => ['turn_plan', 'plan_revision'].includes(row.kind)).at(-1);
const origin = source.payload.pregamePlanOrigin;
assert.equal(origin.rosterPlanVersion, 4);
assert(rosterPlan);
const scope = { gameId: 'starcraft-tmg', roomId: origin.roomId, matchBindingHash: origin.matchBindingHash, seatKey: origin.seatKey };
const a = source.authority;
const legalSpaceHash = hash({ fixture: 'saved-plan-revision-authority', stateHash: a.stateHash });
// This is the actual saved authority and memory, projected to the fields this
// consumer reads. Deliberately no fresh full-roster audit: casualties are not a
// change to the immutable pregame list. This is not a replay/legality claim.
const input = { scope,
  roomProjection: { room: { roomId: origin.roomId, stateRevision: a.stateRevision, stateHash: a.stateHash },
    matchBinding: { bindingHash: origin.matchBindingHash }, viewer: { seatKey: scope.seatKey },
    state: { round: a.round, phase: a.phase, activeSideKey: scope.seatKey,
      board: { deploymentId: origin.deploymentRecordKey },
      officialMissionRuntimeState: { missionRecordKey: origin.missionRecordKey, sourceSnapshotHash: origin.sourceSnapshotHash } } },
  legalSpace: { roomId: origin.roomId, matchBindingHash: origin.matchBindingHash, stateRevision: a.stateRevision, stateHash: a.stateHash, legalSpaceHash },
  spatialActionSpace: { authority: { stateRevision: a.stateRevision, stateHash: a.stateHash, legalSpaceHash }, actionSpaceHash: hash({ legalSpaceHash }), finiteActions: [], parameterDomains: [] },
  rosterPlan, rosterSessionReceipt: draft.sessionReceipt, rosterPriorPlans: history,
  replacesRosterPlanHash: origin.rosterPlanHash,
};
function setup() {
  const rows = structuredClone(original);
  const continuity = createStarcraftTmgMatchDecisionContinuityV1({ journal: {
    durability: 'captured_journal_memory_only', read: async () => ({ ok: true, records: structuredClone(rows) }),
    append: async (_scope, record) => { rows.push(structuredClone(record)); return { ok: true }; },
  } });
  return { rows, continuity, runtime: createStarcraftTmgTurnPlanRuntimeV1({ decisionContinuity: continuity }) };
}
const { runtime, rows, continuity } = setup();
await runtime.hydrate({ scope });
const before = runtime.read({ scope });
const adopted = await runtime.dispatch({ ...input,
  ...projectStarcraftTmgRosterPlanAttachmentV1({ plan: rosterPlan,
    sessionReceipt: draft.sessionReceipt, priorPlans: history,
    replacesRosterPlanHash: origin.rosterPlanHash }) });
assert.equal(adopted.result.event, 'roster_plan_revision_adopted');
assert.equal(adopted.plan.planId, before.plan.planId);
assert.equal(adopted.plan.version, before.plan.version + 1);
assert.equal(adopted.plan.parentVersion, before.plan.version);
assert.equal(adopted.plan.pregamePlanOrigin.rosterPlanHash, rosterPlan.planHash);
assert.equal(adopted.plan.pregamePlanOrigin.previousRosterPlanHash, origin.rosterPlanHash);
assert.equal(adopted.plan.pregamePlanOrigin.openedAtStateRevision, 0);
assert.equal(adopted.plan.pregamePlanOrigin.revisedAtStateRevision, a.stateRevision);
assert.deepEqual(adopted.plan.pregameRosterArrivalSchedule, before.plan.pregameRosterArrivalSchedule);
assert.equal(adopted.reflectionRequired, true);
assert.equal(adopted.nextIntent, null);
assert.deepEqual(rows.slice(0, original.length), original);
assert.equal(rows.length, original.length + 1);
assert.equal(runtime.read({ scope }).intentCount, before.intentCount);
assert.equal(runtime.read({ scope }).outcomeCount, before.outcomeCount);
const repeat = await runtime.dispatch({ ...input, command: 'adopt_roster_plan_revision' });
assert.equal(repeat.result.event, 'roster_plan_already_open');
assert.equal(rows.length, original.length + 1);
const restored = createStarcraftTmgTurnPlanRuntimeV1({ decisionContinuity: continuity });
await restored.hydrate({ scope });
assert.equal(restored.read({ scope }).plan.parentVersion, before.plan.version);
assert.equal(restored.read({ scope }).plan.pregamePlanOrigin.rosterPlanHash, rosterPlan.planHash);
assert.equal(restored.read({ scope }).intentCount, before.intentCount);
assert.equal(restored.read({ scope }).outcomeCount, before.outcomeCount);
const recalled = await continuity.query({ scope, query: { kinds: ['prediction_calibration'], limit: 100000 } });
assert.equal(recalled.records.length, original.filter(row => row.kind === 'prediction_calibration').length);

for (const [label, change, expected] of [
  ['implicit', { command: 'open_roster_plan' }, /different TurnPlan/],
  ['wrong-source', { command: 'adopt_roster_plan_revision', replacesRosterPlanHash: '0'.repeat(64) }, /REVISION_SOURCE_MISMATCH/],
  ['different-room', { command: 'adopt_roster_plan_revision', roomProjection: { ...input.roomProjection, room: { ...input.roomProjection.room, roomId: 'different-room' } } }, /current authority/],
]) {
  const lane = setup();
  await lane.runtime.hydrate({ scope });
  await assert.rejects(lane.runtime.dispatch({ ...input, ...change }), expected, label);
  assert.equal(lane.rows.length, original.length);
  assert.equal(lane.runtime.read({ scope }).plan.pregamePlanOrigin.rosterPlanHash, origin.rosterPlanHash);
}
console.log(JSON.stringify({ status: 'PASS', oldRosterVersion: 4, newRosterVersion: 8,
  capturedAuthorityRevision: a.stateRevision, historyRecordsPreserved: original.length,
  intentsPreserved: before.intentCount, outcomesPreserved: before.outcomeCount,
  predictionsPreserved: recalled.records.length, idempotent: true, restartPreserved: true,
  providerCalls: 0, roomActions: 0, productionJournalWrites: 0 }));
