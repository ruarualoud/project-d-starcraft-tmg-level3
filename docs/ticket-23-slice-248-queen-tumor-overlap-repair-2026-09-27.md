# Ticket 23 / Slice 248 — Queen Creep Tumor duplicate placement

The preserved no-plan 2000-point room `20260925021950038` reached r57 in
round 2 Movement. Public journal sequences 54–58 prove five distinct
`battlefield_asset_created` events (`creep-tumor:6` through `:10`) at the
identical coordinate `(18, 4.126)` inches. The first placement at r53 is
the first such token at that coordinate; r54–r57 are physical duplicates.
Each transition had a changed state hash and successful Apply/Replay, so this
is an authoritative legality gap, not merely repeated model wording.

The concrete defect is `tumorPlan`: it checked Queen-base contact, board
containment and model overlap, but not existing tangible token bases. The
shared Host placement prefilter applied token-token collision to Creep
Spread, Force Field and Shade, but omitted Queen Spawn Creep Tumor. The
source-locked Core 7.3.1/7.3.2 token contract makes Tokens tangible Size 0
terrain with their own physical base; the current product token itself says
`ownBase:true` and `modelsMayEndOverlappingByDefault:false`. This repair
does not invent a once-per-round Queen limit: repeat use may still be legal
when paid and physically placed at a distinct non-overlapping position.

The new focused real-checkpoint regression loads r56 read-only, proves four
existing tumors at the exact point, and requires Rules preview to reject a
fifth. Before the patch it failed with `Missing expected exception`. After
the patch, `tumorPlan` measures the complete round/square token footprint
and rejects the overlap; the Host prefilter includes the same Queen effect.
The focused check passed once after code change: Rules rejects the point,
the Host offers zero remaining Queen-contact placements in that r56 state,
and the original room is unchanged. Provider calls 0, Room mutations 0.
No unrelated gate was rerun.

The original r54–r57 prefix is retained as diagnostic evidence but is not a
valid gameplay continuation under the repaired legality contract. Continue
by forking the immutable original through **r53** (the last legal action),
replaying that prefix into a fresh branch with explicit fork provenance, and
letting the Agent make the next decision from the repaired LegalSpace. Do not
rewrite/delete the original room or treat its later state as training truth.
If the Agent repeatedly asks for the Queen ability despite zero legal
locations, that is a decision/recovery quality defect for Slice 249; do not
silently choose another action for it.
