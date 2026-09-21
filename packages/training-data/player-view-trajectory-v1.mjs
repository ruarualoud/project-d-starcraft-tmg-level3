import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgStateForViewerV3 } from
  "../room-runtime/in-memory-room-v1.mjs";

export const STARCRAFT_TMG_PLAYER_VIEW_TRAJECTORY_VERSION =
  "starcraft_tmg_player_view_trajectory_v1";
export const STARCRAFT_TMG_PLAYER_VIEW_STEP_VERSION =
  "starcraft_tmg_player_view_step_v1";
export const STARCRAFT_TMG_TRAINING_COMPATIBILITY_VERSION =
  "starcraft_tmg_training_compatibility_v1";
export const STARCRAFT_TMG_REWARD_VECTOR_VERSION =
  "starcraft_tmg_reward_vector_v1";
export const STARCRAFT_TMG_REWARD_SCALARIZATION_VERSION =
  "starcraft_tmg_reward_scalarization_v1";
export const STARCRAFT_TMG_SAMPLED_ACTION_ENCODING_VERSION =
  "starcraft_tmg_sampled_action_encoding_v1";
export const STARCRAFT_TMG_RECURRENT_STATE_VERSION =
  "starcraft_tmg_recurrent_state_v1";

const REWARD_WEIGHTS = Object.freeze({
  terminalWinLoss: 1,
  officialScoreDelta: 0.1,
  opponentModelsRemoved: 0.02,
  ownModelsRemoved: -0.02,
  opponentDamageDelta: 0.005,
  ownDamageDelta: -0.005,
  missionControlDelta: 0.02,
  readyCardResourceDelta: 0,
});

const REQUIRED_SPLIT_AXES = Object.freeze([
  "runFamilyId",
  "seedFamilyId",
  "mirrorFamilyId",
  "rosterVariantFamilyId",
  "opponentSnapshotFamilyId",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function withoutHiddenReasoning(value) {
  if (Array.isArray(value)) return value.map(withoutHiddenReasoning);
  if (!object(value)) return clone(value);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(?:chain_?of_?thought|hidden_?reasoning|raw_?reasoning|thinking)$/iu
      .test(key))
    .map(([key, child]) => [key, withoutHiddenReasoning(child)]));
}

function identityBody(value) {
  const body = clone(value);
  delete body.contentIdentity;
  return body;
}

function withContentIdentity(value, kind) {
  const body = identityBody(value);
  return deepFreeze({
    ...body,
    contentIdentity: {
      schemaVersion: "starcraft_tmg_content_identity_v1",
      kind,
      algorithm: "sha256-canonical-json-v1",
      hash: hashStarcraftTmgContract(body),
      compatibilityAuthority: false,
      purpose: "identity_deduplication_and_lineage_only",
    },
  });
}

function verifyContentIdentity(value) {
  return object(value?.contentIdentity)
    && value.contentIdentity.algorithm === "sha256-canonical-json-v1"
    && value.contentIdentity.compatibilityAuthority === false
    && value.contentIdentity.hash === hashStarcraftTmgContract(
      identityBody(value),
    );
}

function acceptedReceipts(bundle) {
  return (bundle?.privateJournal || [])
    .filter((entry) => entry?.payload?.type === "accepted_transition")
    .map((entry) => ({
      privateJournalSequence: entry.sequence,
      receipt: clone(entry.payload.payload?.receipt),
    }));
}

function splitIdentity(input, episodeId) {
  const runFamilyId = required(input?.runFamilyId || episodeId,
    "splitIdentity.runFamilyId");
  return deepFreeze({
    runFamilyId,
    seedFamilyId: required(input?.seedFamilyId || `${runFamilyId}:seed`,
      "splitIdentity.seedFamilyId"),
    mirrorFamilyId: required(input?.mirrorFamilyId || `${runFamilyId}:mirror`,
      "splitIdentity.mirrorFamilyId"),
    rosterVariantFamilyId: required(
      input?.rosterVariantFamilyId || `${runFamilyId}:roster`,
      "splitIdentity.rosterVariantFamilyId",
    ),
    opponentSnapshotFamilyId: required(
      input?.opponentSnapshotFamilyId || `${runFamilyId}:opponent`,
      "splitIdentity.opponentSnapshotFamilyId",
    ),
  });
}

