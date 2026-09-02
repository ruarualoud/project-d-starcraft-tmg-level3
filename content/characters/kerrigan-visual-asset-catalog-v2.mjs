import { createStarcraftTmgCharacterVisualAssetManifestV1 } from
  "../../packages/character-agent/visual-asset-manifest-v1.mjs";
import { KERRIGAN_VISUAL_ASSET_PLAN_V1 } from "./kerrigan-visual-asset-plan-v1.mjs";
import { KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1 } from
  "./kerrigan-visual-generation-receipts-v1.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const realized = clone(KERRIGAN_VISUAL_ASSET_PLAN_V1);
delete realized.manifestHash;
realized.manifestId = "starcraft-tmg.kerrigan.visual-assets.v2";
realized.version = "2.0.0-development.1";
realized.createdAt = "2026-09-02T21:35:00.000Z";
realized.sources[1] = {
  ...realized.sources[1],
  captureStatus: "captured",
  byteHash: "6ec9eda12b14242fd32aa3a053e7a37fef4a3ed06af3fc55bf34893b2ac52ad9",
  byteLength: 264898,
  acquiredAt: "2026-09-02T21:15:00.000Z",
};
realized.assets = realized.assets.map((asset) => {
  const receipt = KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1.find((entry) => entry.assetId === asset.assetId);
  if (!receipt) {
    return {
      ...asset,
      status: "quarantined",
      developmentDisplayAllowed: false,
      publicReleaseAllowed: false,
      fileHash: null,
      promptHash: null,
      generationReceiptHash: null,
      byteLength: null,
      width: null,
      height: null,
    };
  }
  return {
    ...asset,
    status: "realized",
    inputSourceIds: ["blizzard.kerrigan-hero-week.hero-image.2014"],
    fileHash: receipt.output.contentHash,
    promptHash: receipt.promptHash,
    generationReceiptHash: receipt.receiptHash,
    byteLength: receipt.output.byteLength,
    width: receipt.output.width,
    height: receipt.output.height,
    mimeType: receipt.output.mimeType,
  };
});

export const KERRIGAN_VISUAL_ASSET_CATALOG_V2 =
  createStarcraftTmgCharacterVisualAssetManifestV1(realized);
