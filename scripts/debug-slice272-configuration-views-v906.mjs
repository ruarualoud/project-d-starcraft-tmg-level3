// New producer metadata must reach both existing role readers unchanged.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import * as factsApi from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,fixture:'explicit synthetic configuration metadata over retained Native receipt',checks:[]};
try{
  const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
  const ref='178c8ab7db47177ec35f583d88f229ed042819e7e0704af0458cb88979958a81';
  const result=JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
  const check={schema:'roster_participant_configuration_check_v1',status:'matched',contextRef:null,
    expectedConfigurations:[{unitInstanceId:'unit',recordKey:'army_units:marauder',compositionKind:'small',upgrades:[]}],
    actualConfigurations:[{unitInstanceId:'unit',recordKey:'army_units:marauder',compositionKind:'small',upgrades:[]}],
    source:'selected_candidate_input',strategyApproved:false,trainingTruth:false};
  const value={...result.value,participantConfigurationCheck:check},before=JSON.stringify(value);
  const view=projectRosterWorkflowReceiptViewV1({evidenceId:'tool:configuration-probe',value,conditions:result.conditions});
  assert.deepEqual(view.participantConfigurationCheck,check,'receipt view dropped the producer configuration check');
  const project=factsApi.projectRosterExperimentSourceFactsV1;
  assert.equal(typeof project,'function');
  const facts=project({evidence:{id:'tool:configuration-probe',artifactRef:ref,kind:'tool_receipt'},value});
  assert.deepEqual(facts.participantConfigurationCheck,check,'source facts dropped the producer configuration check');
  assert.equal(JSON.stringify(value),before);
  report.checks.push('receipt view and source-facts reader retain exact typed selection check; metadata does not become combat or strategy approval');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-configuration-views-v906-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
