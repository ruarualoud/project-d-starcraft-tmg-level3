// One fresh real Planner/Action decision at the original declaration state.
// No original room write, dice reroll, historical action replay or old cache.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createChargeComparisonNativeContextV1 } from
  "./prepare-ticket-23-slice-248-charge-native-input-v1.mjs";
import { createStarcraftTmgLiveOpponentProviderStackV1 } from
  "../packages/online-agent-session/live-opponent-provider-stack-v1.mjs";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_PROVIDER_PROFILES_V1 } from
  "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [root, capsulePath, gatePath, destinationInput, retainedNewDecisionDirectory]
  = process.argv.slice(2);
if (!root || !capsulePath || !gatePath || !destinationInput) {
  throw new Error("Usage: root source-context capsule B111-passed-report NEW-outputDirectory");
}
const gate = JSON.parse(await readFile(gatePath, "utf8"));
if (gate.ok !== true || gate.outcome !== "success" || !gate.acceptedPath?.length) {
  throw new Error("Original B111 Rules continuation must pass before new model comparisons");
}
const capsule = JSON.parse(gunzipSync(await readFile(capsulePath)));
const destination = path.resolve(destinationInput);
const originalDirectory = capsule.evaluationOnly.originalDirectory;
if (destination === originalDirectory || destination.startsWith(originalDirectory + path.sep)) {
  throw new Error("Comparison output must not be inside the original room directory");
}
await mkdir(destination, { recursive: false, mode: 0o700 });
const report = { schemaVersion: "ticket23_charge_new_flow_model_comparison_v1",
  caseId: capsule.caseId, startedAt: new Date().toISOString(),
  originalRoomWrites: 0, originalAcceptedActionsApplied: 0,
  originalDiceExposedToModel: false, hiddenChainOfThoughtStored: false,
  nativeScopePreserved: true, oldChoiceCacheCopied: false,
  historicalWholePromptByteEqualityClaimed: false,
  strategyStrengthProven: false, performancePromotionAdmitted: false,
  onlineOriginalApplyReplayVerified: false, trainingTruth: false };
