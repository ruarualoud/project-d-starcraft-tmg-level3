// Diagnose the actual remaining Teach stop without model calls or draft writes.
import fs from 'node:fs/promises';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { projectRosterTeachRolePromptV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { projectRosterTeachCapabilityGuideV1, projectRosterTeachDecisionScopeV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, output] = process.argv.slice(2);
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json'));
const row = cfg.rows.find(r => r.arm === 'B');
const d = JSON.parse(await fs.readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json'));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const selected = d.selectedCandidateInput, recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
recipes[selected.sideKey] = { factionRecordKey: selected.factionRecordKey, tacticalCardRecordKeys: selected.tacticalCardRecordKeys,
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
const current = lab.describeQueryContext({ base: { kind: 'source' } });
const context = { ...d.teachFramework.context, queryContext: current };
const s = d.teachFramework.state;
// Same context/results projection seam; no scenario/query re-execution needed.
const nodes = [projectRosterTeachDecisionScopeV1(context), projectRosterTeachCapabilityGuideV1(current, context),
  { kind: 'current_plan_and_context', plan: JSON.parse(d.planSerialized), context },
  { kind: 'framework_and_questions', framework: s.framework, agenda: s.agenda },
  { kind: 'actual_tool_results', evidence: [...s.evidence, ...s.investigation.evidence,
    ...s.queryRecovery.operations.map(o => o.result).filter(Boolean)] }];
const projected = projectRosterTeachRolePromptV1('teach_framework_synthesis', nodes);
const hits = [];
function visit(value, path = '') {
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, 'cardResources')) hits.push({ path: path + '.cardResources',
    equalCurrent: JSON.stringify(value.cardResources) === JSON.stringify(current.cardResources),
    ownCards: Array.isArray(value.cardResources?.[selected.sideKey]) ? value.cardResources[selected.sideKey].map(c => ({ id: c.id,
      resource: c.resource, resourceType: c.resourceType, readiness: c.readiness })) : null });
  for (const [key, child] of Object.entries(value)) visit(child, path ? path + '.' + key : key);
}
visit(projected);
const report = { status: 'completed', providerCalls: 0, sourceDraftWrites: 0, roomActions: 0,
  frozenContextHasResources: Object.hasOwn(d.teachFramework.context.queryContext, 'cardResources'),
  currentSourceStateMatchesFrozen: current.sourceStateHash === d.teachFramework.context.queryContext.sourceStateHash,
  currentCards: current.cardResources[selected.sideKey], resourceProjectionHits: hits,
  projectedChars: JSON.stringify(projected).length,
  continuation: s.investigation.capabilityContinuation,
  continuationRounds: s.investigation.rounds.slice(s.investigation.capabilityContinuation.startRound).map(r => ({
    queries: r.output.queries.map(q => ({ queryId: q.queryId, questionId: q.questionId, kind: q.kind,
      specKind: JSON.parse(q.toolRequestJson).spec?.kind, nativeKind: JSON.parse(q.toolRequestJson).queryKind })),
    completed: r.completed })),
  sourceUnchanged: lab.proveMutationZero().sourceStateHashUnchanged };
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ...report, currentCards: report.currentCards?.map(c => ({ id: c.id, readiness: c.readiness,
  resource: c.resource })), resourceProjectionHits: hits.map(h => ({ path: h.path, equalCurrent: h.equalCurrent, cardCount: h.ownCards?.length })) }));
