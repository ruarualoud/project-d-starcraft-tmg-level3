import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {projectRosterTeachRolePromptV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createRosterTeachSynthesisArchiveV1,createRosterTeachSynthesisReaderStateV1,
  applyRosterTeachSynthesisReaderCommandV1,projectRosterTeachSynthesisReaderV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=draft.teachFramework.state;
const reply=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])).toString()).output;
const context=structuredClone(draft.teachFramework.context);
context.sourceReview=structuredClone(state.sourceReviewQualificationHandoff.sourceReview);
const evidence=[...state.evidence,...state.investigation.evidence,...state.queryRecovery.operations.filter(o=>o.result).map(o=>o.result)];
const originals=new Map();
const nodes=projectRosterTeachRolePromptV1('teach_framework_synthesis',[
  {kind:'current_plan_and_context',plan:JSON.parse(draft.planSerialized),context},
  {kind:'framework_and_questions',framework:state.framework,agenda:state.agenda},
  {kind:'actual_tool_results',evidence,investigation:{},queryRecovery:{operations:state.queryRecovery.operations}},
],originals);
const archive=createRosterTeachSynthesisArchiveV1(nodes,{retainedEvidence:originals});
const reader=createRosterTeachSynthesisReaderStateV1(archive);
reader.readManifest=structuredClone(state.synthesisReader.readManifest);
const command={...reply,answers:reply.answers.filter(a=>a.questionId==='q-opportunity-cost-builder-comparison')};
assert.equal(command.answers[0].disposition,'unresolved');
const original=JSON.stringify(command);
applyRosterTeachSynthesisReaderCommandV1(archive,reader,command);
assert.equal(reader.answers.length,0,'Actual197 must not save a conclusion before reading its known successful Builder result');
assert.equal(reader.unreadEvidenceDrafts.length,1);
assert(reader.latestPages.length>0||reader.queuedReads.length>0,'Product automatically stages original evidence, not a new query');
assert.equal(JSON.stringify(command),original,'Paid output remains unchanged');
const workspace=projectRosterTeachSynthesisReaderV1(archive,reader)[0];
assert(workspace.sourceReviewAdjudication?.findings?.length,'Already settled source review must remain visible with its explicit Plan-claim subject');
assert.equal(workspace.evidenceReadFeedback.nativeQueriesRepeated,0);
console.log(JSON.stringify({passed:true,actualReply:197,knownSuccessfulEvidenceNotSkipped:true,oldAllegationsNotFacts:true,providerCalls:0,nativeQueries:0}));
