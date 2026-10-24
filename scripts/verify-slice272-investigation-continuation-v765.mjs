// Real consecutive authorizations reproduced the entire same inquiry after
// the method returned, creating another question tree without addressing it.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as inquiry from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
const root=process.argv[2];
assert(root,'saved workflow root required');
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const priorRef='a2aaff4504650298f9d875081028e4dc227a7e662347eda80f98d70338a46a5e';
const nextRef='d0d0359e3a0926c4607fea99b83a133c92c874576ba01dfc9837f239b6b7ec5e';
const prior=(await read(priorRef)).value.decisions[0];
const next=(await read(nextRef)).value.decisions[0];
assert.deepEqual(prior.nextInvestigation,next.nextInvestigation);
const priorBytes=await fs.readFile(`${root}/artifacts/${priorRef}.json`);
const nextBytes=await fs.readFile(`${root}/artifacts/${nextRef}.json`);
const context={previousAuthorization:prior.nextInvestigation,
  previousQuestions:prior.nextInvestigation.questionNumbers.map(n=>prior.dataQuestions[n-1].question)};
assert.equal(inquiry.rosterDecisionInvestigationErrorV1(next,{continuation:context})?.code,
  'unchanged_investigation_authorization','identical authorization must not silently start another experiment');
assert.equal(inquiry.rosterDecisionInvestigationErrorV1(next),null,'old contracts remain unchanged');
const changed=structuredClone(next);
changed.nextInvestigation.whyExistingEvidenceInsufficient=
  'New Native route reference declares Combat, whereas the prior inspected scene was Assault; test the same named participants in the explicitly declared Combat condition, not another Assault placement.';
assert.equal(inquiry.rosterDecisionInvestigationErrorV1(changed,{continuation:context}),null);
const state=JSON.parse(await fs.readFile(`${root}/workflow.json`,'utf8'));
const work=state.work.find(w=>w.resultRef===nextRef);
assert(work);
const projection=await inquiry.projectRosterInvestigationContinuationV1({
  state,workId:work.id,readArtifact:read});
assert.equal(projection.previousResultRef,priorRef,'follow explicit question/return ancestry, not global latest');
assert.deepEqual(projection.previousAuthorization,prior.nextInvestigation);
const foreign=structuredClone(state);
foreign.work.find(w=>w.resultRef===priorRef).bindings={...work.bindings,army:'different-army'};
const unrelated=await inquiry.projectRosterInvestigationContinuationV1({
  state:foreign,workId:work.id,readArtifact:read});
assert.notEqual(unrelated?.previousResultRef,priorRef,'another army is not this continuation');
assert.deepEqual(await fs.readFile(`${root}/artifacts/${priorRef}.json`),priorBytes);
assert.deepEqual(await fs.readFile(`${root}/artifacts/${nextRef}.json`),nextBytes);
console.log(JSON.stringify({passed:true,realRepeatedAuthorizationDetected:true,
  explicitOwnershipUsed:true,changedMethodStillAllowed:true,legacyContractUnchanged:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
