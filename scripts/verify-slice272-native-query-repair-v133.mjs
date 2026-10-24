// Replay the actual returned Native receipts at the Teach adapter seam.
// No game queries, placement solvers, model calls or Room mutations are rerun.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const base = process.argv[2];
const saved = JSON.parse(await fs.readFile(base + '/common-v133-native-query-repair-fixture.private.json', 'utf8'));
const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No new Native instantiation'); }, apply() { throw Error('No mutation'); } } });
const failure = saved.receipt.followUpReceipts[0].receipt;
assert.equal(failure.queryReceipt.mayRepairSameChoice, true);
assert.equal(saved.receipt.queryRepair, undefined);
const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
// queryRepair also has error fields; the actual describeQueryContext contract
// returns only scene context, never failureTargets/correctable to overwrite it.
const queryContext = Object.fromEntries(Object.keys(lab.describeQueryContext())
  .map(key => [key, saved.context[key]]));
const portFor = failed => createRosterTeachEvidencePortV1({ ...lab,
  describeQueryContext: () => queryContext,
  runScenarioBranch: () => structuredClone(saved.receipt.sourceReceipt),
  querySpatial: input => structuredClone(input.queryKind === failure.queryKind
    ? failed : saved.receipt.followUpReceipts[1].receipt),
});
const result = await portFor(failure).query({ ...scope, challengeId: 'returned-native-failure', request: saved.request });
assert.equal(result.queryRepair?.correctable, true, 'Native same-choice repair must not be lost at the Teach wrapper');
assert.equal(result.queryRepair.failureTargets[0].requestPointer, '/toolRequest/followUps/0');
assert.deepEqual(result.queryRepair.failureTargets[0].nativeQueryRepair.repairContext, failure.queryReceipt.repairContext);
assert.equal(result.queryRepair.failureTargets[0].nativeQueryRepair.queryReceiptHash, failure.queryReceipt.queryReceiptHash);
assert.equal(result.queryRepair.failureTargets[0].nativeQueryRepair.mayRepairSameChoice, true);
assert.equal(result.sourceReceipt.receiptHash, saved.receipt.sourceReceipt.receiptHash);
assert.equal(result.followUpReceipts[1].receipt.receiptHash, saved.receipt.followUpReceipts[1].receipt.receiptHash);
const direct = await portFor(failure).query({ ...scope, challengeId: 'direct-native-failure',
  request: { kind: 'spatial', toolRequest: saved.request.toolRequest.followUps[0] } });
assert.equal(direct.queryRepair?.correctable, true);
assert.equal(direct.queryRepair.failureTargets[0].requestPointer, '/toolRequest');
assert.deepEqual(direct.queryRepair.failureTargets[0].nativeQueryRepair.repairContext, failure.queryReceipt.repairContext);
// A Native refusal to repair the same choice must also survive the wrapper.
const declined = structuredClone(failure);
declined.queryReceipt.mayRepairSameChoice = false;
declined.queryReceipt.repairContext.requiresReplan = true;
const { receiptHash: ignored, ...body } = declined;
declined.receiptHash = hash(body);
const refused = await portFor(declined).query({ ...scope, challengeId: 'native-replan-required', request: saved.request });
assert.equal(refused.queryRepair?.correctable, false);
assert.equal(refused.queryRepair.failureTargets[0].nativeQueryRepair.mayRepairSameChoice, false);
console.log(JSON.stringify({ status: 'PASS', actualNativeFeedbackPreserved: true,
  directAndNestedQueriesCovered: true, nativeReplanBoundaryPreserved: true,
  successfulReceiptsPreserved: true, providerCalls: 0, roomActions: 0, nativeExecutions: 0,
  actualModelCorrectionProven: false }));
