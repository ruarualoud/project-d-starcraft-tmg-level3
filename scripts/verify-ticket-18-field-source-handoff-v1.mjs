import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { loadFactionFieldSourceActualFixtureV1 } from './support/faction-field-source-actual-fixture-v1.mjs';
import { readFactionFieldValueSourceHandoffV1, verifyFactionFieldValueSourceHandoffV1 } from '../packages/skill-production-v3/faction-field-value-source-handoff-v1.mjs';
import { createFactionReviewSourceExpansionV1 } from '../packages/skill-production-v3/faction-review-source-expansion-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';

const fixture = await loadFactionFieldSourceActualFixtureV1();
const readAuthenticated = () => readFactionFieldValueSourceHandoffV1(fixture);
const handoff = readAuthenticated(); let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq(handoff.expandedSourceRefs, ['source:tactical_cards:supply_depot']);
eq(handoff.recordHashes.length, 1); // Use the first paid completed values; no new sample.
eq(handoff.providerReceiptHashes.length, 2);
eq(handoff.completion.value.verdicts[0].sourceSlots, [292, 304, 325, 159, 349, 352, 365]);
eq(hash(handoff.completion.value.verdicts.map(({ sourceSlots, ...v }) => v)), hash(fixture.originalEvidence.rejected.providerValue.verdicts));
eq(verifyFactionFieldValueSourceHandoffV1({ handoff, readAuthenticated }).hash, handoff.hash);
assert.throws(() => materializeFactionSlotReviewV1({ ...fixture.prepared.mapping,
  capsule: fixture.prepared.capsule, providerOutput: handoff.completion.value, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 }),
{ code: 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID' }); checks++;
const expanded = createFactionReviewSourceExpansionV1({ input: fixture.input, baseCapsule: fixture.prepared.capsule,
  triggerOutput: handoff.completion.value });
eq(expanded.hash, handoff.expansionHash);
eq(expanded.sourceRefreshPerformed, false); eq(expanded.rosterPermissionGranted, false);
const newNode = expanded.context.dependencyGraph.nodes.find(n => n.ref === handoff.expandedSourceRefs[0]);
eq(newNode.hash, hash(fixture.input.frozenSources.prompt.sources[365]));
assert.throws(() => verifyFactionFieldValueSourceHandoffV1({ handoff, readAuthenticated: () => null })); checks++;
const changed = structuredClone(handoff); changed.completion.value.verdicts[0].sourceSlots.pop();
assert.throws(() => verifyFactionFieldValueSourceHandoffV1({ handoff: changed, readAuthenticated })); checks++;
const files = ['packages/skill-production-v3/faction-field-value-source-handoff-v1.mjs',
  'packages/skill-production-v3/faction-field-value-runtime-v1.mjs', 'scripts/support/faction-field-source-actual-fixture-v1.mjs',
  'scripts/verify-ticket-18-field-source-handoff-v1.mjs'];
const report = seal({ version: 'faction_field_source_handoff_component_v1', passed: true, checks,
  actualRunId: fixture.runId, actualOriginalAttemptId: fixture.originalEvidence.attempt.id,
  originalCandidateHash: fixture.originalEvidence.rejected.hash, prepared: fixture.prepared, handoff,
  sameValuesFailedTwice: hash(fixture.records[0].result.feedback.priorValue) === hash(fixture.records[1].result.feedback.priorValue),
  exactSourceGapProved: true, existingFirstPaidValuesPreserved: true, freshSourceReviewPending: true,
  providerCalls: 0, actualDshSessions: 0, productionMainWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile('build/ticket-18-faction-production-v1/field-source-handoff-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, handoffHash: handoff.hash,
  sourceRefs: handoff.expandedSourceRefs, productionMainWired: false }));
