import { readFile } from "node:fs/promises";
import { evaluateOfficialFaqF3RuleV1 as f3 } from "../rule-atoms/official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs";
import { evaluateOfficialFaqF4RuleV1 as f4 } from "../rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs";
import { evaluateOfficialFaqF5RuleV1 as f5 } from "../rule-atoms/official-faq-f5-attack-scoring-template-kernel-v1.mjs";
import { CHAPTERS } from "./evidence.mjs";
import { hash, sha256, seal, clone, fail, verifySeal } from "./common.mjs";

const KERNELS = ["official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs",
  "official-faq-f4-ability-tactical-keyword-kernel-v1.mjs", "official-faq-f5-attack-scoring-template-kernel-v1.mjs"];
const evaluate = (entryId, input) => {
  const n = Number(entryId.split(":")[1]);
  return (n >= 5 && n <= 27 ? f3 : n >= 34 && n <= 59 || n === 64 ? f4 : f5)(entryId, clone(input));
};

// Expected values are source-reviewed fixtures, not computed by the kernel
// being tested. These are bounded mechanics drills, not full-game evidence.
function casesFor(chapter, split) {
  const h = split === "heldout";
  const ids = h ? ["map-b-wall-x", "map-b-wall-y"] : ["map-a-wall-x", "map-a-wall-y"];
  const value = h ? 7 : 3;
  return (['abilities', 'exceptions'].includes(chapter) ? [0, 1] : [0, 1, 2, 3]).map((i) => {
    const yes = i % 2 === 0;
    let entry, input, expected;
    switch (chapter) {
      case "setup":
        entry = 17; input = { candidateCardInstanceId: ids[0], candidateCardName: "same-name",
          blockedCardInstanceIds: yes ? [ids[1]] : [ids[0]], blockedCardNames: i < 2 ? ["same-name"] : [] };
        expected = { legal: yes, "values.cardNameBlockIgnored": true }; break;
      case "round":
        entry = 37; input = { abilityType: i < 2 ? "active" : "reaction", costPaid: !h,
          nameUsedByUnitThisRound: !yes, repeatable: false, reactionsResolvedThisActivation: yes ? 0 : 1 };
        expected = { legal: !h && yes }; break;
      case "movement":
        entry = 6; input = { gapBoundaryKinds: ["model", "terrain"],
          gapWidth: i < 2 ? yes ? 1 : h ? 0.5 : 0.99 : yes ? 3 : h ? 2 : 2.99,
          modelSize: i < 2 ? h ? 1 : 2 : h ? 4 : 3 };
        expected = { legal: yes }; break;
      case "assault":
        entry = 31; input = { allModelsInEnemyBaseContact: i === 3,
          leadingStartDistance: value, leadingEndDistance: yes ? value - (i === 0 ? 1 : 2) : value };
        expected = { legal: yes }; break;
      case "combat":
        entry = 28; input = { armourDamage: value + i, surgeDamage: i };
        expected = { legal: true, "values.evadeInputDamagePool": value + 2 * i }; break;
      case "terrain":
        entry = 15; input = { traceCrossesTerrainId: ids[0], proximityTerrainId: i === 1 ? ids[1] : ids[0],
          distanceToAnyPart: i === 3 ? h ? 1.5 : 1.01 : i === 2 ? 1 : h ? 0.1 : 0.5 };
        expected = { legal: true, "values.directCover": yes }; break;
      case "abilities":
        entry = 35; input = { sourceUnitId: ids[0], subjectUnitId: yes ? ids[0] : ids[1], explicitSelfExclusion: h };
        expected = { legal: true, "values.withinRange": yes && !h }; break;
      case "tokens":
        entry = 1; input = { firstModelHitPoints: value, shieldValue: i, totalDamage: value + i, heal: i * 2 };
        expected = { legal: true, "values.firstModelCombinedHitPoints": value + i,
          "values.totalDamageAfterHeal": Math.max(0, value - i) }; break;
      case "scoring":
        entry = 16; input = { markerOnBattlefield: !h, markerFace: i < 2 ? "deactivated" : "activated", normalControlEligible: yes };
        expected = { legal: true, "values.controlled": !h && yes }; break;
      case "exceptions":
        entry = 4; input = { unitDestroyed: !h, explicitReturnPermission: yes };
        expected = { legal: h || yes, "values.returnToPlayAllowed": h || yes }; break;
      default: fail("PROBE_CHAPTER_UNKNOWN");
    }
    return seal({ id: `${split}.${chapter}.${i + 1}`, chapterId: chapter, split,
      entryId: `faq-v1:${String(entry).padStart(2, "0")}`, input, expected,
      scope: "faq_mechanics_drill_not_complete_game", fixtureFamily: `${split}.${chapter}` });
  });
}

