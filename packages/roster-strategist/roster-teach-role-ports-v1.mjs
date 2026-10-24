import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TACTICAL_RELATIONSHIP_INTENTS_V1 } from
  "../online-agent-session/tactical-relationship-graph-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import {
  ROSTER_TEACH_GENERATION_SCHEMA,
  rosterTeachOutputContractRefV1,
  rosterTeachOutputContractV1,
} from "./roster-teach-output-contracts-v1.mjs";
import { rosterStrategistRoundOutputContractV1 } from
  "./roster-strategist-output-schemas-v1.mjs";

export const ROSTER_TEACH_PROMPT_PACK_V1 =
  "ticket27.roster_teach.challenge_revision.v1";
const SPATIAL_INTENTS = new Set(
  STARCRAFT_TMG_TACTICAL_RELATIONSHIP_INTENTS_V1);
const coevolvingSelection = input => input.sourceContext?.agentSelectedStrategySource
  ?.selectionJustificationPolicyVersion === "unit_role_comparison_v1";

function fail(code) { throw new Error(code); }
function clone(value) { return structuredClone(value); }
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function targetRegistry(foundation) {
  return {
    score_route: ["scoreRoute"],
    opponent_hypothesis: (foundation.opponentHypotheses || [])
      .map((item) => item.hypothesisId),
    counter_response: (foundation.counterResponses || [])
      .map((item) => item.responseId),
    invalidation_trigger: (foundation.invalidationTriggers || [])
      .map((item) => item.triggerId),
  };
}
function dropSchemaExtraFields(value, schema, path, dropped) {
  if (Array.isArray(value) && schema?.type === "array") {
    value.forEach((entry, index) => dropSchemaExtraFields(entry,
      schema.items, `${path}[${index}]`, dropped));
    return;
  }
  if (!object(value) || schema?.type !== "object"
    || !object(schema.properties)) return;
  for (const [key, child] of Object.entries(value)) {
    const propertySchema = schema.properties[key];
    if (!propertySchema && schema.additionalProperties === false) {
      dropped.push({ path: `${path}.${key}`,
        valueHash: hashStarcraftTmgContract(child),
        valueLength: JSON.stringify(child).length });
      delete value[key];
      continue;
    }
    if (propertySchema) dropSchemaExtraFields(child, propertySchema,
      `${path}.${key}`, dropped);
  }
}

// A paid Student reply may contain complete challenge answers but only the
// changed Foundation fields. Rebuild that public revision as a source-bound
// patch over the already validated initial Foundation. No claim is generated:
// every changed target comes from the retained reply, and every inherited
// field comes from the initial Foundation. Incomplete or ambiguous patch
// identities still fail the unchanged full-schema and Teach validators.
function restoreSparseTeachFoundation(output, initialFoundation, challenges) {
  if (!object(initialFoundation) || !Array.isArray(challenges)
    || !Array.isArray(output.answers)
    || !object(output.revisedFoundation)) return null;
  const schema = rosterTeachOutputContractV1("teach_revision")
    .providerSchema.properties.revisedFoundation;
  const source = {
    schemaVersion: schema.properties.schemaVersion.enum[0],
    roundKind: "strategy_foundation", ...clone(initialFoundation),
  };
  const sourcePrunedFields = [];
  dropSchemaExtraFields(source, schema, "$.initialFoundation",
    sourcePrunedFields);
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(schema, source).ok) {
    return null;
  }
  const partial = output.revisedFoundation;
  const inheritedFields = Object.keys(schema.properties).filter((key) =>
    !Object.hasOwn(partial, key));
  const inheritedScoreRouteFields = object(partial.scoreRoute)
    ? Object.keys(schema.properties.scoreRoute.properties).filter((key) =>
      !Object.hasOwn(partial.scoreRoute, key)) : [];
  if (inheritedFields.length === 0
    && inheritedScoreRouteFields.length === 0) return null;
  const byChallenge = new Map();
  for (const challenge of challenges) {
    if (!object(challenge) || typeof challenge.challengeId !== "string"
      || byChallenge.has(challenge.challengeId)) return null;
    byChallenge.set(challenge.challengeId, challenge);
  }
  if (byChallenge.size === 0 || output.answers.length !== byChallenge.size
    || new Set(output.answers.map((answer) =>
      answer?.challengeId)).size !== byChallenge.size
    || output.answers.some((answer) =>
      !byChallenge.has(answer?.challengeId))) return null;
  const restored = { ...source, ...partial,
    ...(object(partial.scoreRoute) ? {
      scoreRoute: { ...source.scoreRoute, ...partial.scoreRoute },
    } : {}) };
  const patchTargets = {
    opponent_hypothesis: ["opponentHypotheses", "hypothesisId",
      "hypothesisText"],
    counter_response: ["counterResponses", "responseId", "responseText"],
    invalidation_trigger: ["invalidationTriggers", "triggerId",
      "triggerText"],
  };
  const targetedPatches = [];
  for (const answer of output.answers) {
    if (answer.disposition !== "revise") continue;
    if (typeof answer.revisedClaimText !== "string"
      || !answer.revisedClaimText.trim()) return null;
    const challenge = byChallenge.get(answer.challengeId);
    if (challenge.targetKind === "score_route") {
      if (challenge.targetId !== "scoreRoute"
        || !object(restored.scoreRoute)) return null;
      if (!object(partial.scoreRoute)
        || !Object.hasOwn(partial.scoreRoute, "routeText")) {
        restored.scoreRoute.routeText = answer.revisedClaimText;
        targetedPatches.push({ challengeId: answer.challengeId,
          targetKind: challenge.targetKind, targetId: challenge.targetId,
          field: "scoreRoute.routeText",
          sourceTextHash: hashStarcraftTmgContract(
            answer.revisedClaimText) });
      }
      continue;
    }
    const target = patchTargets[challenge.targetKind];
    if (!target) return null;
    const [section, idField, textField] = target;
    if (!Array.isArray(restored[section])) return null;
    const matches = restored[section].filter((entry) =>
      entry?.[idField] === challenge.targetId);
    if (matches.length !== 1) return null;
    if (!Object.hasOwn(partial, section)) {
      matches[0][textField] = answer.revisedClaimText;
      targetedPatches.push({ challengeId: answer.challengeId,
        targetKind: challenge.targetKind, targetId: challenge.targetId,
        field: `${section}.${textField}`,
        sourceTextHash: hashStarcraftTmgContract(
          answer.revisedClaimText) });
    }
  }
  output.revisedFoundation = restored;
  return { inheritedFields, inheritedScoreRouteFields,
    sourcePrunedFields, targetedPatches,
    initialFoundationHash: hashStarcraftTmgContract(initialFoundation) };
}

