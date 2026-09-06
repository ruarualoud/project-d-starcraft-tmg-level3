import { readFile } from 'node:fs/promises';
import { createOfficialMarineStimpackKernelV1 } from '../rule-atoms/official-marine-stimpack-kernel-v1.mjs';
import { evaluateOfficialFaqF4RuleV1 } from '../rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { seal, verifySeal, hash, sha256, clone, exact, fail } from '../skill-production/common.mjs';

const NON_LETHAL = 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.47';
const MARINE = 'source:army_units:marine';
const FACTIONS = ['tactical_cards:terran_armed_forces', 'tactical_cards:zerg_swarm'];
const compact = text => text.replace(/\s+/gu, '');

// These are source-calibrated application probes, not newly claimed held-out
// data: the rule families and some inputs already occur in development tests.
// Neither questions nor answers are imported by the faction producer.
export async function createFactionRuleApplicationDrillsV1({ catalogue }) {
  verifySeal(catalogue);
  const source = id => {
    const matches = catalogue.rows.filter(row => row.id === id);
    if (matches.length !== 1) fail('FACTION_APPLICATION_SOURCE_MISSING');
    const row = verifySeal(matches[0]);
    if (row.quarantined || row.currentRulesReceiptHash !== catalogue.sourceBinding.rules)
      fail('FACTION_APPLICATION_SOURCE_UNAVAILABLE');
    return row;
  };
  const evidence = [NON_LETHAL, MARINE, 'faq-v1:37', 'faq-v1:59'].map(source);
  const nonLethal = source(NON_LETHAL).text;
  const marine = JSON.parse(source(MARINE).text);
  const stimpack = marine.upgrades.find(upgrade => upgrade.name === 'Stimpack');
  const faq37 = compact(source('faq-v1:37').text), faq59 = compact(source('faq-v1:59').text);
  if (nonLethal !== 'The Unit suffers X points of Damage. Add this amount effectively to the Unit’s Damage Marker. Do not remove any models, even if Total Damage exceeds a model’s HP. If the Unit subsequently suffers standard Damage, the combined Total Damage triggers casualty removal normally.'
    || marine.stats.hp !== '2' || stimpack?.activation !== '<Active>\n(1 Command Point)'
    || stimpack.phase !== 'Movement Phase'
    || stimpack.description !== 'This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3). Additionally, its C-14 Rifle and all Close Combat Weapons gain PRECISION (3).'
    || !faq37.includes(compact('A Unit can resolve any number of differently named Active abilities or Tactical Cards during its Activation, provided you can pay their'))
    || !faq37.includes(compact('Named Active abilities cannot be used more than Once per Round per Unit unless a rule explicitly states otherwise'))
    || !faq59.includes(compact('The standard limit of one Reaction per Activation still applies.'))
    || !faq59.includes(compact('For triggers that occur outside of an Activation entirely, the ability can only be used once per trigger.')))
    fail('FACTION_APPLICATION_SOURCE_CALIBRATION_DRIFT');

  const kernelFiles = ['official-marine-stimpack-kernel-v1.mjs', 'official-faq-f4-ability-tactical-keyword-kernel-v1.mjs'];
  const kernelHashes = await Promise.all(kernelFiles.map(async file => ({ file,
    hash: sha256(await readFile(new URL('../rule-atoms/' + file, import.meta.url))) })));
  const damageKernel = createOfficialMarineStimpackKernelV1(), cases = [], proofs = [];
  const sourceHashes = evidence.map(row => ({ ref: row.id, hash: row.hash }));
  function add({ id, group, input, question, answerShape, expected, refs, execute }) {
    const observed = execute(), repeated = execute();
    // Independent source-derived expected values are never copied from a
    // kernel result. A disagreement blocks the evaluator, not the Skill.
    if (hash(observed.answer) !== hash(expected) || hash(observed) !== hash(repeated))
      fail('FACTION_APPLICATION_ORACLE_DISAGREES');
    const entry = seal({ id: 'faction-rule-application.' + id, group, input, question, answerShape,
      expected, sourceHashes: sourceHashes.filter(row => refs.includes(row.ref)),
      novelty: 'development_application_probe_not_held_out' });
    cases.push(entry);
    proofs.push(seal({ caseHash: entry.hash, observed, sourceHashes: entry.sourceHashes,
      kernelHashes, independentlySpecifiedExpectation: expected, oracleAgrees: true,
      roomReplayPerformed: false, fullActionLegalityProven: false, trainingTruth: false }));
  }
  function damageCase(id, priorDamageMarker, applyStimpack, incomingDamage) {
    const input = { targetRecordKey: 'army_units:marine', remainingModels: 1, targetHitPoints: 2,
      priorDamageMarker, applyStimpack, incomingStandardDamage: incomingDamage,
      noOtherDamageOrReduction: true };
    const beforeStandard = priorDamageMarker + (applyStimpack ? 2 : 0);
    const destroyed = incomingDamage !== null && beforeStandard + incomingDamage >= 2;
    add({ id, group: 'damage_timing', input, refs: [NON_LETHAL, MARINE],
      question: '一个Marine单位只剩1模型。所有费用、时机及目标前提均已合法确认；若applyStimpack为true，先完整结算Stimpack。随后仅在incomingStandardDamage非null时结算该正数普通伤害；null表示尚未发生普通伤害事件。按给定顺序到此为止，报告模型是否被移除、伤害标记与移除模型数。单位伤害标记可能来自先前非致命伤害，不得把已有高标记当作状态无效。只评伤害子过程，不评整个动作合法性。',
      answerShape: { targetDestroyed: 'boolean', postDamageMarker: 'nonnegative_integer', casualtyCount: 'nonnegative_integer' },
      expected: { targetDestroyed: destroyed, postDamageMarker: destroyed ? 0 : beforeStandard + (incomingDamage ?? 0), casualtyCount: destroyed ? 1 : 0 },
      execute: () => {
        const steps = [];
        let marker = priorDamageMarker;
        if (applyStimpack) {
          const result = damageKernel.resolveNonLethalDamage({ targetPieceId: 'evaluation-marine', targetModelId: 'last-marine',
            abilityResolutionHash: hash({ id, step: 'stimpack' }), priorDamageMarker: marker, amount: 2, targetHitPoints: 2 });
          marker = result.postDamageMarker; steps.push(result);
        }
        if (incomingDamage !== null) steps.push(damageKernel.resolveLaterStandardDamage({
          targetPieceId: 'evaluation-marine', targetModelId: 'last-marine', attackResolutionHash: hash({ id, step: 'standard_damage' }),
          priorDamageMarker: marker, incomingDamage, targetHitPoints: 2 }));
        const last = steps.at(-1);
        return { steps, answer: { targetDestroyed: last.targetDestroyed,
          postDamageMarker: last.postDamageMarker, casualtyCount: last.casualtyModelIds.length } };
      } });
  }
  for (const prior of [0, 1, 3]) {
    damageCase('non_lethal_only.' + prior, prior, true, null);
    damageCase('non_lethal_then_standard.' + prior, prior, true, 1);
  }
  damageCase('ordinary_below_hp_control', 0, false, 1);
  damageCase('ordinary_lethal_control', 0, false, 2);
  for (const timing of ['inside_activation', 'outside_activation']) for (const reactionsResolvedThisActivation of [0, 1]) for (const usesForTrigger of [0, 1]) {
    const input = { timing, repeatable: true, reactionsResolvedThisActivation, usesForTrigger };
    add({ id: 'reaction.' + timing + '.' + reactionsResolvedThisActivation + '.' + usesForTrigger,
      group: 'reaction_cap', input, refs: ['faq-v1:59'],
      question: '只判断REPEATABLE Reaction的使用次数限制，其他费用、触发、来源及能力条件均满足。inside_activation时前一个计数指本玩家在当前激活已结算的Reaction总数；outside_activation时它只是上一激活的历史记录。usesForTrigger为当前这次触发已使用次数。此刻可否再使用？不推断其他完整合法性。',
      answerShape: { legalWithinNamedLimit: 'boolean' },
      expected: { legalWithinNamedLimit: timing === 'inside_activation' ? reactionsResolvedThisActivation === 0 : usesForTrigger === 0 },
      execute: () => { const result = evaluateOfficialFaqF4RuleV1('faq-v1:59', clone(input));
        return { result, answer: { legalWithinNamedLimit: result.legal } }; } });
  }
  const activeInputs = ['active', 'tactical_active'].flatMap(abilityType => [false, true].map(nameUsedByUnitThisRound => ({
    abilityType, costPaid: true, nameUsedByUnitThisRound, repeatable: false, reactionsResolvedThisActivation: 1 })));
  activeInputs.push({ abilityType: 'active', costPaid: true, nameUsedByUnitThisRound: true, repeatable: true, reactionsResolvedThisActivation: 0 },
    { abilityType: 'tactical_active', costPaid: false, nameUsedByUnitThisRound: false, repeatable: false, reactionsResolvedThisActivation: 0 });
  activeInputs.forEach((input, n) => add({ id: 'active.' + n, group: 'active_named_limit', input, refs: ['faq-v1:37'],
    question: '只判断费用已付及该具名Active/Tactical Active每轮次数限制；当前单位正激活，其他时机、范围、来源与条件均满足。nameUsedByUnitThisRound只指同名能力，先前其他名称Active的使用不计入。reactionsResolvedThisActivation只记Reaction。此能力能否通过这两项检查？不把局部通过当成整项动作合法。',
    answerShape: { legalWithinNamedLimit: 'boolean' },
    expected: { legalWithinNamedLimit: input.costPaid && (!input.nameUsedByUnitThisRound || input.repeatable) },
    execute: () => { const result = evaluateOfficialFaqF4RuleV1('faq-v1:37', clone(input));
      return { result, answer: { legalWithinNamedLimit: result.legal } }; } }));
  if (new Set(cases.map(row => row.id)).size !== cases.length) fail('FACTION_APPLICATION_CASE_DUPLICATE');
  return Object.freeze({
    manifest: seal({ version: 'faction_rule_application_drills_v1', catalogueHash: catalogue.hash,
      sourceBinding: catalogue.sourceBinding, sourceHashes, kernelHashes, caseHashes: cases.map(row => row.hash),
      cases: cases.length, groups: [...new Set(cases.map(row => row.group))], independentlyHeldOutCases: 0,
      suppliedToProduction: false, sourceCalibratedBeforeScoring: true,
      scope: 'single_surviving_marine_damage_and_scoped_ability_limits_not_complete_action_legality_or_strategy', trainingTruth: false }),
    list(factionRecordKey) {
      if (!FACTIONS.includes(factionRecordKey)) fail('FACTION_APPLICATION_FACTION_UNKNOWN');
      return cases.map(({ id, group, input, question, answerShape, novelty }) => clone({ id, group, input, question, answerShape, novelty }));
    },
    verify(prediction) {
      exact(prediction, ['id', 'answer'], 'FACTION_APPLICATION_PREDICTION_INVALID');
      const index = cases.findIndex(row => row.id === prediction.id), entry = cases[index];
      if (!entry) fail('FACTION_APPLICATION_CASE_UNKNOWN');
      exact(prediction.answer, Object.keys(entry.answerShape), 'FACTION_APPLICATION_ANSWER_INVALID');
      for (const [field, type] of Object.entries(entry.answerShape)) {
        const value = prediction.answer[field];
        if (type === 'boolean' ? typeof value !== 'boolean' : !Number.isSafeInteger(value) || value < 0)
          fail('FACTION_APPLICATION_ANSWER_INVALID');
      }
      return seal({ id: entry.id, group: entry.group, caseHash: entry.hash, prediction,
        passed: hash(prediction.answer) === hash(entry.expected), kernelProofHash: proofs[index].hash,
        novelty: entry.novelty, fullActionLegalityProven: false, strategyStrengthProven: false, trainingTruth: false });
    },
    proof: () => clone(proofs),
  });
}
