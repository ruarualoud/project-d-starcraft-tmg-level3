import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { compileStarcraftTmgActionParameterContractV1 } from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/F/fresh-generation-v274/workspace/iterative-draft/sessions`;
const filename = (await fs.readdir(directory)).find(name => name.endsWith('.json'));
const stored = JSON.parse(await fs.readFile(`${directory}/${filename}`, 'utf8'));
const state = (stored.value ?? stored).draftTeachSnapshots.at(-1).state;
const receipt = state.investigation.evidence.find(row => row.unknownReasonCode === 'SELECTED_MELEE_CHARGE_TARGET_INVALID'
  && row.queryRepair?.actionSpace?.parameterDomains?.some(domain => domain.actionType === 'charge'));
const domain = receipt.queryRepair.actionSpace.parameterDomains.find(row => row.actionType === 'charge');
const domainBefore = hash(domain);
const builderBody = { schema: ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA,
  readOnly: true, mutatesRoomState: false, mutatesSourceData: false, reimplementsRules: false,
  silentRepairOrFallback: false, sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  unknownStaysUnknown: true, providerCalls: 0, trainingTruth: false,
  unitCompositionUpgradeDataBundleHash: hash('discovery-fixture'),
  armyResourceBudgetDataBundleHash: hash('discovery-fixture'),
  factionArmyEligibilityDataBundleHash: hash('discovery-fixture') };
const never = () => { throw Error('Discovery must not execute an action, audit or probability query'); };
// Only the immutable enumeration boundary is supplied by the fixture. The
// laboratory, snapshot service and public discovery method below are real.
const lab = createPregameSceneLaboratoryV1({ laboratoryId: 'charge-discovery-regression',
  sourceState: { phase: 'assault', activeSideKey: 'player1', board: receipt.queryRepair.board, pieces: [] },
  rulesRuntime: { descriptor: { runtimeHash: hash('discovery-fixture') },
    enumerate: () => ({ candidates: [], parameterDomains: [domain], searchSuggestions: [] }),
    instantiate: never, apply: never },
  armyBuilderPort: { evaluateRosterCandidate: never,
    portDescriptor: () => ({ ...builderBody, descriptorHash: hash(builderBody) }) } });
const discovery = lab.describeQueryContext();
const contract = discovery.actionParameterContracts?.[domain.domainId];
assert(contract, 'Teach first discovery must expose the same nested submission contract as live Action');
assert.deepEqual(contract, compileStarcraftTmgActionParameterContractV1(domain));
assert.deepEqual(contract.fieldContracts.targets.items.required, ['unitId', 'modelId']);
assert.equal(contract.additionalFieldsAllowed, false);
assert.equal(hash(domain), domainBefore);
assert.equal(discovery.actionSpace.parameterDomains.find(row => row.domainId === domain.domainId).domainId, domain.domainId);
console.log(JSON.stringify({ pass: true, actualRejectedDomain: true, realDiscoveryPath: true,
  sameLiveParameterCompiler: true, nativeActions: 0, providerCalls: 0, originalDomainUnchanged: true }));
