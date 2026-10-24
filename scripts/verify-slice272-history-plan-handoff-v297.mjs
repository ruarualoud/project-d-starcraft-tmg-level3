import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as history from '../packages/roster-strategist/roster-teach-history-view-v1.mjs';
import { readRosterTeachRetainedEvidenceV1, deriveRosterTeachSavedEvidenceBindingV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createRosterRevisionTeachEvidenceV1 } from '../packages/roster-strategist/roster-revision-teach-evidence-v1.mjs';
const [directory] = process.argv.slice(2);
const names = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).filter(n => n.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${names[0]}`, 'utf8'));
const session = raw.value ?? raw, current = session.draftTeachSnapshots.at(-1);
const sidecar = history.createRosterTeachHistoryEvidenceV1(current, session.draftTeachSnapshots.slice(0, -1));
const ref = '421bd3abb76c2dcb4b9df46ee35ddf0dab60058d9f5d2ba6f27a3571e7a79585';
const original = sidecar.originals.get(ref);
assert(original);
// Actual D original + the citation syntax already accepted by the Teach
// reader/binder. The Plan retained reader must not reject that same path.
const request = { receiptHash: ref, path: '/status' };
const direct = readRosterTeachRetainedEvidenceV1([original], request);
assert.equal(direct.value, 'advisory');
const stub = { reference: ref, receiptHash: ref };
assert.equal(readRosterTeachRetainedEvidenceV1([stub, { nested: original }], request).value, 'advisory');
const synthesis = { answers: [{ questionId: 'historical-status', disposition: 'retain', evidenceRefs: [ref],
  quantitativeEvidence: [], qualitativeEvidence: [{ receiptRef: ref, path: '/status', interpretation: 'Original status only.' }] }],
  proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] };
const state = { phase: 'completed', evidence: [], synthesis, synthesisRaw: synthesis, evidenceBindingVersion: 7,
  agenda: { questions: [], coverage: [] }, framework: {}, coverage: [] };
history.retainRosterTeachCitedHistoryV1(state, sidecar, synthesis);
assert.equal(state.retainedHistoricalEvidence.length, 1, 'Persist only actually cited historical originals');
assert.deepEqual(state.retainedHistoricalEvidence[0], original);
assert.equal(state.retainedHistoricalEvidenceSources[0].historicalConclusionNotImported, true);
assert.equal(deriveRosterTeachSavedEvidenceBindingV1(state).synthesis.answers[0].qualitativeEvidence[0].value, 'advisory');
const revision = createRosterRevisionTeachEvidenceV1(state);
const read = revision.read(request);
assert.equal(read.status, 'read');
assert.equal(read.result.value, 'advisory', 'Plan revision sees the same original and path as Teach');
assert.equal(revision.experience.evidence.length, 1);
console.log(JSON.stringify({ pass: true, samePathAcrossTeachAndPlan: true, referencesDoNotShadowOriginals: true,
  citedHistoryRetained: 1, unrelatedHistoryCopied: 0, providerCalls: 0, nativeCalls: 0 }));
