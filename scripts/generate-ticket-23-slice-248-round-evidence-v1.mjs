#!/usr/bin/env node
// Immutable partial A-A evidence. No live server, Provider or Rules mutation.
// Uses the existing match reporter's Chromium print approach without relaxing
// that reporter's completed H-A acceptance gate.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = (name, fallback) => process.argv.find((v) => v.startsWith(`--${name}=`))
  ?.slice(name.length + 3) ?? fallback;
const directory = path.resolve(ROOT, argument("run-directory", ""));
const through = Number(argument("through-revision", "47"));
assert(directory !== ROOT && Number.isSafeInteger(through) && through > 0);
const output = path.join(ROOT, "output/pdf", `slice248-${path.basename(directory)}`);
const stem = `partial-r001-r${String(through).padStart(3, "0")}`;
const e = (value) => String(value ?? "").replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const list = (values) => Array.isArray(values) && values.length
  ? `<ul>${values.map((v) => `<li>${e(typeof v === "string" ? v : JSON.stringify(v))}</li>`).join("")}</ul>` : "";

async function loadActions(run, last, seen = new Set()) {
  assert(!seen.has(run), "cyclic fork lineage");
  seen.add(run);
  const local = (await readFile(path.join(run, "actions.ndjson"), "utf8"))
    .trim().split("\n").filter(Boolean).map(JSON.parse)
    .filter((row) => row.postStateRevision <= last)
    .map((row) => ({ ...row, screenshotDirectory: run, inherited: run !== directory }));
  const present = new Set(local.map((row) => row.postStateRevision));
  const forkPath = path.join(run, "fork-provenance.json");
  if (existsSync(forkPath)) {
    const fork = JSON.parse(await readFile(forkPath, "utf8"));
    if (Array.from({ length: Math.min(last, fork.throughStateRevision) }, (_, i) => i + 1)
      .some((revision) => !present.has(revision))) {
      assert(/^[0-9]+$/u.test(fork.sourceRunId), "unexpected source run ID");
      const previous = await loadActions(path.join(path.dirname(run), fork.sourceRunId),
        Math.min(last, fork.throughStateRevision), seen);
      for (const row of previous) if (!present.has(row.postStateRevision)) local.push(row);
    }
  }
  return local.sort((a, b) => a.postStateRevision - b.postStateRevision);
}

const actions = await loadActions(directory, through);
assert.equal(actions.length, through, "partial report requires every included action");
assert(actions.every((row, i) => row.postStateRevision === i + 1 && row.replayMatchesCurrent),
  "revision continuity and recorded Replay evidence required");
async function resolveScreenshot(action, run, seen = new Set()) {
  assert(!seen.has(run), "cyclic screenshot lineage");
  seen.add(run);
  const image = action.boardScreenshot || action.screenshot;
  if (image && existsSync(path.join(run, image))) return { run, action, image };
  const forkPath = path.join(run, "fork-provenance.json");
  assert(existsSync(forkPath), `actual screenshot missing at r${action.postStateRevision}`);
  const lineage = JSON.parse(await readFile(forkPath, "utf8"));
  const link = lineage.replayedTransitions.find(row =>
    row.branchStateRevision === action.postStateRevision);
  assert.equal(link?.branchJournalHash, action.receiptHash,
    "image ancestry must bind the exact branch receipt");
  assert(/^[0-9]+$/u.test(lineage.sourceRunId));
  const previousRun = path.join(path.dirname(run), lineage.sourceRunId);
  const previous = (await readFile(path.join(previousRun, "actions.ndjson"), "utf8"))
    .trim().split("\n").filter(Boolean).map(JSON.parse)
    .find(row => row.postStateRevision === link.sourceStateRevision);
  assert.equal(previous?.receiptHash, link.sourceJournalHash,
    "source image action must match the recorded fork receipt");
  return resolveScreenshot(previous, previousRun, seen);
}
const images = await Promise.all(actions.map(action =>
  resolveScreenshot(action, action.screenshotDirectory)));
