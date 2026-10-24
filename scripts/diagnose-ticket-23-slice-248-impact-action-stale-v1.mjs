#!/usr/bin/env node

// Read-only reduced replay of B's retained r63 mandatory Impact. Never prints
// the Room encryption key, private state, or Provider output.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND,
  enumerateOfficialSelectedRosterMeleeActionsV1,
  instantiateOfficialSelectedRosterMeleeActionV1,
  applyOfficialSelectedRosterMeleeActionV1,
} from "../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs";
import { createOfficialMeleeFamilyAdapterV1 } from
  "../packages/product-composition/official-melee-family-adapter-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV2 } from
  "../packages/product-composition/official-current-product-match-runtime-v2.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const directory = path.resolve(process.argv[2] || "");
if (!directory || directory === path.parse(directory).root) {
  throw new Error("Pass the exact retained Room directory");
}
const privateState = JSON.parse(readFileSync(path.join(directory,
  "fork-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(
    privateState.sourceDirectory)}`,
});
const roomDb = new DatabaseSync(path.join(directory, "room.sqlite"),
  { readOnly: true });
const roomRow = roomDb.prepare(`SELECT state_revision, aggregate_cipher,
  initial_envelope_cipher FROM sc_rooms`).get();
roomDb.close();
const aggregate = codec.decode(roomRow.aggregate_cipher,
  `room:${privateState.targetRoomId}:aggregate`);
const state = aggregate.envelope.state;
const beforeHash = hashStarcraftTmgContract(state);

const botDb = new DatabaseSync(path.join(directory, "seats/player2/bot-seat.sqlite"),
  { readOnly: true });
const botRow = botDb.prepare("SELECT record_json FROM sc_hosted_bot_seat_records")
  .get();
botDb.close();
const proposal = JSON.parse(botRow.record_json)?.inflight?.decision?.proposal;
if (proposal?.kind !== "parameterized"
  || !Array.isArray(proposal.parameters?.allocations)) {
  throw new Error("Retained B Impact proposal is missing");
}
const domain = enumerateOfficialSelectedRosterMeleeActionsV1(state, {
  sideKey: "player2", includeDisabled: true,
}).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND));
if (!domain) throw new Error("Retained B Impact domain is missing");
const first = instantiateOfficialSelectedRosterMeleeActionV1(state, domain,
  proposal.parameters);
const second = instantiateOfficialSelectedRosterMeleeActionV1(state, domain,
  { allocations: first.action.modelAllocations });
let applyError = null;
try {
  applyOfficialSelectedRosterMeleeActionV1(state, first.action,
    { chanceReveals: [] });
} catch (error) {
  applyError = error?.code || String(error?.message || error);
}
const adapter = createOfficialMeleeFamilyAdapterV1(
  state.officialMeleeFamilySourceBundle);
const outerDomain = adapter.legalSpace(state, { sideKey: "player2",
  includeDisabled: true }).parameterDomains.find((entry) => (
  entry.actionType === "resolve_impact"));
if (!outerDomain) throw new Error("Retained B outer Impact domain is missing");
const outerFirst = adapter.preview(state, { domain: outerDomain,
  parameters: proposal.parameters });
const outerSecond = adapter.preview(state, { domain: outerDomain,
  parameters: outerFirst.action.meleeFamilyPlan.canonicalParameters });
let outerApplyError = null;
try {
  adapter.apply(state, { action: outerFirst.action,
    options: { chanceReveals: [] } });
} catch (error) {
  outerApplyError = error?.code || String(error?.message || error);
}
const sourceRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root: path.resolve(import.meta.dirname, ".."),
});
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: sourceRoot,
});
// A versioned fork's initial envelope is a mid-match source revision and can
// contain summoned pieces absent from the original Army audits. Construct the
// frozen Rules runtime from the parent Room's actual creation state instead.
const sourcePrivate = JSON.parse(readFileSync(path.join(
  privateState.sourceDirectory, "runner-private.json"), "utf8"));
const sourceDb = new DatabaseSync(path.join(privateState.sourceDirectory,
  "room.sqlite"), { readOnly: true });
const sourceRow = sourceDb.prepare(`SELECT initial_envelope_cipher
  FROM sc_rooms`).get();
sourceDb.close();
const sourceCodec = createStarcraftTmgPrivatePayloadCodec({
  key: sourcePrivate.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(
    privateState.sourceDirectory)}`,
});
const sourceInitialEnvelope = sourceCodec.decode(sourceRow.initial_envelope_cipher,
  `room:${sourcePrivate.roomId}:initial-envelope`);
