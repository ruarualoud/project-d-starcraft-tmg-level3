import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {inspectRosterTeachReaderCitationsV1 as inspect} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createRosterTeachSynthesisArchiveV1 as archiveFor,createRosterTeachSynthesisReaderStateV1 as stateFor,
  applyRosterTeachSynthesisReaderCommandV1 as apply,projectRosterTeachSynthesisReaderV1 as project,
  rosterTeachSynthesisStepKindV1 as stepKind} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const paid=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-313.reply.json.gz')));
const {schemaVersion,roundKind,...command}=paid.output;
const saved=formal.teachFramework.state.synthesisReader;
const id='generation-b61ea531987c3cad92d258a91d336c10';
const before=structuredClone(saved.answers.find(a=>a.questionId===id));
assert.equal(before.quantitativeEvidence.length,4);
assert.equal(command.citationPatches[0].quantitativeEvidence.length,0);
const archive=archiveFor([{kind:'question_evidence_reconciliation',questions:[{questionId:id,originalQuestion:{questionId:id},evidence:[]}]}]);
const state=stateFor(archive);state.answers=[structuredClone(before)];
state.citationFeedback=structuredClone(saved.citationFeedback);
apply(archive,state,command);
assert.deepEqual(state.answers[0],before,'Reference-only repair must not discard valid numeric evidence or replace its argument');
assert.deepEqual(state.legacyCitationPatchDrafts.at(-1).command,command);
const workspace=project(archive,state)[0];
assert.equal(stepKind(workspace),'teach_framework_citation_delta');
assert.equal(stepKind(workspace,'teach_framework_citation_patch'),'teach_framework_citation_patch');
assert.equal(workspace.citationRepairTargets.length,2);
const edits=workspace.citationRepairTargets.map(slot=>({repairSlotId:slot.repairSlotId,
  receiptRef:slot.original.receiptRef,path:`fireExchangeEvidence.0.${slot.original.path}`}));
const delta={action:'repair_citations',reads:[],answers:[],proposedPlanChanges:[],proposedRosterChanges:[],
  frameworkFeedback:[],publicReason:'Correct the two exact saved paths only.',citationEdits:edits};
assert.throws(()=>apply(archive,state,{...delta,citationEdits:[{...edits[0],repairSlotId:'unrelated-slot'}]}));
assert.throws(()=>apply(archive,state,{...delta,citationEdits:[edits[0],edits[0]]}));
apply(archive,state,delta);
assert.deepEqual(state.answers[0].quantitativeEvidence,before.quantitativeEvidence);
assert.equal(state.answers[0].publicReason,before.publicReason);
assert.equal(state.answers[0].qualitativeEvidence[0].interpretation,before.qualitativeEvidence[0].interpretation);
const tf=formal.teachFramework;
const feedback=inspect({answers:state.answers,evidence:[...tf.state.evidence,...tf.state.investigation.evidence],sourceEvidence:[tf.context]});
assert.equal(feedback.correctableFailures.length,0);
console.log(JSON.stringify({pass:true,actualPaidReply:313,validNumericCitationsPreserved:4,
  onlyTwoFailedSlotsChanged:true,semanticApproval:false,providerCalls:0,nativeCalls:0,originalWrites:0}));
