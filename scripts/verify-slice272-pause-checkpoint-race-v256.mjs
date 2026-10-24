// Reproduce fresh-B's acknowledged pause overwritten by a stale Teach save.
// The real product session runs; only storage scheduling and model are stubs.
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
const copy = structuredClone;
let stored, releaseCheckpoint, checkpointEntered;
let blockCheckpoint = true, draftCalls = 0, modelCalls = 0;
const entered = new Promise(resolve => { checkpointEntered = resolve; });
const released = new Promise(resolve => { releaseCheckpoint = resolve; });
const store = { load: async () => stored ? copy(stored) : null,
  save: async (_id, state) => {
    const snapshot = copy(state);
    if (snapshot.retainedPaidOutput === 'saved-response' && blockCheckpoint) {
      blockCheckpoint = false; checkpointEntered(); await released;
    }
    stored = snapshot;
  } };
let service;
const id = 'pause-race-v256';
service = createIterativeRosterPlanSessionV1({ store,
  builder: { evaluate: async () => { throw Error('Builder not in this race'); } },
  tools: { query: async () => { throw Error('No new query required'); } },
  model: { decide: async () => { modelCalls++; throw Error('EXPLICIT_RESUME_REACHED_MODEL'); } },
  review: { final: async () => { throw Error('No final review in this race'); },
    draft: async (state, checkpoint, control) => {
      draftCalls++;
      if (draftCalls > 1) {
        assert.equal(await control.shouldPause(), false, 'Explicit Run must clear the prior pause');
        return state;
      }
      state.retainedPaidOutput = 'saved-response';
      const saving = checkpoint(state);
      await entered;
      const pausing = service.pause(id);
      // Old implementation writes pause=true while the older save is waiting;
      // the new implementation queues that control mutation after the save.
      await setImmediate(); releaseCheckpoint();
      await Promise.all([saving, pausing]);
      assert.equal(await control.shouldPause(), true,
        'Acknowledged pause must survive an in-flight stale Teach checkpoint');
      assert.equal(stored.pauseRequested, true, 'Pause must be durable, not just an in-memory hint');
      assert.equal(stored.retainedPaidOutput, 'saved-response', 'Pause must not overwrite the paid output');
      return state;
    } } });
await service.start({ sessionId: id, mineralBudget: 2000,
  frozenContext: { mapHash: 'map-locked-v256', taskHash: 'task-locked-v256', sourceHash: 'source-locked-v256' } });
stored.currentCandidate = { candidateHash: 'candidate-v256', mineralSpent: 2000 };
stored.plan = { victoryRoute: 'unchanged diagnostic Plan' };
stored.observations = [{ query: { kind: 'map_route', candidateHash: 'candidate-v256' },
  receipt: { status: 'certified' } }];
const stopped = await service.resume(id);
assert.equal(stopped.status, 'paused');
assert.equal(stopped.pendingDecision, null);
assert.equal(modelCalls, 0, 'No next decision may start after pause');
await assert.rejects(service.resume(id), /EXPLICIT_RESUME_REACHED_MODEL/);
assert.equal(modelCalls, 1);
assert.equal(stored.retainedPaidOutput, 'saved-response');
console.log(JSON.stringify({ status: 'PASS', acknowledgedPauseSurvivesConcurrentCheckpoint: true,
  paidOutputPreserved: true, noDecisionAfterPause: true, explicitResumeWorks: true,
  providerCalls: 0, nativeExecutions: 0, gamesStarted: 0 }));
