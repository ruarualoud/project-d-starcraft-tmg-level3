import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { projectRosterTeachSynthesisPromptV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
  const receipt = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-58d46176213b96e1e111f839').result;
  assert.equal(receipt.status, 'advisory');
  const child = receipt.followUpReceipts[0].receipt;
  const graph = child.queryReceipt.result;
  assert.equal(graph.relationships.length, 6);
  const projected = projectRosterTeachSynthesisPromptV1([{ kind: 'evidence', receipt }]);
  const found = [];
  function visit(n) { if (!n || typeof n !== 'object') return;
    if (Array.isArray(n.spatialRelationshipEvidence)) found.push(...n.spatialRelationshipEvidence);
    for (const v of Object.values(n)) visit(v);
  }
  visit(projected);
  assert(found.length, 'Actual six Native relationships must be available to synthesis without another tool call');
  const row = found.find(r => r.sourceReceiptHash === child.receiptHash);
  assert(row);
  assert.equal(row.relationships.length, graph.relationships.length);
  for (const edge of graph.relationships) {
    const delivered = row.relationships.find(e => e.edgeId === edge.edgeId);
    assert.deepEqual(delivered.nearestPhysicalEdges, edge.nearestPhysicalEdges);
    assert.equal(delivered.fromUnitId, edge.fromUnitId);
    assert.equal(delivered.toUnitId, edge.toUnitId);
  }
  assert.equal(row.arrivalOrAbilityUseProven, false);
  report.distances = row.relationships.map(r => ({ from: r.fromUnitId, to: r.toUnitId,
    milliInches: r.nearestPhysicalEdges.distanceMilliInches }));
  report.checks.push('actual_A_six_native_edge_distances_survive_synthesis_projection_exactly_with_receipt_identity_no_arrival_or_ability_claim');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
