// Actual A Q2 capability probe: create and query a Native Omega asset on an isolated branch.
// No Provider, game action, or previous successful solver query is executed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const base = process.argv[2];
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const arm = cfg.rows.find(r => r.arm === 'A');
const d = JSON.parse(await fs.readFile(arm.dataDirectory + '/drafts/' + arm.sessionId + '.json', 'utf8'));
const actual = JSON.parse(await fs.readFile(base + '/common-v142-native-query-capability.private.json', 'utf8'));
const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
const selected = d.lockedRoster?.lock?.candidateInput || d.selectedCandidateInput || d.working?.candidateInput;
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
recipes[selected.sideKey] = { factionRecordKey: selected.factionRecordKey,
  tacticalCardRecordKeys: structuredClone(selected.tacticalCardRecordKeys),
  units: selected.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
    compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const authority = createOfficialStandardRoomInitialStateAuthorityV1({ dataset: source.dataset,
  snapshot: source.snapshot, serverSeatPlan: ['player1','player2'].map(seatKey => ({ label: seatKey,
    seatKey, roleMode: 'supervisor', principalType: 'human' })),
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', recipes,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: d.setup.missionBinding.missionRecordKey,
  deploymentRecordKey: d.setup.missionBinding.deploymentRecordKey,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')) });
const core = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(authority.state) }) });
let applied = 0;
const runtime = { ...core, apply(...args) { applied++; return core.apply(...args); } };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
const makeLab = () => createPregameSceneLaboratoryV1({ laboratoryId: 'ticket27-s271-roster-workspace-lab',
  sourceState: authority.state, sourceRoomRef: { roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', stateRevision: 0 },
  rulesRuntime: runtime, armyBuilderPort: builder, matchBinding: authority.matchBinding });
const lab = makeLab();
const parent = { challengeId: op.queryId, request: op.request, receipt: op.result };
const port = createRosterTeachEvidencePortV1(lab, { retainedScenarios: [parent] });
const branchIdRef = op.result.queryRepair.scenarioContinuation.branchIdRef;
assert.equal(port.describeQueryContext(branchIdRef).baseStateHash, actual.branchStateHash);

const outputFile = base + '/common-v146-native-asset-branch.private.json';
const report = { version: 146, pid: process.pid, status: 'running',
  startedAt: new Date().toISOString(), providerCalls: 0, roomActions: 0,
  modelMadeSelection: false, strategicClaimProven: false, receipts: [] };
async function save() { report.updatedAt = new Date().toISOString(); await fs.writeFile(outputFile, JSON.stringify(report, null, 2), {mode:0o600}); }
const scope = { mutationAuthority: false, initialFoundationHash: hash(JSON.parse(d.planSerialized)), sourceHashes: [d.teachFramework.state.sourceHash] };
try {
  report.stage = 'construct_model_previously_proposed_kerrigan_scene'; await save();
  // Coordinate is the prior B model's explicit hypothetical Kerrigan anchor,
  // used solely to probe the shared capability, not to choose a match strategy.
  const scene = await port.query({ ...scope, challengeId: 'v146-kerrigan-scene',
    request: { kind: 'scenario', toolRequest: { branchIdRef,
      spec: { kind: 'hypothetical_geometry', phase: 'movement', activeSideKey: 'player2',
        placements: [{ pieceId: 'player2-kerrigan', xInches: 42, yInches: 12 }] } } } });
  report.receipts.push({operation:'scene', receipt:scene}); await save();
  if (scene.status === 'unknown') throw Error('SCENE_FAILED:' + scene.unknownReasonCode);
  const context = port.describeQueryContext('v146-kerrigan-scene');
  const domains = context.actionSpace.parameterDomains;
  report.abilityDomains = domains.filter(d => d.sourceRuntimeKind === 'ability').map(d => ({
    domainId:d.domainId, actionType:d.actionType, pieceId:d.pieceId,
    source:d.sourceDomain?.effectKind, abilityName:d.abilityName || d.sourceDomain?.abilityName }));
  const domain = domains.find(d => d.sourceDomain?.effectKind === 'omega_network'
    || d.effectKind === 'omega_network');
  if (!domain) {
    report.status = 'not_available_in_this_scene';
    report.nextRequiredEvidence = 'Inspect Native activation/asset prerequisites; do not invent a domain or token.';
  } else {
    report.stage = 'query_native_omega_placements'; await save();
    const solver = await port.query({ ...scope, challengeId:'v146-omega-options',
      request:{kind:'spatial',toolRequest:{branchIdRef:'v146-kerrigan-scene',seatKey:'player2',
        queryKind:'legal_asset_placement_options',argumentsJson:JSON.stringify({domainId:domain.domainId,maximumOptions:1})}}});
    report.receipts.push({operation:'asset_solver',receipt:solver}); await save();
    const option = solver.sourceReceipt?.queryReceipt?.result?.placementOptions?.[0];
    if (!option) throw Error('NO_NATIVE_ASSET_CANDIDATE:' + solver.unknownReasonCode);
    report.stage = 'apply_selected_asset_on_clone'; await save();
    const action = await port.query({ ...scope, challengeId:'v146-omega-successor',
      request:{kind:'scenario',toolRequest:{branchIdRef:'v146-kerrigan-scene',seatKey:'player2',
        spec:{kind:'native_action'},argumentsJson:JSON.stringify({domainId:domain.domainId,parameters:option.canonicalParameters}),
        followUps:[{kind:'spatial',seatKey:'player2',queryKind:'mission_marker_control',argumentsJson:'{}'}]}}});
    report.receipts.push({operation:'asset_successor',receipt:action}); await save();
    if(action.status==='unknown') throw Error('ASSET_SUCCESSOR_FAILED:'+action.unknownReasonCode);
    const after=port.describeQueryContext('v146-omega-successor');
    const beforeIds=new Set(context.availableUnits.map(u=>u.unitId));
    report.newUnits=after.availableUnits.filter(u=>!beforeIds.has(u.unitId));
    report.nativeCloneActions=applied;
    report.followUpControlStatus=action.followUpReceipts?.[0]?.receipt?.queryReceipt?.status;
    report.status=report.newUnits.length && report.followUpControlStatus==='exact' ? 'completed' : 'unresolved_effect_observation';
  }
  report.mutationZero=lab.proveMutationZero();
  report.stage='finished'; await save();
  console.log(JSON.stringify({status:report.status,newUnitIds:report.newUnits?.map(u=>u.unitId),
    nativeCloneActions:applied,providerCalls:0,roomActions:0,strategicClaimProven:false}));
} catch(error) {
  report.status='failed';report.failure={message:String(error.message),code:error.code||null};
  report.mutationZero=lab.proveMutationZero();await save();console.error(JSON.stringify(report.failure));process.exitCode=1;
}
