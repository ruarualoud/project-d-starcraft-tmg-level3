// Stop/release each production session port explicitly. Real atomic store and
// frozen official Builder; recorded model/Teach/tool answers are controlled I/O,
// NOT evidence of model quality, new terrain execution, or final Plan acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { createIterativeRosterBuilderAdapterV1 } from '../packages/roster-strategist/iterative-roster-builder-adapter-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1, resolveOfficialDevelopmentTrancheFixtureRootV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';

const base = path.resolve(process.argv[2]);
const selected = process.argv[3] || 'all';
const output = await fs.mkdtemp(path.join(base, 'session-step-debug-v314-'));
const originalDir = path.join(base, 'B/fresh-generation-v264/workspace/iterative-draft/sessions');
const originalFile = path.join(originalDir, (await fs.readdir(originalDir)).find(x => x.endsWith('.json')));
const originalStat = await fs.stat(originalFile);
const original = JSON.parse(await fs.readFile(originalFile, 'utf8')).value;
const rows = [2, 3, 4].map(revision => original.iterations.find(x => x.revision === revision));
assert(rows.every(Boolean));
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root: process.cwd() });
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: fixtureRoot });
const officialBuilder = createIterativeRosterBuilderAdapterV1(createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }),
}));
const results = [], traces = [];
const copy = structuredClone;
const replyFor = row => ({ outcome: 'completed', receiptHash: row.modelReceiptHash, decision: copy(row.publicDecision) });
const full = rows[2];
const routeObservation = original.observations.find(x => x.query.kind === 'map_route'
  && x.query.candidateHash === full.currentCandidateHash && x.receipt.status === 'certified');
assert(routeObservation);