const started = performance.now();
let stack;
try {
  // Reconstitutes in-process query ports: it reads the original SQLite, never
  // initializes another room or changes the originals' current revision111.
  const context = await createChargeComparisonNativeContextV1({ root, capsulePath });
  report.nativeInputPreparation = context.metadata;
  const source = capsule.sourceContext;
  const snapshot = source.strategySkillSnapshot;
  const strategyEntries = snapshot.skillRefs.map(ref => ({
    role: ref.role,
    ...(ref.role === "faction" ? { factionRecordKey: snapshot.ownFaction } : {}),
    ...(ref.role === "matchup" ? {
      ownFaction: snapshot.ownFaction, opponentFaction: snapshot.opponentFaction,
    } : {}),
    skill: snapshot.skills.find(skill => skill.skillId === ref.skillId && skill.hash === ref.hash),
  }));
  if (strategyEntries.some(entry => !entry.skill)) throw new Error("Frozen original Skill missing");
  const profile = STARCRAFT_TMG_TICKET_23_LIVE_PROVIDER_PROFILES_V1.find(entry =>
    entry.integrity.hash === source.selectedProfile.profileRef.hash
    && entry.model === source.selectedProfile.model);
  if (!profile) throw new Error("Original Flash profile not available locally; no silent model switch");
  await writeFile(path.join(destination, "native-decision-input.private.json.gz"),
    gzipSync(Buffer.from(JSON.stringify(context.request)), { level: 1 }),
    { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ event: "native_input_ready", caseId: capsule.caseId,
    stateRevision: capsule.revision, model: profile.model, providerCalls: 0 }));
  let decision;
  if (retainedNewDecisionDirectory) {
    const paidReport = JSON.parse(await readFile(path.join(retainedNewDecisionDirectory,
      "report.private.json"), "utf8"));
    if (paidReport.caseId !== capsule.caseId || paidReport.decisionOk !== true
      || paidReport.nativeInputPreparation.stateHash !== context.metadata.stateHash) {
      throw new Error("Saved NEW model decision does not match this original state");
    }
    decision = JSON.parse(gunzipSync(await readFile(path.join(retainedNewDecisionDirectory,
      "new-decision.private.json.gz"))));
    report.retainedNewPaidDecisionDirectory = path.resolve(retainedNewDecisionDirectory);
    report.additionalProviderCalls = 0;
    console.log(JSON.stringify({ event: "new_paid_decision_reused_for_rules_evaluation",
      caseId: capsule.caseId, additionalProviderCalls: 0 }));
  } else {
    stack = await createStarcraftTmgLiveOpponentProviderStackV1({
    roomId: source.scope.roomId, seatKey: capsule.seatKey,
    matchBinding: context.fixture.createdRoom.matchBinding,
    spatialQueryPort: context.spatialRuntime, memoryQueryPort: context.continuity,
    strategyEntries, ownFaction: snapshot.ownFaction, opponentFaction: snapshot.opponentFaction,
    dataDirectory: path.join(destination, "provider"), matchMode: "agent_vs_agent",
    providerProfiles: [profile], providerInteractionMode: source.providerInteractionMode,
    budgetLimitCnyMicros: null,
    });
    if (hash(stack.strategySkillSnapshot) !== hash(snapshot)) {
      throw new Error("Frozen original Skill snapshot changed before model dispatch");
    }
    console.log(JSON.stringify({ event: "fresh_model_decision_started", caseId: capsule.caseId,
      model: stack.selectedProfile.model, oldPaidChoiceOrLaterDiceIncluded: false }));
    decision = await stack.decisionPort.decide(context.request);
  }
  await writeFile(path.join(destination, "new-decision.private.json.gz"),
    gzipSync(Buffer.from(JSON.stringify(decision)), { level: 1 }),
    { flag: "wx", mode: 0o600 });
  report.decisionOk = decision.ok === true;
  report.decisionReason = decision.reason || null;
  report.publicDecisionSummary = decision.publicDecisionSummary || null;
  report.selectedReason = decision.selectedReason || null;
  report.proposal = decision.proposal || null;
  report.providerTrace = decision.providerTrace || null;
  if (!decision.ok) throw new Error(decision.reason || "Fresh native decision did not complete");
  const request = context.request;
  // Only the backend Rules evaluator sees the full native private state.
  // The seat projection sent to the model intentionally omits these bundles.
  const rawState = (await context.fixture.roomRuntime.roomStore.loadRoom(source.scope.roomId))
    .envelope.state;
  let action;
  if (decision.proposal?.kind === "parameterized") {
    const domain = context.fixture.rulesRuntime.enumerate(rawState,
      { sideKey: capsule.seatKey }).parameterDomains.find(entry =>
      entry.domainId === decision.proposal.domainId);
    if (!domain) throw new Error("Fresh proposal is outside original current LegalSpace");
    action = context.fixture.rulesRuntime.instantiate(
      rawState, domain, decision.proposal.parameters).action;
  } else {
    action = request.spatialActionSpace.finiteActions.find(entry =>
      entry.candidateId === decision.proposal?.actionKey)?.action;
  }
  if (!action) throw new Error("Fresh proposal has no native action");
  report.sameRulesInstantiationAccepted = true;
  report.requiredChanceCount = Number(action.chance?.count || 0);
  report.resolutionPendingAuthoritativeChance = report.requiredChanceCount > 0;
  report.rollsGenerated = false;
  // A declaration is legal before its chance is revealed. No original ranged
  // dice exist for the NEW alternative, and fabricating results would change
  // this question from decision comparison into an invented combat outcome.
  if (!report.resolutionPendingAuthoritativeChance) {
    const evaluated = context.fixture.rulesRuntime.apply(rawState, action,
      { postRevision: capsule.revision + 1,
        matchBinding: context.fixture.createdRoom.matchBinding });
    if (!evaluated.ok) throw new Error("Fresh proposal failed the same Rules evaluation");
    report.sameRulesEvaluationAccepted = true;
    report.evaluationStateHash = hash(evaluated.state);
  }
  const old = JSON.parse(gunzipSync(await readFile(capsule.evaluationOnly.originalPaidChoicePath)));
  report.newActionType = action.sourceAction?.actionType || action.actionType;
  report.oldProposal = old.choice.completedDecision.proposal;
  report.proposalChanged = hash(decision.proposal) !== hash(report.oldProposal);
  report.planBeforeDecisionHash = source.retainedPlan?.planHash ?? null;
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  process.exitCode = 1;
} finally {
  // Close resources, not the original match. Unknown paid attempts are retained,
  // never automatically resent by this comparison entry.
  if (stack) await stack.close();
  const dbPath = path.join(retainedNewDecisionDirectory || destination,
    "provider", "live-decisions.sqlite");
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const row = db.prepare("SELECT record_json FROM sc_live_decision_records "
        + "ORDER BY updated_at DESC LIMIT 1").get();
      const record = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
      report.usage = record.usage;
      report.choices = Object.values(record.decisions).map(choice => ({
        choiceKey: choice.choiceKey, status: choice.status, stage: choice.stage,
        attemptCount: Object.keys(choice.attempts || {}).length,
        queryReceiptCount: choice.queryReceipts?.length || 0,
      }));
    } finally { db.close(); }
  } catch (error) { report.usageReadReason = error.message; }
  report.elapsedMs = performance.now() - started;
  report.endedAt = new Date().toISOString();
  await writeFile(path.join(destination, "report.private.json"),
    JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify(report));
}
