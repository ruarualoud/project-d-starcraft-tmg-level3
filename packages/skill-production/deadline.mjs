import { performance } from 'node:perf_hooks';
import { fail, integer } from './common.mjs';

// One deadline per actual role session, shared by both execution arms. Never
// race-and-forget a billable call: cancellation must reach the transport and
// its attempt must settle before a caller closes SQLite or releases its lease.
export async function withSessionDeadline(maxWallMs, operation) {
  integer(maxWallMs, 1, 3_600_000);
  const started = performance.now(), controller = new AbortController();
  const check = () => {
    if (performance.now() - started >= maxWallMs) controller.abort();
    if (controller.signal.aborted) fail('SESSION_WALL_TIME_EXHAUSTED');
  };
  const timer = setTimeout(() => controller.abort(), maxWallMs);
  const guard = fn => async (...args) => {
    check();
    const result = await fn(...args);
    check();
    return result;
  };
  try {
    const result = await operation({ signal: controller.signal, check, guard });
    check();
    return { ...result, deadline: { maxWallMs,
      policy: 'abort_egress_then_await_accounting_settlement' } };
  } finally { clearTimeout(timer); }
}
