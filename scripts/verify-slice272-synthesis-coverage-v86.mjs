// Actual B14 paid reply omitted one of eight agenda answers three times.
// Exercise the real Teach consumer and its next repair prompt, no live Provider.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const base = process.argv[2];
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json', 'utf8'));
const actual = d.publicOutputs.filter(o => o.roundKind === 'teach_framework_synthesis').at(-1).sanitizedOutput;
const agenda = d.teachFramework.state.agenda;
const expected = agenda.questions.map(q => q.questionId);
const missing = expected.filter(id => !actual.answers.some(a => a.questionId === id));
assert.equal(missing.length, 1, 'exact captured omission required');
const board = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const realLab = createPregameSceneLaboratoryV1({ sourceState: board,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(board.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate() { throw Error('no enumeration'); },
    instantiate() { throw Error('no action'); }, apply() { throw Error('no mutation'); } } });
const lab = { ...realLab, describeQueryContext: () => ({}),
  runScenarioBranch() { throw Error('completed query evidence must not replay in this synthesis-only fixture'); } };
const state = { framework: d.teachFramework.state.framework,
  agenda: { ...agenda, questions: agenda.questions.map(q => ({ ...q,
    evidenceRequest: { kind: 'math', toolRequest: { mathKind: 'integer_sum', inputs: { values: [] } } } })) },
  evidence: expected.map(challengeId => ({ challengeId, status: 'unknown', unknownReasonCode: 'test_unresolved' })),
  investigation: { completed: true, rounds: [], evidence: [], operations: [] } };
let calls = 0;
const output = await runRosterTeachFrameworkSessionV1({ sessionId: 'captured-synthesis-coverage',
  context: {}, plan: JSON.parse(d.planSerialized), state, laboratory: lab, onCheckpoint: async () => {},
  deliberation: { async deliberate(request) {
    const shape = request.responseFormat.schema.properties.answers;
    assert.equal(shape.minItems, expected.length, 'strict output count must bind the actual agenda');
    assert.equal(shape.maxItems, expected.length);
    assert.deepEqual(shape.items.properties.questionId.enum, expected);
    calls++;
    if (calls === 1) return { output: structuredClone(actual) };
    assert.equal(calls, 2, 'one precise repair, not repeated blind regeneration');
    const repair = request.promptNodes.find(n => n.kind === 'repair_completed_public_reply');
    const issue = JSON.parse(repair.detail);
    assert.deepEqual(issue.missingQuestionIds, missing);
    assert.deepEqual(issue.unknownQuestionIds, []);
    assert.deepEqual(issue.duplicateQuestionIds, []);
    const fixed = structuredClone(actual);
    fixed.answers.push({ questionId: missing[0], disposition: 'unresolved', evidenceRefs: [],
      publicReason: 'The captured response omitted this question; this scripted test supplies no strategy evidence.',
      tradeoff: 'Unknown remains unknown.', replanTrigger: 'Obtain scene evidence.', quantitativeEvidence: [] });
    return { output: fixed };
  } } });
assert.equal(output.synthesis.answers.length, expected.length);
assert.deepEqual(output.synthesisRaw.answers.slice(0, actual.answers.length), actual.answers);
assert(output.synthesis.answers.every(a => a.disposition === 'unresolved'));
assert(realLab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({ status: 'PASS', missing, scriptedReplies: calls, originalSevenPreserved: true,
  providerCalls: 0, roomActions: 0, strategySuccessClaimed: false }));
