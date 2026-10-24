import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1 as load,
  resolveOfficialDevelopmentTrancheFixtureRootV1 as resolve} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {rosterSelectionSupportRulesV1,rosterSelectionUnitRulesV1} from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import {buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {collectRosterTeachSourceFactsV1} from '../packages/roster-strategist/roster-teach-source-facts-v1.mjs';
const source=await load({root:await resolve({root:process.cwd()})});
const request=JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const original=request.promptNodes.find(n=>n.kind==='verified-structured-facts').sourceFacts;
const expected=Object.entries(source.dataset.recordsByKey)
  .filter(([key,r])=>key.startsWith('rules_sections:')&&r.authorityDisposition==='official_rule_prose_review_required');
assert.ok(expected.length>0);
assert.ok(!original.selectionSupportRules.some(r=>r.recordKey.startsWith('rules_sections:')),
  'The retained actual352 fixture must reproduce missing general-rule input');
const projected=rosterSelectionSupportRulesV1(source.dataset);
const general=projected.filter(r=>r.recordKey.startsWith('rules_sections:'));
assert.equal(general.length,expected.length,
  'Actual352 falsely lacks ON CREEP/activation/reaction rules because production source projection drops every rules_sections record');
for(const [key,record] of expected){
  const actual=general.find(r=>r.recordKey===key);
  assert.deepEqual(actual.rule,record.payload);
  assert.equal(actual.sourceRecordHash,record.sourceRecordHash);
  assert.equal(actual.sourceAuthorityDisposition,'official_rule_prose_review_required');
  assert.equal(actual.interpretationVerified,false);
}
assert.deepEqual(projected.filter(r=>r.recordKey.startsWith('tactical_cards:')),original.selectionSupportRules);
assert.ok(general.some(r=>JSON.stringify(r.rule).includes('Creep Tumor')&&JSON.stringify(r.rule).includes('Within 6')));
const session=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const plan=JSON.parse(session.planSerialized);
const facts=buildRosterFinalPlanVerifiedFactsV1({plan,toolReceipts:session.toolReceipts,
  selectionUnitRules:rosterSelectionUnitRulesV1(source.dataset),selectionSupportRules:projected}).sourceFacts;
assert.deepEqual(facts.selectionSupportRules,projected);
const teach=collectRosterTeachSourceFactsV1({sourceFacts:facts});
for(const record of general){
  const bound=teach.find(f=>f.value.recordKey===record.recordKey);
  assert.ok(bound);
  assert.ok(bound.aliases.includes(record.referenceId));
  assert.equal(bound.notNativeActionReceipt,true);
  assert.equal(bound.interpretationVerified,false);
}
console.log(JSON.stringify({pass:true,actual352:true,generalRuleRecords:general.length,
  unitAndCardAuthorityUnchanged:true,exactFrozenProse:true,sharedReviewRevisionTeachProjection:true,providerCalls:0}));
