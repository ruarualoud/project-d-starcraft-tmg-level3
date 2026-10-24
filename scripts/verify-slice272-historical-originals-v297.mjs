import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import * as history from '../packages/roster-strategist/roster-teach-history-view-v1.mjs';
import { qualifyRosterTeachFrameworkSynthesisV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createRosterTeachSynthesisArchiveV1, createRosterTeachSynthesisReaderStateV1,
  readRosterTeachSynthesisDocumentV1, projectRosterTeachSynthesisReaderV1 }
  from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';

const [directory, presetDirectory] = process.argv.slice(2);
const names = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).filter(n => n.endsWith('.json'));
assert.equal(names.length, 1);
const stored = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${names[0]}`, 'utf8'));
const session = stored.value ?? stored, current = session.draftTeachSnapshots.at(-1);
const previous = session.draftTeachSnapshots.slice(0, -1);
const ref = '421bd3abb76c2dcb4b9df46ee35ddf0dab60058d9f5d2ba6f27a3571e7a79585';
const original = previous[0].state.evidence.find(row => row.receiptHash === ref);
assert(original, 'Actual D historical original must exist');
const before = hash({ context: current.context, original });
const nodes = [{ kind: 'current_plan_and_context', plan: { planHash: current.sourcePlanHash },
  context: { frozenContext: current.context.frozenContext } }];
// Before the repair the archive ignores this sidecar and the EXACT persisted
// original cannot be read. No fabricated proof, Native query or model call.
const sidecar = history.createRosterTeachHistoryEvidenceV1
  ? history.createRosterTeachHistoryEvidenceV1(current, previous)
  : { originals: new Map([[ref, original]]), entries: [] };
const baseline = createRosterTeachSynthesisArchiveV1(nodes);
const archive = createRosterTeachSynthesisArchiveV1(nodes, { historicalEvidence: sidecar });
const reader = createRosterTeachSynthesisReaderStateV1(baseline);
reader.answers.push({ questionId: 'preserved-paid-answer', disposition: 'unresolved' });
reader.completedSteps.push({ step: 4, preserved: true });
const savedReader = hash(reader);
const page = readRosterTeachSynthesisDocumentV1(archive, { documentId: `evidence:${ref}`, path: '/status' }, reader);
assert.equal(page.kind, 'value', 'D original from a compatible prior Teach must be readable without investigation');
assert.equal(page.value, 'advisory');
assert.equal(archive.archiveHash, baseline.archiveHash, 'Navigation must not reset the paid archive');
assert.equal(hash(reader), savedReader);
assert.equal(hash({ context: current.context, original }), before);
const projected = projectRosterTeachSynthesisReaderV1(archive, reader)[0];
assert(projected.historicalEvidenceLookup.availableOriginals > 0);
const entry = sidecar.entries.find(row => row.receiptHash === ref);
assert.equal(entry.originalBodyUnchanged, true);
assert.equal(entry.historicalConclusionNotImported, true);
assert.equal(readRosterTeachSynthesisDocumentV1(archive,
  { documentId: 'historical-receipts', path: '/navigationOnly' }).value, true);
const answer = { questionId: 'history-reference', disposition: 'retain', evidenceRefs: [ref],
  quantitativeEvidence: [], qualitativeEvidence: [{ receiptRef: ref, path: 'status', interpretation: 'Original status only.' }] };
const qualified = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: { answers: [answer], frameworkFeedback: [] },
  evidence: [], sourceEvidence: [Object.fromEntries(sidecar.originals), current.context] });
assert.equal(qualified.answers[0].qualitativeEvidence[0].value, 'advisory');
assert.equal(qualified.answers[0].qualitativeEvidence[0].interpretationVerified, false);
for (const mutate of [p => { p.candidateHash += '-different'; },
  p => { p.context.frozenContext.mapHash += '-different'; },
  p => { p.context.frozenContext.sourceHash += '-different'; },
  p => { p.context.frozenContext.opponentFactionRecordKey += '-different'; },
  p => { p.context.mission = { different: true }; }, p => { p.status = 'running'; }]) {
  const changed = structuredClone(previous[0]); mutate(changed);
  assert.equal(history.createRosterTeachHistoryEvidenceV1(current, [changed]).originals.size, 0);
}
const stub = { ...previous[0], state: { evidence: [{ reference: ref, receiptHash: ref }] } };
assert.equal(history.createRosterTeachHistoryEvidenceV1(current, [stub]).originals.size, 0);
const aNames = (await fs.readdir(`${presetDirectory}/workspace/drafts`)).filter(n => n.endsWith('.json'));
assert.equal(aNames.length, 1);
const preset = JSON.parse(await fs.readFile(`${presetDirectory}/workspace/drafts/${aNames[0]}`, 'utf8'));
const aHistory = history.createRosterTeachHistoryEvidenceV1(preset.teachFramework, preset.teachFrameworkHistory);
assert(aHistory.originals.size > 0, 'Fixed-roster product uses the same history registry');
const changedA = structuredClone(preset.teachFrameworkHistory[0]);
changedA.context.fixture.mapTopologyHash += '-different';
assert.equal(history.createRosterTeachHistoryEvidenceV1(preset.teachFramework, [changedA]).originals.size, 0);
console.log(JSON.stringify({ pass: true, exactHistoricalOriginal: ref, fixedRosterOriginals: aHistory.originals.size,
  iterativeOriginals: sidecar.originals.size, mismatchedScopesRejected: 7,
  sourceAndPaidReaderUnchanged: true, providerCalls: 0, nativeCalls: 0 }));
