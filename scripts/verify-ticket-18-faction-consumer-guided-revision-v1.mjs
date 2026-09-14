import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { inspectFactionConsumerReplayV1 } from '../packages/skill-evaluation/faction-consumer-evidence-v1.mjs';
import { factionConsumerContextV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { assertNoFactionCrossFieldSourceDebtV1 } from '../packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs';
import { assertNoFactionPhaseSourceDebtV1 } from '../packages/skill-evaluation/faction-phase-source-debt-v1.mjs';
import { inspectFactionUnitRoleDebtV1 } from '../packages/skill-evaluation/faction-unit-role-debt-v1.mjs';
import { createFactionConsumerGuidedRevisionV1, FACTION_CONSUMER_GUIDED_REVISION_TEXT_V1 as texts } from '../packages/skill-production-v3/faction-consumer-guided-revision-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const priorRunId = 'faction-consumer-acaf23ac7c50d4b6367f';
const sourceRunId = 'faction-v1-78a790a93bf925b95048';
const json = async (...parts) => verifySeal(JSON.parse(await readFile(path.join(base, ...parts) + '.json', 'utf8')));
const catalogue = await loadFrozenSkillEvidence(root);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const [input, sourceCandidate, recipe, priorReport, priorInput, priorCandidate, parentProductionEvidence,
  rosterEvaluation, ruleEvaluation, finalGeneral] = await Promise.all([
  json(sourceRunId, 'terran_armed_forces-input'), json(sourceRunId, 'terran_armed_forces-candidate'),
  json(priorRunId, 'recipe'), json(priorRunId, 'report'), json(priorRunId, 'input'), json(priorRunId, 'candidate'),
  json(priorRunId, 'production-evidence'), json(priorRunId, 'evaluation'),
  json(priorRunId, 'rule-application-evaluation'), json(priorRunId, 'final-general-dependency'),
]);
assert.equal(priorInput.hash, input.hash); assert.equal(priorCandidate.hash, sourceCandidate.hash);
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const consumerEvidence = await inspectFactionConsumerReplayV1({
  filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
  runId: priorRunId, recipe, report: priorReport, input, candidate: sourceCandidate,
  productionEvidence: parentProductionEvidence, knownRulePolicy, drills, applicationDrills,
  evaluation: rosterEvaluation, applicationEvaluation: ruleEvaluation, finalGeneral,
});
const make = fields => createFactionConsumerGuidedRevisionV1({ input, candidate: sourceCandidate,
  knownRulePolicy, rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills: drills,
  applicationDrills, draftEnvelopeBinding, parentProductionEvidence, ...fields });
const actual = make({});
const army = actual.candidate.sections.find(row => row.section.id.endsWith('.army_resources.1'));
const unit = actual.candidate.sections.find(row => row.section.id.endsWith('.unit_roles.1'));
assert.equal(army.draft.recommendations[0].alternatives[0], texts.NEW_ROSTER_TEXT);
assert.equal(unit.draft.recommendations[5].procedure[0], texts.NEW_REACTION_TEXT);
assert(army.draft.recommendations[0].sourceRefs.includes('source:tactical_cards:armory'));
assert(unit.draft.recommendations[5].sourceRefs.includes('faq-v1:59'));
assert.equal(actual.revisionSpec.semanticFieldChanges, 2);
assert.equal(actual.revisionEvidence.candidateHash, actual.candidate.hash);
assert.equal(actual.revisionEvidence.freshIndependentConsumerEvaluationPerformed, false);
factionConsumerContextV1({ input, candidate: actual.candidate, knownRulePolicy });
assertNoFactionCrossFieldSourceDebtV1({ input, candidate: actual.candidate });
assertNoFactionPhaseSourceDebtV1({ input, candidate: actual.candidate });
for (const section of actual.candidate.sections)
  assert.equal(inspectFactionUnitRoleDebtV1({ input, draft: section.draft }).findings.length, 0);

const recommendationProjection = candidate => candidate.sections.map(section => ({ sectionId: section.section.id,
  recommendations: section.draft.recommendations }));
const before = recommendationProjection(sourceCandidate), after = recommendationProjection(actual.candidate);
let proseChanges = 0, citationChanges = 0;
for (let s = 0; s < before.length; s++) for (let r = 0; r < before[s].recommendations.length; r++) {
  const left = before[s].recommendations[r], right = after[s].recommendations[r];
  for (const key of ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven', 'sourceRefs']) {
    if (hash(left[key]) === hash(right[key])) continue;
    if (key === 'sourceRefs') citationChanges++; else proseChanges++;
  }
}
assert.equal(proseChanges, 2); assert.equal(citationChanges, 2);
assert.equal(sourceCandidate.hash, 'c428f92803240cfe38b097d3630499d7ae3a1d6c8ae54199304577a5bfbb68f9');
assert.equal(sourceCandidate.sections.find(row => row.section.id.endsWith('.army_resources.1'))
  .draft.recommendations[0].alternatives[0], texts.OLD_ROSTER_TEXT);
assert.equal(sourceCandidate.sections.find(row => row.section.id.endsWith('.unit_roles.1'))
  .draft.recommendations[5].procedure[0], texts.OLD_REACTION_TEXT);

const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
const changedRosterResults = rosterEvaluation.results.map(row => row.arm !== 'overall_plus_faction' ? row : reseal(row, {
  scores: row.scores.map(score => score.id !== 'faction-roster-choice.terran_gap_three' ? score : reseal(score, { passed: true })),
}));
assert.throws(() => make({ rosterEvaluation: reseal(rosterEvaluation, { results: changedRosterResults }) }),
  { code: 'FACTION_CONSUMER_GUIDED_REVISION_EVIDENCE_INVALID' });
assert.throws(() => make({ consumerEvidence: reseal(consumerEvidence, { candidateHash: hash('foreign') }) }),
  { code: 'FACTION_CONSUMER_GUIDED_REVISION_EVIDENCE_INVALID' });
const driftedSections = sourceCandidate.sections.map((section, index) => index ? section : reseal(section, {
  draft: { recommendations: section.draft.recommendations.map((row, recommendation) => recommendation ? row : {
    ...row, alternatives: ['drift', ...row.alternatives.slice(1)] }) },
}));
assert.throws(() => make({ candidate: reseal(sourceCandidate, { sections: driftedSections }) }),
  { code: 'FACTION_CONSUMER_GUIDED_REVISION_SCOPE' });

const files = ['packages/skill-production-v3/faction-consumer-guided-revision-v1.mjs',
  'scripts/verify-ticket-18-faction-consumer-guided-revision-v1.mjs'];
const report = seal({ passed: true, sourceRunId, priorRunId, inputHash: input.hash,
  parentCandidateHash: sourceCandidate.hash, revisedCandidateHash: actual.candidate.hash,
  revisionSpecHash: actual.revisionSpec.hash, revisionEvidenceHash: actual.revisionEvidence.hash,
  authenticatedPriorConsumerReplayHash: consumerEvidence.hash,
  semanticFieldChanges: proseChanges, citationArrayChanges: citationChanges,
  sourceAndKernelCalibrated: true, unaffectedRecommendationFieldsByteExact: true,
  freshIndependentConsumerEvaluationStillRequired: true, actualProviderCalls: 0,
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
});
await writeFile(path.join(base, 'consumer-guided-revision-readiness-v1.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, parentCandidateHash: sourceCandidate.hash,
  revisedCandidateHash: actual.candidate.hash, semanticFieldChanges: proseChanges,
  citationArrayChanges: citationChanges, actualProviderCalls: 0, hash: report.hash }));