// An actual asynchronous breakpoint: a wrapped operation cannot execute, or
// deliver its result to the caller, until the test inspects and releases it.
function debuggerGate() {
  const queued = [], waiting = [];
  // Checkpoint/shouldPause are executable port arguments, not JSON payloads.
  // Label only those functions in the debugger view; execute original args.
  const inspectable = value => typeof value === 'function' ? { debuggerCallable: true }
    : Array.isArray(value) ? value.map(inspectable)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, inspectable(entry)])) : value;
  const pause = (name, value) => new Promise(resolve => {
    const ticket = { name, value: inspectable(value), release: resolve };
    if (waiting.length) waiting.shift()(ticket); else queued.push(ticket);
  });
  return {
    wrap: (name, fn) => async (...args) => {
      await pause(`${name}:input`, args);
      const result = await fn(...args);
      await pause(`${name}:output`, result);
      return result;
    },
    async next(name, check) {
      let timer;
      const ticket = await Promise.race([
        queued.length ? Promise.resolve(queued.shift()) : new Promise(resolve => waiting.push(resolve)),
        new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`MISSING_BREAKPOINT:${name}`)), 10000); }),
      ]).finally(() => clearTimeout(timer));
      assert.equal(ticket.name, name);
      await check(ticket.value);
      traces.push({ boundary: name, inputOrOutputHash: hash(ticket.value) });
      ticket.release();
    },
  };
}
async function check(id, work) {
  if (selected !== 'all' && selected !== id) return;
  try { results.push({ id, pass: true, detail: await work() }); }
  catch (error) { results.push({ id, pass: false, code: error.code || null, error: error.message }); }
}
async function fixture(id, options = {}) {
  const store = createIterativeRosterFileStoreV1({ directory: path.join(output, id) });
  const sessionId = `step-debug-${id}`;
  const counts = { decide: 0, recover: 0, builder: 0, query: 0, draft: 0, final: 0, commits: 0 };
  let nextReply = options.reply || replyFor(full);
  let injected = options.injected || {};
  const stateAtModel = [];
  const ports = {
    store: { ...store, prepareSave(idValue, state) {
      const prepared = store.prepareSave(idValue, state);
      const captured = copy(state);
      return { async commit(control) {
        if (injected.save?.(captured)) throw Object.assign(Error('INJECTED_DISK_WRITE_FAILURE'), { code: 'EIO' });
        await prepared.commit(control); counts.commits++;
        const persisted = await store.load(idValue);
        assert.deepEqual(persisted.currentCandidate, captured.currentCandidate);
        assert.deepEqual(persisted.plan, captured.plan);
        assert.equal(persisted.revision, captured.revision);
      } };
    } },
    model: {
      async decide(input) {
        counts.decide++; stateAtModel.push(copy(input.state));
        if (injected.model) throw Object.assign(Error('INJECTED_RESPONSE_INTERRUPTED'), { code: 'ETIMEDOUT' });
        return copy(nextReply);
      },
      async recover(input) { counts.recover++; stateAtModel.push(copy(input.state)); return copy(nextReply); },
    },
    builder: { async evaluate(candidate, state) {
      counts.builder++;
      const verdict = await officialBuilder.evaluate(candidate, state);
      return injected.builder ? { ...verdict, candidateHash: hash('wrong candidate') } : verdict;
    } },
    tools: { async query(query, state) {
      counts.query++;
      assert.equal(query.candidateHash, state.currentCandidate.candidateHash);
      const retained = original.observations.find(x => x.query.kind === query.kind
        && x.query.candidateHash === query.candidateHash);
      assert(retained, `No original scoped receipt for ${query.kind}`);
      return copy(retained.receipt);
    } },
    review: {
      async draft(state) {
        counts.draft++;
        if (options.replayTeach) {
          const historical = original.draftTeachSnapshots.find(x => x.sourcePlanHash === hash(state.plan));
          assert(historical && historical.status === 'completed');
          assert.deepEqual(historical.candidateInput, state.currentCandidate.input);
          // Replay only the public critique; test does not generate/approve it.
          state.draftTeachFeedback = { sourcePlanHash: historical.sourcePlanHash,
            candidateHash: historical.candidateHash, synthesis: copy(historical.state.synthesis),
            advisoryOnly: true, finalAcceptance: false };
        }
        return state;
      },
      async final() { counts.final++; return { reviewHash: hash('injected-high-review'), blockingFindings: ['UNRESOLVED_FACT'] }; },
    },
  };
  if (options.gate) for (const [port, method] of [['model', 'decide'], ['model', 'recover'],
    ['builder', 'evaluate'], ['tools', 'query'], ['review', 'draft'], ['review', 'final']]) {
    ports[port][method] = options.gate.wrap(`${port}.${method}`, ports[port][method]);
  }
  const session = createIterativeRosterPlanSessionV1(ports);
  await session.start({ sessionId, mineralBudget: 2000, frozenContext: copy(original.frozenContext) });
  if (options.seed !== false) {
    const saved = await store.load(sessionId);
    Object.assign(saved, { revision: 10, currentCandidate: copy(full.candidateSnapshot), plan: copy(full.planSnapshot),
      observations: [copy(routeObservation)], iterations: [] });
    await store.save(sessionId, saved);
  }
  return { store, session, sessionId, counts, stateAtModel, ports,
    setReply(value) { nextReply = value; }, setFault(value) { injected = value; },
    async read() { return store.load(sessionId); } };
}

