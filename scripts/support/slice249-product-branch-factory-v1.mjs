import {assertPostgameSourceDomainV1} from '../../packages/strategy-skills/postgame-learning-source-partition-v1.mjs';
import {projectPostgameDecisionExposureV1} from '../../packages/strategy-skills/postgame-strategy-coverage-v1.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {randomBytes,generateKeyPairSync,createHash} from 'node:crypto';
import {createTicket20HumanAgentDemoFixtureV1,createTicket20AgentAgentDemoFixtureV1} from './ticket20-human-agent-demo-fixture-v1.mjs';
import {createSqliteStarcraftTmgRoomStore} from '../../packages/room-store/sqlite-room-store-v1.mjs';
import {createSqliteStarcraftTmgHostedBotSeatStoreV1} from '../../packages/online-agent-session/sqlite-hosted-bot-seat-store-v1.mjs';
import {createSqliteStarcraftTmgMatchDecisionJournalV1} from '../../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs';
import {createStarcraftTmgLiveOpponentProviderStackV1} from '../../packages/online-agent-session/live-opponent-provider-stack-v1.mjs';
import {createStarcraftTmgRefereeCrypto,hashStarcraftTmgContract as hash} from '../../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPostgamePairedRandomnessV1,POSTGAME_PAIRED_RNG_V1} from '../../packages/strategy-skills/postgame-paired-randomness-v1.mjs';
import {assertPostgameEvaluationBundleV1} from '../../packages/strategy-skills/postgame-evaluation-bundle-v1.mjs';
import {compilePostgameExperienceSnapshotV1,createPostgameExperienceMemoryPortV1} from '../../packages/strategy-skills/postgame-experience-memory-v1.mjs';
import {STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as flash} from '../../content/provider/ticket-23-live-provider-profiles-v1.mjs';
import {createVistaPlannerPolicyPortV1} from '../../packages/strategy-skills/vista-planner-policy-v1.mjs';
import {createSqliteStarcraftTmgPostgameReviewStoreV2} from '../../packages/strategy-skills/sqlite-postgame-review-store-v2.mjs';
import {renderActiveSandboxBoardFrameV1} from '../../packages/strategy-skills/active-sandbox-board-frame-v1.mjs';
import {createFrozenMemento2MemoryPortV1} from '../../packages/strategy-skills/memento2-frozen-policy-v1.mjs';
const json=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const optional=async f=>json(f).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
const need=(v,c)=>{if(!v)throw Error(c);};

