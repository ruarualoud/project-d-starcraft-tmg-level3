// Offline input preparation, not a model generation or battle experiment.
import fs from 'node:fs/promises';
import path from 'node:path';
import { rosterPlanExperimentGroupV274, ROSTER_PLAN_EXPERIMENT_MATRIX_V274 } from
  '../content/roster-plan-experiment-matrix-v274.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { buildOfficialRoomArmyAuditV1 } from
  '../packages/product-composition/official-standard-room-factory-v1.mjs';

const [base] = process.argv.slice(2);
if (!base) throw Error('BASE_DIRECTORY_REQUIRED');
const cfg = JSON.parse(await fs.readFile(path.join(base, 'common-v79-plan-recovery-config.private.json'), 'utf8'));
const directory = path.join(base, ROSTER_PLAN_EXPERIMENT_MATRIX_V274);
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset });
for (const arm of ['C', 'D']) {
  const group = rosterPlanExperimentGroupV274(arm);
  const started = Date.now();
  const result = { arm, group, role: group.referenceRole, providerCalls: 0, gamesStarted: 0 };
  try {
    const audit = buildOfficialRoomArmyAuditV1(bundle, 'player2', group.referenceArmyRecipes.player2,
      { dataset: source.dataset, scaleId: 'Standard', mineralBudget: 2000 });
    result.status = 'rules_audited_exact_2000';
    result.audit = audit;
  } catch (error) {
    result.status = 'rejected'; result.error = String(error.message);
  }
  result.elapsedMs = Date.now() - started;
  await fs.writeFile(path.join(directory, `${arm}-reference-army-audit.json`),
    JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ arm, status: result.status, elapsedMs: result.elapsedMs,
    error: result.error }));
  if (result.status === 'rejected') process.exitCode = 1;
}
