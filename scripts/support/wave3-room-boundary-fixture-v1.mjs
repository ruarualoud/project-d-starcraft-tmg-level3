// Isolated engineering Room support. The authority comes from the actual
// product factory. These keys and grants serve only this local test database.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createPrivateKey } from 'node:crypto';
import { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } from
  '../../packages/authoritative-engine/transition-v1.mjs';
import { createStarcraftTmgRoomRuntime } from '../../packages/room-runtime/in-memory-room-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from '../../packages/room-store/sqlite-room-store-v1.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1 }
  from '../../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { atomicWrite } from '../lib/development-context.mjs';
import { productBoundaryError } from '../lib/product-boundary-check.mjs';

export function declareWave3EngineeringCoherencyV1(state, { planIdPrefix } = {}) {
  if (!planIdPrefix) throw Error('ENGINEERING_COHERENCY_PLAN_PREFIX_REQUIRED');
  for (const piece of state.pieces.filter(row => row.isOnField && !row.isDestroyed)) {
    const models = piece.models.filter(model => model.isOnField !== false && !model.isDestroyed);
    const placements = models.map(model => ({ modelId: model.id,
      xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: model.baseRotationDegrees ?? 0 }));
    let result;
    try {
      result = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor: piece,
        dataBundle: state.officialModelBaseGeometryDataBundle,
        plan: { planId: planIdPrefix + piece.id, leadingModelId: models[0]?.id, placements } });
    } catch (cause) {
      throw productBoundaryError('Declared scene geometry rejected for ' + piece.id, {
        kind: 'fixture', code: cause.message.split(':', 1)[0], stage: 'scene_geometry',
        basis: 'Official geometry rejected the declared snapshot placements', cause,
      });
    }
    if (!result.inCoherency) {
      const outside = result.assessments.filter(row => !row.whollyWithinLeading).map(row => row.modelId);
      throw productBoundaryError('Declared scene outside coherency for ' + piece.id + ': ' + outside.join(', '), {
        kind: 'fixture', code: 'ENGINEERING_SCENE_OUT_OF_COHERENCY', stage: 'scene_geometry',
        basis: 'Official snapshot assessment against the declared leading model',
      });
    }
    piece.inCoherency = true;
    piece.coherencyStatus = { schemaVersion: 'starcraft_tmg_unit_coherency_status_v1', status: 'in_coherency',
      isOutOfCoherency: false, declaredSnapshotResultHash: result.resultHash };
  }
}

function selectChoice(space, kind, choice, select) {
  if (!['finite', 'parameterized'].includes(kind) || (!choice && typeof select !== 'function')) {
    throw productBoundaryError('Supply a Room action kind and selector', {
      code: 'ENGINEERING_CHOICE_INVALID', kind: 'fixture', stage: 'legal_space',
      basis: 'Room fixture omitted the action kind or selector',
    });
  }
  const rows = kind === 'finite' ? space.finiteActions : space.parameterDomains;
  if (!choice) {
    const row = rows.find(select);
    if (row) return row;
  } else {
    const keys = ['actionType', 'pieceId', 'definitionId', 'weaponName'];
    if (select || !choice.actionType || Object.entries(choice)
      .some(([key, value]) => !keys.includes(key) || typeof value !== 'string' || !value)) {
      throw productBoundaryError('Supply one semantic action choice', {
        code: 'ENGINEERING_CHOICE_INVALID', kind: 'fixture', stage: 'legal_space',
        basis: 'Room fixture supplied unsupported or conflicting selectors',
      });
    }
    const choices = rows.filter(row => {
      const action = kind === 'finite' ? row.action : row;
      return Object.entries(choice).every(([key, value]) => action[key] === value);
    });
    if (choices.length === 1) return choices[0];
    if (choices.length > 1) throw productBoundaryError('Ambiguous Room action ' + choice.actionType, {
      code: 'ENGINEERING_CHOICE_AMBIGUOUS', kind: 'fixture', stage: 'legal_space',
      basis: 'More than one row matched the requested semantic action',
    });
  }
  throw productBoundaryError('Semantic choice missing from actual Room LegalSpace', {
    code: 'ENGINEERING_CHOICE_MISSING', stage: 'legal_space',
    basis: 'LegalSpace did not contain the requested choice. Check the scene and runtime.',
  });
}

