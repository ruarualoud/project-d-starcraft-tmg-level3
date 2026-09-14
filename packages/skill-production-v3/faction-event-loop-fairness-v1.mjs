import { setImmediate as nextEventLoopTurn } from 'node:timers/promises';

// Awaiting an already-cached role only yields to microtasks. A long replay
// chain must also give sibling worker IPC and handshake timers an event-loop
// turn; otherwise a healthy child can be classified as an initialization timeout.
export function withFactionEventLoopYieldV1(runtime) {
  return { ...runtime, async role(request) {
    await nextEventLoopTurn();
    return runtime.role(request);
  } };
}
