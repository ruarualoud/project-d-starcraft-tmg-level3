// Retry only name resolution BEFORE any credential-bearing HTTP request exists.
// Use the configured system resolver; never pin stale IPs or bypass DNS/TLS policy.
const TRANSIENT_DNS = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ETIMEOUT', 'ETIMEDOUT',
  'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'ESERVFAIL']);
const safeCode = code => TRANSIENT_DNS.has(code) || code === 'ABORT_ERR'
  ? code : 'UNCLASSIFIED_NETWORK_ERROR';
const errorWith = code => Object.assign(new Error(code), { code });

export function safeProviderDnsRecoveryV1(value) {
  if (!value) return undefined;
  if (!Number.isInteger(value.attempts) || value.attempts < 1 || value.attempts > 3
    || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0) {
    throw new TypeError('Invalid DNS recovery receipt');
  }
  return { version: 1, attempts: value.attempts, retries: value.attempts - 1,
    elapsedMs: Math.floor(value.elapsedMs), recovered: value.recovered === true,
    lastErrorCode: value.lastErrorCode ? safeCode(value.lastErrorCode) : null };
}

export function assertProviderDnsRecoveryV1(value) {
  if (value === undefined) return true; // Historical receipts stay valid.
  const allowed = ['version', 'attempts', 'retries', 'elapsedMs', 'recovered', 'lastErrorCode'];
  const safe = safeProviderDnsRecoveryV1(value);
  if (!safe || Object.keys(value).length !== allowed.length
    || Object.keys(value).some(k => !allowed.includes(k))
    || allowed.some(k => value[k] !== safe[k])) throw new TypeError('Invalid DNS recovery receipt');
  return true;
}

function abortable(operation, signal, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false, timer;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value);
    };
    const abort = () => finish(reject, errorWith('ABORT_ERR'));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(reject, errorWith('ETIMEDOUT')), timeoutMs);
    Promise.resolve().then(operation).then(v => finish(resolve, v), e => finish(reject, e));
  });
}

async function backoff(ms, signal) {
  if (signal?.aborted) throw errorWith('ABORT_ERR');
  await new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(errorWith('ABORT_ERR')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function resolveProviderAddressesWithRecoveryV1({ hostname, resolveAddresses, signal }) {
  const started = performance.now();
  let lastErrorCode = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) await backoff(attempt === 2 ? 300 : 900, signal);
      const records = await abortable(() => resolveAddresses(hostname), signal, 3000);
      if (signal?.aborted) throw errorWith('ABORT_ERR');
      return { records, recovery: safeProviderDnsRecoveryV1({ attempts: attempt,
        elapsedMs: performance.now() - started, recovered: attempt > 1, lastErrorCode }) };
    } catch (error) {
      lastErrorCode = safeCode(error?.code);
      if (attempt === 3 || !TRANSIENT_DNS.has(error?.code)) {
        throw Object.assign(errorWith(lastErrorCode), { dnsRecovery: safeProviderDnsRecoveryV1({
          attempts: attempt, elapsedMs: performance.now() - started, recovered: false, lastErrorCode }) });
      }
    }
  }
}

// Keeps long non-streaming calls alive across idle network equipment. It is
// not a paid request retry and cannot guarantee an interrupted reply is recoverable.
export function keepProviderSocketAliveV1(socket) {
  socket.setKeepAlive?.(true, 15000);
}

// Only a terminated transport attempt qualifies. JSON, credentials, account,
// policy, cancellation and worker-code failures must not become paid retries.
export function isRecoverableProviderNetworkFailureV1(failure) {
  if (!failure) return false;
  // Headers are not a complete model response. A 2xx body may still be reset
  // by the network; retain its unknown cost and use the same bounded retry.
  // HTTP/account errors and schema/JSON errors never qualify this way.
  if (failure.status !== null && failure.status !== undefined
    && !(failure.status >= 200 && failure.status < 300
      && failure.transportProgress?.phase === 'reading_response_body')) return false;
  if (failure.code === 'PROVIDER_DNS_RESOLUTION_FAILED') {
    return failure.requestDefinitelyNotSent === true && TRANSIENT_DNS.has(failure.networkErrorCode);
  }
  if (failure.code === 'PROVIDER_TRANSPORT_TIMEOUT') return true;
  return ['PROVIDER_TRANSPORT_FAILED', 'PROVIDER_RESPONSE_STREAM_FAILED'].includes(failure.code)
    && new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ENETUNREACH',
      'EHOSTUNREACH', 'EPIPE', 'ERR_SOCKET_CLOSED', 'ERR_TLS_HANDSHAKE_TIMEOUT']).has(failure.networkErrorCode);
}
