// Prepare the original C107/B110 visible context for later fresh decisions.
// No model, Rules evaluation, original-store write, room fork or cache deletion.
// This capsule is source context, NOT a complete hosted decision-request.
import { DatabaseSync } from "node:sqlite";
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";

const [evidenceRootInput, caseId, originalDirectoryInput, outputDirectoryInput]
  = process.argv.slice(2);
const cases = {
  C107: { arm: "C", revision: 107, seatKey: "player1", name: "Marine3" },
  B110: { arm: "B", revision: 110, seatKey: "player2", name: "Raptor" },
};
const selected = cases[caseId];
if (!selected || !evidenceRootInput || !originalDirectoryInput
  || !outputDirectoryInput) {
  throw new Error("Usage: evidenceRoot C107|B110 originalDirectory outputDirectory");
}
const evidenceRoot = path.resolve(evidenceRootInput);
const originalDirectory = path.resolve(originalDirectoryInput);
const outputDirectory = path.resolve(outputDirectoryInput);
if (outputDirectory === originalDirectory
  || outputDirectory.startsWith(originalDirectory + path.sep)) {
  throw new Error("Comparison output must be outside the original room directory");
}
const stateCapturePath = path.join(evidenceRoot, selected.arm,
  `actual-${caseId}-pre-declaration-state.private.json.gz`);
const oldChoicePath = path.join(evidenceRoot, selected.arm,
  `actual-${caseId}-charge-declaration-choice.private.json.gz`);
const capture = JSON.parse(gunzipSync(await readFile(stateCapturePath)));
const old = JSON.parse(gunzipSync(await readFile(oldChoicePath)));
const choice = old.choice;
if (choice?.authority?.stateRevision !== selected.revision
  || choice.authority.seatKey !== selected.seatKey
  || capture.stateRevision !== selected.revision
  || capture.stateHash !== choice.authority.stateHash) {
  throw new Error("Original pre-declaration context does not match the selected case");
}
const cutoff = choice.createdAt;
if (!Number.isFinite(Date.parse(cutoff))) {
  throw new Error("Original decision creation time is required for the memory boundary");
}
const providerDirectory = path.join(originalDirectory, "seats",
  selected.seatKey, "provider");
const decisionsDb = new DatabaseSync(path.join(providerDirectory,
  "live-decisions.sqlite"), { readOnly: true });
let liveRecord;
try {
  const row = decisionsDb.prepare("SELECT record_json FROM sc_live_decision_records "
    + "ORDER BY updated_at DESC LIMIT 1").get();
  liveRecord = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
} finally {
  decisionsDb.close();
}
if (!liveRecord.decisions?.[choice.choiceKey]
  || liveRecord.scope.seatKey !== selected.seatKey
  || liveRecord.scope.matchBindingHash !== choice.authority.matchBindingHash) {
  throw new Error("Original provider scope or retained paid choice does not match");
}
const memoryDb = new DatabaseSync(path.join(originalDirectory, "seats",
  selected.seatKey, "match-memory.sqlite"), { readOnly: true });
let prefix;
let scopedMemoryCount;
try {
  scopedMemoryCount = memoryDb.prepare("SELECT COUNT(*) AS count "
    + "FROM sc_match_decision_journal WHERE scope_key=?")
    .get(liveRecord.scope.scopeKey).count;
  // Same-revision records written AFTER the old decision began include its
  // reflection/plan/intent. Revision-only filtering would leak the old answer.
  prefix = memoryDb.prepare("SELECT record_json FROM sc_match_decision_journal "
    + "WHERE scope_key=? AND occurred_at<? ORDER BY sequence")
    .all(liveRecord.scope.scopeKey, cutoff)
    .map(row => JSON.parse(row.record_json));
} finally {
  memoryDb.close();
}

const modelSourceContext = {
  scope: liveRecord.scope,
  selectedProfile: liveRecord.selectedProfile,
  providerInteractionMode: liveRecord.providerInteractionMode,
  strategySkillSnapshot: liveRecord.strategySkillSnapshot,
  retainedPlan: choice.currentPlan,
  originalDecisionStartedAt: cutoff,
  memoryJournalPrefix: prefix,
};
const capsule = {
  schemaVersion: "ticket23_charge_comparison_source_context_capsule_v1",
  caseId, ...selected,
  sourceContext: modelSourceContext,
  stateSource: {
    stateCapturePath,
    stateRevision: capture.stateRevision,
    stateHash: capture.stateHash,
    authority: choice.authority,
    // The future runner must use the native seat projection/action-space
    // compiler. Never serialize the complete private state to the model.
    rawStateIsNotAModelPrompt: true,
  },
  evaluationOnly: {
    originalPaidChoicePath: oldChoicePath,
    oldChoiceKey: choice.choiceKey,
    originalDirectory,
    noOldPaidChoiceOrLaterDiceInModelContext: true,
  },
  executionRequirements: {
    originalB111RecoveryGateStillRequired: true,
    freshIndependentDecisionStoreRequired: true,
    unchangedOriginalPlanSkillMapRoster: true,
    nativeViewerAndActionSpaceCompilationStillRequired: true,
    nativeMemoryProjectionAndQueriesStillRequired: true,
    nativeFullDecisionAndRulesValidationStillRequired: true,
    oldAcceptedActionsMustNotBeApplied: true,
    laterChargeRollMustNotBeExposed: true,
  },
  providerCalls: 0,
  originalStoreWrites: 0,
  completeHostedDecisionInputPrepared: false,
  newModelDecisionExecuted: false,
  trainingTruth: false,
};
// New artifacts only. Preserve original state/choice files and all stores.
await mkdir(outputDirectory, { recursive: false, mode: 0o700 });
const capsulePath = path.join(outputDirectory, "source-context.private.json.gz");
await writeFile(capsulePath, gzipSync(Buffer.from(JSON.stringify(capsule)),
  { level: 1 }), { flag: "wx", mode: 0o600 });
const summary = {
  schemaVersion: "ticket23_charge_comparison_context_preparation_v1",
  caseId, stateRevision: selected.revision, seatKey: selected.seatKey,
  stateHash: capture.stateHash,
  memoryCutoff: cutoff, retainedMemoryRecordCount: prefix.length,
  excludedAtOrAfterDecisionStartCount: Number(scopedMemoryCount) - prefix.length,
  lastRetainedSequence: prefix.at(-1)?.sequence ?? null,
  lastRetainedOccurredAt: prefix.at(-1)?.occurredAt ?? null,
  retainedPlanHash: choice.currentPlan?.planHash ?? null,
  retainedSkillRefs: liveRecord.strategySkillSnapshot.skillRefs,
  selectedModel: liveRecord.selectedProfile.model,
  nativeScopePreserved: true,
  originalPaidChoiceRetainedSeparately: true,
  originalChoiceNotCopiedIntoNewLiveChoiceCache: true,
  completeHostedDecisionInputPrepared: false,
  providerCalls: 0, originalStoreWrites: 0,
  trainingTruth: false,
  capsulePath,
};
await writeFile(path.join(outputDirectory, "preparation.private.json"),
  JSON.stringify(summary, null, 2), { flag: "wx", mode: 0o600 });
console.log(JSON.stringify(summary));
