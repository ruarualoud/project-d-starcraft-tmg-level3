import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { supportsRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json', 'utf8'));
  const op = d.teachFramework.state.queryRecovery.operations.find(o => o.questionId === 'q-post-loss-named-casualty-list');
  const old = JSON.stringify(op.currentFailure);
  assert.equal(op.currentFailure.requestHash, hash(op.request));
  assert(supportsRosterTeachQueryDeltaV1(op.request, op.currentFailure), 'Saved B error must bind the original request despite the adapter stripping branchIdRef from failureTargets');
  assert.equal(supportsRosterTeachQueryDeltaV1(op.request, { ...op.currentFailure, requestHash: '0'.repeat(64) }), false);
  assert.equal(supportsRosterTeachQueryDeltaV1({ ...op.request, toolRequest: { ...op.request.toolRequest, branchIdRef: 'other-branch' } }, op.currentFailure), false);
  assert.equal(JSON.stringify(op.currentFailure), old);
  report.checks.push('saved_exact_request_recoverable_without_rewriting_receipt_foreign_binding_denied');

  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
      instantiate() { throw Error('NO_NATIVE_EXECUTION'); }, apply() { throw Error('NO_NATIVE_MUTATION'); } } });
  const port = createRosterTeachEvidencePortV1({ ...lab,
    runScenarioBranch() { throw Error('PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND:fixture_causal_failure'); } });
  const result = await port.query({ mutationAuthority: false, initialFoundationHash: 'a'.repeat(64),
    sourceHashes: ['b'.repeat(64)], challengeId: 'actual-request-provenance', request: op.request });
  assert.equal(result.unknownReasonCode, 'PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND');
  assert.deepEqual(result.queryRepair.failureTargets[0].request, op.request.toolRequest);
  assert.equal(result.requestHash, hash(op.request));
  assert(supportsRosterTeachQueryDeltaV1(op.request, result));
  report.checks.push('real_evidence_adapter_retains_full_original_failed_request');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
