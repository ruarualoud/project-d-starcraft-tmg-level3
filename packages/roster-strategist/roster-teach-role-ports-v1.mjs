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
        ], "Challenge one to four falsifiable claims in this small victory "
          + "plan before units are chosen. For every claim, identify its "
          + "existing target and request one bounded read-only scene-lab "
          + "query. Do not invent Rules or choose a roster. Return public "
          + "questions and counterexamples, not hidden reasoning.", 2);
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
          + "An unknown result is not proof. Do not choose units yet, alter "
          + "Rules, or emit hidden reasoning.", 3);
        const foundation = result.output.revisedFoundation;
        if (foundation.schemaVersion
            !== rosterStrategistRoundOutputContractV1(
              "strategy_foundation").providerSchema.properties.schemaVersion
              .enum[0]
          || foundation.roundKind !== "strategy_foundation") {
          fail("ROSTER_TEACH_REVISED_FOUNDATION_ENVELOPE_INVALID");
        }
        const { schemaVersion, roundKind, ...revisedFoundation } = foundation;
        return { revisedFoundation, answers: result.output.answers,
          receipt: result.receipt };
      },
    },
    promptPack: ROSTER_TEACH_PROMPT_PACK_V1,
    generationSchema: ROSTER_TEACH_GENERATION_SCHEMA,
  });
}