await check('recorded_roster_plan_changes_step_by_step', async () => {
  const gate = debuggerGate();
  const f = await fixture('normal', { seed: false, reply: replyFor(rows[0]), gate, replayTeach: true });
  const snapshots = [];
  async function boundary(name, validateInput, validateOutput) {
    await gate.next(`${name}:input`, validateInput);
    await gate.next(`${name}:output`, validateOutput);
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]; f.setReply(replyFor(row));
    const before = await f.read();
    const running = f.session.resume(f.sessionId);
    // Attach a rejection handler immediately: a failed assertion must not hide
    // a real exception in the production operation behind a breakpoint timeout.
    const settled = running.then(value => ({ value }), error => ({ error }));
    if (i === 2) await boundary('tools.query', ([query, state]) => {
      assert.equal(query.kind, 'map_route'); assert.equal(query.candidateHash, before.currentCandidate.candidateHash);
      assert.deepEqual(state.plan, before.plan);
    }, receipt => assert.deepEqual(receipt, routeObservation.receipt));
    if (i > 0) await boundary('review.draft', ([state]) => {
      assert.deepEqual(state.plan, before.plan);
      assert.deepEqual(state.currentCandidate, before.currentCandidate);
    }, state => {
      assert.equal(state.draftTeachFeedback.sourcePlanHash, hash(before.plan));
      assert.equal(state.draftTeachFeedback.candidateHash, before.currentCandidate.candidateHash);
      assert.equal(state.draftTeachFeedback.finalAcceptance, false);
    });
    await boundary('model.decide', ([input]) => {
      assert.equal(input.state.pendingDecision, null);
      assert.deepEqual(input.state.plan, before.plan);
      assert.deepEqual(input.state.currentCandidate, before.currentCandidate);
      if (i > 0) assert.equal(input.state.draftTeachFeedback.sourcePlanHash, hash(before.plan));
    }, reply => assert.deepEqual(reply, replyFor(row)));
    if (row.decisionKind === 'propose') await boundary('builder.evaluate', ([candidate, state]) => {
      assert.deepEqual(candidate, row.publicDecision.candidateInput);
      assert.deepEqual(state.currentCandidate, before.currentCandidate, 'Builder must evaluate before overwriting the accepted army');
    }, verdict => {
      assert.equal(verdict.legal, true); assert.equal(verdict.mineralSpent, row.candidateSnapshot.mineralSpent);
      assert.equal(verdict.candidateHash, hash(row.publicDecision.candidateInput));
    });
    if (i === 0) await boundary('tools.query', ([query, state]) => {
      assert.equal(query.kind, 'exact_budget_repairs');
      assert.equal(state.currentCandidate.mineralSpent, 920);
      assert.equal(state.plan.candidateHash, state.currentCandidate.candidateHash);
    }, receipt => {
      assert.equal(receipt.exactBudgetImpossibilityClaimed, false);
      assert(receipt.matches.length > 0);
      assert(receipt.matches.every(x => x.mineralSpent === 2000));
    });
    const outcome = await settled; if (outcome.error) throw outcome.error;
    const disk = await f.read();
    assert.deepEqual(disk, outcome.value, 'Next process must read the exact committed result');
    assert.deepEqual(disk.currentCandidate, row.candidateSnapshot);
    assert.deepEqual(disk.plan, row.planSnapshot);
    assert.equal(disk.pendingDecision, null);
    snapshots.push({ sourceRevision: row.revision, candidate: disk.currentCandidate, plan: disk.plan,
      publicReason: row.publicDecision.plan.strategy?.revisionReason || null,
      evidenceConsumed: disk.observations.map(x => ({ query: x.query, receiptHash: x.receipt.receiptHash })) });
  }
  await fs.writeFile(path.join(output, 'actual-step-contents.json'), JSON.stringify(snapshots, null, 2));
  return { counts: f.counts, changes: ['920-point draft and initial Plan', '2000-point army plus revised Plan',
    'same army with Plan-only revision'], exactNextInputVerified: true, strategyImprovementProved: false };
});

