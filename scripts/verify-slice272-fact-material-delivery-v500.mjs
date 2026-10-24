// Concrete regression: actual396 repeats >1MB of frozen/advisory material to
// select one Native successor. Exercise the product role projection and reader,
// including reconstruction in a new archive; never call a Provider or Native.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { isolateRosterTeachFactProbeNodesV1 } from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
import { projectRosterTeachPromptEvidenceV1, readRosterTeachRetainedEvidenceV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const request=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2])).toString());
const byKind=kind=>request.promptNodes.find(node=>node.kind===kind);
const source=byKind('fact_probe_source_material').context;
const current=byKind('fact_probe_tool_executions').currentBatchEvidence;
const handoff=byKind('active_experiment_handoff');
const before=hash({source,current});
const original=[
  {kind:'frozen_plan_and_method',context:source,plan:{planHash:source.sourceFacts.planHash},framework:{}},
  {kind:'current_investigation_assignment',pendingQuestionIds:byKind('fact_probe_assignment').pendingQuestionIds},
  {kind:'questions_and_results',agenda:{questions:byKind('fact_probe_questions').questions},evidence:[],
    investigation:{completedRoundCount:1,latestCompletedQueryIds:current.map(r=>r.challengeId??r.queryId),
      latestCompletedBatch:{publicReason:handoff.previousPublicReason,queries:handoff.selectedQueries},
      evidence:current,operations:handoff.selectedQueries.map(q=>({questionId:q.questionId,queryId:q.queryId,
        request:{kind:q.kind,toolRequest:JSON.parse(q.toolRequestJson)}}))}},
  byKind('canonical_current_query_context'),byKind('current_query_capability_guide'),
];
function project(){const archive=new Map();const nodes=isolateRosterTeachFactProbeNodesV1(original,archive);
  return {archive,nodes,sourceNode:nodes.find(n=>n.kind==='fact_probe_source_material')};}
const first=project(),second=project();
const newSize=JSON.stringify(first.sourceNode).length,oldSize=JSON.stringify(byKind('fact_probe_source_material')).length;
const checks=[];
function check(name,fn){try{fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message.slice(0,400)});}}
check('actual396 bulky source/advice is queryable rather than inlined',()=>{
  assert.ok(newSize<oldSize/2,`source delivery ${newSize} chars, original ${oldSize}; bulk material remains inline`);
  assert.equal(first.sourceNode.delivery,'role_scoped_material_library_v1');
});
let restored=0;
function collect(v,rows=[]){if(v&&typeof v==='object'){
  if(v.kind==='roster_fact_material_reference_v1')rows.push(v);
  else for(const child of Object.values(v))collect(child,rows);
}return rows;}
const references=collect(first.sourceNode);
check('every displaced original has exact fresh/restarted read access',()=>{
  assert.ok(references.length>0,'no library references');
  for(const ref of references){
    const raw=first.archive.get(ref.evidenceObjectHash);
    assert.ok(raw!==undefined);assert.equal(hash(raw),ref.evidenceObjectHash);
    assert.equal(hash(second.archive.get(ref.evidenceObjectHash)),ref.evidenceObjectHash);
    const leaf=(v,path=[])=>{
      if(v&&typeof v==='object')for(const[k,c]of Object.entries(v))leaf(c,[...path,k]);
      else {const pointer=path.length?'/'+path.map(s=>s.replaceAll('~','~0').replaceAll('/','~1')).join('/'):'';
        const args={receiptHash:ref.evidenceObjectHash,path:pointer};
        assert.deepEqual(readRosterTeachRetainedEvidenceV1([],args,first.archive).value,v);
        assert.deepEqual(readRosterTeachRetainedEvidenceV1([],args,second.archive).value,v);restored++;}
    };leaf(raw);
  }
});
check('current receipt, experiment intent, question and menus unchanged',()=>{
  assert.deepEqual(first.nodes.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence,current);
  assert.deepEqual(first.nodes.find(n=>n.kind==='fact_probe_questions').questions,byKind('fact_probe_questions').questions);
  assert.deepEqual(first.nodes.find(n=>n.kind==='canonical_current_query_context'),byKind('canonical_current_query_context'));
  assert.deepEqual(first.nodes.find(n=>n.kind==='active_experiment_handoff').selectedQueries,handoff.selectedQueries);
  assert.equal(first.sourceNode.context.rosterEditAuthority,source.rosterEditAuthority);
  assert.deepEqual(first.sourceNode.context.mission,source.mission);
  assert.deepEqual(first.sourceNode.context.sourceFacts.roundSupplySchedule,source.sourceFacts.roundSupplySchedule);
  assert.equal(hash({source,current}),before);
});
check('generic prompt projection cannot hide current results or library navigation',()=>{
  const projected=projectRosterTeachPromptEvidenceV1(first.nodes,first.archive);
  assert.deepEqual(projected.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence,current);
  assert.deepEqual(projected.find(n=>n.kind==='fact_probe_source_material'),first.sourceNode);
});
console.log(JSON.stringify({checks,oldSourceCharacters:oldSize,newSourceCharacters:newSize,
  archivedMaterials:references.length,exactLeafReadsAcrossTwoArchives:restored*2,
  providerCalls:0,nativeExecutions:0,originalSourceUnchanged:hash({source,current})===before},null,2));
assert.ok(checks.every(c=>c.ok),'fact material delivery regression');
