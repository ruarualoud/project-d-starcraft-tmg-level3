import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {buildRosterReviewFactPacketV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=path.resolve(process.argv[2]);
const draft=JSON.parse(await readFile(path.join(base,'query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'),'utf8'));
const plan=JSON.parse(draft.planSerialized),audit=draft.working.verdict.audit;
const input={plan,armyAudit:audit,toolReceipts:draft.toolReceipts,
  selectedCandidateInputHash:hash(draft.selectedCandidateInput),
  selectionUnitRules:draft.teachFramework.context.sourceFacts.selectionUnitRules};
const before=JSON.stringify({plan,audit});
const packet=buildRosterReviewFactPacketV1(input);
const rows=packet.arithmetic.rosterComposition?.units;
const marine=rows?.find(u=>u.unitInstanceId==='player1-marine-1');
assert.equal(marine?.startingModelCount,9,'Actual A audit has nine Marine models, but the shared Teach/revision/review fact packet omits that quantity');
assert.equal(marine.startingSupply,2);
assert.equal(marine.occupiedArmySlots,2);
assert.equal(marine.compositionKind,'large');
assert.equal(packet.arithmetic.rosterComposition.rulesAuditHash,audit.resultHash);
assert.equal(rows.length,plan.rosterCandidate.units.length);
assert(packet.premiseFacts.numbers.some(f=>f.factId===`rosterComposition.units.${rows.indexOf(marine)}.startingModelCount`&&f.value===9));
assert(packet.evidenceCatalogue.some(f=>f.sourcePath===`rosterComposition.units.${rows.indexOf(marine)}.startingModelCount`&&f.text==='9'));
const absent=buildRosterReviewFactPacketV1({...input,armyAudit:null});
assert.equal(absent.arithmetic.rosterComposition.status,'unknown');
assert.equal(absent.arithmetic.rosterComposition.units.length,0);
const wrong=structuredClone(audit);wrong.resultHash='0'.repeat(64);
assert.equal(buildRosterReviewFactPacketV1({...input,armyAudit:wrong}).arithmetic.rosterComposition.status,'unknown');
const mismatch=structuredClone(plan);mismatch.rosterCandidate.units[0].compositionKind='not-the-audited-composition';
assert.equal(buildRosterReviewFactPacketV1({...input,plan:mismatch}).arithmetic.rosterComposition.status,'unknown');
assert.equal(JSON.stringify({plan,audit}),before);
console.log(JSON.stringify({status:'PASS',actualMarineModels:9,actualMarineSupply:2,compositionBoundToSelectedAudit:true,
  sharedTeachRevisionReviewPacket:true,missingOrMismatchedAuditNotGuessed:true,providerCalls:0,roomActions:0}));
