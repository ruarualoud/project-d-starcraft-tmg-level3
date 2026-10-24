import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import * as catalogue from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import {buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const [directory,formalFile,fixtureRoot]=process.argv.slice(2);
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:fixtureRoot});
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const paid=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-093.reply.json.gz`)));
assert(paid.output.findings.some(f=>f.claimPath==='counterResponses.resp-strip-creep.responseText'),
 'Fixture is the actual missing-card-source review, not an invented scenario');
const rules=catalogue.rosterSelectionSupportRulesV1?.(source.dataset)??[];
const facts=buildRosterFinalPlanVerifiedFactsV1({plan:JSON.parse(saved.planSerialized),
 toolReceipts:saved.toolReceipts,selectionUnitRules:catalogue.rosterSelectionUnitRulesV1(source.dataset),
 selectionSupportRules:rules}).sourceFacts;
assert(facts.selectionSupportRules?.some(r=>r.recordKey==='tactical_cards:kerrigan_s_swarm'),
 'Actual093 wrongly lacks the frozen faction/card source in its verified facts');
for(const key of ['tactical_cards:kerrigan_s_swarm','tactical_cards:accelerating_creep','tactical_cards:malignant_creep']) {
 const expected=source.dataset.recordsByKey[key];
 const actual=facts.selectionSupportRules.find(r=>r.recordKey===key);
 assert.deepEqual(actual.rule,expected.payload,'Pass original rules, not hand-authored paraphrases');
 assert.equal(actual.sourceRecordHash,expected.sourceRecordHash);
}
assert(rules.every(r=>source.dataset.recordsByKey[r.recordKey].authorityDisposition==='official_current_product_candidate'));
assert.equal(facts.supportRuleCatalogueIsObservedEnemyLoadout,false);
console.log(JSON.stringify({pass:true,originalRuleRecords:rules.length,communityRecordsExcluded:true,providerCalls:0}));
