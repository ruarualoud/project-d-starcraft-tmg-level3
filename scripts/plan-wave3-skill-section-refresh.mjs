import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {compileFrozenWave3SkillRefreshV1} from '../packages/strategy-skills/wave3-frozen-skill-refresh-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(), output=process.argv[2] ?? 'build/ticket-28-wave3-skill-refresh-v1';
const manifest=JSON.parse(readFileSync(path.join(root,'content/source-releases/wave3-20261125-human-match-v1.json'),'utf8'));
const {impact,pilot}=compileFrozenWave3SkillRefreshV1(root,manifest);
mkdirSync(output,{recursive:true});
for (const [filename,value] of [['section-impact.public.json',impact],['terran-pilot-input.public.json',pilot]]) {
  await atomicWrite(path.join(output,filename),JSON.stringify(value,null,2)+'\n');
}
console.log(JSON.stringify({existingSkills:impact.existingSkills,sections:impact.sectionCount,affected:impact.affected,
  unrepresentedFactions:impact.unrepresentedFactions.length,pilot:pilot.axis}));
