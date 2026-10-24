// Read-only diagnosis of B's concrete "no Orders payment query" claim.
// Reuse its chosen unit anchors, compare phase only, execute no game actions.
import fs from 'node:fs/promises';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { providerCalls: 0, roomActions: 0, sourceDraftWrites: 0, modelSelectedDiagnosticPhase: false, stages: [] };
const save = () => fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json'));
  const row = cfg.rows.find(r => r.arm === 'B');
  const d = JSON.parse(await fs.readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json'));
  const selected = d.selectedCandidateInput;
  const op = d.teachFramework.state.investigation.operations.find(o => o.queryId === 'q6-scenario-raynor-orders');
  if (!op?.request?.toolRequest?.spec?.placements?.length) throw Error('EXACT_SAVED_B_SCENE_REQUIRED');
  const spec = structuredClone(op.request.toolRequest.spec);
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
  const recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
  recipes[selected.sideKey] = { factionRecordKey: selected.factionRecordKey,
    tacticalCardRecordKeys: selected.tacticalCardRecordKeys,
    units: selected.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
      compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(v => v.upgradeName) })) };
  const authority = createOfficialStandardRoomInitialStateAuthorityV1({ dataset: source.dataset, snapshot: source.snapshot,
    serverSeatPlan: ['player1','player2'].map(seatKey => ({ label: seatKey, seatKey, roleMode: 'supervisor', principalType: 'human' })),
    roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', recipes,
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey: d.setup.missionBinding.missionRecordKey, deploymentRecordKey: d.setup.missionBinding.deploymentRecordKey,
    mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile)) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(authority.state) }) });
  const lab = createPregameSceneLaboratoryV1({ sourceState: authority.state, matchBinding: authority.matchBinding,
    rulesRuntime: runtime, armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
      createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) }) });
  report.status = 'running'; await save();
  for (const phase of ['assault', 'movement']) {
    const branch = lab.runScenarioBranch({ branchId: 'orders-probe-' + phase,
      base: { kind: 'source' }, spec: { ...spec, phase, activeSideKey: selected.sideKey } });
    const context = lab.describeQueryContext({ base: { kind: 'branch', branchStateHash: branch.branchStateHash } });
    const domains = context.actionSpace.parameterDomains.filter(domain => domain.sourceDomain?.effectKind === 'orders' || domain.effectKind === 'orders');
    report.stages.push({ phase, sourceStateHash: context.sourceStateHash, baseStateHash: context.baseStateHash,
      geometry: branch.hypotheticalPlacementAssessment?.units?.map(u => ({ pieceId: u.pieceId, resultStatus: u.resultStatus })),
      availableDomainCount: context.actionSpace.parameterDomains.length,
      cards: context.cardResources[selected.sideKey]?.map(c => ({ id: c.id, resourceType: c.resourceType,
        resource: c.resource, readiness: c.readiness, face: c.face })),
      ordersDomains: domains.map(domain => ({ domainId: domain.domainId, pieceId: domain.pieceId,
        source: domain.sourceDomain || domain })) });
    await save();
  }
  report.sourceUnchanged = lab.proveMutationZero().sourceStateHashUnchanged;
  report.status = 'completed';
} catch (error) { report.status = 'failed'; report.failure = String(error.stack || error).slice(0,2000); process.exitCode = 1; }
await save();
console.log(JSON.stringify({ status: report.status, failure: report.failure,
  stages: report.stages.map(s => ({ phase: s.phase, availableDomainCount: s.availableDomainCount, ordersCount: s.ordersDomains.length })) }));
