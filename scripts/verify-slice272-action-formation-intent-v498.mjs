import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS } from
  '../packages/online-agent-session/formation-intent-contract-v1.mjs';
import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 } from
  '../packages/online-agent-session/spatial-query-contracts-v1.mjs';

// Concrete paid call380 followed discovery's single-object form. The actual
// action-solver normalizer discarded it and selected balanced instead. Exercise
// that exact production function, not an alternate normalizer or a Rules replay.
const directory = process.argv[2];
assert(directory, 'ACTUAL_DEBUG_RUN_DIRECTORY_REQUIRED');
const source = await readFile(new URL(
  '../packages/online-agent-session/legal-formation-search-v1.mjs', import.meta.url), 'utf8');
const start = source.indexOf('function normalizeFormationObjectives(');
const end = source.indexOf('\nfunction formationSolverPolicies(', start);
assert(start >= 0 && end > start, 'PRODUCTION_NORMALIZER_SEAM_REQUIRED');
const normalize = new Function('FORMATION_OBJECTIVE_KIND_SET',
  source.slice(start, end) + '\nreturn normalizeFormationObjectives;')(
  new Set(STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS));
async function request(number) {
  const reply = JSON.parse(gunzipSync(await readFile(path.join(directory,
    `call-${number}.reply.json.gz`))).toString());
  const query = JSON.parse(reply.output.toolRequestJson);
  return JSON.parse(query.toolRequest.argumentsJson);
}
const captured380 = await request(380);
const captured385 = await request(385);
assert.deepEqual(captured380.formationObjectives, { kind: 'advance', weight: 3 });
assert(Array.isArray(captured385.formationObjectives));
const before = JSON.stringify([captured380, captured385]);
const expected380 = [{ kind: 'advance', weight: 3, targetIds: [] }];
assert.deepEqual(normalize(captured380), expected380,
  'ACTUAL380_DOCUMENTED_ADVANCE_INTENT_MUST_NOT_BECOME_BALANCED');
assert.deepEqual(normalize({ ...captured380, formationObjectives: [captured380.formationObjectives] }),
  expected380, 'SINGLE_AND_ARRAY_FORMS_MUST_BE_EQUIVALENT');
assert.deepEqual(normalize(captured385), [
  { kind: 'compact', weight: 3, targetIds: [] },
  { kind: 'advance', weight: 2, targetIds: [] },
], 'ACTUAL385_MULTI_OBJECTIVE_WEIGHTS_AND_ORDER_MUST_SURVIVE');
const targeted = { kind: 'control_objective', weight: 5, targetIds: ['marker-5', 'marker-2'] };
assert.deepEqual(normalize({ formationObjectives: targeted }), [targeted]);
assert.deepEqual(normalize({ formationIntent: { objectives: [targeted] } }), [targeted]);
assert.deepEqual(normalize({}), [{ kind: 'balanced', weight: 3, targetIds: [] }],
  'OMITTED_INTENT_DEFAULT_IS_NOT_CHANGED');
assert.equal(JSON.stringify([captured380, captured385]), before, 'PAID_REQUESTS_MUST_NOT_MUTATE');
assert.deepEqual(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1['space.solve_formation']
  .arguments.formationObjectives.acceptedForms, ['single_object', 'array_of_objects']);
console.log(JSON.stringify({ status: 'passed', capturedCalls: [380, 385],
  productionSourceHash: createHash('sha256').update(source).digest('hex'),
  actual380: normalize(captured380), actual385: normalize(captured385),
  providerCalls: 0, nativeActionsReplayed: 0, sourceWrites: 0,
  scope: 'actual action-solver intent normalization; not full geometry or Plan acceptance' }));
