// One affected shared-kernel regression: compare with the unchanged main-tree
// implementation on the actual old frozen fixture, without opening old rooms.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialMarineChargeFixtureV2 } from './support/official-marine-charge-fixture-v2.mjs';
import { createOfficialUnitDestructionLifecycleDataBundleV1 } from '../packages/source-data/official-unit-destruction-lifecycle-data-bundle-v1.mjs';
import { resolveOfficialUnitDestructionSettlementV1 } from '../packages/rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import { applyOfficialUnitDestructionMutationV1 } from '../packages/rule-atoms/official-unit-destruction-lifecycle-rules-executor-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const mainRoot = path.resolve(root, '../..');
const oldKernelPath = path.join(mainRoot, 'packages/rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs');
const oldKernel = await import(pathToFileURL(oldKernelPath).href);
const runtime = JSON.parse(await fs.readFile(path.join(root,
  'build/ticket-28-zerg-wave3-20261117-v1/dark-swarm-reaction/size1-use-faq13/runtime.json'), 'utf8'));
const fixture = await createOfficialMarineChargeFixtureV2({ root: mainRoot, runtimeHash: runtime.runtimeHash });
const bundle = createOfficialUnitDestructionLifecycleDataBundleV1({ dataset: fixture.dataset });
const positions = (x, y) => Array.from({ length: 6 }, (_, i) => ({ xInches: x + i % 3 * 1.5, yInches: y + Math.floor(i / 3) * 1.5 }));
const state = fixture.battleState({ round: 2, activeSideKey: 'player1', pieces: [
  { id: 'survivor', sideKey: 'player1', positions: positions(5, 5) },
  { id: 'dead', sideKey: 'player2', positions: positions(30, 20) },
] });
state.unitDestructionLifecycleHistory = [];
const dead = state.pieces.find(row => row.id === 'dead'), survivor = state.pieces.find(row => row.id === 'survivor');
dead.models.forEach(row => Object.assign(row, { isDestroyed: true, isOnField: false }));
Object.assign(dead, { currentModels: 0, currentSupply: 0, isDestroyed: true, isOnField: false,
  destroyedModelIds: dead.models.map(row => row.id).sort(), statuses: [{ id: 'local' }] });
survivor.statuses = [{ id: 'preserved', sourcePieceId: dead.id },
  { id: 'explicit-end', sourcePieceId: dead.id, endsWhenSourceDestroyed: true }];
state.board.tokens.push({ id: 'removed', createdByPieceId: dead.id },
  { id: 'stays', createdByPieceId: dead.id, stayInPlay: true });
state.board.effectMarkers.push({ id: 'local-marker', targetPieceId: dead.id },
  { id: 'outward-marker', sourcePieceId: dead.id, targetPieceId: survivor.id });
const input = { state, unitDestructionLifecycleDataBundle: bundle, rulesOwnedStateRequested: true,
  procedureKind: 'settle_unit_destruction', pieceId: dead.id, triggerReceiptHash: 'b'.repeat(64), triggerAuthority: 'casualty_resolution' };
const old = oldKernel.resolveOfficialUnitDestructionSettlementV1(input);
const current = resolveOfficialUnitDestructionSettlementV1(input);
assert.deepEqual(current, old);
const next = structuredClone(state);
applyOfficialUnitDestructionMutationV1(next, current.mutation);
assert.equal(next.pieces.find(row => row.id === 'dead').destructionLifecycleSettled, true);
assert.deepEqual(next.pieces.find(row => row.id === 'survivor').statuses.map(row => row.id), ['preserved']);
assert(next.board.tokens.some(row => row.id === 'stays'));
assert(!next.board.tokens.some(row => row.id === 'removed'));
const result = { actualOldFrozenDatasetHash: fixture.dataset.datasetHash,
  legacyKernelRef: path.relative(root, oldKernelPath), legacyKernelSourceHash: hash(await fs.readFile(oldKernelPath, 'utf8')),
  exactWholeResultAndMutation: true, resultHash: current.resultHash, defaultIdentityAndEffectsUnchanged: true,
  modelCalls: 0 };
await atomicWrite(path.join(root, 'build/ticket-28-zerg-wave3-20261118-v1/consume-payment/legacy-destruction-equivalence.json'),
  JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ exactWholeResultAndMutation: true, modelCalls: 0 }));
