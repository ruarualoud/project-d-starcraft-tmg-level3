const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'assets', 'data', 'bundled-data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function firstInlineValue(value, fallback = '-') {
  if (!value) return fallback;
  const cleaned = String(value).split(/\r?\n/)[0].split('|')[0].trim();
  return cleaned || fallback;
}

function extractField(desc, label) {
  const match = String(desc || '').match(new RegExp(`${label}:\\s*([^|\\n\\r]+)`, 'i'));
  return match?.[1]?.trim();
}

const WEAPON_KEYWORD_PATTERNS = [
  /PIERCE\s*(?:\[[^\]]+\]\s*\d+|[A-Z' -]+?\s*\(\d+\))/g,
  /CRITICAL\s*HIT\s*\(\d+\)/g,
  /DODGE\s*\(\d+\)/g,
  /ANTI[- ]?EVADE\s*\(\d+\)/g,
  /BURST\s*FIRE\s*\d+\s*"?\s*\(\d+\)/g,
  /CONCENTRATED\s*FIRE\s*\(\d+\)/g,
  /IMPACT\s*\(\d+\)\s*\d+\+?/g,
  /IMPACT\s*BONUS\s*\(\d+\)/g,
  /SIDEARM/g,
  /TOUGH\s*\(\d+\)/g,
  /PRECISION\s*\(\d+\)/g,
  /HIDDEN/g,
  /INDIRECT\s*FIRE/g,
  /PINPOINT/g,
  /SPILLOVER/g,
  /LONG\s*RANGE\s*(?:\(\d+\s*"?\)|\d+\s*"?)/g,
  /LOCKED\s*IN\s*\(\d+\)/g,
  /TITAN\s*KILLERS\s*\d+\+\s*\(\d+\)/g,
  /INSTANT/g,
  /SPECIALIST/g,
  /BULKY/g,
];

function extractWeaponKeywords(desc) {
  if (!desc) return '';
  const upper = String(desc).toUpperCase();
  const found = [];
  for (const pattern of WEAPON_KEYWORD_PATTERNS) {
    for (const match of upper.matchAll(pattern)) {
      const value = match[0].replace(/\s+/g, ' ').trim();
      if (!found.includes(value)) found.push(value);
    }
  }
  return found.join(', ');
}

let changed = 0;
for (const unit of data.units || []) {
  for (const upgrade of unit.upgrades || []) {
    if (!upgrade.weapon) continue;
    const before = JSON.stringify(upgrade.weapon);
    const desc = upgrade.description || '';
    const keywordSource = [desc, upgrade.weapon.keywords || '', String(upgrade.weapon.dmg || ''), String(upgrade.weapon.surge || '')]
      .filter(Boolean)
      .join('\n');

    const extractedKeywords = extractWeaponKeywords(keywordSource);
    const keywords = [upgrade.weapon.keywords || '', extractedKeywords]
      .filter(Boolean)
      .join(', ')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .filter((part, index, arr) => arr.indexOf(part) === index)
      .join(', ');

    upgrade.weapon.range = firstInlineValue(upgrade.weapon.range);
    upgrade.weapon.target = firstInlineValue(upgrade.weapon.target);
    upgrade.weapon.roa = firstInlineValue(upgrade.weapon.roa, '1');
    upgrade.weapon.hit = firstInlineValue(upgrade.weapon.hit);
    upgrade.weapon.dmg = firstInlineValue(upgrade.weapon.dmg);
    upgrade.weapon.surge = firstInlineValue(extractField(desc, 'SURGE') || upgrade.weapon.surge || extractField(upgrade.weapon.dmg, 'SURGE') || '', '');
    upgrade.weapon.keywords = keywords;

    if (JSON.stringify(upgrade.weapon) !== before) changed += 1;
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
console.log(`Sanitized ${changed} weapon records in ${filePath}`);
