import { projectStarcraftTmgStateForViewerV3 } from '../room-runtime/in-memory-room-v1.mjs';
import { fail } from '../skill-production/common.mjs';

// V3's historical card projection is preserved. Strategy decisions additionally
// need ready amount, not merely a card face. Project only the requesting seat's
// existing authority fields; never infer a resource amount from a card name.
export function projectStrategyObservationV1(state, seatKey) {
  if (!['player1', 'player2'].includes(seatKey)) fail('STRATEGY_OBSERVATION_SEAT_INVALID');
  const visible = projectStarcraftTmgStateForViewerV3(state, seatKey);
  const own = state.cardResources?.[seatKey];
  if (!Array.isArray(own)) fail('STRATEGY_RESOURCE_OBSERVATION_MISSING');
  const ownResourceState = own.map(c => {
    if (c.sideKey !== seatKey || !Number.isFinite(c.resource) || c.resource < 0
      || !['ready', 'exhausted', 'discarded'].includes(c.readiness)
      || typeof c.resourceType !== 'string') fail('STRATEGY_RESOURCE_OBSERVATION_INVALID');
    return { id: c.id, resource: c.resource, resourceType: c.resourceType, readiness: c.readiness,
      sourceRecordHash: c.sourceRecordHash };
  });
  return { ...visible, strategyObservationVersion: 'starcraft_strategy_observation_v1', ownResourceState };
}
