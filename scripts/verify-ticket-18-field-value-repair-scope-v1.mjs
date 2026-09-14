import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { verifySeal } from '../packages/skill-production/common.mjs';
import { classifyFactionFieldValueRepairScopeV1 }
  from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { createFactionReviewHostContractRepairContextCapsuleV1 }
  from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION }
  from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';

const filename = new URL('../build/ticket-17-production-redesign-v1/production.sqlite', import.meta.url).pathname;
const db = new DatabaseSync(filename, { readOnly: true });
try {
  const controlRunId = 'faction-field-control-26e831f9b5d10d0a7c1f983f92541bcf';
  const recordRow = db.prepare("SELECT artifact FROM steps WHERE run=? AND id='round.0.record' AND state='complete'")
    .get(controlRunId);
  const rejectedRow = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get('faction-v1-6fb3850f59642566130f',
      'structured-f250570df30ef86b3455151d2720b9ca546b5a74a2cfbe7b.rejected-candidate');
  assert.ok(recordRow && rejectedRow, 'saved production failure must remain available');

  const record = verifySeal(JSON.parse(recordRow.artifact)).value;
  const rejected = verifySeal(JSON.parse(rejectedRow.artifact)).value;
  const providerInput = JSON.parse(record.choice.request.input);
  const localIssue = providerInput.orderedBlocks.find(row => row.value?.reviewTask)?.value;
  assert.equal(localIssue.reviewTask.targetContract.targets.length, 2);
  assert.deepEqual(rejected.providerValue.verdicts.map(row => row.targetSlot), [0]);

  const classification = classifyFactionFieldValueRepairScopeV1({
    providerOutput: rejected.providerValue,
    targetCount: localIssue.reviewTask.targetContract.targets.length,
    coverageCount: rejected.providerValue.coverage.length,
  });
  assert.equal(classification.route, 'full_output');
  assert.equal(classification.reasonCode, 'incomplete_target_slot_set');
  assert.equal(classification.newFieldValueProviderCallsAllowed, 0);
  assert.equal(classification.trainingTruth, false);
  assert.equal(typeof createFactionReviewHostContractRepairContextCapsuleV1, 'function');
  assert.equal(STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION,
    'starcraft_tmg_faction_structured_review_runtime_v1');

  console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
    savedFailure: 'FACTION_FIELD_VALUE_NO_PROGRESS', classification }));
} finally { db.close(); }
