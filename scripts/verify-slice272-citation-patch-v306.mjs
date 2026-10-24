import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterTeachSynthesisArchiveV1, createRosterTeachSynthesisReaderStateV1,
  applyRosterTeachSynthesisReaderCommandV1, projectRosterTeachSynthesisReaderV1,
  rosterTeachSynthesisStepKindV1,
} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import { rosterTeachFrameworkContractV1, inspectRosterTeachPublicOutputV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';

const [directory] = process.argv.slice(2);
const file = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).find(n => n.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${file}`, 'utf8'));
const session = raw.value ?? raw;
const snapshot = session.draftTeachSnapshots.find(s => s.snapshotId === session.draftTeachFeedback?.snapshotId)
  || session.draftTeachSnapshots.find(s => s.publicOutputs?.some(o => o.sanitizedOutput?.answers
    ?.some(a => a.questionId === 'q3-budget-completion-alternative' && a.publicReason.startsWith('Citation repair only:'))));
const rows = snapshot.publicOutputs.flatMap(o => (o.sanitizedOutput?.answers || [])
  .filter(a => a.questionId === 'q3-budget-completion-alternative'));
const first = rows[0], repair = rows.findLast(a => a.publicReason.startsWith('Citation repair only:'));
assert(first && repair && first.publicReason !== repair.publicReason,
  'Reproduce the real F citation-only write that replaced the substantive strategy reason');
const archive = createRosterTeachSynthesisArchiveV1([{ kind: 'question_evidence_reconciliation',
  questions: [{ questionId: first.questionId, originalQuestion: { claim: 'Compare the legal roster alternatives' }, evidence: [] }] }]);
const reader = createRosterTeachSynthesisReaderStateV1(archive);
reader.answers = [structuredClone(first)];
reader.proposedPlanChanges = ['Preserve the model-owned alternative and trigger'];
reader.frameworkFeedback = [{ axisId: 'test-only-existing-feedback', observation: 'Preserve prior feedback' }];
reader.citationFeedback = { correctableFailures: [{ questionId: first.questionId, code: 'path_invalid' }] };
const before = structuredClone(reader);
const command = { action: 'repair_citations', reads: [], answers: [], proposedPlanChanges: [],
  proposedRosterChanges: [], frameworkFeedback: [], publicReason: repair.publicReason,
  citationPatches: [{ questionId: first.questionId, evidenceRefs: repair.evidenceRefs,
    quantitativeEvidence: repair.quantitativeEvidence, qualitativeEvidence: repair.qualitativeEvidence }] };
applyRosterTeachSynthesisReaderCommandV1(archive, reader, command);
assert.deepEqual(reader.answers[0].quantitativeEvidence, repair.quantitativeEvidence,
  'A citation-only operation must update exact citations without rewriting the whole answer');
for (const key of ['publicReason', 'tradeoff', 'replanTrigger', 'disposition']) {
  assert.deepEqual(reader.answers[0][key], first[key], `Citation repair must preserve ${key}`);
}
for (const key of ['proposedPlanChanges', 'proposedRosterChanges', 'frameworkFeedback']) {
  assert.deepEqual(reader[key], before[key], `Citation repair must not clear ${key}`);
}
assert.equal(reader.status, 'reading');
assert.equal(reader.completedSteps.at(-1).action, 'repair_citations');
const view = projectRosterTeachSynthesisReaderV1(archive, before)[0];
assert.match(view.workflow.instruction, /action=repair_citations/);
assert.equal(rosterTeachSynthesisStepKindV1(view), 'teach_framework_citation_patch');
assert.equal(rosterTeachSynthesisStepKindV1({ workflow: { nextAction: 'finish' } }), 'teach_framework_synthesis_step');
const contract = rosterTeachFrameworkContractV1('teach_framework_citation_patch');
const decoded = inspectRosterTeachPublicOutputV1(contract, {
  schemaVersion: 'starcraft_tmg_teach_framework_generation_v1', roundKind: 'teach_framework_citation_patch', ...command,
});
assert.equal(decoded.validation.ok, true, JSON.stringify(decoded.validation));
const unchanged = structuredClone(reader);
assert.throws(() => applyRosterTeachSynthesisReaderCommandV1(archive, reader,
  { ...command, citationPatches: [{ ...command.citationPatches[0], questionId: 'another-question' }] }),
  /CITATION_PATCH_QUESTION_INVALID/);
assert.deepEqual(reader, unchanged, 'Reject a wrong question before mutation');
const unknown = structuredClone(before);
unknown.answers[0].disposition = 'unresolved';
applyRosterTeachSynthesisReaderCommandV1(archive, unknown, command);
assert.equal(unknown.answers[0].disposition, 'unresolved');
console.log(JSON.stringify({ pass: true, actualPriorWrites: rows.length,
  citationsPatched: true, strategyAndProposalsPreserved: true, unknownPreserved: true,
  wrongQuestionRejectedWithoutMutation: true, providerCalls: 0, nativeCalls: 0 }));
