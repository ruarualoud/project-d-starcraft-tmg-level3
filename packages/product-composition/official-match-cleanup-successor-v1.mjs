import { initiativeRollOffOutcomeV1 } from '../rule-atoms/initiative-roll-off-kernel-v1.mjs';
import { missionActivationPrecedesPriorityV13 } from '../rule-atoms/official-mission-round-start-policy-v13.mjs';
const SIDE_KEYS = Object.freeze(['player1', 'player2']);
const clone = value => structuredClone(value);
const fail = code => { throw Error(code); };
function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: String(state.phase || ""),
    action: clone(action),
    events: clone(events),
  });
}

export function completeOfficialCurrentProductCleanupStateV1(stateInput) {
      const next = clone(stateInput);
      for (const piece of next.pieces) {
        piece.activatedPhases = { movement: false, assault: false, combat: false };
      }
      for (const sideKey of SIDE_KEYS) next.players[sideKey].passedPhases = {};
      next.firstPassSideByPhase = {};
      next.activeSideKey = null;
      delete next.selectedRosterActivationWindow;
      delete next.pendingCurrentProductRangedSequence;
      next.currentProductMatchLifecycle = {
        schema: "starcraft_tmg_current_product_match_lifecycle_v1",
        round: Number(next.round), step: "determine_initiative",
        trainingTruth: false,
      };
      if (missionActivationPrecedesPriorityV13(next)) {
        next.round = Number(next.round) + 1;
        next.phase = 'start_of_round';
        next.stage = 'mission_start_of_round';
        next.activeSideKey = next.firstPlayerSideKey;
        next.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
          round: Number(next.round), step: 'mission_before_priority', trainingTruth: false };
      }
      return next;
}

export function resolveOfficialCurrentProductInitiativeV1(stateInput, source, options = {}, hooks = {}) {
  const state = clone(stateInput);
  const { openRoundActivation, missionProgress } = hooks;
      const scores = SIDE_KEYS.map((sideKey) => Number(state.scores[sideKey]));
      let nextFirstPlayer = scores[0] < scores[1] ? "player1"
        : scores[1] < scores[0] ? "player2" : null;
      const events = [];
      if (!nextFirstPlayer) {
        const outcomes = (options.chanceReveals || []).map((entry) => Number(entry.outcome));
        const {player1Total,player2Total,winnerSideKey}=initiativeRollOffOutcomeV1(outcomes);
        if (!winnerSideKey) {
          events.push({ type: "current_product_initiative_roll_tied",
            round: Number(state.round), outcomes, player1Total, player2Total,
            trainingTruth: false });
          appendLog(state, source, events);
          return { state, events };
        }
        nextFirstPlayer = winnerSideKey;
        events.push({ type: "current_product_initiative_roll_resolved",
          round: Number(state.round), outcomes, player1Total, player2Total,
          nextFirstPlayer, trainingTruth: false });
      } else {
        events.push({ type: "current_product_lower_score_receives_initiative",
          round: Number(state.round), scores: clone(state.scores), nextFirstPlayer,
          trainingTruth: false });
      }
      state.firstPlayerSideKey = nextFirstPlayer;
      if (missionActivationPrecedesPriorityV13(state) && state.phase === 'start_of_round') {
        if (missionProgress(state)?.startRoundApplied !== true) fail('MISSION_PRIORITY_BEFORE_ACTIVATION_FORBIDDEN');
        events.push(openRoundActivation(state));
        delete state.currentProductMatchLifecycle;
        appendLog(state, source, events);
        return { state, events };
      }
      state.round = Number(state.round) + 1;
      state.phase = "start_of_round";
      state.stage = "mission_start_of_round";
      state.activeSideKey = nextFirstPlayer;
      delete state.currentProductMatchLifecycle;
      appendLog(state, source, events);
      return { state, events };
}
