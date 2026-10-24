// Actual95-97 guessed 531 from an artifact hash: the referenced source was
// available but absent from the scoped numeric directory (entries=[]).
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.failure?.code==='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED');
assert.ok(work);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const assignment=await get(work.inputRef),before=structuredClone(assignment);
const id=assignment.inputs.task.value.failure.queryRepair.sourceEvidenceId;
const target=assignment.evidenceDirectory.findIndex(e=>e.id===id)+1;
assert.ok(target>0);
let request;const stop=Error('capture-only');
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'captured',store:{get,put:async()=> 'memory-only'},
  deliberation:{deliberate:async()=>{throw Error('no model');}},onRequest:async value=>{request=value;throw stop;}});
await assert.rejects(()=>execute(assignment,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},checkpointOperation:async()=>{}}),e=>e===stop);
const directory=request.promptNodes.find(n=>n.kind==='available_evidence_directory').entries;
assert.ok(directory.some(e=>e.number===target),'assigned failure source must be visible by its real number');
assert.ok(directory.length<assignment.evidenceDirectory.length,'do not reinject full history');
const references=request.promptNodes.find(n=>n.kind==='assigned_evidence_references');
assert.ok(references.entries.some(e=>e.evidenceId===id&&e.evidenceNumber===target));
assert.deepEqual(assignment,before);
console.log(JSON.stringify({pass:true,actualAssignedSourceNumber:target,scopedDirectorySize:directory.length,fullDirectorySize:assignment.evidenceDirectory.length,providerCalls:0,productionWrites:0}));
