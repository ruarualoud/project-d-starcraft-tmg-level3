import { createHash } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  exportStarcraftTmgCharacterCardV2,
  importStarcraftTmgCharacterCardV2,
} from "./character-card-v2-adapter-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION =
  "starcraft_tmg_character_card_v2_png_adapter_v2";

export const STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS = Object.freeze({
  maxInputBytes: 28 * 1024 * 1024,
  maxOutputBytes: 28 * 1024 * 1024,
  maxChunkBytes: 3 * 1024 * 1024,
  maxChunkCount: 2048,
  maxTextChunkCount: 64,
  maxCardJsonBytes: 2 * 1024 * 1024,
  maxDimension: 8192,
  maxPixelCount: 64 * 1024 * 1024,
});

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_CRITICAL_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);
const TEXT_KEYWORD = "chara";
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pngBytes(input, field = "pngInput") {
  if (!Buffer.isBuffer(input) && !(input instanceof Uint8Array)) {
    throw new Error(`${field} must be a Buffer or Uint8Array`);
  }
  const bytes = Buffer.from(input);
  if (bytes.length > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxInputBytes) {
    throw new Error(`${field} exceeds maxInputBytes`);
  }
  return bytes;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunkBytes(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.allocUnsafe(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return output;
}

function textChunkKeyword(data) {
  const separator = data.indexOf(0);
  if (separator < 1 || separator > 79) throw new Error("PNG tEXt keyword length is invalid");
  return { keyword: data.subarray(0, separator).toString("latin1"), textBytes: data.subarray(separator + 1) };
}

function parsePng(input) {
  const bytes = pngBytes(input);
  if (bytes.length < PNG_SIGNATURE.length + 12 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("PNG signature mismatch");
  }
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  let textChunkCount = 0;
  let seenIdat = false;
  let idatClosed = false;
  let seenIend = false;
  while (offset < bytes.length) {
    if (chunks.length >= STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxChunkCount) {
      throw new Error("PNG exceeds maxChunkCount");
    }
    if (offset + 12 > bytes.length) throw new Error("PNG chunk header is truncated");
    const length = bytes.readUInt32BE(offset);
    if (length > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxChunkBytes) {
      throw new Error("PNG chunk exceeds maxChunkBytes");
    }
    const end = offset + 12 + length;
    if (end > bytes.length || end < offset) throw new Error("PNG chunk is truncated");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error("PNG chunk type is invalid");
    if (type[0] === type[0].toUpperCase() && !PNG_CRITICAL_CHUNKS.has(type)) {
      throw new Error(`unknown critical PNG chunk: ${type}`);
    }
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
    if (expectedCrc !== actualCrc) throw new Error(`PNG ${type} CRC mismatch`);
    if (chunks.length === 0 && (type !== "IHDR" || length !== 13)) {
      throw new Error("PNG IHDR must be the first chunk with length 13");
    }
    if (seenIend) throw new Error("PNG contains data after IEND");
    if (type === "IHDR") {
      if (chunks.length !== 0) throw new Error("PNG contains duplicate or misplaced IHDR");
      const width = data.readUInt32BE(0);
      const height = data.readUInt32BE(4);
      if (width < 1 || height < 1
        || width > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxDimension
        || height > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxDimension
        || width * height > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxPixelCount) {
        throw new Error("PNG dimensions exceed safety limits");
      }
    }
    if (type === "PLTE" && seenIdat) throw new Error("PNG PLTE appears after IDAT");
    if (type === "IDAT") {
      if (idatClosed) throw new Error("PNG IDAT chunks must be consecutive");
      seenIdat = true;
    } else if (seenIdat && type !== "IEND") {
      idatClosed = true;
    }
    if (type === "tEXt") {
      textChunkCount += 1;
      if (textChunkCount > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxTextChunkCount) {
        throw new Error("PNG exceeds maxTextChunkCount");
      }
      textChunkKeyword(data);
    }
    if (type === "IEND") {
      if (length !== 0) throw new Error("PNG IEND must be empty");
      if (!seenIdat) throw new Error("PNG must contain IDAT");
      seenIend = true;
    }
    chunks.push({
      type,
      data: Buffer.from(data),
      raw: Buffer.from(bytes.subarray(offset, end)),
      index: chunks.length,
    });
    offset = end;
  }
  if (!seenIend || offset !== bytes.length) throw new Error("PNG is missing terminal IEND");
  return { bytes, chunks };
}

function assemblePng(chunks) {
  const output = Buffer.concat([PNG_SIGNATURE, ...chunks.map((chunk) => chunk.raw || chunkBytes(chunk.type, chunk.data))]);
  if (output.length > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxOutputBytes) {
    throw new Error("embedded PNG exceeds maxOutputBytes");
  }
  return output;
}

function parseCardJson(serializedInput) {
  const serialized = typeof serializedInput === "string"
    ? serializedInput
    : `${JSON.stringify(serializedInput)}\n`;
  const jsonBytes = Buffer.from(serialized, "utf8");
  if (jsonBytes.length < 2 || jsonBytes.length > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxCardJsonBytes) {
    throw new Error("Character Card JSON exceeds safety limits");
  }
  let card;
  try {
    card = JSON.parse(serialized);
  } catch {
    throw new Error("Character Card JSON is invalid");
  }
  if (!card || typeof card !== "object" || Array.isArray(card)
    || card.spec !== "chara_card_v2" || card.spec_version !== "2.0"
    || !card.data || typeof card.data !== "object" || Array.isArray(card.data)) {
    throw new Error("only a chara_card_v2 2.0 object is supported");
  }
  return { serialized, jsonBytes, card };
}

function withoutTransportBinding(cardInput) {
  const card = clone(cardInput);
  const projectD = card.data?.extensions?.projectD;
  if (projectD) delete projectD.transportBinding;
  return card;
}

function sealReceipt(unsigned) {
  return deepFreeze({ ...unsigned, receiptHash: hashStarcraftTmgContract(unsigned) });
}

export function exportStarcraftTmgCharacterCardV2JsonV2(characterPackage, input = {}) {
  const historical = exportStarcraftTmgCharacterCardV2(characterPackage, input);
  const card = clone(historical.card);
  card.data.extensions.projectD.adapterVersion = STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION;
  const characterPackageHash = card.data.extensions.projectD.characterPackage.integrity.hash;
  const cardPayloadHash = hashStarcraftTmgContract(card);
  card.data.extensions.projectD.transportBinding = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.transport-binding`,
    algorithm: "sha256",
    characterPackageHash,
    cardPayloadHash,
    rulesAuthority: "external_rules_service",
    matchStateSource: "room_tools_only",
    trainingTruth: false,
  };
  const serialized = `${JSON.stringify(card, null, 2)}\n`;
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.json-export-receipt`,
    characterPackageHash,
    cardPayloadHash,
    cardHash: hashStarcraftTmgContract(card),
    serializedJsonHash: sha256(Buffer.from(serialized, "utf8")),
    jsonByteLength: Buffer.byteLength(serialized, "utf8"),
    unknownFieldsPolicy: "preserve_exact_serialized_payload",
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  return deepFreeze({ card, serialized, receipt: sealReceipt(unsigned) });
}

export function importStarcraftTmgCharacterCardV2JsonV2(input, options = {}) {
  const parsed = parseCardJson(input);
  const projectD = parsed.card.data.extensions?.projectD;
  const embedded = projectD?.characterPackage;
  if (embedded) {
    const binding = projectD.transportBinding;
    if (!binding || binding.schemaVersion !== `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.transport-binding`) {
      throw new Error("sealed Project D card requires the strict v2 transport binding");
    }
    if (binding.algorithm !== "sha256") throw new Error("Character Card transport binding algorithm mismatch");
    const expectedPayloadHash = hashStarcraftTmgContract(withoutTransportBinding(parsed.card));
    if (binding.cardPayloadHash !== expectedPayloadHash) throw new Error("Character Card transport payload integrity mismatch");
    if (binding.characterPackageHash !== embedded.integrity?.hash) throw new Error("Character Card package binding mismatch");
    if (binding.rulesAuthority !== "external_rules_service"
      || binding.matchStateSource !== "room_tools_only"
      || binding.trainingTruth !== false) {
      throw new Error("Character Card transport authority boundary mismatch");
    }
  }
  const imported = importStarcraftTmgCharacterCardV2(parsed.card, options);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.json-import-receipt`,
    importClass: imported.receipt.importClass,
    cardHash: hashStarcraftTmgContract(parsed.card),
    serializedJsonHash: sha256(parsed.jsonBytes),
    characterPackageHash: imported.characterPackage.integrity.hash,
    transportIntegrity: embedded ? "strict_v2_verified" : "external_untrusted_no_project_d_binding",
    exactSerializedPayloadRetained: true,
    quarantinedPromptFields: imported.receipt.quarantinedPromptFields,
    unknownFieldsPreserved: true,
    productionSelectable: imported.receipt.productionSelectable,
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  return deepFreeze({
    ok: true,
    card: parsed.card,
    serialized: parsed.serialized,
    characterPackage: imported.characterPackage,
    receipt: sealReceipt(unsigned),
  });
}

export function embedStarcraftTmgCharacterCardV2JsonInPng(pngInput, cardInput) {
  const parsedPng = parsePng(pngInput);
  const parsedCard = parseCardJson(cardInput);
  const baseChunks = [];
  let replacedCharaChunks = 0;
  for (const chunk of parsedPng.chunks) {
    if (chunk.type === "tEXt" && textChunkKeyword(chunk.data).keyword === TEXT_KEYWORD) {
      replacedCharaChunks += 1;
      continue;
    }
    baseChunks.push(chunk);
  }
  const basePng = assemblePng(baseChunks);
  const base64 = parsedCard.jsonBytes.toString("base64");
  const textData = Buffer.concat([Buffer.from(`${TEXT_KEYWORD}\0`, "latin1"), Buffer.from(base64, "ascii")]);
  if (textData.length > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxChunkBytes) {
    throw new Error("Character Card tEXt chunk exceeds maxChunkBytes");
  }
  const firstIdatIndex = baseChunks.findIndex((chunk) => chunk.type === "IDAT");
  if (firstIdatIndex < 1) throw new Error("PNG has no legal Character Card insertion point");
  const outputChunks = [
    ...baseChunks.slice(0, firstIdatIndex),
    { type: "tEXt", data: textData },
    ...baseChunks.slice(firstIdatIndex),
  ];
  const outputPng = assemblePng(outputChunks);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.png-export-receipt`,
    carrierConvention: "png_text_keyword_chara_base64_utf8_json",
    sourcePngHash: sha256(parsedPng.bytes),
    basePngHash: sha256(basePng),
    outputPngHash: sha256(outputPng),
    cardHash: hashStarcraftTmgContract(parsedCard.card),
    serializedJsonHash: sha256(parsedCard.jsonBytes),
    jsonByteLength: parsedCard.jsonBytes.length,
    encodedTextByteLength: textData.length,
    replacedCharaChunks,
    insertedBeforeFirstIdat: true,
    imageChunksPreserved: true,
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  return Object.freeze({
    png: outputPng,
    carrierPng: basePng,
    card: deepFreeze(parsedCard.card),
    serialized: parsedCard.serialized,
    receipt: sealReceipt(unsigned),
  });
}

export function extractStarcraftTmgCharacterCardV2JsonFromPng(pngInput) {
  const parsedPng = parsePng(pngInput);
  const charaChunks = parsedPng.chunks.filter((chunk) =>
    chunk.type === "tEXt" && textChunkKeyword(chunk.data).keyword === TEXT_KEYWORD);
  if (charaChunks.length !== 1) {
    throw new Error(`PNG must contain exactly one ${TEXT_KEYWORD} tEXt chunk`);
  }
  const { textBytes } = textChunkKeyword(charaChunks[0].data);
  const base64 = textBytes.toString("ascii");
  if (base64.length < 4 || base64.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error("Character Card PNG payload is not canonical base64");
  }
  const jsonBytes = Buffer.from(base64, "base64");
  if (jsonBytes.length > STARCRAFT_TMG_CHARACTER_CARD_PNG_LIMITS.maxCardJsonBytes
    || jsonBytes.toString("base64") !== base64) {
    throw new Error("Character Card PNG payload exceeds limits or is non-canonical");
  }
  let serialized;
  try {
    serialized = UTF8_FATAL.decode(jsonBytes);
  } catch {
    throw new Error("Character Card PNG payload is not valid UTF-8");
  }
  const parsedCard = parseCardJson(serialized);
  const carrierChunks = parsedPng.chunks.filter((chunk) => chunk !== charaChunks[0]);
  const carrierPng = assemblePng(carrierChunks);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.png-extract-receipt`,
    carrierConvention: "png_text_keyword_chara_base64_utf8_json",
    inputPngHash: sha256(parsedPng.bytes),
    carrierPngHash: sha256(carrierPng),
    cardHash: hashStarcraftTmgContract(parsedCard.card),
    serializedJsonHash: sha256(jsonBytes),
    jsonByteLength: jsonBytes.length,
    charaChunkIndex: charaChunks[0].index,
    exactSerializedPayloadRetained: true,
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  return Object.freeze({
    card: deepFreeze(parsedCard.card),
    serialized,
    carrierPng,
    receipt: sealReceipt(unsigned),
  });
}

export function exportStarcraftTmgCharacterCardV2Png(characterPackage, pngInput, input = {}) {
  const jsonExport = exportStarcraftTmgCharacterCardV2JsonV2(characterPackage, input);
  const pngExport = embedStarcraftTmgCharacterCardV2JsonInPng(pngInput, jsonExport.serialized);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.combined-export-receipt`,
    characterPackageHash: jsonExport.receipt.characterPackageHash,
    cardHash: jsonExport.receipt.cardHash,
    serializedJsonHash: jsonExport.receipt.serializedJsonHash,
    outputPngHash: pngExport.receipt.outputPngHash,
    jsonReceiptHash: jsonExport.receipt.receiptHash,
    pngReceiptHash: pngExport.receipt.receiptHash,
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  return Object.freeze({
    png: pngExport.png,
    carrierPng: pngExport.carrierPng,
    card: jsonExport.card,
    serialized: jsonExport.serialized,
    jsonReceipt: jsonExport.receipt,
    pngReceipt: pngExport.receipt,
    receipt: sealReceipt(unsigned),
  });
}

export function importStarcraftTmgCharacterCardV2Png(pngInput, options = {}) {
  const extracted = extractStarcraftTmgCharacterCardV2JsonFromPng(pngInput);
  const imported = importStarcraftTmgCharacterCardV2JsonV2(extracted.serialized, options);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_PNG_ADAPTER_VERSION}.combined-import-receipt`,
    inputPngHash: extracted.receipt.inputPngHash,
    carrierPngHash: extracted.receipt.carrierPngHash,
    cardHash: imported.receipt.cardHash,
    serializedJsonHash: imported.receipt.serializedJsonHash,
    characterPackageHash: imported.characterPackage.integrity.hash,
    importClass: imported.receipt.importClass,
    transportIntegrity: imported.receipt.transportIntegrity,
    exactSerializedPayloadRetained: true,
    productionSelectable: imported.receipt.productionSelectable,
    pngReceiptHash: extracted.receipt.receiptHash,
    jsonReceiptHash: imported.receipt.receiptHash,
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  return Object.freeze({
    ok: true,
    card: imported.card,
    serialized: imported.serialized,
    carrierPng: extracted.carrierPng,
    characterPackage: imported.characterPackage,
    jsonReceipt: imported.receipt,
    pngReceipt: extracted.receipt,
    receipt: sealReceipt(unsigned),
  });
}
