// A failed comparison decision belongs to the author, not a full-envelope copy.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [directory,output]=process.argv.slice(2),report={schema:'slice272_convergence_author_command_v928',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const source=JSON.parse(await fs.readFile(directory+'/artifacts/cb549b889e089123d246afe22fb76a45073620a160597005bbcc57e062c2cfee.json','utf8')).output;
  const original=structuredClone(source);original.decisions[0].comparisonClosureRequest=null;
  const request={roundKind:'roster_workflow_strategy_decision',promptNodes:[{kind:'comparison_closure_contract',version:1},
    {kind:'local_contract_feedback',originalReplyRef:'actual-B-read-only-fixture',originalOutput:original,
      errors:[{code:'comparison_revision_requires_resolution'}]}],
    responseFormat:{kind:'provider_strict_json_schema',schema:ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.providerSchema}};
  const repaired=prepareRosterStrategyRepairRequestV1(request);
  assert.equal(repaired.promptNodes.at(-1).version,3,'New comparison control failure bypasses the structured author command');
  assert.ok(repaired.responseFormat.schema.properties.decision.anyOf[0].properties.comparisonClosureRequest);
  const {dataQuestions,...decision}=structuredClone(original.decisions[0]);
  decision.disposition='retain';decision.mutation=null;decision.strategicChanges=[];
  decision.comparisonClosureRequest={questionNumbers:[1],evidenceNumbers:[862],selectedOption:'Retain current conditional role',
    declinedAlternative:'Decline this optional large alternative',decisionBasis:'Injected choice, not source approval',
    whyNoFurtherEvidenceNeeded:'The retained choice does not adopt the unmeasured superiority claim',
    unverifiedClaims:['Large arm unmeasured'],conditions:['This scenario only'],reopenWhen:'The relevant target mix changes'};
  const result=projectRosterStrategyRepairOutputV1({request:repaired,output:{action:'decide',publicReason:'Injected bounded decision',
    reads:[],catalogueQueries:[],decision,questionUpdates:[{questionNumber:1,classification:'optional_probe',
      publicReason:'Explicitly declined hypothesis, subject to independent closure review',evidenceNumbers:[862]}],newQuestions:[]}});
  assert.deepEqual(result.errors,[]);assert.equal(result.output.decisions[0].dataQuestions[0].question,dataQuestions[0].question);
  assert.deepEqual(result.output.decisions[0].comparisonClosureRequest,decision.comparisonClosureRequest);
  assert.deepEqual(request.promptNodes[1].originalOutput,original,'Original rejected reply unchanged');
  report.pass=true;report.checked=['Control failure routes to existing author command','Question identity retained','Explicit closure survives projection, without approval'];
}catch(e){report.pass=false;report.error=e.message;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
