// Minimise the live multi-minute joint query on its ACTUAL 2000-point source.
// Instrument this module's hash/clone costs in memory; all Native solvers and
// geometry evaluators remain the real imports. No source/room/Provider writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const sourcePath=path.join(path.resolve(process.argv[2]),'workspace/laboratory-sources/04672fe69f4b31b844857005e38feb7101eeddb02ba6945cc05c4230589e99a9.json.gz');
const state=JSON.parse(gunzipSync(await fs.readFile(sourcePath)).toString('utf8')).authority.state;
assert.ok(state.pieces.some(piece=>piece.id==='player1-medic-1'));
const before=hash(state);
function freeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return;Object.freeze(value);for(const child of Object.values(value))freeze(child);}
freeze(state);
const filename=path.resolve('packages/online-agent-session/static-formation-query-v1.mjs');
let source=await fs.readFile(filename,'utf8');
source=source.replace(/from ['"]([^'"]+)['"]/g,(whole,specifier)=>
  'from '+JSON.stringify(specifier.startsWith('.')?pathToFileURL(path.resolve(path.dirname(filename),specifier)).href:specifier));
source=source.replace('hashStarcraftTmgContract as hash','hashStarcraftTmgContract as originalHash');
source+=`\nexport {profile as staticCostProfile};\n`;
source=`
const profile={stateHashCalls:0,stateHashMs:0,fullStateCloneCalls:0,fullStateCloneMs:0};
const hash=value=>{const root=Array.isArray(value?.pieces),start=performance.now();try{return originalHash(value);}finally{if(root){profile.stateHashCalls++;profile.stateHashMs+=performance.now()-start;}}};
const structuredClone=value=>{const root=Array.isArray(value?.pieces),start=performance.now();try{return globalThis.structuredClone(value);}finally{if(root){profile.fullStateCloneCalls++;profile.fullStateCloneMs+=performance.now()-start;}}};
`+source;
const instrumented=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const args={unitId:'player1-goliath-1',anchors:[
  {xInches:-4,yInches:-4},{xInches:8,yInches:28},{xInches:10,yInches:28},
  {xInches:12,yInches:24},{xInches:16,yInches:28}],
  jointUnits:[{unitId:'player1-medic-1',anchors:[{xInches:40,yInches:28},{xInches:42,yInches:24}]}],
  maximumJointOptions:2,maximumJointEvaluations:16};
const started=performance.now();
const result=instrumented.queryStarcraftTmgStaticFormationV1({state,arguments:args});
const report={passed:instrumented.staticCostProfile.stateHashCalls===1,
  case:'actual_frozen_2000_army_bounded_joint_query',elapsedMs:performance.now()-started,
  resultHash:hash(result),stateBytes:Buffer.byteLength(JSON.stringify(state)),
  optionCount:result.optionCount,evaluations:result.search.evaluations,
  costs:instrumented.staticCostProfile,providerCalls:0,productionWrites:0,
  fullProductionQuerySpeedupProven:false};
console.log(JSON.stringify(report));
assert.ok(result.optionCount>0,'the minimised case must include successful placement and final group checks');
assert.equal(hash(state),before,'frozen Native input must not change');
assert.equal(instrumented.staticCostProfile.stateHashCalls,1,'inner anchor probes must not hash the complete 11.7MB state for unused metadata');
assert.equal(instrumented.staticCostProfile.fullStateCloneCalls,0,'only changed piece/model objects need private copies; source bundles remain readonly');
if(process.argv[3])assert.equal(report.resultHash,process.argv[3],
  'the COMPLETE Native output (placements/misses/order/search/geometry hashes) must equal the saved pre-change output');