export async function createMechanicsVerifier(catalogue) {
  verifySeal(catalogue);
  const kernelHashes = await Promise.all(KERNELS.map(async (name) => ({ name,
    hash: sha256(await readFile(new URL(`../rule-atoms/${name}`, import.meta.url))) })));
  const cases = CHAPTERS.flatMap((chapter) => ["development", "heldout"].flatMap((split) => casesFor(chapter.id, split)));
  const byId = new Map(cases.map((test) => [test.id, test]));
  const sourceById = new Map(catalogue.rows.map((row) => [row.id, row]));
  const executions = [];
  function run(id, { allowHeldout = false } = {}) {
    const test = byId.get(id);
    if (!test || test.split === "heldout" && !allowHeldout) fail("PROBE_NOT_AVAILABLE");
    const source = sourceById.get(test.entryId);
    if (!source?.executable || source.currentRulesReceiptHash !== catalogue.sourceBinding.rules) fail("PROBE_SOURCE_UNVERIFIED");
    const observed = evaluate(test.entryId, test.input);
    const repeated = evaluate(test.entryId, test.input);
    const checks = Object.entries(test.expected).map(([field, expected]) => ({ field, expected,
      actual: field.split(".").reduce((value, key) => value?.[key], observed) }));
    const passed = checks.every((row) => row.actual !== undefined && hash(row.actual) === hash(row.expected)) && hash(observed) === hash(repeated);
    const receipt = seal({ id, fixtureHash: test.hash, kernelHashes, sourceRef: source.hash,
      currentRulesReceiptHash: catalogue.sourceBinding.rules, inputHash: hash(test.input),
      observed, checks, determinismReplayPassed: hash(observed) === hash(repeated), passed,
      executionKind: "actual_current_rules_kernel_twice", roomReplayPerformed: false, trainingTruth: false });
    executions.push(receipt);
    return receipt;
  }
  function verifyPrediction(id, prediction, options) {
    const receipt = run(id, options);
    const keys = Object.keys(byId.get(id).expected);
    const valid = prediction && typeof prediction === "object" && !Array.isArray(prediction)
      && Object.keys(prediction).length === keys.length && keys.every((key) => Object.hasOwn(prediction, key));
    return seal({ id, executionReceiptHash: receipt.hash,
      passed: receipt.passed && !!valid && receipt.checks.every((check) => hash(prediction[check.field]) === hash(check.actual)),
      predictionHash: hash(prediction ?? null), trainingTruth: false });
  }
  function list(chapterId, split = "development", { includeExpected = false } = {}) {
    return cases.filter((test) => test.chapterId === chapterId && test.split === split).map((test) => ({
      id: test.id, entryId: test.entryId, input: clone(test.input), answerFields: Object.keys(test.expected),
      ...(includeExpected ? { expected: clone(test.expected) } : {}),
    }));
  }
  function replayJournal(journal) {
    if (!Array.isArray(journal) || !journal.length) fail("REPLAY_JOURNAL_REQUIRED");
    const results = journal.map((prior) => {
      verifySeal(prior);
      if (prior.currentRulesReceiptHash !== catalogue.sourceBinding.rules
        || hash(prior.kernelHashes) !== hash(kernelHashes)) fail("REPLAY_DEPENDENCY_UNAVAILABLE");
      const current = run(prior.id, { allowHeldout: true });
      if (current.fixtureHash !== prior.fixtureHash || current.inputHash !== prior.inputHash
        || current.sourceRef !== prior.sourceRef || hash(current.observed) !== hash(prior.observed)) fail("REPLAY_RESULT_MISMATCH");
      return { priorHash: prior.hash, replayHash: current.hash, passed: current.passed };
    });
    return seal({ results, passed: results.every((r) => r.passed), receiptCount: results.length,
      replayKind: "serialized_mechanics_journal_in_new_verifier", roomReplayPerformed: false, trainingTruth: false });
  }
  return Object.freeze({ run, list, verifyPrediction, replayJournal, trace: () => clone(executions),
    manifest: seal({ kernelHashes, fixtureHashes: cases.map((test) => test.hash),
      developmentCases: cases.filter((row) => row.split === 'development').length,
      heldoutCases: cases.filter((row) => row.split === 'heldout').length,
      scope: "mechanics_only_not_strategy_or_complete_game", trainingTruth: false }) });
}
