// Actual fresh-production unit has profile fields but no unitInstanceId or
// upgrades. The port rejected it with an empty detail, causing repeated guesses.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {describePregameWorkflowInputContractsV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),[editable,fixed]=process.argv.slice(2);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const port=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const run=JSON.parse(await fs.readFile(path.join(editable,'product-run.json'),'utf8'));
const failed=JSON.parse(await fs.readFile(path.join(editable,'workspace/decision-workflows',run.workflowId,
  'artifacts/742ae2293dd3e184f990b1eeb0dfa81ffcab653cc0d51452ec4ace59d1805a34.json'),'utf8'));
const candidate=failed.submittedArguments.candidateInput,unchanged=JSON.stringify(candidate);
const rejected=port.evaluateRosterCandidate(candidate);assert.equal(rejected.status,'invalid_candidate');
assert.ok(Array.isArray(rejected.portErrorDetail?.issues),'candidate-address rejection must identify concrete missing fields, not an empty detail');
for(const pointer of ['/units/0/unitInstanceId','/units/0/upgrades'])assert.ok(rejected.portErrorDetail.issues.some(x=>x.path===pointer),pointer);
const contract=port.portDescriptor().candidateInputContract;assert.ok(contract);
assert.deepEqual(rejected.candidateInputContract,contract);
const menu=port.enumerateArmyBuildingChoices({scaleId:'Standard',factionRecordKey:candidate.factionRecordKey,mineralBudget:2000});
assert.deepEqual(menu.candidateInputContract,contract);
assert.deepEqual(describePregameWorkflowInputContractsV1().builder_audit.argumentsShape.candidateInput,contract);
const valid=JSON.parse(await fs.readFile(path.join(fixed,'generation-input.json'),'utf8')).candidateInput;
const verdict=port.evaluateRosterCandidate(valid);assert.equal(verdict.status,'legal');assert.equal(verdict.summary.mineralSpent,2000);
assert.equal(JSON.stringify(candidate),unchanged);assert.equal(rejected.silentRepairAttempted,false);
console.log(JSON.stringify({passed:true,actualFreshFailure:true,sharedInputAndErrorContract:true,bothMissingFieldsReported:true,
  known2000CandidateStillNativeLegal:true,providerCalls:0,nativeArmyAudits:1,productionWrites:0,strategyImprovementProven:false}));
