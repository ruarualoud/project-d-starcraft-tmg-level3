# T23 / S248 — native tool output capacity repair

## Actual stopping point

Run `20260922172710914` stopped at authority r23 after Corpser deployment.
r24 was never applied. Both seats remain `deepseek-flash`; cumulative usage
at the stop was 57 physical calls, 5,032,332 units and estimated ¥6.675492.
All accepted transitions and screenshots remain intact.

The r23 Planner's first terminal submission (7,477 output tokens) claimed no
current-round enemy stationary fire across the western units. That conflicts
with a range-qualified Swarmling/Goliath Scatter Missiles relationship whose
LOS is unknown. This was a real unsupported claim, not a reason to weaken the
semantic rule or substitute a preferred strategy. It remains counted.

The next two terminal submissions each consumed exactly 8,192 output tokens,
the configured request maximum, and were stored as empty arguments plus
`arguments_invalid_json`. The transport discarded their original arguments
and `finish_reason`. Therefore truncation is **strongly suspected, not proven**
for these historical calls; their lost bytes cannot be recovered. Do not
retroactively claim that they have become valid plans.

## Engineering correction

- Native tool responses now preserve `finishReason`. A `length` result is
  typed `output_truncated`, even when the partial output happens to be valid
  JSON. It cannot execute queries, become a plan, or reach Apply.
- Truncation stops without an automatic same-capacity semantic retry. The
  response and paid usage remain recorded. Explicit resume still requires
  larger request capacity.
- Live request output capacity is server-owned 32,768, consistently wired
  through decision reservation, supervisor, registry and actual HTTP body.
  Each attempt records its requested maximum/policy version; the egress
  receipt records maximum and finish reason. The historical frozen profile,
  model, strategy Skills, Prompt and old receipts are unchanged.
- Tool argument request/response transport envelopes now share a 256 KiB
  byte limit (within the existing 1 MiB worker envelope), replacing duplicate
  64K checks. This is transport capacity, not a prose-length instruction.
- Explicit historical recovery records the two processed, saturated terminal
  JSON failures as `legacy_cap_saturation_inference`. Only these are excluded
  from the semantic-failure count: stored count 3, effective semantic count 1.
  Same-capacity recovery, ordinary short malformed JSON, unapproved retry and
  repeated admission of the same raised capacity are rejected. No counters,
  cost ledger, original outputs or findings are erased. Genuine semantic
  corrections remain bounded at three. Old findings close only after a
  successful authoritative Apply/Replay.

Official API reference checked 2026-09-23: [DeepSeek models and capacity](https://api-docs.deepseek.com/quick_start/pricing/)
lists Flash maximum output 384K; 8,192 was our request setting, not that model's
maximum. No official game data was refreshed.

## Focused verification only

`node scripts/verify-ticket-16-provider-egress-allowlist-v1.mjs --live-tool-output-capacity-only --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914`

1. Initial red reproduced the native branch misclassifying `length` as
   `arguments_invalid_json` through the injected HTTP transport.
2. First repair check exposed the duplicate response-side 64K check; fixed
   both request and response to use the same constant.
3. One post-change green completed in 0.65 s. It covers truncated malformed
   and truncated valid JSON, ordinary malformed JSON, a 70K valid tool body,
   actual 32,768 wire request, unchanged frozen profile, forbidden caller
   overrides, and read-only recovery classification of the actual r23 record.

Zero live Provider requests, zero Room mutation, no old/full gate repeated.
The changed decision and stack consumers are loaded by the same narrow gate.
This proves engineering behavior, not the quality of the next model strategy.

## Continuation / performance

Resume the same r23 Room with its paid query receipts and full strategic
context. Do not reroll earlier legal choices. Continue paired Web screenshots
and Replay per accepted action. Two capacity-saturated outputs consumed
238,169 total units, 16,384 output units, and approximately 67 seconds of
generation; record this wasted capacity cycle in the performance ledger.
Strategy quality takes precedence over latency/token reduction. No online
Skill changes or promotion to training truth are performed.

`harnessLoopUsed: true`; route `selfplay_agent_prompt`; corrected components:
Provider egress → live Planner/Action capacity and explicit recovery;
Rules/Preview/Apply/Replay unchanged; memory records unchanged;
rollback trigger: misclassified ordinary invalid output or any truncated
output accepted for execution. T23 remains 33/36, S248 in progress.
