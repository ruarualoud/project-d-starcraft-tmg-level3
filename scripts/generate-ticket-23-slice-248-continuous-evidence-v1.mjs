#!/usr/bin/env node
// Offline report consumer only. Never opens a writer Store or calls a Provider.
import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = (name) => process.argv.find((value) =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
function scoped(value) {
  assert(value, "report path required");
  const result = path.resolve(ROOT, value);
  const relative = path.relative(ROOT, result);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "report inputs and outputs must stay in this worktree");
  return result;
}
const directory = scoped(argument("run-directory"));
const output = scoped(argument("output-directory"));
const externalCost = argument("external-cost-cny");
assert(externalCost === undefined || Number.isFinite(Number(externalCost)),
  "external cost must be an explicit finite number");
const json = async (filename, optional = false) => {
  try { return JSON.parse(await readFile(filename, "utf8")); }
  catch (error) { if (optional && error.code === "ENOENT") return null; throw error; }
};
const exists = async (filename) => access(filename).then(() => true, (error) => {
  if (error.code === "ENOENT") return false;
  throw error;
});
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const publicRelative = (filename) => path.relative(ROOT, filename);
const primitiveFields = (value) => Object.fromEntries(Object.entries(value || {})
  .filter(([, item]) => item === null || ["string", "boolean", "number"].includes(typeof item)));

