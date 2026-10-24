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
  return state;
}
