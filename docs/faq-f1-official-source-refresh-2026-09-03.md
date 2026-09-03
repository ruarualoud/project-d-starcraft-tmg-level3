# FAQ F1 — official FAQ V1.0 source refresh

Date: 2026-09-03
Status: source captured and immutable lock created; rules promotion remains false

## Outcome

The explicit user-authorized refresh captured the current official
[Downloads page](https://starcraft-tmg.com/downloads) and its linked
[FAQ V1.0 PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf).
The PDF remains byte-identical to the earlier audit: 333,711 bytes, five pages,
SHA-256 `eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c`,
ETag `"6a96e50b-5178f"`, and `Last-Modified: Tue, 01 Sep 2026 14:45:31 GMT`.

The Downloads inventory contains 24 unique first-party PDF URLs. A
`pdftotext -raw` derivative produces an exact 68-entry, eight-section semantic
index. The index stores only question/answer hashes in the tracked lock; it
does not redistribute the FAQ body or claim an independently reviewed license.

## Version boundary

The prior source lock
`1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
is not changed. Its historical rooms, old-rule display and Replay remain
available. The new FAQ lock is additive and is not yet Rules, production-room
or training truth. FAQ F2 must classify all 68 entries; FAQ F3–F5 must add and
prove any required source-versioned behavior before a current room can bind it.

## Evidence

- Official publisher sources: the Downloads page and FAQ PDF linked above.
- Source verifier: `scripts/verify-official-faq-v1-source-lock-v1.mjs`.
- Source lock: `packages/source-data/official-faq-v1-source-lock-v1.mjs`.
- Captured bytes remain in the ignored, content-addressed source-intake build
  directory and are required to reproduce the verifier report.

No Provider, DSH, Skill generation, MuZero export, self-play or training
promotion ran in F1.
