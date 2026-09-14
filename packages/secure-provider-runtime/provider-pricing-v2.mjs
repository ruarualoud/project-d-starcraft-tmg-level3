import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_PRICING_V2_VERSION =
  "starcraft_tmg_provider_pricing_v2";

const PROVIDER_ID = "deepseek-openai-compatible-direct";
const USAGE_FIELDS = new Set([
  "inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits",
  "inputCacheMissUnits", "reasoningOutputUnits",
]);
const MODELS = Object.freeze({
  "deepseek-flash": Object.freeze({
    officialModelRelease: "DeepSeek-V4.1-Flash",
    ratesPerTokenNanoUsd: Object.freeze({
      offPeak: Object.freeze({ inputCacheHit: 3, inputCacheMiss: 150, output: 600 }),
      peak: Object.freeze({ inputCacheHit: 6, inputCacheMiss: 300, output: 1_200 }),
    }),
  }),
  "deepseek-v4-pro": Object.freeze({
    officialModelRelease: "DeepSeek-V4-Pro-0813",
    ratesPerTokenNanoUsd: Object.freeze({
      offPeak: Object.freeze({ inputCacheHit: 22, inputCacheMiss: 660, output: 1_980 }),
      peak: Object.freeze({ inputCacheHit: 44, inputCacheMiss: 1_320, output: 3_960 }),
    }),
  }),
});

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function exactFields(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((field) => !allowed.has(field))) {
    throw new TypeError(`${label} contains forbidden fields`);
  }
}
function integer(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}
function instant(value, field) {
  const normalized = new Date(value).toISOString();
  if (normalized !== value) throw new TypeError(`${field} is invalid`);
  return normalized;
}
function usdFromNano(value) {
  const whole = Math.floor(value / 1_000_000_000);
  const fractional = String(value % 1_000_000_000).padStart(9, "0")
    .replace(/0+$/u, "") || "0";
  return `${whole}.${fractional}`;
}

const snapshotBody = {
  schemaVersion: `${STARCRAFT_TMG_PROVIDER_PRICING_V2_VERSION}.snapshot`,
  providerId: PROVIDER_ID,
  models: MODELS,
  effectiveAt: "2026-09-14T00:00:00.000Z",
  capturedAt: "2026-09-14T05:42:30.000Z",
  source: {
    url: "https://api-docs.deepseek.com/quick_start/pricing/",
    modelListUrl: "https://api-docs.deepseek.com/api/list-models/",
    officialDocsReadAt: "2026-09-14T05:42:30.000Z",
  },
  currency: "USD",
  accountingUnit: "nano_usd",
  peakWindowUtc: {
    weekdays: [1, 2, 3, 4, 5],
    intervals: [[1, 4], [6, 10]],
    endExclusive: true,
  },
  providerInvoiceAuthoritative: true,
  calculatedCostIsInvoice: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_DEEPSEEK_CURRENT_PRICING_SNAPSHOT_V2 = freeze({
  ...snapshotBody,
  snapshotHash: hashStarcraftTmgContract(snapshotBody),
});

export function isStarcraftTmgDeepSeekPeakWindowV2(value) {
  const date = new Date(instant(value, "startedAt"));
  const weekday = date.getUTCDay();
  const hour = date.getUTCHours();
  return snapshotBody.peakWindowUtc.weekdays.includes(weekday)
    && snapshotBody.peakWindowUtc.intervals.some(([start, end]) =>
      hour >= start && hour < end);
}

export function priceStarcraftTmgDeepSeekCurrentUsageV2(input = {}) {
  exactFields(input, new Set([
    "providerId", "requestedModel", "reportedModel", "startedAt", "usage",
  ]), "pricing input");
  const model = MODELS[input.requestedModel];
  if (input.providerId !== PROVIDER_ID || !model
    || input.reportedModel !== input.requestedModel) {
    throw new TypeError("Provider/model is outside the current pricing snapshot");
  }
  exactFields(input.usage, USAGE_FIELDS, "usage");
  const inputUnits = integer(input.usage.inputUnits, "usage.inputUnits");
  const outputUnits = integer(input.usage.outputUnits, "usage.outputUnits");
  const totalUnits = integer(input.usage.totalUnits, "usage.totalUnits");
  const hit = integer(input.usage.inputCacheHitUnits, "usage.inputCacheHitUnits");
  const miss = integer(input.usage.inputCacheMissUnits, "usage.inputCacheMissUnits");
  if (hit + miss !== inputUnits || totalUnits < inputUnits + outputUnits) {
    throw new TypeError("Provider usage totals are inconsistent");
  }
  const startedAt = instant(input.startedAt, "startedAt");
  const pricingWindow = isStarcraftTmgDeepSeekPeakWindowV2(startedAt)
    ? "peak" : "off_peak";
  const rates = model.ratesPerTokenNanoUsd[
    pricingWindow === "peak" ? "peak" : "offPeak"
  ];
  const inputCacheHitCostNanoUsd = hit * rates.inputCacheHit;
  const inputCacheMissCostNanoUsd = miss * rates.inputCacheMiss;
  const outputCostNanoUsd = outputUnits * rates.output;
  const calculatedCostNanoUsd = inputCacheHitCostNanoUsd
    + inputCacheMissCostNanoUsd + outputCostNanoUsd;
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_PRICING_V2_VERSION}.receipt`,
    snapshotHash: STARCRAFT_TMG_DEEPSEEK_CURRENT_PRICING_SNAPSHOT_V2.snapshotHash,
    providerId: input.providerId,
    requestedModel: input.requestedModel,
    reportedModel: input.reportedModel,
    officialModelRelease: model.officialModelRelease,
    startedAt,
    pricingWindow,
    usage: clone(input.usage),
    ratesPerTokenNanoUsd: clone(rates),
    inputCacheHitCostNanoUsd,
    inputCacheMissCostNanoUsd,
    outputCostNanoUsd,
    calculatedCostNanoUsd,
    calculatedCostUsd: usdFromNano(calculatedCostNanoUsd),
    providerInvoiceAuthoritative: true,
    calculatedCostIsInvoice: false,
    trainingTruth: false,
  };
  return freeze({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}
