// D r5->r6 kept the same 1150-point army while revising the provisional Plan.
// Re-entering full Teach before allowing another selecting decision stalled it.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(directory)).find(f => f.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${directory}/${file}`, 'utf8'));
const original = raw.value || raw;
const r6 = original.iterations.find(i => i.revision === 6);
const previous = original.draftTeachSnapshots.find(s => s.createdAtRevision === 5);
assert.equal(r6.decisionKind, 'revise_plan');
assert.equal(previous.status, 'completed');
const state = structuredClone(original);
state.revision = 6;
state.plan = structuredClone(r6.planSnapshot);
state.currentCandidate = structuredClone(r6.candidateSnapshot);
state.pendingDecision = null;
state.draftTeachSnapshots = state.draftTeachSnapshots.filter(s => s.createdAtRevision <= 5);
assert.equal(state.currentCandidate.mineralSpent, 1150);
assert.equal(state.currentCandidate.candidateHash, previous.candidateHash);
assert(previous.state.synthesis.answers.some(a => a.disposition === 'unresolved'));
let scenes = 0, calls = 0;
const investigate = createIterativeRosterDraftTeachV1({
  createSceneLaboratory: () => { scenes++; throw Error('FULL_TEACH_BOUNDARY'); },
  deliberationFactory: { createForRun: async () => { calls++; throw Error('PAID_TEACH_BOUNDARY'); } },
  selectSkillGuidance: () => previous.context.skillGuidance,
  missionEvidence: previous.context.mission });
const before = hash({ plan: state.plan, candidate: state.currentCandidate });
await investigate(state, async () => {});
assert.equal(scenes, 0);
assert.equal(calls, 0);
assert.equal(state.draftTeachReuse.reason, 'partial_army_plan_continuation');
assert.equal(state.draftTeachReuse.currentPlanReviewed, false);
assert.equal(state.draftTeachFeedback.finalAcceptance, false);
assert.deepEqual(state.draftTeachFeedback.synthesis, previous.state.synthesis);
assert.equal(hash({ plan: state.plan, candidate: state.currentCandidate }), before);
// A real army change still requires inquiry. A Plan-only edit at full budget
// now continues selection too; final current-Plan Teach is a separate gate.
const next = structuredClone(state);
next.currentCandidate.candidateHash = hash('different-army');
await assert.rejects(investigate(next, async () => {}), /FULL_TEACH_BOUNDARY/);
assert.equal(scenes, 1);
assert.equal(calls, 0);
console.log(JSON.stringify({ pass: true, capturedTransition: 'D-r5-to-r6', sourceArmyPoints: 1150,
  selectingCanContinue: true, previousIssuesPreserved: true, finalReviewNotBypassed: true,
  providerCalls: 0, roomActions: 0 }));
