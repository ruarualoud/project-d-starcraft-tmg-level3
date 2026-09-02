# Ticket 13 / Slice 121 — Kerrigan dynamic dialogue portrait

Status: complete.

## Outcome

Slice 121 turns the accepted development portrait into a deterministic
five-keyframe communications surface. It is a presentation plane, not a game
authority: the server owns character mode, dialogue phase, asset path and frame
timing; Provider output may suggest only one mode-allowlisted `visualCue`.

The five 1254×1254 PNG roles are `neutral`, `blink`, `speaking`, `warning` and
`reflect`. The shared state reducer covers `idle`, `listening`, `thinking`,
`speaking`, `waiting_confirmation` and `error`, including double blink,
phoneme-cycle, reflective-gaze and sync-loss sequences. Reduced-motion clients
receive a deterministic single-frame view.

## Visual and source boundary

- Structure and identity follow official StarCraft II Kerrigan face and
  upper-body evidence; composition and analogue signal treatment follow the
  StarCraft I communications-portrait direction.
- The selected output is high-resolution Western 2D science-fiction painting:
  no anime face, horror deformation, pixel-block upscale, giant pauldrons or
  detached Gothic/metal bustier.
- Every source and generation output is content-hashed. Exact prompts and five
  generation receipts are stored in the content manifest.
- Raw official/rehosted references and rejected drafts remain ignored local
  evidence. The generated derivative frames are development-only. A public
  environment fails closed to the Project D-original adjutant until independent
  rights review passes.

## Runtime contract

- Role cue allowlists are finite and mode-specific.
- Cross-mode and asset-like cue injection fail closed.
- The session runtime returns sealed portrait state/view data and records their
  hashes in Harness traces.
- Tutor, opponent, commentator and companion exercise `explain`, `challenge`,
  `announce` and `reflect` respectively. Opponent previews transition to the
  server-owned waiting-confirmation warning hold.
- The portrait cannot mutate a room, override Rules, generate Skill/DSH output,
  or create MuZero/training truth.

## Evidence

- Dynamic portrait verifier: 11/11 assertions.
- Character role-agent verifier: 9/9 checks, including all four runtime modes.
- Portrait plan hash: `84c1a919f9dacbbf8cae5bebab928344736195b48497d4406f3850bea5a3cb94`.
- Portrait manifest hash: `5d117dbe1e21ab89129027e31f3c21ca46923bd6f7a0d5dfa55009b458b82f36`.
- Dynamic report hash: `0742482c11dea82eab1c2144daf1cc1a28dec641645393011e16e5c94e5ffd1c`.
- Actual local preview: `build/kerrigan-dynamic-dialogue-portrait-v1/preview.html`.

## Rollback and demotion

Any source, prompt, output, receipt or manifest hash drift quarantines the set.
Official-model shoulder/chest drift demotes the neutral frame and all dependent
frames. Invalid Provider cues reject the Provider output. Public rendering never
silently promotes these development-only derivatives.
