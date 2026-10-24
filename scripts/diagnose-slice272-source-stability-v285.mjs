// Reproduce actual D retained-source drift. Read-only, no Provider or actions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { rosterPlanExperimentGroupV274 } from '../content/roster-plan-experiment-matrix-v274.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 as create, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';

const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(directory)).find(name => name.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${directory}/${file}`, 'utf8'));
const record = (raw.value ?? raw).draftTeachSnapshots.at(-1);
const expected = record.failure.detail.mismatches.sourceStateHash;
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const reference = rosterPlanExperimentGroupV274('D').referenceArmyRecipes;
const candidate = record.candidateInput;
const recipe = { factionRecordKey: candidate.factionRecordKey,
  tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
  units: candidate.units.map(unit => ({ unitInstanceId: unit.unitInstanceId,
    recordKey: unit.recordKey, compositionKind: unit.compositionKind,
    upgradeNames: unit.upgrades.map(upgrade => upgrade.upgradeName) })) };
const common = { dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ['player1', 'player2'].map(side => ({ label: side, seatKey: side, roleMode: 'supervisor', principalType: 'human' })),
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab',
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')) };
const options = { ...common, recipes: { ...reference, [candidate.sideKey]: recipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY };
const before = create(options).state;
const referenceAuthority = create({ ...common, recipes: reference });
createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime: createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: structuredClone(referenceAuthority.state) }) });
const after = create(options).state;
const differences = [];
function compare(a, b, path = '') {
  if (hash(a ?? null) === hash(b ?? null)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compare(a[key], b[key], `${path}/${key}`);
  } else differences.push({ path, before: a, after: b });
}
compare(before, after);
console.log(JSON.stringify({ expected, before: hash(before), after: hash(after), differences,
  providerCalls: 0, nativeActions: 0 }));
assert.equal(hash(before), hash(after), 'Identical selected source must not depend on reference initialization');
assert.equal(hash(after), expected.saved, 'Restored D source must match its saved evidence');
