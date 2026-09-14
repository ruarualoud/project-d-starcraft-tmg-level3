import { performance } from 'node:perf_hooks';
import { integer, seal } from './common.mjs';

export const PHASED_DSH_SESSION_POLICY_V1 = seal({
  version: 'phased_dsh_session_policy_v1',
  preparationMaxWallMs: 180_000,
  executionBudget: 'limits.maxWallMs',
  finalizationMaxWallMs: 60_000,
  disposableChildMaximumWallMs: 180_000,
  clockStarts: 'preparation_at_run_entry_execution_at_first_bridge_finalization_after_final_command',
  timeoutPolicy: 'abort_egress_then_await_operation_and_accounting_settlement',
  finalCommandMustBeObserved: true,
  modelCallsAfterFinalCommandAllowed: false,
  originalProviderFailurePreserved: true,
  trainingTruth: false,
});

const systemClock = Object.freeze({ now: () => performance.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: timer => clearTimeout(timer) });
const timeoutCodes = Object.freeze({ preparation: 'DSH_PREPARATION_TIME_EXHAUSTED',
  execution: 'SESSION_WALL_TIME_EXHAUSTED', finalization: 'DSH_FINALIZATION_TIME_EXHAUSTED' });

// Execution and cleanup are awaited, never raced-and-forgotten. The operation
// must deliver a validated final command before its result may be accepted.
export async function withPhasedSessionDeadlineV1({ maxWallMs,
  preparationMaxWallMs = PHASED_DSH_SESSION_POLICY_V1.preparationMaxWallMs,
  finalizationMaxWallMs = PHASED_DSH_SESSION_POLICY_V1.finalizationMaxWallMs,
  clock = systemClock }, operation) {
  integer(maxWallMs, 1, PHASED_DSH_SESSION_POLICY_V1.disposableChildMaximumWallMs);
  integer(preparationMaxWallMs, 1, PHASED_DSH_SESSION_POLICY_V1.preparationMaxWallMs);
  integer(finalizationMaxWallMs, 1, PHASED_DSH_SESSION_POLICY_V1.finalizationMaxWallMs);
  if (typeof operation !== 'function' || ['now', 'setTimer', 'clearTimer'].some(key => typeof clock?.[key] !== 'function'))
    throw new TypeError('Invalid session lifecycle operation or clock');
  const limits = { preparation: preparationMaxWallMs, execution: maxWallMs, finalization: finalizationMaxWallMs };
  const durations = { preparation: 0, execution: 0, finalization: 0 };
  const controller = new AbortController(), started = clock.now();
  let phase = 'preparation', phaseStarted = started, timer, timeoutPhase = null;
  let primaryFailure = null, failedPhase = null, finalCommandObserved = false;
  const expire = () => { timeoutPhase ||= phase; controller.abort(); };
  const arm = () => { clock.clearTimer(timer); timer = clock.setTimer(expire, limits[phase]); };
  const transition = next => {
    const current = clock.now(); durations[phase] += current - phaseStarted;
    phase = next; phaseStarted = current; arm();
  };
  const check = () => {
    if (primaryFailure) throw primaryFailure;
    if (clock.now() - phaseStarted >= limits[phase]) expire();
    if (timeoutPhase) throw Object.assign(new Error(timeoutCodes[timeoutPhase]), { code: timeoutCodes[timeoutPhase] });
  };
  const rememberFailure = error => {
    if (!primaryFailure) { primaryFailure = error; failedPhase = phase; }
    if (phase === 'execution') transition('finalization');
  };
  const guard = fn => async (...args) => {
    try {
      check();
      if (phase === 'finalization') throw Object.assign(new Error('DSH_BRIDGE_AFTER_FINAL_COMMAND'), { code: 'DSH_BRIDGE_AFTER_FINAL_COMMAND' });
      if (phase === 'preparation') transition('execution');
      const result = await fn(...args);
      check();
      return result;
    } catch (error) { rememberFailure(error); throw error; }
  };
  const beginFinalization = () => {
    try {
      check();
      if (phase !== 'execution' || finalCommandObserved)
        throw Object.assign(new Error('DSH_FINAL_COMMAND_PHASE_INVALID'), { code: 'DSH_FINAL_COMMAND_PHASE_INVALID' });
      finalCommandObserved = true; transition('finalization');
    } catch (error) { rememberFailure(error); throw error; }
  };
  const receipt = status => {
    const ended = clock.now();
    return seal({ version: 'phased_dsh_session_lifecycle_v1', policyHash: PHASED_DSH_SESSION_POLICY_V1.hash,
      status, phase, limitsMs: limits,
      durationsMs: { ...durations, [phase]: durations[phase] + ended - phaseStarted },
      totalMs: ended - started, finalCommandObserved, failedPhase, timeoutPhase,
      operationDrained: true, trainingTruth: false });
  };
  arm();
  try {
    const result = await operation(Object.freeze({ signal: controller.signal, check, guard, beginFinalization }));
    if (primaryFailure) throw primaryFailure;
    check();
    if (!finalCommandObserved)
      throw Object.assign(new Error('DSH_FINAL_COMMAND_NOT_OBSERVED'), { code: 'DSH_FINAL_COMMAND_NOT_OBSERVED' });
    return { ...result, deadline: { maxWallMs, policy: PHASED_DSH_SESSION_POLICY_V1.timeoutPolicy },
      lifecycle: receipt('completed') };
  } catch (error) {
    rememberFailure(error);
    const reported = primaryFailure && typeof primaryFailure === 'object' && Object.isExtensible(primaryFailure)
      ? primaryFailure : Object.assign(new Error('DSH_SESSION_LIFECYCLE_FAILED'), { code: primaryFailure?.code || 'DSH_SESSION_LIFECYCLE_FAILED' });
    reported.lifecycle = receipt('failed');
    throw reported;
  } finally { clock.clearTimer(timer); }
}
