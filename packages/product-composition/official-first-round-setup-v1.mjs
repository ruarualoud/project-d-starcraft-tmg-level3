import { missionActivationPrecedesPriorityV13 } from '../rule-atoms/official-mission-round-start-policy-v13.mjs';

// Shared by actual room startup and private pregame experiments. Preparation
// opens the existing Native mission-start action; it does NOT grant Supply,
// Command Points, placement, initiative choices or a completed game history.
export function prepareOfficialCurrentProductFirstRoundV1(source) {
  if(source?.phase!=='setup'||source.stage!=='army_in_reserves'
    ||Number(source.round)!==1||!['player1','player2'].includes(source.firstPlayerSideKey)
    ||!Array.isArray(source.pieces)||source.pieces.some(piece=>piece.isOnField===true)
    ||source.terminal===true||source.gameOver===true) {
    throw Object.assign(Error('CURRENT_PRODUCT_FIRST_ROUND_SETUP_REQUIRED'),
      {code:'CURRENT_PRODUCT_FIRST_ROUND_SETUP_REQUIRED'});
  }
  const state=structuredClone(source);
  state.phase='start_of_round';
  state.stage='mission_start_of_round';
  state.phaseFirstActorByRound={};
  state.activeSideKey=state.firstPlayerSideKey;
  delete state.officialRoundSupplyState;
  if (missionActivationPrecedesPriorityV13(state)) {
    state.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
      round: 1, step: 'mission_before_priority', trainingTruth: false };
  }
  return state;
}
