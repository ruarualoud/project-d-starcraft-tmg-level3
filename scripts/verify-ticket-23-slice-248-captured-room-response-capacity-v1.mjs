import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createHttpStarcraftTmgAuthoritativeTransportAdapter } from
  "../packages/client-domain/authoritative-transport-adapters-v1.mjs";

const text = await readFile(process.argv[2], "utf8");
const response = JSON.parse(text);
const bytes = Buffer.byteLength(text);
assert.ok(bytes > 4 * 1024 * 1024, "the actual r52 response crossed the old default");
const warnings = [];
const options = { baseUrl: "http://127.0.0.1",
  fetchImpl: async () => ({ text: async () => text }),
  onResponseSizeWarning: warning => warnings.push(warning) };
const adapter = createHttpStarcraftTmgAuthoritativeTransportAdapter(options);
let result;
await assert.doesNotReject(async () => {
  result = await adapter.execute({ operation: "read_room", roomId: "captured-r52" });
}, "a valid full Room response must not fail because of the unconfigured 4 MiB default");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
assert.equal(hash(result), hash(response.result), "preserve every returned field");
assert.equal(warnings.length, 1);
assert.equal(warnings[0].bytes, bytes);
assert.equal(warnings[0].operation, "read_room");
const bounded = createHttpStarcraftTmgAuthoritativeTransportAdapter({ ...options,
  maxResponseBytes: 4 * 1024 * 1024 });
await assert.rejects(() => bounded.execute({ operation: "read_room", roomId: "captured-r52" }),
  error => error.code === "TRANSPORT_RESPONSE_TOO_LARGE",
  "a caller's explicit hard capacity policy remains enforced");
console.log(JSON.stringify({ responseBytes: bytes, preservedResultHash: hash(result),
  warningCount: 1, explicitHardLimitRetained: true, providerCalls: 0, roomMutations: 0 }));
console.log("CAPTURED_ROOM_RESPONSE_CAPACITY_OK");