function requireRoomResult(result, stage) {
  if (result.ok === true) return;
  const code = result.reason || result.code || 'ENGINEERING_ROOM_REJECTED';
  const runtimeInvalid = code === 'RULE_RUNTIME_INVALID' && stage === 'preview';
  throw productBoundaryError(result.message || code, {
    code, stage, kind: runtimeInvalid ? 'product' : 'unclassified',
    basis: runtimeInvalid ? 'Authority rejected the rules runtime during preview' : 'Room operation rejected',
  });
}

export function createWave3ComponentEngineeringAuthorityV1({ context, state, scenario }) {
  const versions = context.dataset.dataVersions;
  const body = { source: 'server_factory', releaseId: context.manifest.releaseId,
    releaseManifestHash: context.manifest.manifestHash,
    dataVersion: [versions.unitsVersion, versions.cardsVersion, versions.rulesVersion].join('/'), state,
    dependencies: {
      sourceSnapshot: { artifactId: 'wave3-component-command-center', content: context.snapshot },
      dataSnapshot: { artifactId: 'wave3-component-source-data', content: {
        normalizedDatasetHash: context.dataset.datasetHash, sourceSnapshotHash: context.snapshot.snapshotHash,
        releaseManifest: context.manifest, combat: state.officialCombatProfileBundle,
        unitFacts: state.officialUnitCardSupplyDataBundle, cards: state.officialCardBuildPaymentDataBundle } },
      geometryArtifact: { artifactId: 'wave3-component-model-geometry', content: state.officialModelBaseGeometryDataBundle },
    }, serverSeatPlan: ['player1', 'player2'].map(seatKey => ({
      seatKey, label: seatKey, roleMode: 'player', principalType: 'human' })),
    conditionalEngineeringScenario: scenario, trainingTruth: false };
  return { ...body, receiptHash: hashStarcraftTmgContract(body) };
}

export function openWave3EngineeringStoreV1({ directory, filename, readOnly = false }) {
  const target = filename === ':memory:' ? filename : path.join(directory, filename);
  const database = readOnly ? new DatabaseSync(target, { readOnly: true }) : undefined;
  try {
    return createSqliteStarcraftTmgRoomStore({ filename: target, database, encryption: {
      key: Buffer.alloc(32, 0x33), keyId: 't28-engineering-storage', trustLevel: 'development_fixture',
    } });
  } catch (error) {
    database?.close();
    throw error;
  }
}

