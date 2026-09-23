import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
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

function fail(code) { throw new Error(code); }
function clone(value) { return structuredClone(value); }
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

export function createRosterTeachRolePortsV1({ deliberation, sessionId } = {}) {
  if (typeof deliberation?.deliberate !== "function"
    || typeof sessionId !== "string" || !sessionId.trim()) {
    fail("ROSTER_TEACH_ROLE_PORT_INVALID");
  }
  async function invoke(kind, input, nodes, message, roundIndex) {
    const contract = rosterTeachOutputContractV1(kind);
    const contextHash = hashStarcraftTmgContract({
      sessionId, kind, initialFoundationHash: input.initialFoundationHash,
      sourceHashes: input.sourceHashes,
      challenges: kind === "teach_revision" ? input.challenges : null,
      evidenceReceiptHashes: kind === "teach_revision"
        ? input.evidenceReceipts.map((entry) => entry.receiptHash) : null,
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
      maxOutputUnits: kind === "teach_revision" ? 16_384 : 8_192,
      contextHash,
    });
    const result = await deliberation.deliberate(request);
    const output = result?.output;
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
      contract.providerSchema, output);
    if (!validation.ok) fail("ROSTER_TEACH_ROLE_OUTPUT_SCHEMA_INVALID");
    return freezeDeep({ output: clone(output),
      receipt: clone(result.receipt ?? null) });
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
        ], "Challenge one to four falsifiable claims in this small victory "
          + (input.sourceContext?.presetRosterLock
            ? "plan for the already locked roster. "
            : "plan before units are chosen. ")
          + "For every claim, copy targetKind and targetId exactly from "
          + "allowed-challenge-targets; the sole score_route targetId is "
          + "scoreRoute, not the score route's narrative routeId. Request "
          + "one bounded read-only scene-lab query. Do not invent Rules "
          + (input.sourceContext?.presetRosterLock
            ? "or alter the fixed roster. " : "or choose a roster. ")
          + "Return public questions and counterexamples, not hidden "
          + "reasoning.", 2);
        return { challenges: result.output.challenges,
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
        ], "Answer every challenge as retain, revise or unresolved. Cite "
          + "only delivered source/evidence hashes. Publish a complete "
          + "revised Foundation; retain means the target is unchanged, "
          + "revise means it changed, and unresolved needs a replan trigger. "
          + "An unknown result is not proof. "
          + (input.sourceContext?.presetRosterLock
            ? "Do not alter the fixed roster, Rules, or emit hidden reasoning."
            : "Do not choose units yet, alter Rules, or emit hidden reasoning."),
        3);
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
          answerEvidenceNormalizations, answerDispositionDemotions,
          receipt: result.receipt };
      },
    },
    promptPack: ROSTER_TEACH_PROMPT_PACK_V1,
    generationSchema: ROSTER_TEACH_GENERATION_SCHEMA,
  });
}
