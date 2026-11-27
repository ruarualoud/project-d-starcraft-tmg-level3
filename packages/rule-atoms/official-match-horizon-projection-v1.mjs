// A factual time window, not a tactical objective or an estimate of future play.
export function projectOfficialMatchHorizonV1(state={}){
 const mission=state.officialGameplayDataBundle?.missionScoringProfile;
 const integer=v=>Number.isSafeInteger(v)&&v>=1?v:null;
 const round=integer(Number(state.round)),gameLengthRounds=integer(mission?.gameLengthRounds);
 const terminal=state.terminal===true||state.gameOver===true;
 const known=round!==null&&gameLengthRounds!==null;
 const remainingFutureRounds=terminal?0:known?Math.max(0,gameLengthRounds-round):null;
 return {schemaVersion:'official_match_horizon_v1',round,currentPhase:state.phase||null,gameLengthRounds,terminal,
  isFinalRound:known?round===gameLengthRounds:null,remainingFutureRounds,
  nextRoundAvailable:remainingFutureRounds===null?null:remainingFutureRounds>0,
  futureRoundBoundary:terminal?'match_finished':remainingFutureRounds===0?'no_round_after_mission_end':known?'within_mission_limit':'mission_horizon_unknown',
  earlyVictoryMayEndSooner:true,missionRecordKey:mission?.recordKey||null,missionScoringProfileHash:mission?.missionScoringProfileHash||null,
  authority:'frozen_mission_and_current_native_state',strategyPreference:null};
}
export function projectOfficialActionHorizonV1(state,currentRoundAvailable){
 const h=projectOfficialMatchHorizonV1(state);
 return h.terminal?'match_finished':currentRoundAvailable?'current_round':h.nextRoundAvailable===true?'next_round':h.nextRoundAvailable===false?'beyond_match_end':'unknown_match_horizon';
}