const privateState = JSON.parse(await readFile(path.join(directory, "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
  trustLevel: "development_persistent",
});
const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let receipts;
try {
  receipts = db.prepare("SELECT sequence,payload_cipher FROM sc_private_journal WHERE room_id=? ORDER BY sequence")
    .all(privateState.roomId).map((row) => codec.decode(row.payload_cipher,
      `room:${privateState.roomId}:private:${row.sequence}`))
    .filter((row) => row.type === "accepted_transition")
    .map((row) => row.payload.receipt).filter((row) => row.postStateRevision <= through);
} finally { db.close(); }
assert.equal(receipts.length, through);
const fork = existsSync(path.join(directory, "fork-provenance.json"))
  ? JSON.parse(await readFile(path.join(directory, "fork-provenance.json"), "utf8")) : null;
const prefixByRevision = new Map((fork?.replayedTransitions || [])
  .map((row) => [row.branchStateRevision, row]));
const rows = actions.map((action, index) => {
  const receipt = receipts[index];
  assert.equal(receipt.postStateRevision, action.postStateRevision);
  if (action.inherited) {
    const lineage = prefixByRevision.get(action.postStateRevision);
    assert.equal(lineage?.sourceJournalHash, action.receiptHash);
    assert.equal(lineage.branchJournalHash, receipt.journalHash);
  } else assert.equal(receipt.journalHash, action.receiptHash);
  const image = images[index];
  return {
    revision: action.postStateRevision, round: action.round, phase: action.phase,
    side: action.sideKey, actor: action.actor, actionType: action.actionType,
    pieceId: action.pieceId, inherited: action.inherited,
    screenshot: path.relative(ROOT, path.join(image.run, image.image)),
    beforeScreenshot: image.action.preActionBoardScreenshot ? path.relative(ROOT,
      path.join(image.run, image.action.preActionBoardScreenshot)) : null,
    screenshotSourceRun: path.basename(image.run),
    screenshotSourceReceiptHash: image.action.receiptHash,
    receiptHash: receipt.journalHash, sourceReceiptHash: action.receiptHash,
    replayMatchesCurrent: action.replayMatchesCurrent,
    modelDecision: action.modelDecision, providerCalls: action.providerCalls,
    selectedReason: action.selectedReason || null, risk: action.risk || null,
    publicDecisionSummary: action.publicDecisionSummary || null,
    planContinuity: action.assessment?.continuitySummary || null,
    changedAssumptions: action.assessment?.changedAssumptions || [],
    predictionCalibrations: action.assessment?.opponentModelUpdates || [],
    dice: (receipt.chanceReveal?.reveals || []).map((roll) => ({
      faces: roll.faces, outcome: roll.outcome, counter: roll.counter,
    })),
    diceLayout: receipt.chanceReveal?.spec?.layout || null,
    hiddenChainOfThoughtStored: false, trainingTruth: false,
  };
});

await mkdir(output, { recursive: true });
const snapshot = { schema: "ticket23_slice248_partial_round_evidence_v1",
  roomId: privateState.roomId, createdAt: new Date().toISOString(), throughRevision: through,
  matchComplete: false, acceptanceComplete: false, rows,
  sourceRefreshPerformed: false, providerCallsForReport: 0, roomMutations: 0,
  trainingTruth: false };
await writeFile(path.join(output, `${stem}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
const actionLabel = (row) => `r${row.revision} · ${row.side} · ${row.actionType}`;
const pages = rows.map((row) => {
  const summary = row.publicDecisionSummary || {};
  const dice = row.dice.length ? row.dice.map((r) => `D${r.faces}=${r.outcome}`).join(" · ")
    : "本动作没有骰子结算";
  const source = row.inherited ? `历史前缀截图 / 来源 ${row.screenshotSourceRun}；已绑定本分支回放`
    : "当前分支实际 Web 截图";
  const detail = row.modelDecision && (row.selectedReason || summary.plan) ? `
    <section class="detail">
      <h2>${e(actionLabel(row))} / 公开决策记录</h2>
      <p class="muted">以下是模型保存的公开理由，可能含错误或陈旧判断；不是规则真值，也不是隐藏思维链。</p>
      <h3>计划 / Plan</h3><p>${e(summary.plan || "未记录独立计划字段")}</p>
      <h3>选择理由 / Reason</h3><p>${e(row.selectedReason || summary.purpose)}</p>
      <h3>风险 / Risk</h3><p>${e(summary.risk || row.risk || "未记录")}</p>
      <h3>公开事实与计算</h3>${list(summary.visibleFacts)}${list(summary.calculations)}
      ${row.planContinuity ? `<h3>计划延续</h3><p>${e(row.planContinuity)}</p>` : ""}
      ${row.changedAssumptions.length ? `<h3>变化的假设</h3>${list(row.changedAssumptions)}` : ""}
      ${row.predictionCalibrations.length ? `<h3>预测校准</h3>${list(row.predictionCalibrations)}` : ""}
    </section>` : "";
  return `<section class="shot-page"><header><h2>${e(actionLabel(row))}</h2>
    <p>动作后阶段：第 ${row.round} 回合 / ${e(row.phase)} · ${e(row.pieceId || "阶段 / 全局动作")} · Replay 已验证</p></header>
    <div class="dice">${e(dice)}${row.diceLayout ? ` / ${e(JSON.stringify(row.diceLayout))}` : ""}</div>
    <img src="${e(pathToFileURL(path.join(ROOT, row.screenshot)).href)}" alt="r${row.revision} 实际棋盘">
    <p class="source">${e(source)}<br>回执 ${e(row.receiptHash.slice(0, 20))} · ${row.modelDecision ? "真实模型决策；公开理由见后页" : "阶段推进 / Host 操作；无新增公开模型理由"}</p></section>${detail}`;
}).join("");
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
@page {size:A4 landscape; margin:10mm 12mm 13mm;}
* {box-sizing:border-box} body {margin:0;color:#162b3e;font:11px/1.5 Arial,"PingFang SC",sans-serif;}
h1,h2,h3 {color:#075574;break-after:avoid} h1 {font-size:27px} h2 {font-size:17px;margin:0 0 2mm} h3 {font-size:12px;margin:4mm 0 1mm}
p,li {overflow-wrap:anywhere} .cover,.shot-page,.detail {break-after:page} .cover {padding:8mm 4mm}
.cover p {font-size:14px;max-width:240mm} .tag {font-weight:bold;color:#8e3914;background:#fff1dc;padding:3mm}
.shot-page {height:181mm;display:flex;flex-direction:column} header p {margin:0;font-size:10px}
.dice {background:#e8f3f8;border-left:3px solid #0a7c9e;padding:2mm;margin:2mm 0;font-size:10px}
.shot-page img {width:100%;height:137mm;object-fit:contain;background:#07111f;border:1px solid #557a91}
.source {font-size:9px;color:#536878;margin:2mm 0} .detail {padding:3mm 2mm;font-size:11px;line-height:1.55}
.detail p {margin:1mm 0 3mm} ul {padding-left:5mm;margin:1mm 0} li {margin:1mm 0;break-inside:avoid}
.muted {color:#637589} .detail:last-child {break-after:auto}
</style></head><body><section class="cover"><h1>StarCraft TMG / Standard 2000 A-A</h1>
<h2>第一回合及第二回合启动 · r1-r${through} 分段证据</h2>
<p class="tag">对局仍在进行。本文件不是完整对局验收，也不是策略效果通过报告。</p>
<p>覆盖 ${rows.length} 个连续权威动作，每个动作包含实际棋盘截图与回执绑定。前 ${rows.filter(r => r.inherited).length} 步使用已回放历史前缀的原始截图，并逐项标注来源；后续为当前分支实图。</p>
<p>实际骰子取自本分支权威记录；公开决策理由原样保留，可能有判断错误。合法执行、模型策略质量和训练可用性是三件不同的事。</p>
<p>本局使用抽象权威地形，不声称背景美术已绑定天然地形。军表为固定 2000 分规模实验配置，不含 Agent 写表初始计划。当前正式分支双席 Flash；历史前缀不算本分支新增调用。</p>
<p>未为报告重跑动作或模型、未刷新官方数据、未增加费用。最终整局、机机复盘与 Skill 升级验收仍待后续完成。</p>
<p class="muted">房间 ${e(privateState.roomId)}<br>保留的逐动作 JSON：${e(stem)}.json<br>trainingTruth: false / hiddenChainOfThoughtStored: false</p></section>${pages}</body></html>`;
const htmlPath = path.join(output, `${stem}.html`);
const pdfPath = path.join(output, `${stem}.pdf`);
await writeFile(htmlPath, html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
  const layout = await page.evaluate(() => ({ images: document.images.length,
    clippedShots: [...document.querySelectorAll(".shot-page")].filter(x => x.scrollHeight > x.clientHeight + 2).length }));
  assert.equal(layout.images, rows.length);
  assert.equal(layout.clippedShots, 0, "screenshot page content must not overflow");
  await page.pdf({ path: pdfPath, format: "A4", landscape: true,
    printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: "<span></span>", footerTemplate: '<div style="font:8px Arial;width:100%;text-align:center;color:#708090">S248 · PARTIAL EVIDENCE · <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
} finally { await browser.close(); }
console.log(JSON.stringify({ pdf: path.relative(ROOT, pdfPath), actions: rows.length,
  inheritedActions: rows.filter(r => r.inherited).length,
  diceActions: rows.filter(r => r.dice.length).map(r => r.revision),
  matchComplete: false, providerCallsForReport: 0, roomMutations: 0 }));
