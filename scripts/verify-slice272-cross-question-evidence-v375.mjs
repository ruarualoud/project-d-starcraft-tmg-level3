import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {qualifyRosterTeachFrameworkSynthesisV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const raw=JSON.parse(gunzipSync(await fs.readFile(process.argv[3]+'/call-121.reply.json.gz'))).output;
const state=saved.teachFramework.state;
const evidence=[...state.evidence,...state.investigation.evidence,
  ...state.queryRecovery.operations.map(o=>o.result).filter(Boolean)];
const answer=raw.answers.find(a=>a.questionId==='q-robustness-replanning-triggers');
assert.equal(answer.disposition,'revise');
const synth={answers:[answer],proposedPlanChanges:[],proposedRosterChanges:[],frameworkFeedback:[]};
const output=qualifyRosterTeachFrameworkSynthesisV1({synthesis:synth,evidence,sourceEvidence:saved.teachFramework.context});
assert.equal(output.answers[0].quantitativeEvidence[0].value,4,'Same actual conditional arithmetic already binds');
assert.equal(output.answers[0].disposition,'revise','Receipt question ownership is not evidence invalidity');
assert.equal(output.answers[0].quantitativeEvidence[0].interpretationVerified,false);
const missing=structuredClone(synth);missing.answers[0].evidenceRefs=['not-a-delivered-receipt'];
assert.equal(qualifyRosterTeachFrameworkSynthesisV1({synthesis:missing,evidence,sourceEvidence:saved.teachFramework.context}).answers[0].disposition,'unresolved');
const unanswered={questionId:answer.questionId,queryRecoveryOf:'test-unanswered-original',status:'unknown',
  queryRepair:{missingQueryPredicates:['original postcondition']}};
assert.equal(qualifyRosterTeachFrameworkSynthesisV1({synthesis:synth,evidence:[...evidence,unanswered],sourceEvidence:saved.teachFramework.context}).answers[0].disposition,'unresolved');
console.log(JSON.stringify({pass:true,actualCrossQuestionMathRetained:true,missingAndUnansweredStillUnknown:true,providerCalls:0}));