function compatibilityVersions(initialEnvelope, firstLegalSpace) {
  const binding = initialEnvelope.matchBinding;
  const runtime = binding.rulesRuntimeBinding || {};
  return deepFreeze({
    schemaVersion: STARCRAFT_TMG_TRAINING_COMPATIBILITY_VERSION,
    data: {
      class: "data",
      version: required(binding.dataVersion, "matchBinding.dataVersion"),
      sourceSnapshotHash: required(binding.sourceSnapshotHash,
        "matchBinding.sourceSnapshotHash"),
      dataSnapshotHash: required(binding.dataSnapshotHash,
        "matchBinding.dataSnapshotHash"),
      compatibility: "exact_bound_source_snapshot",
    },
    rules: {
      class: "rules",
      version: required(binding.rulesVersion, "matchBinding.rulesVersion"),
      artifactHash: required(binding.rulesArtifactHash,
        "matchBinding.rulesArtifactHash"),
      runtimeVersion: required(runtime.runtimeVersion,
        "matchBinding.rulesRuntimeBinding.runtimeVersion"),
      runtimeHash: required(runtime.runtimeHash,
        "matchBinding.rulesRuntimeBinding.runtimeHash"),
      compatibility: "exact_bound_historical_runtime",
    },
    actionSpace: {
      class: "action_space",
      version: required(firstLegalSpace.schemaVersion,
        "legalSpace.schemaVersion"),
      artifactHash: required(binding.actionSchemaHash,
        "matchBinding.actionSchemaHash"),
      firstLegalSpaceHash: required(firstLegalSpace.legalSpaceHash,
        "legalSpace.legalSpaceHash"),
      compatibility: "step_bound_legal_space",
    },
    policy: {
      classes: ["data", "rules", "action_space"],
      contentHashIsCompatibilityGate: false,
      silentUpgradeAllowed: false,
      unsupportedHistoricalVersion: "isolate_with_original_rules_display",
    },
  });
}

function normalizedVersionedSkillRefs(value, field) {
  return (value || []).map((entry, index) => ({
    id: required(entry.id, `${field}[${index}].id`),
    version: required(entry.version, `${field}[${index}].version`),
    hash: required(entry.hash, `${field}[${index}].hash`),
    sourceShape: "experiment_cell_typed_ref",
  }));
}

function safeDecisionBinding(value, receipt, versionedSkillRefs = []) {
  if (!object(value)) return null;
  if (value.stateRevision !== undefined
    && Number(value.stateRevision) !== receipt.preStateRevision) {
    throw new Error("decision binding revision does not match receipt");
  }
  if (value.stateHash && value.stateHash !== receipt.preStateHash) {
    throw new Error("decision binding state does not match receipt");
  }
  if (value.legalSpaceHash
    && value.legalSpaceHash !== receipt.legalSpaceHash) {
    throw new Error("decision binding LegalSpace does not match receipt");
  }
  const traceStrategySkillRefs = (value.strategySkillRefs || []).map((entry) => {
    if (typeof entry === "string") {
      const separator = entry.lastIndexOf("@");
      if (separator < 1 || separator === entry.length - 1) {
        throw new Error("compact strategy Skill reference is invalid");
      }
      return {
        id: entry.slice(0, separator),
        version: null,
        hash: entry.slice(separator + 1),
        sourceShape: "decision_trace_compact_ref",
      };
    }
    return {
      id: required(entry.id, "strategySkillRef.id"),
      version: entry.version
        ? required(entry.version, "strategySkillRef.version") : null,
      hash: required(entry.hash, "strategySkillRef.hash"),
      sourceShape: "typed_ref",
    };
  });
  const typed = normalizedVersionedSkillRefs(versionedSkillRefs,
    "versionedStrategySkillRefs");
  if (typed.length > 0) {
    const traceIdentities = new Set(traceStrategySkillRefs.map((entry) =>
      `${entry.id}@${entry.hash}`));
    if (typed.length !== traceStrategySkillRefs.length
      || typed.some((entry) =>
        !traceIdentities.has(`${entry.id}@${entry.hash}`))) {
      throw new Error("decision trace Skill refs differ from experiment cell");
    }
  }
  if (value.seatKey && value.seatKey !== receipt.applyingSeatKey) {
    throw new Error("decision binding seat does not match receipt");
  }
  if (value.postStateRevision !== undefined
    && Number(value.postStateRevision) !== receipt.postStateRevision) {
    throw new Error("decision binding post revision does not match receipt");
  }
  if (value.postStateHash && value.postStateHash !== receipt.postStateHash) {
    throw new Error("decision binding post state does not match receipt");
  }
  if (value.applyReceiptHash
    && value.applyReceiptHash !== receipt.journalHash) {
    throw new Error("decision binding Apply receipt does not match journal");
  }
  return {
    traceId: value.traceId ? String(value.traceId) : null,
    spatialObservationHash: value.spatialObservationHash || null,
    spatialActionSpaceHash: value.spatialActionSpaceHash || null,
    continuityContextHash: value.continuityContextHash || null,
    turnPlanHash: value.turnPlanHash || null,
    actionIntentHash: value.actionIntentHash || null,
    strategySkillRefs: typed.length > 0 ? typed : traceStrategySkillRefs,
    publicDecisionSummary: withoutHiddenReasoning(
      value.publicDecisionSummary || null,
    ),
    plan: withoutHiddenReasoning(value.plan || null),
    assessment: withoutHiddenReasoning(value.assessment || null),
    planRevision: withoutHiddenReasoning(value.planRevision || null),
    intent: withoutHiddenReasoning(value.intent || null),
    modelNarrativeIncluded: false,
    hiddenChainOfThoughtIncluded: false,
  };
}

