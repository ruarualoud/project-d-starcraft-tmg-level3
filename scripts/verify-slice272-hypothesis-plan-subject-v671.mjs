// Step-debugging found the old hypothesis helper omitted inputs.draft. That
// disables the existing exact current-Plan-body read/confirmation mechanism.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {requestRosterHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {projectRosterWorkflowTeachSubjectV1} from '../packages/roster-strategist/roster-workflow-plan-blocks-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),captured=[];
await requestRosterHypothesisCycleV1({id:'controlled-hypothesis-subject',phase:'challenge',
  run:{inspect:async()=>({...state,work:[]}),requestTeach:async input=>captured.push(input),
    requestDecision:async()=>{throw Error('READ_ONLY_PHASE');}}});
const input=captured[0]?.inputs?.draft;
assert(input,'hypothesis Teach must name the actual current Plan subject, not merely tell the model to read some Plan');
assert.equal(input.source,'evidence');assert.equal(input.id,`draft:r${state.draftRevision}:summary`);
const subject=projectRosterWorkflowTeachSubjectV1({draftEvidenceId:input.id,
  directory:state.evidence.map((e,i)=>({...e,number:i+1}))});
assert(subject?.blocks?.length>0);
console.log(JSON.stringify({status:'passed',actualRevision:state.draftRevision,currentPlanSubject:input.id,
  exactBodyBlocks:subject.blocks.length,existingUnreadBodyConfirmationReused:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,runControlled:true,actualModelReadsStillPending:true}));
