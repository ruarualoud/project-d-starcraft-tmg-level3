# Ticket 23 / Slice 248 — special-terrain LOS recovery

## Delivered

- Correct the special-terrain context check for setup-agreed, nonstandable
  impassable obstacles with no elevation pair and no Access Point. Do not invent
  an upper surface, alter map geometry, or bypass genuine access/size conflicts.
- Add a narrow mode to the existing formation diagnostic. It opens the actual
  failed room database read-only and decrypts only in memory; it does not build
  another room, replay the match, refresh sources or call a Provider.
- Check the actual Rules LOS result against the Agent relationship graph, plus
  the previously added unknown-preservation path using a deliberately invalid
  copy. No persisted room data or decision history is changed.

## Root cause and evidence

The map compiler intentionally creates nonstandable Size 2 impassable pieces
without an upper elevation. The same fields survive in the frozen room. The
old kernel additionally demanded `adjacentElevationPairs.length > 0`, so a
valid flat obstacle failed the entire special-terrain LOS batch.

Frozen rule text: `build/source-intake/official-rules/StarCraft-TMG_EN.raw.txt`,
the Impassable Terrain glossary entry. Lack of an access connection makes the
piece impassable; Size 0/1 is still traversable. The fix retains the existing
elevated-surface derivation and supports an explicit setup-agreed flat obstacle.

The exact failing branch is `20260922131200726`, revision 6. Before the fix,
the focused diagnostic failed with:

`SPECIAL_TERRAIN_IMPASSABLE_DERIVATION_INVALID:sc1_lost_temple_v1:neutral-size2-1`

After the fix the same command passed once in 1,433ms:

```sh
node scripts/diagnose-ticket-23-slice-248-swarmling-formation-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922131200726 \
  --state-revision=6 --seat=player2 --special-terrain-los-only
```

Evidence: `build/ticket23-slice248-special-terrain-los-repair-v1-report.json`.
No unrelated gate was run. The earlier heavy formation diagnostic did not have
an observed completion; it is not cited as passed evidence.

## Corrected battlefield interpretation

There are two actual Goliath→Hydralisk model pairs, at 25.032in and 21.075in
base-edge distance. Both are blocked by
`sc1_lost_temple_v1:sc1_lost_temple_v1:central_temple:1` (Size 3, full cover).
The closest target being inside the printed 24in range does **not** prove it
can be shot. Earlier commentary implying certain exposure was too strong.
The corrected graph has zero visible pairs and zero unknown pairs, with a
successful LOS receipt. Deliberately invalid context still yields
`unknown_current_position_stationary_attack_domain`, not a safe/zero verdict.

This repair does not claim to certify future movement, classic-map artwork
alignment, or strategic quality. Old r6 remains non-training because its
original decision evidence contained the failed calculation.

## Continuation and cost

Resume branch `20260922133120597` at r5. Its Planner completed before the
transport failure. All four cached Raptor formations are outside stationary
range and their receipts contain no special-terrain LOS failure, so they are
not invalidated by this repair. Continue at Action without repeating paid
Planning. Prior branch accounting is conservatively 5 calls / 708,121 units /
¥0.934974, including usage-unknown interrupted requests, not an invoice.

This repair: 0 Provider calls, 0 tokens, ¥0, 0 Room mutations, no source refresh.
Ticket 23 remains 33/36; S248–250 remain open.

Harness loop: Rules LOS → relationship graph → incoming-fire estimate. No
strategy prompt or Skill was changed, no hidden reasoning was requested, and
no new training candidate was promoted.