export function createSlice249ProductBranchFactoryV1({outputRoot,fixtureRoot,decisionPortFactory,onBoundary,memoryTrainingFactory,selectionStore,credentialIngress,experimentQuotaStopFile,spawnProcess}){
  return async input=>{
    assertPostgameSourceDomainV1(input.source,input.controls?.sourceDomain);
    if(input.strategyBundle?.schemaVersion==='starcraft_postgame_evaluation_bundle_v1')
      assertPostgameEvaluationBundleV1(input.strategyBundle,input.subjectSeat);
    for(const bundle of [input.strategyBundle,input.opponentBundle])if(bundle?.memento2Policy)
      need(input.controls.mapTaskIdentity&&input.controls.mapTaskIdentity===bundle.memento2Policy.environment.mapTaskIdentity,
        'MEMENTO2_PRODUCT_MAP_TASK_BINDING_REQUIRED');
    // Frozen opponent is not allowed to consume another route/seat's draft.
    if(input.opponentBundle?.schemaVersion==='starcraft_postgame_evaluation_bundle_v1'){
      const chosen=input.controls.opponentSelectionRef&&await selectionStore?.load(input.controls.opponentSelectionRef);
      const learner=input.controls.learningScope;
      need(chosen?.schemaVersion==='postgame_version_selection_v1'&&learner
        &&chosen.scope?.experimentId===learner.experimentId&&chosen.scope?.route===learner.route
        &&chosen.scope?.ownerSeat!==input.subjectSeat
        &&hash(chosen.bundle)===hash(input.opponentBundle),'POSTGAME_OPPONENT_RESEARCH_CANDIDATE_FORBIDDEN');
      assertPostgameEvaluationBundleV1(input.opponentBundle,input.subjectSeat==='player1'?'player2':'player1');
    }
    const sourceBytes=await fs.readFile(input.source.stateFile);
    const parsed=JSON.parse(input.source.stateFile.endsWith('.gz')?zlib.gunzipSync(sourceBytes):sourceBytes.toString());
    const sourceState=parsed.state||parsed;
    need(hash(sourceState)===input.source.stateHash,'POSTGAME_SOURCE_BYTES_CHANGED');
    need(input.controls.contextPolicy==='fresh_memory_frozen_roster_plans'
      &&input.source.pregamePlansBySeat,'POSTGAME_CONTEXT_POLICY_REQUIRED');
    const owner=await json(path.join(input.source.directory,'runner-private.json'));
    const snapshot=await json(path.join(input.source.directory,'decision-pregame-snapshot.json'));
    const directory=path.join(outputRoot,hash(input.executionKey).slice(0,20));
    await fs.mkdir(directory,{recursive:true,mode:0o700});
    const privateFile=path.join(directory,'branch.private.json');
    let secret=await optional(privateFile);
    if(!secret){const pair=generateKeyPairSync('ed25519');secret={key:randomBytes(32).toString('base64'),
      referee:{privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:pair.publicKey.export({type:'spki',format:'pem'}),
        hmacSecret:hash({seed:input.controls.randomSeed,role:'offline_paired_rng'})},credentials:null};
      await fs.writeFile(privateFile,JSON.stringify(secret),{mode:0o600});}
    const seed=input.controls.randomSeed;need(typeof seed==='string'&&seed,'POSTGAME_RANDOM_SEED_REQUIRED');
    // Common secret and normalized chance basis give identical dice by ordinal
    // despite separate signed room identities. Every other crypto use is native.
    const crypto=createPostgamePairedRandomnessV1(createStarcraftTmgRefereeCrypto(secret.referee),seed);
    const roomStore=createSqliteStarcraftTmgRoomStore({filename:path.join(directory,'room.sqlite'),encryption:{key:Buffer.from(secret.key,'base64')}});
    const roomId='s249-product-'+hash(input.executionKey).slice(0,20);
    const stores={},journals={},providers={},ports={},policyStores={},trainingPorts={};let fixture,frameBrowser;
    const common={root:fixtureRoot,roomProfile:'standard_2000_live',setupRoomId:owner.roomId,
      standard2000Recipes:{...owner.referenceArmyRecipes,player1:snapshot.recipe},
      mapConfiguration:owner.mapConfiguration,currentProductRuntimeVariant:'singleton_identity_v6',
      attachBot:false,autoDrive:false,issueHumanRecovery:false,roomStore,refereeCrypto:crypto,
      physicalCustodyBySide:{player1:'digital_only',player2:'digital_only',shared:'digital_only'}};
    async function close(){await fixture?.player1Runtime?.close();await fixture?.botRuntime?.close();
      for(const p of Object.values(providers))await p.close();
      for(const s of Object.values(policyStores))s.close();await frameBrowser?.close();
      for(const s of Object.values(stores))s.close();for(const j of Object.values(journals))j.close();roomStore.close();}
    try{
      if(!secret.credentials){
        const template=await createTicket20HumanAgentDemoFixtureV1({...common,roomId:roomId+'-factory'});
        const created=await template.roomRuntime.createRoom({roomId,surfaceMode:'agent_agent_development',
          initialStateAuthority:{...template.initialStateAuthority,state:sourceState,rngSchemeId:POSTGAME_PAIRED_RNG_V1,
            receiptHash:hash({source:input.source,scope:'isolated_postgame',state:sourceState})},
          serverSeatPlan:[{label:'human',seatKey:'player1',roleMode:'supervisor',principalType:'human'},
            {label:'bot',seatKey:'player2',roleMode:'supervisor',principalType:'human'}]});
        need(created.ok,created.reason||'POSTGAME_CREATE_BRANCH_FAILED');
        secret.credentials=created.credentials;await fs.writeFile(privateFile,JSON.stringify(secret),{mode:0o600});
        await template.botRuntime.close();
      }
      for(const seat of ['player1','player2']){
        const dir=path.join(directory,seat);await fs.mkdir(dir,{recursive:true});
        stores[seat]=createSqliteStarcraftTmgHostedBotSeatStoreV1({filename:path.join(dir,'bot.sqlite')});
        journals[seat]=createSqliteStarcraftTmgMatchDecisionJournalV1({filename:path.join(dir,'memory.sqlite')});
      }
      fixture=await createTicket20AgentAgentDemoFixtureV1({...common,roomId,resumeRoom:true,resumeCredentials:secret.credentials,
        strategySkillEntriesBySeat:Object.fromEntries(['player1','player2'].map(seat=>[seat,
          (seat===input.subjectSeat?input.strategyBundle:input.opponentBundle).entries])),
        preparePregameRosterPlans:async()=>structuredClone(input.source.pregamePlansBySeat),
        botStore:stores.player2,player1BotStore:stores.player1,
        matchDecisionJournal:journals.player2,player1MatchDecisionJournal:journals.player1,
        maxAppliedActions:input.horizon.maxActions+64,
        botDecisionPort:{decide:x=>ports.player2.decide(x)},player1DecisionPort:{decide:x=>ports.player1.decide(x)}});
      need(fixture.rulesRuntime.descriptor.rulesVersion===input.controls.rulesVersion,'POSTGAME_RULES_VERSION_CHANGED');
      for(const seat of ['player1','player2']){
        const bundle=seat===input.subjectSeat?input.strategyBundle:input.opponentBundle;
        const experienceSnapshot=compilePostgameExperienceSnapshotV1(bundle,seat);
        const currentMemory=seat==='player1'?fixture.player1Continuity:fixture.continuity;
        const ctx={seat,fixture,bundle,input,directory:path.join(directory,seat),experienceSnapshot,
          readState:read,readPublicTransitions,
          replay:()=>fixture.roomRuntime.replayRoom({roomId}),
          sourceUnchanged:async()=>(await fs.readFile(input.source.stateFile)).equals(sourceBytes),
          memoryQueryPort:createPostgameExperienceMemoryPortV1({base:currentMemory,snapshot:experienceSnapshot,
            scope:{roomId,seatKey:seat,matchBindingHash:fixture.createdRoom.matchBinding.bindingHash}})};
        if(bundle.memento2Policy){
          ctx.memoryQueryPort=createFrozenMemento2MemoryPortV1({policy:bundle.memento2Policy,
            scope:{roomId,seatKey:seat,matchBindingHash:fixture.createdRoom.matchBinding.bindingHash},
            base:ctx.memoryQueryPort,readState:async()=>{const row=await roomStore.loadRoom(roomId);
              return {state:row.envelope.state,stateHash:row.envelope.stateHash};},
            environment:{rulesVersion:input.controls.rulesVersion,modelProfile:input.controls.modelProfile,
              promptVersion:input.controls.promptVersion,contextPolicy:input.controls.contextPolicy,
              mapTaskIdentity:input.controls.mapTaskIdentity,
              opponentBundleHash:hash(seat===input.subjectSeat?input.opponentBundle:input.strategyBundle)}});
        }
        if(memoryTrainingFactory&&seat===input.subjectSeat){
          const training=await memoryTrainingFactory(ctx);
          trainingPorts[seat]=training;
          ctx.memoryQueryPort=training.memoryQueryPort;
          ctx.onPromptArtifact=training.onPromptArtifact;
        }
        const trainingPrompt=ctx.onPromptArtifact;
        ctx.onPromptArtifact=async artifact=>{
          await trainingPrompt?.(artifact);
          // Persist the sanitized model input, separate from transport credentials.
          const promptDir=path.join(directory,seat,'prompts');
          await fs.mkdir(promptDir,{recursive:true,mode:0o700});
          await fs.writeFile(path.join(promptDir,artifact.promptArtifactHash+'.json.gz'),
            zlib.gzipSync(Buffer.from(JSON.stringify(artifact))),{mode:0o600});
          const exposure=projectPostgameDecisionExposureV1(artifact);
          if(exposure){const file=path.join(directory,seat,'decision-exposures.json');
            const previous=await optional(file)||[];
            if(!previous.some(e=>e.promptHash===exposure.promptHash))await fs.writeFile(file,JSON.stringify([...previous,exposure]));}
        };
        if(bundle.vistaProgram){
          policyStores[seat]=createSqliteStarcraftTmgPostgameReviewStoreV2({filename:path.join(directory,seat,'vista-policy.sqlite')});
          ctx.strategyHarnessPort=createVistaPlannerPolicyPortV1({store:policyStores[seat],program:bundle.vistaProgram,
            scope:{roomId,seatKey:seat,matchBindingHash:fixture.createdRoom.matchBinding.bindingHash},
            spatialQueryPort:seat==='player1'?fixture.player1SpatialRuntime:fixture.spatialRuntime,memoryQueryPort:ctx.memoryQueryPort,
            framePort:{capture:observation=>captureFrame(observation,true)}});
        }
        // A memory experiment must actually deliver its selected memory (or
        // explicit VOID) before planning. Optional model tool use alone does
        // not exercise the learning method. No strategic action is prescribed.
        if(trainingPorts[seat]||bundle.memento2Policy){
          const otherHarness=ctx.strategyHarnessPort;
          ctx.strategyHarnessPort={async prepare(request){
            const previous=await otherHarness?.prepare(request);
            if(request.stage!=='planning')return previous||{context:null,visualInputs:[]};
            const recalled=await ctx.memoryQueryPort.query({scope:structuredClone(request.input.scope),
              query:{text:'conditional experience for the current decision',limit:6,order:'newest_first'}});
            return {context:{...(previous?.context||{}),
              conditionalMemory:recalled,rulesAuthority:false},visualInputs:previous?.visualInputs||[]};
          }};
        }
        if(decisionPortFactory)ports[seat]=await decisionPortFactory(ctx);
        else{
          need(input.controls.modelProfile===flash.model,'POSTGAME_MODEL_PROFILE_CHANGED');
          providers[seat]=await createStarcraftTmgLiveOpponentProviderStackV1({
            strategyHarnessPort:ctx.strategyHarnessPort,
            onPromptArtifact:ctx.onPromptArtifact,
            roomId,seatKey:seat,providerProfiles:[flash],providerInteractionMode:'json_channels_v1',
            matchBinding:fixture.createdRoom.matchBinding,
            spatialQueryPort:seat==='player1'?fixture.player1SpatialRuntime:fixture.spatialRuntime,
            memoryQueryPort:ctx.memoryQueryPort,
            experienceSnapshot,
            strategyEntries:bundle.entries,ownFaction:fixture.factionRecordKeysBySeat[seat],
            opponentFaction:fixture.factionRecordKeysBySeat[seat==='player1'?'player2':'player1'],
            dataDirectory:path.join(directory,seat,'provider'),matchMode:'agent_vs_agent',
            credentialIngress,spawnProcess,
            experimentQuotaStopFile:experimentQuotaStopFile||path.resolve('build/r1-battle-matrix-e242-AcuVPu/ds-quota-stop.json')});
          ports[seat]=providers[seat].decisionPort;
          const opened=await ports[seat].read({scope:providers[seat].scope});
          need(opened.ok&&opened.projection.promptPack===input.controls.promptVersion,
            'POSTGAME_PROMPT_PACK_CHANGED');
        }
      }
      for(const seat of Object.keys(trainingPorts)){
        const original=ports[seat];ports[seat]={...original,async decide(request){
          await trainingPorts[seat].beforeDecision?.();return original.decide(request);
        }};
      }
      async function readPublicTransitions(){return (await roomStore.readJournal(roomId,'public',0))
        .filter(row=>row.payload.type==='accepted_transition').map(row=>structuredClone(row.payload.payload));}
      async function captureFrame(observation,includePixels=false){
        if(!frameBrowser){const {chromium}=await import('playwright');frameBrowser=await chromium.launch({headless:true})}
        const page=await frameBrowser.newPage({viewport:{width:1080,height:760}});try{
          const {svg}=renderActiveSandboxBoardFrameV1(observation);await page.setContent('<body style="margin:0">'+svg+'</body>');
          const bytes=await page.screenshot();
          const ref=path.join(directory,observation.seat,'frame-'+observation.stateHash+'.png');await fs.writeFile(ref,bytes);
          const sha256=createHash('sha256').update(bytes).digest('hex');
          return {status:'available',stateHash:observation.stateHash,stateRevision:observation.stateRevision,seat:observation.seat,
            ref,mimeType:'image/png',byteLength:bytes.length,sha256,authority:'room_player_projection',
            ...(includePixels?{image:{mimeType:'image/png',data:bytes.toString('base64'),sha256,detail:'high'}}:{})};
        }finally{await page.close()}
      }
      await fixture.orchestrator.start();
      async function read(){const a=await roomStore.loadRoom(roomId);return {state:a.envelope.state,stateRevision:a.stateRevision,stateHash:a.envelope.stateHash};}
      return {initialState:sourceState,sourceStateHash:input.source.stateHash,
        initialContextHash:hash({policy:input.controls.contextPolicy,plans:input.source.pregamePlansBySeat}),
        randomIdentity:hash({scheme:POSTGAME_PAIRED_RNG_V1,seed}),
        trajectoryRef:{directory,roomId,format:'room_journal_and_durable_seat_records'},read,
        async driveOne(){const old=await fixture.orchestrator.read();
          const result=old.status==='paused'?await fixture.orchestrator.resume({maxAdditionalActions:1,pauseAfterAppliedActions:1})
            :await fixture.orchestrator.run({maxAdditionalActions:1,pauseAfterAppliedActions:1});
          await onBoundary?.({fixture,directory,roomId,input,current:await read(),result});return result;},
        async readDecisionExposures(){return (await Promise.all(['player1','player2'].map(seat=>optional(path.join(directory,seat,'decision-exposures.json'))))).flatMap(x=>x||[]);},
        async captureBoundaryFrame(seat){
          need(['player1','player2'].includes(seat),'POSTGAME_FRAME_SEAT_INVALID');
          const {stateHash,stateRevision}=await read();
          const view=await fixture.roomRuntime.readRoom({roomId,seatToken:secret.credentials[seat==='player1'?'human':'bot'].seatToken});
          need(view.ok,'POSTGAME_FRAME_PROJECTION_FAILED');
          return captureFrame({projection:view.projection,stateHash,stateRevision,seat});
        },
        readPublicTransitions,
        async finishLearningWindow(){for(const training of Object.values(trainingPorts))await training.finish?.();},
        replay:()=>fixture.roomRuntime.replayRoom({roomId}),
        async sourceUnchanged(){return (await fs.readFile(input.source.stateFile)).equals(sourceBytes);},
        async usage(){const rows={};for(const [seat,p] of Object.entries(providers)){
          const s=await p.decisionPort.read({scope:p.scope});
          rows[seat]=s.projection?.usage||s.projection?.budget||null;}return rows;},close};
    }catch(e){await close();throw e;}
  };
}
