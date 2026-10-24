// Reproduce v320's actual reserve Marauder failure; no model call or game action.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { queryStarcraftTmgStaticFormationV1 } from '../packages/online-agent-session/static-formation-query-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [sourceFile, outputFile] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, roomActions: 0, sourceFile };
try {
  const source = JSON.parse(gunzipSync(await fs.readFile(sourceFile))).authority.state;
  const actor = source.pieces.find(p => p.id === 'marauder-1');
  assert.equal(actor.isOnField, false);
  assert.equal(actor.isDestroyed, false);
  assert.equal(actor.currentModels, 4);
  const args = { unitId: actor.id, anchors: [{ xInches: 25, yInches: 29 }] };
  const before = hash(source);
  let result;
  if (!process.argv.includes('--remaining')) {
  result = queryStarcraftTmgStaticFormationV1({ state: source, arguments: args });
  assert.equal(result.arrivalOrMovementLegalityProven, false);
  assert.equal(result.sourceStateHash, before);
  assert.equal(hash(source), before);
  const projected = structuredClone(source), placed = projected.pieces.find(p => p.id === actor.id);
  placed.isOnField = true;
  for (const model of placed.models) if (!model.isDestroyed) model.isOnField = true;
  const control = queryStarcraftTmgStaticFormationV1({ state: projected, arguments: args });
  assert.deepEqual(result.formationOptions, control.formationOptions);
  assert.deepEqual(result.misses, control.misses);
  assert.equal(result.formationOptions.length + result.misses.length, args.anchors.length);
  report.checks.push('actual_living_reserve_layout_matches_on_field_geometry_without_arrival_claim_or_mutation');
  } else report.previouslyPassedDirectGateNotRepeated = true;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ROOM_ACTION'); }, apply: () => { throw Error('NO_ROOM_MUTATION'); } } });
  const receipt = await createRosterTeachEvidencePortV1(lab).query({ mutationAuthority: false,
    initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)], challengeId: 'actual-reserve-layout',
    request: { kind: 'spatial', toolRequest: { branchIdRef: '', queryKind: 'space.solve_static_formation', argumentsJson: JSON.stringify(args) } } });
  assert.equal(receipt.status, 'advisory');
  const native = receipt.sourceReceipt.queryReceipt.result;
  if (result) assert.deepEqual(native.formationOptions, result.formationOptions);
  assert.equal(native.formationOptions.length + native.misses.length, args.anchors.length);
  assert.equal(native.arrivalOrMovementLegalityProven, false);
  assert.equal(hash(source), before);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('ordinary_teach_tool_returns_source_bound_static_result_not_coherency_input_unknown');
  const destroyed = structuredClone(source);
  destroyed.pieces.find(p => p.id === actor.id).isDestroyed = true;
  assert.throws(() => queryStarcraftTmgStaticFormationV1({ state: destroyed, arguments: args }), /STATIC_FORMATION_ARGUMENTS_INVALID/);
  report.checks.push('destroyed_unit_is_not_resurrected_for_static_query');
  report.options = native.formationOptions.length; report.misses = native.misses.length;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; report.stack = error.stack; process.exitCode = 1; }
await fs.writeFile(outputFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