function normalizeWinner(value) {
  const winner = String(value || "").trim();
  return winner || null;
}

function opponentOf(state, seatKey) {
  return Object.keys(state?.players || {}).find((key) => key !== seatKey)
    || null;
}

function numericMapValue(value, key) {
  if (!object(value) || !Number.isFinite(Number(value[key]))) return null;
  return Number(value[key]);
}

function scoreAdvantage(state, seatKey) {
  const opponentSeat = opponentOf(state, seatKey);
  const own = numericMapValue(state?.scores, seatKey);
  const opponent = opponentSeat
    ? numericMapValue(state?.scores, opponentSeat) : null;
  return own === null || opponent === null ? null : own - opponent;
}

function livingModelCount(state, seatKey) {
  if (!Array.isArray(state?.pieces)) return null;
  return state.pieces.filter((piece) => piece.sideKey === seatKey)
    .reduce((sum, piece) => {
      if (Array.isArray(piece.models) && piece.models.length > 0) {
        return sum + piece.models.filter((model) =>
          model.isDestroyed !== true && model.isOnField !== false).length;
      }
      const count = Number(piece.currentModels);
      return Number.isFinite(count) && piece.isDestroyed !== true
        ? sum + count : sum;
    }, 0);
}

function damageMarkerTotal(state, seatKey) {
  if (!Array.isArray(state?.pieces)) return null;
  return state.pieces.filter((piece) => piece.sideKey === seatKey)
    .reduce((sum, piece) => sum + (Number.isFinite(Number(piece.damageMarker))
      ? Number(piece.damageMarker) : 0), 0);
}

function controlledMissionMarkerCount(state, seatKey) {
  const markers = state?.board?.missionMarkers;
  if (!Array.isArray(markers)) return null;
  return markers.filter((marker) => (
    marker.controlSideKey === seatKey
    || marker.controllerSideKey === seatKey
  )).length;
}

function readyCardResourceCount(state, seatKey) {
  const resources = state?.cardResources?.[seatKey];
  if (!Array.isArray(resources)) return null;
  return resources.filter((resource) =>
    resource.readiness === "ready" && resource.face !== "down").length;
}

function delta(before, after) {
  return before === null || after === null ? null : after - before;
}

function terminalValue(finalState, seatKey) {
  if (finalState?.terminal !== true && finalState?.gameOver !== true) {
    return null;
  }
  const winner = normalizeWinner(finalState.winner);
  if (!winner || ["draw", "tie"].includes(winner.toLowerCase())) return 0;
  return winner === seatKey ? 1 : -1;
}

function rewardTargets(preState, postState, finalState, seatKey) {
  const opponentSeat = opponentOf(preState, seatKey);
  const transitionTerminal = postState?.terminal === true
    || postState?.gameOver === true;
  const ownBefore = livingModelCount(preState, seatKey);
  const ownAfter = livingModelCount(postState, seatKey);
  const opponentBefore = opponentSeat
    ? livingModelCount(preState, opponentSeat) : null;
  const opponentAfter = opponentSeat
    ? livingModelCount(postState, opponentSeat) : null;
  const vector = {
    schemaVersion: STARCRAFT_TMG_REWARD_VECTOR_VERSION,
    terminalWinLoss: transitionTerminal
      ? terminalValue(postState, seatKey) : 0,
    officialScoreDelta: delta(
      scoreAdvantage(preState, seatKey),
      scoreAdvantage(postState, seatKey),
    ),
    opponentModelsRemoved: delta(opponentAfter, opponentBefore),
    ownModelsRemoved: delta(ownAfter, ownBefore),
    opponentDamageDelta: opponentSeat ? delta(
      damageMarkerTotal(preState, opponentSeat),
      damageMarkerTotal(postState, opponentSeat),
    ) : null,
    ownDamageDelta: delta(
      damageMarkerTotal(preState, seatKey),
      damageMarkerTotal(postState, seatKey),
    ),
    missionControlDelta: delta(
      controlledMissionMarkerCount(preState, seatKey),
      controlledMissionMarkerCount(postState, seatKey),
    ),
    readyCardResourceDelta: delta(
      readyCardResourceCount(preState, seatKey),
      readyCardResourceCount(postState, seatKey),
    ),
    unavailableFactsAreNullNotZero: true,
    source: "authoritative_pre_post_state_and_terminal_facts_only",
    llmEvaluationUsed: false,
  };
  const availableWeightedComponents = Object.entries(REWARD_WEIGHTS)
    .filter(([key]) => vector[key] !== null)
    .map(([key, weight]) => ({ key, value: vector[key], weight }));
  const scalarReward = availableWeightedComponents.reduce((sum, row) =>
    sum + (Number(row.value) * row.weight), 0);
  return {
    rewardVector: vector,
    scalarReward,
    scalarization: {
      schemaVersion: STARCRAFT_TMG_REWARD_SCALARIZATION_VERSION,
      weights: clone(REWARD_WEIGHTS),
      unavailableComponentsIgnored: Object.keys(REWARD_WEIGHTS)
        .filter((key) => vector[key] === null),
      normalizedOrClipped: false,
    },
    valueTarget: terminalValue(finalState, seatKey),
    valueTargetPerspective: seatKey,
    valueTargetSource: terminalValue(finalState, seatKey) === null
      ? "unavailable_nonterminal_episode"
      : "authoritative_terminal_outcome",
  };
}

