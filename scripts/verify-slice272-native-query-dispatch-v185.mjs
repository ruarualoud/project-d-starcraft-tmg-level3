import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as portModule from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { validateRosterTeachInvestigationProgressV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const a = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
  const b = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const pending = a.teachFramework.state.replyCorrections.findLast(r => r.status === 'pending').correction.previousOutput;
  const badA = pending.queries.find(q => q.kind === 'map_route');
  const badB = b.teachFramework.state.investigation.rounds.at(-1).output.queries.find(q => q.kind === 'inspect');
  const normalize = portModule.normalizeRosterTeachQueryDispatchV1 || (request => ({ request }));
  const requests = [badA, badB].map(q => ({ kind: q.kind, toolRequest: JSON.parse(q.toolRequestJson) }));
  for (const request of requests) {
    const normalized = normalize(request);
    assert.equal(normalized.request.kind, 'spatial', 'Explicit registered Native query must determine dispatch rather than a conflicting outer category');
    assert.deepEqual(normalized.request.toolRequest, request.toolRequest, 'No inferred side, coordinates or tactical arguments');
    assert.equal(normalized.normalization.requestedKind, request.kind);
    assert.equal(normalize(normalized.request).normalization, null);
  }
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const port = portModule.createRosterTeachEvidencePortV1(lab);
  assert.doesNotThrow(() => validateRosterTeachInvestigationProgressV1(pending, a.teachFramework.state,
    a.teachFramework.state.synthesis.answers.filter(x => x.disposition === 'unresolved').map(x => x.questionId)));
  for (const [index, request] of requests.entries()) {
    const receipt = await port.query({ mutationAuthority: false, initialFoundationHash: 'b'.repeat(64),
      sourceHashes: ['c'.repeat(64)], challengeId: `actual-dispatch-${index}`, request });
    assert.equal(receipt.requestKind, 'spatial');
    assert.equal(receipt.dispatchNormalization.requestedKind, request.kind);
    assert.notEqual(receipt.unknownReasonCode, 'ROSTER_TEACH_NATIVE_QUERY_FAMILY_MISMATCH');
    assert(receipt.sourceReceipt?.queryReceipt, 'Request must reach the Native query, not return context as its answer');
    report.checks.push({ requested: request.kind, actual: receipt.requestKind,
      nativeQueryKind: receipt.sourceReceipt.queryReceipt.queryKind,
      nativeStatus: receipt.sourceReceipt.queryReceipt.status, remainingReason: receipt.unknownReasonCode });
  }
  assert.throws(() => normalize({ kind: 'inspect', toolRequest: { queryKind: 'mission_marker_control',
    argumentsJson: '{}', spec: { kind: 'hypothetical_geometry' } } }), /ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS/);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
