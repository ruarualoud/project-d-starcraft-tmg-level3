# Ticket 23 / Slice 248 — friendly relationship mistaken for hostile fire

## Actual failure and boundary

Run `20260922172710914` reached r11 with a nine-model Marine deployed. For its
`Go! Go! Go!` relocation, Flash selected formation
`e1b861d5900286a2e7528707aec8acc1f900f067bbc49d348827cfec1814b46b`.
The model correctly identified the nearby Goliath as friendly and explicitly
explained that its weapon entries were not enemy fire. The host nevertheless
rejected all three saved Action replies as
`ACTION_FORMATION_THREAT_CLAIM_CONTRADICTS_PROJECTION:player1-goliath-1`.
No r12 action was applied. The runner stopped after the existing bounded
correction cycle; no fourth paid attempt was requested by this repair.

Boundary accounting: **22 physical calls / 1,785,213 reported units /
¥2.336185**, all on Flash in this resumed branch. Previous branch accounting
remains separate. The next resume reuses r11 and the saved paid candidates.

## Root cause

`tactical-relationship-graph-v1.mjs` checked weapon target tags and physical
range/LOS but omitted opposing-side eligibility. Explicit friendly targets are
legitimate for lane preservation, screening and formation-spacing questions,
so the graph must keep them; it must not assign hostile weapon/Charge coverage
to them. The formation row adapter then dropped the graph's `relation` field
and labelled the Goliath's five profiles `enemyStationaryThreatProfileKeys`.
The final claim gate consumed those misleading fields without current side
identity and rejected the correct explanation.

This is not weak strategy and not a new model hallucination. The later public
reply specifically called out the erroneous friendly-fire edge.

## Minimal repair

- Ordinary weapon and Charge threat eligibility requires an opposing target,
  including team membership. Friendly distances, nearest bases, spacing,
  visibility and requested relationships remain available.
- Formation relationship rows retain `fromUnitId` and `relation` from the
  canonical graph. Both Planner and Action receive its consistent future data.
- For already-saved rows, the claim inspector uses current authoritative
  own/allied Unit identity, never ID-prefix heuristics, to exclude false hostile
  facts. Unknown identity does not suppress evidence. Current graph claims also
  respect explicit friendly relations.
- Action normalization advances to v36 so the existing bounded local replay
  path can revalidate the already-paid candidate. This is a code-repair version,
  not a new strategy Prompt, forced model choice, changed coordinate or erased
  receipt. Original historical malformed projections remain diagnostic evidence
  and are not silently rewritten or promoted to training truth.

## Exactly scoped verification

The existing `verify-ticket-23-slice-248-formation-threat-claim-scope-v1.mjs`
gained `--friendly-threat-only --run-directory=...` for this concrete case.
It decrypts the real persisted r11 room read-only, reads the actual failed
paid candidate and its five false Goliath threat profiles, and exercises the
real graph and claim inspector. Before repair all three checks failed:
same-side hostile coverage, correct saved prose rejected, allied hostile
coverage. The single post-change run passed.

Negative control: changing only that test copy's Goliath side to opponent
retains its actual hostile fire and still rejects a no-fire claim. Changing
the copy to a shared team removes hostile coverage again. Friendly geometry
is preserved. No whole suite, old passing mode, Provider call, Room mutation,
official data refresh or UI rebuild was performed by this check.

## Continuation and strategy boundary

Resume the same r11 room, not a fork or new game. Prefer a locally valid saved
candidate; its subsequent Rules Preview/Apply/Replay and screenshots remain
mandatory. Genuine strategy weaknesses in the public explanation stay for
Slice 249 review. T23 is still 33/36: S248 match, S249 review and S250 closure
remain incomplete.

`harnessLoopUsed=true`; game `starcraft-tmg`; route `selfplay_agent_prompt`.
Evidence links are the r11 decision SQLite, selected formation receipt, actual
Room geometry and focused verifier output. No hidden chain-of-thought, memory
promotion or training claim is involved. Any Rules/Replay mismatch still stops
the run; only this proven friendly-identity false positive is corrected.
