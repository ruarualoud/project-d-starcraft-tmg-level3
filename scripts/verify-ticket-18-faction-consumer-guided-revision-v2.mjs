import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { inspectFactionConsumerReplayV2 } from '../packages/skill-evaluation/faction-consumer-evidence-v2.mjs';
import { evaluateFactionRuleUseGroupedV2 } from '../packages/skill-evaluation/faction-rule-use-evaluation-v2.mjs';
import { factionConsumerContextV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { createFactionConsumerGuidedRevisionV2, FACTION_CONSUMER_GUIDED_REVISION_TEXT_V2 as texts } from '../packages/skill-production-v3/faction-consumer-guided-revision-v2.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const parentRunId = 'faction-consumer-a692960552676292352f';
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, parentRunId, name + '.json'), 'utf8')));
const [recipe, parentReport, input, parentCandidate, parentProductionEvidence,
  rosterEvaluation, ruleEvaluation, finalGeneral] = await Promise.all(
  ['recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation',
    'rule-application-evaluation', 'final-general-dependency'].map(json));
const catalogue = await loadFrozenSkillEvidence(root);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const consumerEvidence = await inspectFactionConsumerReplayV2({ root,
  filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
  runId: parentRunId, recipe, report: parentReport, input, candidate: parentCandidate,
  productionEvidence: parentProductionEvidence, knownRulePolicy, drills, applicationDrills,
  evaluation: rosterEvaluation, applicationEvaluation: ruleEvaluation, finalGeneral });
const make = fields => createFactionConsumerGuidedRevisionV2({ input, candidate: parentCandidate,
  knownRulePolicy, rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills: drills,
  applicationDrills, draftEnvelopeBinding, parentProductionEvidence, ...fields });
const actual = make({});
const army = actual.candidate.sections.find(row => row.section.id.endsWith('.army_resources.1'));
const unit = actual.candidate.sections.find(row => row.section.id.endsWith('.unit_roles.1'));
assert.equal(army.draft.recommendations[1].procedure[1], texts.NEW_DAMAGE_TEXT);
assert.equal(unit.draft.recommendations[5].procedure[0], texts.NEW_REACTION_TEXT);
assert(army.draft.recommendations[1].sourceRefs.includes('core.iuUyObNTQ2M8xK4IUqzC.items.7.subItems.3'));
assert.equal(actual.revisionSpec.semanticFieldChanges, 2);
assert.equal(actual.revisionSpec.citationArrayChanges, 1);
assert.equal(actual.revisionEvidence.groupedIndependentConsumerEvaluationPerformed, false);
factionConsumerContextV1({ input, candidate: actual.candidate, knownRulePolicy });

const project = candidate => candidate.sections.map(section => section.draft.recommendations);
const before = project(parentCandidate), after = project(actual.candidate);
let proseChanges = 0, citationChanges = 0;
for (let s = 0; s < before.length; s++) for (let r = 0; r < before[s].length; r++)
  for (const key of ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven', 'sourceRefs']) {
    if (hash(before[s][r][key]) === hash(after[s][r][key])) continue;
    if (key === 'sourceRefs') citationChanges++; else proseChanges++;
  }
assert.equal(proseChanges, 2); assert.equal(citationChanges, 1);
assert.equal(parentCandidate.hash, 'a4c44d7c3eecd57eb1039796df8b7d097e271a6320d821dc0199c62c76f75ea7');
assert.equal(parentCandidate.sections.find(row => row.section.id.endsWith('.army_resources.1'))
  .draft.recommendations[1].procedure[1], texts.OLD_DAMAGE_TEXT);
assert.equal(parentCandidate.sections.find(row => row.section.id.endsWith('.unit_roles.1'))
  .draft.recommendations[5].procedure[0], texts.OLD_REACTION_TEXT);

const expected = new Map(applicationDrills.list(input.factionRecordKey).map((question, index) => [question.id, {
  id: question.id, answer: applicationDrills.proof()[index].independentlySpecifiedExpectation,
}]));
const temp = await mkdtemp(path.join(base, 'consumer-guided-v2-test-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), {
  runId: 'fixture-grouped-v2', recipeHash: hash('fixture-grouped-v2'), maxCalls: 24,
  maxCostMicros: 100_000_000, maxTokens: 100_000_000, maxWallMs: 300000,
});
let fixtureCalls = 0;
const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: 1_000_000,
  complete: async request => {
    fixtureCalls++;
    const content = request.promptNodes.find(node => node.type === 'actual_agent_conversation').value.messages[0].content;
    const payload = JSON.parse(content.slice(content.indexOf('\n') + 1));
    const predictions = payload.questions.map(question => structuredClone(expected.get(question.id)));
    const output = { channels: { skill: { action: 'finish', content: { predictions } } } };
    const response = { schemaVersion: 'starcraft_tmg_provider_egress_transport_v1.success',
      providerProfileRef: { hash: hash('fixture-profile') }, status: 200, physicalAttempts: 1,
      automaticRetries: 0, requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash',
      responseFingerprint: sha256(JSON.stringify(output)), usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
      fixtureRequestHash: hash(request), fixtureOnly: true };
    return { output, usageReceipt: { ...response, receiptHash: hash(response) } };
  } });
let grouped;
try { grouped = await evaluateFactionRuleUseGroupedV2({ input, candidate: actual.candidate,
  knownRulePolicy, drills: applicationDrills, store, model, finalGeneral }); }
finally { store.close(); }
assert(grouped.boundedRuleApplicationPassed); assert.equal(grouped.calls, 18);
assert.deepEqual(grouped.summary.map(row => [row.total, row.correct]), [[66, 66], [66, 66]]);
assert.equal(fixtureCalls, 18);

const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
assert.throws(() => make({ consumerEvidence: reseal(consumerEvidence, { candidateHash: hash('foreign') }) }),
  { code: 'FACTION_CONSUMER_GUIDED_REVISION_V2_EVIDENCE_INVALID' });
assert.throws(() => make({ parentProductionEvidence: reseal(parentProductionEvidence, { candidateHash: hash('foreign') }) }),
  { code: 'FACTION_CONSUMER_GUIDED_REVISION_V2_SCOPE' });

const files = ['packages/skill-evaluation/faction-consumer-evidence-v2.mjs',
  'packages/skill-evaluation/faction-rule-use-evaluation-v2.mjs',
  'packages/skill-production-v3/faction-consumer-guided-revision-v2.mjs',
  'scripts/verify-ticket-18-faction-consumer-guided-revision-v2.mjs'];
const report = seal({ passed: true, parentRunId, parentCandidateHash: parentCandidate.hash,
  revisedCandidateHash: actual.candidate.hash, revisionSpecHash: actual.revisionSpec.hash,
  revisionEvidenceHash: actual.revisionEvidence.hash, authenticatedConsumerEvidenceHash: consumerEvidence.hash,
  semanticFieldChanges: proseChanges, citationArrayChanges: citationChanges,
  groupedRuleFamilies: 3, groupedRuleCalls: 18, fixtureCalls,
  exactParentFailuresBound: 9, unaffectedRecommendationFieldsByteExact: true,
  freshIndependentConsumerEvaluationStillRequired: true,
  actualProviderCalls: 0, sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
});
await writeFile(path.join(base, 'consumer-guided-revision-readiness-v2.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, parentCandidateHash: parentCandidate.hash,
  revisedCandidateHash: actual.candidate.hash, groupedRuleCalls: 18,
  fixtureCalls, actualProviderCalls: 0, hash: report.hash }));
