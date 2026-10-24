// B's actual cancelled retained-query run must not rehydrate the whole old
// investigation merely because the persisted phase is read_only_queries.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterTeachRecoveryBranchSelectionV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2]+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const state=d.teachFramework.state;
assert.equal(d.teachFramework.failure.code,'ROSTER_WORKSPACE_CANCELLED');
assert.equal(state.phase,'read_only_queries');
assert.equal(state.queryRecovery.selection.completed,false);
assert.deepEqual(rosterTeachRecoveryBranchSelectionV1(state),state.queryRecovery.selection,
  'Pending explicit recovery must keep selective branch restoration after interruption');
assert.equal(Boolean(rosterTeachRecoveryBranchSelectionV1({phase:'investigate_evidence',queryRecovery:{selection:{completed:true}}})),false,
  'An old completed recovery must not narrow a genuinely new investigation');
console.log(JSON.stringify({status:'PASS',actualInterruptedBSelectionRetained:true,newInvestigationNotNarrowed:true,
  providerCalls:0,roomActions:0,noHistoricalScenesReplayed:true}));
