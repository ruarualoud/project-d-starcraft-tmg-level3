# Ticket 11B Slice 82 — Gap clearance and Place geometry

Slice 82 promotes the exact 15 Gap / `PLACE (X)` atoms and advances the ledger from `510/402/114` to `525/387/114`.

## Atomic denominator

The promoted set is deliberately bounded:

- nine Core 4.6 atoms: physical gap definition, Size 0–2 one-inch clearance, Size 3+ three-inch clearance, transit clearance versus endpoint fit, terrain openings, setup passability agreement, movement-type scope, Flying bypass, and Flying endpoint legality;
- six Core 11 `PLACE (X)` atoms: Leading Model nomination, Leading Model distance, remaining-model coherency, nonmovement geometry, legal enemy-separated endpoint, and the Assault engagement exception.

Slice 83 still owns the broader Flying lifecycle. Slices 84–86 own complete terrain/elevation primitives, and Slice 87 owns the general model/base, Within/Wholly Within, and formation-placement denominator. Those atoms were not silently promoted here.

## Executable behavior

`official-gap-place-geometry-kernel-v1` is a pure, deterministic geometry layer. `authority.gap-place-geometry-v1@1.0.0` binds its certified plans into public LegalSpace, Preview, Confirm, Apply, receipt, and replay.

For Gap traversal, the kernel:

- derives each gap width from two physical boundary points attached to actual model, token, or terrain footprints;
- proves that the declared movement path crosses the gap mouth;
- applies the one-inch or three-inch threshold from the Unit's Size characteristic;
- treats two boundaries on the same terrain piece as a terrain opening and requires the Battlefield Setup passability agreement for Ground Units;
- applies the rule to Move, Run, Charge, Disengage, and Close Ranks;
- lets Flying bypass transit clearance point-to-point while continuing to require a whole-base, nonoverlapping endpoint;
- keeps transit clearance separate from stopping geometry, so passing a threshold never authorizes a base that does not physically fit at the endpoint.

For Place, the kernel:

- nominates an actual Leading Model and proves its new centre is no farther than `X` from its starting centre, which is equivalent for the same unchanged round base to being Wholly Within `X` of its starting position;
- requires an exact placement row for every active model, with no duplicate or omitted model;
- proves every model remains Wholly Within 3 inches of the Leading Model and connected by a nonblocked Coherency Link;
- ignores path, Gap Clearance, and elevation requirements because Place removes and sets models rather than moving along a path;
- still requires whole-base battlefield containment, no overlap, and at least one inch from Enemy models outside the Assault exception;
- permits the official Assault-phase Place exception and records that the Unit becomes eligible to be Engaged.

State, board geometry, pending plan, and source-lock identity are hashed into the parameter domain. The Judge cross-checks the Marine Size 2 fixture directly against the sealed current Command Center record rather than repository data. Any stale or incomplete denominator fails closed. Round model bases and round/axis-aligned terrain footprints are executable; the procedure remains production-quarantined until the complete terrain, arbitrary base-shape, and general Unit-card geometry bindings in Slices 84, 87, and 93 close.

## Evidence

- focused Judge `25/25`;
- current runtime `10/10`;
- aggregate `10/10`;
- cumulative `146` reports / `1,546` assertions;
- strict executor state contracts `51/51`;
- graph `9,125` nodes / `27,939` edges;
- slice `aa91a22fb6ce0113e35374d86463e7cf212f46b03b9300b4e3428dd320663165`;
- catalogue `05452ecc9cafd3b0bebf9e392dba5f7fda6d07fd1a5e6864666df62a7f25a4d8`;
- runtime `1eedc98e0a0b21ef1a078dadc5ef10b150415bdb410561eb46528d15d9cae979`;
- graph `cc5dec0076e18658126a7f01424c8bfdb8277774d1d953cb8404d8ea2e255f63`.

Authority Preview → Confirm → Apply is signed with Ed25519. Replay passes after HMAC seal rotation, rejects receipt tampering, and retains the frozen Slice 81 rules display.

The fixed official source lock was not refreshed. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced. Slices 83–111 remain: `29` planned slices and `387` actionable atoms.
