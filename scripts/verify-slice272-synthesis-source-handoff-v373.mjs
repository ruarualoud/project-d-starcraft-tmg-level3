import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import * as probe from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
import {createRosterTeachSynthesisArchiveV1,createRosterTeachSynthesisReaderStateV1,
  projectRosterTeachSynthesisReaderV1,readRosterTeachSynthesisDocumentV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const reply=JSON.parse(gunzipSync(await fs.readFile(process.argv[3]+'/call-121.reply.json.gz'))).output;
assert(reply.answers.find(a=>a.questionId==='q-opponent-scenarios-creep-bonuses').publicReason.includes('No delivered receipt'));
const context=saved.teachFramework.context;
const plan=JSON.parse(saved.planSerialized);
const state=saved.teachFramework.state;
const history=(probe.projectRosterTeachInvestigationHistoryV1??(s=>({rounds:(s.investigation?.rounds||[])
  .map(r=>({publicReason:r.output.publicReason,unresolved:r.output.unresolved})),operations:s.investigation?.operations||[]})))(state);
assert.deepEqual(history.rounds.map(r=>r.questionProgress),state.investigation.rounds.map(r=>r.output.questionProgress||[]),
  'Completed per-question handoffs must reach synthesis, not just stale unresolved prose');
const archive=createRosterTeachSynthesisArchiveV1([
  {kind:'current_plan_and_context',plan,context},
  {kind:'historical_investigation_claims',rounds:history.rounds},
]);
const reader=createRosterTeachSynthesisReaderStateV1(archive);
const view=projectRosterTeachSynthesisReaderV1(archive,reader)[0];
const directory=view.sourceNavigation;
assert(directory,'Actual121 overlooked available rules: expose the exact source catalogue in the reader');
const entry=directory.ruleRecords.find(r=>r.recordKey==='tactical_cards:accelerating_creep');
assert(entry);
const original=readRosterTeachSynthesisDocumentV1(archive,entry.original,reader);
assert.deepEqual(original.value,context.sourceFacts.selectionSupportRules.find(r=>r.recordKey===entry.recordKey));
assert.equal(entry.sourceRecordHash,original.value.sourceRecordHash);
assert(directory.ruleRecords.some(r=>r.recordKey==='army_units:kerrigan'));
assert.equal(directory.navigationOnly,true);
assert.equal(directory.catalogueProvesSelectedEnemyLoadout,false);
assert(directory.investigationHandoffs.some(r=>r.questionId==='q-post-loss-healer-screen'));
assert(directory.investigationHandoffs.every(r=>r.authority==='past_model_claim_not_rules_fact'));
assert.equal(reader.completedSteps.length,0,'Navigation does not claim the model has read originals');
console.log(JSON.stringify({pass:true,records:directory.ruleRecords.length,
  questionProgressPreserved:true,exactSourcesReadable:true,providerCalls:0,nativeQueries:0}));
