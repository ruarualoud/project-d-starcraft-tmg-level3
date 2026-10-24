// Reproduce the actual v326 request 009: the packer chose a Hydralisk follower
// which Native later rejected for enemy separation. No provider or live room.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const [sourceFile, replyFile, outputFile] = process.argv.slice(2);
const report = { sourceFile, replyFile, providerCalls: 0, roomActions: 0, checks: [] };
try {
  const source = JSON.parse(gunzipSync(await fs.readFile(sourceFile))).authority.state;
  const reply = JSON.parse(gunzipSync(await fs.readFile(replyFile))).output;
  const query = reply.queries.find(q => q.queryId === 'q-post-loss-casualty-branch-rebuild2');
  const spec = JSON.parse(query.toolRequestJson).spec;
  const before = hash(source);
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_MUTATION'); } } });
  const result = lab.runScenarioBranch({ branchId: 'actual-joint-layout', spec });
  report.actualAssessment = result.hypotheticalPlacementAssessment;
  assert(result.hypotheticalPlacementAssessment.units.every(u => u.resultStatus === 'ok'),
    'Packer returned positions rejected by Native instead of applying Native enemy clearance while selecting followers');
  report.checks.push('actual_five_unit_layout_passes_native_geometry_with_fixed_model_selected_anchors');
  for (const placement of result.hypotheticalPlacements) {
    const requested = spec.placements.find(p => p.pieceId === placement.pieceId);
    assert.equal(placement.modelPositions[0].xInches, requested.xInches);
    assert.equal(placement.modelPositions[0].yInches, requested.yInches);
  }
  const tooClose = structuredClone(spec);
  tooClose.placements.find(p => p.pieceId === 'player2-hydralisk').xInches = 32;
  const rejected = lab.runScenarioBranch({ branchId: 'invalid-fixed-anchor', spec: tooClose });
  assert(rejected.hypotheticalPlacementAssessment.units.some(u => u.resultStatus !== 'ok'));
  const retained = rejected.hypotheticalPlacements.find(p => p.pieceId === 'player2-hydralisk');
  assert.equal(retained.xInches, 32);
  assert.equal(hash(source), before);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('illegal_fixed_anchor_not_shifted_or_certified_and_source_unchanged');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; report.stack = error.stack; process.exitCode = 1; }
await fs.writeFile(outputFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
