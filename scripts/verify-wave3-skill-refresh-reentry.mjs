import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createStarcraftTmgIncrementalSkillFreshnessRuntimeV1 } from '../packages/strategy-skills/incremental-skill-freshness-runtime-v1.mjs';

const directory = 'build/ticket-28-wave3-skill-refresh-v1';
const pilot = JSON.parse(readFileSync(directory + '/terran-pilot-input.public.json', 'utf8'));
const source = 'army_units:goliath';
const oldVersion = pilot.binding.originalDatasetHash;
const newVersion = pilot.binding.candidateDatasetHash;
const regression = pilot.skillId + ':cost-review';
const gate = createStarcraftTmgIncrementalSkillFreshnessRuntimeV1({ artifacts: [
  { kind: 'source', artifactId: source, version: oldVersion, activate: true },
  { kind: 'source', artifactId: source, version: newVersion },
  { kind: 'regression', artifactId: regression, version: '1', activate: true,
    dependencies: [{ artifactId: source, version: oldVersion }] },
] });
const changes = [{ artifactId: source, fromVersion: oldVersion, toVersion: newVersion }];
const request = { changes, confirmedByHuman: true };
const plan = gate.planRefresh(request);
assert.deepEqual(plan.requiredRegressionIds, [regression]);
const publish = { planId: plan.planId, confirmedByHuman: true, replacements: changes };
const review = { planId: plan.planId, regressionId: regression, severity: 'high' };
gate.recordRegression({ ...review, status: 'failed', evidenceRef: 'engineering-failure' });
assert.equal(gate.planRefresh(request).hash, plan.hash);
assert.throws(() => gate.publishSelective(publish), error => {
  assert.equal(error.code, 'SKILL_FRESHNESS_REGRESSION_GATE_BLOCKED');
  assert.deepEqual(error.missingRegressionIds, []);
  assert.deepEqual(error.blockingRegressionIds, [regression]);
  return true;
});
gate.recordRegression({ ...review, status: 'passed', evidenceRef: 'engineering-fix' });
assert.equal(gate.planRefresh(request).hash, plan.hash);
const publication = gate.publishSelective(publish);
assert.equal(publication.registryRevision, 1);
assert.equal(gate.read().activeVersions[source], newVersion);
assert.equal(gate.readVersion({artifactId: source, version: oldVersion}).version, oldVersion);
const result = { planHash: plan.hash, retainedHigh: true, retainedPass: true,
  originalVersionReadable: true, registry: 'isolated in-memory engineering instance', productionWrites: 0, providerCalls: 0 };
writeFileSync(directory + '/registry-reentry.public.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
