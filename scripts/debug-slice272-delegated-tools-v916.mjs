// Actual B input-repair advertised candidate_context although its compiler
// permission only allowed inspect/spatial/scenario. Test the REAL role prompt
// assembly with an injected capture, not a paid retry or a production write.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import * as proof from '../packages/roster-strategist/roster-tool-proof-scope-v1.mjs';

const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const get=async ref=>JSON.parse(await fs.readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const state=JSON.parse(await fs.readFile(new URL('workflow.json',root),'utf8'));
  const assignment=await get('0d8b1d031ac05c7fdcd59d47113b742d627b3b45d8c1f5cc629acffaa3aacb95');
  const oldRequest=await get('fb75bac8aa0885f1ec17f8068a4aa5ed5042f54519c7d1d2bbf58af534a3d266');
  const oldReply=await get('22496d6101348a450884ae7a3e0fa5e6dad044fcdd2c6c80be1f54887d40ed3f');
  const contract=rosterWorkflowChoiceContractV1({state,workId:assignment.workId});
  assert.deepEqual(contract.allowedOperations,['inspect','spatial','scenario']);
  assert(oldRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.tools.value.operations.some(o=>o.operation==='candidate_context'));
  assert(oldReply.output.workOrders[0].steps.some(s=>s.operation==='candidate_context'));
  const original=JSON.stringify(assignment),originalState=JSON.stringify(state),memory=new Map();
  const store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
  let captured=null,captures=0;const capture=Error('v916-captured-before-provider');
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v916-offline-capture',
    deliberation:{async deliberate(request){captures++;captured=request;throw capture;}}});
  try{await execute(structuredClone(assignment),{checkpointOperation:async()=>{},
    readEvidence:async()=>assert.fail('fixture should not need a new source read'),
    publishContext:async()=>assert.fail('fixture should not publish a production context')});}
  catch(error){if(error!==capture)throw error;}
  assert.equal(captures,1);
  const delivered=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.tools.value;
  assert.deepEqual(delivered.operations.map(o=>o.operation),contract.allowedOperations,
    'delegated role still advertises operations its compiler forbids');
  assert.equal(delivered.delegation.targetWorkId,contract.targetWorkId);
  assert(delivered.deferredOperations.some(o=>o.operation==='candidate_context'&&o.localExecutable===false));
  assert.deepEqual(captured.promptNodes.find(n=>n.kind==='pending_operation_choice_contract').allowedOperations,contract.allowedOperations);
  assert.equal(JSON.stringify(assignment),original);assert.equal(JSON.stringify(state),originalState);
  report.checks.push('actual role assembly exposes only compiler-derived permitted operations; nonlocal capability remains discoverable but not callable');
  const full=assignment.inputs.tools.value;
  const directory=proof.rosterToolContractDirectoryV1(full,{evidenceId:'immutable-tools',evidenceNumber:7});
  for(const descriptor of [full,directory]){
    const before=JSON.stringify(descriptor);
    const projected=proof.projectRosterDelegatedToolPresentationV1(descriptor,contract);
    assert.deepEqual(projected.operations.map(o=>o.operation),contract.allowedOperations);
    const spatial=projected.operations.find(o=>o.operation==='spatial');
    const kinds=spatial.queries?.map(q=>q.queryKind)??Object.keys(spatial.queryContracts??{});
    assert.deepEqual(kinds,contract.preliminarySpatialQueryKinds);
    const originalScenario=descriptor.operations.find(o=>o.operation==='scenario');
    assert.deepEqual(projected.operations.find(o=>o.operation==='scenario'),originalScenario);
    assert.equal(JSON.stringify(descriptor),before);
    assert.deepEqual(proof.projectRosterDelegatedToolPresentationV1(projected,contract),projected);
    assert.equal(proof.projectRosterDelegatedToolPresentationV1(descriptor,null),descriptor);
  }
  report.checks.push('full and directory paths share the same scoped projection; exact retained schemas/pointers, no source mutation; parent remains unrestricted');
  assert.throws(()=>compileRosterWorkflowExperimentV1({order:oldReply.output.workOrders[0],scope:assignment.scope,
    namespace:'v916-denied-order',evidenceDirectory:assignment.evidenceDirectory,choiceContract:contract}),
    /ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED/);
  const delegatedSpatial={...contract,operation:'spatial',allowedOperations:['spatial']};
  assert.deepEqual(proof.projectRosterDelegatedToolPresentationV1(full,delegatedSpatial).operations[0],
    full.operations.find(o=>o.operation==='spatial'));
  report.checks.push('real rejected proposal is still rejected; target spatial capability not accidentally narrowed; no permission expansion or result approval');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await fs.writeFile(new URL(`../build/slice272-delegated-tools-v916-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
