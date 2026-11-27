#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRosterWorkspaceServerV1 } from './serve-ticket-27-slice-271-roster-workspace-v1.mjs';
import { createStarcraftProductRoomHostV1 } from './support/starcraft-product-room-host-v1.mjs';
import { loadWave3HumanMatchSetupsV1, wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';
import { createTicket27RosterRoomProcessHostV1 } from './support/ticket27-roster-room-process-host-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';

import { createSlice249LearningRoomRouterV1 } from './support/slice249-learning-room-router-v1.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function createStarcraftProductServerV1(input) {
  const {dataDirectory,fixtureRoot}=input;
  if (input.offlineWave3MatchVersion && input.wave3MatchSetup &&
      input.wave3MatchSetup.version !== input.offlineWave3MatchVersion) {
    throw Error('PRODUCT_PLANNING_SETUP_VERSION_MISMATCH');
  }
  await mkdir(dataDirectory,{recursive:true,mode:0o700});
  // Room AI obtains only the authenticated player's explicit key. Standalone
  // experiment runners retain their separately configured credential ingress.
  const companion=input.companionProvider||null;
  const host=await createStarcraftProductRoomHostV1({...input,root:ROOT,companionProvider:companion});
  const learning=createSlice249LearningRoomRouterV1({roomHost:host,directory:path.join(dataDirectory,'learning'),
    fixtureRoot,definitions:input.learningDefinitions||[],hostFactory:input.learningHostFactory,
    experimentQuotaStopFile:input.experimentQuotaStopFile});
  const aaHost=createTicket27RosterRoomProcessHostV1({root:ROOT,dataDirectory,fixtureRoot,
    providerInteractionMode:'json_channels_v1',autoDriveOnLaunch:true});
  const secure=input.liveEnabled===false?null:await createRosterPlanningSecureDeliberationFactoryV1({});
  // The offline Standard lobby and its planning workspace share the selected
  // setup and starting recipes. An explicitly configured workspace owns its setup.
  const planningInputs = input.offlineWave3MatchVersion && !input.wave3MatchSetup
    ? host.planningInputsForSetup('wave3-standard-v1') : {};
  const handle=await createRosterWorkspaceServerV1({...input,...planningInputs,
    referenceArmyRecipes:input.referenceArmyRecipes ?? planningInputs.referenceArmyRecipes,
    root:ROOT,lazyWorkspace:true,planningInputsForSetup:host.planningInputsForSetup,
    deliberationFactory:input.deliberationFactory||secure?.factory||null,
    roomLaunchPort:{launch:request=>{
      if(request.matchMode!=='agent_vs_agent') return host.launch(request);
      if(request.setupVersion) throw Error('WAVE3_AGENT_MATCH_RELEASE_REQUIRED');
      return aaHost.launch(request);
    }},
    productHandler:async request=>(await learning.handle(request))??host.handle(request)});
  host.setOrigin(handle.origin);
  return {...handle,host,async close(){await handle.close();await host.close();
    await companion?.close?.();await secure?.close?.();}};
}
async function main(){
  const arg=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
  const wave3Candidate=arg('wave3-match-candidate',null);
  const offline=process.argv.includes('--offline');
  const wave3OnlySetup=offline && wave3Candidate
    ? (await loadWave3HumanMatchSetupsV1(ROOT)).find(setup=>setup.id==='wave3-standard-v1') : null;
  const recovery=wave3OnlySetup ? null : JSON.parse(await readFile(path.join(ROOT,
    'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
  const mapFile=arg('map-configuration-file',recovery?.mapConfigurationFile);
  const mapConfiguration=mapFile ? JSON.parse(await readFile(mapFile,'utf8')) : wave3HumanMapConfiguration(wave3OnlySetup);
  const dataDirectory=path.resolve(arg('data-directory',path.join(ROOT,'build/starcraft-product-v1')));
  const learningFile=arg('learning-config-file',null);
  const learningDefinitions=learningFile?JSON.parse(await readFile(path.resolve(learningFile),'utf8')).definitions:[];
  const handle=await createStarcraftProductServerV1({dataDirectory,learningDefinitions,
    offlineWave3MatchVersion:wave3Candidate,
    webRoot:path.resolve(arg('web-root',path.join(ROOT,'apps/starcraft-tmg-expo/dist-product'))),
    fixtureRoot:arg('fixture-root',recovery?.fixtureRoot ?? ROOT),mapConfiguration,
    port:Number(arg('port','4173')),liveEnabled:!offline});
  const entry={url:handle.origin+'/match',armyUrl:handle.armyUrl,pid:process.pid,
    dataDirectory,liveEnabled:!process.argv.includes('--offline')};
  await writeFile(path.join(dataDirectory,'service.json'),JSON.stringify(entry)+'\n',{mode:0o600});
  console.log(JSON.stringify(entry));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void handle.close().finally(()=>process.exit(0)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
