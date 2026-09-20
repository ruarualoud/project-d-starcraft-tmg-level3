# Ticket 23 / Slice 247 — Structured-output reliability note v1

Date: 2026-09-15

## Finding

The live agent used native tool calling but disabled the Provider's JSON output
mode whenever tools were present. The final Planner and Action messages were
therefore unconstrained text despite the prompt asking for JSON. Captured live
responses repeatedly contained one redundant closing brace. Retrying the model
was treating a transport configuration defect as stochastic model behaviour.

DeepSeek's Chat Completions reference exposes `tools` and
`response_format: {"type":"json_object"}` on the same request contract and
states that JSON output guarantees a valid JSON message. Its JSON Output guide
also requires an explicit JSON instruction and sufficient output capacity. The
current prompt already contains the explicit instruction and the output budget
is stage-owned. Sources:

- [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
- [DeepSeek JSON Output guide](https://api-docs.deepseek.com/guides/json_mode/)

DeepSeek's Responses API additionally supports a `json_schema` text format.
DeepSeek strict function schemas are available in beta. OpenAI documents the
general engineering reason for preferring structured output: constrained
decoding prevents syntactically invalid tokens, while JSON mode alone does not
guarantee semantic schema adherence. Sources:

- [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/)
- [DeepSeek strict tool calls](https://api-docs.deepseek.com/guides/tool_calls/)
- [OpenAI Structured Outputs and constrained decoding](https://openai.com/index/introducing-structured-outputs-in-the-api/)

## Adopted reliability ladder

1. Chat transport always enables Provider-native JSON mode for final message
   content, including rounds that also expose native tools.
2. Native tool arguments remain JSON-Schema-described and Host-validated.
3. The Host stores the raw Provider outcome and performs deterministic grammar
   recovery only for old/persisted responses or unsupported Provider modes.
4. Equivalent field representations are normalized locally without inventing
   rules or strategy. All remaining semantic contract defects are reported in
   one aggregate correction, not one field per paid retry.
5. Rules queries return typed repair context for a rejected parameterized
   proposal. This context may repair the same candidate but never proves it
   legal; only a later exact Rules receipt can do that.
6. Retry resumes the failed stage and resets only per-cycle convergence
   counters. Durable attempts, cost, public rationale, tools and authority
   receipts remain in the audit journal.

## Upgrade seam

The existing Provider registry keeps the completion path outside decision
logic. A future transport profile can move from `/chat/completions` JSON mode to
`/responses` plus `text.format.type=json_schema` without changing the Planner,
Action, memory, Rules-query or apply contracts. That migration should be gated
per Provider/model because Chat Completions currently documents only
`json_object`, while Responses documents `json_schema`.

Structured output solves syntax and shape reliability; it does not make game
facts or placements correct. Those remain the responsibility of current-state
Rules queries, exact proposal instantiation, and the authoritative apply gate.
