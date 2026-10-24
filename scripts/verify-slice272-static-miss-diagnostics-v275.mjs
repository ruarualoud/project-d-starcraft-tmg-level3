// Concrete production failure: repeated zero-option static searches exposed
// only "bounded_packing_miss", hiding the anchor's actual rejection reason.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { queryStarcraftTmgStaticFormationV1 } from '../packages/online-agent-session/static-formation-query-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base] = process.argv.slice(2);
const state = JSON.parse(await fs.readFile(`${base}/query-contract-audit-v30/native-movement-fixture.private.json`, 'utf8')).state;
const before = hash(state);
const actor = state.pieces.find(p => p.id === 'player1-goliath-1');
const blocker = state.pieces.find(p => p.id === 'player1-goliath-2');
assert(actor && blocker && blocker.isOnField);
const anchors = [{ xInches: .01, yInches: .01 },
  { xInches: blocker.models[0].xInches, yInches: blocker.models[0].yInches },
  { xInches: actor.models[0].xInches, yInches: actor.models[0].yInches }];
const result = queryStarcraftTmgStaticFormationV1({ state, arguments: { unitId: actor.id, anchors } });
assert.equal(result.misses.length, 2);
const edge = result.misses.find(m => m.anchorIndex === 0);
assert.equal(edge.diagnostic?.anchorRejection?.reason, 'base_outside_battlefield',
  'A proven fixed-anchor base-boundary rejection must be explained, not only called a packing miss');
const collision = result.misses.find(m => m.anchorIndex === 1);
assert.equal(collision.diagnostic?.anchorRejection?.reason, 'base_overlaps_blocker');
assert(collision.diagnostic.anchorRejection.blockers.some(b => b.pieceId === blocker.id));
assert.equal(result.optionCount, 1);
assert.deepEqual(result.formationOptions[0].anchor, anchors[2], 'Do not choose a different anchor for the model');
assert.equal(result.arrivalOrMovementLegalityProven, false);
assert.equal(result.noLegalFormationProven, false);
assert(result.misses.every(m => m.impossibilityProven === false));
assert.equal(hash(state), before, 'Read-only diagnostics must preserve the whole scene');
console.log(JSON.stringify({ case: 'static_miss_diagnostics', pass: true,
  providerCalls: 0, roomActions: 0, misses: result.misses,
  validOptions: result.optionCount, sourceUnchanged: true }));
