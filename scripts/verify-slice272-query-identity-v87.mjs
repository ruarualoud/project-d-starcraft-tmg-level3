// Actual A6 repeats query IDs across investigation rounds. Those are transport
// handles, not tactical choices. Stop at the new-round checkpoint before queries.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json','utf8'));
const source=d.teachFramework.state;
const captured=d.publicOutputs.filter(o=>o.roundKind==='teach_framework_investigate').at(-1).sanitizedOutput;
assert(captured.queries.some(q=>source.investigation.operations.some(o=>o.queryId===q.queryId)));
const board=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const realLab=createPregameSceneLaboratoryV1({sourceState:board,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(board.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){throw Error('no enumeration');},
    instantiate(){throw Error('no action');},apply(){throw Error('no mutation');}}});
const laboratory={...realLab,describeQueryContext:()=>({}),
  runScenarioBranch(){throw Error('PREGAME_LAB_BRANCH_SPEC_INVALID:identity-only checkpoint fixture');}};
const state={framework:source.framework,agenda:source.agenda,evidence:source.evidence,
  investigation:{...source.investigation,rounds:source.investigation.rounds.slice(0,1),completed:false}};
const oldIds=new Set(state.investigation.operations.map(o=>o.queryId));
let saved,reads=0;
const stop=Error('NEW_ROUND_CAPTURED');
try{await runRosterTeachFrameworkSessionV1({sessionId:'actual-A-query-identity',plan:JSON.parse(d.planSerialized),
  context:{},state,laboratory,deliberation:{async deliberate(){reads++;return {output:structuredClone(captured)};}},
  onCheckpoint:async value=>{if(value.investigation?.rounds.length===2){saved=structuredClone(value.investigation.rounds[1]);throw stop;}}});
}catch(e){if(e!==stop)throw e;}
assert(saved,'valid captured queries must reach checkpoint without repurchasing an ID repair');
assert.equal(reads,1);
assert.equal(new Set(saved.output.queries.map(q=>q.queryId)).size,captured.queries.length);
for(const [i,q] of saved.output.queries.entries()){
  assert(!oldIds.has(q.queryId));
  assert.equal(q.questionId,captured.queries[i].questionId);
  assert.equal(q.toolRequestJson,captured.queries[i].toolRequestJson);
  assert(saved.queryIdBindings.some(b=>b.modelQueryId===captured.queries[i].queryId&&b.queryId===q.queryId));
}
assert(realLab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({status:'PASS',capturedQueries:captured.queries.length,retainedReplyReads:reads,
  providerCalls:0,roomActions:0,queryArgumentsPreserved:true,sourceUnchanged:true}));
