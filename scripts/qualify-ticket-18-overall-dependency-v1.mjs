import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualifyOverallProductionDependencyV1 } from '../packages/skill-evaluation/overall-production-dependency-v1.mjs';
import { renderOverallRulesCandidateV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { seal, verifySeal, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const runId = process.argv[2];
if (process.argv.length !== 3 || !/^guide-repair-[a-f0-9]{20}$/.test(runId || '')) fail('OVERALL_QUALIFICATION_ARGUMENTS_INVALID');
const json = async (run, name) => verifySeal(JSON.parse(await readFile(path.join(base, run, name + '.json'), 'utf8')));
const recipe = await json(runId, 'recipe'), report = await json(runId, 'report');
if (recipe.version !== 'guide_local_repair_and_evaluation_v1' || runId !== 'guide-repair-' + recipe.hash.slice(0, 20)
  || report.recipeHash !== recipe.hash || report.failure || !report.passed
  || !/^overall-repair-[a-f0-9]{20}$/.test(recipe.baseRunId)) fail('OVERALL_QUALIFICATION_RUN_NOT_PASSED');
const inspect = async (script, run) => {
  const r = await promisify(execFile)(process.execPath, [path.join(root, 'scripts', script), run],
    { cwd: root, timeout: 240000, maxBuffer: 64 * 1024 });
  const result = JSON.parse(r.stdout.trim());
  if (!result.evidenceVerified) fail('OVERALL_QUALIFICATION_UNVERIFIED');
  return result;
};
// Raw base score remains its original failing result. The new guide+base is
// evaluated as a distinct composition, never an overwrite of that score.
const [baseProof, guideProof] = await Promise.all([
  inspect('inspect-ticket-18-complete-repair-evidence-v1.mjs', recipe.baseRunId),
  inspect('inspect-ticket-18-guide-local-repair-evidence-v1.mjs', runId),
]);
const candidate = await json(recipe.baseRunId, 'overall-rules-candidate');
const evaluation = await json(runId, 'actual-guided-evaluation'), deliveryEvidence = await json(runId, 'verified-guide-repair-evidence');
if (guideProof.hash !== deliveryEvidence.hash || !guideProof.qualityPassed || report.resultHash !== evaluation.hash) fail('OVERALL_QUALIFICATION_PROOF_DRIFT');
const dependency = qualifyOverallProductionDependencyV1({ candidate, evaluation, deliveryEvidence });
const receipt = seal({ schema: 'starcraft_overall_dependency_qualification_receipt_v1', runId,
  dependencyHash: dependency.hash, candidateHash: candidate.hash, baseEvidenceHash: baseProof.hash,
  guideEvidenceHash: guideProof.hash, providerCalls: 0, sourceRefreshPerformed: false,
  offlineGenerationQualified: true, formalSkillsAccepted: 0, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'overall-production-dependency.json'), JSON.stringify(dependency, null, 2));
await writeFile(path.join(base, runId, 'overall-dependency-qualification.json'), JSON.stringify(receipt, null, 2));
const markdown = renderOverallRulesCandidateV3(candidate) + '\n## 独立答题验证后的操作指引\n\n'
  + evaluation.guide.lessons.map(l => '### ' + l.id + '\n\n' + l.procedure.map(s => '- ' + s).join('\n')
    + '\n\n来源：' + l.sourceRefs.join('；')).join('\n\n')
  + '\n\n此组合仅通过离线种族/对抗生产依赖门，不代表实际对战或策略效果已验收。\n';
await writeFile(path.join(base, runId, 'overall-rules-with-guide.md'), markdown);
console.log(JSON.stringify({ offlineGenerationQualified: true, dependencyHash: dependency.hash, receiptHash: receipt.hash,
  sourceControls: 22, developmentCases: 105, repeatedIndependentCases: 30, providerCalls: 0, formalSkillsAccepted: 0 }));