function chanceTarget(receipt, rngSchemeId) {
  const reveal = receipt.chanceReveal;
  if (!object(reveal)) {
    return {
      used: false,
      rngSchemeId,
      revealCount: 0,
      outcomes: [],
      source: "accepted_transition_receipt",
      availableOnlyAfterAction: true,
    };
  }
  return {
    used: true,
    rngSchemeId,
    revealCount: Array.isArray(reveal.reveals) ? reveal.reveals.length : 0,
    outcomes: (reveal.reveals || []).map((entry) => ({
      counter: entry.counter,
      faces: entry.faces,
      outcome: entry.outcome,
      commitment: entry.commitment,
      basis: clone(entry.basis),
    })),
    ticketBundleHash: reveal.ticketBundleHash || null,
    source: "accepted_transition_receipt",
    availableOnlyAfterAction: true,
  };
}

function hybridActionEncoding(action, proposal) {
  const parameters = proposal?.kind === "parameterized"
    ? clone(proposal.parameters || {}) : {};
  const path = Array.isArray(parameters.path)
    ? clone(parameters.path)
    : Array.isArray(action.canonicalPath?.points)
      ? clone(action.canonicalPath.points) : null;
  return {
    actorId: action.pieceId || action.sourcePieceId || null,
    targetIds: [action.targetId, ...(action.targetIds || [])]
      .filter(Boolean),
    sourceCardOrAbilityId: action.cardId || action.cardResourceId
      || action.abilityId || null,
    weaponName: action.weaponName || null,
    destination: action.to ? clone(action.to) : null,
    path,
    discreteChoices: Object.fromEntries(Object.entries(action)
      .filter(([key, value]) => ![
        "pieceId", "sourcePieceId", "targetId", "targetIds", "cardId",
        "cardResourceId", "abilityId", "weaponName", "to",
        "canonicalPath", "chance",
      ].includes(key) && ["string", "number", "boolean"].includes(
        typeof value,
      ))),
  };
}

function sampledActionEncoding(draft) {
  const legalSpace = draft.actorInput.legalSpace;
  const proposal = draft.action.proposal;
  const action = draft.action.appliedAction;
  const finite = (legalSpace.finiteActions || []).map((entry) => ({
    sampleId: entry.actionKey,
    kind: "finite",
    authoritativeLegalIdentity: true,
    actionKey: entry.actionKey,
    action: clone(entry.action),
  }));
  const parameterSamples = (legalSpace.searchSuggestions || []).map(
    (entry) => ({
      sampleId: entry.suggestionId || entry.candidateId,
      kind: "parameter_sample",
      authoritativeLegalIdentity: false,
      domainId: entry.proposal?.domainId || null,
      parameters: clone(entry.proposal?.parameters || null),
      source: "advisory_search_suggestion",
    }),
  );
  let selected;
  if (proposal?.kind === "finite") {
    selected = finite.find((entry) => entry.actionKey === proposal.actionKey);
    if (!selected) throw new Error("selected finite action is absent from LegalSpace");
  } else if (proposal?.kind === "parameterized") {
    const domain = (legalSpace.parameterDomains || []).find((entry) =>
      entry.domainId === proposal.domainId);
    if (!domain) {
      throw new Error("selected parameter domain is absent from LegalSpace");
    }
    selected = {
      sampleId: `selected:${proposal.domainId}:${draft.action.proposalHash}`,
      kind: "parameter_sample",
      authoritativeLegalIdentity: false,
      selectedFromAuthoritativeDomain: true,
      domainId: proposal.domainId,
      domainHash: hashStarcraftTmgContract(domain),
      parameters: clone(proposal.parameters || {}),
      source: "applied_receipt",
    };
    if (!parameterSamples.some((entry) =>
      entry.domainId === selected.domainId
      && hashStarcraftTmgContract(entry.parameters)
        === hashStarcraftTmgContract(selected.parameters))) {
      parameterSamples.push(clone(selected));
    }
  } else {
    throw new Error("accepted action proposal kind is unsupported");
  }
  const selectedDomain = proposal.kind === "parameterized"
    ? (legalSpace.parameterDomains || []).find((entry) =>
      entry.domainId === proposal.domainId)
    : null;
  return {
    schemaVersion: STARCRAFT_TMG_SAMPLED_ACTION_ENCODING_VERSION,
    kind: proposal.kind,
    actionType: action.actionType,
    selected: clone(selected),
    canonicalProposal: clone(proposal),
    appliedAction: clone(action),
    hybridEncoding: hybridActionEncoding(action, proposal),
    selectedParameterDomain: selectedDomain ? clone(selectedDomain) : null,
    selectedParameterDomainHash: selectedDomain
      ? hashStarcraftTmgContract(selectedDomain) : null,
    actionSet: {
      exactFiniteActions: finite,
      parameterDomains: (legalSpace.parameterDomains || []).map((domain) => ({
        domain: clone(domain),
        domainHash: hashStarcraftTmgContract(domain),
      })),
      sampledParameterizedActions: parameterSamples,
      finiteActionSetComplete: true,
      parameterDomainSetComplete: true,
      parameterSamplesComplete: false,
      unsampledParameterizedActionsAreNotIllegal: true,
    },
    behaviourPolicy: {
      kind: "behaviour_policy",
      selectedActionOnly: true,
      probability: null,
      probabilityKnown: false,
      naturalLanguageConfidenceUsedAsProbability: false,
    },
    searchPolicy: {
      available: false,
      distribution: null,
      distinctFromBehaviourPolicy: true,
    },
  };
}