// Each explicit recovery keeps its own revisions. Do not deduplicate by revision
// across epochs, or replay the ancestors just to get a new report.
const chain = [];
const seen = new Set();
let cursor = directory;
for (;;) {
  assert(!seen.has(cursor) && seen.size < 64, "cyclic or unbounded report lineage");
  seen.add(cursor);
  const link = await json(path.join(cursor, "fork-private.json"), true);
  const receipt = link ? await json(path.join(cursor, "fork-receipt.json")) : null;
  if (link) {
    assert(receipt.sameLogicalRoomId === true
      && link.sourceRoomId === link.targetRoomId,
    "this report requires an explicit same-logical-room recovery");
  }
  chain.unshift({ directory: cursor, link, recoveryReceipt: receipt });
  if (!link) break;
  cursor = scoped(link.sourceDirectory);
}
const rootPrivate = await json(path.join(chain[0].directory, "runner-private.json"));
const roomId = rootPrivate.roomId;
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: rootPrivate.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(chain[0].directory)}`,
  trustLevel: "development_persistent",
});
const rows = [];
const segments = [];
const gaps = [];
let leafState;
for (let epoch = 0; epoch < chain.length; epoch += 1) {
  const segment = chain[epoch];
  const child = chain[epoch + 1];
  const cut = child?.recoveryReceipt.sourceStateRevision;
  const db = new DatabaseSync(path.join(segment.directory, "room.sqlite"), { readOnly: true });
  let aggregate;
  let receipts;
  try {
    db.exec("BEGIN"); // One coherent read snapshot, no live writer API.
    const stored = db.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?").get(roomId);
    assert(stored, "report room missing from an epoch");
    aggregate = codec.decode(stored.aggregate_cipher, `room:${roomId}:aggregate`);
    receipts = db.prepare("SELECT sequence,payload_cipher FROM sc_private_journal "
      + "WHERE room_id=? ORDER BY sequence").all(roomId)
      .map((entry) => codec.decode(entry.payload_cipher,
        `room:${roomId}:private:${entry.sequence}`))
      .filter((entry) => entry.type === "accepted_transition")
      .map((entry) => entry.payload.receipt);
    db.exec("COMMIT");
  } finally { db.close(); }
  const through = cut ?? aggregate.stateRevision;
  assert(Number.isSafeInteger(through) && through >= 0, "invalid epoch boundary");
  const included = receipts.filter((entry) => entry.postStateRevision <= through);
  assert.equal(included.length, through, "missing authoritative epoch receipts");
  assert(included.every((entry, index) => entry.roomId === roomId
    && entry.postStateRevision === index + 1), "non-contiguous authoritative epoch");
  if (child && through > 0) {
    const last = included.at(-1);
    assert.equal(last.postStateHash, child.recoveryReceipt.sourceStateHash,
      "source boundary state does not match saved recovery");
    assert.equal(last.journalHash, child.recoveryReceipt.sourceJournalHeadHash,
      "source boundary receipt does not match saved recovery");
  }
  let captures = [];
  try {
    captures = (await readFile(path.join(segment.directory, "actions.ndjson"), "utf8"))
      .split("\n").filter(Boolean).map(JSON.parse);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const capturesByRevision = new Map(captures.map((entry) => [entry.postStateRevision, entry]));
  segments.push({ epoch, directory: publicRelative(segment.directory), throughRevision: through,
    includedReceiptCount: included.length,
    excludedAcceptedSuffixCount: receipts.length - included.length,
    recoveryKind: segment.recoveryReceipt?.recoveryKind ?? null,
    frozenSourceEstimatedCostCny: segment.recoveryReceipt?.frozenSourceEstimatedCostCny ?? null,
    oldHistoryEdited: segment.recoveryReceipt?.oldHistoryEdited ?? false });
  for (const receipt of included) {
    const capture = capturesByRevision.get(receipt.postStateRevision);
    if (capture) assert.equal(capture.receiptHash, receipt.journalHash,
      "recorded action belongs to a different receipt");
    let screenshot = capture?.boardScreenshot || capture?.screenshot;
    let screenshotPath = screenshot ? scoped(path.join(segment.directory, screenshot)) : null;
    let screenshotOrigin = "action_time_web_capture";
    if (!screenshotPath || !await exists(screenshotPath)) {
      screenshotPath = null;
      // A later capture may illustrate the same physical boundary. It is NOT
      // relabelled as the original action-time screenshot or original binding.
      if (child && receipt.postStateRevision === through
        && child.recoveryReceipt.physicalLiveBoardUnchanged === true) {
        const recoveryCapture = path.join(child.directory,
          "screenshots/0001-r000-room-connected-initial.png");
        if (await exists(recoveryCapture)) {
          screenshotPath = recoveryCapture;
          screenshotOrigin = "later_recovery_boundary_capture";
        }
      }
      if (!screenshotPath) screenshotOrigin = "not_yet_captured";
      gaps.push({ epoch, stateRevision: receipt.postStateRevision,
        receiptHash: receipt.journalHash, code: "ORIGINAL_ACTION_TIME_CAPTURE_MISSING",
        laterBoundaryIllustrationAvailable: Boolean(screenshotPath) });
    }
    rows.push({ chronologyIndex: rows.length + 1, epoch,
      stateRevision: receipt.postStateRevision, receiptHash: receipt.journalHash,
      sourceDirectory: publicRelative(segment.directory),
      round: capture?.round ?? receipt.postGameClock?.round ?? receipt.preGameClock?.round ?? null,
      phase: capture?.phase ?? receipt.action.phase, sideKey: receipt.action.sideKey,
      actionType: receipt.action.actionType, pieceId: receipt.action.pieceId ?? null,
      rulesBinding: receipt.matchBindingHash,
      replayMatchesCurrent: capture?.replayMatchesCurrent ?? null,
      replayEvidenceRecorded: capture?.replayMatchesCurrent === true,
      authoritativeAcceptedReceipt: true,
      publicDecisionSummary: capture?.publicDecisionSummary ?? null,
      selectedReason: capture?.selectedReason ?? null,
      planAssessment: capture?.assessment ?? null, intent: capture?.intent ?? null,
      modelDecision: capture?.modelDecision ?? null,
      providerCalls: capture?.providerCalls ?? null,
      screenshot: screenshotPath ? publicRelative(screenshotPath) : null,
      screenshotOrigin,
      dicePool: (receipt.chanceReveal?.reveals || []).map(({ faces, outcome, counter }) =>
        ({ faces, outcome, counter })),
      diceLayout: receipt.chanceReveal?.spec?.layout ?? null,
      rulesEvents: receipt.events ?? [],
      hiddenChainOfThoughtStored: false, trainingTruth: false });
  }
  if (!child) leafState = aggregate.envelope.state;
}
const progress = await json(path.join(directory, "progress.json"), true);
const leafPrivate = await json(path.join(directory, "runner-private.json"));
const report = { schemaVersion: "ticket23_slice248_continuous_evidence_v1", roomId,
  createdAt: new Date().toISOString(), matchComplete: leafState.terminal === true,
  acceptanceComplete: false, chronologyCount: rows.length, segments, rows,
  originalActionTimeCaptureGaps: gaps,
  finalSnapshot: { round: leafState.round, phase: leafState.phase,
    scores: leafState.scores, winner: leafState.winner, terminalReason: leafState.terminalReason },
  map: { configuration: leafPrivate.mapConfiguration,
    freeze: primitiveFields(leafState.officialCompetitiveMapRoomFreeze),
    mission: primitiveFields(leafState.selectedMission?.profile ?? leafState.mission),
    deployment: primitiveFields(leafState.selectedDeployment?.profile),
    battlefield: leafState.officialDeploymentGeometryBinding?.battlefield ?? null,
    entryEdgesByPlayer: leafState.officialDeploymentGeometryBinding?.entryEdgesByPlayer ?? null,
    markerAffinityByNumber: leafState.officialMissionSetupBinding?.markerAffinityByNumber ?? null,
    engagementScale: leafState.engagementScale },
  accounting: { scope: "last Web progress snapshot; in-flight fees may be additional",
    currentEpochEstimatedCny: progress?.estimatedCostCny ?? null,
    logicalRoomEstimatedCny: progress?.costStreamCurrentEstimatedCostCny ?? null,
    externalEstimatedCny: externalCost === undefined ? null : Number(externalCost),
    cumulativeEstimatedCny: externalCost !== undefined
      && Number.isFinite(progress?.costStreamCurrentEstimatedCostCny)
      ? Number(externalCost) + progress.costStreamCurrentEstimatedCostCny : null,
    ancestralFeesReset: false, unknownFeeRecordsEdited: false },
  providerCallsForReport: 0, rulesActionsReexecuted: 0, roomWrites: 0,
  sourceRefreshPerformed: false, trainingTruth: false };
await mkdir(output, { recursive: true });
const relativeImage = (row) => row.screenshot
  ? path.relative(output, path.join(ROOT, row.screenshot)).split(path.sep).join("/") : null;
const label = (row) => `#${row.chronologyIndex} · epoch${row.epoch}/r${row.stateRevision}`;
const md = [`# ${roomId} 连续对局证据`, "",
  "部分记录；不是完整策略或产品验收。各 epoch 保留原 revision，不重放历史。",
  `已保存 ${rows.length} 个权威接受动作；原动作时刻截图缺口 ${gaps.length}。`,
  "随机池含预分配骰子，不代表全部实际使用；实际结算见 Rules 事件。", "",
  ...rows.flatMap((row) => [`## ${label(row)} · R${row.round} ${row.phase}`, "",
    `${row.sideKey} / ${row.actionType} / ${row.pieceId ?? "全局动作"}`,
    `回执 ${row.receiptHash}；截图来源 ${row.screenshotOrigin}。`, "",
    row.selectedReason ?? "没有保存该动作的公开模型理由；不补写或推测。", "",
    row.screenshot ? `![${label(row)}](${relativeImage(row)})` : "截图尚缺。", ""]),
].join("\n");
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>连续对局证据</title>
<style>body{margin:24px auto;max-width:1200px;background:#081421;color:#d5e9f0;font:15px/1.6 sans-serif;padding:0 20px}
h1,h2{color:#78cbdc}article{border:1px solid #345566;border-radius:8px;padding:18px;margin:22px 0;break-before:page}
img{display:block;max-width:100%;max-height:75vh;object-fit:contain;margin:15px auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}
.warn{color:#e2bc7d}details{border-top:1px solid #345566;padding-top:10px}small{overflow-wrap:anywhere}
@media print{body{background:white;color:#172c39}img{max-height:150mm}details{display:block}}</style>
<h1>${escape(roomId)} · 连续证据</h1><p class="warn">部分记录，${rows.length}个接受动作；不代表完整策略或产品验收。
原动作时刻截图缺口${gaps.length}；后补的恢复边界图片明确标注，不冒充原图。无历史动作重执行。</p>
<pre>${escape(JSON.stringify({ segments, map: report.map, accounting: report.accounting }, null, 2))}</pre>
${rows.map((row) => `<article><h2>${escape(label(row))} · R${row.round} ${escape(row.phase)}</h2>
<p>${escape(row.sideKey)} / ${escape(row.actionType)} / ${escape(row.pieceId ?? "全局动作")}</p>
<p>${escape(row.selectedReason ?? "没有保存公开模型理由；不补写或推测。")}</p>
<small>截图来源：${escape(row.screenshotOrigin)}；回执：${escape(row.receiptHash)}</small>
${row.screenshot ? `<img src="${escape(relativeImage(row))}" alt="${escape(label(row))}">` : '<p class="warn">截图尚缺</p>'}
<details><summary>公开计划、骰子与规则事件</summary><p class="warn">公开理由可能有错误，不是规则真值或隐藏思维链。
骰子池含预分配结果，不代表全部实际使用。</p><pre>${escape(JSON.stringify({ summary: row.publicDecisionSummary,
  assessment: row.planAssessment, intent: row.intent, dicePool: row.dicePool, diceLayout: row.diceLayout,
  rulesEvents: row.rulesEvents }, null, 2))}</pre></details></article>`).join("\n")}</html>`;
for (const [filename, content] of [["index.json", `${JSON.stringify(report, null, 2)}\n`],
  ["index.md", md], ["index.html", html]]) {
  await writeFile(path.join(output, filename), content, { flag: "wx", mode: 0o600 });
}
console.log(JSON.stringify({ output: publicRelative(output), roomId,
  chronologyCount: rows.length, epochCount: segments.length, originalCaptureGaps: gaps.length,
  excludedAcceptedSuffixCount: segments.reduce((sum, entry) => sum + entry.excludedAcceptedSuffixCount, 0),
  matchComplete: report.matchComplete, providerCallsForReport: 0, roomWrites: 0,
  rulesActionsReexecuted: 0, trainingTruth: false }));
