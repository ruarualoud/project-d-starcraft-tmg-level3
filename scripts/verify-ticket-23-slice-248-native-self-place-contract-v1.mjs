import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindStarcraftTmgFormationSelectionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { inspectStarcraftTmgActionParametersV1 } from
  "../packages/online-agent-session/action-parameter-contract-v1.mjs";

// Captured B/r26 paid outputs, not a synthetic action or another model call.
const filename = process.argv.find(value => value.startsWith("--fixture="))
  ?.slice("--fixture=".length);
assert.ok(filename, "captured fixture is required");
const { choice } = JSON.parse(await readFile(filename, "utf8"));
const failure = choice.parameterRecoveryHistory.at(-1);
const domain = choice.actionIndex.find(entry => entry.id === failure.domainId).action;
const receipt = choice.queryReceipts.find(entry =>
  entry.queryKind === "space.solve_formation"
    && entry.result.domainId === domain.domainId);
assert.equal(domain.effectContract.targetKind, "self_place");
assert.ok(domain.parameterSchema.required.includes("placements"));
const capturedReceipt = structuredClone(receipt);
let checked = 0;
for (const option of receipt.result.formationOptions) {
  assert.ok(Array.isArray(option.canonicalParameters.placement));
  const parameters = structuredClone(option.canonicalParameters);
  const original = structuredClone(parameters);
  const inspection = inspectStarcraftTmgActionParametersV1(domain, parameters);
  assert.equal(inspection.valid, true,
    "Rules-instantiated canonical placement was rejected: "
      + JSON.stringify(inspection.fieldIssues));
  assert.deepEqual(parameters, original, "inspection must not rewrite paid evidence");
  const raw = {
    proposal: { kind: "parameterized", domainId: domain.domainId },
    formationSelection: {
      formationOptionId: option.formationOptionId,
      paymentCardInstanceIds: option.canonicalParameters.paymentCardInstanceIds,
      publicReason: "Retain this complete Host-solved layout.",
      slotAssignments: [],
    },
  };
  const defaultBound = bindStarcraftTmgFormationSelectionV1(raw, [receipt]);
  assert.deepEqual(defaultBound.proposal.parameters, original);
  const explicit = structuredClone(raw);
  explicit.formationSelection.slotAssignments = option.slots.map(slot => ({
    slotId: slot.slotId, modelId: slot.defaultModelId,
    publicReason: "Retain the selected slot and model identity.",
  }));
  const explicitBound = bindStarcraftTmgFormationSelectionV1(explicit, [receipt]);
  assert.deepEqual(explicitBound.proposal.parameters, original,
    "explicit assignments must retain the native self-place parameter shape");
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    explicitBound.proposal.parameters).valid, true);
  const both = { ...parameters, placements: structuredClone(parameters.placement) };
  assert.equal(inspectStarcraftTmgActionParametersV1(domain, both).valid, true);
  both.placements[0].xMilliInches += 1;
  assert.equal(inspectStarcraftTmgActionParametersV1(domain, both).valid, false,
    "conflicting placement representations must not be accepted");
  const missing = structuredClone(parameters);
  delete missing.placement;
  assert.equal(inspectStarcraftTmgActionParametersV1(domain, missing).valid, false);
  const unrelated = structuredClone(domain);
  unrelated.effectContract.targetKind = "enemy_within";
  assert.equal(inspectStarcraftTmgActionParametersV1(unrelated, parameters).valid,
    false, "native alias is only valid for the current self-place domain");
  checked += 1;
}
assert.deepEqual(receipt, capturedReceipt, "retained query receipt stays immutable");
console.log(JSON.stringify({ ok: true, capturedRevision: choice.authority.stateRevision,
  completeNativeOptionsChecked: checked, paidCalls: 0, roomWrites: 0,
  retainedReceiptUnchanged: true, trainingTruth: false }));
