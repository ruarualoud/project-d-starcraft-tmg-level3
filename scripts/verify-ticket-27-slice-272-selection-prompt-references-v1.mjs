// Concrete live v48 failure: paid arguments cite delivered prompt-node names,
// but the selection validator registers only Unit/Skill/tool IDs. This gate
// tests citation binding only, not Native geometry or strategic truth.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as module from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const capturePath = process.argv.find(x => x.startsWith('--capture='))?.slice(10);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const originalOutputHash = hashStarcraftTmgContract(capture.output);
const registry = module.rosterSelectionPromptEvidenceV1?.(capture.nodes) || [];
const options = { justification: capture.output.selectionJustification,
  candidate: capture.candidate, unitRules: capture.unitRules,
  evidenceRefs: [...capture.evidenceRefs, ...registry.map(x => x.referenceId)] };
assert.doesNotThrow(() => module.validateRosterSelectionJustificationV1(options),
  'actual paid third reply must resolve the source nodes delivered to this Teach');
const refs = new Set(registry.map(x => x.referenceId));
for (const id of ['mission-marker-scoring-by-actor', 'candidate-map-access',
  'agent-selected-locked-arrival-schedule',
  'evaluated-candidates:candidateHash:' + capture.candidate.candidateHash]) {
  assert.ok(refs.has(id), id);
}
for (const id of capture.firstEvidenceRefs.filter(x =>
  /^(mission-marker-scoring-by-actor:|candidate-map-access:|agent-selected-locked-arrival-schedule:)/.test(x))) {
  assert.ok(refs.has(id), 'exact source-hash-qualified reference must resolve');
}
const spoof = structuredClone(capture.output.selectionJustification);
spoof.finalChoice.evidenceRefs.push('evaluated-candidates:candidateHash:' + '0'.repeat(64));
assert.throws(() => module.validateRosterSelectionJustificationV1({ ...options,
  justification: spoof }), error => error.details?.findings.some(x =>
    x.reason.startsWith('unknown_reference:')));
const drift = structuredClone(capture.nodes);
drift[0].content.projection.receiptHash = '0'.repeat(64);
assert.throws(() => module.rosterSelectionPromptEvidenceV1(drift),
  error => error.code === 'ROSTER_SELECTION_PROMPT_EVIDENCE_INVALID');
assert.equal(hashStarcraftTmgContract(capture.output), originalOutputHash);
console.log(JSON.stringify({ status: 'passed', concreteBug: 'delivered_prompt_sources_not_registered',
  realPaidReplyUnchanged: true, selectedUnits: capture.candidate.units.length,
  citationFixtureOnly: true, sourceTruthReviewed: false, strategicSuperiorityProven: false,
  realProviderCalls: 0, roomWrites: 0 }));
