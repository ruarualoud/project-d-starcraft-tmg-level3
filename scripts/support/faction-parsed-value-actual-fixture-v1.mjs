import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, fail } from '../../packages/skill-production/common.mjs';
import { loadFactionFieldSourceActualFixtureV1 } from './faction-field-source-actual-fixture-v1.mjs';
import { createFactionReviewBatchPlanV1 } from '../../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionParsedWireRecoveryReaderV2 } from '../../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';

export async function loadFactionParsedValueActualFixtureV1() {
  const source = await loadFactionFieldSourceActualFixtureV1(), { input, filename } = source;
  const { section, draft } = source.prepared.mapping;
  const runId = 'faction-v1-f3c43a4f1ec255cbc9ea', attemptId = 'structured-2558946a2c52a16c26dcdaac54f1539d416207cdc5f8eba2';
  const recipe = verifySeal(JSON.parse(await readFile('build/ticket-18-faction-production-v1/' + runId + '/recipe.json', 'utf8')));
  const db = new DatabaseSync(filename, { readOnly: true });
  let issue, roleId;
  try {
    issue = verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(runId, attemptId + '.wire-issue-v2').artifact)).value;
    const prefix = 'faction.zerg_swarm.' + issue.invocation.roleRef.id;
    const rows = db.prepare("SELECT id FROM steps WHERE run=? AND state='pending'").all(runId).filter(r => r.id.startsWith(prefix));
    if (rows.length !== 1) fail('ACTUAL_PARSED_VALUE_PENDING_ROLE_AMBIGUOUS');
    roleId = rows[0].id.slice('faction.zerg_swarm.'.length);
  } finally { db.close(); }
  const first = Number(issue.invocation.roleRef.id.split('.').at(-1));
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === first);
  const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }), roleId,
    workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
      coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: {
        targetContract: createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices }) } } };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  if (prepared.capsule.hash !== issue.invocation.contextManifestRef.hash) fail('ACTUAL_PARSED_VALUE_CONTEXT_DRIFT');
  const reader = await createFactionParsedWireRecoveryReaderV2({ root: process.cwd(), filename, runId, recipe });
  const authenticated = await reader(prepared);
  return { filename, runId, recipe, input, request, prepared, executionPolicy, authenticated, reader,
    origin: { runId, attemptId, issueHash: issue.hash } };
}
