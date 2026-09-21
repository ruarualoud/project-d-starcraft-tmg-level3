# Ticket 26 / Slice 266c — Live companion package binding, room chat and floating product journey

Owner: Kimi · Worktree `.worktrees/ticket-26-slice-266c-companion-product-binding`
Base: `e5ab22f267e85120862926682c9f331b1299c74e` · Date: 2026-09-22
Slice manifest: `.agent-runtime/slice.json`

## Invariants honored for the whole slice

- No change to Rules, Authority, battle actions, source data, strategy/replay
  code, content packs, `packages/character-agent`, `packages/http-adapter`, or
  the mount-runtime/dock files. The browser gate re-proves zero backend drift
  outside the slice-owned paths against the base commit.
- No Provider call (the fixture provider is a verifier-controlled deterministic
  in-memory responder with `network: "none"`; accounting proves zero external
  network attempts and zero paid inference), no credential read, no source
  refresh, no Git push, no dispatched agent. `trainingTruth: false` everywhere.
- The companion path never persists seat tokens, never reads opponent-private
  plan/memory, never requests or stores hidden chain-of-thought, never
  fabricates a model reply, and holds no Preview/Confirm/Apply authority.
  The browser gate counts every Room mutation method and proves **zero**
  mutations and an unchanged `stateRevision` across the whole journey.
- The fail-closed character-package integrity was **strengthened, not
  weakened**: the stale pin was replaced by a versioned binding contract, not
  allowlisted or hidden.

## SS-1 — `CHARACTER_PACKAGE_HASH_PIN_STALE` closed by a versioned, registry-derived binding contract

`packages/client-domain/character-presentation-projection-v2.mjs` no longer
carries hand-updated `EXPECTED_*` package/catalogue constants. It now exports
`STARCRAFT_TMG_CHARACTER_PACKAGE_BINDING_REGISTRY_V1`: a versioned epoch
registry where each epoch records the exact sealed CharacterPackage hash,
persona catalogue hash, selector, visual manifest and room/seat/principal
scope binding.

- Epoch 2 (current) pins the live sealed package
  (`12d5ed6e…e3ac`) and catalogue (`7c4c3a65…f9c`) hashes; the default
  `assertStarcraftTmgClientCharacterProjectionV2` (signature unchanged, both
  existing callers untouched) validates against the current epoch only and
  still fails closed (`CHARACTER_PROJECTION_INVALID:binding_or_hash`) on any
  mismatch, including a wrong room/seat/principal scope.
- Old projections are readable only through the explicit legacy path
  `assertStarcraftTmgClientCharacterProjectionV2Legacy(value, scopeHash, epoch)`
  which marks the result `legacyBindingEpoch` / `currentlyBound: false`
  (inspectable via `isStarcraftTmgClientCharacterProjectionV2Legacy`). There is
  no silent compatibility: a legacy epoch presented to the current path fails,
  and the current epoch presented to the legacy path fails
  (`legacy_epoch_unknown_or_current`).
- Browser proof: the live Field-comms identity renders **Sarah Kerrigan** on
  first paint (gate check `desktop_live_identity_pin_fix`); the fail-closed
  withheld state is gone because the projection now validates, not because the
  validation was relaxed.

## SS-2 — Companion product module binds the room session service to the product

- `companion-room-session-service-v1.mjs` (existing service, extended):
  `openOrResumeConversation`, `readActiveConversation`, `userParticipantId`,
  bound `companions`, `memoryScope` in the public conversation projection.
  Repair-round fixes landed here: empty `mentions: []` is accepted as
  "no mentions", and the conversation scope is the authenticated human **seat
  inside the exact match binding** (`roomId + seatKey + matchBindingHash`)
  rather than one credential — a seat re-authenticating with a fresh
  recovery-derived credential (page reload, new device) resumes its own
  conversation. Every operation still revalidates the credential against the
  room runtime; the creating credential's principal scope hash stays recorded
  in the binding for audit (`principalStorage: "scope_hash_only"` unchanged);
  wrong-seat access still fails `COMPANION_CONVERSATION_SCOPE_MISMATCH`.
- `companion-product-module-v1.mjs` (new): composes the generic companion
  backend around the **injected** persistence and provider ports, registers
  the six catalogue-derived packages, and serves one authenticated HTTP
  surface (`/starcraft-tmg-level3/companion/api/v1`): status, catalogue,
  open_or_resume, read active, read, send, continue, checkpoint, resume,
  close. Bearer seat token per operation, never persisted; honest CB-2
  memory/relationship summaries (`not_written_yet_never_fabricated`,
  unknown-is-first-class relationship axes); explicit provider states
  (`injected_port` / `unavailable · provider_not_injected`, fail-closed).
