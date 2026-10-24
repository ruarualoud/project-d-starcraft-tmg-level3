// Actual A paid batch: successful hypothetical scene repeated to read follow-ups.
// Reusing its receipt must also preserve the branch handle, without recalculation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { validateRosterTeachInvestigationProgressV1, reuseRosterTeachReadOnlyEvidenceV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { normalizeRosterTeachQueryDispatchV1 } from '../packages/roster-strategist/roster-teach-query-dispatch-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const base = process.argv[2];
const saved = JSON.parse(await fs.readFile(base + '/A/fresh-generation-v249/workspace/drafts/rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46.json', 'utf8'));
const state = saved.teachFramework.state;
const output = saved.publicOutputs.findLast(o => o.roundKind === 'teach_framework_investigate'
  && o.sanitizedOutput.queries.some(q => q.queryId === 'q-capability-demand-tag-match-assault-scene-3')).sanitizedOutput;
const q = output.queries.find(q => q.queryId === 'q-capability-demand-tag-match-assault-scene-3');
const request = normalizeRosterTeachQueryDispatchV1({ kind: q.kind, toolRequest: JSON.parse(q.toolRequestJson) }).request;
const previous = state.investigation.operations.findLast(o => o.completed && o.queryId !== q.queryId && hash(o.request) === hash(request));
const earlier = state.investigation.evidence.find(e => e.challengeId === previous.queryId);
assert.equal(earlier.status, 'advisory');
validateRosterTeachInvestigationProgressV1(output, state, state.agenda.questions.map(q => q.questionId), earlier.evidencePortDescriptorHash);
const reused = reuseRosterTeachReadOnlyEvidenceV1({ earlier, request, queryId: q.queryId,
  questionId: q.questionId, currentDescriptorHash: earlier.evidencePortDescriptorHash });
assert.ok(reused, 'An immutable hypothetical scene is read-only evidence, not a live action');
assert.equal(reused.queryNotExecuted, true);
assert.deepEqual(reused.sourceReceipt, earlier.sourceReceipt);
assert.deepEqual(reused.followUpReceipts, earlier.followUpReceipts);
const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const deepFreeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: deepFreeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No action execution'); }, apply() { throw Error('No mutation'); } } });
// This seam fixture models the already-restored actual branch registry. It does
// not execute the old scenario against a different source fixture.
const { descriptorHash: ignored, ...body } = lab.labDescriptor();
Object.assign(body, { sourceStateHash: earlier.sourceReceipt.sourceStateHash,
  rulesRuntimeHash: earlier.sourceReceipt.rulesRuntimeHash, builderBundleHash: earlier.sourceReceipt.builderBundleHash });
const descriptor = { ...body, descriptorHash: hash(body) };
let queries = 0;
const port = createRosterTeachEvidencePortV1({ ...lab, labDescriptor: () => descriptor,
  runScenarioBranch() { queries++; throw Error('No scenario reconstruction'); },
  describeQueryContext({ base }) { return { baseStateHash: base.branchStateHash }; },
}, { branchByNeedId: new Map([[previous.queryId, earlier.sourceReceipt.branchStateHash]]) });
port.reuseScenarioBranch({ request, receipt: reused, sourceChallengeId: previous.queryId });
assert.equal(port.describeQueryContext(q.queryId).baseStateHash, earlier.sourceReceipt.branchStateHash);
assert.throws(() => port.reuseScenarioBranch({ request: { ...request, toolRequest: { ...request.toolRequest, seatKey: 'changed' } },
  receipt: reused, sourceChallengeId: previous.queryId }), /REUSED_SCENARIO_REQUEST_CHANGED/);
assert.throws(() => port.reuseScenarioBranch({ request, receipt: reused, sourceChallengeId: 'missing-branch' }), /REUSED_SCENARIO_BRANCH_UNAVAILABLE/);
assert.equal(queries, 0);
assert.equal(reuseRosterTeachReadOnlyEvidenceV1({ earlier, request, queryId: q.queryId,
  questionId: q.questionId, currentDescriptorHash: '0'.repeat(64) }), null);
console.log(JSON.stringify({ status: 'PASS', paidBatchAdmitted: true, scenarioEvidenceUnchanged: true,
  aliasResolvesSameBranch: true, changedRequestAndSourceRejected: true, providerCalls: 0, scenarioExecutions: 0, roomWrites: 0 }));
