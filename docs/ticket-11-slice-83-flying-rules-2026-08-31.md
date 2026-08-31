# Ticket 11B Slice 83 — Flying rules

Slice 83 promotes the exact 24 Flying atoms and advances the ledger from `525/387/114` to `549/363/114`.

## Atomic denominator

The promoted set covers the flight-stand measurement base, horizontal point-to-point movement, terrain/model/elevation transit permissions, endpoint restrictions, Flying coherency links, grass interaction, charge/engagement/combat/mission prohibitions, and the Flying cover/effective-Size/elevation exceptions. These are one bounded executor contract, not a claim that all terrain or elevation rules are complete.

The sealed current official dataset contains one Unit tagged Flying: Point Defense Drone (`army_units:point_defense_drone`, tags `Armoured, Flying, Mechanical`). Its printed Speed is `-`, and the sealed source has no current movable Flying carrier or flight-stand geometry record. Therefore the generic rules-procedure fixture is explicitly `rulesProcedureMode=true`, production-quarantined, and never presented as a current official Marine or other invented Flying carrier. Slices 84, 85, 87, and 93 retain general terrain, elevation, arbitrary base geometry, and Unit-card geometry ownership.

## Executable behavior

`official-flying-rules-kernel-v1` is pure and deterministic. `authority.flying-rules-v1@1.0.0` binds its certified plan to LegalSpace, Preview, Confirm, Apply, receipt, and replay.

For movement and placement, the kernel:

- measures and positions from the bottom of the flight stand and ignores model overhang;
- measures the Leading Model horizontally point-to-point without adding vertical elevation distance;
- ignores terrain, model bases, elevation changes, and Access Points during transit;
- keeps endpoint legality separate: the entire measurement base must remain on the battlefield, may not overlap models or non-grass terrain, and must remain at least one inch from an Enemy Flying base;
- permits Flying and Ground bases to finish base-to-base without creating engagement;
- requires one exact placement for every active model, with no duplicates, overlaps, or omissions, and keeps every model Wholly Within 3 inches through valid Coherency Links;
- ignores terrain and other Units when evaluating those Flying Coherency Links;
- preserves grass crossed during flight and permanently removes grass occupied at the endpoint.

The shared participation verdict forbids a Flying Unit from charging, being charged, engaging or being engaged, activating in Combat, taking Close Ranks, making or receiving Close Combat attacks, and controlling or contesting mission markers.

For cover and elevation, the kernel ignores Full Cover to or from Flying and treats the Flying model's effective Size as higher than every terrain piece while contributing no terrain Size. Terrain can never give direct cover to the Flying model, but direct cover or an elevation dead zone that applies to the non-Flying model remains effective. Flying never gains high-ground cover and an attack from Flying is never treated as originating from lower elevation.

The move/cover candidate denominator, relevant state, board geometry, source lock, and selected result are content-hashed. Stale pieces, terrain, pending plans, domains, or source bindings fail closed. Axis-aligned terrain transit uses exact segment clipping rather than sampling.

## Evidence and boundary

- focused Judge `28/28`;
- current runtime `10/10`;
- aggregate `10/10`;
- cumulative `147` reports / `1,574` assertions;
- strict executor state contracts `52/52`;
- graph `9,293` nodes / `28,204` edges;
- slice `8c465373e5fa35add7f9ad6956d237f4ec0c6ce40d603080b544ca7f0c08dd8d`;
- catalogue `ecc5be6b5335ed5ddce9a73146934e6ae721505f35827b8b204caf448803e850`;
- runtime `63ca12125a43107126093177a93eb678dc42a0d710264dc64f351227c7af5f72`;
- graph `362c3a13fcce077ead7c4f16b3a38a20faebe35f46ac6a9353dfbb02e17a1dcc`.

Authority Preview → Confirm → Apply removes endpoint grass in the normalized room state, signs the receipt with Ed25519, replays after HMAC seal rotation, and rejects tampering. Slice 82 remains frozen and its historical rules display is retained without silent compatibility.

The fixed source lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1` was not refreshed and repository fallback was not used. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced. Slices 84–111 remain: `28` planned slices and `363` actionable atoms.
