import path from "node:path";

// Per-call local selection: an earlier room's ready entry cannot leak into an
// empty later room log. This is launcher identity, not Rules/strategy validation.
export function readStarcraftTmgOwnedHostEntryV1(stdout, expected) {
  if (!expected?.roomId || !expected?.dataDirectory) {
    throw new Error("OWNED_HOST_EXPECTED_IDENTITY_REQUIRED");
  }
  let selected = null;
  for (const line of String(stdout || "").split("\n")) {
    let candidate;
    try { candidate = JSON.parse(line); } catch { continue; }
    if (!candidate?.origin || !candidate.runnerToken
      || candidate.roomId !== expected.roomId) continue;
    assertStarcraftTmgOwnedHostEntryV1(candidate, expected);
    selected = candidate;
  }
  return selected;
}

export function assertStarcraftTmgOwnedHostEntryV1(entry, expected) {
  if (!entry || entry.roomId !== expected?.roomId
    || typeof entry.dataDirectory !== "string"
    || path.resolve(entry.dataDirectory) !== path.resolve(expected.dataDirectory)) {
    throw new Error("OWNED_HOST_ENTRY_ROOM_DIRECTORY_MISMATCH");
  }
  const origin = new URL(entry.origin);
  if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"]
    .includes(origin.hostname) || typeof entry.runnerToken !== "string"
    || !entry.runnerToken.length) {
    throw new Error("OWNED_HOST_ENTRY_LOCAL_ORIGIN_OR_TOKEN_INVALID");
  }
  return entry;
}
