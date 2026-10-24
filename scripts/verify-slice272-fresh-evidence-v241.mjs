// Regression for the actual v240 failures; saved inputs only, no Provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {test} from 'node:test';
import {runRosterTeachCycleV1,verifyRosterTeachCycleV1} from '../packages/roster-strategist/roster-teach-cycle-v1.mjs';
import {createIterativeRosterFlashModelPortV1} from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=process.argv[2];assert.ok(base);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const request=async(arm,n)=>JSON.parse(gunzipSync(await fs.readFile(`${base}/${arm}/fresh-generation-v240/request-${n}.private.json.gz`)));
test('A: actual repeated source receipts retain all challenge bindings without failing the cycle',async()=>{
  const dir=base+'/A/fresh-generation-v240/workspace/drafts';
  const draft=await read(dir+'/'+(await fs.readdir(dir))[0]);
  const req=await request('A','006');
  const source=req.promptNodes.find(n=>n.sourceHashes);
  const foundation=req.promptNodes.find(n=>n.foundation).foundation;
  const delivered=req.promptNodes.find(n=>n.evidenceReceipts);
  const challenges=draft.publicOutputs.filter(o=>o.roundKind==='teach_challenge');
  const student=draft.publicOutputs.find(o=>o.roundKind==='teach_revision').sanitizedOutput;
  let c=0,e=0;
  const cycle=await runRosterTeachCycleV1({initialFoundation:foundation,
    sourceHashes:source.sourceHashes,sourceContext:source.sourceContext,
    challengerPort:{challenge:async()=>challenges[c++].sanitizedOutput},
    studentPort:{revise:async()=>student},
    evidencePort:{descriptor:()=>({readOnly:true}),query:async q=>{
      const receipt=delivered.evidenceReceipts[e++];assert.equal(receipt.challengeId,q.challengeId);return receipt;
    }}});
  assert.equal(e,delivered.evidenceReceipts.length);
  assert.equal(cycle.evidenceReceipts.length,e);
  assert.equal(verifyRosterTeachCycleV1(cycle),true);
  const conflict=structuredClone(cycle);
  const duplicate=conflict.evidenceReceipts.find((r,i,a)=>a.slice(0,i).some(x=>x.sourceReceiptHash===r.sourceReceiptHash));
  duplicate.sourceReceipt={...duplicate.sourceReceipt,forgedValue:true};
  delete conflict.cycleHash;conflict.cycleHash=hash(conflict);
  assert.throws(()=>verifyRosterTeachCycleV1(conflict),/ROSTER_TEACH_EVIDENCE_SOURCE_CONFLICT/);
  console.log(JSON.stringify({A:{receipts:e,uniqueSources:new Set(cycle.evidenceReceipts.map(r=>r.sourceReceiptHash)).size}}));
});
test('B: actual context remains lossless while repeated bodies are sent once and rejected slots are explained',async()=>{
  const req=await request('B','008');const old=req.promptNodes[0].content;
  const stored=new Map();
  const dir=base+'/B/fresh-generation-v240/workspace/iterative-draft/replies';
  for(const name of await fs.readdir(dir)){const rec=await read(dir+'/'+name);stored.set(rec.id,rec.value);}
  let captured;
  const port=createIterativeRosterFlashModelPortV1({
    skillGuidance:old.skillGuidance,missionEvidence:old.missionEvidence,
    replyStore:{loadRetainedReply:async key=>stored.get(key),retainReply:async(key,value)=>stored.set(key,value)},
    deliberationFactory:{createForRun:async()=>({deliberate:async req=>{captured=req;throw Error('CAPTURE_ONLY');}})}});
  await assert.rejects(port.decide({requestKey:'legacy-capture-only',state:old.decisionState}),/CAPTURE_ONLY/);
  assert.deepEqual(captured.promptNodes[0].content,old,'paid v7 context must be unchanged');
  await assert.rejects(port.decide({requestKey:'new-capture-only',state:{...old.decisionState,modelContextVersion:9}}),/CAPTURE_ONLY/);
  const next=captured.promptNodes[0].content;
  assert.ok(next.decisionState.observationReceipts,'repeated receipt bodies must be interned');
  const restored=next.decisionState.observations.map(({receiptRef,...entry})=>({...entry,receipt:next.decisionState.observationReceipts[receiptRef]}));
  assert.deepEqual(restored,old.decisionState.observations,'every query, result, value and request remains present');
  assert.equal(Object.keys(next.decisionState.observationReceipts).length,4);
  assert.equal(next.lastRejectedProposal.officialBuilderRejection.rulesErrorCode,'ARMY_SLOT_CAPACITY_EXCEEDED');
  assert.ok(next.lastRejectedProposal.slotProjection.overflow.Core>0);
  assert.ok(JSON.stringify(next).length<JSON.stringify(old).length*0.4);
  console.log(JSON.stringify({B:{oldBytes:Buffer.byteLength(JSON.stringify(old)),newBytes:Buffer.byteLength(JSON.stringify(next)),observations:restored.length,uniqueReceipts:4,slotProjection:next.lastRejectedProposal.slotProjection}}));
});
