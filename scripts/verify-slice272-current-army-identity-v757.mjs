// Actual d141 treats audited candidate #472 (2000/19 upgrades) as formal r3
// (1490/5). Verify shared source delivery, not a regex over model prose.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root = path.resolve(process.argv[2]);
const read = async ref => JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json', 'utf8'));
const state = JSON.parse(await fs.readFile(root+'/workflow.json', 'utf8'));
const original = JSON.stringify(state);
const work = state.work.find(w => w.resultRef === 'd14198056baf27efaa3275dc6e5c60c8e8844cdf413c453dbc79f6f8738bb99c');
assert(work);
const assignment = await read(work.inputRef);
const input = await projectRosterWorkflowRoleSourceInputsV1({assignment, state, readArtifact: read});
assert.equal(input.currentArmyAuthority?.value?.mineralSpent, 1490,
  'current Native audit must be delivered separately from historical candidate audits');
assert.equal(input.currentArmyAuthority.value.selectedUpgradeCount, 5);
assert.equal(input.currentArmyIdentity.value.candidateHash, state.scope.army);
assert.equal(input.currentArmyAuthority.evidenceId, 'draft:r3:builder');
const directory = state.evidence.map((entry,index) => ({number:index+1,...entry}));
const old = directory.find(e => e.number === 472);
assert.match(old.id, /audit-upgrade-candidate/);
const body = await read(old.artifactRef), before = JSON.stringify(body);
const context = await projectRosterWorkflowReadContextV1({
  collected:[{evidenceId:old.id,evidenceNumber:old.number,pointer:'',status:'read',value:body}],
  operation:{calls:[],reads:[]}, directory, store:{get:read}, assignmentInputs:input,
  assignmentScope:state.scope,
});
const row = context.auditedCandidateApplicability?.find(r => r.readViaEvidenceIds.includes(old.id));
assert(row);
assert.equal(row.applicability, 'different_audited_candidate');
assert.notEqual(row.auditedCandidateHash, state.scope.army);
assert.equal(row.auditSummary.mineralSpent, 2000);
assert.equal(row.auditSummary.selectedUpgradeCount, 19);
assert.equal(row.currentFormalCandidateHash, state.scope.army);
assert.equal(row.acceptanceGranted, false);
let captured;
const memory=new Map();
const execute=createRosterWorkflowReadRoleExecutorV1({store:{
  load:async()=>state,get:async ref=>memory.get(ref)??read(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}},
  sessionId:'current-army-source-only',
  deliberation:{deliberate:()=>{throw Error('NO_PROVIDER');}},
  onRequest:async request=>{captured=request;throw Error('CAPTURE_ONLY');}});
try {
  await execute({...assignment,inputs:input},{
    operationState:structuredClone(work.operationState),checkpointOperation:async()=>{}});
} catch(error) {if(error.message!=='CAPTURE_ONLY')throw error;}
assert(captured);
assert.equal(captured.promptNodes.find(n=>n.kind==='workflow_role_assignment')
  .inputs.currentArmyAuthority.value.mineralSpent,1490);
assert(captured.promptNodes.find(n=>n.kind==='audited_candidate_applicability')
  .entries.some(r=>r.readViaEvidenceIds.includes(old.id)&&r.applicability==='different_audited_candidate'));
assert.equal(JSON.stringify(body), before);
assert.equal(JSON.stringify(state), original);
console.log(JSON.stringify({passed:true,currentMinerals:1490,currentUpgrades:5,
  historicalCandidateMinerals:2000,historicalUpgrades:19,
  actualModelRequestCaptured:true,
  modelProseNotRewritten:true,sourceIdentityNotStrategyJudgment:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
