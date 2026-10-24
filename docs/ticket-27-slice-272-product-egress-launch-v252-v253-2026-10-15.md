# S272 v252/v253 — shared request encoding and preset Room entry

T27 5/6; T23 33/36; main remaining 272/248/249/250 (4); accepted complete experiments 0/12. No new Room or game launched.

## Delivered

- The actual A Teach revision still exceeded input capacity after v251 only encoded B's decision context. Moved the existing exact duplicate-evidence encoder into `roster-prompt-evidence-encoding-v1.mjs` and applied it at the shared secure Provider egress. New requests carry explicit request-root references; existing nested reference scopes remain unchanged. Unique facts and strategy are not summarized or removed. Semantic context identity stays unchanged; physical request identity and encoding version are recorded. Old explicit retries retain their original encoding.
- Fixed-army launch now has `POST /sessions/:id/launch-room`, shared Expo client and Web button. Only the session ID crosses this interface; browser-supplied Plan/army data cannot become launch authority. Product admission reads the current persisted Plan, completed Teach/source review, Builder verdict and configured map. Existing Room host dispatches its fixed-roster path and independently binds the resulting Room.
- Existing AI-written army launch and fixed-army launch use the same process host. This is **not** proof of complete Web/App/human-vs-agent parity: host still opens `agent_vs_agent`, native navigation remains unavailable, and no real UI-to-first-bot-action acceptance has been performed.

## Focused verification

Evidence base: `build/ticket-23-three-arm-performance-baseline-20261010-v1`.

- `verify-slice272-shared-request-encoding-v252.mjs`: actual saved A request + shared secure factory. RED reproduced 3499565 input characters; one GREEN reduced them to 2221737 (-36.51%) with exact expansion equality and unchanged semantic context. Local Worker capture only; zero Provider/Rules/original-draft writes. `shared-request-encoding-v252-pass.json`.
- `verify-slice272-preset-launch-route-v253.mjs`: RED route404, one GREEN checks route forwarding and unavailable-host rejection. Zero real Rooms/Provider calls. `preset-launch-route-v253-pass.json`. This is an HTTP-adapter test, not a real host/browser test.
- Changed product module and process host passed `node --check` once. Two changed TS/TSX files passed one actual local TypeScript transpilation. REPL import attempts failed before transpilation; native project TypeScript performed the check. No whole-app build or old passed gates rerun.

## Real generation and recovery

A v251 PID84760 ended with confirmed context400. Original replies and unknown fee remain. A resumed through the same product Run as PID95457 (`--resume-product-v252`), same fresh-v249 session `rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46`. At 10:44Z it had progressed to Plan4/source review after product-owned source correction,34 successful fresh calls/3882846 reported tokens. Not accepted yet.

B PID84767 remained active; no duplicate process or paid resend. Its fresh-v249 session `iterative-web-49d00139-8b9a-4c89-a984-ee911b62771a` reached a legal2000 army at revision6, then draft Teach/query recovery. At10:44Z23 successful fresh calls/6548881 reported tokens; not accepted. It loaded v251 before shared v252 egress changed: next legitimate restart must use current code; do not kill an in-flight paid call solely to reload.

Read current progress and actual PID before any recovery. Fresh usage is additional to `previousProduction`; unknown fees are never zeroed. Old Plan9/19 and v240 sessions remain untouched. Counts here are observations, not current-state substitutes.

## Remaining product acceptance

1. Finish fresh A/B product Run with current accepted Teach, no unresolved source/engineering issues, real Plan inspection.
2. Product start must own mode/seat configuration, accepted Plan/map admission and recovery. Experiment adapters may select input configurations and collect evidence, not supply a second strategy/repair/launch implementation.
3. Human mode must use the same bot decision/query/memory/apply path, with human seats and human physical tasks preserved; changing the mode label on a two-bot process is insufficient.
4. Exercise real Web creation → Run → accepted Plan → Room → first legal bot action and reconnect. Native navigation requires its own integration evidence; no Android-device claim.

Harness loop used; routes roster strategist/Teach/fact probe; evidence saved public requests, typed tool results and local gates. No new UI screenshots, training promotion, subagents, install, cleanup, commit or push. Skill-guided choice: move shared encoding and orchestration to product seams rather than add experimental repair behavior.
