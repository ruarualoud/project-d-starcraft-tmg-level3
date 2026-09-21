# Ticket 26 / Slice 265 — SillyTavern parity research and complete companion packs

Owner: K3 frontend/content lead in the existing isolated Ticket 26 worktree.
Codex retains backend, permission, memory-store, Provider, Rules and integration
ownership. Do not touch combat/rules/Harness files changed by Ticket 25 Slice
265.

## Required order

1. Research current SillyTavern capabilities from its primary documentation and
   current repository only. Cover character cards, personas, world info/lore
   books, prompt/context assembly, vector/data-bank memory, summaries, group
   chat/multiple characters, swipes/branches, author notes, quick replies,
   import/export/restore, extensions, connection profiles and long-running role
   continuity. Record access dates and direct sources. Do not treat community
   descriptions as authority when primary material exists.
2. Before implementation, commit a Chinese parity report comparing every
   relevant SillyTavern capability with the exact Project D contract that exists
   today. Each row must state: supported/partial/missing, evidence path or
   screenshot, user-visible consequence, K3-owned work, Codex-owned backend gap,
   and acceptance evidence. Never call an unavailable backend capability done.
3. Freeze a numbered implementation plan from that matrix, then implement only
   the K3-owned Web/App/content-presentation work. Backend gaps remain typed and
   visible for Codex.
4. Build two complete new companion packs: Jim Raynor (Terran) and Artanis
   (Protoss), while retaining Kerrigan (Zerg) as the existing reference pack.
   Use real canon/source-backed biography, voice/tone, relationships, era,
   knowledge/spoiler boundaries, world-book entries and tactical identity. No
   placeholder prose and no fabricated official quotations. Clearly distinguish
   canon facts, Project D role configuration and generated visual assets.
5. Define the same dynamic communication-portrait state contract used by the
   existing Kerrigan pack: at minimum idle, speaking, listening, alert/combat,
   damaged/concerned and reflective states, with deterministic fallback and
   reduced-motion behavior. Reuse real repository assets where rights permit.
   If new raster generation is required, write exact image-generation briefs and
   bindings for Codex's image tool; do not fabricate a generated image receipt.
6. Support a single conversation containing multiple projected companions with
   explicit speaker identity, turn order, mention/selection affordances and
   permission labels. If the server multi-speaker contract is still missing,
   implement only the honest presentation/prototype state and keep the missing
   contract visibly blocked; do not fake persistence or Provider calls.

## Screenshot evidence standard

Every visual acceptance claim must have a claim-to-pixel evidence row. Each row
must include screenshot ID/path, viewport, precondition, exact interaction,
expected visible result, observed bounding box/pixel or DOM assertion, and the
contract/source being demonstrated. Capture desktop and 390px touch states for
all material journeys. Required evidence includes, at minimum:

- parity/gap surface;
- companion catalogue with Kerrigan, Raynor and Artanis identity distinction;
- each new pack's identity/world-book/era/relationship view;
- every dynamic portrait state and reduced-motion fallback;
- multi-companion conversation and speaker selection;
- long-session resume/import/export/memory states, including honest unavailable
  states for backend gaps;
- permission posture and hidden-opponent-data exclusion;
- board-safe collapsed/expanded floating window and hit testing;
- BYOK/session/provider status without any paid Provider call;
- Web desktop and narrow/App-responsive layouts with no overflow or occlusion.

The browser report must index every screenshot and every claim. A textual
"passed" result without its screenshot/DOM assertion is not acceptance.

## Allowed scope for this continuation

- `apps/starcraft-tmg-expo/components/character/`
- presentation-only companion catalogue/binding files under
  `content/characters/`
- presentation-only companion media under `content/characters/assets/` or the
  existing repository-approved character asset tree
- focused Ticket 26 Slice 265 browser/component verification scripts
- Ticket 26 Slice 265 research, parity, visual-generation brief and closure docs

Do not edit Rules, Authority, room permissions, memory stores, Provider code,
official source snapshots, strategy/skill generation, battle estimation or the
current Ticket 25 Slice 265 files. Do not call a paid model. Public read-only
network research is authorized only for the SillyTavern primary-source audit and
canon source discovery; no source-data refresh is authorized.

## Git and convergence

- First commit: research + parity matrix + frozen plan only.
- Subsequent commits: one scoped implementation sub-slice each.
- Final commit: focused browser report, screenshot index and honest gap list.
- Run each relevant focused gate at most once after its last code change; never
  rerun a passed gate. Stop and report after three non-converging repair rounds.
- Do not push.
