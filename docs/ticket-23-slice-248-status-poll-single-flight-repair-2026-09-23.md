# T23 / S248 — bound overlapping Web status reads

## Evidence and cause

The real observer's manifest/refresh stages were taking 10–35 seconds. During
Round 1 Cleanup, an additional read-only manifest probe timed out at 20 seconds
and a Marine portrait HTTP probe timed out at 30 seconds. Meanwhile SQLite
showed r44 already accepted; a stale progress file was not evidence of a stopped
match. Service PID 24843 was active on CPU, not a dead process.

`AgentAgentMatchControl` launched a full `/__ticket23/a2a/ui-status` read every
2.5 seconds with `setInterval`, plus a post-drive read. Neither path excluded an
already pending read. Each request constructs the Room, both Bot/Provider
projections and orchestrator summary. Deferred-response reproduction using the
actual component callback started **three concurrent HTTP reads**. This proves
an amplification bug; it does not prove the only cause of all server latency
or all blank portraits.

## Minimal change

One component-scoped pending-read ref coalesces overlapping status reads.
`finally` releases it on success, HTTP failure and network failure. The next
normal tick still obtains fresh state. Complete response content and all
decision, query, Rules, Skill, output-budget and screenshot capabilities stay
unchanged. Drive POST behavior and the server's job deduplication stay unchanged.
No cached snapshot is substituted for a new authoritative action.

## Focused verification

- `node scripts/verify-ticket-23-slice-248-status-poll-single-flight-v1.mjs`:
  actual callback, deferred HTTP response; fail-first **3 !== 1**, then exactly
  one green run (0.35 s). Checks full manifest preservation, successful release,
  network-failure release, and hiding an unavailable experimental endpoint.
  This is a callback seam test, not a browser-layout or end-to-end model test.
- `npm run export:web:local` in `apps/starcraft-tmg-expo`: run once because the
  changed TSX is served through the generated Web bundle. Passed; 1,424 Web
  modules / 14 routes, Web bundling 182.984 s. Existing non-blocking npm config
  and Browserslist-age warnings were not used to install or refresh anything.

New Provider calls / paid tokens / cost: **0 / 0 / ¥0**. No previously passed
Rules, strategy or full-suite verification was rerun.

## Same-match continuation

The parent runner was suspended before another trigger. At r45 a pending Apply
was still settling, so the service was left alive. Only its owned observation
browser was closed to stop old polling. At r46 read-only durable evidence then
proved 7 replay-prefix + 39 new applied/replayed actions, no pending Apply and
no pending Provider decisions. The old service and runner 5379 exited; new
runner **72606** resumes the same Room with the rebuilt Web bundle.

r46 is **Round 2 / start_of_round**, score **0–0**, first player **player2**.
Recorded initiative rolls were [6,2] versus [2,6] (tie), then [4,1] versus [5,2]
(Zerg wins). These are real recorded dice, not manually chosen initiative.
Usage remains 96 calls / 9,529,523 accounted units / estimated ¥12.802140,
including the previously disclosed unknown-response reservation.

No new latency improvement is claimed until the resumed live measurements are
available. T23 stays 33/36; S248 full match, S249 review and S250 synthesis are
open. Existing accepted actions and public plans are not rerolled.

## Remaining visual/performance work (non-blocking for strategy)

- Some abstract-board captures contain empty portrait areas. The abstract
  screenshot branch only awaits two paint frames, not image decode. Slow HTTP
  is observed, but failure/paint/readiness attribution still needs a targeted
  browser trace. Preserve those captures honestly, not as media acceptance.
- The media adapter still explicitly prefers a generated Goliath fallback in
  the default user-authorized channel, contrary to the requested common SC1
  portrait policy. Track that UI/media selection defect separately; do not
  confuse it with incorrect Goliath rules data or rewrite assets during play.
- Measure projection construction and serialization after removing overlap;
  avoid truncating decision material or cutting planning to mask read overhead.

Harness loop: selfplay_agent_prompt; Web drive → Rules Apply/Replay plus public
decision evidence. Only observer transport changed. Memory/strategy/Skill
inputs are untouched; no training or automatic promotion is approved.
