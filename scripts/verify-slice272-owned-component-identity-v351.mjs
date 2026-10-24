import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { normalizeRosterComponentPurposeParentAliasV1 as normalize } from '../packages/roster-strategist/roster-component-purpose-parent-alias-v1.mjs';
const [directory,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const input=saved.lockedRoster.lock.candidateInput;
const runtime=await fs.readFile(new URL('../packages/roster-strategist/roster-strategist-runtime-v1.mjs',import.meta.url),'utf8');
const proposalStart=runtime.indexOf('      const proposal = freezeDeep({',runtime.indexOf('if (presetLock) {',runtime.indexOf('const meetsAgentCompletionTarget')));
const proposalEnd=runtime.indexOf('      const row = freezeDeep({',proposalStart);
assert.ok(proposalStart>=0&&proposalEnd>proposalStart);
const proposal=new Function('presetLock','sideKey','freezeDeep','clone',
  runtime.slice(proposalStart,proposalEnd)+'return proposal;')(saved.lockedRoster.lock,input.sideKey,Object.freeze,structuredClone);
const selected={proposal,candidate:saved.lockedRoster.lock.candidate,candidateInput:input};
const reply=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-064.reply.json.gz`)));
const output=reply.output, before=JSON.stringify(output);
const repaired=normalize({output,selected});
const index=output.componentPurposes.findIndex(p=>p.componentKind==='faction_card');
assert.equal(repaired.output.componentPurposes[index].instanceId,`${input.sideKey}-faction`,
  'Host-owned unique faction identity must not require another model strategy rewrite');
assert.equal(repaired.output.componentPurposes[index].publicPurposeText,output.componentPurposes[index].publicPurposeText);
assert.deepEqual(repaired.output.selectionJustification,output.selectionJustification);
assert.equal(JSON.stringify(output),before);
const conflict=structuredClone(output);conflict.componentPurposes[index].instanceId=input.units[0].unitInstanceId;
assert.equal(normalize({output:conflict,selected}).output.componentPurposes[index].instanceId,input.units[0].unitInstanceId);
const wrong=structuredClone(output);wrong.componentPurposes[index].recordKey='another-faction';
assert.equal(normalize({output:wrong,selected}).output.componentPurposes[index].instanceId,output.componentPurposes[index].instanceId);
const tactical=structuredClone(output);const ti=tactical.componentPurposes.findIndex(p=>p.componentKind==='tactical_card');
tactical.componentPurposes[ti].instanceId='model-guessed-card-id';
const duplicated={...selected,proposal:{...selected.proposal,tacticalCardRecordKeys:
  [...input.tacticalCardRecordKeys,tactical.componentPurposes[ti].recordKey]}};
assert.equal(normalize({output:tactical,selected:duplicated}).output.componentPurposes[ti].instanceId,'model-guessed-card-id');
assert.ok(repaired.receipt.moves.some(m=>m.fromInstanceId===output.componentPurposes[index].instanceId));
console.log(JSON.stringify({passed:true,checks:5,actualPaid064Reused:true,strategicTextUnchanged:true,
  existingComponentConflictAndAmbiguityNotGuessed:true,providerCalls:0,nativeActions:0}));
