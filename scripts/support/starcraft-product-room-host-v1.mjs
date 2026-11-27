import {createHumanRosterLobby} from './human-roster-lobby-v1.mjs';
import { loadWave3MatchBoardFactoryV1, loadWave3HumanMatchSetupsV1, openWave3HumanMatch, wave3HumanMapConfiguration } from '../../packages/product-composition/wave3-human-match-v1.mjs';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createTicket20HumanAgentDemoFixtureV1 } from './ticket20-human-agent-demo-fixture-v1.mjs';
import { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } from '../../packages/http-adapter/handler-v1.mjs';
import { createStarcraftTmgRefereeCrypto } from '../../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgPrivatePayloadCodec } from '../../packages/room-store/room-store-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from '../../packages/room-store/sqlite-room-store-v1.mjs';
import { createSqliteStarcraftTmgHostedBotSeatStoreV1 } from '../../packages/online-agent-session/sqlite-hosted-bot-seat-store-v1.mjs';
import { createSqliteStarcraftTmgMatchDecisionJournalV1 } from '../../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs';
import { createStarcraftTmgLiveOpponentProviderStackV1 } from '../../packages/online-agent-session/live-opponent-provider-stack-v1.mjs';
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 } from '../../content/provider/ticket-23-live-provider-profiles-v1.mjs';
import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 } from '../../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createStarcraftTmgCompanionProductModuleV1, companionProductPackageInputFromCatalogueEntryV1,
  companionPortraitAssetCatalogV1, companionPortraitPresentationAssetsV1, STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX } from '../../packages/product-composition/index.mjs';
import { createSqliteCompanionPersistenceAdapter } from '../../packages/companion-backend-module-v1/index.mjs';
import { COMPANION_CATALOGUE_V1 } from '../../content/characters/companion-catalogue-v1.mjs';
import { STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX, STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION } from '../../packages/client-domain/hosted-bot-seat-transport-v1.mjs';
import { createOfficialCompetitiveMapConfiguratorV1 } from '../../packages/product-composition/official-competitive-map-configurator-v1.mjs';
import { createProductRoomCredentialsV1 } from '../../packages/secure-provider-runtime/product-room-credentials-v1.mjs';
import { createProductCompanionLiveProviderV1 } from '../../packages/secure-provider-runtime/companion-live-provider-v1.mjs';

export const PRODUCT_PREFIX = '/starcraft-tmg-level3/product/v1';
const clone = value => structuredClone(value);
const fail = reason => { throw Object.assign(new Error(reason), { code: reason }); };
const response = (value, status=200) => ({status, response:value});
const bearer = headers => String(headers?.authorization || '').replace(/^Bearer /u,'');
async function save(file, value) {
  await writeFile(file+'.pending', JSON.stringify(value)+'\n', {mode:0o600});
  await rename(file+'.pending',file);
}

// Browser choices only: source identity, costs and legality stay Host/Native-owned.
export function manualArmyRecipeV1(army, catalogue, sideKey, minerals = 2000, {savedUpgradeNames=false}={}) {
  if (!army || Number(army.mineralsLimit)!==minerals)
    fail('军表规模必须与开局的 '+minerals+' 分一致。');
  const faction=catalogue.cards.find(c=>c.id===army.factionCardId && c.isFactionCard);
  if(!faction) fail('请选择势力卡。');
  const keys=(army.tacticalCardIds||[]).map(id=>{
    const card=catalogue.cards.find(c=>c.id===id && !c.isFactionCard);
    if(!card) fail('军表含未知战术卡，请重新选择。');
    return 'tactical_cards:'+card.id;
  });
  if(!Array.isArray(army.roster)||!army.roster.length) fail('请先添加单位。');
  const units=army.roster.map((choice,index)=>{
    const unit=catalogue.units.find(u=>u.id===choice.unitId);
    if(!unit || !['small','large'].includes(choice.size)) fail('单位或规模无效。');
    const upgradeNames=(choice.activeUpgrades||[]).map(i=>{
      const name=savedUpgradeNames ? choice.availableUpgrades?.[i]?.name : unit.upgrades[i]?.name;
      if(!Number.isSafeInteger(i)||!name||!unit.upgrades.some(upgrade=>upgrade.name===name)) fail('升级选择已失效，请重新选择。');
      return name;
    });
    return {unitInstanceId:sideKey+'-unit-'+(index+1),recordKey:'army_units:'+unit.id,
      compositionKind:choice.size,upgradeNames};
  });
  return {factionRecordKey:'tactical_cards:'+faction.id,tacticalCardRecordKeys:keys,units};
}

