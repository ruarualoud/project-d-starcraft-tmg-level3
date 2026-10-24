import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_RULES_VERSION_FORK_SCHEMA =
  "starcraft_tmg_official_rules_version_fork_v1";

function fail(code) { throw new Error(code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function sourceDependencyMatches(binding, initialStateAuthority, kind) {
  const dependency = initialStateAuthority.dependencies?.[kind];
  return object(dependency)
    && dependency.artifactId === binding.dependencies?.[kind]?.artifactId
    && dependency.content !== undefined
    && hashStarcraftTmgContract(dependency.content)
      === binding.dependencies?.[kind]?.contentHash;
}

export async function forkOfficialChargeRulesRoomV1(input = {}) {
  const { sourceRoomStore, sourceAuthorityEngine, sourceRoomId,
    sourceInitialStateAuthority, targetRoomRuntime, targetRulesRuntime,
    targetRoomId } = input;
  if (!sourceRoomStore?.loadRoom || !sourceRoomStore?.loadReplayBundle
    || !sourceAuthorityEngine?.replay || !targetRoomRuntime?.createRoom
    || !targetRoomRuntime?.replayRoom || !targetRoomRuntime?.roomStore?.loadRoom
    || !object(sourceInitialStateAuthority)
    || typeof sourceRoomId !== "string" || !sourceRoomId
    || typeof targetRoomId !== "string" || !targetRoomId
    || sourceRoomId === targetRoomId) {
    fail("OFFICIAL_RULES_FORK_INPUT_INVALID");
  }
  const sourceAggregate = await sourceRoomStore.loadRoom(sourceRoomId);
  const sourceBinding = sourceAggregate?.envelope?.matchBinding;
  const oldRuntimeHash = sourceBinding?.rulesRuntimeBinding?.runtimeHash;
  if (!sourceBinding || !oldRuntimeHash
    || targetRulesRuntime?.legacyRuntimeDescriptor?.runtimeHash
      !== oldRuntimeHash
    || targetRulesRuntime?.descriptor?.runtimeHash === oldRuntimeHash
    || targetRulesRuntime?.descriptor?.productionRoomEligible !== false) {
    fail("OFFICIAL_RULES_FORK_RUNTIME_BINDING_INVALID");
  }
  for (const kind of ["sourceSnapshot", "dataSnapshot", "geometryArtifact"]) {
    if (!sourceDependencyMatches(sourceBinding,
      sourceInitialStateAuthority, kind)) {
      fail(`OFFICIAL_RULES_FORK_SOURCE_DEPENDENCY_DRIFT:${kind}`);
    }
  }
  const bundle = await sourceRoomStore.loadReplayBundle(sourceRoomId);
  if (!bundle?.initialEnvelope
    || bundle.initialEnvelope.matchBindingHash !== sourceBinding.bindingHash) {
    fail("OFFICIAL_RULES_FORK_SOURCE_REPLAY_UNAVAILABLE");
  }
  const receipts = (bundle.privateJournal || []).filter((entry) =>
    entry.payload?.type === "accepted_transition")
    .map((entry) => entry.payload.payload.receipt)
    .sort((left, right) => Number(left.postStateRevision)
      - Number(right.postStateRevision));
  const checkpoint = bundle.latestCheckpoint || null;
  const tail = checkpoint ? receipts.filter((receipt) =>
    Number(receipt.postStateRevision) > Number(checkpoint.stateRevision))
    : receipts;
  const replay = sourceAuthorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    ...(checkpoint ? { checkpoint } : {}),
    journal: tail,
  });
  if (!replay.ok
    || replay.envelope.stateRevision
      !== sourceAggregate.envelope.stateRevision
    || replay.envelope.stateHash !== sourceAggregate.envelope.stateHash
    || replay.envelope.journalHeadHash
      !== sourceAggregate.envelope.journalHeadHash) {
    fail("OFFICIAL_RULES_FORK_SOURCE_REPLAY_DIVERGED");
  }
  const sourceState = replay.envelope.state;
  if (sourceState.pendingAction?.stage !== "resolve_charge_after_roll") {
    fail("OFFICIAL_RULES_FORK_PENDING_CHARGE_REQUIRED");
  }
  const targetSpace = targetRulesRuntime.enumerate(sourceState, {
    sideKey: sourceState.activeSideKey,
  });
  const requiredFailureParameterKind = String(
    input.requiredFailureParameterKind
      || "official_selected_roster_charge_endpoint_failure_v1");
  const failureDomain = targetSpace.parameterDomains.find((domain) =>
    domain.parameterKind === requiredFailureParameterKind);
  if (!failureDomain || failureDomain.constraints.pendingHash
    !== sourceState.pendingAction.pendingHash) {
    fail("OFFICIAL_RULES_FORK_PROOF_UNAVAILABLE");
  }
  const provenance = Object.freeze({
    schemaVersion: OFFICIAL_RULES_VERSION_FORK_SCHEMA,
    sourceRoomId,
    sourceMatchBindingHash: sourceBinding.bindingHash,
    sourceStateRevision: replay.envelope.stateRevision,
    sourceStateHash: replay.envelope.stateHash,
    sourceJournalHeadHash: replay.envelope.journalHeadHash,
    sourceAcceptedReceiptCount: receipts.length,
    oldRulesRuntimeHash: oldRuntimeHash,
    newRulesRuntimeHash: targetRulesRuntime.descriptor.runtimeHash,
    pendingChargeHash: sourceState.pendingAction.pendingHash,
    ...(input.requiredFailureParameterKind ? {
      failureParameterKind: requiredFailureParameterKind,
      failureCertificateHash: failureDomain.constraints.certificateHash,
    } : {
      endpointCertificateHash: failureDomain.constraints.certificateHash,
    }),
    ...(sourceState.officialRulesVersionFork ? {
      sourceForkProvenance: clone(sourceState.officialRulesVersionFork),
    } : {}),
    oldJournalCopied: false,
    branchStartsAtSourceState: true,
    trainingTruth: false,
  });
  const state = clone(sourceState);
  state.officialRulesVersionFork = provenance;
  const authorityBody = {
    schema: "starcraft_tmg_rules_version_fork_initial_state_authority_v1",
    version: "1.0.0",
    source: "server_factory",
    setupId: `${String(sourceInitialStateAuthority.setupId || "standard-2000")}:rules-fork`,
    state,
    dataVersion: sourceInitialStateAuthority.dataVersion,
    dependencies: clone(sourceInitialStateAuthority.dependencies),
    serverSeatPlan: clone(input.serverSeatPlan
      || sourceInitialStateAuthority.serverSeatPlan || []),
    compositionEvidence: { officialRulesVersionFork: provenance },
    trainingTruth: false,
  };
  const initialStateAuthority = Object.freeze({ ...authorityBody,
    receiptHash: hashStarcraftTmgContract(authorityBody) });
  const created = await targetRoomRuntime.createRoom({
    roomId: targetRoomId,
    title: String(input.title || "StarCraft TMG · versioned Charge continuation"),
    gameId: "starcraft-tmg",
    surfaceMode: "agent_agent_development",
    productionRoom: false,
    initialStateAuthority,
    serverSeatPlan: initialStateAuthority.serverSeatPlan,
  });
  if (!created.ok) fail(`OFFICIAL_RULES_FORK_ROOM_CREATE_FAILED:${created.reason}`);
  const targetAggregate = await targetRoomRuntime.roomStore.loadRoom(targetRoomId);
  const targetReplay = await targetRoomRuntime.replayRoom({ roomId: targetRoomId });
  if (!targetReplay.ok || targetReplay.matchesCurrent !== true
    || targetAggregate?.envelope?.matchBinding?.rulesRuntimeBinding?.runtimeHash
      !== targetRulesRuntime.descriptor.runtimeHash
    || targetAggregate.envelope.state.officialRulesVersionFork?.sourceStateHash
      !== provenance.sourceStateHash) {
    fail("OFFICIAL_RULES_FORK_TARGET_REPLAY_DIVERGED");
  }
  const sourceAfter = await sourceRoomStore.loadRoom(sourceRoomId);
  if (sourceAfter.envelope.stateRevision
      !== sourceAggregate.envelope.stateRevision
    || sourceAfter.envelope.stateHash !== sourceAggregate.envelope.stateHash
    || sourceAfter.envelope.journalHeadHash
      !== sourceAggregate.envelope.journalHeadHash) {
    fail("OFFICIAL_RULES_FORK_SOURCE_CHANGED");
  }
  return Object.freeze({
    ok: true,
    sourceRoomId,
    targetRoomId,
    provenance,
    targetMatchBindingHash: targetAggregate.envelope.matchBindingHash,
    targetStateRevision: targetAggregate.envelope.stateRevision,
    targetStateHash: targetAggregate.envelope.stateHash,
    targetReplayMatchesCurrent: true,
    credentials: created.credentials,
    productionRoomEligible: false,
    trainingTruth: false,
  });
}
