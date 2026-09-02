# Ticket 13 / Slice 122 — Character Card V2 PNG

Status: complete.

## Outcome

Slice 122 adds an explicitly versioned Character Card V2 PNG Adapter without
rewriting the existing JSON-only v1 Adapter. It implements the interoperable
carrier as one PNG `tEXt` chunk with lowercase keyword `chara`; the value is
canonical base64 of UTF-8 `chara_card_v2` / `2.0` JSON.

The format binding records the public V2/V1 specifications, the current unified
PNG clarification and the PNG textual-chunk definition. This format research
does not refresh or change the frozen StarCraft official-data source lock.

## Strict Project D path

- Export embeds the complete sealed CharacterPackage and a v2 transport binding
  over every card field before calculating JSON and PNG receipts.
- Import verifies every PNG chunk CRC, exact canonical base64, fatal UTF-8,
  V2 JSON shape, transport payload hash and CharacterPackage hash.
- A valid-CRC modification to any sealed card field is still rejected by the
  transport binding.
- The old JSON v1 Adapter remains hash-frozen at
  `14e30a6af293b14a7a0875f1c7f6f33056c23caef71f2c34cae33d25d436f510`.
  Old Project D cards that lack the new dependency are not silently accepted by
  v2; callers must explicitly use the historical v1 path.

## PNG safety and exactness

- Input/output, per-chunk, chunk-count, text-count, JSON payload, dimensions and
  pixel-count are bounded before the card reaches the character importer.
- Unknown critical chunks, malformed structure, CRC drift, duplicate `chara`
  chunks, non-canonical base64 and invalid UTF-8 fail closed.
- Unknown ancillary chunks and the image carrier are preserved byte-exactly.
  JSON → PNG → JSON preserves the exact serialized bytes; extracting the carrier
  and re-embedding those bytes reproduces the exact PNG.
- The development proof generates
  `build/character-card-v2-png-v2/kerrigan-primal-card-v2.png` using the accepted
  1254-square neutral dialogue portrait. It remains rights-gated and not public.

## External-card boundary

External V2 cards retain their exact serialized payload, unknown data fields and
extension namespaces for round-trip. Their system prompt, post-history prompt
and message examples are hash-recorded but quarantined. The derived package is
untrusted Companion-only, cannot apply actions, cannot provide match state and
cannot become production-selectable or training truth.

## Evidence

- Focused verifier: 12/12 assertions.
- Standard binding: `8143ffca7853f5c0f787c305f347c20e86c3e3e4b81fbe599d19db65b3ebc254`.
- JSON card: `d03111180b2885967712e1f642b28fd2dba9d96082ab8b98cdf42311d3618d23`.
- PNG output: `7b327c1db48d0a214a6dd5d602903e74d77a933392863d0312bfc8aacff705b1`.
- Verification report: `0611997871de49d9497deb36e39501b38231e0eecfaf8de3fea628b76c549d0d`.
- Adjacent historical worldbook JSON and dynamic portrait gates remain green.

## Authority

The Adapter is import/export carriage only. It has no Rules, room, Provider,
memory, Skill, DSH, MuZero, self-play or training-promotion authority.
