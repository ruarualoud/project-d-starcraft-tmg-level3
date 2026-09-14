import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDirectedMatchupInputV1 } from '../packages/strategy-skills/directed-matchup-input-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(root, file), 'utf8')));
const frozenInput = await json('build/ticket-18-faction-production-v1/terran_armed_forces-input.json');
const generalBase = 'build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-final-v1/';
const generalSkill = await json(generalBase + 'final-general-skill.json');
const generalLayer = await json(generalBase + 'final-general-strategy-layer.json');
const reseal = (value, delta) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...delta }); };
// Explicit injected boundary tests; no fabricated production or Rules receipts
// are written. Actual finalization must authenticate the original journals.
const faction = name => seal({ schema: 'project_d_game_skill_v1', gameId: 'starcraft-tmg',
  factionRecordKey: 'tactical_cards:' + name, trustTier: 'offline_evaluated_advisory',
  status: 'offline_candidate', sourceBinding: frozenInput.sourceBinding,
  dependencies: { generalSkillHash: generalSkill.hash, generalLayerHash: generalLayer.hash },
  judgeTests: { productionEvidenceHash: hash('injected-production'), consumerEvidenceHash: hash('injected-consumer'),
    rosterEvaluationHash: hash('injected-roster'), ruleEvaluationHash: hash('injected-rule') },
  knowledge: [{ explicitlyInjectedBody: 'complete-native-knowledge-' + name }],
  canAffectRules: false, runtimeAccepted: false, trainingTruth: false });
const terran = faction('terran_armed_forces'), zerg = faction('zerg_swarm');
const compiled = (direction, split) => {
  const prompt = seal({ caseId: direction + '.' + split, familyId: direction + '.' + split,
    seatKey: 'player1', policyAxes: ['opening_branches'], binding: { sourceBinding: frozenInput.sourceBinding,
      stateHash: hash(direction + split) }, observation: { players: {
      player1: { faction: direction === 'tvz' ? 'Terran' : 'Zerg' },
      player2: { faction: direction === 'tvz' ? 'Zerg' : 'Terran' } } },
    runtimeCoverage: { excludedSourceRefs: ['INJECTED_NOT_EXECUTED_CASE'] } });
  return seal({ schema: 'starcraft_compiled_strategy_case_v1', prompt,
    evaluation: seal({ promptHash: prompt.hash, split }), fixtureOnly: true });
};
const args = { frozenInput, generalSkill, generalLayer, ownSkill: terran, opponentSkill: zerg,
  cases: ['development', 'heldout'].map(split => compiled('tvz', split)) };
const forward = prepareDirectedMatchupInputV1(args);
const reverse = prepareDirectedMatchupInputV1({ ...args, ownSkill: zerg, opponentSkill: terran,
  cases: ['development', 'heldout'].map(split => compiled('zvt', split)) });
assert.notEqual(forward.hash, reverse.hash);
assert.equal(forward.outputContract.hash, reverse.outputContract.hash, 'Protocol is direction-independent; INPUT is not');
assert.deepEqual(forward.workspace.strategyDependencies.ownSkill.knowledge, terran.knowledge);
assert.deepEqual(forward.workspace.fullFrozenSources, frozenInput.frozenSources.prompt);
assert.deepEqual(forward.workspace.developmentCases, [args.cases[0].prompt]);
assert(!JSON.stringify(forward.workspace).includes(args.cases[1].prompt.caseId));
assert.deepEqual(forward.evaluationManifest.uncoveredAxes, ['opponent_profile', 'counterplay', 'resource_exchange', 'endgame']);
let checks = 7;
for (const [delta, code] of [
  [{ cases: [] }, 'MATCHUP_DEVELOPMENT_AND_HELDOUT_CASES_REQUIRED'],
  [{ cases: args.cases.slice(0, 1) }, 'MATCHUP_DEVELOPMENT_AND_HELDOUT_CASES_REQUIRED'],
  [{ ownSkill: zerg }, 'MATCHUP_DIRECTION_INVALID'],
  [{ cases: ['development', 'heldout'].map(split => compiled('zvt', split)) }, 'MATCHUP_CASE_DIRECTION_DRIFT'],
  [{ ownSkill: reseal(terran, { trustTier: 'unreviewed' }) }, 'MATCHUP_FACTION_DEPENDENCY_UNQUALIFIED'],
  [{ ownSkill: reseal(terran, { judgeTests: { ...terran.judgeTests, consumerEvidenceHash: null } }) }, 'MATCHUP_FACTION_DEPENDENCY_UNQUALIFIED'],
  [{ ownSkill: reseal(terran, { sourceBinding: { ...terran.sourceBinding, faq: hash('wrong') } }) }, 'MATCHUP_SOURCE_BINDING_DRIFT'],
  [{ generalLayer: reseal(generalLayer, { assessment: { sourceReviewPassed: false } }) }, 'MATCHUP_GENERAL_DEPENDENCY_UNQUALIFIED'],
]) { assert.throws(() => prepareDirectedMatchupInputV1({ ...args, ...delta }), { code }); checks++; }
const files = ['packages/strategy-skills/directed-matchup-input-v1.mjs', 'scripts/verify-ticket-18-directed-matchup-input-v1.mjs'];
const report = seal({ passed: true, checks, providerCalls: 0, fixtureOnly: true,
  actualFactionSkillsAccepted: 0, actualMatchupSkillsAccepted: 0, actualRulesCasesExecuted: 0,
  sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
const out = path.join(root, 'build/ticket-18-directed-matchup-v1');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'input-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
