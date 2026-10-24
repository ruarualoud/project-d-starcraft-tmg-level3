import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { projectRosterTeachCapabilityGuideV1, resumeRosterTeachDependentQueriesV1,
  rosterTeachInvestigationWindowV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, output] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
const report = { providerCalls: 0, sourceDraftWrites: 0 };
try {
  const ctx = d.teachFramework.context.queryContext;
  assert(ctx.scenarioConstruction.allowedKinds.includes('native_action'));
  const catalog = projectRosterTeachCapabilityGuideV1(ctx, d.teachFramework.context).toolSurfaceCatalog;
  assert(catalog, 'Native query subtypes must not masquerade as the complete callable tool catalog');
  assert.equal(catalog.nativeQueryKindsAreExhaustiveToolList, false);
  assert(catalog.inspect.returns.includes('cardResources'));
  assert(catalog.inspect.returns.includes('actionSpace'));
  assert.deepEqual(catalog.scenario.allowedKinds, ctx.scenarioConstruction.allowedKinds);
  assert.deepEqual(catalog.nativeAction, ctx.scenarioConstruction.nativeActionBranch);
  assert.equal(projectRosterTeachCapabilityGuideV1(ctx, {}, { includeToolCatalog: false }).toolSurfaceCatalog, undefined,
    'Exact pending paid prompts can still be revalidated without changing their context');
  const state = structuredClone(d.teachFramework.state), old = state.investigation.dependencyContinuation;
  const oldLimit = old.startRound + old.maximumAdditionalBatches;
  const count = state.investigation.rounds.length;
  resumeRosterTeachDependentQueriesV1(state, old.questionIds, { refreshToolCatalog: true });
  const window = rosterTeachInvestigationWindowV1(state);
  assert.equal(window.limit, oldLimit + 1, 'Only the standing one-extra-after-source-fix grant, not a new cycle');
  assert.equal(state.investigation.rounds.length, count);
  state.investigation.completed = true;
  assert.throws(() => resumeRosterTeachDependentQueriesV1(state, old.questionIds, { refreshToolCatalog: true }), /DEPENDENCY_CONTINUATION_UNAVAILABLE/);
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
