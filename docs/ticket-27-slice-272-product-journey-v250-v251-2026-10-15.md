# Ticket 27 / Slice 272 — product-owned preset journey and fresh-run repairs

Status: in progress. T27 5/6, T23 33/36, main remaining slices 272/248/249/250 (4), accepted complete experiments 0/12. No Room launched.

## Requirement and delivered boundary

The user requires Web/App starts to use the same product workflow as experiments. B already uses the product iterative Run. A previously used individual workspace methods but the experiment script owned the full order; that was not product parity.

Implemented a product-owned fixed-army coordinator over the EXISTING workspace, Rules and Teach methods:

- `POST /sessions/:id/run`: generate/resume Plan → Rules-audited arrival → source review/qualification → cited correction → Teach/query correction → structured Plan application → review the resulting Plan.
- Persist phase, issue progress, query-recovery attempts and accepted Plan version in the same session draft. Repeated Run while active is idempotent. Restart preserves paid replies; ambiguous sends remain stopped for existing dispatch recovery.
- Preset creation and resume in the shared Expo Web/App client now use this endpoint. Polling includes the whole journey, not just generation/review. Pause/cancel reaches the coordinator as well as active workspace work.
- The fixed-army Room bridge now requires current completed Teach application and current source review. A legacy/manual generated Plan alone cannot bypass the new workflow.
- Fresh v249 A observer now only calls Run, polls, pauses, accounts and exports. Old v240 recovery modes remain historical; they are not the fresh acceptance path.

This is **not yet full client-start-to-Room acceptance**. The fixed-plan launch button/host route, human-vs-agent mode integration, native-app navigation, and real UI→Room→first-agent-action evidence remain to be delivered. Current existing iterative launch is Web-only/agent-vs-agent. Do not describe the entire product as completed.

## Actual production discoveries

Fresh A's original PID43257 disappeared after one completed foundation reply. Durable draft had no uncertain Provider request: its sole dispatch was completed/known. Product Run v250 resumed that session, reused the foundation and completed Teach challenge (273425 new tokens). It then stopped on `ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS`.

That error was **not a network/charge ambiguity**: a model query combined `kind=map_route`, Native `map.route_access`, native arguments and active legacy route fields. Normalization threw before the evidence port's correctable-query boundary. v251 returns an explicit unknown/correction receipt with the original request, instead of executing either guessed interpretation or aborting the whole Plan. Authority/scope/mutation violations still throw.

Fresh B completed early Teach on its provisional 960-point army, then the next decision's request grew to 4371045 bytes. Three requests received confirmed HTTP400 context-length rejection; terminal r5, no match. The 4341897-character decision content included 3089361 characters of draft Teach feedback, including the same large attack results in follow-up and computed-outcome fields.

v251 extracts the existing same-prompt interner as a reusable encoding function and applies it only to new iterative context v14. It preserves every unique value and strategy string exactly; references point to full values in the SAME prompt, not unavailable archived facts. Old v13 pending/paid contexts remain unchanged. Confirmed capacity rejection now stops after one occurrence; ordinary Run may advance a settled rejection only after a changed context version, preserving the old ledger. Unknown network sends do not qualify.

## Focused evidence (do not rerun passed checks)

Evidence base: `build/ticket-23-three-arm-performance-baseline-20261010-v1`.

1. `verify-slice272-preset-product-parity-v250.mjs`: actual HTTP adapter + actual coordinator, deterministic external workspace boundary. RED: all3 scenarios returned404. One GREEN: fresh full order, unresolved Teach cannot accept, restart/completed work does not regenerate. `preset-product-parity-v250-pass.json`. Zero Provider/Room calls. This does not prove actual model or browser behavior.
2. Changed client/panel TS/TSX transpiled once with local TypeScript, 0 syntax errors. Not a whole-app typecheck/browser test.
3. `verify-slice272-fresh-failures-v251.mjs`: saved actual A public challenge and B rejected input. RED reproduced uncaught query conflict and oversized duplication. Separate capacity-recovery RED showed the known rejection incorrectly remained active. One combined GREEN passed all3; `fresh-failures-v251-pass.json`. Exact expansion/hash equality: 4341897→2057819 characters (52.60% smaller), not a claimed token/latency/strategy improvement. No Provider, Native action or original-draft writes.

## Latest continuation

A/B old processes 70685/49676 confirmed ESRCH before starting replacements. Same code, ordinary product endpoints:

- A PID84760: `A/fresh-generation-v249`, session `rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46`.
- B PID84767: `B/fresh-generation-v249`, session `iterative-web-49d00139-8b9a-4c89-a984-ee911b62771a`.
- Mode `--resume-product-v251`; read `progress.private.json` and process status before another launch. No duplicate observer or paid request.
- A before v251: 2 successful calls/488182 tokens in fresh run; B:17 successful calls/4329317 tokens plus3 confirmed capacity rejections with unknown fees. Earlier v240 fees remain in `previousProduction`, not reset. The original Plan9/19 and previous candidates remain untouched.

## Remaining concrete deliveries

1. Real A/B product Run completion: legal exact-budget army, applied/current Teach, no unresolved source/engineering items; inspect public Plan and tool results. Failure must stay a product-visible correctable state, not experiment-only manual patching.
2. Shared product launch command for preset and selected armies, existing authoritative Room factory and bot runtime, human/agent seat mode; no independent experiment preparation implementation.
3. Web UI end-to-end evidence from creation through first legal bot action. Native navigation compatibility separately evidenced; no Android-device claim.
4. Continue the agreed same-code experimental sequence only after these boundaries pass. No accepted full game yet.

## Diff scope

Product: new `preset-roster-journey-v1.mjs`; workspace service/HTTP; product composition fixed-plan admission; shared client/panel; evidence-port typed correction; Teach same-prompt encoding; iterative model projection/session recovery. Runner: fresh observer/recovery/export names. Two new regression scripts reproduce concrete observed bugs. Historical unrelated worktree diffs remain; no broad tests, subagents, installs, deletes, commit or push.
