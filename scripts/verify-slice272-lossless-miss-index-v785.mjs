// Concrete paid-input defect: a 996-miss result repeats 996 long JSON Pointers
// in every automatic view, despite every miss already having an array index.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectRosterStaticFormationResultDirectoryV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
const root=process.argv[2];
const raw=await fs.readFile(root+'/artifacts/bbe9f326c0f44f7af837b15a9cd692c433f0babed32cb500a33e9c797c32ca1d.json','utf8');
const result=JSON.parse(raw).value.receipt.queryReceipt.result;
const originalGroups=new Map();
for(const [index,miss] of result.misses.entries()){
  const reason=miss.reason??null,anchorRejectionReason=miss.diagnostic?.anchorRejection?.reason??null;
  const key=JSON.stringify([reason,anchorRejectionReason]);
  const group=originalGroups.get(key)??{reason,anchorRejectionReason,count:0,sources:[]};
  group.count++;group.sources.push({index,pointer:`/receipt/queryReceipt/result/misses/${index}`});originalGroups.set(key,group);
}
const projected=projectRosterStaticFormationResultDirectoryV1(result).searchOutcome;
assert.equal(projected.missCount,result.misses.length);
assert.equal(projected.misses.length,originalGroups.size);
for(const group of projected.misses){
  const original=originalGroups.get(JSON.stringify([group.reason,group.anchorRejectionReason]));
  assert.ok(Array.isArray(group.sourceIndexRanges),'compact index ranges must replace repeated per-miss pointers');
  const indices=group.sourceIndexRanges.flatMap(([start,end])=>Array.from({length:end-start+1},(_,i)=>start+i));
  assert.deepEqual(indices,original.sources.map(s=>s.index));
  assert.equal(group.count,indices.length);
  for(const index of indices)assert.equal(group.sourcePointerTemplate.replace('{index}',String(index)),original.sources.find(s=>s.index===index).pointer);
}
const before=JSON.stringify([...originalGroups.values()]).length,after=JSON.stringify(projected.misses).length;
assert.ok(after<before*0.5,{before,after});
assert.equal(await fs.readFile(root+'/artifacts/bbe9f326c0f44f7af837b15a9cd692c433f0babed32cb500a33e9c797c32ca1d.json','utf8'),raw);
console.log(JSON.stringify({pass:true,misses:result.misses.length,groups:projected.misses.length,beforeCharacters:before,
  afterCharacters:after,reduction:1-after/before,allIndicesAndPointersPreserved:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
