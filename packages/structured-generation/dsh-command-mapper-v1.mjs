import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { normalizeStarcraftTmgOutputContractRefV1 } from
  "./output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_STRUCTURED_DSH_COMMAND_MAPPER_VERSION =
  "starcraft_tmg_structured_dsh_command_mapper_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export function mapStarcraftTmgStructuredFinishToDshCommandV1(input = {}) {
  const outputContractRef = normalizeStarcraftTmgOutputContractRefV1(
    input.outputContractRef);
  if (!input.value || typeof input.value !== "object"
    || Array.isArray(input.value)) {
    throw new TypeError("Structured DSH finish value must be an object");
  }
  const command = freeze({ action: "finish", content: clone(input.value) });
  const receiptBody = {
    schemaVersion:
      `${STARCRAFT_TMG_STRUCTURED_DSH_COMMAND_MAPPER_VERSION}.receipt`,
    outputContractRef,
    candidateHash: hashStarcraftTmgContract(input.value),
    commandHash: hashStarcraftTmgContract(command),
    action: "finish",
    arbitraryJsonParsingInDsh: false,
    modelAuthoredControlFields: false,
    trainingTruth: false,
  };
  return freeze({ command, receipt: { ...receiptBody,
    receiptHash: hashStarcraftTmgContract(receiptBody) } });
}

export function createStarcraftTmgStructuredDshModelBridgeV1(options = {}) {
  if (typeof options.generate !== "function"
    || typeof options.readCandidate !== "function"
    || typeof options.bindInvocation !== "function") {
    throw new TypeError("Structured DSH bridge dependencies are invalid");
  }
  return Object.freeze({
    async callModel(request = {}) {
      const binding = options.bindInvocation(request);
      const result = await options.generate(binding);
      if (result.status !== "accepted" || !result.candidateRef) {
        const error = new Error("STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED");
        error.code = "STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED";
        error.outcome = result;
        throw error;
      }
      const candidate = options.readCandidate(result.candidateRef);
      if (!candidate || candidate.hash !== result.candidateRef.hash) {
        throw new TypeError("Structured DSH candidate lookup failed");
      }
      const mapped = mapStarcraftTmgStructuredFinishToDshCommandV1({
        outputContractRef: binding.outputContractRef,
        value: candidate.providerValue,
      });
      return freeze({ command: mapped.command,
        usage: { inputUnits: result.usage.input,
          outputUnits: result.usage.output, totalUnits: result.usage.total },
        receiptHash: result.receiptRef.hash,
        mapperReceiptHash: mapped.receipt.receiptHash });
    },
  });
}
