// Actual fixed Plan keeps declaring Entry Edge an unreadable image, although
// the frozen Native source contains the executable materialized geometry.
import fs from 'node:fs/promises';import path from 'node:path';import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createPregameMapEvidencePortV1} from '../packages/roster-strategist/pregame-map-evidence-port-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,compileRosterWorkflowExperimentV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/laboratory-sources/e53764ac557e7a1a25d8d346db53d9a6c9f97ace76e4eb00a627fbe22599dfba.json.gz');
const bytes=await fs.readFile(file),saved=JSON.parse(gunzipSync(bytes)),state=saved.authority.state;
const port=createPregameMapEvidencePortV1({sourceState:state});
assert(state.officialDeploymentGeometryBinding.geometryExecutionReady);
assert.equal(typeof port.deploymentGeometry,'function','the materialized source must be queryable, not hidden behind card imagery');
const scope=saved.scope,memory=new Map();const store={load:async()=>({scope,work:[],evidence:[]}),
  get:async ref=>memory.get(ref),put:async value=>{const ref='isolated-'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const laboratory={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),
  deploymentGeometry:port.deploymentGeometry,describeMapQueries:port.describeMapQueries};
const tool=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
assert(tool.descriptor().operations.some(o=>o.operation==='map_deployment'));
const order={orderId:'deployment-geometry',purpose:'Read exact frozen deployment geometry',scenarioAssumptions:[],
  experimentScope:{kind:'rules_resource_check',decisionQuestion:'Which entry edges and influence zones are bound to each side?',
    decisionImpact:'Replace an alleged missing image fact with the source-owned geometry; no route or strategy approval.',
    participantUnitIds:[],scenarioDescription:'Read frozen materialized binding only',stopPredicate:'Return the one geometry receipt',
    collectScenarioExperience:false,hypothesisTest:null},completionStepId:'read-geometry',
  steps:[{stepId:'read-geometry',operation:'map_deployment',argumentsJson:'{}',bindings:[],guards:[],publicReason:'Native frozen binding is already present'}],
  stopAndReturnToModelWhen:'After exact geometry or a concrete source gap'};
const jobs=compileRosterWorkflowExperimentV1({scope,namespace:'isolated-v662',order,evidenceDirectory:[]});
const result=await tool.execute({workId:jobs[0].id,scope,inputs:jobs[0].inputs},{checkpointOperation:async()=>{}});
assert.equal(result.kind,'tool_receipt');assert.equal(result.value.status,'completed');
const receipt=result.value.receipt;
assert.equal(receipt.resultStatus,'certified_deployment_geometry');
assert.deepEqual(receipt.deploymentGeometry,state.officialDeploymentGeometryBinding);
assert.equal(receipt.exactMoveOrDeploymentLegality,false);
assert.equal(receipt.mutatesRoomState,false);
const projection=projectRosterExperimentSourceFactsV1({evidence:{id:'isolated-v662',kind:'tool_receipt',artifactRef:'isolated'},value:result.value});
assert.deepEqual(projection.receiptStructures.deploymentGeometry.entryEdgesByPlayer,state.officialDeploymentGeometryBinding.entryEdgesByPlayer);
assert((await fs.readFile(file)).equals(bytes));
console.log(JSON.stringify({status:'passed',sameProductCompilerAndExecutor:true,bothSides:receipt.deploymentGeometry.participantIds,
  exactFrozenGeometry:true,repeatFactsRetainGeometry:true,nativeActions:0,providerCalls:0,productionWrites:0,
  sourceUnchanged:true,modelAdoptionStillPending:true}));
