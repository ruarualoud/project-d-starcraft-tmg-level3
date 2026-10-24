// Reproduce the actual waiting callers, without loading/sending paid history.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const serviceSource = await fs.readFile(new URL('../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs', import.meta.url), 'utf8');
const journeySource = await fs.readFile(new URL('../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs', import.meta.url), 'utf8');
const observerSource = await fs.readFile(new URL('./continue-slice272-walkthrough-v320.mjs', import.meta.url), 'utf8');
function between(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing actual production function: ${start}`);
  return source.slice(a, b);
}
let projections = 0;
let draftReads = 0;
const raw = {sessionId:'s',status:'running',planSerialized:JSON.stringify({planHash:'p'}),
  failure:null,planReview:{status:'running',planHash:'p',failure:null},
  teachFramework:{status:'running',planHash:'p',state:{investigation:{completed:false}},failure:null}};
const full = {kind:'full',...raw,plan:{planHash:'p'},canEnterRoom:false};
const readSession = new Function('requireSession','projectSession','parseWorkspacePlan',
  between(serviceSource,'  function readSession(', '\n  async function deleteSession(')+'\nreturn readSession;')(
    id=>{assert.equal(id,'s');return raw;},()=>{projections++;return full;},JSON.parse);
const jobs = new Map([['s',{running:true,phase:'quantitative_framework_teach',failure:null}]]);
const draft = {revision:4,status:'requires_reconciliation',frozenContext:{factionRecordKey:'t',opponentFactionRecordKey:'z',scaleId:'Standard'},
  mineralBudget:2000,currentCandidate:{mineralSpent:2000,input:{units:[]}},iterations:[],plan:{reason:'unchanged'}};
const read = new Function('iterativeDraft','linkedTeach','jobs','stage','reviewConvergenceExhausted',
  'AGENT_SELECTED_ROSTER_JOURNEY_V1','hasCurrentSourceReview','effectiveRosterFinalPlanReviewFindingsV1',
  between(journeySource,'  async function read(', '\n  async function list(')+'\nreturn read;')(
    {read:async()=>{draftReads++;return draft;}},async()=>null,jobs,()=> 'reconciliation_required',()=>false,'journey',()=>false,()=>[]);

const start=performance.now();
const progress=readSession('s',{progressOnly:true});
const jobProgress=await read('s',{progressOnly:true});
console.log(JSON.stringify({reproduction:{workspaceFullProjections:projections,iterativeHistoryReads:draftReads,elapsedMs:performance.now()-start}}));
assert.deepEqual({projections,draftReads},{projections:0,draftReads:0},
  'Waiting for running work must not project full Teach history or read the iterative archive');
assert.equal(progress.status,'running');assert.equal(progress.plan.planHash,'p');
assert.equal(progress.planReview.status,'running');assert.equal(progress.teachFramework.status,'running');
assert.equal(jobProgress.running,true);assert.equal(jobProgress.phase,'quantitative_framework_teach');
assert.equal(readSession('s'),full,'Normal decision readers retain the complete projection');
const publicView=await read('s');assert.equal(publicView.exactBudget,true);assert.deepEqual(publicView.publicPlan,draft.plan);

const waitRead = new Function('workspaceService',
  between(journeySource,'  function readAwaitedSession(', '\n  async function withWorkspaceSlot(')+'\nreturn readAwaitedSession;')({readSession});
for(const lane of ['planning','planReview','teachFramework']) {
  const old=projections;
  const running=waitRead('s',lane);
  assert.equal(projections,old,`${lane}: no full projection while running`);
  assert.notEqual(running,full);
  const target=lane==='planning'?raw:raw[lane];
  target.status='failed';target.failure={code:'ACTUAL_FAILURE'};
  assert.equal(waitRead('s',lane),full,`${lane}: failure must return the full original evidence`);
  assert.equal(projections,old+1);
  target.status=lane==='planning'?'planned':'completed';
  assert.equal(waitRead('s',lane),full,`${lane}: completion must return the full original evidence`);
  assert.equal(projections,old+2);
  target.status='running';target.failure=null;
}
jobs.get('s').phase='repairing_cited_claims';
assert.equal((await read('s',{progressOnly:true})).phase,'repairing_cited_claims');
jobs.get('s').running=false;jobs.get('s').failure='STOPPED';
assert.equal((await read('s',{progressOnly:true})).stoppedReason,'STOPPED');

// Execute the actual observer loop: three live polls in one phase then a
// terminal transition. Full snapshots occur only at a changed phase/terminal.
const marker="status.status='running';await persist();";
const loop=between(observerSource.slice(observerSource.indexOf(marker)), '  while(true){', '\n  const experience=');
const observed=[];const checkpoints=[];let reads=0;
const observe=new Function('fs','path','directory','sessionId','product','checkpoint','persist','status','setTimeout',
  'return (async()=>{let stopRequested=false;let lastObservedPhase;'+loop+'})();');
const status={};
await observe({stat:async()=>{throw Object.assign(new Error(),{code:'ENOENT'});}}, {join:()=>'/unused'},'/unused','s',
  {iterativeJourney:{read:async(id,options)=>{
    assert.equal(id,'s');observed.push(Boolean(options?.progressOnly));
    if(options?.progressOnly) return {running:++reads<4,phase:'quantitative_framework_teach'};
    return {running:reads<4,stage:reads<4?'teach_running':'source_review_completed_clean'};
  }}},async view=>checkpoints.push(view),async()=>{},status,callback=>callback());
assert.equal(status.status,'completed');
assert.equal(observed.filter(Boolean).length,4);
assert.equal(observed.filter(x=>!x).length,2,'Only phase entry and terminal need full checkpoints');
assert.equal(checkpoints.at(-1).stage,'source_review_completed_clean');
console.log(JSON.stringify({status:'passed',workspaceWaitLanes:3,observerLivePolls:3,
  fullObserverSnapshots:2,unchangedStrategyAndRuleConsumers:true,providerCalls:0,nativeExecutions:0}));
