#!/usr/bin/env node
// Offline presentation only: consume saved public evidence, never write a Room
// or call a Provider. Online experiment processes do not import this module.
import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "package.json"));
const argument = (name) => process.argv.find((value) =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
const scoped = (value) => {
  assert(value, "an evidence/output path is required");
  const resolved = path.resolve(ROOT, value);
  const relative = path.relative(ROOT, resolved);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "PDF inputs and outputs must remain within this worktree");
  return resolved;
};
const input = scoped(argument("input"));
const output = scoped(argument("output-directory"));
const arm = argument("arm");
const round = Number(argument("round"));
assert(["A", "B", "C"].includes(arm), "explicit experiment arm required");
assert(Number.isSafeInteger(round) && round >= 1, "explicit round required");
const source = JSON.parse(await readFile(input, "utf8"));
assert(source.schemaVersion === "ticket23_slice248_continuous_evidence_v1",
  "expected the saved continuous evidence format");
const rows = source.rows.filter((row) => row.round === round);
assert(rows.length, "the requested round has no saved accepted actions");
assert(rows.every((row) => row.authoritativeAcceptedReceipt === true),
  "PDF only presents previously recorded accepted actions");
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const definitions = {
  A: "固定2000分军表 + 开局计划",
  B: "从头生成2000分军表 + Teach计划",
  C: "与A相同的固定军表，无开局计划",
};
const actionLabel = (row) => row.rulesEvents.some((event) =>
  event.type === "ranged_defender_casualty_selection_resolved")
  ? "既有射击的防守伤亡结算（不是新攻击）"
  : row.actionType;
const labels = (row) => `动作${row.chronologyIndex} / epoch${row.epoch}:r${row.stateRevision}`;
const eventTypes = (row) => row.rulesEvents.map((event) => event.type).join(" / ");
// Report-only, lossless original-text sharing. This never replaces a Room Plan,
// edits a saved decision, or promotes raw narrative to training/rules truth.
const publicViews = rows.map((row) => ({ summary: row.publicDecisionSummary,
  assessment: row.planAssessment, intent: row.intent }));
const occurrences = new Map();
const visitValues = (value, visit) => {
  visit(value);
  if (Array.isArray(value)) value.forEach((child) => visitValues(child, visit));
  else if (value && typeof value === "object") Object.values(value)
    .forEach((child) => visitValues(child, visit));
};
publicViews.forEach((view) => visitValues(view, (value) => {
  const text = JSON.stringify(value);
  // A presentation threshold, NOT a content/capacity limit. Short/unique text
  // remains inline; arbitrarily long original content is retained unchanged.
  if (text && text.length >= 180) occurrences.set(text,
    (occurrences.get(text) ?? 0) + 1);
}));
let sharedTexts = new Set([...occurrences].filter(([, count]) => count > 1)
  .map(([text]) => text));
