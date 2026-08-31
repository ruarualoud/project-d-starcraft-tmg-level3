# Ticket 11B Slice 84 — Terrain footprint, cover, and line of sight

Slice 84 promotes the exact 19 terrain and line-of-sight atoms and advances the ledger from `549/363/114` to `568/344/114`.

## Atomic denominator

The bounded denominator has four connected groups:

- four setup-footprint and opening atoms: physical terrain footprint, complete opening declaration, and independent movement/line-of-sight opening agreements;
- seven blocking, cover, and visibility atoms: Blocking Terrain classification, Full Cover, Direct Cover, independent terrain assessment, and visible-model resolution;
- four elevation-dead-zone and Close Quarters atoms;
- four Leading Model terrain-interaction atoms: Size 0–1 transit, Size 2+ blocking, and endpoint overlap.

`official-terrain-los-data-bundle-v1` is built only from the sealed current Command Center dataset. It binds all 26 current Unit profiles, 25 integer printed Sizes, the one null-Size Flying Point Defense Drone, and Core PDF hash `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`. Marine Size 2 and Goliath Size 3 are exercised directly. Repository data is not a fallback.

## Executable behavior

`official-terrain-los-rules-kernel-v1` is pure and deterministic. `authority.terrain-los-rules-v1@1.0.0` binds a complete Rules-owned candidate denominator through LegalSpace, Preview, Confirm, Apply, receipt, and replay. Apply records the certified primitive result; it does not silently perform a separate Move or Attack transition.

At battlefield setup, each terrain piece receives a content-hashed physical footprint and a complete, content-hashed opening agreement. Movement-passable and sight-open are separate booleans: a door can pass a round base without becoming a line-of-sight hole, and a sight opening does not silently permit movement.

For a round-base Leading Model:

- terrain Size 0 or 1 is passable;
- terrain Size 2 or greater blocks the swept path unless an agreed movement opening proves full-base clearance;
- Blocking Terrain classification remains independent of movement permission;
- no model may end overlapping terrain of any Size.

For line of sight, the kernel uses the official top-down, any-base-part-to-any-base-part interpretation. Each terrain piece is assessed independently and effective Sizes never combine. A qualifying complete Blocking Terrain trace gives Full Cover when its Size is at least both model Sizes, or Direct Cover when a model is within one inch and the terrain is at least that model's Size. Blocking Terrain without Full or Direct Cover does not itself block visibility.

Size 3+ high terrain creates the mutual elevation dead zone to a Ground model within one inch. Close Quarters removes Direct Cover and that dead zone when both models are within one inch of the same terrain and within three inches of each other. A standable horizontal surface occupied by a model is excluded from the top-down barrier.

The current geometry authority is deliberately bounded to round bases and axis-aligned rectangles. It accepts either an exact complete-barrier proof or an explicit clear base-point connection witness. A diagonal or more complex configuration with neither proof fails closed instead of guessing visibility. Elliptical/arbitrary bases remain Slice 87 work.

## Evidence and boundary

- focused Judge `30/30`;
- current runtime `10/10`;
- aggregate `10/10`;
- cumulative `148` reports / `1,604` assertions;
- strict executor state contracts `53/53`;
- graph `9,435` nodes / `28,433` edges;
- slice `dfe744261a93f20a260fd36b8c2cfc2989917ca3ef4d3b93d130dac800ef687f`;
- catalogue `f3a0170ba9711a4511d7803b1789658c769acf5fef87efbfd92e17b5ab6b438a`;
- runtime `b61a6aacfc7db4ac6670cb08c57d35ead90758fe28c3e559237acfe2b253e324`;
- graph `0c5e513077b9840f6aec987cc49097fc231ab756bb22c4ce6aaf9df37c184d0c`.

Authority Preview → Confirm → Apply retains the normalized legacy terrain display fields without granting them Rules authority. The core terrain contract remains field-whitelisted and content-hashed. MatchBinding pins the same terrain data bundle through `geometryArtifactHash/contentHash`; Ed25519 replay survives HMAC seal rotation, tampering fails, and Slice 83 plus its historical rules display remain frozen.

The source lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1` was not refreshed. Elevation/effective-Size stacking remains Slice 85; Grass, Impassable Terrain, Ramps, and Access Points remain Slice 86; arbitrary base shapes remain Slice 87. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced. Slices 85–111 remain: `27` planned slices and `344` actionable atoms.
