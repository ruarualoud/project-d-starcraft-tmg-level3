// Actual1340 put a future conditional probe into requiredData; the product
// consequently enqueued it as necessary investigation. Authors need the SAME
// typed classification already available to source/domain reviewers.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1 as contract} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterReviewDataQuestionsV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const actual=JSON.parse(await fs.readFile(process.argv[2]+'/1340.reply.json','utf8')).output;
const schema=contract.providerSchema.properties.decisions.items;
assert(schema.properties.dataQuestions&&!schema.properties.requiredData,
  'BUG: the author cannot classify a conditional future probe separately from required current investigation');
const output=structuredClone(actual),decision=output.decisions[0],original=[...decision.requiredData];
// Explicit classifications are MODEL fixture inputs, never Host text heuristics.
decision.dataQuestions=original.map((question,i)=>({question,
  classification:i===2?'future_condition':'necessary_fact',publicReason:i===2
    ?'The original question explicitly defers this comparison until a future quantified claim is adopted.'
    :'Fixture assumes this current adopted spatial claim still needs evidence.'}));
delete decision.requiredData;
assert.equal(validate(contract.providerSchema,output).ok,true);
const projected=projectRosterReviewDataQuestionsV1(decision);
assert.deepEqual(projected.requiredData,original.slice(0,2));
assert(projected.conditions.includes(original[2]));
assert.equal(projected.dataQuestions.length,original.length);
assert.deepEqual(actual.decisions[0].requiredData,original);
console.log(JSON.stringify({passed:true,actualReply:1340,typedAuthorLanes:true,
  currentNecessary:projected.requiredData.length,futurePreserved:projected.conditions.length,
  hostClassifiedQuestionText:false,paidReplyUnchanged:true,newProviderCalls:0,productionWrites:0,
  classificationFixture:true,realModelAdoptionStillPending:true}));
