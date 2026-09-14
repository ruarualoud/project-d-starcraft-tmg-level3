import assert from 'node:assert/strict';
import { withPhasedSessionDeadlineV1 } from '../packages/skill-production/session-lifecycle-v1.mjs';

function virtualClock() {
  let time = 0, next = 0;
  const timers = new Map();
  return {
    now: () => time,
    setTimer(fn, delay) { const id = ++next; timers.set(id, { at: time + delay, fn }); return id; },
    clearTimer: id => timers.delete(id),
    advance(delta) { time += delta; for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); } },
    timers: () => timers.size,
  };
}
const limits = { maxWallMs: 5, preparationMaxWallMs: 10, finalizationMaxWallMs: 3 };
let checks = 0;
{
  const clock = virtualClock();
  const result = await withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    clock.advance(8);
    const response = await lifecycle.guard(async () => { clock.advance(4); return { value: 1 }; })();
    lifecycle.beginFinalization(); clock.advance(2); return response;
  });
  assert.equal(result.value, 1); checks++;
  assert.deepEqual(result.lifecycle.durationsMs, { preparation: 8, execution: 4, finalization: 2 }); checks++;
  assert.equal(result.lifecycle.totalMs, 14); checks++;
  assert.equal(clock.timers(), 0); checks++;
}
{
  const clock = virtualClock(); let modelCalls = 0;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    clock.advance(11);
    await lifecycle.guard(async () => { modelCalls++; })();
  }), error => error.code === 'DSH_PREPARATION_TIME_EXHAUSTED'
    && error.lifecycle.timeoutPhase === 'preparation'); checks++;
  assert.equal(modelCalls, 0); checks++;
  assert.equal(clock.timers(), 0); checks++;
}
{
  const clock = virtualClock(); let settled = false, aborted = false;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    try {
      await lifecycle.guard(async () => {
        clock.advance(6); aborted = lifecycle.signal.aborted;
        settled = true; return { late: true };
      })();
    } finally { clock.advance(2); }
  }), error => error.code === 'SESSION_WALL_TIME_EXHAUSTED'
    && error.lifecycle.timeoutPhase === 'execution'); checks++;
  assert.ok(settled && aborted); checks++;
  assert.equal(clock.timers(), 0); checks++;
}
{
  const clock = virtualClock(); let calls = 0;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    await lifecycle.guard(async () => { calls++; })();
    lifecycle.beginFinalization(); clock.advance(4); return { done: true };
  }), error => error.code === 'DSH_FINALIZATION_TIME_EXHAUSTED'
    && error.lifecycle.timeoutPhase === 'finalization'); checks++;
  assert.equal(calls, 1); checks++;
}
{
  const clock = virtualClock(); let calls = 0;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    await lifecycle.guard(async () => { calls++; })(); lifecycle.beginFinalization();
    await lifecycle.guard(async () => { calls++; })();
  }), { code: 'DSH_BRIDGE_AFTER_FINAL_COMMAND' }); checks++;
  assert.equal(calls, 1); checks++;
}
{
  const clock = virtualClock(); let drained = false;
  const original = Object.assign(new Error('transport outcome unknown'), { code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND' });
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    try { await lifecycle.guard(async () => { clock.advance(2); throw original; })(); }
    finally { clock.advance(2); drained = true; }
  }), error => error === original && error.lifecycle.failedPhase === 'execution'
    && error.lifecycle.durationsMs.finalization === 2); checks++;
  assert.ok(drained); checks++;
}
{
  const clock = virtualClock();
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async () => ({ fabricated: true })),
    { code: 'DSH_FINAL_COMMAND_NOT_OBSERVED' }); checks++;
  assert.equal(clock.timers(), 0); checks++;
}
{
  const clocks = [virtualClock(), virtualClock()], signals = [];
  const results = await Promise.all(clocks.map((clock, index) => withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    signals.push(lifecycle.signal); await lifecycle.guard(async () => { clock.advance(index + 1); })();
    lifecycle.beginFinalization(); return { index };
  })));
  assert.notEqual(signals[0], signals[1]); checks++;
  assert.deepEqual(results.map(row => row.index), [0, 1]); checks++;
  assert.ok(clocks.every(clock => clock.timers() === 0)); checks++;
}
{
  const clock = virtualClock(); let calls = 0;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, clock }, async lifecycle => {
    try { lifecycle.beginFinalization(); } catch {}
    await lifecycle.guard(async () => { calls++; })();
  }), { code: 'DSH_FINAL_COMMAND_PHASE_INVALID' }); checks++;
  assert.equal(calls, 0); checks++;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, preparationMaxWallMs: 180001, clock }, async () => {})); checks++;
  await assert.rejects(withPhasedSessionDeadlineV1({ ...limits, finalizationMaxWallMs: 60001, clock }, async () => {})); checks++;
}
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0,
  scope: 'phase_lifecycle_interface_with_deterministic_time_not_actual_dsh_or_skill_acceptance' }));