export function openWave3EngineeringRoomV1({ directory, filename, rulesRuntime, readOnly = false }) {
  const privateKey = createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + '5a'.repeat(32), 'hex'),
    format: 'der', type: 'pkcs8' });
  const engine = createStarcraftTmgAuthoritativeEngine({ rulesRuntime, cryptoOptions: {
    privateKey, hmacSecret: Buffer.alloc(32, 0x44), keyId: 't28-engineering-only', trustLevel: 'development_fixture',
  } });
  const store = openWave3EngineeringStoreV1({ directory, filename, readOnly });
  const room = createStarcraftTmgRoomRuntime({ authorityEngine: engine, roomStore: store });
  const memoryCredentials = filename === ':memory:' ? new Map() : null;
  async function prepare({ roomId, credential, choice, select, parameters, kind = 'parameterized' }, aggregate) {
    const input = { roomId, seatToken: credential.seatToken };
    const legal = await room.legalSpace(input);
    requireRoomResult(legal, 'legal_space');
    const domain = selectChoice(legal.legalSpace, kind, choice, select);
    const proposal = kind === 'finite' ? { kind, actionKey: domain.actionKey }
      : { kind, domainId: domain.domainId, parameters: parameters(domain) };
    const preview = await room.previewAction({ ...input, proposal,
      expectedStateRevision: aggregate.stateRevision, expectedStateHash: aggregate.envelope.stateHash,
      expectedMatchBindingHash: aggregate.envelope.matchBindingHash, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash });
    requireRoomResult(preview, 'preview');
    return { input, domain, preview };
  }
  async function restoreDependencies(roomId, authority) {
    const aggregate = await store.loadRoom(roomId);
    const binding = aggregate.envelope.matchBinding;
    // The engine's dependency registry is process-local. Rehydrate through its
    // original factory inputs, and require the exact original signed binding.
    // This registers artifacts only; no envelope, room or receipt is replaced.
    const restored = engine.createMatchBinding({ roomId, matchId: binding.matchId,
      gameId: binding.gameId, dataVersion: authority.dataVersion, dependencies: authority.dependencies,
      rulesDisplay: authority.rulesDisplay, rngSchemeId: binding.rngSchemeId });
    assert.equal(restored.bindingHash, binding.bindingHash, 'frozen dependency reconstruction changed the Room binding');
  }
  return {
    room, store, engine, restoreDependencies,
    async create(roomId, authority, { matchId } = {}) {
      const file = path.join(directory, roomId + '.seats.private.json');
      if (await store.loadRoom(roomId)) {
        await restoreDependencies(roomId, authority);
        if (memoryCredentials) return memoryCredentials.get(roomId);
        return JSON.parse(await fs.readFile(file, 'utf8'));
      }
      const result = await room.createRoom({ roomId, ...(matchId ? { matchId } : {}), initialStateAuthority: authority,
        serverSeatPlan: authority.serverSeatPlan });
      assert.equal(result.ok, true, JSON.stringify(result));
      const credentials = Object.fromEntries(Object.values(result.credentials).map(value => [value.seatKey, value]));
      if (memoryCredentials) memoryCredentials.set(roomId, credentials);
      else await atomicWrite(file, JSON.stringify(credentials));
      return credentials;
    },
    async preflight(request) {
      if (filename !== ':memory:') throw Error('ENGINEERING_PREFLIGHT_REQUIRES_MEMORY_ROOM');
      const before = await store.loadRoom(request.roomId);
      const { domain, preview } = await prepare(request, before);
      const after = await store.loadRoom(request.roomId);
      assert.equal(after.stateRevision, before.stateRevision);
      assert.equal(after.envelope.stateHash, before.envelope.stateHash);
      return { domain, action: preview.preview.core.action, stateRevision: after.stateRevision };
    },
    async commit(request) {
      const { roomId, credential, operationKey } = request;
      const aggregate = await store.loadRoom(roomId);
      const identity = hashStarcraftTmgContract({ roomId, grantId: credential.grantId, idempotencyKey: operationKey });
      const operationFile = path.join(directory, 'operation-' + identity + '.json');
      const prior = aggregate.idempotency[identity];
      if (prior) return { result: prior.result, ...JSON.parse(await fs.readFile(operationFile, 'utf8')),
        resumedSavedCommit: true };
      const { input, domain, preview } = await prepare(request, aggregate);
      await atomicWrite(operationFile, JSON.stringify({ domain, preview: preview.preview }));
      let confirmationId;
      if (preview.confirmationRequired) {
        const confirmed = await room.confirmPreview({ ...input, previewId: preview.preview.previewId,
          previewToken: preview.preview.previewToken, previewContentHash: preview.preview.previewSeal.contentHash });
        requireRoomResult(confirmed, 'confirm');
        confirmationId = confirmed.confirmation.confirmationId;
      }
      const control = await room.claimControl({ ...input, sessionId: 't28-engineering' });
      requireRoomResult(control, 'claim_control');
      const applyRequest = { ...input, previewId: preview.preview.previewId, confirmationId,
        leaseId: control.controlLease.leaseId, leaseFence: control.controlLease.leaseFence,
        expectedStateRevision: preview.preview.core.expectedStateRevision, idempotencyKey: operationKey };
      const result = await room.applyAction(applyRequest);
      requireRoomResult(result, 'apply');
      const duplicate = await room.applyAction(applyRequest);
      assert.equal(duplicate.ok, true, JSON.stringify(duplicate));
      assert.equal(duplicate.idempotentReplay, true);
      return { result, domain, preview: preview.preview, idempotentReplayVerified: true };
    },
    close: () => store.close(),
  };
}

