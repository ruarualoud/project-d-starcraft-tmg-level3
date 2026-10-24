import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {projectRosterTeachPromptEvidenceV1 as view} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createRosterTeachSynthesisArchiveV1 as archiveFor,createRosterTeachSynthesisReaderStateV1 as stateFor,
  applyRosterTeachSynthesisReaderCommandV1 as apply,projectRosterTeachSynthesisReaderV1 as project} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8')),tf=formal.teachFramework;
const paid=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-314.reply.json.gz')));
const {schemaVersion,roundKind,...command}=paid.output;
const id='generation-b61ea531987c3cad92d258a91d336c10';
const originals=new Map();
const nodes=view([{kind:'question_evidence_reconciliation',questions:[{questionId:id,originalQuestion:{questionId:id},
  evidence:[...tf.state.evidence,...tf.state.investigation.evidence].filter(e=>(e.questionId||e.challengeId)===id)}]}],originals);
const archive=archiveFor(nodes,{retainedEvidence:originals}),state=stateFor(archive);
state.answers=[structuredClone(tf.state.synthesisReader.answers.find(a=>a.questionId===id))];
state.citationFeedback=structuredClone(tf.state.synthesisReader.citationFeedback);
const before=JSON.stringify(state.answers);
assert.throws(()=>apply(archive,state,command),e=>e.code==='ROSTER_TEACH_CITATION_REPAIR_FIELD_SUBSTITUTION',
  'A path-only repair cannot replace an available exact named field with unrelated generic metadata');
assert.equal(JSON.stringify(state.answers),before);
const slots=project(archive,state)[0].citationRepairTargets;
assert.equal(slots.length,2);
assert(slots.every(s=>s.exactFieldCandidates.length>0));
const valid={...command,citationEdits:slots.map(s=>({repairSlotId:s.repairSlotId,
  receiptRef:s.original.receiptRef,path:s.exactFieldCandidates[0].path}))};
apply(archive,state,valid);
assert.equal(state.answers[0].quantitativeEvidence.length,4);
assert(state.answers[0].qualitativeEvidence[0].path.endsWith('/comparisonPolicy/opponentReturnFire'));
assert(state.answers[0].qualitativeEvidence[1].path.endsWith('/conditionalScenarioNotPrediction'));
console.log(JSON.stringify({pass:true,actualPaidReply:314,genericFieldSubstitutionRejected:true,
  exactSameReceiptNavigation:true,argumentsUnchanged:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
