// Reproduce the concrete product-startup failure, then check Native selections
// survive the Provider's closed/nullable representation without new defaults.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  await import('../packages/roster-strategist/roster-workflow-read-role-v1.mjs');
  await import('../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs');
  report.checks.push('actual product role modules load their output schemas');
  const api=await import('../packages/roster-strategist/roster-participant-configuration-v1.mjs');
  const unit={unitInstanceId:'marauder-2',recordKey:'army_units:marauder',compositionKind:'small',upgrades:[{upgradeName:'Kinetic Foam'}]};
  const declared={...unit,compositionProfileId:null,startingModelIds:null,
    upgrades:[{...unit.upgrades[0],purchasableUpgradeProfileId:null,upgradeInstanceId:null,nominatedModelId:null}]};
  const scope={participantUnitIds:[unit.unitInstanceId],participantConfigurations:[declared]};
  const before=JSON.stringify(scope);
  const check=api.checkRosterParticipantConfigurationV1({scope,operation:'scenario',candidateInput:{units:[unit]}});
  assert.equal(check.status,'matched');
  assert.deepEqual(check.expectedConfigurations,[unit]);
  assert.equal(JSON.stringify(scope),before);
  assert.throws(()=>api.checkRosterParticipantConfigurationV1({scope:{...scope,participantConfigurations:[{...declared,compositionKind:'large'}]},operation:'scenario',candidateInput:{units:[unit]}}),/CONFIGURATION_MISMATCH/);
  assert.throws(()=>api.validateRosterParticipantConfigurationsV1([{...declared,compositionKind:null}]),/CONFIGURATION_SHAPE/);
  report.checks.push('null means absent optional addressing only; original unchanged; wrong and absent composition remain rejected');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-configuration-provider-v906-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
