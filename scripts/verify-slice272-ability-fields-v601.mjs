// Concrete replay: actual675's Medic sentence passed actual source checks while
// combining Active/Reaction and distinct trigger/target predicates. No Provider,
// Native operation or persistent workflow mutation is allowed in this fixture.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1,assessRosterExperimentConclusionV1,
  createRosterExperimentReviewRevisionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {assessRosterSourceClaimReviewV1} from '../packages/roster-strategist/roster-workflow-source-claims-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const memory=new Map(),store={get:async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};
const owner=state.work.findLast(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:component_choices'&&w.resultRef);
assert(owner);const old=await assessRosterExperimentConclusionV1({state,owner,store});
assert.equal(old.acceptedForStrategy,true,'fixture is the actual false-positive answer, not an already rejected reply');
const review=await createRosterExperimentSourceReviewV1({state,owner,result:await store.get(owner.resultRef),store,
  reviewId:owner.id+':source-recheck:ability-fields-v601-fixture'});
assert.equal(review.ruleFieldReviews?.length,1,'the explicitly cited structured ability source requires a separate field matrix');
assert.equal(review.claimReviews.length,0,'the fifteen unchanged completed assertion checks must not be replayed');
const matrix=review.ruleFieldReviews[0],source=matrix.inputs.sourceRuleFields.value;
const medpack=source.abilities.find(a=>a.name==='Medpack'),restoration=source.abilities.find(a=>a.name==='Restoration');
assert.equal(medpack.phase,'Movement Phase');assert.match(medpack.activation,/<Active>/);
assert.match(restoration.description,/Friendly Unit/);assert(!restoration.description.includes('Biological'));
assert.equal(matrix.inputs.claim.value.exactText,review.materialClaims[4].text);
assert.equal(source.abilities.length,8,'do not silently select a convenient ability or drop passive entries');
assert.equal(matrix.inputs.review.value.obligations.length,8);
assert(review.inputs.ruleFieldCheck0);
const fixture=structuredClone(state),matrixChecks=matrix.inputs.review.value.obligations.map(o=>({
  checkId:o.checkId,verdict:o.checkId===matrix.inputs.review.value.obligations[5].checkId?'requires_revision':'supported',
  publicReason:'FIXTURE ONLY: model field verdict used to exercise Host aggregation; not a Rules proof.',requiredData:[],conditions:[]}));
memory.set('fixture-matrix',{value:{checks:matrixChecks}});
memory.set('fixture-coverage',{value:{checks:[{checkId:'question_coverage',verdict:'supported',requiredData:[],conditions:[]}]}});
fixture.work.push({...matrix,status:'evidence_ready',resultRef:'fixture-matrix'},
  {...review,status:'evidence_ready',resultRef:'fixture-coverage'});
const result=await assessRosterSourceClaimReviewV1({state:fixture,review:fixture.work.at(-1),store});
assert.equal(result.acceptedForStrategy,false,'a green overall coverage must not waive the ability-field contradiction');
assert(result.failedClaimReviewIds.includes(matrix.id));
assert.equal(await createRosterExperimentReviewRevisionV1({state:fixture,owner,store}),null,'no silent fourth revision');
fixture.work.at(-1).controlledRecovery={engineeringChangeId:'ability-fields-v601',historyReset:false,
  sourceRevisionAllowance:{ownerWorkId:owner.id,priorRound:owner.experimentReviewRound,additionalRevisions:1}};
const next=await createRosterExperimentReviewRevisionV1({state:fixture,owner,store});
assert.equal(next.experimentReviewRound,4);assert.equal(next.inputs.failedSourceClaim0.id,'role:'+matrix.id);
assert.equal(next.controlledSourceRevision.engineeringChangeId,'ability-fields-v601');
const nextOwner={...owner,id:owner.id+':source-revision',experimentReviewRound:4};
const nextRoot={...fixture.work.at(-1),id:nextOwner.id+':source-review:v2',experimentSourceReviewOf:nextOwner.id};
fixture.work.push(nextOwner,nextRoot);
assert.equal(await createRosterExperimentReviewRevisionV1({state:fixture,owner:nextOwner,store}),null,'the same allowance cannot become an unlimited retry');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({status:'passed',exactSourceAbilities:8,unchangedAssertionsReused:15,newMatrix:1,
  rejectedDespiteGreenCoverage:true,explicitSingleExtraRevision:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
