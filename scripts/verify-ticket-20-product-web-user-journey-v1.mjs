#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = String(process.env.TICKET20_WEB_ORIGIN || "").replace(/\/$/u, "");
const recoveryUrl = String(process.env.TICKET20_RECOVERY_URL || "");
if (!origin || !recoveryUrl) throw new Error("TICKET20_WEB_ORIGIN_AND_RECOVERY_URL_REQUIRED");
const outputDirectory = path.join(ROOT, "build/ticket-23-slice-245-product-web-v1");
await mkdir(outputDirectory, { recursive: true });

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

async function visibleText(page) {
  return page.locator("body").innerText();
}

async function clickText(page, pattern) {
  const matches = page.getByText(pattern, { exact: true });
  const count = await matches.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = matches.nth(index);
    const isCurrentSurfaceTarget = await candidate.evaluate((element) => {
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      const x = Math.min(window.innerWidth - 1, Math.max(0, box.left + box.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, box.top + box.height / 2));
      const hit = document.elementFromPoint(x, y);
      return hit === element || Boolean(hit && (element.contains(hit) || hit.contains(element)));
    });
    if (await candidate.isVisible() && isCurrentSurfaceTarget) {
      await candidate.click();
      return;
    }
  }
  throw new Error(`VISIBLE_TEXT_TARGET_MISSING:${String(pattern)}`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  viewport: { width: 1500, height: 1050 },
  locale: "zh-CN",
  reducedMotion: "reduce",
});
const page = await context.newPage();
let screenshotOrdinal = 0;
async function capture(label) {
  screenshotOrdinal += 1;
  await page.screenshot({
    path: path.join(outputDirectory,
      `${String(screenshotOrdinal).padStart(2, "0")}-${label}.png`),
    fullPage: true,
  });
}
const consoleErrors = [];
const developmentTransportNoise = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (/WebSocket connection .*\/(?:hot|message).*404/u.test(text)) {
    developmentTransportNoise.push(text);
    return;
  }
  const location = message.location();
  consoleErrors.push(`${text} @ ${location.url || "unknown"}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0}`);
});
page.on("pageerror", (error) => pageErrors.push(error.message));

