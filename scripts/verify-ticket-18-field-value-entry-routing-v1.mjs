import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { verifySeal } from '../packages/skill-production/common.mjs';
import { requireFactionFieldValueRepairScopeV1 }
  from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION }
  from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';

const filename = new URL('../build/ticket-17-production-redesign-v1/production.sqlite', import.meta.url).pathname;
const db = new DatabaseSync(filename, { readOnly: true });
try {
  const rejectedRow = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get('faction-v1-6fb3850f59642566130f',
      'structured-f250570df30ef86b3455151d2720b9ca546b5a74a2cfbe7b.rejected-candidate');
  assert.ok(rejectedRow, 'saved field-recovery origin must remain available');
  const rejected = verifySeal(JSON.parse(rejectedRow.artifact)).value;

  let caught = null;
  try {
    requireFactionFieldValueRepairScopeV1({
      providerOutput: rejected.providerValue,
      targetCount: 2,
      coverageCount: 1,
    });
  } catch (error) { caught = error; }
  assert.equal(caught?.code, 'FACTION_FIELD_VALUE_FULL_OUTPUT_REQUIRED');
  assert.equal(caught?.repairScope?.route, 'full_output');
  assert.equal(caught?.repairScope?.newFieldValueProviderCallsAllowed, 0);
  assert.equal(STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION,
    'starcraft_tmg_faction_structured_review_runtime_v1');

  console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
    savedOriginAttempt: rejected.invocationHash, route: caught.repairScope.route,
    providerCalls: 0 }));
} finally { db.close(); }
