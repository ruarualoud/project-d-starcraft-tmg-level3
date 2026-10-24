// Concrete C r9 CPU stall: catalogue construction bypassed the existing
// immutable casualty strategy batch and cloned the whole map for every choice.
// Read only the original stopped room and its saved exact domain. No Provider,
// room writes, Rules actions, old accepted replay, or unrelated performance cases.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { enumerateOfficialSelectedRosterRangedActionsV1,
  instantiateOfficialSelectedRosterRangedActionV1 } from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = name => process.argv.find(value =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
function scoped(name) {
  assert(argument(name), `${name} required`);
  const result = path.resolve(root, argument(name));
  const relative = path.relative(root, result);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  return result;
}
const directory = scoped("captured-run-directory");
const receiptPath = scoped("receipt");
const privateRecord = JSON.parse(await readFile(path.join(directory,
  "runner-private.json"), "utf8"));
const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let aggregate;
try {
  const cipher = db.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?")
    .get(privateRecord.roomId).aggregate_cipher;
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateRecord.storeEncryptionKeyBase64, keyId: JSON.parse(cipher).keyId,
    trustLevel: "development_persistent",
  });
  aggregate = codec.decode(cipher, `room:${privateRecord.roomId}:aggregate`);
} finally { db.close(); }
assert.equal(aggregate.stateRevision, 9, "actual stopped C9 required");
const providerDb = new DatabaseSync(path.join(directory, "seats", "player2",
  "provider", "live-decisions.sqlite"), { readOnly: true });
let match;
try {
  match = decodeStarcraftTmgLiveDecisionRecordV1(providerDb.prepare(
    "SELECT record_json FROM sc_live_decision_records").get().record_json);
} finally { providerDb.close(); }
const choice = Object.values(match.decisions).find(entry =>
  entry.authority.stateRevision === 9 && entry.stage === "action");
assert.equal(choice.authority.stateHash, aggregate.envelope.stateHash);
const expected = choice.actionIndex.find(entry =>
  entry.id === choice.plannerResult.recommendedCandidateId).action;
const paid = choice.attempts[choice.attemptKeys.at(-1)];
assert.equal(paid.status, "completed");
const paidParameters = JSON.parse(paid.safeOutput.decision.selection.parametersJson);
const state = aggregate.envelope.state;
const originalState = JSON.stringify(state);
const cloneNative = globalThis.structuredClone;
let fullRoomClones = 0;
const receipt = {
  schemaVersion: "s248_casualty_catalogue_batch_regression_v15",
  stateRevision: 9, stateHash: aggregate.envelope.stateHash,
  choiceKey: choice.choiceKey,
  scope: "actual_pending_casualty_enumeration_and_instantiation_not_action_apply",
  providerCalls: 0, roomWrites: 0, acceptedActionsReplayed: 0, trainingTruth: false,
};
globalThis.structuredClone = (value, ...args) => {
  if (Array.isArray(value?.pieces) && value?.officialTerrainLosDataBundle) {
    fullRoomClones++;
    if (fullRoomClones > 40) {
      throw new Error("UNBATCHED_CASUALTY_CATALOGUE_FULL_ROOM_CLONES");
    }
  }
  return cloneNative(value, ...args);
};
const started = performance.now();
try {
  const enumeration = enumerateOfficialSelectedRosterRangedActionsV1(state,
    { sideKey: "player2" });
  const domain = enumeration.parameterDomains.find(entry =>
    entry.parameterKind === expected.parameterKind);
  assert(domain, "current casualty domain required");
  assert.equal(domain.constraints.legalSelections.length, 306);
  assert.equal(domain.constraints.strategicLossOptions.length, 306);
  assert.deepEqual(domain.constraints, expected.constraints,
    "all original loss, Supply, geometry, firepower and marker facts unchanged");
  assert.deepEqual(domain.parameterSchema, expected.parameterSchema);
  const selected = domain.constraints.legalSelections.find(selection =>
    selection.selectionHash === paidParameters.casualtySelectionHash);
  assert(selected, "actual paid casualty pair remains legal");
  const instantiated = instantiateOfficialSelectedRosterRangedActionV1(state,
    domain, paidParameters);
  assert.equal(instantiated.action.casualtySelectionHash, selected.selectionHash);
  assert.equal(instantiated.action.pendingHash, domain.constraints.pendingHash);
  assert.equal(JSON.stringify(state), originalState, "original state unchanged");
  receipt.ok = true;
  receipt.legalSelectionCount = domain.constraints.legalSelections.length;
  receipt.strategicLossOptionCount = domain.constraints.strategicLossOptions.length;
} catch (error) {
  receipt.ok = false;
  receipt.failure = String(error.message);
  throw error;
} finally {
  globalThis.structuredClone = cloneNative;
  receipt.fullRoomClones = fullRoomClones;
  receipt.elapsedMs = Math.round(performance.now() - started);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2), {
    flag: "wx", mode: 0o600,
  });
  console.log(JSON.stringify(receipt));
}
