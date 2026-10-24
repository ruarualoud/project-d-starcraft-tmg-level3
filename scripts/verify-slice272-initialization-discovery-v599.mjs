// Real576/588 repeatedly change phase while Supply stays0. The source inspector
// already advertises Native first-round initialization, but the shared scenario
// invocation contract delivered to every planner omits its discovery recipe.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {describePregameScenarioInputContractV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const base=process.cwd()+'/build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner';
const state=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const ev=state.evidence[1142];
const body=JSON.parse(await fs.readFile(base+'/artifacts/'+ev.artifactRef+'.json','utf8'));
const existing=body.receipt.scenarioConstruction.firstRoundInitialization;
assert.equal(existing.version,'shared_official_first_round_setup_v1');
const contract=describePregameScenarioInputContractV1();
const discovery=contract.capabilityContracts?.firstRoundInitialization;
assert.ok(discovery,'the shared invocation contract must disclose the already-supported Native entry sequence');
for(const field of ['version','request','purpose'])assert.equal(discovery[field],existing[field],field+' must match the original actual inspect capability');
assert.match(contract.constraints.join('\n'),/does not initialize Supply/u);
assert.ok(contract.properties.phase.enum.includes('start_of_round'));
assert.equal(Object.hasOwn(contract.properties,'supply'),false,'no manually chosen Supply shortcut is introduced');
assert.equal(Object.hasOwn(contract.properties,'round'),false,'no manually chosen round shortcut is introduced');
console.log(JSON.stringify({passed:true,concreteReplies:[576,588],existingNativeCapabilityDisclosed:true,
  invocationAndInspectAgree:true,noNewRuleOrResourceOverride:true,providerCalls:0,nativeExecutions:0,productionWrites:0,
  proves:'Single-source discovery contract, not a fresh full-roster arrival or strategy proof'}));
