import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const [stateFile,formalFile]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const teach={...Object.fromEntries(['sessionId','status','planningMode','setup','agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview','planReviewHistory'].map(k=>[k,saved[k]])),
 plan:JSON.parse(saved.planSerialized),planVersionHistory:saved.planVersionHistory.map(JSON.parse)};
assert.notEqual(teach.plan.planHash,teach.planReview.planHash);
assert(teach.planReview.review.reviewAdjudication);
const originalReview=JSON.stringify(teach.planReview);
const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],read:async()=>state},
 workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_WRITE');},listSessions:async()=>({sessions:[teach]}),readSession:()=>teach,
  reviewFinalPlan(){throw Error('NO_WRITE');},revisePlan(){throw Error('NO_WRITE');}},promoteTeachPlan(){throw Error('NO_WRITE');}});
const view=await journey.read(state.sessionId);
assert.equal(view.stage,'source_review_required');
assert.equal(view.sourceReviewHighCount,null);
assert.equal(view.sourceReviewStale,true);
assert.equal(JSON.stringify(teach.planReview),originalReview);
console.log(JSON.stringify({pass:true,planVersion:teach.plan.planVersion,oldReviewPreserved:true,newPlanNotCertified:true,providerCalls:0}));
