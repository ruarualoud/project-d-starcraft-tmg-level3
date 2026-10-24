import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
import { createRosterTeachSynthesisArchiveV1, createRosterTeachSynthesisReaderStateV1,
  projectRosterTeachSynthesisReaderV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [file, gate] = process.argv.slice(2);
const state = JSON.parse(await fs.readFile(file, 'utf8')).value;
const previous = state.draftTeachSnapshots.findLast(r => r.status === 'completed');
assert.equal(previous.createdAtRevision, 13);
assert.equal(state.revision, 14);
assert.equal(state.currentCandidate.mineralSpent, 2000);
assert.equal(state.currentCandidate.candidateHash, previous.candidateHash);
assert(previous.state.issueLedger.questions.some(q => q.status === 'unresolved'));
if (gate === 'scheduling') {
  let calls = 0;
  const investigate = createIterativeRosterDraftTeachV1({
    createSceneLaboratory: () => { calls++; throw Error('REPEATED_FULL_DRAFT_INQUIRY'); },
    deliberationFactory: { createForRun: async () => { throw Error('UNEXPECTED_PROVIDER'); } },
    selectSkillGuidance: () => previous.context.skillGuidance,
    missionEvidence: previous.context.mission,
  });
  const before = hash({ plan: state.plan, army: state.currentCandidate, snapshots: state.draftTeachSnapshots });
  await investigate(state, async () => {});
  assert.equal(calls, 0, 'Plan revision must reach the selecting agent, not restart all eight axes');
  assert.equal(state.draftTeachReuse.reason, 'same_army_plan_continuation');
  assert.equal(state.draftTeachReuse.currentPlanReviewed, false);
  assert.equal(state.draftTeachFeedback.finalAcceptance, false);
  assert.deepEqual(state.draftTeachFeedback.synthesis, previous.state.synthesis);
  assert.equal(hash({ plan: state.plan, army: state.currentCandidate, snapshots: state.draftTeachSnapshots }), before);
  const changed = structuredClone(state);
  changed.currentCandidate.candidateHash = hash('actual-army-change');
  await assert.rejects(investigate(changed, async () => {}), /REPEATED_FULL_DRAFT_INQUIRY/);
  assert.equal(calls, 1, 'Changed army still requires draft inquiry');
} else if (gate === 'reader') {
  const archive = createRosterTeachSynthesisArchiveV1([
    { kind: 'current_plan_and_context', plan: previous.plan, context: {} },
    { kind: 'question_evidence_reconciliation', questions: [] },
  ]);
  const reader = createRosterTeachSynthesisReaderStateV1(archive);
  // Actual r13 read pattern: Plan was read, then receipts replaced latestPages.
  reader.readManifest = [{ documentId: 'plan', path: '', offset: 0 }];
  reader.latestPages = [{ documentId: 'context', path: '', offset: 0 }];
  const [workspace] = projectRosterTeachSynthesisReaderV1(archive, reader);
  assert.deepEqual(workspace.currentPlan?.value, previous.plan,
    'Stateless synthesis must keep the actual Plan visible after the next receipt read');
  assert.equal(workspace.currentPlan.complete, true);
  assert.equal(workspace.currentPlan.authority, 'model_plan_not_rules_evidence');
  assert.deepEqual(archive.documents.find(d => d.id === 'plan').value, previous.plan);
} else throw Error('scheduling or reader gate required');
console.log(JSON.stringify({ pass: true, gate, source: 'actual-v320-r13-to-r14', providerCalls: 0,
  finalAdmissionUnchanged: true, oldIssuesPreserved: true }));