const buildSharedViews = () => {
  const originals = new Map();
  const ids = new Map();
  const references = new WeakSet();
  const encode = (value, ownText) => {
    const text = JSON.stringify(value);
    if (sharedTexts.has(text) && text !== ownText) {
      let id = ids.get(text);
      if (!id) {
        id = `R${String(ids.size + 1).padStart(4, "0")}`;
        ids.set(text, id);
        originals.set(id, { text, value });
      }
      const reference = { reportOriginalFragment: id };
      references.add(reference);
      return reference;
    }
    if (Array.isArray(value)) return value.map((child) => encode(child));
    if (value && typeof value === "object") return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, encode(child)]));
    return value;
  };
  const views = publicViews.map((view) => encode(view));
  // Map iteration visits newly registered descendants as well. JSON subtrees
  // cannot contain themselves, so the resulting original-text graph is acyclic.
  for (const original of originals.values()) original.encoded = encode(
    original.value, original.text);
  const counts = new Map();
  const visited = new Set();
  const countReferences = (value) => {
    if (value && typeof value === "object" && references.has(value)) {
      const id = value.reportOriginalFragment;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!visited.has(id)) {
        visited.add(id);
        countReferences(originals.get(id).encoded);
      }
    } else if (Array.isArray(value)) value.forEach(countReferences);
    else if (value && typeof value === "object") Object.values(value)
      .forEach(countReferences);
  };
  views.forEach(countReferences);
  return { views, originals, references, counts };
};
let shared;
// Parent sharing changes child use counts. Rebuild without now-single-use
// fragments instead of producing an appendix larger than the original report.
for (;;) {
  shared = buildSharedViews();
  const used = new Set([...shared.originals].filter(([id]) =>
    shared.counts.get(id) > 1).map(([, original]) => original.text));
  if (used.size === sharedTexts.size) break;
  sharedTexts = used;
}
const restore = (value) => {
  if (value && typeof value === "object" && shared.references.has(value)) {
    return restore(shared.originals.get(value.reportOriginalFragment).encoded);
  }
  if (Array.isArray(value)) return value.map(restore);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, restore(child)]));
  return value;
};
assert.deepEqual(shared.views.map(restore), publicViews,
  "report references must restore every original public fact exactly");
const publicJson = (value) => escape(JSON.stringify(value, null, 2)).replace(
  /(&quot;reportOriginalFragment&quot;:\s*&quot;)(R\d+)(&quot;)/g,
  (_, prefix, id, suffix) => `${prefix}<a href="#original-${id}">${id}</a>${suffix}`);
const originalPublicCharacters = JSON.stringify(publicViews).length;
const sharedPublicCharacters = JSON.stringify(shared.views).length +
  [...shared.originals].reduce((total, [id, original]) => total + id.length +
    JSON.stringify(original.encoded).length, 0);
const { default: sharp } = await import(pathToFileURL(require.resolve("sharp")).href);
const playwright = await import(pathToFileURL(require.resolve("playwright")).href);
const { chromium } = playwright.default || playwright;
const images = new Map();
for (const row of rows) {
  if (!row.screenshot || images.has(row.screenshot)) continue;
  const filename = scoped(row.screenshot);
  await access(filename);
  // Compression is confined to the PDF embedding. Original PNG evidence stays
  // byte-for-byte untouched and retains its explicitly recorded capture origin.
  const buffer = await sharp(filename).resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 84 }).toBuffer();
  images.set(row.screenshot, `data:image/jpeg;base64,${buffer.toString("base64")}`);
}
const configuration = source.map.configuration || {};
const recordCount = value => Array.isArray(value) ? value.length
  : value && typeof value === "object" ? Object.keys(value).length : 0;
