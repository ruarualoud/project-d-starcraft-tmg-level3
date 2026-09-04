# Ticket 16 Slice 162 — live Provider closure

Date: 2026-09-04
Status: complete
Ticket progress: 10/10 Slices; project progress: 15/22 Tickets

## Implemented before the live call

- A server-owned `deepseek-v4-flash` direct Provider profile targets only the
  official `https://api.deepseek.com/chat/completions` endpoint. It is a normal
  online OpenAI-compatible call, not DeepSeek Harness; DSH remains forbidden
  outside Ticket 17 offline Skill generation.
- The response receipt now safely carries cache-hit/cache-miss/reasoning usage
  and hashes the Provider system fingerprint. Raw response buffers are zeroed,
  and encoded copies of the current credential are rejected before parsing.
- The official price snapshot is represented as integer nano-USD per-token
  rates. It computes the documented weekday UTC peak windows without floating
  point and labels the result as a calculation, never as the authoritative
  Provider invoice.
- The one-call runner composes the real authenticated Agent session, explicit
  disclosure/consent, server profile registry, isolated egress child, SQLite
  WAL durable reservation/dispatch/settlement and explicit detach path.
- A successful receipt prevents a second run. An attempt lock is written before
  attachment/egress; any ambiguous interruption requires new human review and
  authorization instead of an automatic rerun. An existing attempt lock is
  rejected before stdin is read, and the atomic lock is claimed before the
  runtime is composed.
- A credential is accepted only from an anonymous stdin byte pipe after both
  `--authorize-live-provider-once` and
  `--attest-rotated-after-chat-exposure`. It is never accepted from argv,
  environment variables, a file path or chat.

## Current evidence

- Preflight: 20/20, stable report
  `149c1b63234a1483e81051320e58b2d5ef35cbf4ef6631730949c09c78973b9b`.
- Contract:
  `41ea537e6cd36033172835ccbd146e8cf57a364bbb0eff1fc1861fbb9375a54f`.
- Live Provider profile:
  `29a6f468402764628351cd4d0de5f77394e46053d54c5dc261856c8e001b32dd`.
- Pricing snapshot:
  `79b7bab2c03374c5a977250b88e9719e06b3dec7296607dfcec154b3ad740cd1`.
- One explicitly authorized call returned HTTP 200 from
  `api.deepseek.com`, reported `deepseek-v4-flash` and mapped to the frozen
  official release `DeepSeek-V4-Flash-0731`. It used 2,424 input tokens and
  44 output tokens, with zero cache-hit and 2,424 cache-miss input tokens.
- The off-peak calculated cost is 562,320 nano-USD (`$0.00056232`). This is a
  snapshot-derived calculation rather than a Provider invoice.
- Live report:
  `196cea0244615654c08b4c4747f8f89cf2d0af14805fc66efeb9f0df3bed5e01`;
  safe Provider receipt `00046a49...5b65c`; response fingerprint
  `c4813381...1c4061`; Provider system-fingerprint hash
  `c4414aee...f3859`.
- Live closure: 16/16, final aggregate-run report
  `7fd88ea25ea120811f7bd06b88ab71d550a1e6ebc5c3a7ea8d15818b27fd138f`;
  the post-aggregate Chromium-rerun closure is also 16/16 at
  `29d18202552a3de2efa200e236aee66e11d187da351394341eb1c5d3e82890d4`.
- Full Ticket 15 predecessor through Ticket 16 Slice 162 aggregate exited
  successfully. Slice 162 contributes 36 fixed assertions and raises the
  cumulative Ticket 16 denominator from 495 to 531.
- Real egress Worker composition attach/detach ran with a synthetic byte
  sentinel and zero external request. Encoded-echo rejection used an injected
  HTTPS response. Slice 156 egress remains 40/40 and Slice 159 durable Gateway
  remains 36/36.
- Slice 161's raw Chromium report hash includes raster screenshot bytes and is
  retained as historical evidence rather than reused as a cross-run identity.
  Slice 162 binds the stable behavioral/environment projection
  `be6435cb...714452`, while still re-hashing all three screenshot files against
  each current browser report. The live receipt therefore retains the raw
  report hash observed at call time as an audit value; closure does not require
  it to equal a later Chromium rerun's raster-dependent raw hash.

## Closure and regression finding

The first post-live aggregate exposed a verifier defect rather than a Provider
failure: Chromium screenshots can have different byte hashes on equivalent
runs, so requiring the live-time raw browser report hash to equal a later run
failed 14/16 even though both runs passed 16/16. The closure verifier now keeps
the live-time raw hash as audit evidence, compares the frozen semantic evidence
hash across runs and separately verifies every current raster against its
current report. The original failure reproduces before the change and the same
live evidence passes 16/16 after it.

The user-facing `403 Forbidden` observed during the interruption was not the
DeepSeek call: the sealed live receipt proves Provider HTTP 200 before that
interruption. No second Provider attempt was made.

No StarCraft source refresh, Skill generation, DSH, MuZero export, self-play,
Memory write or training promotion occurred. The replacement credential was
accepted only for the bounded call, zeroed and detached; neither it nor its
hash is stored. Ticket 17 owns the next offline DSH Skill-generation Adapter.
