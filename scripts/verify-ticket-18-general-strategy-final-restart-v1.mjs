import path from 'node:path';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { fail, hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from '../packages/online-agent-session/portable-credential-material-v1.mjs';
import { gradeStrategyDecisionV1 } from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { loadOrCreateFinalStrategyCaseCorpusV1 } from './support/strategy-final-case-corpus-v1.mjs';
import { ROOT, DB_PATH, json } from './support/strategy-live-production-support-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';

const RUN_ID = 'general-final-last-cc0f7f72536b8169b8d1';
const baseRelative = `build/ticket-18-general-strategy-live-v1/${PARENT_RUN}/general-strategy-final-v1/`;
const runRelative = baseRelative + RUN_ID + '/';
const [recipe, report, continuation, input, corpus, result, skill, layer, router,
  sourceAuditBundle, completion, previousInput] = await Promise.all([
  json(runRelative + 'recipe.json'), json(runRelative + 'report.json'),
  json(runRelative + 'continuation-manifest.json'), json(runRelative + 'production-input.json'),
  json(runRelative + 'case-corpus.json'), json(runRelative + 'finalization-result.json'),
  json(runRelative + 'general-skill.json'), json(runRelative + 'general-strategy-layer.json'),
  json(runRelative + 'router-manifest.json'), json(runRelative + 'source-audits.json'),
  json(baseRelative + 'evidence-metadata-correction-v1/parent-completion.json'),
  json(`build/ticket-18-general-strategy-live-v1/${PARENT_RUN}/production-input.json`),
]);
if (report.failure || !report.formalGeneralSkillCompleted || report.sourceAxesAccepted.length !== 7
  || report.sourceFieldsAccepted !== 77 || report.caseResults !== 17
  || report.developmentResults !== 10 || report.heldoutResults !== 7 || !report.decisionCasesPassed
  || report.runtimeAccepted || report.published || report.humanReviewed || report.canAffectRules
  || report.completeGameStrategyEffectivenessProven || report.sourceRefreshPerformed
  || report.additionalCalls !== 1 || report.automaticProviderRetries !== 0) fail('GENERAL_FINAL_RESTART_REPORT_INVALID');
if (recipe.hash !== report.recipeHash || report.resultHash !== result.hash || report.skillHash !== skill.hash
  || result.skill.hash !== skill.hash || result.layer.hash !== layer.hash
  || result.routerManifest.hash !== router.hash
  || completion.reportHash !== report.hash || completion.skillHash !== skill.hash
  || completion.strategyLayerHash !== layer.hash || completion.routerManifestHash !== router.hash
  || completion.formalGeneralSkillCompleted !== true) fail('GENERAL_FINAL_RESTART_ARTIFACT_CHAIN_INVALID');
if (skill.schema !== 'project_d_game_skill_v1' || skill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
  || skill.skillType !== 'strategy' || skill.status !== 'replay_passed'
  || skill.trustTier !== 'replay_passed_offline_candidate' || skill.procedure.length !== 7
  || !skill.canAffectStrategy || skill.canAffectRules || skill.runtimeAccepted || skill.published
  || layer.status !== 'offline_strategy_candidate' || !layer.assessment.sourceReviewPassed
  || !layer.assessment.decisionCasesPassed || layer.assessment.strategyEffectivenessProven
  || router.runtimeLoads.length || router.offlineProductionLoads.length !== 1
  || router.offlineProductionLoads[0] !== skill.hash || router.legalityAuthority !== 'rules_service_only') {
  fail('GENERAL_FINAL_RESTART_SCOPE_INVALID');
}
const sourceByRef = new Map(input.workspace.fullFrozenSources.sources.map(source => [source.ref, source]));
for (const audit of sourceAuditBundle.sourceAudits) {
  verifySeal(audit);
  if (!audit.sourceReviewPassed || audit.checkedFields.length !== 11 || audit.runtimeAccepted
    || audit.canAffectRules) fail('GENERAL_FINAL_RESTART_SOURCE_AUDIT_INVALID');
  for (const bound of audit.boundSources) {
    verifySeal(bound); const source = sourceByRef.get(bound.ref);
    if (!source || bound.sourceHash !== hash(source)) fail('GENERAL_FINAL_RESTART_SOURCE_HASH_DRIFT');
    for (const passage of bound.passages) {
      const actual = source.passages.find(row => row.spanId === passage.spanId);
      if (!actual || passage.textHash !== hash(actual.text)) fail('GENERAL_FINAL_RESTART_PASSAGE_HASH_DRIFT');
    }
  }
}
const byCase = new Map(corpus.cases.map(compiled => [compiled.prompt.caseId, compiled]));
const splits = new Map();
for (const caseResult of result.caseResults) {
  verifySeal(caseResult); verifySeal(caseResult.artifact); verifySeal(caseResult.grade);
  const compiled = byCase.get(caseResult.caseId);
  if (!compiled || caseResult.caseHash !== compiled.hash || !caseResult.rulesReplayPassed) {
    fail('GENERAL_FINAL_RESTART_CASE_BINDING_INVALID');
  }
  const regraded = gradeStrategyDecisionV1(compiled, caseResult.artifact.value);
  if (regraded.hash !== caseResult.grade.hash || !regraded.decisionPreferencePassed) {
    fail('GENERAL_FINAL_RESTART_CASE_REGRADE_FAILED');
  }
  const counts = splits.get(caseResult.axis) || { development: 0, heldout: 0 };
  counts[caseResult.evaluationSplit] += 1; splits.set(caseResult.axis, counts);
}
if ([...splits.values()].length !== 7
  || [...splits.values()].some(counts => counts.development < 1 || counts.heldout < 1)) {
  fail('GENERAL_FINAL_RESTART_AXIS_CASE_DENOMINATOR_INVALID');
}
const caseFiles = (await readdir(path.join(ROOT, runRelative, 'case-results'))).filter(file => file.endsWith('.json'));
if (caseFiles.length !== 17) fail('GENERAL_FINAL_RESTART_CASE_FILE_DENOMINATOR_INVALID');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
try {
  const stored = db.prepare('SELECT recipe FROM runs WHERE id=?').get(RUN_ID);
  const attempts = db.prepare('SELECT state,code FROM attempts WHERE run=?').all(RUN_ID);
  const running = db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(RUN_ID).n;
  if (stored?.recipe !== recipe.hash || attempts.length !== 1 || attempts[0].state !== 'received'
    || attempts[0].code !== null || running !== 0) fail('GENERAL_FINAL_RESTART_JOURNAL_INVALID');
} finally { db.close(); }
for (const row of recipe.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) {
  fail('GENERAL_FINAL_RESTART_CODE_DRIFT', { file: row.file });
}
const temp = await mkdtemp(path.join(tmpdir(), 'general-final-replay-'));
let rebuilt;
try {
  rebuilt = await loadOrCreateFinalStrategyCaseCorpusV1({ root: ROOT, previousInput,
    outputPath: path.join(temp, 'case-corpus.json') });
} finally { await rm(temp, { recursive: true, force: true }); }
const semanticCase = compiled => ({ caseId: compiled.prompt.caseId, familyId: compiled.prompt.familyId,
  provenance: compiled.prompt.provenance, reachableFromMatchStartProven: compiled.prompt.reachableFromMatchStartProven,
  seatKey: compiled.prompt.seatKey, binding: {
    sourceBinding: compiled.prompt.binding.sourceBinding, snapshotHash: compiled.prompt.binding.snapshotHash,
    gameplayDataBundleHash: compiled.prompt.binding.gameplayDataBundleHash,
    runtimeHash: compiled.prompt.binding.runtimeHash, catalogueHash: compiled.prompt.binding.catalogueHash,
    stateHash: compiled.prompt.binding.stateHash, stateRevision: compiled.prompt.binding.stateRevision,
  }, runtimeCoverage: compiled.prompt.runtimeCoverage, observation: compiled.prompt.observation,
  objective: compiled.prompt.objective, policyAxes: compiled.prompt.policyAxes,
  candidates: compiled.prompt.candidates, searchScope: compiled.prompt.searchScope,
  split: compiled.evaluation.split, outcomes: compiled.evaluation.outcomes.map(outcome => ({
    candidateId: outcome.candidateId, vector: outcome.vector, after: outcome.after,
    preStateHash: outcome.preStateHash, postStateHash: outcome.postStateHash,
    replayPassed: outcome.replayPassed, confirmationPolicy: outcome.confirmationPolicy,
  })), preferredCandidateIds: compiled.evaluation.preferredCandidateIds,
  preferenceBasis: compiled.evaluation.preferenceBasis,
  fullGameEvidence: compiled.evaluation.fullGameEvidence,
  strategyEffectivenessProven: compiled.evaluation.strategyEffectivenessProven });
const semanticReplayHashes = corpus.cases.map((row, index) => ({ caseId: row.prompt.caseId,
  frozenHash: hash(semanticCase(row)), restartedHash: hash(semanticCase(rebuilt.cases[index])) }));
// Referee keys and control-lease IDs are intentionally fresh after restart, so
// cryptographic receipt bytes differ. Rules inputs, projections, state hashes,
// outcome vectors, preference labels and replay results must remain identical.
if (rebuilt.binding.hash !== corpus.binding.hash
  || semanticReplayHashes.some(row => row.frozenHash !== row.restartedHash)) {
  fail('GENERAL_FINAL_RESTART_RULE_REPLAY_DRIFT');
}
const finalMarkdown = await readFile(path.join(ROOT, runRelative, 'general-skill.md'), 'utf8');
if (!axesPresent(finalMarkdown, skill.procedure.map(row => row.axis))
  || containsStarcraftTmgOnlineCredentialMaterialV1({ skill, layer, router, completion, finalMarkdown })) {
  fail('GENERAL_FINAL_RESTART_READABLE_OR_REDACTION_INVALID');
}
function axesPresent(markdown, axes) { return axes.every(axis => markdown.includes(`（${axis}）`)); }
const receipt = seal({ schema: 'ticket18_general_strategy_final_restart_verification_v1',
  ticket: 18, slice: 174, runId: RUN_ID, recipeHash: recipe.hash, reportHash: report.hash,
  completionHash: completion.hash, skillHash: skill.hash, strategyLayerHash: layer.hash,
  sourceAxes: 7, sourceFields: 77, decisionCases: 17, developmentResults: 10, heldoutResults: 7,
  freshlyRecompiledAndReplayedCases: rebuilt.cases.length,
  semanticReplayHashes, freshCryptoReceiptsExpectedToDiffer: true,
  allDecisionArtifactsRegraded: true, sourceSpansRehashed: true, journalTerminal: true,
  codeHashesCurrent: true, sensitiveMaterialFound: false, providerCalls: 0,
  runtimeAccepted: false, published: false, trainingTruth: false });
await mkdir(path.join(ROOT, baseRelative), { recursive: true });
await writeFile(path.join(ROOT, baseRelative, 'final-restart-verification.json'), JSON.stringify(receipt, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, sourceAxes: 7, sourceFields: 77,
  cases: 17, development: 10, heldout: 7, freshlyReplayed: rebuilt.cases.length,
  providerCalls: 0, cumulativeTokens: report.cumulative.cumulativeTokens,
  cumulativeCny: report.cumulative.cumulativeEstimateMicros / 1e6,
  skillHash: skill.hash, receiptHash: receipt.hash }));
