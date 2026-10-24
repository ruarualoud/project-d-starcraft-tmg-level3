import fs from 'node:fs/promises';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { rosterPlanExperimentGroupV274 } from '../content/roster-plan-experiment-matrix-v274.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 }
  from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 }
  from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
const [base, mode = 'factory_only'] = process.argv.slice(2);
const dir = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(dir)).find(n => n.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${dir}/${file}`, 'utf8'));
const session = raw.value ?? raw, record = session.draftTeachSnapshots.at(-1);
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const candidate = record.candidateInput;
const recipe = { factionRecordKey: candidate.factionRecordKey,
  tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
  units: candidate.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
    compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const options = { dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ['player1', 'player2'].map(side => ({ label: side, seatKey: side,
    roleMode: 'supervisor', principalType: 'human' })),
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab',
  recipes: { ...rosterPlanExperimentGroupV274('D').referenceArmyRecipes, [candidate.sideKey]: recipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  ...(session.frozenContext.missionBinding ? {
    missionRecordKey: session.frozenContext.missionBinding.missionRecordKey,
    deploymentRecordKey: session.frozenContext.missionBinding.deploymentRecordKey } : {}),
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')) };
const states = [];
for (let i = 0; i < 2; i++) {
  if (i === 1 && mode === 'reference_warm') {
    const reference = createOfficialStandardRoomInitialStateAuthorityV1({ ...options,
      recipes: rosterPlanExperimentGroupV274('D').referenceArmyRecipes });
    createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
      createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(reference.state) }) });
  }
  if (i === 1 && mode === 'runtime_warm') {
    createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
      createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(states[0]) }) });
  }
  const started = performance.now();
  const authority = createOfficialStandardRoomInitialStateAuthorityV1(options);
  states.push(authority.state);
  console.log(JSON.stringify({ iteration: i, sourceStateHash: hash(authority.state),
    milliseconds: Math.round(performance.now() - started) }));
}
console.log(JSON.stringify({ equalRepeatedInitialization: hash(states[0]) === hash(states[1]),
  changedStateFields: Object.keys(states[0]).filter(k => hash(states[0][k]) !== hash(states[1][k])),
  changedChildren: Object.keys(states[0]).filter(k => hash(states[0][k]) !== hash(states[1][k]))
    .map(k => ({ field: k, children: [...new Set([...Object.keys(states[0][k] || {}),
      ...Object.keys(states[1][k] || {})])].filter(c => hash(states[0][k]?.[c] ?? null)
        !== hash(states[1][k]?.[c] ?? null)) })),
  actualMismatch: record.failure?.detail?.mismatches, providerCalls: 0, nativeActions: 0 }));