function recurrentStateEncoding(draft, previousEpisodeStep, previousBySeat) {
  const seatKey = draft.toPlay;
  const previous = previousBySeat.get(seatKey) || null;
  const history = clone(draft.actorInput.publicHistoryPrefix || []);
  const previousHistory = previous?.publicHistory || [];
  const prefixMatches = history.length >= previousHistory.length
    && hashStarcraftTmgContract(history.slice(0, previousHistory.length))
      === hashStarcraftTmgContract(previousHistory);
  const appendedEntries = prefixMatches
    ? history.slice(previousHistory.length) : history;
  return {
    encoding: {
      schemaVersion: STARCRAFT_TMG_RECURRENT_STATE_VERSION,
      episodePreviousStepHash:
        previousEpisodeStep?.contentIdentity?.hash || null,
      previousOwnDecisionStepHash: previous?.stepHash || null,
      previousOwnDecisionStateRevision: previous?.stateRevision ?? null,
      seatPublicHistory: {
        encoding: prefixMatches
          ? "same_seat_append_only_prefix_v1"
          : "same_seat_reset_snapshot_v1",
        previousLength: prefixMatches ? previousHistory.length : 0,
        length: history.length,
        appendedEntries,
        fullPrefixHash: hashStarcraftTmgContract(history),
      },
      continuityContextHash:
        draft.decisionBinding?.continuityContextHash || null,
      turnPlanHash: draft.decisionBinding?.turnPlanHash || null,
      actionIntentHash: draft.decisionBinding?.actionIntentHash || null,
      fullFutureOutcomeIncluded: false,
      reconstructibleFromTrajectoryPrefix: true,
    },
    nextState: { publicHistory: history },
  };
}

function assertCompilerPorts(authorityEngine, roomStore) {
  for (const method of ["legalSpace", "replay"]) {
    if (typeof authorityEngine?.[method] !== "function") {
      throw new TypeError(`authorityEngine.${method} is required`);
    }
  }
  if (typeof roomStore?.loadReplayBundle !== "function") {
    throw new TypeError("roomStore.loadReplayBundle is required");
  }
}

