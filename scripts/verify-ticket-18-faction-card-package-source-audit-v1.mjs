import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { inspectFactionCardPackageSourceDebtV1, assertNoFactionCardPackageSourceDebtV1,
  proposeFactionUniqueClauseCorrectionV1, FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1 as finding }
  from '../packages/skill-evaluation/faction-card-package-source-audit-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const input = await read('terran_armed_forces-input'), history = await read('five-chapter-consumer-replay-readiness');
const draft = history.pendingRequest.workspace.draft, before = hash(draft), actual = inspectFactionCardPackageSourceDebtV1({ input, draft });
assert.equal(actual.findings.length, 1);
assert.equal(actual.findings[0].index, 0);
assert.equal(actual.findings[0].path, 'risk');
assert.equal(actual.sourceEvidence.length, 2);
assert.throws(() => assertNoFactionCardPackageSourceDebtV1({ input, candidate: { sections: [{ draft }] } }),
  { code: 'FACTION_CANDIDATE_CARD_PACKAGE_SOURCE_DEBT' });
const proposal = proposeFactionUniqueClauseCorrectionV1({ input, draft });
assert.equal(hash(draft), before);
assert.equal(proposal.parentDraftHash, before);
assert.equal(proposal.productionApplied, false);
assert.equal(proposal.freshWholeSectionReviewRequired, true);
for (const [index, r] of draft.recommendations.entries()) for (const [key, value] of Object.entries(r)) {
  if (index === 0 && key === 'risk') continue;
  assert.deepEqual(proposal.proposedDraft.recommendations[index][key], value);
}
assert.equal(proposal.proposedDraft.recommendations[0].risk, finding.observed.replace(finding.badClause, finding.correction));
assert.equal(inspectFactionCardPackageSourceDebtV1({ input, draft: proposal.proposedDraft }).findings.length, 0);
assert.equal(actual.absenceProvesGeneralCorrectness, false);
const ambiguous = structuredClone(draft); ambiguous.recommendations.push(structuredClone(draft.recommendations[0]));
assert.throws(() => proposeFactionUniqueClauseCorrectionV1({ input, draft: ambiguous }), { code: 'FACTION_CARD_PACKAGE_CORRECTION_NOT_UNIQUE' });
const foreign = structuredClone(input); delete foreign.hash;
foreign.frozenSources.prompt.sources.find(s => s.ref === actual.sourceEvidence[0].source.ref).passages[0].text = 'different rule';
assert.throws(() => inspectFactionCardPackageSourceDebtV1({ input: seal(foreign), draft }), { code: 'FACTION_CARD_PACKAGE_UNIQUE_SOURCE_DRIFT' });
assert.throws(() => proposeFactionUniqueClauseCorrectionV1({ input, draft: proposal.proposedDraft }), { code: 'FACTION_CARD_PACKAGE_CORRECTION_NOT_UNIQUE' });
const files = ['packages/skill-evaluation/faction-card-package-source-audit-v1.mjs',
  'scripts/verify-ticket-18-faction-card-package-source-audit-v1.mjs'];
const report = seal({ passed: true, checks: 16, actualPriorReplayHash: history.hash, audit: actual, proposal,
  standaloneProofOnly: true, productionWiringChanged: false, providerCalls: 0, sourceRefreshPerformed: false,
  sourceReviewPassed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'card-package-source-audit-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 16, findings: actual.findings.length,
  productionApplied: false, providerCalls: 0, hash: report.hash }));