// Provider JSON schemas can still be returned with a complete public field
// at the wrong nesting level. Relocate only unique, known fields; retain an
// exact source-to-target receipt and leave true omissions/conflicts to the
// original strict schema and Teach semantic validators.
export function normalizeRosterTeachPublicOutputV1(kind, input,
  { initialFoundation = null, challenges = null } = {}) {
  const output = clone(input);
  if (kind === "teach_challenge" && object(output)
    && Array.isArray(output.challenges)) {
    const intentNormalizations = [];
    output.challenges.forEach((challenge, index) => {
      const evidence = challenge?.evidenceRequest;
      const request = evidence?.toolRequest;
      if (!object(request)) return;
      const normalizeIntent = (holder, path, reason) => {
        if (typeof holder?.intent !== "string" || holder.intent === "") {
          return;
        }
        const originalIntent = holder.intent;
        holder.intent = "";
        intentNormalizations.push({
          path, challengeId: String(challenge.challengeId || ""), reason,
          originalIntentHash: hashStarcraftTmgContract(originalIntent),
          originalIntentLength: originalIntent.length,
        });
      };
      const consumed = evidence.kind === "spatial";
      if (!consumed || !SPATIAL_INTENTS.has(request.intent)) {
        normalizeIntent(request,
          `$.challenges[${index}].evidenceRequest.toolRequest.intent`,
          consumed ? "untyped_spatial_intent_quarantined"
            : "nonspatial_intent_not_consumed");
      }
      // Scenario follow-ups execute against their created immutable branch.
      // Preserve consumed typed spatial selectors; quarantine only prose or
      // fields not consumed by this query family.
      (Array.isArray(request.followUps) ? request.followUps : [])
        .forEach((followUp, followUpIndex) => {
          const consumed = evidence.kind === "scenario"
            && followUp.kind === "spatial";
          if (!consumed || !SPATIAL_INTENTS.has(followUp.intent)) {
            normalizeIntent(followUp,
              `$.challenges[${index}].evidenceRequest.toolRequest.followUps[${followUpIndex}].intent`,
              consumed ? "untyped_spatial_intent_quarantined"
                : "teach_followup_intent_not_consumed");
          }
        });
    });
    if (intentNormalizations.length === 0) {
      return { output, normalizationReceipt: null };
    }
    const receiptBody = {
      schema: "starcraft_tmg_roster_teach_public_intent_normalization_v1",
      sourceOutputHash: hashStarcraftTmgContract(input),
      normalizedOutputHash: hashStarcraftTmgContract(output),
      intentNormalizations,
      contentSynthesized: false,
      semanticAuthority: false,
      trainingTruth: false,
    };
    return { output, normalizationReceipt: {
      ...receiptBody, receiptHash: hashStarcraftTmgContract(receiptBody),
    } };
  }
  if (kind !== "teach_revision" || !object(output)
    || !object(output.revisedFoundation)) {
    return { output, normalizationReceipt: null };
  }
  const moves = [];
  const foundation = output.revisedFoundation;
  if (!Object.hasOwn(output, "answers")
    && Array.isArray(foundation.answers)) {
    output.answers = foundation.answers;
    delete foundation.answers;
    moves.push({ from: "$.revisedFoundation.answers", to: "$.answers" });
  }
  if (object(foundation.scoreRoute)) {
    for (const key of ["scoreRouteAuthority", "opponentHypotheses",
      "counterResponses", "invalidationTriggers", "informationNeeds"]) {
      if (Object.hasOwn(foundation, key)
        || !Object.hasOwn(foundation.scoreRoute, key)) continue;
      foundation[key] = foundation.scoreRoute[key];
      delete foundation.scoreRoute[key];
      moves.push({ from: `$.revisedFoundation.scoreRoute.${key}`,
        to: `$.revisedFoundation.${key}` });
    }
  }
  const sparseRecovery = restoreSparseTeachFoundation(output,
    initialFoundation, challenges);
  const droppedExtraFields = [];
  dropSchemaExtraFields(output,
    rosterTeachOutputContractV1(kind).providerSchema, "$",
    droppedExtraFields);
  if (moves.length === 0 && droppedExtraFields.length === 0
    && !sparseRecovery) {
    return { output, normalizationReceipt: null };
  }
  const receiptBody = {
    schema: sparseRecovery
      ? "starcraft_tmg_roster_teach_public_shape_normalization_v3"
      : "starcraft_tmg_roster_teach_public_shape_normalization_v2",
    sourceOutputHash: hashStarcraftTmgContract(input),
    normalizedOutputHash: hashStarcraftTmgContract(output),
    moves, droppedExtraFields,
    ...(sparseRecovery ? { sparseRecovery } : {}),
    contentSynthesized: false,
    semanticAuthority: false,
    trainingTruth: false,
  };
  return { output, normalizationReceipt: {
    ...receiptBody, receiptHash: hashStarcraftTmgContract(receiptBody),
  } };
}

