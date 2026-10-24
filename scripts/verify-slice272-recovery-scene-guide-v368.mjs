import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { projectRosterTeachCapabilityGuideV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const request = JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const context = request.promptNodes.find(n => n.kind === 'canonical_current_query_context').context;
assert(context.availableScenarioBranches.length > 0);
const guide = projectRosterTeachCapabilityGuideV1(context);
assert.deepEqual(guide.retainedScenarios?.availableScenarioBranches, context.availableScenarioBranches,
  'Query recovery only receives the projected guide; that guide drops the restored-scene directory');
assert.deepEqual(guide.retainedScenarios.availableFoundationBranchRefs, context.availableFoundationBranchRefs);
assert.equal(guide.retainedScenarios.instruction, context.scenarioReferenceInstruction);
assert.equal(guide.retainedScenarios.listingExecutesNothing, true);
console.log(JSON.stringify({ pass: true, actualInput: request.roundKind,
  scenes: context.availableScenarioBranches.length, providerCalls: 0, nativeExecutions: 0 }));