const checks = [];
try {
  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  await page.getByText(/数据库|Database/u, { exact: true }).first().waitFor();
  let body = await visibleText(page);
  ensure(/26\s*(单位数量|个单位|units)/iu.test(body), "DATABASE_UNIT_COUNT_MISSING");
  ensure(/37\s*(卡牌数量|张卡牌|cards)/iu.test(body), "DATABASE_CARD_COUNT_MISSING");
  ensure(/193\s*(任务\/部署|任务|missions)/iu.test(body), "DATABASE_GAME_CARD_COUNT_MISSING");
  ensure(body.includes("U71/C69/R48"), "DATABASE_SOURCE_VERSION_MISSING");
  const databaseSearch = page.getByPlaceholder(/搜索单位或卡牌|Search units or cards/u);
  await databaseSearch.fill("Marine");
  await clickText(page, /陆战队员|Marine/u);
  body = await visibleText(page);
  ensure(/陆战队员|Marine/u.test(body) && /武器|Weapons/u.test(body), "DATABASE_UNIT_DETAIL_UNUSABLE");
  await capture("database-unit-detail");
  await clickText(page, "✕");
  checks.push("database_catalogue_search_and_detail");

  await clickText(page, /军表|Army/u);
  await clickText(page, /\+人族|\+Terran/u);
  await clickText(page, "Terran Armed Forces");
  await clickText(page, /编队 \(0\)|Roster \(0\)/u);
  await clickText(page, /\+ 添加单位|\+ Add Unit/u);
  const unitSearch = page.getByPlaceholder(/^(搜索单位\.\.\.|Search units\.\.\.)$/u);
  await unitSearch.fill("Marine");
  await clickText(page, /小队\s+6\s+模型\s+160|Small\s+6\s+models\s+160/u);
  body = await visibleText(page);
  ensure(/编队 \(1\)|Roster \(1\)/u.test(body), "ARMY_UNIT_NOT_ADDED");
  await clickText(page, /保存|Save/u);
  body = await visibleText(page);
  ensure(/1\s*(份军表|armies)/iu.test(body) && /1\s*·/u.test(body),
    "ARMY_DRAFT_NOT_PERSISTED");
  await capture("army-builder-saved");
  checks.push("army_create_add_save_and_persist");

  await clickText(page, /计算|Calculator/u);
  await clickText(page, /伤害|Damage/u);
  const damagePanel = page.getByTestId("damage-calculator-panel");
  const attackerPicker = damagePanel.getByTestId("damage-attacker-unit-picker");
  const defenderPicker = damagePanel.getByTestId("damage-defender-unit-picker");
  await attackerPicker.getByRole("button", { name: /选择单位|Select Unit/u }).click();
  await attackerPicker.getByRole("button", { name: "Marine", exact: true }).click();
  await defenderPicker.getByRole("button", { name: /选择单位|Select Unit/u }).click();
  await defenderPicker.getByRole("button", { name: "Zergling", exact: true }).click();
  body = await visibleText(page);
  ensure(/三池系统战斗预期|Three-Pool Combat Expectation/u.test(body)
    && /总伤害|Total Damage/u.test(body),
  "DAMAGE_CALCULATOR_RESULT_MISSING");
  await clickText(page, /对抗|Matchup/u);
  const matchupPanel = page.getByTestId("matchup-calculator-panel");
  const matchupUnitA = matchupPanel.getByTestId("matchup-unit-a-picker");
  const matchupUnitB = matchupPanel.getByTestId("matchup-unit-b-picker");
  await matchupUnitA.getByRole("button", { name: /选择单位|Select Unit/u }).click();
  await matchupUnitA.getByRole("button", { name: "Marine", exact: true }).click();
  await matchupUnitB.getByRole("button", { name: /选择单位|Select Unit/u }).click();
  await matchupUnitB.getByRole("button", { name: "Zergling", exact: true }).click();
  body = await visibleText(page);
  ensure(/对抗分析 \(三池系统\)|Matchup Analysis \(Three-Pool\)/u.test(body)
    && /总期望伤害|Total Expected Damage/u.test(body),
    "MATCHUP_CALCULATOR_UNUSABLE");
  await clickText(page, /单位VS|Unit VS/u);
  const versusPanel = page.getByTestId("versus-calculator-panel");
  const versusUnitA = versusPanel.getByTestId("versus-unit-a-picker");
  const versusUnitB = versusPanel.getByTestId("versus-unit-b-picker");
  await versusUnitA.getByRole("button", { name: /选择单位|Select Unit/u }).click();
  await versusUnitA.getByRole("button", { name: "Marine", exact: true }).click();
  await versusUnitB.getByRole("button", { name: /选择单位|Select Unit/u }).click();
  await versusUnitB.getByRole("button", { name: "Zergling", exact: true }).click();
  body = await visibleText(page);
  ensure(/武器概览|Weapon Overview/u.test(body)
    && /阶段对比|Phase Comparison/u.test(body),
  "VERSUS_CALCULATOR_UNUSABLE");
  await clickText(page, /军表分析|Roster/u);
  ensure(/军表分析|Roster Analysis/u.test(await visibleText(page)),
    "ROSTER_CALCULATOR_UNUSABLE");
  await clickText(page, /骰子|Dice/u);
  await page.getByRole("button", { name: /投掷|Roll/u }).first().click();
  ensure(/投掷历史|Roll History/u.test(await visibleText(page)), "DICE_HISTORY_MISSING");
  await capture("calculators-and-dice-history");
  checks.push("all_calculator_tabs_and_dice_history");

  await clickText(page, /设置|Settings/u);
  body = await visibleText(page);
  ensure(body.includes("U71/C69/R48") && /固定|frozen/iu.test(body),
    "SETTINGS_CATALOGUE_SOURCE_MISSING");
  await clickText(page, "English");
  ensure(/Official source integration/iu.test(await visibleText(page)),
    "LANGUAGE_SWITCH_TO_ENGLISH_FAILED");
  await clickText(page, "中文");
  await capture("settings-official-source");
  checks.push("settings_source_and_language");

  const dock = page.getByTestId("tactical-adjutant-floating-dock");
  await dock.waitFor({ state: "visible" });
  await dock.getByRole("button", { name: /战术通讯|TACTICAL COMMS|战术副官|Tactical Adjutant/u }).first().click();
  ensure(/进入已验证房间后加载副官|Join a verified room/u.test(await visibleText(page)),
    "FLOATING_ADJUTANT_NOT_EXPANDED");
  await dock.getByRole("button", { name: /战术通讯|TACTICAL COMMS|战术副官|Tactical Adjutant/u }).first().click();
  checks.push("persistent_floating_adjutant");

  await page.goto(recoveryUrl, { waitUntil: "networkidle" });
  await page.getByText(/对战房间|Battle Room/u).waitFor({ timeout: 20_000 });
  await page.getByText(/已连接权威房间|Authoritative room connected/u)
    .waitFor({ timeout: 40_000 });
  body = await visibleText(page);
  ensure(/已连接权威房间|Authoritative room connected/u.test(body),
    "ROOM_RECOVERY_BIND_FAILED");
  await clickText(page, /战桌|Battlefield/u);
  await page.getByText(/权威战场|Authoritative Battlefield/u).waitFor();
  ensure(await page.locator("svg").count() > 0, "BATTLEFIELD_MAP_NOT_RENDERED");
  body = await visibleText(page);
  ensure(/Standard\s*·\s*54×36 in/u.test(body), "STANDARD_BATTLEFIELD_CONTRACT_MISSING");
  ensure(body.includes("P1 2000 Minerals / 115 Vespene"), "PLAYER1_2000_RESOURCE_CONTRACT_MISSING");
  ensure(body.includes("P2 2000 Minerals / 140 Vespene"), "PLAYER2_2000_RESOURCE_CONTRACT_MISSING");
  ensure(body.includes("15 units") && body.includes("15 reserve")
    && body.includes("9 terrain"), "STANDARD_ROOM_CONTENT_COUNTS_MISSING");
  const manifest = await page.evaluate(async () => (await fetch("/__ticket20/manifest")).json());
  ensure(manifest?.coverage?.currentProductAbilityExactCount === 252
    && manifest?.coverage?.currentProductAbilityPendingCount === 0,
  "CURRENT_PRODUCT_ABILITY_DENOMINATOR_NOT_CLOSED");
  await capture("standard-2000-room-bound");

  await page.getByRole("button", { name: /^(行动|Actions)$/u }).click();
  const loadLegal = page.getByRole("button", { name: "Load LegalSpace" });
  if (await loadLegal.isEnabled()) await loadLegal.click();
  const goliathActionCard = page.getByText("deploy · player1-goliath-1", { exact: true })
    .locator("..");
  await goliathActionCard.getByRole("button", { name: /编辑参数|Edit parameters/u })
    .click();
  await page.getByRole("button", { name: "player1-goliath-1-model-1", exact: true })
    .click();
  body = await visibleText(page);
  const segmentMatch = body.match(/\b(top|bottom|left|right) · ([0-9.]+)–([0-9.]+) in/u);
  ensure(segmentMatch, "STANDARD_DEPLOY_ENTRY_SEGMENT_NOT_VISIBLE");
  const side = segmentMatch[1];
  const along = (Number(segmentMatch[2]) + Number(segmentMatch[3])) / 2;
  const endpoint = side === "left" ? { x: 2.075, y: along }
    : side === "right" ? { x: 51.925, y: along }
      : side === "bottom" ? { x: along, y: 2.075 }
        : { x: along, y: 33.925 };
  await page.getByLabel(/战场 X 坐标|Battlefield X coordinate/u)
    .fill(String(endpoint.x));
  await page.getByLabel(/战场 Y 坐标|Battlefield Y coordinate/u)
    .fill(String(endpoint.y));
  await page.getByRole("button", { name: /添加路径点|Add waypoint/u }).click();
  await capture("human-deploy-parameter-proposal");
  const preview = page.getByRole("button", { name: /提交权威 Preview|Request authoritative Preview/u });
  await preview.waitFor({ state: "visible", timeout: 15_000 });
  ensure(await preview.isEnabled(), "STANDARD_DEPLOY_PARAMETER_PROPOSAL_NOT_READY");
  await preview.click();
  await page.getByText(/密封 Preview|Sealed Preview/u).waitFor({ timeout: 15_000 });
  await capture("human-deploy-sealed-preview");
  await page.getByRole("button", { name: /确认并应用|Confirm and apply/u }).click();
  await page.getByText(/收据与重放|Receipt & replay/u).waitFor({ timeout: 45_000 });
  body = await visibleText(page);
  ensure(/matches current:\s*true/iu.test(body), "BATTLE_APPLY_REPLAY_NOT_VERIFIED");
  ensure(body.includes("Goliath · player1"), "DEPLOYED_GOLIATH_NOT_PROJECTED");
  await capture("human-deploy-applied-and-replayed");

  const opponentPanel = page.getByTestId("hosted-opponent-operations-panel");
  await opponentPanel.getByText(/physical_sync_pending/u).waitFor({ timeout: 20_000 });
  body = await opponentPanel.innerText();
  ensure(/(?:逐动作人工批准|Per-action approval):\s*no/iu.test(body),
    "BOT_PER_ACTION_APPROVAL_WRONGLY_REQUIRED");
  ensure(/(?:机器动作|Agent actions):\s*1/iu.test(body),
    "BOT_AUTOMATIC_ACTION_NOT_APPLIED");
  ensure(/Tokens:\s*0/iu.test(body) && /Cost:\s*¥0\.0000/iu.test(body),
    "BOT_COST_PANEL_MISSING");
  ensure(/deploy|部署/iu.test(body) && /目的|Purpose/u.test(body),
    "BOT_PUBLIC_DECISION_SUMMARY_MISSING");
  ensure(/place_model/u.test(body), "BOT_PHYSICAL_OPERATION_NOT_VISIBLE");
  await capture("bot-automatic-action-and-physical-task");
  await opponentPanel.getByRole("button", { name: /我已完成|I completed it/u }).first().click();
  await opponentPanel.getByText(/physical_operation_completed/u).waitFor({ timeout: 10_000 });
  checks.push("standard_2000_deploy_bot_auto_apply_physical_sync_replay");

  await page.getByRole("button", {
    name: /^(复盘与 Skill|Review & Skill)$/u,
  }).click();
  await page.getByTestId("ticket20-learning-console").waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => (
    /(?:已验证轨迹|Verified episodes)\s*4/iu.test(document.body.innerText)
  ));
  body = await visibleText(page);
  ensure(/已验证轨迹\s*4|Verified episodes\s*4/iu.test(body),
    "LEARNING_EPISODES_NOT_VISIBLE");
  await page.getByRole("button", { name: /合并 4 条已验证轨迹|Merge 4 verified episodes/u }).click();
  await page.waitForFunction(() => (
    /(?:隔离候选|Quarantined candidates)\s*2/iu.test(document.body.innerText)
  ));
  body = await visibleText(page);
  ensure(/隔离候选\s*2|Quarantined candidates\s*2/iu.test(body),
    "SKILLOPT_CANDIDATES_NOT_CREATED");
  await page.getByRole("button", { name: /规则变化影响预演|Preview rules-change impact/u }).click();
  await page.waitForFunction(() => document.body.innerText.includes("受影响 Skill")
    && /受影响 Skill\s*5/u.test(document.body.innerText));
  body = await visibleText(page);
  ensure(/旧版可查看\s*是|Old versions readable\s*yes/iu.test(body),
    "FRESHNESS_OLD_VERSION_VISIBILITY_MISSING");
  await capture("multigame-review-and-skill-freshness");
  checks.push("manual_multigame_skillopt_and_incremental_freshness");

  ensure(pageErrors.length === 0, "BROWSER_PAGE_ERRORS", { pageErrors });
  ensure(consoleErrors.length === 0, "BROWSER_CONSOLE_ERRORS", { consoleErrors });
  await page.screenshot({ path: path.join(outputDirectory, "final.png"), fullPage: true });
  console.log(JSON.stringify({ ok: true, checks, consoleErrors, pageErrors,
    developmentTransportNoise, screenshotCount: screenshotOrdinal + 1,
    finalUrl: page.url(), modelCalls: 0, costCny: 0 }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outputDirectory, "failure.png"), fullPage: true });
  const hitTargets = await page.evaluate(() => Array.from(document.querySelectorAll("div"))
    .filter((element) => ["Marine", "Goliath", "陆战队员"].includes(element.textContent?.trim() || ""))
    .map((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        text: element.textContent?.trim(),
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        pointerEvents: style.pointerEvents,
        position: style.position,
        zIndex: style.zIndex,
      };
    }));
  console.error(JSON.stringify({ failureUrl: page.url(), checks, hitTargets,
    bodyText: (await visibleText(page)).slice(0, 12_000),
    consoleErrors, developmentTransportNoise, pageErrors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
