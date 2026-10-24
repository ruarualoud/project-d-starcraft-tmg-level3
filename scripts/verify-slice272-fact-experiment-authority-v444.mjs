// Concrete regression: paid265 treated choosing a hypothetical opponent action
// or path as editing the committed Plan, then repeated an already delivered read.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {isolateRosterTeachFactProbeNodesV1} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
const dir=process.argv[2];
const read=async name=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${dir}/${name}`)));
const actual=await read('call-265.product-request.json.gz');
const reply=await read('call-265.reply.json.gz');
assert(reply.output.unresolved.some(x=>x.whyNotCurrentlyQueryable.includes('this role may not select')));
const find=k=>actual.promptNodes.find(n=>n.kind===k);
const evidence=find('fact_probe_tool_executions').currentBatchEvidence;
const questions=find('fact_probe_questions').questions;
const nodes=[{kind:'frozen_plan_and_method',plan:{},framework:{},context:find('fact_probe_source_material').context},
  {kind:'current_investigation_assignment',pendingQuestionIds:questions.map(q=>q.questionId)},
  find('canonical_current_query_context'),find('current_query_capability_guide'),
  {kind:'questions_and_results',agenda:{questions},evidence:[],investigation:{
    evidence,operations:[],completedRoundCount:1,latestCompletedQueryIds:evidence.map(e=>e.challengeId)}}];
const before=JSON.stringify(nodes),archive=new Map();
const result=isolateRosterTeachFactProbeNodesV1(nodes,archive);
const boundary=result.find(n=>n.kind==='fact_probe_mutation_boundary');
assert.equal(boundary.experimentAuthority?.mayChooseConditionalActions,true,
  'Real fact role has no explicit private-experiment authority separate from Plan edits');
assert.equal(boundary.experimentAuthority.mayChainNativeSuccessors,true);
assert.equal(boundary.experimentAuthority.requiresCommittedPlanChoice,false);
assert.equal(boundary.mayEditRosterOrPlanInThisRole,false);
const contexts=result.find(n=>n.kind==='current_experiment_action_menus').branches;
const original=evidence[0].queryContext;
const menu=contexts.find(c=>c.baseStateHash===original.baseStateHash);
assert(menu,'Actual delivered branch must be directly discoverable, not another inspect request');
assert.equal(menu.parameterDomains.length,original.actionSpace.parameterDomains.length);
for(let i=0;i<menu.parameterDomains.length;i++) {
  const entry=menu.parameterDomains[i],raw=original.actionSpace.parameterDomains[i];
  assert.equal(entry.domainId,raw.domainId);
  assert.equal(entry.pieceId,raw.pieceId);
  assert.equal(entry.actionType,raw.actionType);
  assert.equal(entry.maxDistanceMilliInches,raw.constraints?.maxDistanceMilliInches??null);
  assert.equal(entry.sourcePath,`queryContext.actionSpace.parameterDomains.${i}`);
}
assert.deepEqual(result.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence,evidence);
assert.equal(JSON.stringify(nodes),before,'No mutation to paid input or evidence');
console.log(JSON.stringify({ok:true,realReply:265,branches:contexts.length,domains:menu.parameterDomains.length,
  originalResultsUnchanged:true,roleCannotCommit:true,providerCalls:0,nativeExecutions:0}));