export function createStarcraftTmgPlayerViewTrajectoryCompilerV1(
  options = {},
) {
  const authorityEngine = options.authorityEngine;
  const roomStore = options.roomStore;
  assertCompilerPorts(authorityEngine, roomStore);

  async function compile(input = {}) {
    const roomId = required(input.roomId, "roomId");
    const episodeId = required(input.episodeId || roomId, "episodeId");
    const bundle = await roomStore.loadReplayBundle(roomId);
    if (!object(bundle?.initialEnvelope) || !object(bundle?.currentAggregate)) {
      throw new Error("Room replay source is unavailable");
    }
    const sourceReceipts = acceptedReceipts(bundle);
    if (sourceReceipts.length === 0) {
      throw new Error("Room replay source has no accepted transitions");
    }
    const decisionBindings = new Map((input.decisionBindings || []).map(
      (entry) => [Number(entry.stateRevision), entry],
    ));
    const versionedStrategySkillRefsBySeat = object(
      input.versionedStrategySkillRefsBySeat,
    ) ? input.versionedStrategySkillRefsBySeat : {};
    let envelope = clone(bundle.initialEnvelope);
    let firstLegalSpace = null;
    const stepDrafts = [];
    const stepFactStates = [];

    for (const [stepIndex, source] of sourceReceipts.entries()) {
      const receipt = source.receipt;
      if (!object(receipt)
        || receipt.roomId !== roomId
        || receipt.preStateRevision !== envelope.stateRevision
        || receipt.preStateHash !== envelope.stateHash
        || receipt.applyingSeatKey !== receipt.action?.sideKey) {
        throw new Error(`accepted transition ${stepIndex} is not bound to its pre-state`);
      }
      const legalSpace = authorityEngine.legalSpace(envelope, {
        internalServerAuthority: true,
        sideKey: receipt.applyingSeatKey,
      });
      if (legalSpace.legalSpaceHash !== receipt.legalSpaceHash) {
        throw new Error(`accepted transition ${stepIndex} LegalSpace drifted`);
      }
      if (!firstLegalSpace) firstLegalSpace = legalSpace;
      const viewerState = projectStarcraftTmgStateForViewerV3(
        envelope.state,
        receipt.applyingSeatKey,
      );
      const observation = {
        schemaVersion: "starcraft_tmg_training_actor_observation_v1",
        informationPolicy: "acting_seat_viewer_v3",
        seatKey: receipt.applyingSeatKey,
        roomId,
        matchBindingHash: envelope.matchBindingHash,
        stateRevision: envelope.stateRevision,
        stateHash: envelope.stateHash,
        viewerState,
        publicHistoryPrefix: clone(viewerState.log || []),
        publicHistoryPrefixHash: hashStarcraftTmgContract(
          viewerState.log || [],
        ),
        legalSpace: clone(legalSpace),
        legalSpaceHash: legalSpace.legalSpaceHash,
        containsFutureOutcome: false,
        containsOpponentPrivateState: false,
      };
      const replayed = authorityEngine.replay({
        initialEnvelope: envelope,
        journal: [receipt],
      });
      if (replayed?.ok !== true || replayed.appliedCount !== 1
        || replayed.envelope.stateRevision !== receipt.postStateRevision
        || replayed.envelope.stateHash !== receipt.postStateHash) {
        throw new Error(`accepted transition ${stepIndex} cannot be replayed`);
      }
      stepDrafts.push({
        schemaVersion: STARCRAFT_TMG_PLAYER_VIEW_STEP_VERSION,
        episodeId,
        stepIndex,
        toPlay: receipt.applyingSeatKey,
        revision: {
          before: receipt.preStateRevision,
          after: receipt.postStateRevision,
        },
        actorInput: observation,
        action: {
          preStateHash: receipt.preStateHash,
          proposal: clone(receipt.proposal),
          proposalHash: receipt.proposalHash,
          appliedAction: clone(receipt.action),
          legalSpaceHash: receipt.legalSpaceHash,
        },
        decisionBinding: safeDecisionBinding(
          decisionBindings.get(receipt.preStateRevision),
          receipt,
          versionedStrategySkillRefsBySeat[receipt.applyingSeatKey] || [],
        ),
        outcome: {
          postStateHash: receipt.postStateHash,
          events: clone(receipt.events || []),
          eventsHash: receipt.eventsHash,
          chanceReveal: clone(receipt.chanceReveal || null),
          journalHash: receipt.journalHash,
          futureOfActorInput: true,
        },
        source: {
          privateJournalSequence: source.privateJournalSequence,
          receiptSchemaVersion: receipt.schemaVersion,
          refereeSignatureContentHash:
            receipt.refereeSignature?.contentHash || null,
          manualAdjudication: receipt.manualAdjudication === true,
        },
        isFirst: stepIndex === 0,
        isLast: stepIndex === sourceReceipts.length - 1,
        eligibleForTraining: false,
        trainingTruth: false,
      });
      stepFactStates.push({
        preState: clone(envelope.state),
        postState: clone(replayed.envelope.state),
        receipt,
      });
      envelope = replayed.envelope;
    }

    const current = bundle.currentAggregate.envelope;
    if (envelope.stateRevision !== current.stateRevision
      || envelope.stateHash !== current.stateHash
      || envelope.journalHeadHash !== current.journalHeadHash) {
      throw new Error("trajectory replay does not match the current Room state");
    }
    const finalState = envelope.state;
    const steps = [];
    const previousBySeat = new Map();
    for (const [index, draft] of stepDrafts.entries()) {
      const facts = stepFactStates[index];
      const targets = rewardTargets(facts.preState, facts.postState,
        finalState, draft.toPlay);
      const isTerminal = facts.postState.terminal === true
        || facts.postState.gameOver === true;
      const recurrent = recurrentStateEncoding(
        draft,
        steps.at(-1) || null,
        previousBySeat,
      );
      const step = withContentIdentity({
        ...draft,
        actionEncoding: sampledActionEncoding(draft),
        recurrentState: recurrent.encoding,
        targets: {
          ...targets,
          chance: chanceTarget(facts.receipt,
            envelope.matchBinding.rngSchemeId),
          rewardFactsReceipt: {
            preStateHash: facts.receipt.preStateHash,
            postStateHash: facts.receipt.postStateHash,
            eventsHash: facts.receipt.eventsHash,
            journalHash: facts.receipt.journalHash,
          },
          targetFieldsAreNotActorInput: true,
        },
        isTerminal,
        isTruncated: draft.isLast && !isTerminal,
        discount: isTerminal ? 0 : 1,
      }, "trajectory_step");
      steps.push(step);
      previousBySeat.set(draft.toPlay, {
        stepHash: step.contentIdentity.hash,
        stateRevision: draft.revision.before,
        publicHistory: recurrent.nextState.publicHistory,
      });
    }
    const trajectory = withContentIdentity({
      schemaVersion: STARCRAFT_TMG_PLAYER_VIEW_TRAJECTORY_VERSION,
      gameId: "starcraft-tmg",
      episodeId,
      roomId,
      matchBindingHash: envelope.matchBindingHash,
      informationPolicy: "acting_seat_viewer_v3",
      learnerInterface: {
        kind: "player_view_recurrent_sampled_action",
        recurrentStateVersion: STARCRAFT_TMG_RECURRENT_STATE_VERSION,
        sampledActionEncodingVersion:
          STARCRAFT_TMG_SAMPLED_ACTION_ENCODING_VERSION,
        unsampledParameterizedActionsAreNotIllegal: true,
        behaviourProbabilityMayBeUnknown: true,
        omniscientCriticStateIncluded: false,
      },
      splitIdentity: splitIdentity(input.splitIdentity, episodeId),
      experimentLineage: input.experimentCell
        ? clone(input.experimentCell) : null,
      versions: compatibilityVersions(bundle.initialEnvelope, firstLegalSpace),
      sourceLineage: {
        initialStateRevision: bundle.initialEnvelope.stateRevision,
        initialStateHash: bundle.initialEnvelope.stateHash,
        finalStateRevision: envelope.stateRevision,
        finalStateHash: envelope.stateHash,
        journalTailHash: envelope.journalHeadHash,
        acceptedTransitionCount: sourceReceipts.length,
        deterministicReplayMatchesCurrent: true,
      },
      steps,
      terminal: {
        terminal: finalState.terminal === true || finalState.gameOver === true,
        winnerSeat: normalizeWinner(finalState.winner),
        reason: String(finalState.terminalReason || "") || null,
        scores: clone(finalState.scores || null),
      },
      eligibilityStatus: "independent_training_approval_required",
      eligibleForTraining: false,
      trainingTruth: false,
    }, "player_view_trajectory");
    verify(trajectory);
    return trajectory;
  }

  function verify(trajectory) {
    if (!object(trajectory)
      || trajectory.schemaVersion
        !== STARCRAFT_TMG_PLAYER_VIEW_TRAJECTORY_VERSION
      || !verifyContentIdentity(trajectory)
      || !Array.isArray(trajectory.steps)
      || trajectory.steps.length === 0) {
      throw new Error("player-view trajectory identity is invalid");
    }
    if (trajectory.trainingTruth !== false
      || trajectory.eligibleForTraining !== false
      || trajectory.versions?.policy?.contentHashIsCompatibilityGate !== false
      || trajectory.versions?.policy?.silentUpgradeAllowed !== false) {
      throw new Error("player-view trajectory governance boundary is invalid");
    }
    const recurrentBySeat = new Map();
    for (const [index, step] of trajectory.steps.entries()) {
      if (step.schemaVersion !== STARCRAFT_TMG_PLAYER_VIEW_STEP_VERSION
        || step.stepIndex !== index
        || step.episodeId !== trajectory.episodeId
        || step.revision.before
          !== trajectory.sourceLineage.initialStateRevision + index
        || step.revision.after !== step.revision.before + 1
        || step.actorInput.stateRevision !== step.revision.before
        || step.actorInput.stateHash !== step.action.preStateHash
        || step.actorInput.legalSpaceHash !== step.action.legalSpaceHash
        || step.actorInput.publicHistoryPrefixHash
          !== hashStarcraftTmgContract(
            step.actorInput.publicHistoryPrefix || [],
          )
        || step.actorInput.containsFutureOutcome !== false
        || step.actorInput.containsOpponentPrivateState !== false
        || step.targets?.rewardVector?.llmEvaluationUsed !== false
        || step.targets?.rewardVector?.unavailableFactsAreNullNotZero !== true
        || step.targets?.targetFieldsAreNotActorInput !== true
        || step.actionEncoding?.actionSet
          ?.unsampledParameterizedActionsAreNotIllegal !== true
        || step.actionEncoding?.behaviourPolicy?.probabilityKnown !== false
        || step.actionEncoding?.searchPolicy
          ?.distinctFromBehaviourPolicy !== true
        || step.recurrentState?.fullFutureOutcomeIncluded !== false
        || step.recurrentState?.reconstructibleFromTrajectoryPrefix !== true
        || step.discount !== (step.isTerminal ? 0 : 1)
        || !verifyContentIdentity(step)) {
        throw new Error(`player-view trajectory step ${index} is invalid`);
      }
      if (step.isFirst !== (index === 0)
        || step.isLast !== (index === trajectory.steps.length - 1)) {
        throw new Error(`player-view trajectory boundary ${index} is invalid`);
      }
      const next = trajectory.steps[index + 1];
      if (next && (step.revision.after !== next.revision.before
        || step.outcome.postStateHash !== next.actorInput.stateHash)) {
        throw new Error(`player-view trajectory lineage ${index} is invalid`);
      }
      const actionEncoding = step.actionEncoding;
      if (hashStarcraftTmgContract(actionEncoding.canonicalProposal)
          !== hashStarcraftTmgContract(step.action.proposal)
        || hashStarcraftTmgContract(actionEncoding.appliedAction)
          !== hashStarcraftTmgContract(step.action.appliedAction)) {
        throw new Error(`player-view action encoding ${index} is invalid`);
      }
      if (actionEncoding.kind === "finite") {
        if (!actionEncoding.actionSet.exactFiniteActions.some((entry) =>
          entry.actionKey === step.action.proposal.actionKey
          && entry.authoritativeLegalIdentity === true)) {
          throw new Error(`finite action encoding ${index} is incomplete`);
        }
      } else if (actionEncoding.kind === "parameterized") {
        const domain = actionEncoding.selectedParameterDomain;
        if (!domain
          || domain.domainId !== step.action.proposal.domainId
          || actionEncoding.selectedParameterDomainHash
            !== hashStarcraftTmgContract(domain)
          || !actionEncoding.actionSet.parameterDomains.some((entry) =>
            entry.domain.domainId === domain.domainId
            && entry.domainHash === hashStarcraftTmgContract(entry.domain))) {
          throw new Error(`parameter action encoding ${index} is incomplete`);
        }
      } else {
        throw new Error(`action encoding kind ${index} is unsupported`);
      }
      const previousEpisodeStep = trajectory.steps[index - 1] || null;
      const previousOwn = recurrentBySeat.get(step.toPlay) || null;
      const recurrent = step.recurrentState;
      if (recurrent.episodePreviousStepHash
          !== (previousEpisodeStep?.contentIdentity?.hash || null)
        || recurrent.previousOwnDecisionStepHash
          !== (previousOwn?.stepHash || null)
        || recurrent.previousOwnDecisionStateRevision
          !== (previousOwn?.stateRevision ?? null)) {
        throw new Error(`recurrent lineage ${index} is invalid`);
      }
      const historyEncoding = recurrent.seatPublicHistory;
      let reconstructedHistory;
      if (historyEncoding.encoding === "same_seat_append_only_prefix_v1") {
        if (historyEncoding.previousLength
          !== (previousOwn?.publicHistory?.length || 0)) {
          throw new Error(`recurrent history length ${index} is invalid`);
        }
        reconstructedHistory = [
          ...(previousOwn?.publicHistory || []),
          ...clone(historyEncoding.appendedEntries || []),
        ];
      } else if (historyEncoding.encoding
        === "same_seat_reset_snapshot_v1") {
        if (historyEncoding.previousLength !== 0) {
          throw new Error(`recurrent reset ${index} is invalid`);
        }
        reconstructedHistory = clone(historyEncoding.appendedEntries || []);
      } else {
        throw new Error(`recurrent encoding ${index} is unsupported`);
      }
      if (reconstructedHistory.length !== historyEncoding.length
        || hashStarcraftTmgContract(reconstructedHistory)
          !== historyEncoding.fullPrefixHash
        || historyEncoding.fullPrefixHash
          !== step.actorInput.publicHistoryPrefixHash) {
        throw new Error(`recurrent history ${index} cannot be reconstructed`);
      }
      recurrentBySeat.set(step.toPlay, {
        stepHash: step.contentIdentity.hash,
        stateRevision: step.revision.before,
        publicHistory: reconstructedHistory,
      });
    }
    if (trajectory.steps[0].actorInput.stateHash
        !== trajectory.sourceLineage.initialStateHash
      || trajectory.steps.at(-1).outcome.postStateHash
        !== trajectory.sourceLineage.finalStateHash
      || trajectory.steps.length
        !== trajectory.sourceLineage.acceptedTransitionCount) {
      throw new Error("player-view trajectory source lineage is invalid");
    }
    for (const axis of REQUIRED_SPLIT_AXES) {
      if (!String(trajectory.splitIdentity?.[axis] || "").trim()) {
        throw new Error(`trajectory split identity lacks ${axis}`);
      }
    }
    return deepFreeze({
      schemaVersion: "starcraft_tmg_player_view_trajectory_verification_v1",
      trajectoryHash: trajectory.contentIdentity.hash,
      stepCount: trajectory.steps.length,
      deterministicReplayMatchesCurrent:
        trajectory.sourceLineage.deterministicReplayMatchesCurrent === true,
      dataVersion: trajectory.versions.data.version,
      rulesVersion: trajectory.versions.rules.version,
      actionSpaceVersion: trajectory.versions.actionSpace.version,
      contentHashUsedAsCompatibilityGate: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  function readCompatibility(trajectory) {
    verify(trajectory);
    return clone(trajectory.versions);
  }

  return Object.freeze({ compile, verify, readCompatibility });
}
