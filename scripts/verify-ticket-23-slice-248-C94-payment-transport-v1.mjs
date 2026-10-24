import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { projectStarcraftTmgSubmittedActionV1,
  buildStarcraftTmgLivePromptArtifactV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { inspectStarcraftTmgActionParametersV1 } from
  "../packages/online-agent-session/action-parameter-contract-v1.mjs";

// Concrete C94 transport bug. Original databases are read-only. The current
// advertised contract is not a substitute for Native instantiation/Apply.
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))
  ?.slice(name.length + 3);
const db = new DatabaseSync(arg("database"), { readOnly: true });
const row = db.prepare("SELECT record_json FROM sc_live_decision_records ORDER BY updated_at DESC LIMIT 1").get();
db.close();
const match = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
const choice = Object.values(match.decisions).at(-1);
const raw = choice.attempts[choice.attemptKeys.at(-1)].safeOutput;
const submission = raw.decision || raw;
const domain = choice.actionIndex.find(e => e.id === submission.candidateId).action;
const authority = choice.authority;
const input = {
  roomProjection: { room: { roomId: authority.roomId,
    stateRevision: authority.stateRevision, stateHash: authority.stateHash },
  matchBinding: { bindingHash: authority.matchBindingHash },
  viewer: { seatKey: authority.seatKey },
  state: { round: 2, phase: "movement", pieces: [], terrain: [], markers: [] } },
  legalSpace: { legalSpaceHash: authority.legalSpaceHash, actions: [] },
  spatialActionSpace: { actionSpaceHash: authority.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.filter(e => e.kind === "finite")
      .map(e => ({ candidateId: e.id, action: e.action })),
    parameterDomains: choice.actionIndex.filter(e => e.kind === "parameterized")
      .map(e => e.action) },
  spatialObservation: { observationHash: authority.spatialObservationHash,
    units: [], offTableUnits: [], terrain: [] },
};
const original = JSON.stringify({ submission, domain, choice });
let report;
try {
  assert.equal(authority.stateRevision, 94);
  assert.equal(choice.status, "provider_output_invalid");
  assert.equal(choice.parameterRecoveryHistory.length, 3);
  assert.deepEqual(submission.selection.paymentCardInstanceIds,
    ["faction:player1", "player1-tactical-1"]);
  if (arg("only") !== "schema") {
  const mapped = projectStarcraftTmgSubmittedActionV1(submission, input, choice);
  assert.deepEqual(mapped.proposal.parameters.paymentCardInstanceIds,
    submission.selection.paymentCardInstanceIds,
    "C94 model-owned payment must reach Rules even when parametersJson omits the duplicate field");
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    mapped.proposal.parameters).valid, true);
  // Existing JSON-only submissions remain valid; empty duplicate wrappers do
  // not erase their explicit payment. Conflicting non-empty selections are not
  // silently resolved by the Host.
  const nested = structuredClone(submission);
  nested.selection.paymentCardInstanceIds = [];
  nested.selection.parametersJson = JSON.stringify(mapped.proposal.parameters);
  assert.deepEqual(projectStarcraftTmgSubmittedActionV1(nested, input, choice)
    .proposal.parameters.paymentCardInstanceIds, mapped.proposal.parameters.paymentCardInstanceIds);
  const conflict = structuredClone(submission);
  conflict.selection.parametersJson = JSON.stringify({ ...mapped.proposal.parameters,
    paymentCardInstanceIds: ["faction:player1"] });
  assert.throws(() => projectStarcraftTmgSubmittedActionV1(conflict, input, choice),
    /ACTION_PARAMETER_PAYMENT_CONFLICT/u);
  const wrong = structuredClone(submission);
  wrong.selection.paymentCardInstanceIds = ["foreign-card"];
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    projectStarcraftTmgSubmittedActionV1(wrong, input, choice).proposal.parameters).valid, false,
  "transport never certifies an invalid payment");
  }
  for (const mode of ["native_tools", "json_channels_v1"]) {
    const prompt = buildStarcraftTmgLivePromptArtifactV1({ ...match,
      providerInteractionMode: mode }, input, choice, 1, [], "action");
    // Find the one shared terminal schema regardless of its protocol wrapper.
    const scan = value => {
      if (!value || typeof value !== "object") return null;
      if (value.properties?.selection?.properties?.paymentCardInstanceIds)
        return value.properties.selection.properties.paymentCardInstanceIds;
      for (const child of Object.values(value)) { const found = scan(child); if (found) return found; }
      return null;
    };
    const schema = scan(prompt.artifact);
    assert.ok(schema, `terminal payment schema missing for ${mode}`);
    assert.ok(schema.maxItems === undefined || schema.maxItems >= 2,
      `${mode} must not forbid the model's two-card payment`);
    assert.ok(schema.items.enum.includes("faction:player1"));
    assert.ok(schema.items.enum.includes("player1-tactical-1"));
  }
  assert.equal(JSON.stringify({ submission, domain, choice }), original);
  report = { ok: true, originalRevision: 94,
    scope: arg("only") === "schema" ? "unpassed_schema_branch_only" : "payment_transport_and_schema",
    bothProtocolSchemasAllowPayment: true, providerCalls: 0,
    originalDatabaseWrites: 0, roomMutations: 0, realNativeExecutionClaimed: false };
  console.log("C94_PAYMENT_TRANSPORT_OK");
} catch (error) {
  report = { ok: false, failure: error.message, providerCalls: 0,
    originalDatabaseWrites: 0, roomMutations: 0 };
  throw error;
} finally {
  await writeFile(arg("report"), JSON.stringify(report, null, 2), { mode: 0o600 });
}
