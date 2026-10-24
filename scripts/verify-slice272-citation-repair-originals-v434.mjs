// Actual237→238: correcting wrapped card paths guessed the same wrapper on
// flat unit facts. Supply exact affected originals, not an interchangeable schema.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {collectRosterTeachSourceFactsV1} from '../packages/roster-strategist/roster-teach-source-facts-v1.mjs';
import {createRosterTeachSynthesisArchiveV1,createRosterTeachSynthesisReaderStateV1,
  projectRosterTeachSynthesisReaderV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const [draftFile,runDirectory]=process.argv.slice(2);
const draft=JSON.parse(await fs.readFile(draftFile,'utf8'));
const saved=draft.teachFramework.context;
const context={mission:saved.mission,sourceFacts:saved.sourceFacts,abilityPartnerConstraints:saved.abilityPartnerConstraints};
const request=JSON.parse(gunzipSync(await fs.readFile(`${runDirectory}/call-239.product-request.json.gz`)));
const actual=request.promptNodes.find(n=>n.kind==='readonly_synthesis_workspace');
const archive=createRosterTeachSynthesisArchiveV1([{kind:'current_plan_and_context',plan:JSON.parse(draft.planSerialized),context}]);
const state=createRosterTeachSynthesisReaderStateV1(archive);
state.answers=structuredClone(draft.teachFramework.state.synthesisReader.answers);
state.citationFeedback=structuredClone(actual.citationFeedback);
const view=projectRosterTeachSynthesisReaderV1(archive,state)[0];
const sources=view.citationRepairOriginals;
assert(sources?.length,'Actual field-path repair has no original rule bodies; model is left guessing wrapper structure');
const facts=collectRosterTeachSourceFactsV1(context);
const affected=new Set(actual.citationFeedback.correctableFailures.map(x=>x.questionId));
const refs=new Set(state.answers.filter(a=>affected.has(a.questionId)).flatMap(a=>[
  ...a.evidenceRefs,...a.quantitativeEvidence.map(e=>e.receiptRef),...a.qualitativeEvidence.map(e=>e.receiptRef)]));
for(const ref of refs){const fact=facts.find(f=>f.citationRef===ref||f.aliases.includes(ref));if(!fact)continue;
  const supplied=sources.find(x=>x.citationRef===fact.citationRef);
  assert(supplied,`Missing actual repair source ${ref}`);
  assert.equal(supplied.page.kind,'value');
  assert.deepEqual(supplied.page.value,fact.value,'Do not normalize/mutate the frozen source or rewrite a model answer');
  assert.equal(supplied.interpretationVerified,false);
}
assert(sources.some(x=>x.page.value.rule),'Actual wrapped card case present');
assert(sources.some(x=>x.page.value.abilities),'Actual flat unit case present');
assert.deepEqual(state.answers,draft.teachFramework.state.synthesisReader.answers);
state.citationFeedback.correctableFailures=[];
assert.equal(projectRosterTeachSynthesisReaderV1(archive,state)[0].citationRepairOriginals,undefined,'Do not inflate normal requests');
console.log(JSON.stringify({ok:true,exactOriginals:sources.length,bytes:Buffer.byteLength(JSON.stringify(sources)),providerCalls:0,nativeQueries:0}));
