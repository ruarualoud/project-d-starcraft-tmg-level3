// Real df57e380 input automatically included a failed prior judgment as a
// current read. The new raw reply copied its false identity premise verbatim.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterSourceReviewRequestV1} from '../packages/roster-strategist/roster-source-review-presentation-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v826-gate-'+Date.now()+'.json';
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{const out={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.error(JSON.stringify(out));process.exitCode=1;});
console.log(JSON.stringify({stage:'started',resultFile}));
const old=await get('df57e380c0ab958abf10f5d58036e93d907dfe764b1532d227dda7d507c14bff'),before=hash(old);
const oldInputs=old.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.ok(oldInputs.priorQuestionJudgement.value.checks[0].publicReason.includes('different state/graph/legal-space hashes'));
const request=prepareRosterSourceReviewRequestV1(old);
const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(inputs.priorQuestionJudgement,undefined,'independent audit must not automatically receive the failed verdict as a current fact/template');
assert.equal(inputs.priorReviewHistory.value.evidenceId,oldInputs.priorQuestionJudgement.evidenceId);
assert.equal(inputs.priorReviewHistory.value.isSourceEvidence,false);
assert.deepEqual(inputs.originalDataQuestions,oldInputs.originalDataQuestions,'original unresolved questions are not erased or silently reclassified');
assert.deepEqual(inputs.claim,oldInputs.claim);assert.deepEqual(inputs.sourceDirectory,oldInputs.sourceDirectory);
assert.deepEqual(request.promptNodes.find(n=>n.kind==='exact_read_results'),old.promptNodes.find(n=>n.kind==='exact_read_results'),'explicitly requested Native facts remain untouched');
assert.equal(hash(old),before);
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),stateHash=hash(state);
const owner=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05'));
const latest=state.work.findLast(w=>w.experimentSourceReviewOf===owner.id&&w.status!=='superseded');
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.equal(next.sourceReviewRecheckOf,latest.id);
assert.equal(next.claimReviews.length,1,'only the contaminated failed claim reopens');
assert.equal(next.materialClaims.filter(c=>c.reusedResultRef).length,5,'the newly passed hypothesis stays passed');
assert.equal(next.sourceReviewRepairHandoff.staleRequests.length,1);
assert.equal(next.sourceReviewPresentationVersion,2);assert.equal(hash(state),stateHash);
const out={pass:true,actualFailedPromptReproduced:true,oldVerdictNotInjected:true,questionsAndSourcesUnchanged:true,
  oneFailedClaimRecovered:true,fivePassesReused:true,providerCalls:0,nativeCalls:0,productionWrites:0,judgmentOverridden:false};
await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.log(JSON.stringify(out));
