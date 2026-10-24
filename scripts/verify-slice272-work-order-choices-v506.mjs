// Recheck the actual rejected v505 reply, then the replacement host-ID contract.
// No fuzzy correction of saved answers or extra Provider dispatches.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildRosterTeachRevisionWorkOrderV1,projectRosterTeachRevisionChoicesV2,
  decodeRosterTeachRevisionChoicesV2,prepareRosterTeachRevisionWorkOrderV1}
  from '../packages/roster-strategist/roster-teach-revision-work-order-v1.mjs';
import {rosterTeachFrameworkContractV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const dir=process.argv[2];
const request=JSON.parse(await fs.readFile(`${dir}/1.request.json`,'utf8')).request.promptNodes[0];
const reply=JSON.parse(await fs.readFile(`${dir}/1.reply.json`,'utf8')).output;
let oldError;try{buildRosterTeachRevisionWorkOrderV1(request,reply);}catch(e){oldError=e;}
assert.equal(oldError.code,'ROSTER_TEACH_WORK_ORDER_SCOPE_INVALID');
assert.deepEqual(oldError.detail.invalidPaths,['componentPurposes.goliath-1.publicPurposeText','componentPurposes.medic-1.publicPurposeText']);
const choice=projectRosterTeachRevisionChoicesV2(request);
assert.equal(choice.claims.length,77);
const component=choice.claims.find(c=>c.path==='componentPurposes.goliath-1');
assert.equal(component.text,request.claimTexts[component.path].publicPurposeText);
const output={schemaVersion:'starcraft_tmg_teach_framework_generation_v1',roundKind:'teach_framework_revision_work_choices',
  publicReason:'Contract-only fixture, not a model decision.',questionWork:choice.questions.map(q=>({questionNumber:q.number,
    route:q.unresolved?'investigate':'keep',claimNumbers:choice.claims.map(c=>c.number),publicReason:'Test exact host-bound identifiers.'}))};
const contract=rosterTeachFrameworkContractV1(output.roundKind);
assert.equal(validate(contract.providerSchema,output).ok,true);
const decoded=decodeRosterTeachRevisionChoicesV2(request,output);
assert.deepEqual(decoded.questionWork[0].claimPaths,Object.keys(request.claimTexts));
assert.deepEqual(decoded.questionWork.map(q=>q.questionId),request.questions.map(q=>q.questionId));
const order=buildRosterTeachRevisionWorkOrderV1(request,decoded);
assert.deepEqual(order.unresolvedQuestionIds,request.questions.filter(q=>q.unresolved).map(q=>q.questionId));
assert.equal(order.acceptanceGranted,false);
assert.throws(()=>decodeRosterTeachRevisionChoicesV2(request,{...output,questionWork:[{...output.questionWork[0],claimNumbers:[78]}]}),
  e=>e.code==='ROSTER_TEACH_WORK_ORDER_CHOICE_INVALID'&&e.detail.number===78&&e.detail.validNumbers.maximum===77);
const system=projectRosterProviderInstructionsV1({request:{roundKind:output.roundKind},runKind:'teach-framework'});
assert(system.includes('revision work coordinator')&&!system.includes('Keep the supplied candidate unchanged'));
// Same Plan with changed evidence synthesis must not reuse an older work order.
const minimalPlan={planHash:'same-plan',componentPurposes:[]};
const state={agenda:{questions:[]},synthesis:{answers:[]}};
const initial=prepareRosterTeachRevisionWorkOrderV1({plan:minimalPlan,state,rosterEditAuthority:'preset_immutable'});
const done=buildRosterTeachRevisionWorkOrderV1(initial,{publicReason:'Nothing pending',questionWork:[]});
assert.equal(prepareRosterTeachRevisionWorkOrderV1({plan:minimalPlan,state:{...state,revisionWorkOrder:done},rosterEditAuthority:'preset_immutable'}),null);
assert.notEqual(prepareRosterTeachRevisionWorkOrderV1({plan:minimalPlan,state:{...state,revisionWorkOrder:done,
  synthesis:{answers:[],publicReason:'New evidence'}},rosterEditAuthority:'preset_immutable'}),null);
console.log(JSON.stringify({pass:true,actualRejectedPaths:oldError.detail.invalidPaths,all77PathsExactlyAddressable:true,
  questionCount:choice.questions.length,unknownsPreserved:true,changedEvidenceInvalidatesWorkOrder:true,providerCalls:0,nativeCalls:0}));
