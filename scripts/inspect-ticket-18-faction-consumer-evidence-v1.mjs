import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { inspectFactionCandidateEvidenceV1 } from '../packages/skill-evaluation/faction-candidate-evidence-v1.mjs';
import { inspectFactionConsumerReplayV1 } from '../packages/skill-evaluation/faction-consumer-evidence-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1'), runId = process.argv[2];
if (process.argv.length !== 3 || !/^faction-consumer-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_CONSUMER_INSPECTION_ARGUMENTS');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, runId, n + '.json'), 'utf8')));
const [recipe, report, input, savedCandidate, savedEvidence, evaluation, applicationEvaluation] = await Promise.all(
  ['recipe', 'report', 'input', 'candidate', 'production-evidence', 'evaluation', 'rule-application-evaluation'].map(json));
for (const row of recipe.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
  fail('FACTION_CONSUMER_INSPECTION_CODE_DRIFT');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const { candidate, evidence: productionEvidence } = await inspectFactionCandidateEvidenceV1({ root,
  runId: recipe.sourceRunId, input, knownRulePolicy, catalogue, context });
if (candidate.hash !== savedCandidate.hash || productionEvidence.hash !== savedEvidence.hash)
  fail('FACTION_CONSUMER_INSPECTION_PRODUCTION_DRIFT');
const evidence = await inspectFactionConsumerReplayV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
  runId, recipe, report, input, candidate, productionEvidence, knownRulePolicy, drills, applicationDrills, evaluation, applicationEvaluation });
await writeFile(path.join(base, runId, 'verified-consumer-evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ evidenceVerified: true, matchedActualRequests: evidence.delivery.receiptHashes.length,
  rawAnswersRescored: evidence.rawAnswersRescored, boundedRosterChoicePassed: evidence.boundedRosterChoicePassed,
  boundedRuleApplicationPassed: evidence.boundedRuleApplicationPassed, newProviderCalls: 0, hash: evidence.hash }));
