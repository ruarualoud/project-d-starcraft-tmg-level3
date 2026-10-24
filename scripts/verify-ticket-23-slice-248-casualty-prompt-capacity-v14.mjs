// Concrete regression: C v13 r9's saved casualty domain overflowed the Action
// prompt before dispatch. Reads the original saved choice only; no Rules,
// Provider, Room mutation, lifecycle replay, or historical test suite.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { buildStarcraftTmgLivePromptArtifactV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { decodeStarcraftTmgGeometryColumnReuseV2 } from
  "../packages/online-agent-session/exact-geometry-column-reuse-v2.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES } from
  "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = name => process.argv.find(v => v.startsWith(`--${name}=`))
  ?.slice(name.length + 3);
function scoped(name) {
  assert(argument(name), `${name} required`);
  const value = path.resolve(root, argument(name));
  const relative = path.relative(root, value);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  return value;
}
const directory = scoped("captured-run-directory");
const receiptPath = scoped("receipt");
const seatKey = "player2";
const db = new DatabaseSync(path.join(directory, "seats", seatKey, "provider",
  "live-decisions.sqlite"), { readOnly: true });
let match;
try {
  match = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
    "SELECT record_json FROM sc_live_decision_records").get().record_json);
} finally { db.close(); }
const choice = Object.values(match.decisions).find(entry =>
  entry.authority.stateRevision === 9 && entry.stage === "action"
  && entry.plannerResult?.selectedActionIdentity?.actionType
    === "resolve_ranged_casualties")
  || Object.values(match.decisions).find(entry =>
    entry.authority.stateRevision === 9 && entry.stage === "action"
    && entry.actionIndex.some(row =>
      row.action?.actionType === "resolve_ranged_casualties"));
assert(choice, "actual C9 failed Action choice required");
const domain = choice.actionIndex.find(entry =>
  entry.id === choice.plannerResult.recommendedCandidateId).action;
const original = JSON.stringify(domain);
const failure = JSON.parse(await readFile(path.join(directory, "failure.json"),
  "utf8"));
assert(failure.details.blocking.some(entry =>
  entry.code === "LIVE_DECISION_PROVIDER_INPUT_CAPACITY_EXCEEDED"));
// Isolate the actual selected-domain presentation seam. Other observational
// nodes are deliberately absent, not claimed to reproduce the whole live input.
const actionSpace = { authority: choice.authority, finiteActions: [],
  parameterDomains: [domain] };
const input = { spatialActionSpace: actionSpace, legalSpace: actionSpace,
  roomProjection: { state: failure.lastManifest.state }, spatialObservation: null,
  promptPack: "selfplay_agent_prompt" };
const prompt = buildStarcraftTmgLivePromptArtifactV1(match, input, choice,
  choice.attemptKeys.length + 1, choice.queryReceipts, "action");
const selected = prompt.artifact.nodes.find(node =>
  node.nodeId === "planner-selected-action").content.parameterDomains[0];
const bytes = Buffer.byteLength(JSON.stringify(prompt.artifact), "utf8");
const receipt = { schemaVersion: "s248_casualty_prompt_capacity_regression_v14",
  sourceChoiceKey: choice.choiceKey, sourceStateRevision: 9,
  originalDomainBytes: Buffer.byteLength(original), promptBytes: bytes,
  inputLimitBytes: STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES,
  lossOptionCount: domain.constraints.strategicLossOptions.length,
  legalSelectionCount: domain.constraints.legalSelections.length,
  scope: "actual_saved_selected_domain_presentation_not_whole_room_admission",
  providerCalls: 0, roomWrites: 0, rulesReexecutions: 0, trainingTruth: false };
try {
  assert(bytes <= STARCRAFT_TMG_PROVIDER_EGRESS_MAX_REQUEST_BYTES,
    "actual C9 selected casualty domain alone exceeds provider input capacity");
  const restored = structuredClone(selected);
  delete restored.parameterContract;
  restored.constraints.strategicLossOptions =
    decodeStarcraftTmgGeometryColumnReuseV2(
      restored.constraints.strategicLossOptions);
  restored.constraints.legalSelections = decodeStarcraftTmgGeometryColumnReuseV2(
    restored.constraints.legalSelections);
  assert.deepEqual(restored, domain, "every original domain fact must survive");
  assert.equal(JSON.stringify(domain), original, "authority input unchanged");
  receipt.ok = true;
} catch (error) {
  receipt.ok = false;
  receipt.failure = error.message;
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" });
  throw error;
}
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n",
  { flag: "wx" });
process.stdout.write(JSON.stringify(receipt) + "\n");