export function createRosterTeachRolePortsV1({ deliberation, sessionId } = {}) {
  if (typeof deliberation?.deliberate !== "function"
    || typeof sessionId !== "string" || !sessionId.trim()) {
    fail("ROSTER_TEACH_ROLE_PORT_INVALID");
  }
  async function invoke(kind, input, nodes, message, roundIndex) {
    const contract = rosterTeachOutputContractV1(kind);
    const contextHash = hashStarcraftTmgContract({
      sessionId, kind, initialFoundationHash: input.initialFoundationHash,
      // Receipt/source lists alone omit corrected results and recovered scene
      // catalogs. Exact paid-reply reuse must bind the actual delivered input.
      sourceContextHash: hashStarcraftTmgContract(input.sourceContext ?? null),
      sourceHashes: input.sourceHashes,
      challenges: kind === "teach_revision" ? input.challenges : null,
      evidenceReceiptHashes: kind === "teach_revision"
        ? input.evidenceReceipts.map((entry) => entry.receiptHash) : null,
      ...(input.evidenceRepair ? {
        evidenceRepair: clone(input.evidenceRepair),
      } : {}),
      ...(input.revisionRepair ? {
        revisionRepair: clone(input.revisionRepair),
      } : {}),
    });
    const request = freezeDeep({
      sessionId, roundIndex, roundKind: kind,
      promptPack: ROSTER_TEACH_PROMPT_PACK_V1,
      promptNodes: clone(nodes), userMessage: message,
      responseContract: {
        allowedChannels: ["roster_strategy"],
        publicEvidenceOnly: true,
        rulesRemainSoleLegalityAuthority: true,
      },
      responseFormat: {
        kind: "provider_strict_json_schema",
        schemaName: contract.schemaName,
        outputContractRef: rosterTeachOutputContractRefV1(kind),
        schema: clone(contract.providerSchema),
      },
      contextHash,
    });
    const result = await deliberation.deliberate(request);
    const normalized = normalizeRosterTeachPublicOutputV1(kind,
      result?.output, { initialFoundation: input.initialFoundation,
        challenges: input.challenges });
    const output = normalized.output;
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
      contract.providerSchema, output);
    if (!validation.ok) fail("ROSTER_TEACH_ROLE_OUTPUT_SCHEMA_INVALID");
    return freezeDeep({ output: clone(output),
      receipt: clone(result.receipt ?? null),
      normalizationReceipt: clone(normalized.normalizationReceipt) });
  }
  return freezeDeep({
    challengerPort: {
      async challenge(input) {
        const result = await invoke("teach_challenge", input, [
          { kind: "frozen-source-and-skill-boundary",
            sourceHashes: clone(input.sourceHashes),
            sourceContext: clone(input.sourceContext) },
          { kind: "initial-small-plan",
            foundation: clone(input.initialFoundation),
            foundationHash: input.initialFoundationHash },
          { kind: "allowed-challenge-targets",
            targetIdsByKind: targetRegistry(input.initialFoundation) },
          ...(input.evidenceRepair ? [{
            kind: "correctable-evidence-query-errors",
            round: input.evidenceRepair.round,
            repairs: clone(input.evidenceRepair.repairs),
          }] : []),
        ], input.evidenceRepair
          ? "Correct only the failed read-only evidence requests shown in "
            + "correctable-evidence-query-errors. Return exactly those "
            + "challenges, copying challengeId, targetKind, targetId, claimText, "
            + "questionText and falsificationText unchanged. Change only "
            + "evidenceRequest. Choose attacker, target, branch and query kind "
            + "explicitly from the delivered frozen context, never guess live "
            + "hidden enemy truth. Probability queries support current legal "
            + "ranged attacks, NOT charge reach or melee damage; use a typed "
            + "spatial/scenario query for geometry. Unknown dice/path/bonuses "
            + "remain unknown. Do not invent probabilities or Rules facts."
          : "Challenge one to four falsifiable claims in this small victory "
          + (coevolvingSelection(input)
            ? "plan for the temporarily frozen Agent candidate. Challenge whether "
              + "its selected Units and abilities can fulfil the declared roles "
              + "against the stated opponent on this map. Distinguish missing "
              + "evidence from a legal but risky strategic preference. "
            : input.sourceContext?.presetRosterLock
            ? "plan for the already locked roster. "
            : "plan before units are chosen. ")
          + "For every claim, copy targetKind and targetId exactly from "
          + "allowed-challenge-targets; the sole score_route targetId is "
          + "scoreRoute, not the score route's narrative routeId. Request "
          + "one bounded read-only scene-lab query. "
          + "Probability requires an exact attackerUnitId and targetUnitId "
          + "and the selected domainId when the scene has multiple ranged weapons. "
          + "For spatial requests queryKind and argumentsJson can call the "
          + "same canonical queryContracts as live play, including full "
          + "mission_marker_control and native legal_full_path_movement. "
          + "Use only domains from that queried source or branch actionSpace. "
          + "and means current legal Ranged Attack only, never charge reach "
          + "or melee damage. branchIdRef must name a prior Foundation "
          + "scenario need or an available selectionEvidence scene's exact branchIdRef. "
          + "An empty reference means the off-board source, not a previously tested scene. Put the question "
          + "in questionText. toolRequest.intent is only an exact spatial "
          + "relationship selector (overview, engage, avoid_threat, "
          + "control_objective, surround_target, screen, preserve_lane, "
          + "focus_fire, fire_zone_exchange, retreat); use an empty string "
          + "for other query kinds. A pregame spatial relationship read "
          + "does not prove a map route; use map_route with exact sideId, "
          + "baseId and targetId copied from frozen map evidence to ask "
          + "about a deployment-to-objective route. That grid audit is "
          + "advisory, not an exact move or score timing. Do not invent Rules "
          + (coevolvingSelection(input)
            ? "or mutate this evidence snapshot. The selecting Agent may reopen "
              + "the army and first-arrival schedule AFTER Teach; never claim "
              + "that this temporary freeze forbids later reselection. "
            : input.sourceContext?.presetRosterLock
            ? "or alter the fixed roster. " : "or choose a roster. ")
          + "Return public questions and counterexamples, not hidden "
          + "reasoning.", 2);
        return { challenges: result.output.challenges,
          ...(result.normalizationReceipt ? {
            outputNormalizationReceipt: result.normalizationReceipt } : {}),
          receipt: result.receipt };
      },
    },
    studentPort: {
      async revise(input) {
        const result = await invoke("teach_revision", input, [
          { kind: "frozen-source-and-skill-boundary",
            sourceHashes: clone(input.sourceHashes),
            sourceContext: clone(input.sourceContext) },
          { kind: "initial-small-plan",
            foundation: clone(input.initialFoundation),
            foundationHash: input.initialFoundationHash },
          { kind: "independent-challenges-and-read-only-evidence",
            challenges: clone(input.challenges),
            evidenceReceipts: clone(input.evidenceReceipts) },
          ...(input.revisionRepair ? [{ kind: "teach-protocol-correction",
            repair: clone(input.revisionRepair),
            instruction: "Correct only the declared target/disposition inconsistency. "
              + "Use the complete previous public answer and existing evidence; "
              + "do not invent evidence or claim that an unchanged target was revised. "
              + "Choose retain or unresolved if no supported target change is warranted." }] : []),
        ], "Answer every challenge as retain, revise or unresolved. Cite "
          + "only delivered source/evidence hashes. Publish a complete "
          + "revised Foundation; retain means the target is unchanged, "
          + "revise means it changed, and unresolved needs a replan trigger. "
          + "An unknown result is not proof. "
          + (coevolvingSelection(input)
            ? "Keep this snapshot unchanged for evidence consistency, not as a "
              + "permanent selection restriction. State which unit-purpose, "
              + "ability-cooperation or alternative assumptions need re-query "
              + "or reopening by the selecting Agent. Preserve justified risky "
              + "choices. Do not alter Rules or emit hidden reasoning."
            : input.sourceContext?.presetRosterLock
            ? "Do not alter the fixed roster, Rules, or emit hidden reasoning."
            : "Do not choose units yet, alter Rules, or emit hidden reasoning."),
        3 + (input.revisionRepair?.round || 0));
        const foundation = result.output.revisedFoundation;
        if (foundation.schemaVersion
            !== rosterStrategistRoundOutputContractV1(
              "strategy_foundation").providerSchema.properties.schemaVersion
              .enum[0]
          || foundation.roundKind !== "strategy_foundation") {
          fail("ROSTER_TEACH_REVISED_FOUNDATION_ENVELOPE_INVALID");
        }
        const { schemaVersion, roundKind, ...revisedFoundation } = foundation;
        const evidenceByHash = new Map(input.evidenceReceipts.flatMap(
          (entry) => [entry.receiptHash, entry.sourceReceiptHash]
            .filter(Boolean).map((hash) => [hash, entry])));
        const allowedEvidenceRefs = new Set([
          ...input.sourceHashes,
          ...evidenceByHash.keys(),
        ]);
        const answerEvidenceNormalizations = [];
        const answerDispositionDemotions = [];
        const answers = result.output.answers.map((answer) => {
          const evidenceRefs = answer.evidenceRefs.filter((reference) => {
            if (allowedEvidenceRefs.has(reference)) return true;
            answerEvidenceNormalizations.push({
              challengeId: answer.challengeId,
              unsupportedReferenceHash: reference,
              reason: "not_in_delivered_source_or_evidence",
            });
            return false;
          });
          const challenge = input.challenges.find((entry) =>
            entry.challengeId === answer.challengeId);
          const usableQueryEvidence = evidenceRefs.some((reference) => {
            const receipt = evidenceByHash.get(reference);
            return receipt?.challengeId === answer.challengeId
              && receipt.status !== "unknown";
          });
          if (answer.disposition !== "unresolved"
            && (evidenceRefs.length === 0
              || challenge?.evidenceRequest !== null
                && !usableQueryEvidence)) {
            answerDispositionDemotions.push({
              challengeId: answer.challengeId,
              from: answer.disposition, to: "unresolved",
              reason: "supported_answer_lacks_delivered_evidence",
            });
            return { ...answer, disposition: "unresolved", evidenceRefs,
              publicReason: "The supplied references do not establish this "
                + "claim against delivered evidence. Treat it as an "
                + "unresolved strategic assumption, not a verified result.",
              replanTrigger: answer.replanTrigger?.trim()
                || "Recheck this claim with a named read-only query before "
                  + "relying on it in battle." };
          }
          return { ...answer, evidenceRefs };
        });
        return { revisedFoundation, answers,
          ...(result.normalizationReceipt ? {
            outputNormalizationReceipt: result.normalizationReceipt } : {}),
          answerEvidenceNormalizations, answerDispositionDemotions,
          receipt: result.receipt };
      },
    },
    promptPack: ROSTER_TEACH_PROMPT_PACK_V1,
    generationSchema: ROSTER_TEACH_GENERATION_SCHEMA,
  });
}