- `index.mjs` (new barrel).

## SS-3 — Client Domain entry point

`client-domain-v1.mjs` adds the companion product client surface without
touching the four-operation domain interface: API prefix constants,
`StarcraftTmgCompanionProductTransportError`,
`createHttpStarcraftTmgCompanionProductTransportV1` (fetch, envelope check,
timeout/size guards, HTTPS-except-loopback), and
`createStarcraftTmgCompanionProductClientV1` — a stateless facade that
re-derives the bound room/seat at call time. The seat credential is attached
inside the domain module via the trusted ingress WeakMap and scrubbed from
every error surface.

Repair-round fix: the product mounts the domain **behind the role-Agent
session client wrapper** (a new frozen object), so the identity-keyed ingress
could not resolve. The domain factory now records created domains in
`COMPANION_PRODUCT_MOUNTED_DOMAINS`; the dispatcher falls back to the unique
mounted domain's ingress and fails closed on zero/ambiguous mounts. The
credential handoff closure never leaves the factory.

## SS-4 — Provider mount

`client-domain-provider.tsx` creates the companion client once per mount
(same-origin HTTP transport, 120s budget consistent with the authoritative
client) and exposes it as `companionProduct` on the Level3 context. No tsconfig
or declaration change was needed (`tsconfig.json` already includes
`packages/client-domain/**/*.mjs`); the allowed `companion-catalogue-content.d.ts`
was deliberately left untouched.

## SS-5 — Floating companion group chat UI

`tactical-adjutant-panel.tsx` gains a floating-only `"chat"` section (default
closed; the inline variant and the Slice 133 vitest pixel/Image-count contract
are unaffected — all new `Image` elements live inside the closed floating
section):

- 1..6 companion multi-select from `COMPANION_CATALOGUE_V1` (packageId
  `starcraft-tmg.companion.<slug>` ↔ characterId `starcraft.<slug>` derived
  from the same slug; no driftable lookup table).
- Open-or-resume, deterministic speaker-order chips with next-turn highlight,
  transcript with author labels and `@mention` chips, composer with mention
  toggles, Send, explicit Continue (only shown after an interrupted turn;
  no automatic retry anywhere), Checkpoint, per-checkpoint Resume, Close.
- Server-projected memory & relationship card (transcript entries, latest
  speakers, rolling summary or its honesty label, relationship axes/events,
  persistence durability) and an explicit Provider status card
  (`injected_port` with accounting, or honestly unavailable) plus the BYOK
  note (live key attachment stays with the secure Provider console).
- Current-speaker portrait from the admitted keyframe registry with the same
  `asset:` / `sha256:` label discipline as the catalogue panel.
- Honesty text updated: the identity-section multi-speaker card and the
  memory-section relationship/layered-memory cards now read **connected
  (Slice 266c)** and point at the chat section (gap codes kept verbatim).
- `companion-catalogue-panel.tsx`: five capability rows flipped to
  `connected (Slice 266c)` (multi-speaker, memory layers, relationship state,
  checkpoint/resume, external Provider port); parity summary regrouped; the
  multi-speaker prototype retitled as a non-fabricating explainer under the
  live binding. The Slice 266b gate's "pending Codex" strings for those five
  rows are superseded by this slice (the 266b gate is not part of 266c
  verification); all still-pending rows render pending.

## SS-6 — Real-browser verification

`scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
(Playwright Chromium, desktop 1500×1050 + narrow/touch 390×844, reduced
motion): two-seat legacy sample-state room (host player1 + guest player2),
the real companion product module composed around in-memory persistence and a
verifier-armed deterministic responder, a mutation-counting room facade, and
the current worktree Web export (rebuilt inside the verifier only when stale —
`packages/client-domain` added to the freshness watch because it now feeds
the bundle).

**21/21 checks passed, 11 claim-to-pixel/interaction rows, 13 hashed
artifacts**, report `build/ticket-26-slice-266c-companion-product-binding-v1/browser-report.json`
(hash `b170c44aee8071cf8584275d04e63861dec10387644d02b53bd16e2c207beb78`,
27.9 s): live identity after the pin fix · explicit provider/BYOK states ·
two-companion open with deterministic order · user→Kerrigan→Zagara cycle with
`@mention` and `providerAccounting.calls === 2` · checkpoint · armed provider
outage → explicit interrupted card with zero fabrication · explicit Continue ·
checkpoint isolation (turn 9 → 3) · wrong-seat read+send rejected
(`COMPANION_CONVERSATION_SCOPE_MISMATCH`) · no-auth 401 · full reload resumes
the persisted transcript · speaker portrait claim-to-pixel at desktop **and**
390px (decoded 1254px, canvas variance, labelled sha256 == committed file ==
served bytes) · zero horizontal overflow · BYOK honestly unavailable ·
conversation close returns the selector · zero Room mutations, unchanged
stateRevision · request-log hygiene · no browser errors. Seat tokens are
captured fixture-side only for headless assertions and are verifiably absent
from the report.

## Gate receipts (each declared gate run once after its relevant final code change)

1. `COREPACK_ENABLE_PROJECT_SPEC=0 corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/character-presentation-mount-v2.test.tsx`
   → **6/6 passed** (3.30 s, run 02:46:30). The env var is required because the
   workspace root `packageManager` is `npm@11.9.0` while the app pins
   `pnpm@9.12.0`. The later client-domain/service repair fixes do not touch
   any module this test loads (the provider module is fully mocked; the test
   only reaches `character-presentation-projection-v2.mjs`, committed before
   the gate), so the receipt stands for the final code.
2. `node scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
   → **passed** on the fourth attempt. Repair rounds (each a distinct root
   cause, all converging): ① trusted ingress unreachable behind the role-Agent
   wrapper → unique-mounted-domain fallback; ② fixture headless assertions
   used the pre-recovery credential whose principal scope legitimately differs
   → capture the live seat credential server-side; ③ empty-mentions send
   rejected by the 1..6 validator → empty list ≡ no mentions; ④ per-credential
   conversation scope made reload/resume impossible → seat-scoped resume
   (security review: authority still revalidated per operation; wrong-seat and
   no-auth rejections re-proven).

## Changed files (exact)

- `packages/client-domain/character-presentation-projection-v2.mjs`
- `packages/client-domain/client-domain-v1.mjs`
- `packages/product-composition/companion-room-session-service-v1.mjs`
- `packages/product-composition/companion-product-module-v1.mjs` (new)
- `packages/product-composition/index.mjs` (new)
- `apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx`
- `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx`
- `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx`
- `scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs` (new)
- `docs/ticket-26-slice-266c-companion-product-binding-v1-2026-09-22.md` (new)

Allowed but deliberately untouched: `packages/companion-backend-module-v1/`,
`apps/starcraft-tmg-expo/components/character/companion-catalogue-content.d.ts`
(unnecessary — see SS-4), `scripts/support/ticket20-human-agent-demo-fixture-v1.mjs`.

## Commits (base → head)

- `bd8ca1b` SS-1 registry-derived character package binding removes stale hash pin
- `bdab4c3` SS-2 companion product module binds room session service to product
- `991ce21` SS-3 Client Domain companion product entry point
- `67335b1` SS-4 mount companion product client in Level3 provider
- `a1148d8` SS-5 floating companion group chat section + connected capability honesty
- `ca2a549` companion ingress resolution behind the role-Agent wrapper
- `487d433` seat-scoped resume across credential rotation + empty-mentions send
- `ce4939c` SS-6 live companion product browser gate

## Remaining gaps (no Critical/High)

- **Medium** — The browser fixture uses the honestly-declared **volatile**
  in-memory persistence adapter; durable SQLite/PostgreSQL adapters remain the
  later Codex integration. Crash-resume across a server restart is therefore
  not claimed — reload/resume is proven across a full page reload with a fresh
  credential against the live server.
- **Medium** — The Provider **unavailable** state is proven headlessly
  (`unavailable · provider_not_injected`, fail-closed) and the interrupted/
  error states are proven in the browser; the unavailable branch of the UI
  status card renders verbatim from the same status payload but was not
  pixel-proven (the journey requires an injected port for the chat cycle).
- **Low** — Five capability rows remain `pending Codex` by design (worldbook
  triggers, swipe branches, import/export, audit/replay, plus the absent
  group); the 266b browser gate's "pending" assertions for the five now-
  connected rows are superseded by this slice.
- **Low** — `COMPANION_PRODUCT_MOUNTED_DOMAINS` keeps strong references to
  created domains (one per product realm by construction); test realms that
  create many domains and then dispatch through a wrapper get a fail-closed
  ambiguity error, which is the intended behaviour.
