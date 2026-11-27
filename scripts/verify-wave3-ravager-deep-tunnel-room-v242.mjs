import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/ravager-deep-tunnel-v242/movement';
const roomId = 'ravager-tunnel-direct-movement';
const gate = await read(base + '/ravager-deep-tunnel-v242/opening.json');
const mission = await read(base + '/zagara-standard-admission-v239/admission.json');
const context = await resolveWave3StandardContext(await read(gate.sourceManifest), 'area_ability_inputs');
const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, snapshot: context.snapshot,
  dataset: context.dataset, releaseMatchVersion: gate.version, recipes: await read(gate.recipesRef),
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, missionRecordKey: mission.mission,
  deploymentRecordKey: mission.deployment });
const side = 'player2';
const actor = state.pieces.find(piece => piece.id === 'ravager');
assert.equal(actor.officialUnitRecordKey, 'army_units:ravager');
state.phase = 'movement';
state.stage = 'activation_phases';
state.firstPlayerSideKey = state.activeSideKey = side;
state.phaseFirstActorByRound['1:movement'] = { round: 1, phase: 'movement', chosenFirstActorSideKey: side, markerHolderSideKey: side };
const deployed = actor.models.filter(model => !model.isDestroyed);
Object.assign(actor, { xInches: 10, yInches: 10, isOnField: true, isInReserves: false,
  deploymentStatus: 'deployed', leadingModelId: deployed[0].id });
deployed.forEach((model, index) => Object.assign(model, { isOnField: true, xInches: 10, yInches: 10 + index * 2.4 }));
state.reserveManifestBySide[side].find(row => row.pieceId === actor.id).deploymentStatus = 'deployed';
declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId });
state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, missionSupplyProfile: state.officialMissionSupplyProfile,
  rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
for (const owner of ['player1','player2']) state.players[owner].supply = state.officialRoundSupplyState.supplyPoolBySide[owner];
const bound = await bindWave3StandardActionRoom({ manifestRef: gate.sourceManifest, initial: state, dir, candidateVersion: gate.version,
  scenario: { declaredIsolatedMovement: true, explicitOnTable: actor.id, rosterRef: gate.recipesRef } });
const native = bound.open();
try {
  const seats = await native.create(roomId, bound.authority);
  const from = (await native.store.loadReplayBundle(roomId)).initialEnvelope;
  const domain = bound.runtime.enumerate(from.state).parameterDomains.find(d => d.pieceId === actor.id && d.actionType === 'set_deep_tunnel_burrow');
  assert(domain);
  const parameters = { coordinate: { xMilliInches: 15000, yMilliInches: 10000 },
    paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.choices[0] };
  assert(parameters.paymentCardInstanceIds.length > 0);
  const query = p => bound.runtime.queryDeepTunnelPlacement(from.state, actor.id, p);
  assert.throws(() => query({ ...parameters, coordinate: { xMilliInches: 27000, yMilliInches: 10000 } }), /WHOLE_BASE_RANGE_REQUIRED/);
  const preview = query(parameters);
  assert.equal(preview.mutationAuthority, false);
  assert.equal(preview.stateHash, from.stateHash);
  const commit = await native.commit({ roomId, credential: seats[side], operationKey: 'set-direct-tunnel',
    choice: { actionType: domain.actionType, pieceId: actor.id }, parameters: () => parameters });
  assert.deepEqual(commit.preview.core.action.sourceAction, preview.result.action);
  const end = await native.store.loadRoom(roomId);
  const token = end.envelope.state.board.tokens.find(t => t.tokenKind === 'ravager_burrow' && t.createdByPieceId === actor.id);
  assert.equal(token.baseDiameterMm, 32);
  assert(parameters.paymentCardInstanceIds.every(id => end.envelope.state.cardResources[side].some(
    card => card.cardInstanceId === id && card.readiness === 'exhausted')));
  const next = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
  assert(next.ok, next.message);
  assert(!next.legalSpace.parameterDomains.some(d => d.pieceId === actor.id && d.actionType === domain.actionType));
  await save(dir + '/placement.json', { roomId, revision: end.stateRevision, stateHash: end.envelope.stateHash,
    actor: actor.id, modelCount: deployed.length, tokenId: token.tokenId, tokenDiameterMm: token.baseDiameterMm,
    coordinate: token.coordinate, payment: parameters.paymentCardInstanceIds, queryHash: preview.queryReceiptHash,
    unavailableToRepeat: true, successor: [...new Set(next.legalSpace.parameterDomains.map(d => d.actionType))],
    idempotencyChecked: Boolean(commit.idempotentReplayVerified || commit.resumedSavedCommit), modelCalls: 0 });
} catch (error) {
  if (!existsSync(dir + '/placement.json')) await save(dir + '/stop-' + Date.now() + '.json', { message: error.message });
  throw error;
} finally { native.close(); }
