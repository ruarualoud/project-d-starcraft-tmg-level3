import {createProviderProfile} from '../../packages/character-agent/contracts-v1.mjs';

export function createWave3OpenAICompanionProfileV1(model='gpt-5.4-mini') {
  if(!['gpt-5.4-mini','gpt-6.2-sol'].includes(model)) throw Error('PRODUCT_OPENAI_MODEL_NOT_APPROVED');
  return createProviderProfile({
    providerProfileId:'starcraft-tmg.playtest-adjutant.openai.'+model+'.v1',
    version:'2026.11.27.1',provider:'openai-api-direct',baseUrl:'https://api.openai.com/v1',model,
    thinkingMode:'provider_default',reasoningEffort:'provider_default',temperature:1,topP:1,
    contextBudget:65536,outputBudget:4096,toolSupport:false,timeoutMs:120000,
    retryPolicy:{maxAttempts:1,owner:'player_test_companion_session',internalRetry:false},
    fallbackPolicy:'fail_closed',extensions:{maxOutputField:'max_completion_tokens',
      samplingPolicy:'provider_default',documentation:'https://developers.openai.com/api/reference/chat/create'},
  });
}

// Public list-rate estimate only. Credit balance and the organization's invoice
// remain Platform-owned; cached-input discounts may reduce the actual charge.
export function estimateWave3OpenAICompanionUsageV1(receipt) {
  const rates={'gpt-5.4-mini':{input:750,cached:75,output:4500},
    'gpt-6.2-sol':{input:12000,cached:600,output:60000}};
  const rate=rates[receipt.requestedModel];
  if(receipt.providerId!=='openai-api-direct'||!rate)throw Error('PRODUCT_OPENAI_PRICING_SCOPE_INVALID');
  const {inputUnits,outputUnits,inputCacheHitUnits=0}=receipt.usage;
  if(![inputUnits,outputUnits,inputCacheHitUnits].every(n=>Number.isSafeInteger(n)&&n>=0)||inputCacheHitUnits>inputUnits)
    throw Error('PRODUCT_OPENAI_USAGE_INVALID');
  const calculatedCostNanoUsd=(inputUnits-inputCacheHitUnits)*rate.input+inputCacheHitUnits*rate.cached+outputUnits*rate.output;
  return {pricing:{calculatedCostNanoUsd,calculatedCostUsd:calculatedCostNanoUsd/1e9,
    pricingSource:'https://developers.openai.com/api/docs/pricing',capturedAt:'2026-11-27',
    calculatedCostIsInvoice:false,creditBalanceVerified:false},authoritative:false};
}
