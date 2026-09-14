import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySeal, seal, sha256 }
  from '../packages/skill-production/common.mjs';
import { finalizeExtraFactionSkillV1, renderFinalExtraFactionSkillV1 }
  from '../packages/strategy-skills/extra-faction-finalization-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(root, 'build/ticket-18-extra-faction-v1');
const content = path.join(root, 'content/strategy-skills/ticket-18-foundational-v1');
const definitions = [
  { id: 'daelaam', run: 'extra-faction-v5-876b180199cdf53f8bb6' },
  { id: 'kerrigan_s_swarm', run: 'extra-faction-v6-9208f4ab2980e290b9bf' },
];
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const put = async (file, value, raw = false) => {
  const encoded = raw ? value : JSON.stringify(value, null, 2);
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST' || await readFile(file, 'utf8') !== encoded) throw error;
  }
};
const results = [];
for (const definition of definitions) {
  const input = await json(path.join(build, `${definition.id}-input.json`));
  const production = await json(path.join(build, definition.run,
    definition.id, 'candidate.json'));
  const result = finalizeExtraFactionSkillV1({ input, production });
  results.push(result);
  await put(path.join(build, 'formal', `${definition.id}-finalization.json`), result);
  await put(path.join(build, 'formal', `${definition.id}.md`),
    renderFinalExtraFactionSkillV1(result), true);
  await put(path.join(content, 'skills', `faction-${definition.id}.json`), result.skill);
  await put(path.join(content, 'qualifications', `faction-${definition.id}.json`), result);
}
const files = [
  'packages/strategy-skills/extra-faction-finalization-v1.mjs',
  'scripts/finalize-ticket-18-extra-faction-skills-v1.mjs',
];
const report = seal({ schema: 'ticket18_extra_faction_finalization_report_v1',
  ticket: 18, slice: 183, passed: true,
  skills: results.map(result => ({ skillId: result.skill.skillId,
    skillHash: result.skill.hash, sourceAxes: result.sourceAudit.axesChecked,
    sourceFields: result.sourceAudit.fieldsChecked,
    realDecisionCases: result.realDecisionCases })),
  formalSkillsAccepted: results.length,
  totalSourceAxes: results.reduce((sum, result) =>
    sum + result.sourceAudit.axesChecked, 0),
  totalSourceFields: results.reduce((sum, result) =>
    sum + result.sourceAudit.fieldsChecked, 0),
  realDecisionCases: 0,
  providerCalls: 0, sourceRefreshPerformed: false,
  codeHashes: await Promise.all(files.map(async file => ({ file,
    hash: sha256(await readFile(path.join(root, file))) }))),
  runtimeAccepted: false, trainingTruth: false });
await put(path.join(build, 'formal', 'report.json'), report);
console.log(JSON.stringify(report));
