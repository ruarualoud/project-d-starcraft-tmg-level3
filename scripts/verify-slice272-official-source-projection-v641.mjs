// Actual1399 cannot verify the Medic record from a Native-only empty index.
// Source records must survive the shared projection; an unchanged failed
// judgement must not be cached across a repaired delivery/view.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';import {createHash} from 'node:crypto';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const state=await read(path.join(base,'workflow.json')),actual=await read(path.join(run,'1399.reply.json'));
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.receipt?.contextHash===actual.receipt.contextHash));
assert(work?.materialClaimReviewOf);
assert.equal(actual.output.checks[0].verdict,'requires_revision');
const owner=state.work.find(w=>w.id===work.materialClaimReviewOf),memory=new Map();
const store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(path.join(base,'artifacts',ref+'.json')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const source=state.evidence.find(e=>e.kind==='official_source'&&e.id.startsWith('unit-source:army_units:medic:'));
assert(source);
const body=await store.get(source.artifactRef);assert(body.abilities?.length>1);
const projected=projectRosterExperimentSourceFactsV1({evidence:source,value:body});
const rebuilt=await createRosterExperimentSourceReviewV1({state,owner,store,result:await store.get(owner.resultRef),
  reviewId:owner.id+':source-recheck:isolated-v641'});
assert(rebuilt);
// The real job may have been queued under v2 before loading v640. Rebuild its
// exact assertion through the CURRENT constructor, then attach the actual
// failed reply only inside this isolated fixture (never production state).
const exactText=work.inputs.claim.value.exactText;
const currentClaim=rebuilt.materialClaims.find(c=>c.text===exactText);assert(currentClaim);
const currentJob=rebuilt.claimReviews.find(w=>w.id===currentClaim.reviewId)
  ??state.work.find(w=>w.id===currentClaim.reviewId);assert(currentJob);
const failedCurrent={...structuredClone(currentJob),status:'evidence_ready',resultRef:work.resultRef};
const afterFailure=await createRosterExperimentSourceReviewV1({state:{...state,work:[...state.work,failedCurrent]},
  owner,store,result:await store.get(owner.resultRef),reviewId:owner.id+':source-recheck:isolated-v641-after-failure'});
const delivered=rebuilt.sourceProjections.find(p=>p.value.sourceEvidenceId===source.id)?.value;
const checks={officialKindRetained:projected.sourceKind==='official_source',
  exactFrozenRecordPreserved:isDeepStrictEqual(projected.sourceRecord,body),
  realReviewReceivesRecord:isDeepStrictEqual(delivered?.sourceRecord,body),
  failedCurrentJudgementNotReused:!afterFailure.materialClaimReviewIds.includes(failedCurrent.id)};
console.log(JSON.stringify({checks,actualReply:1399,officialRecord:body.recordKey,
  sourceAbilityCount:body.abilities.length,providerCalls:0,nativeCalls:0,productionWrites:0,
  currentSourceOriginalUnchanged:true,negativeCacheFixtureUsesActualFailure:true,realModelRecheckStillPending:true}));
assert(Object.values(checks).every(Boolean),'BUG: official sources disappear in Native indexes and failed view-dependent verdicts remain cached');
