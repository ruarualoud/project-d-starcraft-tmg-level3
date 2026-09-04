# Ticket 16 Slice 162 — DeepSeek direct Provider source note

Date: 2026-09-04
Scope: online OpenAI-compatible Provider call only; this is not DeepSeek
Harness and does not authorize Ticket 17 Skill generation

## Official findings

DeepSeek's official first-call page documents the OpenAI-compatible base URL as
`https://api.deepseek.com`, the non-stream chat route as
`/chat/completions`, and the current aliases `deepseek-v4-flash` and
`deepseek-v4-pro`. It identifies `deepseek-v4-flash` as
DeepSeek-V4-Flash-0731. Source:
[DeepSeek first API call](https://api-docs.deepseek.com/).

The official Chat Completions reference declares JSON Object response mode,
the requested and reported model fields, the backend system fingerprint, and
usage fields for prompt, completion, cache-hit, cache-miss and reasoning
tokens. Source:
[DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/).

The official pricing page prices one million tokens and defines weekday UTC
peak windows as 01:00–04:00 and 06:00–10:00. For `deepseek-v4-flash`, the
off-peak cache-hit/cache-miss/output rates are USD 0.007/0.22/0.66 per million;
peak rates are USD 0.014/0.44/1.32. The code stores integer nano-USD per-token
rates so the calculation has no binary floating-point rounding. The Provider's
invoice remains authoritative. Source:
[DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing/).

## Captured source identity

Captured at `2026-09-03T20:00:03Z`:

- First-call page SHA-256:
  `fc590e5b2cc856c798d46314828dd790320e177317121a1864ef5428991d12d7`.
- Chat API page SHA-256:
  `67b6a6c8ab70f51ad56f6018077ac58768d95f73b53639b4d00b3f6d57a4fad9`.
- Pricing page SHA-256:
  `cf2c6fb2dd8a32a538f12a8176175b8809a3516326a5cb30dfe52d63c490a968`;
  ETag `9ab0c63f83efd925aaa77a4d8bcfa20a`; last modified
  `2026-08-28T05:44:12Z`.

No StarCraft rules/data source was refreshed by this Provider-source check.
