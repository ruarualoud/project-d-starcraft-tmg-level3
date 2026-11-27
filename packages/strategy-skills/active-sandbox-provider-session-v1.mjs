// Isolated offline session. Reuses the same authenticated, budgeted, durable
// Provider components as online play; contains no alternative HTTP client.
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createKerriganPrimalProductBundleV1} from '../../content/characters/kerrigan-primal-v1.mjs';
import {STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as defaultProfile} from '../../content/provider/ticket-23-live-provider-profiles-v1.mjs';
import {createStarcraftTmgOnlineAgentSessionLifecycleV1,createStarcraftTmgOnlinePrincipalBindingV1} from '../online-agent-session/session-lifecycle-v1.mjs';
import {createStarcraftTmgProviderGatewaySupervisorV1} from '../online-agent-session/provider-gateway-supervisor-v1.mjs';
import {createInMemoryStarcraftTmgPromptArtifactStoreV1} from '../online-agent-session/prompt-artifact-store-v1.mjs';
import {withExperimentQuotaStopV1} from '../online-agent-session/experiment-quota-stop-v1.mjs';
import {createStarcraftTmgProviderProfileRegistryV1} from '../secure-provider-runtime/provider-profile-registry-v1.mjs';
import {createStarcraftTmgProviderEgressWorkerPortV1} from '../secure-provider-runtime/provider-egress-worker-port-v1.mjs';
import {createStarcraftTmgSecureProviderAttachmentControlV1,STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION} from '../secure-provider-runtime/credential-attachment-control-v1.mjs';
import {createStarcraftTmgProviderGatewayExecutionScopeV1} from '../secure-provider-runtime/provider-gateway-execution-scope-v1.mjs';
import {createStarcraftTmgDurableProviderGatewayRuntimeV1} from '../secure-provider-runtime/durable-provider-gateway-runtime-v1.mjs';
import {createSqliteStarcraftTmgProviderAttemptStoreV1} from '../secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs';
import {STARCRAFT_TMG_PROVIDER_INPUT_RESERVATION_LIMIT_UNITS,STARCRAFT_TMG_PROVIDER_PROMPT_ARTIFACT_MAX_BYTES} from '../secure-provider-runtime/provider-egress-contract-v1.mjs';
import {compileActiveSandboxProviderArtifactV1} from './active-sandbox-provider-artifact-v1.mjs';

