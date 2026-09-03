import { AsyncLocalStorage } from "node:async_hooks";

export const STARCRAFT_TMG_PROVIDER_GATEWAY_EXECUTION_SCOPE_VERSION =
  "starcraft_tmg_provider_gateway_execution_scope_v1";

const HASH = /^[a-f0-9]{64}$/u;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function sameRef(left, right) {
  return object(left) && object(right)
    && left.id === right.id
    && left.version === right.version
    && left.hash === right.hash
    && HASH.test(String(left.hash || ""));
}

function reject(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

export function createStarcraftTmgProviderGatewayExecutionScopeV1(options = {}) {
  if (typeof options.sessionLifecycle?.readSession !== "function") {
    throw new TypeError("sessionLifecycle.readSession is required");
  }
  if (typeof options.readProviderState !== "function") {
    throw new TypeError("readProviderState is required");
  }
  const storage = new AsyncLocalStorage();

  async function resolve(gateway) {
    const scoped = storage.getStore();
    if (!scoped) reject("provider_execution_scope_missing");
    const input = scoped.sendInput;
    const reservation = gateway?.budgetReservation;
    if (!object(reservation)
      || input.sessionId !== reservation.sessionId
      || input.providerProfileRef?.hash !== gateway.providerProfileRef?.hash
      || input.promptAssemblyRef?.hash !== gateway.promptAssemblyRef?.hash
      || input.responseContract?.hash !== gateway.responseContract?.hash
      || input.boundedRequest?.requestHash !== gateway.boundedRequest?.requestHash) {
      reject("provider_execution_scope_mismatch");
    }
    const lookup = {
      sessionId: input.sessionId,
      roomId: input.roomId,
      expectedConnectionEpoch: input.expectedConnectionEpoch,
    };
    const [sessionResult, stateResult] = await Promise.all([
      options.sessionLifecycle.readSession(lookup, scoped.context),
      options.readProviderState(lookup, scoped.context),
    ]);
    const session = sessionResult?.session;
    const state = stateResult?.state;
    const turn = state?.currentTurn;
    if (sessionResult?.ok !== true || stateResult?.ok !== true
      || session?.lifecycleState !== "active"
      || turn?.state !== "waiting_provider"
      || turn.sessionId !== session.sessionId
      || turn.sessionBindingHash !== session.binding?.sessionBindingHash
      || turn.connectionEpoch !== session.connection?.epoch
      || turn.turnId !== reservation.turnId
      || turn.reservation?.reservationHash !== reservation.reservationHash
      || turn.requestHash !== gateway.boundedRequest.requestHash
      || !sameRef(turn.providerProfileRef, gateway.providerProfileRef)
      || !sameRef(turn.promptAssemblyRef, gateway.promptAssemblyRef)
      || !sameRef(turn.responseContract, gateway.responseContract)
      || state.budget?.policy?.policyHash !== reservation.policyHash
      || state.sessionBindingHash !== session.binding.sessionBindingHash
      || state.connectionEpoch !== session.connection.epoch) {
      reject("provider_execution_scope_stale");
    }
    return Object.freeze({
      ok: true,
      authority: freeze({
        schemaVersion:
          `${STARCRAFT_TMG_PROVIDER_GATEWAY_EXECUTION_SCOPE_VERSION}.authority`,
        roomId: session.binding.roomId,
        sessionId: session.sessionId,
        sessionBindingHash: session.binding.sessionBindingHash,
        principalScopeHash: session.binding.principalScopeHash,
        connectionEpoch: session.connection.epoch,
        budgetOpenedAt: session.createdAt,
        budgetPolicy: clone(state.budget.policy),
        trainingTruth: false,
      }),
      attachmentContext: scoped.context,
      trainingTruth: false,
    });
  }

  function run(sendInput, context, operation) {
    if (!object(sendInput) || typeof operation !== "function") {
      throw new TypeError("execution scope requires send input and operation");
    }
    return storage.run(Object.freeze({
      sendInput: freeze(clone(sendInput)),
      context,
    }), operation);
  }

  function wrapSupervisor(supervisor) {
    for (const method of ["metadata", "readState", "sendTurn", "cancelTurn"]) {
      if (typeof supervisor?.[method] !== "function") {
        throw new TypeError(`provider supervisor.${method} is required`);
      }
    }
    return Object.freeze({
      metadata: (...args) => supervisor.metadata(...args),
      readState: (...args) => supervisor.readState(...args),
      sendTurn: (input, context) => run(input, context,
        () => supervisor.sendTurn(input, context)),
      cancelTurn: (...args) => supervisor.cancelTurn(...args),
    });
  }

  function metadata() {
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_PROVIDER_GATEWAY_EXECUTION_SCOPE_VERSION}.metadata`,
      carrier: "async_local_server_call_scope",
      publicGatewayInputChanged: false,
      contextPersisted: false,
      directGatewayInvocationAllowed: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ metadata, resolve, run, wrapSupervisor });
}