export async function createStarcraftProductRoomHostV1(input) {
  const {root,fixtureRoot,dataDirectory,mapConfiguration,companionProvider=null}=input;
  const catalogue=JSON.parse(await readFile(path.join(root,'apps/starcraft-tmg-expo/assets/data/official-product-catalogue-v1.json'),'utf8'));
  const savedSetups = await loadWave3HumanMatchSetupsV1(root);
  const releaseDatasets = new Map(await Promise.all([...new Set(savedSetups.map(setup => setup.releaseRef))].map(async ref => {
    const manifest = JSON.parse(await readFile(path.join(root,ref),'utf8'));
    return [ref,manifest.source.datasetHash];
  })));
  const version=input.offlineWave3MatchVersion;
  if(version && (!['2.99.0','2.99.1','2.99.2','2.99.11','2.99.12'].includes(version) || input.liveEnabled!==false)) fail('PRODUCT_SETUP_OFFLINE_CANDIDATE_REQUIRED');
  const releaseSetups=version ? savedSetups.map(setup=>({...setup,version})) : savedSetups;
  const roomsDirectory=path.join(dataDirectory,'rooms');
  await mkdir(roomsDirectory,{recursive:true,mode:0o700});
  const live=new Map(), opening=new Map(), launches=new Map();
  const baseAdapter=createStarcraftTmgLevel3HttpAdapter({assetRoot:root,
    mapConfigurationPort:createOfficialCompetitiveMapConfiguratorV1()});
  const providerFactory=input.providerFactory||createStarcraftTmgLiveOpponentProviderStackV1;
  const packages=COMPANION_CATALOGUE_V1.entries.map(entry=>companionProductPackageInputFromCatalogueEntryV1(entry,{
    presentationAssets:companionPortraitPresentationAssetsV1(entry.characterId)}));
  let origin='';
  function publicRecord(record) {
    return {roomId:record.roomId,title:record.title,matchMode:record.matchMode,
      createdAt:record.createdAt,planHash:record.planHash||null,mapName:record.mapConfiguration.seedId,
      ...(record.releaseSetup ? {setupId:record.releaseSetup.id,scale:record.releaseSetup.scale,
        missionRecordKey:record.releaseSetup.missionRecordKey,deploymentRecordKey:record.releaseSetup.deploymentRecordKey} : {}),
      trainingTruth:false};
  }
  async function open(record) {
    if(live.has(record.roomId)) return live.get(record.roomId);
    if(opening.has(record.roomId)) return opening.get(record.roomId);
    const job=(async()=>{
      const directory=path.join(roomsDirectory,record.roomId), file=path.join(directory,'room.private.json');
      const privatePayloadCodec=createStarcraftTmgPrivatePayloadCodec({key:record.storeKey,
        keyId:record.roomId+'-store',trustLevel:'development_persistent'});
      const refereeCrypto=createStarcraftTmgRefereeCrypto({privateKey:record.privateKey,
        publicKey:record.publicKey,hmacSecret:record.hmacSecret,keyId:record.roomId+'-referee',
        trustLevel:'development_persistent'});
      const roomStore=createSqliteStarcraftTmgRoomStore({filename:path.join(directory,'room.sqlite'),privatePayloadCodec});
      const botStore=createSqliteStarcraftTmgHostedBotSeatStoreV1({filename:path.join(directory,'bot.sqlite')});
      const journal=createSqliteStarcraftTmgMatchDecisionJournalV1({filename:path.join(directory,'memory.sqlite')});
      try {
      let startingAI=null, aiAttached=false;
      const userKeys=createProductRoomCredentialsV1();
      const companionFactory=input.companionProviderFactory||createProductCompanionLiveProviderV1;
      const fixture=record.releaseSetup
        ? await openWave3HumanMatch({root,record,roomStore,refereeCrypto})
        : await createTicket20HumanAgentDemoFixtureV1({root:fixtureRoot,
        roomId:record.roomId,title:record.title,surfaceMode:record.matchMode,
        roomProfile:'standard_2000_live',mapConfiguration:record.mapConfiguration,
        standard2000Recipes:record.recipes,armySpendPolicy:'rules_legal_unspent_lost',
        attachBot:false,autoDrive:false,enableSpatialPreexecution:true,autoDriveIntervalMs:1500,
        opponentHumanJoin:record.matchMode==='human_vs_human',preassignedGuest:Boolean(record.lineupId),
        humanRoleMode:record.humanRoleMode||'supervisor',
        currentProductRuntimeVariant:'singleton_identity_v6',
        roomStore,botStore,matchDecisionJournal:journal,refereeCrypto,
        resumeRoom:Boolean(record.credentials),resumeCredentials:record.credentials,
        issueHumanRecovery:false,
        // The web table already renders accepted Native positions. Physical
        // tabletop acknowledgements are a different mode, not a second Apply.
        physicalCustodyBySide:{player1:'digital_only',player2:'digital_only',shared:'digital_only'},
        botDecisionPort:{async decide(request){
          try {
            return await userKeys.use('player1','opponent',credentialIngress=>providerFactory({
              roomId:record.roomId,seatKey:'player2',matchBinding:fixture.createdRoom.matchBinding,
              spatialQueryPort:fixture.spatialRuntime,memoryQueryPort:fixture.continuity,
              strategyEntries:fixture.strategySkillEntries,ownFaction:record.recipes.player2.factionRecordKey,
              opponentFaction:record.recipes.player1.factionRecordKey,
              dataDirectory:path.join(directory,'provider'),matchMode:'user_vs_agent',
              providerProfiles:[STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1],
              providerInteractionMode:'json_channels_v1',budgetLimitCnyMicros:null,credentialIngress}),
            provider=>provider.decisionPort.decide(request));
          } catch(error) {
            if(String(error.code||'').startsWith('PRODUCT_'))return {ok:false,reason:error.code,trainingTruth:false};
            throw error;
          }
        }},
        physicalAgentPort:{async execute(task){return {ok:true,completed:true,
          evidenceRefs:['digital-table:'+task.taskId],trainingTruth:false};}}
      });
      record.credentials=clone(fixture.createdRoom.credentials);
      await save(file,record);
      const persistence=createSqliteCompanionPersistenceAdapter({filename:path.join(directory,'companion.sqlite'),privatePayloadCodec});
      const scopedCompanion={portId:'companion_provider_port_v1',adapterId:'product-seat-user-key',implementsRealProvider:true,
        network:'isolated_provider_worker',async complete(request){
          if(input.liveEnabled===false&&!input.companionProviderFactory&&!companionProvider)
            return {ok:false,reason:'LIVE_PROVIDER_DISABLED'};
          const seat=request.metadata?.seatKey;
          if(request.metadata?.roomId!==record.roomId)return {ok:false,reason:'PRODUCT_COMPANION_ROOM_MISMATCH'};
          try {
            return await userKeys.use(seat,'companion',credentialIngress=>companionProvider||companionFactory({
              dataDirectory:path.join(directory,'companion-provider',seat),credentialIngress}),
            provider=>provider.complete(request));
          } catch(error) {
            if(String(error.code||'').startsWith('PRODUCT_'))return {ok:false,reason:error.code};
            throw error;
          }
        }};
      const companion=createStarcraftTmgCompanionProductModuleV1({roomRuntime:fixture.roomRuntime,
        persistence,provider:scopedCompanion,packages,assetCatalog:companionPortraitAssetCatalogV1(),
        globalWorldbookEntries:[],worldbookRecursionDepth:2});
      const adapter=createStarcraftTmgLevel3HttpAdapter({roomRuntime:fixture.roomRuntime,assetRoot:root});
      const item={record,fixture,adapter,companion,persistence,roomStore,botStore,journal,
        withLearningService:(seat,factory,operation)=>userKeys.use(seat,'postgame-learning',factory,operation),
        providerStatus:seat=>({...userKeys.status(seat),ownerSeat:seat,
          usedFor:record.matchMode==='user_vs_agent'&&seat==='player1'?['companion','opponent']:['companion']}),
        async setUserKey(seat,apiKey){
          await userKeys.replace(seat,apiKey);
          if(seat==='player1'&&apiKey!==null)await item.startAI();
          return item.providerStatus(seat);
        },
        async startAI(){
          if(record.matchMode!=='user_vs_agent')return;
          if(!userKeys.status('player1').configured)return;
          if(aiAttached){
            const state=await fixture.botRuntime.read({scope:fixture.botScope});
            if(state.projection?.lifecycle==='active')return;
          }
          if(startingAI)return startingAI;
          startingAI=(async()=>{
          if(input.liveEnabled===false && !input.providerFactory) fail('LIVE_PROVIDER_DISABLED');
          const attached=await fixture.botRuntime.attach({scope:fixture.botScope,
            seatToken:record.credentials.bot.seatToken,
            automationConsent:{approved:true,approvedBy:'human',scope:'current_match_bot_seat',
              approvedAt:new Date().toISOString()},autoDrive:input.autoDrive!==false});
          if(!attached.ok) fail(attached.reason);
          aiAttached=true;
          })();
          try{return await startingAI;}finally{startingAI=null;}
        },
        async close(){
          await fixture.botRuntime?.close();
          await userKeys.close();
          await persistence.close();
          roomStore.close?.();botStore.close?.();journal.close?.();
        }};
      live.set(record.roomId,item);
      return item;
      } catch (error) {
        roomStore.close();botStore.close();journal.close();
        if(record.admissionStatus==='preparing') {record.setupError=error.code||error.message;await save(file,record);}
        throw error;
      }
    })();
    opening.set(record.roomId,job);
    try{return await job;}finally{opening.delete(record.roomId);}
  }
  async function get(roomId) {
    if(!/^product-[a-z0-9-]+$/u.test(roomId)) return null;
    if(live.has(roomId)) {
      const item=live.get(roomId);
      if(item.record.admissionStatus!=='ready')fail('PRODUCT_ROOM_SETUP_INCOMPLETE');
      return item;
    }
    let record;
    try{record=JSON.parse(await readFile(path.join(roomsDirectory,roomId,'room.private.json'),'utf8'));}
    catch(error){if(error.code==='ENOENT')return null;throw error;}
    if(record.admissionStatus!=='ready')fail('PRODUCT_ROOM_SETUP_INCOMPLETE');
    return open(record);
  }
  async function access(item,seat='human') {
    const issued=await item.fixture.roomRuntime.issueSeatRecovery({roomId:item.record.roomId,
      seatToken:item.record.credentials[seat].seatToken});
    if(!issued.ok) fail(issued.reason);
    return origin+'/room/'+item.record.roomId+'#recovery='+encodeURIComponent(issued.recovery.recoveryToken);
  }
  const releaseCatalogues=new Map(), auditFactories=new Map();
  async function recipeFor(setup,side,army,presetId) {
    if(army && presetId) fail('PRODUCT_ROSTER_SELECTION_AMBIGUOUS');
    if(army) {
      let sourceCatalogue=catalogue;
      if(setup){
        if(!releaseCatalogues.has(setup.releaseRef)){
          const source=JSON.parse(await readFile(path.join(root,setup.releaseRef),'utf8'));
          const data=JSON.parse(await readFile(path.join(root,source.source.datasetRef),'utf8'));
          if(data.datasetHash!==source.source.datasetHash) fail('PRODUCT_ROOM_RELEASE_SOURCE_CHANGED');
          const records=Object.values(data.recordsByKey);
          releaseCatalogues.set(setup.releaseRef,{units:records.filter(r=>r.recordType==='unit').map(r=>r.payload),
            cards:records.filter(r=>r.recordType==='tactical_card').map(r=>r.payload)});
        }
        sourceCatalogue=releaseCatalogues.get(setup.releaseRef);
      }
      return manualArmyRecipeV1(army,sourceCatalogue,side,setup?.minerals??2000,{savedUpgradeNames:Boolean(setup)});
    }
    const recipe=setup?setup.presets.find(p=>p.id===presetId)?.recipe:
      ['preset-player1','preset-player2'].includes(presetId)?OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1[presetId.slice(7)]:null;
    if(!recipe) fail('PRODUCT_ROSTER_SELECTION_REQUIRED');
    const copy=clone(recipe);
    if(!presetId.endsWith('-'+side)) copy.units.forEach((u,i)=>{u.unitInstanceId=side+'-unit-'+(i+1);});
    return copy;
  }
  async function create(request) {
    const matchMode=request.matchMode||'user_vs_agent';
    if(!['user_vs_agent','human_vs_human'].includes(matchMode)) fail('PRODUCT_MATCH_MODE_INVALID');
    const setup=request.setupId && request.setupId!=='legacy-standard' ? releaseSetups.find(s=>s.id===request.setupId) : null;
    if(request.setupId && request.setupId!=='legacy-standard' && !setup) fail('PRODUCT_SETUP_UNKNOWN');
    if(setup && matchMode!=='human_vs_human') fail('PRODUCT_SETUP_REQUIRES_TWO_PLAYERS');
    if(request.setupVersion && (setup?.version!==request.setupVersion || setup?.sourceHash!==request.setupSourceHash))
      fail('PRODUCT_SETUP_PLAN_BINDING_MISMATCH');
    if(request.setupVersion && request.mapConfiguration?.seedId!==setup.seedId) fail('PRODUCT_SETUP_PLAN_MAP_MISMATCH');
    const datasetHash = setup ? releaseDatasets.get(setup.releaseRef) : catalogue.source.officialDatasetHash;
    for (const army of [request.army,request.opponentArmy]) {
      if (army?.officialDatasetHash && army.officialDatasetHash !== datasetHash) {
        fail('PRODUCT_ROSTER_SELECTION_SOURCE_MISMATCH');
      }
    }
    const recipes=request.recipes || {
      player1:await recipeFor(setup,'player1',request.army,request.ownPreset),
      player2:setup || request.opponentArmy ? await recipeFor(setup,'player2',request.opponentArmy,request.opponentPreset):
        clone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2)};
    const roomId='product-'+randomUUID(),directory=path.join(roomsDirectory,roomId);
    await mkdir(directory,{recursive:true,mode:0o700});
    const pair=generateKeyPairSync('ed25519');
    const record={schema:'starcraft_product_room_v1',roomId,matchMode,
      humanRoleMode:'player',...(request.lineupId?{lineupId:request.lineupId}:{}),
      title:String(request.title||'星际争霸 · '+(matchMode==='user_vs_agent'?'人机对战':'双人对战')).slice(0,120),
      createdAt:new Date().toISOString(),recipes:clone(recipes),
      mapConfiguration:setup && !request.setupVersion ? wave3HumanMapConfiguration(setup) : clone(request.mapConfiguration||mapConfiguration),
      ...(setup ? {releaseSetup:Object.fromEntries(Object.entries(setup).filter(([key])=>key!=='presets'))} : {}),
      planHash:request.planHash||null,launchKey:request.launchKey||null,
      admissionStatus:'preparing',credentials:null,
      privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}).toString(),
      publicKey:pair.publicKey.export({type:'spki',format:'pem'}).toString(),
      hmacSecret:randomBytes(32).toString('base64url'),storeKey:randomBytes(32).toString('base64')};
    await save(path.join(directory,'room.private.json'),record);
    const item=await open(record);
    if(request.preparePregameRosterPlans) {
      const prepared=await request.preparePregameRosterPlans({roomRuntime:item.fixture.roomRuntime,roomId,
        ...(setup ? {openPlanningBoard: async () => {
          const {createRosterPlanningProductModuleV1} = await import('../../packages/product-composition/roster-planning-product-module-v1.mjs');
          return createRosterPlanningProductModuleV1({root, roomId, operation: 'board_queries',
            wave3MatchSetup: record.releaseSetup, referenceArmyRecipes: record.recipes, mapConfiguration: record.mapConfiguration});
        }} : {}),
        seats:{player1:{seatToken:record.credentials.human.seatToken,
          scope:{gameId:'starcraft-tmg',roomId,matchBindingHash:item.fixture.createdRoom.matchBinding.bindingHash,seatKey:'player1'}}}});
      await save(path.join(directory,'pregame-plans.json'),prepared);
    }
    record.admissionStatus='ready';
    await save(path.join(directory,'room.private.json'),record);
    await item.startAI();
    return request.lineupId?publicRecord(record):{...publicRecord(record),joinUrl:await access(item)};
  }
  async function launchOnce(request) {
    // Repeated accepted-Plan launches resume the same room and saved plan.
    for(const id of await readdir(roomsDirectory)){
      let prior;
      try{prior=JSON.parse(await readFile(path.join(roomsDirectory,id,'room.private.json'),'utf8'));}
      catch{continue;}
      if(prior.launchKey===request.launchKey){
        if(request.setupVersion && (prior.releaseSetup?.id!==request.setupId ||
          prior.releaseSetup.version!==request.setupVersion || prior.releaseSetup.sourceHash!==request.setupSourceHash))
          fail('PRODUCT_SETUP_PLAN_BINDING_MISMATCH');
        if(prior.admissionStatus!=='ready')fail('PRODUCT_ROOM_SETUP_INCOMPLETE');
        const item=await get(id);await item.startAI();
        return {...publicRecord(prior),joinUrl:await access(item)};
      }
    }
    if(request.setupVersion && (!request.recipe || !request.referenceArmyRecipes?.player2))
      fail('PRODUCT_SETUP_PLAN_REFERENCE_ARMIES_REQUIRED');
    return create({...request,recipes:request.referenceArmyRecipes?
      {...clone(request.referenceArmyRecipes),player1:clone(request.recipe)}:
      {...clone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1),player1:clone(request.recipe)},
      matchMode:request.matchMode});
  }
  async function launch(request) {
    if(!request.launchKey)fail('PRODUCT_LAUNCH_KEY_REQUIRED');
    if(launches.has(request.launchKey))return launches.get(request.launchKey);
    const job=launchOnce(request);
    launches.set(request.launchKey,job);
    try{return await job;}finally{launches.delete(request.launchKey);}
  }
  const setupFor = id => id==='legacy-standard'
    ? {id,version:'legacy',sourceHash:catalogue.source.officialDatasetHash}
    : releaseSetups.find(s=>s.id===id);
  async function priorLineupRoom(lineupId) {
    for(const id of await readdir(roomsDirectory)) {
      let record;
      try{record=JSON.parse(await readFile(path.join(roomsDirectory,id,'room.private.json'),'utf8'));}
      catch(e){if(e.code==='ENOENT')continue;throw e;}
      if(record.lineupId!==lineupId) continue;
      if(record.admissionStatus==='preparing'){
        await open(record);record.admissionStatus='ready';delete record.setupError;
        await save(path.join(roomsDirectory,id,'room.private.json'),record);
      }
      if(record.admissionStatus==='ready') return record.roomId;
    }
    return null;
  }
  const lineups=createHumanRosterLobby({directory:path.join(dataDirectory,'lineups'),prefix:PRODUCT_PREFIX,setupFor,
    findRoom:priorLineupRoom,
    async compile(id,side,{army,preset}){
      const setup=releaseSetups.find(s=>s.id===id);
      if(army && setup && army.officialDatasetHash!==releaseDatasets.get(setup.releaseRef))
        fail('PRODUCT_ROSTER_SELECTION_SOURCE_MISMATCH');
      const recipe=await recipeFor(setup,side,army,preset);
      if(setup){
        if(!auditFactories.has(setup.id)) auditFactories.set(setup.id,loadWave3MatchBoardFactoryV1({root,setup}));
        let factory;try{factory=await auditFactories.get(setup.id);}catch(e){auditFactories.delete(setup.id);throw e;}
        factory.auditArmy(side,recipe);
      }
      return recipe;
    },
    start:s=>create({matchMode:'human_vs_human',setupId:s.setupId,lineupId:s.id,
      recipes:{player1:s.player1.recipe,player2:s.player2.recipe}}),
    async enter(id,side){return access(await get(id),side==='player1'?'human':'guest');}
  });
  async function handle(request) {
    const {pathname,method,headers}=request,body=request.body||{};
    const query=request.query instanceof URLSearchParams?Object.fromEntries(request.query):request.query||{};
    if(pathname.startsWith(PRODUCT_PREFIX+'/lineups')){
      try{return await lineups(request);}catch(e){
        if(/^(PRODUCT_ROSTER_SELECTION_|STANDARD_ROOM_|SKIRMISH_500_ROOM_|FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID:|军表|请选择|请先添加|单位或规模|升级选择)/.test(e.code||e.message)) return response({ok:false,reason:e.message},422);
        throw e;
      }
    }
    if(pathname===PRODUCT_PREFIX+'/catalogue'&&method==='GET'){
      const presets=Object.entries(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1).map(([side,recipe])=>{
        const roster=recipe.units.map(u=>{
          const card=catalogue.units.find(c=>'army_units:'+c.id===u.recordKey);
          return {unitId:card.id,name:card.name,unitType:card.unitType,size:u.compositionKind,
            baseCost:card[u.compositionKind+'Profile'].cost,supply:card[u.compositionKind+'Profile'].supply,
            activeUpgrades:u.upgradeNames.map(n=>card.upgrades.findIndex(v=>v.name===n)),
            availableUpgrades:card.upgrades,stats:card.stats,keywords:card.keywords};
        });
        const faction=catalogue.cards.find(c=>'tactical_cards:'+c.id===recipe.factionRecordKey);
        return {id:'preset-'+side,name:faction.name+' · 2000',faction:faction.faction,mineralsLimit:2000,
          gasLimit:200,factionCardId:faction.id,tacticalCardIds:recipe.tacticalCardRecordKeys.map(k=>k.split(':')[1]),
          roster,missionId:'mission_hold_position',deploymentId:'2NdngLtIeZAprsWr25hM',
          createdAt:Date.now(),updatedAt:Date.now()};
      });
      return response({ok:true,presets,setups:releaseSetups.map(({id,scale,minerals,seedId,mission,deployment,version,releaseRef,presets})=>
        ({id,scale,minerals,seedId,mission,deployment,version,officialDatasetHash:releaseDatasets.get(releaseRef),
          presets:presets.map(({id,label})=>({id,label}))})),map:{seedId:mapConfiguration.seedId,
        name:mapConfiguration.semanticTerrain?.binding?.displayName||mapConfiguration.seedId},
        modes:['user_vs_agent','human_vs_human'],scale:'Standard',mineralBudget:2000});
    }
    if(pathname===PRODUCT_PREFIX+'/rooms'&&method==='GET'){
      const rooms=[];
      for(const id of await readdir(roomsDirectory)){
        try{const r=JSON.parse(await readFile(path.join(roomsDirectory,id,'room.private.json'),'utf8'));
          if(!r.lineupId&&r.credentials&&r.admissionStatus==='ready')rooms.push(publicRecord(r));}catch{}
      }
      return response({ok:true,rooms});
    }
    if(pathname===PRODUCT_PREFIX+'/rooms'&&method==='POST'){
      try {
        return response({ok:true,match:await create({army:body.army,opponentArmy:body.opponentArmy,
          setupId:body.setupId,ownPreset:body.ownPreset,opponentPreset:body.opponentPreset,
          matchMode:body.matchMode,title:body.title})},201);
      } catch(error) {
        if (/^PRODUCT_(SETUP_|ROSTER_SELECTION_)|^军表|^请选择势力卡|^请先添加单位|^单位或规模无效|^升级选择已失效/.test(error.message)) {
          return response({ok:false,reason:error.message},422);
        }
        throw error;
      }
    }
    const productMatch=pathname.match(new RegExp('^'+PRODUCT_PREFIX+'/rooms/([^/]+)/(open|invite|revision|provider-key)$'));
    const roomMatch=pathname.match(/\/rooms\/([^/]+)/u);
    const roomId=productMatch?.[1]||roomMatch?.[1]||body.roomId||query.roomId;
    if(!roomId) {
      if(pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX))return baseAdapter.handle({...request,query});
      if(pathname.startsWith('/starcraft-tmg-level3/assets/v1/character/')){
        for(const active of live.values()){
          const asset=await active.adapter.handle({...request,query});
          if(asset.status===200)return asset;
        }
      }
      return null;
    }
    const item=await get(roomId);if(!item)return null;
    if(productMatch?.[2]==='provider-key'){
      const auth=await item.fixture.roomRuntime.readRoom({roomId,seatToken:bearer(headers)});
      const viewer=auth.projection?.viewer;
      if(!auth.ok||!['player1','player2'].includes(viewer?.seatKey)
        ||!viewer.capabilities?.includes('apply'))
        return response({ok:false,reason:'AUTHENTICATION_REQUIRED'},401);
      if(!['GET','POST','DELETE'].includes(method))return response({ok:false,reason:'METHOD_NOT_ALLOWED'},405);
      if(Object.keys(body).some(k=>method!=='POST'||k!=='apiKey')
        ||(method==='POST'&&typeof body.apiKey!=='string'))
        return response({ok:false,reason:'PRODUCT_CREDENTIAL_FIELDS_INVALID'},400);
      try {
        const provider=method==='GET'?item.providerStatus(viewer.seatKey):
          await item.setUserKey(viewer.seatKey,method==='DELETE'?null:body.apiKey);
        return response({ok:true,provider});
      } catch(error){
        if(error.code==='PRODUCT_API_KEY_INVALID')return response({ok:false,reason:error.code},400);
        throw error;
      }
    }
    if(productMatch?.[2]==='revision' && method==='GET'){
      // Public revision only. The authenticated Client Domain retrieves and
      // validates the actual player projection when this revision advances.
      const read=await item.fixture.roomRuntime.readRoom({roomId});
      if(!read.ok)return response({ok:false,reason:read.reason},409);
      const room=read.projection.room;
      return response({ok:true,roomId,stateRevision:room.stateRevision,stateHash:room.stateHash});
    }
    if(productMatch && method==='POST'){
      const operation=productMatch[2];
      // Loopback-only local owner's room library; guests use one-shot links.
      if(operation==='open'&&item.record.lineupId)return response({ok:false,reason:'LINEUP_SEAT_REQUIRED'},403);
      if(operation==='open'){await item.startAI();return response({ok:true,match:{
        ...publicRecord(item.record),joinUrl:await access(item)}});}
      const auth=await item.fixture.roomRuntime.readRoom({roomId,seatToken:bearer(headers)});
      if(!auth.ok||!auth.projection?.viewer?.capabilities?.includes('apply'))
        return response({ok:false,reason:'AUTHENTICATION_REQUIRED'},401);
      if(operation==='invite'){
        if(item.record.matchMode!=='human_vs_human') return response({ok:false,reason:'AI_SEAT_NOT_INVITABLE'},409);
        const invitation=await item.fixture.roomRuntime.issueInvite({roomId,seatToken:bearer(headers)});
        return response({ok:invitation.ok,invitation});
      }
    }
    if(pathname.startsWith(STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX))
      return item.companion.handle({...request,query});
    if(pathname.startsWith(STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX)){
      if(!item.fixture.botRuntime) return response({ok:false,reason:'ROOM_HAS_NO_BOT_SEAT'},409);
      const task=pathname.match(/\/physical-tasks\/([^/]+)\/(delegate|complete|dispute)$/u);
      let result;
      if(task&&method==='POST'){
        const auth=await item.fixture.roomRuntime.readRoom({roomId,seatToken:bearer(headers)});
        if(!auth.ok||!auth.projection?.viewer?.capabilities?.includes('apply'))
          return response({ok:false,reason:'AUTHENTICATION_REQUIRED'},401);
        const args={scope:item.fixture.botScope,taskId:decodeURIComponent(task[1])};
        result=task[2]==='delegate'?await item.fixture.botRuntime.delegatePhysicalTask(args):
          task[2]==='complete'?await item.fixture.botRuntime.completePhysicalTask({...args,completedBy:'human',evidenceRefs:[]}):
          await item.fixture.botRuntime.openRulesDispute({...args,reason:String(body.reason||'玩家请求规则复核')});
      }else result=await item.fixture.botRuntime.read({scope:item.fixture.botScope});
      return response({schemaVersion:STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,result,
        notifications:item.fixture.notifications.slice(-20)});
    }
    if(pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX))return item.adapter.handle({...request,query});
    return null;
  }
  function planningInputsForSetup(setupId) {
    const setup = releaseSetups.find(entry => entry.id === setupId);
    if (!setup) fail('PRODUCT_SETUP_NOT_FOUND');
    const recipes = Object.fromEntries(['player1','player2'].map(seat => {
      const preset = setup.presets.find(entry => entry.id.endsWith('-' + seat));
      if (!preset) fail('WAVE3_PLANNING_REFERENCE_RECIPES_REQUIRED');
      return [seat, clone(preset.recipe)];
    }));
    return {wave3MatchSetup: clone(setup), referenceArmyRecipes: recipes,
      mapConfiguration: wave3HumanMapConfiguration(setup)};
  }
  return {handle,launch,create,get,planningInputsForSetup,setOrigin:value=>{origin=value;},
    async close(){for(const room of live.values())await room.close();}};
}
