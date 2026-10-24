// Actual fresh fixed-run coverage reply: its first necessary_fact explicitly
// says it is already answered by read sources. Reproduce the missing lane;
// never reinterpret or rewrite that paid reply in production.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectRosterReviewDataQuestionsV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,
  ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace');
const id='decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34';
const base=path.join(run,'decision-workflows',id),journey=path.join(run,'decision-product-journeys',id);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const replyFile=path.join(journey,'9a2490b5-0edd-4e58-b7d1-f6d271ee3bf1.json');
const bytes=await fs.readFile(replyFile),actual=JSON.parse(bytes);
const original=actual.output.checks[0];
assert.equal(original.verdict,'supported');
assert.equal(original.dataQuestions[0].classification,'necessary_fact');
assert.match(original.dataQuestions[0].publicReason,/already answered/);
assert(original.evidenceNumbers.length>0);
const legacy=projectRosterReviewDataQuestionsV1(original);
assert(legacy.requiredData.includes(original.dataQuestions[0].question));
const declared=structuredClone(original);
// The future MODEL must make this explicit declaration. This isolated fixture
// is not an automatic text heuristic or a migration of the historical reply.
declared.dataQuestions[0].classification='answered_fact';
declared.dataQuestions.push({question:'a genuinely unmeasured adopted claim',
  classification:'necessary_fact',publicReason:'This current measurement is still absent.'});
const projected=projectRosterReviewDataQuestionsV1(declared);
assert.deepEqual(projected.requiredData,['a genuinely unmeasured adopted claim']);
assert.equal(projected.answeredData[0].question,original.dataQuestions[0].question);
assert(projected.conditions.some(c=>c===original.dataQuestions[1].question));
assert(projected.optionalData.some(c=>c.question===original.dataQuestions[2].question));
const state=await read(path.join(base,'workflow.json'));
const traces=(await fs.readFile(path.join(journey,'trace.jsonl'),'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const requestTrace=traces.find(e=>e.kind==='request'&&e.contextHash===actual.receipt.contextHash);
assert(requestTrace);
const request=(await read(path.join(journey,requestTrace.traceId+'.json'))).request;
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.receipt?.contextHash===actual.receipt.contextHash));
assert(work);
const memory=new Map(),store={load:async()=>structuredClone(state),
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(path.join(base,'artifacts',ref+'.json')),
  put:async value=>{const key=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(key,structuredClone(value));return key;}};
const marker=Error('CAPTURE_ONLY');let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v646',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},
  onRequest:async value=>{captured=value;throw marker;}});
await assert.rejects(()=>execute({workId:'isolated-v646',role:'roster_workflow_final_review',
  scope:work.bindings,evidenceDirectory:state.evidence,
  inputs:request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs},
  {operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
    checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
assert(captured.responseFormat.schema.properties.checks.items.properties.dataQuestions.items
  .properties.classification.enum.includes('answered_fact'));
assert(ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.providerSchema.properties.decisions.items
  .properties.dataQuestions.items.properties.classification.enum.includes('answered_fact'));
assert((await fs.readFile(replyFile)).equals(bytes),'old paid reply must remain byte-identical');
console.log(JSON.stringify({status:'passed',actualReply:'9a2490b5',originalQuestionPreserved:true,
  declaredAnsweredSeparated:true,genuineMissingFactStillRequired:true,
  futureAndOptionalRetained:true,reviewAndAuthorShareSchema:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,
  historicalReplyReclassified:false,realModelAdoptionStillPending:true}));