const initialState = structuredClone(sourceInitialEnvelope.state);
const runtimeV1 = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: initialState,
});
const runtime = createOfficialCurrentProductMatchRuntimeV2({
  legacyRuntime: runtimeV1,
});
function undefinedPaths(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (child === undefined) return [childPath];
    return undefinedPaths(child, childPath);
  });
}
const fullDomain = runtime.enumerate(state, { sideKey: "player2",
  includeDisabled: true,
  matchBinding: aggregate.envelope.matchBinding,
}).parameterDomains.find((entry) => entry.domainId === proposal.domainId);
let fullDiagnostic = { domainFound: Boolean(fullDomain),
  runtimeHash: runtime.descriptor.runtimeHash,
  frozenRuntimeHash: aggregate.rulesRuntimeBinding?.runtimeHash || null };
if (fullDomain) {
  const fullFirst = runtime.instantiate(state, fullDomain,
    proposal.parameters, { matchBinding: aggregate.envelope.matchBinding });
  let fullApplyError = null;
  let jsonClonedApplyError = null;
  try {
    runtime.apply(state, fullFirst.action, { chanceReveals: [],
      matchBinding: aggregate.envelope.matchBinding });
  } catch (error) {
    fullApplyError = error?.code || String(error?.message || error);
  }
  const jsonClonedAction = JSON.parse(JSON.stringify(fullFirst.action));
  try {
    runtime.apply(state, jsonClonedAction, { chanceReveals: [],
      matchBinding: aggregate.envelope.matchBinding });
  } catch (error) {
    jsonClonedApplyError = error?.code || String(error?.message || error);
  }
  fullDiagnostic = { ...fullDiagnostic,
    outerActionHash: hashStarcraftTmgContract(fullFirst.action),
    fullSourceActionEqualsDirect: isDeepStrictEqual(
      fullFirst.action.sourceAction, first.action),
    fullApplyError,
    jsonClonedApplyError,
    jsonCloneDeepEqual: isDeepStrictEqual(fullFirst.action, jsonClonedAction),
    undefinedActionPaths: undefinedPaths(fullFirst.action) };
}
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem,
  hmacSecret: privateState.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${path.basename(
    privateState.sourceDirectory)}`,
  trustLevel: "development_persistent",
});
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime, refereeCrypto,
});
const authority = engine.issueSeatAuthority({
  grantId: "diagnostic-player2-r63-preview-only",
  roomId: aggregate.envelope.roomId,
  matchBindingHash: aggregate.envelope.matchBindingHash,
  seatKey: "player2", roleMode: "player", principalType: "human",
  capabilities: ["preview"],
});
const preview = engine.preview({ envelope: aggregate.envelope,
  seatAuthority: authority, proposal });
process.stdout.write(`${JSON.stringify({
  roomStateRevision: roomRow.state_revision,
  sourceStateUnchanged: hashStarcraftTmgContract(state) === beforeHash,
  domainId: domain.domainId,
  incomingDomainId: proposal.domainId,
  repeatedInstantiationEqual: isDeepStrictEqual(first.action, second.action),
  firstActionHash: hashStarcraftTmgContract(first.action),
  secondActionHash: hashStarcraftTmgContract(second.action),
  chanceLayout: first.action.chance?.layout || null,
  chanceCount: first.action.chance?.count || null,
  applyError,
  outerDomainId: outerDomain.domainId,
  outerRepeatedInstantiationEqual: isDeepStrictEqual(outerFirst.action,
    outerSecond.action),
  outerDelegateEqualsDirect: isDeepStrictEqual(
    outerFirst.action.meleeFamilyPlan.delegateAction, first.action),
  outerApplyError,
  fullDiagnostic,
  enginePreview: { ok: preview.ok,
    reason: preview.reason || preview.code || null,
    message: preview.message || null,
    keys: Object.keys(preview) },
}, null, 2)}\n`);
