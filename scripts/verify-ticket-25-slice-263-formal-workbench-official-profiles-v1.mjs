#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isStarcraftTmgBattleWorkbenchSnapshotV1 } from
  "../packages/client-domain/battle-workbench-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roomId = "ticket25-slice263-formal-workbench-official-profiles";

const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root,
  roomId,
  roomProfile: "standard_2000_live",
  attachBot: false,
  issueHumanRecovery: false,
});
const aggregate = await fixture.roomRuntime.roomStore.loadRoom(roomId);
const state = aggregate.envelope.state;
const result = await fixture.roomRuntime.readBattleWorkbench({
  roomId,
  seatToken: fixture.createdRoom.credentials.human.seatToken,
});
assert.equal(result.ok, true);
assert.equal(isStarcraftTmgBattleWorkbenchSnapshotV1(result.snapshot, {
  roomId,
  matchBindingHash: aggregate.envelope.matchBinding.bindingHash,
  stateRevision: aggregate.stateRevision,
  stateHash: aggregate.envelope.stateHash,
}), true);

const marinePiece = state.pieces.find((piece) => (
  piece.officialUnitRecordKey === "army_units:marine"
));
assert.ok(marinePiece, "formal Marine piece is required");
assert.equal(Array.isArray(marinePiece.weapons) ? marinePiece.weapons.length : 0, 0,
  "reproducer requires no legacy inline weapons");
assert.equal(marinePiece.stats ?? null, null,
  "reproducer requires no legacy inline stats");

const officialCombat = state.officialCombatProfileBundle
  .profilesByRecordKey[marinePiece.officialUnitRecordKey];
const equipped = new Set((marinePiece.equipment || []).map((entry) => (
  String(entry.equipmentName || "").trim().toLowerCase()
)));
const officialAttacks = state.officialAttackProfileCatalogueV2.profiles.filter((profile) => (
  profile.recordKey === marinePiece.officialUnitRecordKey
    && equipped.has(String(profile.weaponName || "").trim().toLowerCase())
));
assert.equal(officialCombat.combatWeapons.length, 2,
  "official Marine close-combat denominator drifted");
assert.ok(officialAttacks.length >= 2,
  "selected formal Marine must expose its equipped official attack profiles");

const marine = result.snapshot.units.find((unit) => unit.id === marinePiece.id);
assert.ok(marine, "formal Marine is missing from Workbench");
assert.equal(marine.officialUnitRecordKey, marinePiece.officialUnitRecordKey);
assert.equal(marine.hpPerModel, officialCombat.hitPoints);
assert.equal(marine.shieldPerModel, officialCombat.shield);
assert.equal(marine.weapons.length, officialAttacks.length);
assert.deepEqual(marine.weapons.map((weapon) => weapon.id).sort(),
  officialAttacks.map((profile) => profile.profileKey).sort());
assert.equal(marine.weapons.every((weapon) => (
  weapon.source === "official_attack_profile_catalogue_v2"
    && typeof weapon.sourceProfileHash === "string"
)), true);
assert.equal(marine.inspectionCoverage, "exact");

const marineThreat = result.snapshot.threat.perUnit.find((entry) => (
  entry.unitId === marine.id
));
assert.ok(marineThreat, "formal Marine threat projection is missing");
assert.equal(marineThreat.weapons.length, officialAttacks.length);
assert.equal(result.snapshot.coverage.unit.evidence.includes(
  "authority_state.officialAttackProfileCatalogueV2"), true);

console.log(JSON.stringify({
  ok: true,
  checks: 18,
  unitId: marine.id,
  officialCombatWeapons: officialCombat.combatWeapons.length,
  equippedAttackProfiles: officialAttacks.length,
  projectedWorkbenchWeapons: marine.weapons.length,
  threatWeapons: marineThreat.weapons.length,
  providerCalls: 0,
  estimatedCostCny: 0,
}, null, 2));
