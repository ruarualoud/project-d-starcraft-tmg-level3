# Ticket 13 Slice 127 — all-era dynamic communications portraits

Status: complete Ticket 13 post-closure extension; Ticket 13 reclosed at 9/9.

## Outcome

All eight currently configured Sarah Kerrigan persona editions now have their
own development-only dynamic communications-portrait manifest. They share the
existing deterministic dialogue-portrait engine but never share portrait
bytes, paths, costume geometry or era-specific visual identity.

The complete denominator is:

- 1 shared state machine;
- 8 persona-specific manifests;
- 5 semantic frame roles per persona;
- 40 total frames;
- 5 previously accepted post-Zerus primal frames;
- 7 existing static era anchors reused only as their matching neutral frame;
- 28 newly generated adjacent frames, each with an exact prompt, input hash,
  output hash/bytes/dimensions, built-in ImageGen provenance and manual review.

The generated frame roles are `neutral`, `blink`, `speaking`, `warning` and
`reflect`. Five roles are the minimum useful set for this demo: they distinguish
presence/listening, natural life, accepted speech, confirmation/error attention
and deliberation without inventing a large emotion or lip-sync matrix. A later
voice feature may add versioned phoneme frames, but it must not silently change
this contract.

## When animation runs

| Server-owned phase | Visible behavior | Trigger |
| --- | --- | --- |
| `idle` | neutral with a sparse double blink | session created or response finished |
| `listening` | neutral with one natural blink | user message accepted |
| `thinking` | reflect, brief blink, neutral return | planning begins |
| `speaking` | cue/rest frame alternates with speaking | Provider output has already passed validation |
| `waiting_confirmation` | warning hold | a human confirmation is required |
| `error` | warning/neutral signal-loss sequence | Provider failure |

Only the selected persona animates, and only while its surface is visible.
Offscreen/background views suspend their timer. The client preloads the selected
persona's five small keyframe roles and lazy-loads other personas. There is no
runtime or per-utterance image generation.

Reduced-motion collapses the schedule to one server-selected frame. Offline
mode renders the sealed selected persona if cached and otherwise its static
neutral frame; persona controls are read-only. A missing era frame displays a
labeled unavailable state and never borrows another era. Public use remains
rights-blocked and falls back to the Project D-original tactical Adjutant.

## Identity and generation review

The image-generation skill required inspection of every local neutral target,
one built-in ImageGen call per requested output, exact prompt/receipt retention,
and preservation of original generator outputs outside the repository. Four
drafts were rejected and retained only as ignored local evidence: two Brood War
reflection drafts changed tendril/chest structure, while the first Xel'naga
blink and speaking drafts repainted too much of the tendrils and armor.

Accepted repository outputs are under
`assets/characters/kerrigan-persona-dynamic/<era>/`. Every new file is
1254×1254 PNG and is content-hash bound by
`kerrigan-all-era-dynamic-portraits-v1.mjs`. The outputs remain
`development_only_derivative`; independent rights review is still required
before public release.

## Verification

`npm run verify:kerrigan-all-era-dynamic-dialogue-portraits` passes 15/15:

- exact plan, receipt, generator audit and PNG bytes;
- eight distinct five-role manifests and eight dynamic persona bindings;
- all 48 phase/persona views and all 32 mode/persona views;
- server ownership of mode, phase, timing and paths;
- all-era selector and Web/App presentation parity;
- reduced-motion, offline and public-rights fallbacks;
- no Rules, room, Provider, Skill, DSH, MuZero, self-play or training authority.

The inspectable local preview is generated at
`build/kerrigan-all-era-dynamic-dialogue-portraits-v1/preview.html`; its sealed
report is beside it at `report.json`.

Slice 127 does not replace Slice 126. The original 8/8 closure remains
reproducible, and `verify:ticket-13-extension` runs that original closure first
before accepting this ninth slice.