// Share the actual Room/Host handoff across numeric weapon proofs. Each caller
// supplies its semantic choices and checks the weapon-specific rule results.
export async function commitWave3RangedBatchV1({ directory, native, runtime, roomId, credentials,
  attackerSideKey, attackerPieceId, targetPieceId, weaponName, operationKey, selectPoolParameters, attackMode }) {
  async function checkpoint(name, value) {
    await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  }
  const beforeFile = path.join(directory, operationKey + '-before.json');
  let before;
  try { before = JSON.parse(await fs.readFile(beforeFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const current = await native.store.loadRoom(roomId);
  if (!before) {
    before = { envelope: current.envelope };
    await checkpoint(operationKey + '-before.json', before);
  }
  const attackParameters = { targetUnitId: targetPieceId, ...(attackMode ? { attackMode } : {}) };
  const query = runtime.query(before.envelope.state, { queryKind: 'ranged_attack_preview',
    pieceId: attackerPieceId, weaponName, parameters: attackParameters });
  assert.deepEqual(await native.store.loadRoom(roomId), current, 'query changed the Room aggregate');
  const committed = await native.commit({ roomId, credential: credentials[attackerSideKey], operationKey,
    select: row => row.pieceId === attackerPieceId && row.weaponName === weaponName && row.attackMode === attackMode,
    parameters: () => attackParameters });
  assert.deepEqual(committed.preview.core.action, query.result.action);
  for (let step = 0; step < 12; step++) {
    const after = await native.store.loadRoom(roomId);
    const state = after.envelope.state;
    if (runtime.precisionChoices?.hasPending(state)) {
      const menu = runtime.enumerate(state);
      const domain = menu.parameterDomains[0];
      await checkpoint(operationKey + '-pool-' + after.stateRevision + '-checkpoint.json', { envelope: after.envelope });
      const common = { roomId, credential: credentials[state.activeSideKey],
        operationKey: operationKey + '-pool-' + after.stateRevision };
      if (domain) {
        assert.equal(typeof selectPoolParameters, 'function', 'caller must choose semantic pool parameters');
        const selected = await native.commit({ ...common, select: row => row.domainId === domain.domainId,
          parameters: () => selectPoolParameters(domain, state) });
        assert.equal(selected.preview.core.chanceTicket, null);
      } else {
        assert.equal(menu.candidates.length, 1, 'finite pool continuation must be unique');
        await native.commit({ ...common, kind: 'finite', select: () => true });
      }
      continue;
    }
    if (!state.pendingCurrentProductRangedCasualtyChoice) {
      const event = state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack'
        && row.pieceId === attackerPieceId && row.targetId === targetPieceId && row.weaponName === weaponName).at(-1);
      assert.ok(event, 'actual ranged resolution event missing');
      await checkpoint(operationKey + '-checkpoint.json', { envelope: after.envelope });
      return { before, after, event, query, committed };
    }
    const domain = runtime.enumerate(state).parameterDomains.find(row =>
      row.parameterSchema.required.includes('casualtySelectionHash'));
    assert.ok(domain, 'native casualty choice missing');
    await checkpoint(operationKey + '-casualty-checkpoint.json', { envelope: after.envelope });
    const selected = await native.commit({ roomId, credential: credentials[state.activeSideKey],
      operationKey: operationKey + '-casualty-' + after.stateRevision,
      select: row => row.domainId === domain.domainId,
      parameters: row => ({ casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }) });
    assert.equal(selected.preview.core.chanceTicket, null);
  }
  assert.fail('finite casualty continuation did not settle');
}

export async function completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
  operationPrefix, selectPoolParameters, selectPoolDomain = domains => domains[0], stopBeforeDamageReaction = false }) {
  for (let step = 0; step < 32; step++) {
    const current = await native.store.loadRoom(roomId);
    const state = current.envelope.state;
    if (stopBeforeDamageReaction && state.pendingOfficialMeleeDamageReaction) return current;
    if (!runtime.meleeChoices?.hasPending(state) && !state.pendingAction) return current;
    const menu = runtime.enumerate(state);
    const domain = selectPoolDomain(menu.parameterDomains, state);
    const operationKey = operationPrefix + '-' + current.stateRevision;
    await atomicWrite(path.join(directory, operationKey + '-checkpoint.json'),
      JSON.stringify({ envelope: current.envelope }, null, 2) + '\n');
    const common = { roomId, credential: credentials[state.activeSideKey], operationKey };
    if (domain) {
      const casualty = domain.parameterSchema.required.includes('casualtySelectionHash');
      if (!casualty) assert.equal(typeof selectPoolParameters, 'function', 'caller must choose semantic pool parameters');
      const applied = await native.commit({ ...common, select: row => row.domainId === domain.domainId,
        parameters: row => casualty ? { casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }
          : selectPoolParameters(row, state) });
      assert.equal(applied.preview.core.chanceTicket, null);
    } else {
      assert.equal(menu.candidates.length, 1, 'finite melee continuation must be unique');
      await native.commit({ ...common, kind: 'finite', select: () => true });
    }
  }
  assert.fail('finite melee continuation did not settle');
}
