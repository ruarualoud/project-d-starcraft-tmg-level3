// Actual D product recovery, in a private copy. The Provider is never called.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { rosterPlanExperimentGroupV274 } from '../content/roster-plan-experiment-matrix-v274.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(directory)).find(name => name.endsWith('.json'));
const original = await fs.readFile(`${directory}/${file}`, 'utf8');
const raw = JSON.parse(original), state = raw.value ?? raw;
assert.equal(state.draftTeachSnapshots.at(-1).failure.code, 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED');
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const copy = await fs.mkdtemp(path.join(base, 'product-source-v285-'));
console.log(JSON.stringify({ stage: 'copied_session', copy }));
await createIterativeRosterFileStoreV1({ directory: path.join(copy, 'iterative-draft') }).save(state.sessionId, state);
let modelBoundaries = 0;
const product = await createRosterPlanningProductModuleV1({ root: process.cwd(), fixtureRoot: cfg.fixtureRoot,
  dataDirectory: copy, enableIterativeDraft: true,
  referenceArmyRecipes: rosterPlanExperimentGroupV274('D').referenceArmyRecipes,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')),
  deliberationFactory: { availability: () => ({ available: true }),
    createForRun: async () => ({ deliberate: async () => { modelBoundaries++;
      throw Object.assign(Error('NEXT_MODEL_BOUNDARY'), { code: 'NEXT_MODEL_BOUNDARY' }); } }) } });
let failure;
console.log(JSON.stringify({ stage: 'product_initialized' }));
try { await product.iterativeDraft.resume(state.sessionId); }
catch (error) { failure = { code: error.code || error.message, detail: error.detail,
  stack: error.stack?.split('\n').slice(0, 10) }; }
console.log(JSON.stringify({ failure, modelBoundaries, providerCalls: 0, copy }));
assert.notEqual(failure?.code, 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED', 'Same product resume must retain D source');
assert.equal(failure?.code, 'NEXT_MODEL_BOUNDARY', 'Stop before purchasing any reply');
assert.equal(await fs.readFile(`${directory}/${file}`, 'utf8'), original, 'Original session unchanged');