const mapSummary = {
  configuration: Object.fromEntries(Object.entries(configuration).filter(([,value]) =>
    value === null || ["string", "number", "boolean"].includes(typeof value))),
  semanticTerrainRegionInstanceCount: configuration.semanticTerrain?.terrainRegionInstances
    ? recordCount(configuration.semanticTerrain.terrainRegionInstances) : null,
  elementSelectionOverrideCount: recordCount(configuration.elementSelections),
  passageSelectionOverrideCount: recordCount(configuration.passageSelections),
  geometryNote: "Counts identify saved region instances and selection overrides, not geometry fragments or physical terrain pieces. Full frozen geometry remains in the referenced JSON index, not repeated as thousands of coordinate lines on the PDF cover.",
  mission: source.map.mission,
  deployment: source.map.deployment,
  battlefield: source.map.battlefield,
  engagementScale: source.map.engagementScale,
};
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>${escape(arm)}组第${round}回合实际动作记录</title><style>
@page{size:A4 landscape;margin:13mm 15mm 15mm}
*{box-sizing:border-box}body{margin:0;color:#172c39;font:11px/1.48 Arial,"PingFang SC",sans-serif}
h1{font-size:24px;margin:0 0 8px}h2{font-size:17px;margin:0 0 7px;color:#164b62}
h3{font-size:12px;margin:12px 0 5px}p{margin:6px 0;overflow-wrap:anywhere}
.eyebrow{color:#326679;font-size:10px;letter-spacing:1.5px;margin-bottom:7px}
.badge{display:inline-block;border:1px solid #9ebbc6;border-radius:3px;padding:2px 7px;margin:0 6px 4px 0}
.notice{background:#edf5f8;border-left:3px solid #397e97;padding:8px 11px;margin:12px 0}
.page{break-before:page}pre{font:9px/1.4 Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}
.board{display:block;max-width:100%;max-height:104mm;object-fit:contain;margin:10px auto}
.provenance{color:#516976;font-size:8px;overflow-wrap:anywhere}
.reason{border-top:1px solid #cadde4;margin-top:8px;padding-top:7px}
.missing{padding:20mm;text-align:center;border:1px dashed #a1b8c2;color:#775c3d}
.events{font-size:8.5px}.events h2{font-size:15px}
a{color:#164b62;text-decoration:underline}.original{border-top:1px solid #cadde4;padding-top:7px;margin-top:10px}
</style></head><body>
<section><div class="eyebrow">PROJECT D / STARCRAFT TMG / SAVED EXECUTION EVIDENCE</div>
<h1>${escape(arm)}组 · 第${round}回合截图记录</h1>
<h2>${escape(definitions[arm])}</h2>
<p>房间：${escape(source.roomId)}</p><p>记录截点：${escape(source.createdAt)}</p>
<div class="notice">这是截至记录截点的部分执行报告，不代表回合结束、完整对局、策略质量或产品验收通过。
只展示已保存的原动作、公开理由、骰子和规则事件；0模型调用、0动作重执行、0房间写入。
未保存的截图或理由明确标缺，不补写；公开理由不作为规则真值，也不是隐藏思维链。</div>
<p>本卷 ${rows.length} 个接受动作。完整连续记录含 ${source.chronologyCount} 个动作。
本卷原动作时刻截图缺口 ${rows.filter((row) => row.screenshotOrigin !== "action_time_web_capture").length} 个。</p>
<h3>原保存地图 / 任务 / 规模</h3><pre>${escape(JSON.stringify(mapSummary, null, 2))}</pre>
<h3>分账费用快照（不是费用上限）</h3><pre>${escape(JSON.stringify(source.accounting, null, 2))}</pre>
<p>原始事件与全局连续索引保留于：${escape(path.relative(ROOT, input))}</p>
<p>阅读方式：相同公开计划/评估原文只在“共享原文”附录收录一次；动作中的
reportOriginalFragment是可点击的附录编号，不是新的模型判断、规则版本或签名。
全部${publicViews.length}份公开记录已逐项精确还原核对；原骰子、事件和截图逐动作保留。</p>
</section>
${rows.map((row, index) => `<section class="page"><div class="eyebrow">${escape(arm)} / ROUND ${round} / ${escape(labels(row))}</div>
<h2>${escape(row.sideKey)} · ${escape(actionLabel(row))} · ${escape(row.pieceId ?? "全局动作")}</h2>
<div><span class="badge">${escape(row.phase)}</span><span class="badge">Replay ${row.replayMatchesCurrent === null ? "未保存" : escape(row.replayMatchesCurrent)}</span>
<span class="badge">截图 ${escape(row.screenshotOrigin)}</span></div>
${row.screenshot ? `<img class="board" src="${images.get(row.screenshot)}" alt="${escape(labels(row))}">`
  : '<div class="missing">该动作没有保存截图；不生成或冒充原图。</div>'}
<p class="reason"><strong>原公开决策理由：</strong>${escape(row.selectedReason ?? "该动作没有保存公开理由；不补写或推测。")}</p>
<p class="provenance">原外层派发类型：${escape(row.actionType)}；事件：${escape(eventTypes(row))}<br>
接受回执：${escape(row.receiptHash)}<br>原图：${escape(row.screenshot ?? "缺失")}</p>
</section><section class="page events"><div class="eyebrow">${escape(labels(row))} / ORIGINAL SAVED RESULT</div>
<h2>原骰子与规则结算事件</h2>
<p>以下为原保存结果，未重新掷骰。随机池包含预分配骰子，不代表全部实际使用；实际使用和损失见结算事件。
防守伤亡结算即使外层类型仍为ranged_attack，也不计作新射击。未记录的公开计划不能推测补齐。</p>
<h3>公开意图 / 计划评估</h3><pre>${publicJson(shared.views[index])}</pre>
<h3>原结算事件</h3><pre>${escape(JSON.stringify(row.rulesEvents,null,2))}</pre>
<h3>原预分配随机池</h3><pre>${escape(JSON.stringify({dicePool:row.dicePool,diceLayout:row.diceLayout},null,2))}</pre>
</section>`).join("\n")}
${shared.originals.size ? `<section class="page events"><div class="eyebrow">SHARED ORIGINAL PUBLIC TEXT</div>
<h2>共享原文附录</h2><p>以下是既有公开记录的原文片段。各动作引用同一编号不表示在新动作
重做了该判断；片段中的其他编号指向本附录原文，未记录的想法不补写。</p>
${[...shared.originals].map(([id, original]) => `<article class="original" id="original-${id}">
<h3>共享原文 ${id}</h3><pre>${publicJson(original.encoded)}</pre></article>`).join("\n")}
</section>` : ""}</body></html>`;
await mkdir(output, { recursive: true });
const stem = `${arm}-round-${String(round).padStart(2, "0")}-partial`;
const htmlPath = path.join(output, `${stem}.html`);
const pdfPath = path.join(output, `${stem}.pdf`);
await writeFile(htmlPath, html, { flag: "wx", mode: 0o600 }).catch(async error => {
  // A renderer failure may leave the exact already-authored HTML behind. Reuse
  // those unchanged bytes, never overwrite different evidence or duplicate it.
  if (error.code !== "EEXIST" || await readFile(htmlPath, "utf8") !== html) throw error;
});
await access(pdfPath).then(() => { throw new Error("refusing to overwrite a PDF"); },
  (error) => { if (error.code !== "ENOENT") throw error; });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: `<div style="font:8px Arial;width:100%;text-align:center;color:#526776">${arm} / Round ${round} / partial saved evidence · <span class="pageNumber"></span> / <span class="totalPages"></span></div>` });
} finally { await browser.close(); }
const manifest = { schemaVersion: "ticket23_round_pdf_v2", arm, round,
  createdAt: new Date().toISOString(), input: path.relative(ROOT, input),
  sourceSnapshotAt: source.createdAt, rows: rows.length,
  chronologyIndices: rows.map((row) => row.chronologyIndex),
  originalCaptureGaps: rows.filter((row) => row.screenshotOrigin !== "action_time_web_capture").length,
  pdf: path.relative(ROOT, pdfPath), html: path.relative(ROOT, htmlPath),
  partial: true, strategyReviewed: false, acceptanceComplete: false,
  providerCalls: 0, roomWrites: 0, rulesActionsReexecuted: 0,
  originalScreenshotsEdited: false, hiddenChainOfThoughtStored: false,
  sharedPublicOriginals: { schemaVersion: "ticket23_report_original_references_v1",
    fragments: shared.originals.size, restoredPublicViews: publicViews.length,
    originalPublicCharacters, sharedPublicCharacters, exactOriginalRestoration: true,
    referencesArePresentationOnly: true },
  eligibleForTraining: false, reviewStatus: "raw" };
await writeFile(path.join(output, `${stem}.manifest.json`),
  JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(JSON.stringify(manifest));
