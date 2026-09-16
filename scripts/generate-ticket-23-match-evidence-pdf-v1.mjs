#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import {
  createStarcraftTmgPrivatePayloadCodec,
} from "../packages/room-store/room-store-v1.mjs";
import {
  createSqliteStarcraftTmgRoomStore,
} from "../packages/room-store/sqlite-room-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ARGUMENT = process.argv.find((entry) => entry.startsWith("--report="));

function fail(code, details = {}) {
  throw Object.assign(new Error(code), { code, ...details });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortHash(value) {
  const text = String(value || "");
  return text ? `${text.slice(0, 16)}…` : "—";
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function acceptedTransition(entry) {
  const event = entry?.payload;
  return event?.type === "accepted_transition" && event?.payload?.receipt
    ? event.payload : null;
}

function chanceEvidence(receipt, index) {
  const action = receipt.action || receipt.core?.action || {};
  const bundle = receipt.chanceReveal || receipt.core?.chanceReveal || null;
  if (!bundle) return null;
  return {
    schema: "ticket23_match_chance_evidence_v1",
    index,
    actionType: action.actionType || null,
    pieceId: action.pieceId || null,
    authorityReceiptHash: receipt.journalHash,
    ticketBundleHash: bundle.ticketBundleHash,
    spec: bundle.spec,
    reveals: (bundle.reveals || []).map((reveal) => ({
      counter: reveal.counter,
      outcome: reveal.outcome,
      faces: reveal.faces,
      commitment: reveal.commitment,
      stateRevision: reveal.basis?.stateRevision ?? null,
      proposalHash: reveal.basis?.proposalHash || null,
      rngSchemeId: reveal.basis?.rngSchemeId || null,
      proofKeyId: reveal.outcomeProof?.keyId || null,
      proofContentHash: reveal.outcomeProof?.contentHash || null,
      proofMac: reveal.outcomeProof?.mac || null,
    })),
    longTermIntegrity: bundle.longTermIntegrity,
    shortTermSeal: bundle.shortTermSeal,
    trainingTruth: false,
  };
}

async function readChanceEvidence(runDirectory, report) {
  const privatePath = path.join(runDirectory, "runner-private.json");
  const databasePath = path.join(runDirectory, "room.sqlite");
  if (!existsSync(privatePath) || !existsSync(databasePath)) {
    fail("MATCH_PRIVATE_CHANCE_EVIDENCE_UNAVAILABLE");
  }
  const privateState = JSON.parse(await readFile(privatePath, "utf8"));
  const runId = path.basename(runDirectory);
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice247-room-store-${runId}`,
    trustLevel: "development_persistent",
  });
  const store = createSqliteStarcraftTmgRoomStore({
    filename: databasePath,
    privatePayloadCodec: codec,
  });
  try {
    const journal = await store.readJournal(privateState.roomId, "private", 0);
    const accepted = (journal || []).map(acceptedTransition).filter(Boolean);
    if (accepted.length !== report.acceptance.authoritativeActionCount
      || accepted.length !== report.actions.length) {
      fail("MATCH_PRIVATE_JOURNAL_ACTION_DENOMINATOR_MISMATCH", {
        acceptedCount: accepted.length,
        reportCount: report.actions.length,
      });
    }
    return accepted.map((event, offset) => {
      const receipt = event.receipt;
      const action = report.actions[offset];
      if (Number(action.index) !== offset + 1
        || action.receiptHash !== receipt.journalHash) {
        fail("MATCH_PRIVATE_JOURNAL_ACTION_BINDING_MISMATCH", {
          actionIndex: offset + 1,
        });
      }
      return chanceEvidence(receipt, offset + 1);
    }).filter(Boolean);
  } finally {
    store.close();
  }
}

function parameterSummary(parameters) {
  if (!parameters || typeof parameters !== "object") return "—";
  const parts = [];
  for (const field of ["leadingModelId", "entrySegmentId", "targetId",
    "targetPieceId", "abilityName", "cardName", "choiceId"]) {
    if (parameters[field] !== undefined) {
      parts.push(`${field}=${String(parameters[field])}`);
    }
  }
  if (Array.isArray(parameters.path)) {
    parts.push(`pathPoints=${parameters.path.length}`);
  }
  if (Array.isArray(parameters.placements)) {
    parts.push(`placements=${parameters.placements.length}`);
  }
  return parts.join("; ") || "parameter object retained in report.json";
}

function listHtml(values, limit = 4) {
  const rows = (Array.isArray(values) ? values : []).slice(0, limit);
  if (!rows.length) return "";
  return `<ul>${rows.map((value) => `<li>${escapeHtml(
    typeof value === "string" ? value : JSON.stringify(value),
  )}</li>`).join("")}</ul>`;
}

function chanceHtml(evidence) {
  if (!evidence) return `<div class="muted">No chance resolution in this action.</div>`;
  const outcomes = evidence.reveals.map((entry) => (
    `D${entry.faces}=${entry.outcome}`)).join(", ");
  return `
    <div class="chance">
      <strong>Authoritative dice/chance:</strong> ${escapeHtml(outcomes)}<br>
      <span>layout=${escapeHtml(JSON.stringify(evidence.spec?.layout || {}))}</span><br>
      <span>bundle=${escapeHtml(shortHash(evidence.ticketBundleHash))}; receipt=${escapeHtml(shortHash(evidence.authorityReceiptHash))}</span><br>
      <span>${escapeHtml(evidence.longTermIntegrity)} + ${escapeHtml(evidence.shortTermSeal)}</span>
    </div>`;
}

function actionPage(action, evidence, runDirectory) {
  const summary = action.publicDecisionSummary || {};
  const screenshotPath = path.join(runDirectory, String(action.screenshot || ""));
  if (!action.screenshot || !existsSync(screenshotPath)) {
    fail("MATCH_ACTION_SCREENSHOT_MISSING", { actionIndex: action.index });
  }
  const strategy = action.modelDecision ? `
    <div class="strategy">
      <strong>Public plan:</strong> ${escapeHtml(summary.plan || "—")}<br>
      <strong>Purpose:</strong> ${escapeHtml(summary.purpose || action.selectedReason || "—")}<br>
      <strong>Risk:</strong> ${escapeHtml(summary.risk || action.risk || "—")}
      ${listHtml(summary.visibleFacts, 3)}
      ${listHtml(summary.calculations, 3)}
    </div>` : `
    <div class="strategy">
      <strong>Human/Host operation:</strong>
      ${escapeHtml(action.actionType)}${action.pieceId
        ? ` on ${escapeHtml(action.pieceId)}` : ""}.<br>
      <strong>Parameters:</strong> ${escapeHtml(parameterSummary(action.parameters))}
    </div>`;
  return `
    <section class="action-page">
      <header>
        <div>
          <h2>Action ${action.index}: ${escapeHtml(action.actionType)}</h2>
          <div class="meta">Round ${action.round} / ${escapeHtml(action.phase)} · ${escapeHtml(action.actor)} / ${escapeHtml(action.sideKey)} · piece ${escapeHtml(action.pieceId || "—")}</div>
        </div>
        <div class="receipt">state r${action.postStateRevision}<br>receipt ${escapeHtml(shortHash(action.receiptHash))}<br>Replay ${action.replayMatchesCurrent ? "MATCH" : "NOT PROVEN"}</div>
      </header>
      ${chanceHtml(evidence)}
      ${strategy}
      <img class="action-shot" src="${escapeHtml(pathToFileURL(screenshotPath).href)}" alt="Action ${action.index} screenshot">
      <footer>Rules authority: ${action.rulesAuthority === true ? "yes" : "no"} · model decision: ${action.modelDecision === true ? "yes" : "no"} · hidden chain-of-thought stored: ${action.hiddenChainOfThoughtStored === true ? "yes" : "no"} · training truth: ${action.trainingTruth === true ? "yes" : "no"}</footer>
    </section>`;
}

const CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #dceeff; background: #06101d; font-family: Inter, Arial, sans-serif; font-size: 9.5px; }
  .cover, .action-page { min-height: 190mm; padding: 7mm; background: linear-gradient(145deg, #06101d, #0a1d32); page-break-after: always; }
  .cover:last-child, .action-page:last-child { page-break-after: auto; }
  h1 { color: #5bd5ff; font-size: 26px; margin: 0 0 6mm; }
  h2 { color: #69dcff; font-size: 17px; margin: 0 0 2mm; }
  h3 { color: #c8f4ff; margin: 5mm 0 2mm; }
  header { display: flex; justify-content: space-between; gap: 8mm; border-bottom: 1px solid #1c6b8f; padding-bottom: 2mm; }
  footer { margin-top: 2mm; color: #87a9bf; font-size: 8px; }
  .meta, .muted { color: #91afc5; }
  .receipt { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #9cecff; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .card, .chance, .strategy { border: 1px solid #235d78; border-radius: 2mm; padding: 2.5mm; margin-top: 2.5mm; background: #0b2135; }
  .chance { border-color: #7a6f2a; background: #29250d; color: #fff3a2; }
  .strategy { max-height: 38mm; overflow: hidden; line-height: 1.35; }
  ul { margin: 1mm 0 0 5mm; padding: 0; }
  .action-shot { display: block; width: 100%; max-height: 118mm; object-fit: contain; object-position: center; margin-top: 2.5mm; border: 1px solid #1b6688; background: #02070c; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #24445b; padding: 2mm; text-align: left; }
  th { color: #6fdcff; }
  a { color: #76deff; }
`;

function documentHtml(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

function masterHtml(report, rounds, finalScreenshotUrl) {
  const acceptance = report.acceptance;
  const agent = report.agent;
  const roundRows = rounds.map((round) => `
    <tr><td>${round.round}</td><td>${round.actions.length}</td><td>${escapeHtml(round.first)}–${escapeHtml(round.last)}</td><td>${escapeHtml(round.pdfName)}</td></tr>`).join("");
  return documentHtml("StarCraft TMG H-A Evidence Index", `
    <section class="cover">
      <h1>StarCraft TMG · Standard 2000 H-A Evidence</h1>
      <p>${escapeHtml(report.roomId)} · completed ${escapeHtml(report.completedAt)}</p>
      <div class="grid">
        <div class="card"><strong>Terminal</strong><br>Round ${acceptance.terminalRound}<br>${escapeHtml(acceptance.terminalReason)}</div>
        <div class="card"><strong>Winner / score</strong><br>${escapeHtml(acceptance.winner)}<br>${acceptance.finalScores.player1}–${acceptance.finalScores.player2}</div>
        <div class="card"><strong>Actions / screenshots</strong><br>${acceptance.authoritativeActionCount} / ${acceptance.screenshotCount}<br>Apply screenshots ${acceptance.everyObservedApplyHasScreenshot ? "complete" : "incomplete"}</div>
        <div class="card"><strong>Agent usage</strong><br>${agent.providerCalls} calls<br>${agent.totalUnits.toLocaleString("en-US")} tokens</div>
        <div class="card"><strong>Estimated cost</strong><br>CNY ${agent.estimatedCostCny.toFixed(6)}<br>budget CNY 80</div>
        <div class="card"><strong>Integrity</strong><br>Agent replay ${acceptance.allAgentReplaysVerified ? "verified" : "not verified"}<br>Critical/High ${report.findings.criticalOrHigh.length}</div>
      </div>
      <h3>Acceptance matrix</h3>
      <table>
        <tr><th>Scale</th><td>${escapeHtml(acceptance.engagementScale)}</td><th>Map</th><td>${escapeHtml(acceptance.map.mapDisplayName)}</td></tr>
        <tr><th>Minerals</th><td>${acceptance.mineralSpentBySide.player1} / ${acceptance.mineralSpentBySide.player2}</td><th>Vespene</th><td>${acceptance.vespeneSpentBySide.player1} / ${acceptance.vespeneSpentBySide.player2}</td></tr>
        <tr><th>Units / terrain</th><td>${acceptance.unitCount} / ${acceptance.terrainPieceCount}</td><th>Abilities</th><td>${acceptance.currentProductAbilityExactCount} exact / ${acceptance.currentProductAbilityPendingCount} pending</td></tr>
        <tr><th>Browser errors</th><td>${report.findings.browserConsoleErrors.length + report.findings.browserPageErrors.length}</td><th>Training truth</th><td>${report.trainingTruth}</td></tr>
      </table>
      <h3>Round reports</h3>
      <table><tr><th>Round</th><th>Actions</th><th>Range</th><th>PDF</th></tr>${roundRows}</table>
      <p class="muted">PDF pages show public plan/reasoning only. Hidden chain-of-thought was neither requested nor stored. Exact machine-readable truth remains in report.json, actions.ndjson and chance-evidence.ndjson.</p>
      <img class="action-shot" src="${escapeHtml(finalScreenshotUrl)}" alt="Terminal room screenshot">
    </section>`);
}

async function renderPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  try {
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: "load",
      timeout: 120_000,
    });
    await page.waitForFunction(() => Array.from(document.images)
      .every((image) => image.complete && image.naturalWidth > 0), null, {
      timeout: 120_000,
    });
    await page.emulateMedia({ media: "screen" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await page.close();
  }
}

async function main() {
  if (!REPORT_ARGUMENT) fail("MATCH_REPORT_ARGUMENT_REQUIRED");
  const reportPath = path.resolve(ROOT,
    REPORT_ARGUMENT.slice("--report=".length));
  const runDirectory = path.dirname(reportPath);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (report.ok !== true || report.acceptance?.terminal !== true
    || !Array.isArray(report.actions) || !report.actions.length) {
    fail("MATCH_REPORT_NOT_TERMINAL");
  }
  if (report.findings?.criticalOrHigh?.length) {
    fail("MATCH_REPORT_HAS_BLOCKING_FINDINGS");
  }
  const expectedIndices = report.actions.every((action, index) => (
    Number(action.index) === index + 1));
  if (!expectedIndices || !report.actions.every((action) => (
    action.replayMatchesCurrent === true))) {
    fail("MATCH_ACTION_REPLAY_DENOMINATOR_INVALID");
  }

  const chance = await readChanceEvidence(runDirectory, report);
  const chanceByIndex = new Map(chance.map((entry) => [entry.index, entry]));
  const outputDirectory = path.join(runDirectory, "evidence-pdf");
  await mkdir(outputDirectory, { recursive: true });
  const chancePath = path.join(outputDirectory, "chance-evidence.ndjson");
  await writeFile(chancePath, chance.map((entry) => JSON.stringify(entry))
    .join("\n") + (chance.length ? "\n" : ""), "utf8");

  const grouped = new Map();
  for (const action of report.actions) {
    const round = Number(action.round);
    if (!grouped.has(round)) grouped.set(round, []);
    grouped.get(round).push(action);
  }
  const rounds = Array.from(grouped.entries()).sort((left, right) => (
    left[0] - right[0])).map(([round, actions]) => ({
    round,
    actions,
    first: actions[0].index,
    last: actions.at(-1).index,
    htmlName: `round-${String(round).padStart(2, "0")}-actions-${String(actions[0].index).padStart(3, "0")}-${String(actions.at(-1).index).padStart(3, "0")}.html`,
    pdfName: `round-${String(round).padStart(2, "0")}-actions-${String(actions[0].index).padStart(3, "0")}-${String(actions.at(-1).index).padStart(3, "0")}.pdf`,
  }));

  for (const round of rounds) {
    const html = documentHtml(
      `StarCraft TMG H-A Round ${round.round}`,
      round.actions.map((action) => actionPage(
        action, chanceByIndex.get(action.index), runDirectory,
      )).join(""),
    );
    await writeFile(path.join(outputDirectory, round.htmlName), html, "utf8");
  }
  const finalScreenshotPath = path.join(
    runDirectory, report.acceptance.finalScreenshot);
  if (!existsSync(finalScreenshotPath)) fail("MATCH_FINAL_SCREENSHOT_MISSING");
  const masterHtmlName = "ticket23-slice247-human-agent-master.html";
  const masterPdfName = "ticket23-slice247-human-agent-master.pdf";
  await writeFile(path.join(outputDirectory, masterHtmlName), masterHtml(
    report, rounds, pathToFileURL(finalScreenshotPath).href,
  ), "utf8");

  const browser = await chromium.launch({ headless: true });
  try {
    await renderPdf(browser, path.join(outputDirectory, masterHtmlName),
      path.join(outputDirectory, masterPdfName));
    for (const round of rounds) {
      await renderPdf(browser, path.join(outputDirectory, round.htmlName),
        path.join(outputDirectory, round.pdfName));
    }
  } finally {
    await browser.close();
  }

  const artifacts = [];
  for (const filename of [masterPdfName, ...rounds.map((entry) => entry.pdfName),
    "chance-evidence.ndjson"]) {
    const bytes = await readFile(path.join(outputDirectory, filename));
    artifacts.push({ filename, byteLength: bytes.length, sha256: sha256(bytes) });
  }
  const manifest = {
    schema: "ticket23_match_evidence_pdf_manifest_v1",
    roomId: report.roomId,
    reportSchema: report.schema,
    actionCount: report.actions.length,
    chanceActionCount: chance.length,
    roundCount: rounds.length,
    everyActionHasScreenshot: true,
    everyActionReplayVerified: true,
    hiddenChainOfThoughtStored: false,
    publicDecisionEvidenceIncluded: true,
    reportJsonHash: sha256(await readFile(reportPath)),
    actionsNdjsonHash: sha256(await readFile(path.join(
      runDirectory, "actions.ndjson"))),
    artifacts,
    sourceRefreshPerformed: false,
    trainingTruth: false,
  };
  const manifestPath = path.join(outputDirectory, "evidence-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    ok: true,
    outputDirectory,
    actionCount: manifest.actionCount,
    chanceActionCount: manifest.chanceActionCount,
    roundCount: manifest.roundCount,
    artifacts,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
