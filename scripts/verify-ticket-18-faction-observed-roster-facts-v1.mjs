import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createFactionObservedRosterFactsV1 } from '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '-input.json', 'utf8')));
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: process.cwd() });
const inputs = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(read));
const [terran, zerg] = inputs.map(input => createFactionObservedRosterFactsV1({ input, dataset }));
const get = id => zerg.cases.find(c => c.id === id).outcome;
let checks = 0;
for (const [id, gas, elite] of [['hydra_lair', 35, 0], ['hydra_overlord', 35, 0], ['hydra_den', 35, 1],
  ['hero_hydra_overlord', 35, 0], ['hero_hydra_both', 70, 1]]) {
  const result = get(id); assert.equal(result.eligibleWithinDeclaredChecks, true);
  assert.equal(result.budget.vespeneSpent, gas); assert.equal(result.slots.unusedArmySlots.Elite, elite); checks += 3;
}
assert.equal(get('hero_hydra_lair').rejectionCode, 'ARMY_SLOT_CAPACITY_EXCEEDED'); checks++;
assert.equal(get('duplicate_overlord').rejectionCode, 'UNIQUE_CARD_SINGLE_COPY_LIMIT'); checks++;
assert.equal(terran.cases[0].outcome.eligibleWithinDeclaredChecks, true); checks++;
assert.equal(terran.cases[1].outcome.rejectionCode, 'UNIQUE_CARD_SINGLE_COPY_LIMIT'); checks++;
for (const name of ['overlord', 'lair']) {
  const card = zerg.cardFacts.find(c => c.ref === 'source:tactical_cards:' + name);
  assert.equal(card.cost, 35); assert.equal(card.unique, true); checks += 2;
}
assert.equal(zerg.heldoutEvidence, false); assert.equal(terran.heldoutEvidence, false); checks += 2;
const files = ['packages/skill-evaluation/faction-observed-roster-facts-v1.mjs',
  'scripts/verify-ticket-18-faction-observed-roster-facts-v1.mjs',
  'packages/rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs',
  'packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs',
  'packages/rule-atoms/official-card-build-payment-rules-kernel-v1.mjs'];
const report = seal({ passed: true, checks, actualRulesCases: terran.cases.length + zerg.cases.length,
  terran, zerg, providerCalls: 0, actualDshSessions: 0, sourceRefreshPerformed: false,
  productionRepairApplied: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'observed-roster-facts-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualRulesCases: report.actualRulesCases, providerCalls: 0, hash: report.hash }));
