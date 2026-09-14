import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, hash, seal, sha256, verifySeal } from '../../packages/skill-production/common.mjs';
import { createStrategyCaseCompilerV1, partitionStrategyCasesV1 } from '../../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { prepareStrategyProductionInputV1 } from '../../packages/strategy-skills/strategy-production-input-v1.mjs';
import { loadStrategyCaseFixtureV1 } from './strategy-case-fixture-v1.mjs';

// Authority signatures, MatchBinding and leases intentionally use fresh keys.
// Freeze the ACTUAL executed corpus once. Never reconstruct its cryptographic
// identity on restart, remove signatures, or compare only a weakened hash.
export async function loadOrCreateStrategyProductionCorpusV1({ root, baseInput, outputPath }) {
  verifySeal(baseInput);
  const codeFiles = ['scripts/support/strategy-production-corpus-v1.mjs', 'scripts/support/strategy-case-fixture-v1.mjs',
    'packages/strategy-skills/strategy-case-compiler-v1.mjs', 'packages/strategy-skills/strategy-production-input-v1.mjs',
    'packages/rule-atoms/official-strategy-case-runtime-v1.mjs'];
  const binding = seal({ baseInputHash: baseInput.hash, sourceBinding: baseInput.contract.sourceBinding,
    codeHashes: await Promise.all(codeFiles.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
  function verify(corpus) {
    verifySeal(corpus); verifySeal(corpus.input); verifySeal(corpus.binding);
    if (corpus.binding.hash !== binding.hash) fail('STRATEGY_FROZEN_CORPUS_BINDING_DRIFT');
    const { development, heldout } = partitionStrategyCasesV1(corpus.cases);
    if (hash(development.map(c => c.hash)) !== hash(corpus.input.evaluationManifest.developmentCaseHashes)
      || hash(heldout.map(c => c.hash)) !== hash(corpus.input.evaluationManifest.heldoutCaseHashes)
      || hash(development.map(c => c.prompt)) !== hash(corpus.input.workspace.developmentCases)
      || corpus.input.contract.hash !== baseInput.contract.hash) fail('STRATEGY_FROZEN_CORPUS_INPUT_DRIFT');
    return corpus;
  }
  try { return verify(JSON.parse(await readFile(outputPath, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = await loadStrategyCaseFixtureV1(root, { currentRuntime: true });
  const compiler = createStrategyCaseCompilerV1(fixture.compilerOptions);
  const cases = [compiler.compile(fixture.specification()),
    compiler.compile(fixture.specification({ caseId: 'movement.far', targetX: 12 })),
    compiler.compile(fixture.specification({ caseId: 'movement.heldout-control', targetX: 12,
      yInches: 13, split: 'heldout', familyId: 'movement-private' })),
    compiler.compile(fixture.initiativeSpecification()),
    compiler.compile(fixture.initiativeSpecification({ caseId: 'tempo.respond', firstActor: 'player2' }))];
  const input = prepareStrategyProductionInputV1({ frozenInput: fixture.frozenInput,
    scope: baseInput.contract.scope, cases, seed: baseInput.workspace.conditionalStrategySeed });
  const corpus = verify(seal({ schema: 'strategy_production_frozen_case_corpus_v1', binding, cases, input,
    lifecycle: 'compile_execute_replay_once_then_reuse_exact_signed_artifacts',
    separateFromEarlierTestCorpus: true, containsPrivateHeldout: true, runtimeAccepted: false, trainingTruth: false }));
  await mkdir(path.dirname(outputPath), { recursive: true });
  try { await writeFile(outputPath, JSON.stringify(corpus, null, 2), { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return verify(JSON.parse(await readFile(outputPath, 'utf8')));
  }
  return corpus;
}
