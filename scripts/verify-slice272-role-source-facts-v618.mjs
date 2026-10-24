// Actual925 re-read large Native originals yet attributed an excluded optional
// reaction's value to a sampled delta. Give every decision role the same exact,
// compact source facts, with exclusion flags and original detail addresses.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import * as lineageModule from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),source=JSON.parse(original);
const state=structuredClone(source),values=new Map();let writes=0;
const get=async ref=>values.has(ref)?structuredClone(values.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const workflow={inspect:async()=>structuredClone(state),dispatch:async command=>{
  assert.equal(command.type,'publish_evidence');assert(!state.evidence.some(e=>e.id===command.id));
  const ref='fixture-'+(++writes);values.set(ref,structuredClone(command.value));
  state.evidence.push({id:command.id,artifactRef:ref,bindings:structuredClone(command.bindings),kind:command.kind,title:command.title});
}};
const directory=lineageModule.publishRosterWorkflowDecisionEvidenceDirectoryV1
  ?await lineageModule.publishRosterWorkflowDecisionEvidenceDirectoryV1({workflow,store:{get}})
  :await lineageModule.projectRosterWorkflowDecisionEvidenceLineageV1({state,readArtifact:get});
const entry=directory.entries.find(e=>e.evidenceNumber===1151);assert(entry);
assert(entry.sourceFactsRead,'BUG: actual cited Native has no compact, source-labelled fact handle for any role');
const compact=await get(state.evidence[entry.sourceFactsRead.evidenceNumber-1].artifactRef);
const full=await get(source.evidence[1150].artifactRef),body=full.value??full;
assert.equal(compact.sourceEvidenceId,source.evidence[1150].id);
assert.equal(compact.sourceArtifactRef,source.evidence[1150].artifactRef);
assert.deepEqual(compact.exchange.estimates.map(e=>e.outcomes),body.receipt.exchange.attackEstimates.map(e=>Object.fromEntries(Object.entries(e.outcomes).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v)))));
assert(compact.exchange.estimates.some(e=>e.reactionOpportunityScope.baselineOutcomeDistributionExcludesOptionalReactionEffects===true));
assert(compact.exchange.estimates.every(e=>e.pointer&&e.outcomeDetailPointer&&e.reactionDetailPointer));
assert(JSON.stringify(compact).length<JSON.stringify(body).length/2,'compact facts must not copy both Native aliases in full');
for(const role of ['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_final_review']){
  const assignment={role,inputs:role==='roster_workflow_final_review'?{review:{value:{domainId:'combat_and_losses'}}}:{}};
  const inputs=await lineageModule.projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
  assert.deepEqual(inputs.decisionEvidenceDirectory.value,directory,role+' must receive the same current source directory');
  assert(!assignment.inputs.decisionEvidenceDirectory,'do not mutate a saved assignment');
}
const atomic={role:'roster_workflow_final_review',inputs:{review:{value:{experimentalSourceReviewVersion:3}}}};
assert.deepEqual(await lineageModule.projectRosterWorkflowRoleSourceInputsV1({assignment:atomic,state,readArtifact:get}),atomic.inputs,'do not broaden atomic source review');
const before=writes;assert.deepEqual(await lineageModule.publishRosterWorkflowDecisionEvidenceDirectoryV1({workflow,store:{get}}),directory);
assert.equal(writes,before,'cold reuse must not republish or renumber immutable facts');
for(const e of source.evidence)assert(isDeepStrictEqual(state.evidence.find(x=>x.id===e.id),e));
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:true,originalCharacters:JSON.stringify(body).length,compactCharacters:JSON.stringify(compact).length,
  sourceCount:directory.entries.length,compactSources:directory.entries.filter(e=>e.sourceFactsRead).length,roles:4,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
