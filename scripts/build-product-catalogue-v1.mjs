#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(
  ROOT,
  "apps/starcraft-tmg-expo/assets/data/official-product-catalogue-v1.json",
);

function weaponKeywords(description) {
  const found = [];
  for (const pattern of [
    /ANTI[- ]?EVADE\s*\(\d+\)/giu,
    /BURST\s*FIRE\s*\d+\s*"?\s*\(\d+\)/giu,
    /CONCENTRATED\s*FIRE\s*\(\d+\)/giu,
    /CRITICAL\s*HIT\s*\(\d+\)/giu,
    /DODGE\s*\(\d+\)/giu,
    /IMPACT\s*\(\d+\)\s*\d+\+?/giu,
    /INDIRECT\s*FIRE/giu,
    /LOCKED\s*IN\s*\(\d+\)/giu,
    /LONG\s*RANGE\s*(?:\(\d+\s*"?\)|\d+\s*"?)/giu,
    /PIERCE\s*(?:\[[^\]]+\]\s*\d+|[A-Z' -]+?\s*\(\d+\))/giu,
    /PINPOINT/giu,
    /PRECISION\s*\(\d+\)/giu,
    /SIDEARM/giu,
    /SPILLOVER/giu,
    /TOUGH\s*\(\d+\)/giu,
  ]) {
    for (const match of description.matchAll(pattern)) {
      const value = match[0].replace(/\s+/gu, " ").trim().toUpperCase();
      if (!found.includes(value)) found.push(value);
    }
  }
  return found.join(", ");
}

function field(description, label, fallback) {
  const match = description.match(new RegExp(`${label}:\\s*([^|\\n\\r]+)`, "iu"));
  return match?.[1]?.trim() || fallback;
}

function weapon(upgrade) {
  const description = String(upgrade.description || "");
  if (!/(?:RANGE|HIT|DMG):/iu.test(description)) return undefined;
  return {
    name: String(upgrade.name || ""),
    range: field(description, "RANGE", "-"),
    target: field(description, "TARGET", "-"),
    roa: field(description, "RoA", "1"),
    hit: field(description, "HIT", "-"),
    dmg: field(description, "DMG", "-"),
    surge: field(description, "SURGE", "-"),
    keywords: weaponKeywords(description),
    phase: String(upgrade.phase || ""),
  };
}

function numericStat(value) {
  const match = String(value ?? "").match(/-?\d+/u);
  return match ? Number(match[0]) : 0;
}

function unitStats(value = {}) {
  return {
    shield: numericStat(value.shield),
    speed: numericStat(value.speed),
    evade: numericStat(value.evade),
    armor: numericStat(value.armor),
    hp: numericStat(value.hp),
    size: String(value.size || "-"),
  };
}

function printedUnitStats(value = {}) {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
    [key, String(entry ?? "-")],
  ));
}

function unit(record) {
  const value = record.payload;
  return {
    id: value.id,
    name: value.name,
    faction: value.faction,
    unitType: value.unitType || "Other",
    stats: unitStats(value.stats),
    printedStats: printedUnitStats(value.stats),
    keywords: value.keywords || "",
    tags: value.tags || "",
    upgrades: (value.upgrades || []).map((upgrade) => ({
      name: upgrade.name || "",
      description: upgrade.description || "",
      phase: upgrade.phase || "",
      costS: Number(upgrade.costS || 0),
      costL: Number(upgrade.costL || 0),
      activation: upgrade.activation || "",
      linkedTo: upgrade.linkedTo || "",
      ...(weapon(upgrade) ? { weapon: weapon(upgrade) } : {}),
    })),
    smallProfile: value.small ? {
      size: "small",
      models: Number(value.small.models || 0),
      supply: Number(value.small.supply || 0),
      cost: Number(value.small.cost || 0),
    } : undefined,
    largeProfile: value.large ? {
      size: "large",
      models: Number(value.large.models || 0),
      supply: Number(value.large.supply || 0),
      cost: Number(value.large.cost || 0),
    } : undefined,
    frontUrl: value.frontUrl || "",
    isUnique: /(?:^|,\s*)Unique(?:\s*,|$)/iu.test(value.tags || ""),
  };
}

function resourceType(faction) {
  if (faction === "Terran") return "CP";
  if (faction === "Zerg") return "BM";
  if (faction === "Protoss") return "PE";
  return "";
}

function tacticalCard(record) {
  const value = record.payload;
  return {
    id: value.id,
    name: value.name,
    faction: value.faction,
    cost: Number(value.cost || 0),
    resource: Number(value.resource || 0),
    resourceType: resourceType(value.faction),
    slots: value.slots || {},
    boosts: value.boosts || [],
    isFactionCard: value.isFactionCard === true,
    isUnique: value.isUnique === true,
    factionTags: value.factionTags || [],
    frontUrl: value.frontUrl || "",
  };
}

function integer(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function gameCard(record) {
  const value = record.payload;
  return {
    ...value,
    id: value.id || record.documentId,
    name: value.name || record.documentId,
    type: record.recordType,
    ...(integer(value.startingSupply) === undefined
      ? {} : { startingSupply: integer(value.startingSupply) }),
    ...(integer(value.gameLength) === undefined
      ? {} : { gameLength: integer(value.gameLength) }),
  };
}

async function main() {
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
  const records = source.dataset.recordIndex.map(
    (entry) => source.dataset.recordsByKey[entry.recordKey],
  );
  const units = records.filter((record) => record.recordType === "unit").map(unit);
  const cards = records.filter((record) => record.recordType === "tactical_card")
    .map(tacticalCard);
  const gameCards = records.filter((record) => [
    "mission",
    "deployment",
    "community_mission",
    "community_deployment",
  ].includes(record.recordType)).map(gameCard);
  const catalogue = {
    schemaVersion: "starcraft_tmg_official_product_catalogue_v1",
    source: {
      sourceId: source.snapshot.sourceId,
      sourceSnapshotHash: source.snapshot.snapshotHash,
      officialDatasetHash: source.dataset.datasetHash,
      sourceLockHash: source.lock.lockHash,
      capturedAt: source.snapshot.capturedAt,
      dataVersions: source.snapshot.dataVersions,
      recordCounts: { units: units.length, cards: cards.length, gameCards: gameCards.length },
      sourceRefreshPolicy: "explicit_user_command_only",
      displayAuthority: "verified_frozen_official_product_projection",
      rulesAuthority: false,
      trainingTruth: false,
    },
    version: Number(source.snapshot.dataVersions.unitsVersion),
    exportedAt: Date.parse(source.snapshot.capturedAt),
    units,
    cards,
    gameCards,
  };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(catalogue, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ output: path.relative(ROOT, OUTPUT),
    source: catalogue.source })}\n`);
}

await main();
