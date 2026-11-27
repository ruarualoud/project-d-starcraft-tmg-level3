import assert from 'node:assert/strict';
import path from 'node:path';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { createOfficialRoundSupplyStateV1, refreshOfficialRoundSupplyOccupancyV1 }
  from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { root, output, roomId, read, save, sourceProduct, runtimeFor, registerScene,
  openProduct, checkpoint, invoke, moveParameters, replay } from './verify-wave3-nova-holo-decoy-v1.mjs';

const ids = ['linked', 'parent-absent'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const child = state => state.pieces.find(row => row.officialUnitRecordKey === 'army_units:holo_decoy');
const sourceCheckpoint = output + 'assault-use-before/checkpoint-r4.json';
const gate = await runProductBoundaryCheck({ directory: path.join(root, output, 'linked-activation-verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: sourceCheckpoint,
  contractVersion: 'T28-W3-08-summoned-unit-parent-linked-activation-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const original = (await read(sourceCheckpoint)).envelope;
    const rows = [];
    for (const id of ids) {
      let state = structuredClone(original.state);
      state.phase = 'assault'; state.activeSideKey = 'player1';
      state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
      for (const piece of state.pieces) piece.activatedPhases.assault = false;
      if (id === 'parent-absent') {
        const parent = state.pieces.find(row => row.id === 'nova');
        parent.isOnField = false; parent.isDestroyed = true; parent.currentModels = 0; parent.currentSupply = 0;
        parent.models.forEach(model => Object.assign(model, { isOnField: false, isDestroyed: true, remainingWounds: 0 }));
      }
      state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state });
      const runtime = runtimeFor(context, state);
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, missionSupplyProfile: state.officialMissionSupplyProfile,
        rulesRuntimeHash: runtime.descriptor.runtimeHash });
      const menu = runtime.enumerate(state);
      assert.equal(menu.parameterDomains.some(row => row.pieceId === child(state).id), id === 'parent-absent');
      await registerScene(context, id, { state, scenario: { sourceCheckpoint, sourceEnvelopeHash: original.stateHash,
        derivedPhase: 'assault', originalMovementPrefixNative: true,
        parentAbsenceDeclared: id === 'parent-absent', fullRound: false, modelCalls: 0 } });
      rows.push({ id, sourceCheckpoint, childInitiallyAvailable: id === 'parent-absent' });
    }
    const ref = await save('linked-compile.json', rows); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const rows = [];
    for (const id of ids) {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        let current = await checkpoint(branch);
        if (id === 'linked') {
          const parent = current.envelope.state.pieces.find(row => row.id === 'nova');
          await invoke(branch, credentials, 'parent-run', row => row.actionType === 'run' && row.pieceId === 'nova',
            () => moveParameters(parent, -1000, 0));
          await invoke(branch, credentials, 'parent-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
          current = await checkpoint(branch);
          assert.equal(current.envelope.state.activeSideKey, 'player1');
          assert.equal(current.envelope.state.pendingOfficialSummonedAction.purpose, 'linked_activation');
          const menu = branch.runtime.enumerate(current.envelope.state);
          assert(menu.parameterDomains.length > 0);
          assert(menu.parameterDomains.every(row => row.pieceId === child(current.envelope.state).id));
        }
        const parameters = moveParameters(child(current.envelope.state), 0, 1000);
        await invoke(branch, credentials, 'child-run', row => row.actionType === 'run' && row.pieceId === child(current.envelope.state).id,
          () => parameters);
        current = await checkpoint(branch);
        assert.equal(current.envelope.state.selectedRosterActivationWindow.pieceId, child(current.envelope.state).id);
        rows.push({ id, revision: current.stateRevision, actualAssaultRun: true, nextChildWindow: true });
      } finally { branch.close(); }
    }
    const ref = await save('linked-consume.json', rows); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const rows = [];
    for (const id of ids) {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const current = await checkpoint(branch); const pieceId = child(current.envelope.state).id;
        await invoke(branch, credentials, 'child-finish', row => row.actionType === 'finish_activation' && row.pieceId === pieceId, () => ({}));
        const after = await checkpoint(branch);
        assert.equal(after.envelope.state.activeSideKey, 'player2');
        assert.equal(after.envelope.state.pendingOfficialSummonedAction, undefined);
        rows.push({ id, revision: after.stateRevision, nextPlayer: 'player2', parentContinuationReleased: true });
      } finally { branch.close(); }
    }
    const ref = await save('linked-successor.json', rows); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const rows = [];
    for (const id of ids) { const branch = await product.branch(id); try { rows.push(await replay(branch)); } finally { branch.close(); } }
    const ref = await save('linked-cold-recovery.json', rows); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'summoned-linked-activation', status: gate.status, failures: gate.failures.length }));
