// Actual paid B seven-of-eight reply: exercise the real Teach consumer across
// a failed run and resume, plus migration of the already-saved legacy reply.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {runRosterTeachFrameworkSessionV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const actual=d.publicOutputs.filter(o=>o.roundKind==='teach_framework_synthesis').at(-1).sanitizedOutput;
const agenda=d.teachFramework.state.agenda;
const expected=agenda.questions.map(q=>q.questionId);
const missing=expected.filter(id=>!actual.answers.some(a=>a.questionId===id));
assert.equal(missing.length,1,'captured B omission required');
const board=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const realLab=createPregameSceneLaboratoryV1({sourceState:board,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(board.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){throw Error('no enumeration');},
    instantiate(){throw Error('no action');},apply(){throw Error('no mutation');}}});
const lab={...realLab,describeQueryContext:()=>({}),runScenarioBranch(){throw Error('no completed query replay');}};
const fixture=()=>({framework:d.teachFramework.state.framework,
  agenda:{...agenda,questions:agenda.questions.map(q=>({...q,evidenceRequest:{kind:'math',toolRequest:{mathKind:'integer_sum',inputs:{values:[]}}}}))},
  evidence:expected.map(challengeId=>({challengeId,status:'unknown',unknownReasonCode:'test_unresolved'})),
  investigation:{completed:true,rounds:[],evidence:[],operations:[]},
  repairs:structuredClone(d.teachFramework.state.repairs)});
assert(fixture().repairs.filter(r=>r.kind==='teach_framework_synthesis').length>=3);
const plan=JSON.parse(d.planSerialized);
let checkpoint,firstRequest,calls=0;
const run=(state,deliberate,retainedPublicOutputs=[])=>runRosterTeachFrameworkSessionV1({sessionId:'actual-B-semantic-resume',
  context:{},plan,state,laboratory:lab,retainedPublicOutputs,
  onCheckpoint:async s=>{checkpoint=structuredClone(s);},deliberation:{deliberate}});
await assert.rejects(run(fixture(),async request=>{calls++;firstRequest=request;return {output:structuredClone(actual)};}),
  /ROSTER_TEACH_FRAMEWORK_ANSWERS_INCOMPLETE/);
assert.equal(calls,1,'exhausted phase may use one attempt, never a fresh three');
const paidFailureCheckpoint=structuredClone(checkpoint);
const repairAndAnswer=async request=>{
  calls++;
  const repair=request.promptNodes.find(n=>n.kind==='repair_completed_public_reply');
  assert(repair,'resume must deliver the concrete saved correction before another paid call');
  assert.deepEqual(JSON.parse(repair.detail).missingQuestionIds,missing);
  assert.deepEqual(repair.previousOutput,actual,'preserve all seven public answers');
  assert.notEqual(request.contextHash,firstRequest.contextHash,'must not replay the same invalid paid context');
  const fixed=structuredClone(actual);
  fixed.answers.push({questionId:missing[0],disposition:'unresolved',evidenceRefs:[],
    publicReason:'Scripted missing-answer repair, not strategic evidence.',tradeoff:'Unknown remains unknown.',
    replanTrigger:'Obtain scene evidence.',quantitativeEvidence:[]});
  return {output:fixed};
};
const output=await run(structuredClone(paidFailureCheckpoint),repairAndAnswer);
assert.equal(output.synthesis.answers.length,expected.length);
assert.deepEqual(output.synthesisRaw.answers.slice(0,actual.answers.length),actual.answers);
assert.deepEqual(output.repairs.slice(0,paidFailureCheckpoint.repairs.length),paidFailureCheckpoint.repairs);
// A pre-fix persisted failure has only error codes; reconstruct feedback from
// its exact matching retained paid output, without replaying/repurchasing it.
const legacy=structuredClone(paidFailureCheckpoint);delete legacy.replyCorrections;
const migrated=await run(legacy,repairAndAnswer,[{roundKind:'teach_framework_synthesis',contextHash:firstRequest.contextHash,sanitizedOutput:actual}]);
assert.equal(migrated.synthesis.answers.length,expected.length);
assert(migrated.replyCorrections.some(c=>c.recoveredFromRetainedOutput===true));
// A different evidence context must not inherit another context's correction.
let wrongContextCalls=0;
await assert.rejects(run(fixture(),async request=>{wrongContextCalls++;
  assert(!request.promptNodes.some(n=>n.kind==='repair_completed_public_reply'));
  throw Error('DIFFERENT_CONTEXT_PROBE_STOP');
},[{roundKind:'teach_framework_synthesis',contextHash:'f'.repeat(64),sanitizedOutput:actual}]),/DIFFERENT_CONTEXT_PROBE_STOP/);
assert.equal(wrongContextCalls,1);
assert(realLab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({status:'PASS',missing,persistedResume:true,legacyPaidReplyMigration:true,
  differentContextIsolated:true,originalSevenPreserved:true,scriptedReplies:calls,providerCalls:0,roomActions:0,productionDraftWrites:0}));