await check('model_response_interrupted_reuses_same_request', async () => {
  const f = await fixture('model-interrupted', { injected: { model: true } });
  await assert.rejects(f.session.resume(f.sessionId), { code: 'ETIMEDOUT' });
  const stopped = await f.read();
  assert.equal(stopped.status, 'requires_reconciliation'); assert(stopped.pendingDecision?.recoveryRequired);
  f.setFault({}); await f.session.resume(f.sessionId);
  const after = await f.read();
  assert.equal(f.counts.decide, 1); assert.equal(f.counts.recover, 1);
  assert.equal(after.iterations[0].requestKey, stopped.pendingDecision.requestKey);
  assert.equal(after.pendingDecision, null);
  return f.counts;
});
await check('final_save_failure_recovers_without_new_model_decision', async () => {
  let failOnce = true;
  const f = await fixture('save-failure', { reply: replyFor(rows[0]) });
  const before = await f.read();
  f.setFault({ save: state => state.revision === 11 && failOnce && (failOnce = false, true) });
  await assert.rejects(f.session.resume(f.sessionId), { code: 'EIO' });
  const stopped = await f.read();
  assert.deepEqual(stopped.plan, before.plan); assert.deepEqual(stopped.currentCandidate, before.currentCandidate);
  assert.equal(stopped.revision, 10); assert(stopped.pendingDecision);
  await f.session.resume(f.sessionId);
  const after = await f.read();
  assert.equal(f.counts.decide, 1); assert.equal(f.counts.recover, 1);
  assert.equal(after.revision, 11); assert.equal(after.iterations.length, 1);
  assert.equal(after.currentCandidate.mineralSpent, 920);
  assert.equal(after.plan.candidateHash, after.currentCandidate.candidateHash);
  return f.counts;
});
await check('wrong_builder_result_does_not_partially_commit', async () => {
  const f = await fixture('wrong-builder', { reply: replyFor(rows[0]), injected: { builder: true } });
  const before = await f.read();
  await assert.rejects(f.session.resume(f.sessionId), { code: 'ITERATIVE_ROSTER_RULES_VERDICT_INVALID' });
  const stopped = await f.read();
  assert.deepEqual(stopped.currentCandidate, before.currentCandidate); assert.deepEqual(stopped.plan, before.plan);
  f.setFault({}); await f.session.resume(f.sessionId);
  assert.equal(f.counts.decide, 1); assert.equal(f.counts.recover, 1);
  return f.counts;
});
await check('illegal_roster_returns_fact_without_replacing_current_plan', async () => {
  const reply = replyFor(rows[1]); reply.decision.candidateInput.units[0].recordKey = 'army_units:not_a_real_unit';
  const f = await fixture('illegal-roster', { reply }); const before = await f.read();
  await f.session.resume(f.sessionId); const after = await f.read();
  assert.deepEqual(after.currentCandidate, before.currentCandidate); assert.deepEqual(after.plan, before.plan);
  assert.equal(after.observations.at(-1).query.kind, 'builder_verdict');
  assert.notEqual(after.observations.at(-1).receipt.status, 'legal');
  assert.equal(after.pendingDecision, null);
  return { rejection: after.observations.at(-1).receipt, counts: f.counts };
});
await check('stale_map_query_never_reaches_tool', async () => {
  const f = await fixture('stale-query', { reply: { outcome: 'completed', receiptHash: hash('stale-query'),
    decision: { kind: 'query', question: 'fault injection', queries: [{ kind: 'map_route', candidateHash: hash('wrong-army') }] } } });
  await assert.rejects(f.session.resume(f.sessionId), { code: 'ITERATIVE_ROSTER_MAP_QUERY_STALE_CANDIDATE' });
  assert.equal(f.counts.query, 0); assert.equal((await f.read()).revision, 10);
  return f.counts;
});
await check('unknown_model_outcome_is_not_a_completed_decision', async () => {
  const f = await fixture('unknown-outcome', { reply: { outcome: 'unknown' } });
  const before = await f.read();
  await assert.rejects(f.session.resume(f.sessionId), { code: 'ITERATIVE_ROSTER_MODEL_OUTCOME_UNKNOWN' });
  const after = await f.read();
  assert.equal(after.status, 'requires_reconciliation'); assert.equal(after.revision, before.revision);
  assert.deepEqual(after.plan, before.plan); assert(after.pendingDecision);
  return f.counts;
});
await check('exact_noop_is_repair_not_fake_strategy_progress', async () => {
  const f = await fixture('exact-noop'); const before = await f.read();
  f.setReply({ outcome: 'completed', receiptHash: hash('noop'),
    decision: { kind: 'revise_plan', plan: copy(before.plan), assumptionDisposition: before.plan.assumptionDisposition } });
  await f.session.resume(f.sessionId); const after = await f.read();
  assert.deepEqual(after.plan, before.plan); assert.equal(after.iterations.at(-1).decisionKind, 'repair_needed');
  assert.equal(after.observations.at(-1).receipt.failureCode, 'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED');
  return { strategyUnchanged: true, repairPreserved: true };
});
await check('stale_teach_cannot_accept_current_plan', async () => {
  const f = await fixture('stale-teach'); const before = await f.read();
  await assert.rejects(f.session.attachTeachFeedback(f.sessionId, { status: 'planned',
    agentSelectedCandidateHash: before.currentCandidate.candidateHash,
    agentSelectedStrategySource: { iterativeSessionId: f.sessionId, planHash: hash('another-plan') },
    plan: { planHash: hash('taught-plan') } }), { code: 'ITERATIVE_ROSTER_TEACH_FEEDBACK_SOURCE_INVALID' });
  assert.deepEqual(await f.read(), before); assert.equal(f.counts.decide, 0);
  return { currentPlanNotAccepted: true };
});
await check('high_final_review_never_becomes_ready', async () => {
  const f = await fixture('review-high'); const before = await f.read();
  f.setReply({ outcome: 'completed', receiptHash: hash('finish'), decision: { kind: 'finish',
    plan: { ...before.plan, mapEvidenceHash: routeObservation.receipt.receiptHash }, assumptionDisposition: 'retain' } });
  await f.session.resume(f.sessionId); const after = await f.read();
  assert.equal(after.status, 'paused'); assert.equal(after.blockingFinding, 'ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED');
  assert.deepEqual(after.finalReview.blockingFindings, ['UNRESOLVED_FACT']);
  assert.equal(after.iterations.length, 1); assert.equal(after.pendingDecision, null);
  return f.counts;
});
await check('pause_and_duplicate_run_during_model_step', async () => {
  const gate = debuggerGate(); const f = await fixture('pause', { seed: false, gate, reply: replyFor(rows[0]) });
  const running = f.session.resume(f.sessionId);
  const settled = running.then(value => ({ value }), error => ({ error }));
  await gate.next('model.decide:input', async () => {
    await assert.rejects(f.session.resume(f.sessionId), { code: 'ITERATIVE_ROSTER_SESSION_BUSY' });
    await f.session.pause(f.sessionId);
    assert.equal((await f.read()).pauseRequested, true);
  });
  await gate.next('model.decide:output', value => assert.equal(value.outcome, 'completed'));
  await gate.next('builder.evaluate:input', ([input]) => assert.deepEqual(input, rows[0].publicDecision.candidateInput));
  await gate.next('builder.evaluate:output', value => assert.equal(value.mineralSpent, 920));
  await gate.next('tools.query:input', ([query]) => assert.equal(query.kind, 'exact_budget_repairs'));
  await gate.next('tools.query:output', value => assert.equal(value.exactBudgetImpossibilityClaimed, false));
  const result = await settled; if (result.error) throw result.error;
  const after = await f.read(); assert.equal(after.status, 'paused');
  assert.equal(after.revision, 1); assert.equal(after.pendingDecision, null);
  assert.equal(f.counts.decide, 1); assert.equal(after.currentCandidate.mineralSpent, 920);
  return { paidReplyRetainedBeforePause: true, duplicateRunRejected: true, counts: f.counts };
});

const finalStat = await fs.stat(originalFile);
assert.equal(finalStat.mtimeMs, originalStat.mtimeMs, 'Never write the production session');
assert.equal(finalStat.size, originalStat.size);
const report = { scope: 'controlled production session operations, atomic file store, real frozen official Builder; model/Teach/map answers replayed',
  selected, pass: results.length > 0 && results.every(x => x.pass), results, breakpointCount: traces.length,
  sourcePlanHashes: rows.map(x => x.planHash), providerCalls: 0, liveRoomWrites: 0,
  finalAdmission: false, strategyImprovementProved: false, trainingTruth: false, output };
await fs.writeFile(path.join(output, 'breakpoints.json'), JSON.stringify(traces, null, 2));
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
