import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_PRICING_VERSION =
  "starcraft_tmg_provider_pricing_v1";

const HASH = /^[a-f0-9]{64}$/u;
const USAGE_FIELDS = new Set([
  "inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits",
  "inputCacheMissUnits", "reasoningOutputUnits",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
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

const pricingBody = {
  schemaVersion: `${STARCRAFT_TMG_PROVIDER_PRICING_VERSION}.snapshot`,
  providerId: "deepseek-openai-compatible-direct",
  requestedModel: "deepseek-v4-flash",
  officialModelRelease: "DeepSeek-V4-Flash-0731",
  effectiveAt: "2026-08-28T05:44:12.000Z",
  capturedAt: "2026-09-03T20:00:03.000Z",
  source: {
    url: "https://api-docs.deepseek.com/quick_start/pricing/",
    etag: "9ab0c63f83efd925aaa77a4d8bcfa20a",
    contentSha256:
      "cf2c6fb2dd8a32a538f12a8176175b8809a3516326a5cb30dfe52d63c490a968",
  },
  currency: "USD",
  accountingUnit: "nano_usd",
  ratesPerTokenNanoUsd: {
    offPeak: { inputCacheHit: 7, inputCacheMiss: 220, output: 660 },
    peak: { inputCacheHit: 14, inputCacheMiss: 440, output: 1320 },
  },
  peakWindowUtc: {
    weekdays: [1, 2, 3, 4, 5],
    intervals: [[1, 4], [6, 10]],
    endExclusive: true,
  },
  providerInvoiceAuthoritative: true,
  calculatedCostIsInvoice: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1 = freeze({
  ...pricingBody,
  snapshotHash: hashStarcraftTmgContract(pricingBody),
});

export function isStarcraftTmgDeepSeekPeakWindowV1(value) {
  const date = new Date(instant(value, "startedAt"));
  const weekday = date.getUTCDay();
  const hour = date.getUTCHours();
  return pricingBody.peakWindowUtc.weekdays.includes(weekday)
    && pricingBody.peakWindowUtc.intervals.some(([start, end]) =>
      hour >= start && hour < end);
}

export function priceStarcraftTmgDeepSeekV4FlashUsageV1(input = {}) {
  if (!object(input)) throw new TypeError("pricing input is required");
  const allowed = new Set([
    "providerId", "requestedModel", "reportedModel", "startedAt", "usage",
  ]);
  exactFields(input, allowed, "pricing input");
  if (input.providerId !== pricingBody.providerId
    || input.requestedModel !== pricingBody.requestedModel
    || input.reportedModel !== pricingBody.requestedModel) {
    throw new TypeError("Provider/model is outside the pricing snapshot");
  }
  exactFields(input.usage, USAGE_FIELDS, "usage");
  const inputUnits = integer(input.usage.inputUnits, "usage.inputUnits");
  const outputUnits = integer(input.usage.outputUnits, "usage.outputUnits");
  const totalUnits = integer(input.usage.totalUnits, "usage.totalUnits");
  const hit = integer(input.usage.inputCacheHitUnits,
    "usage.inputCacheHitUnits");
  const miss = integer(input.usage.inputCacheMissUnits,
    "usage.inputCacheMissUnits");
  if (hit + miss !== inputUnits || totalUnits < inputUnits + outputUnits) {
    throw new TypeError("Provider usage totals are inconsistent");
  }
  const startedAt = instant(input.startedAt, "startedAt");
  const pricingWindow = isStarcraftTmgDeepSeekPeakWindowV1(startedAt)
    ? "peak" : "off_peak";
  const rates = pricingWindow === "peak"
    ? pricingBody.ratesPerTokenNanoUsd.peak
    : pricingBody.ratesPerTokenNanoUsd.offPeak;
  const inputCacheHitCostNanoUsd = hit * rates.inputCacheHit;
  const inputCacheMissCostNanoUsd = miss * rates.inputCacheMiss;
  const outputCostNanoUsd = outputUnits * rates.output;
  const calculatedCostNanoUsd = inputCacheHitCostNanoUsd
    + inputCacheMissCostNanoUsd + outputCostNanoUsd;
  const receiptBody = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_PRICING_VERSION}.receipt`,
    snapshotHash:
      STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1.snapshotHash,
    providerId: input.providerId,
    requestedModel: input.requestedModel,
    reportedModel: input.reportedModel,
    officialModelRelease: pricingBody.officialModelRelease,
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
  return freeze({
    ...receiptBody,
    receiptHash: hashStarcraftTmgContract(receiptBody),
  });
}

export function verifyStarcraftTmgProviderPricingReceiptV1(value) {
  if (!object(value) || !HASH.test(String(value.receiptHash || ""))) return false;
  const { receiptHash, ...body } = clone(value);
  return hashStarcraftTmgContract(body) === receiptHash;
}