const requireOk = result => {
  if (!result?.ok) throw new Error(result?.reason || 'SANDBOX_PROVIDER_SETUP_FAILED');
  return result;
};
export async function createActiveSandboxProviderSessionV1({
  roomId,seatKey,matchBinding,dataDirectory,credentialIngress,
  experimentQuotaStopFile,providerProfile=defaultProfile,spawnProcess,
}) {
  if (!roomId || !['player1','player2'].includes(seatKey)
    || !matchBinding?.bindingHash || typeof credentialIngress !== 'function')
    throw new Error('SANDBOX_PROVIDER_HOST_BINDINGS_REQUIRED');
  await mkdir(dataDirectory,{recursive:true,mode:0o700});
  // Existing lifecycle requires a character capability identity. Its content
  // is NOT added to the research prompt; this is not a roleplay session.
  const {characterPackage}=createKerriganPrimalProductBundleV1();
  const principalSessionRef=`sandbox-principal-${randomUUID()}`;
  const b=matchBinding;
  const principalBinding=createStarcraftTmgOnlinePrincipalBindingV1({
    roomId,seatKey,principalScopeHash:hash({roomId,seatKey,principalSessionRef}),
    principalType:'model',principalRoleMode:'player',bindingRevision:1,
    allowedAgentModes:['opponent'],characterId:characterPackage.characterId,
    characterPackageHash:characterPackage.integrity.hash,
    characterSelectionHash:hash({roomId,seatKey,characterId:characterPackage.characterId}),
    roomBinding:{schemaVersion:b.schemaVersion,rulesVersion:b.rulesVersion,dataVersion:b.dataVersion,
      matchBindingHash:b.bindingHash,sourceSnapshotHash:b.sourceSnapshotHash,dataSnapshotHash:b.dataSnapshotHash,
      rulesArtifactHash:b.rulesArtifactHash,executorArtifactHash:b.executorArtifactHash,
      geometryArtifactHash:b.geometryArtifactHash,actionSchemaHash:b.actionSchemaHash},
  });
  const lifecycle=createStarcraftTmgOnlineAgentSessionLifecycleV1({
    principalAuthority:{async resolve(input){return input.roomId===roomId
      &&input.principalSessionRef===principalSessionRef?{ok:true,binding:principalBinding}
      :{ok:false,reason:'principal_not_authenticated'};}},
    characterCatalog:{async resolve(input){return input.characterId===characterPackage.characterId
      ?{ok:true,characterPackage}:{ok:false,reason:'character_not_found'};}},
  });
  const context={principalSessionRef};
  const {session}=requireOk(await lifecycle.createSession({roomId,mode:'opponent',
    characterId:characterPackage.characterId},context));
  const profileRef={id:providerProfile.providerProfileId,version:providerProfile.version,hash:providerProfile.integrity.hash};
  const registry=createStarcraftTmgProviderProfileRegistryV1({entries:[{
    providerProfile,completionPath:'/chat/completions',transportTimeoutMs:300000,
    requestOutputLimit:providerProfile.outputBudget}],allowedProviders:[providerProfile.provider]});
  const worker=createStarcraftTmgProviderEgressWorkerPortV1({providerProfileRegistry:registry,
    maxWorkers:1,maxOutputBytes:1024*1024,...(spawnProcess?{spawnProcess}:{})});
  const attempts=createSqliteStarcraftTmgProviderAttemptStoreV1({filename:path.join(dataDirectory,'provider-attempts.sqlite')});
  const prompts=createInMemoryStarcraftTmgPromptArtifactStoreV1({maxArtifacts:8,maxArtifactBytes:STARCRAFT_TMG_PROVIDER_PROMPT_ARTIFACT_MAX_BYTES});
  let core;
  const scope=createStarcraftTmgProviderGatewayExecutionScopeV1({sessionLifecycle:lifecycle,
    readProviderState:(...args)=>core.readState(...args)});
  const attachments=createStarcraftTmgSecureProviderAttachmentControlV1({sessionLifecycle:lifecycle,
    providerSupervisor:{readState:(...args)=>core.readState(...args)},providerProfileRegistry:registry,
    credentialAttachmentPort:worker,attachmentTtlMs:12*60*60*1000});
  const gateway=createStarcraftTmgDurableProviderGatewayRuntimeV1({attemptStore:attempts,
    promptArtifactStore:prompts,attachmentControl:attachments,workerPort:worker,executionAuthorityPort:scope});
  core=createStarcraftTmgProviderGatewaySupervisorV1({sessionLifecycle:lifecycle,providerGateway:gateway,
    gatewayEvidence:'isolated_sandbox_durable_provider_worker',budgetPolicy:{maxTotalUnits:50000000,
      maxTurns:1024,maxInputUnitsPerTurn:STARCRAFT_TMG_PROVIDER_INPUT_RESERVATION_LIMIT_UNITS,
      maxOutputUnitsPerTurn:providerProfile.outputBudget,timeoutMs:315000}});
  const scoped=scope.wrapSupervisor(core);
  const supervisor=withExperimentQuotaStopV1({sendTurn:i=>scoped.sendTurn(i,context)},
    {file:experimentQuotaStopFile,providerId:'deepseek'});
  let attachmentId,closed=false;
  async function close(){
    if(closed)return;closed=true;
    if(attachmentId) await attachments.detachAttachment({roomId,sessionId:session.sessionId,
      expectedConnectionEpoch:session.connection.epoch,attachmentId},context).catch(()=>{});
    await attachments.close().catch(()=>{});await worker.close().catch(()=>{});await attempts.close();
  }
  try{
    await gateway.initialize({recoveryIdempotencyKeyHash:hash({roomId,seatKey,principalSessionRef}),recoveredAt:new Date().toISOString()});
    const prepared=requireOk(await attachments.prepareAttachment({roomId,sessionId:session.sessionId,
      expectedConnectionEpoch:session.connection.epoch,providerProfileRef:profileRef,
      disclosureNoticeVersion:STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,consentAccepted:true},context));
    attachmentId=prepared.attachment.attachmentId;
    const ingress=await credentialIngress();
    requireOk(await attachments.attachCredentialBytes({roomId,sessionId:session.sessionId,
      expectedConnectionEpoch:session.connection.epoch,attachmentId,ingressNonce:prepared.ingress.nonce,
      credentialBytes:ingress.credentialBytes},context));
  }catch(error){await close();throw error;}
  function compile(observation){
    if(closed || observation.seat!==seatKey) throw new Error('SANDBOX_PROVIDER_SEAT_MISMATCH');
    return compileActiveSandboxProviderArtifactV1({observation,sessionId:session.sessionId,
      sessionBindingHash:session.binding.sessionBindingHash});
  }
  async function send(artifact,{maxOutputUnits=providerProfile.outputBudget}={}){
    if(!Number.isSafeInteger(maxOutputUnits)||maxOutputUnits<1||maxOutputUnits>providerProfile.outputBudget) throw new Error('SANDBOX_PROVIDER_OUTPUT_BOUND_INVALID');
    if(closed || artifact.sessionId!==session.sessionId
      || artifact.sessionBindingHash!==session.binding.sessionBindingHash) throw new Error('SANDBOX_PROVIDER_SESSION_MISMATCH');
    const stored=requireOk(prompts.put({sessionId:session.sessionId,sessionBindingHash:session.binding.sessionBindingHash,artifact}));
    const body={schemaVersion:'starcraft_tmg_bounded_provider_request_v1',
      intent:/_reflection_v\d+$/.test(artifact.promptPack)?'reflect':'take_turn',
      requestPayloadHash:artifact.promptArtifactHash,inputUnits:stored.bytes+4096,maxOutputUnits};
    try{return await supervisor.sendTurn({roomId,sessionId:session.sessionId,
      expectedConnectionEpoch:session.connection.epoch,providerProfileRef:profileRef,promptAssemblyRef:stored.ref,
      boundedRequest:{...body,requestHash:hash(body)},responseContract:{id:'sandbox-response',version:'1',hash:artifact.responseContract.contractHash}});
    }finally{prompts.release(stored.ref);}
  }
  return Object.freeze({compile,send,close,session,profile:structuredClone(providerProfile),
    observeAttempt:input=>gateway.observeAttempt(input),credentialExposedToModel:false});
}
