# Ticket 11B Slice 81 — Direct movement and Displacement

Slice 81 promotes the exact nine Direct movement / Displacement atoms and advances the ledger from `501/411/114` to `510/402/114`.

## Executable behavior

`authority.direct-movement-displacement-v1@1.0.0` executes a Rules-owned choice over a content-bound, complete geometry-candidate certificate. It covers:

- the Leading Model with the shortest route to the target Unit, using base-edge distance so model/base scale is part of the decision;
- the physically closest target model for DIRECTLY TOWARDS and physically furthest target model for DIRECTLY AWAY;
- the centre-to-centre direct vector, including the original direction after a certified obstacle bypass;
- shortest-route filtering, while retaining every equally short route for the controlling player to choose;
- the non-strict endpoint rules: Towards may not end further away and Away may not end closer;
- involuntary movement stopping with the whole base in contact with the battlefield edge;
- arbitrary multi-model denominators, with every remaining model represented and dominated Towards/Away placement plans removed while coherency is retained;
- Leading Model overlap permission only for an object with DISPLACEMENT;
- immediate movement of that object into Base-to-Base contact, or the certified nearest available position when contact is impossible.

This slice deliberately does not claim a general continuous-geometry oracle. The route, placement, and contact candidate sets must be marked complete and are hashed into pending state, LegalSpace, action, receipt, and replay; incomplete or stale inputs fail closed. The procedure remains production-quarantined until the general Gap/Place and model/base geometry work in Slices 82 and 87 can independently produce those certificates.

## Evidence

- focused Judge `20/20`;
- current runtime `10/10`;
- aggregate `10/10`;
- cumulative `145` reports / `1,521` assertions;
- strict executor state contracts `50/50`;
- graph `9,017` nodes / `27,770` edges;
- slice `1638c6c7521ad15fe874cf34fcbc4afa01eb2064203c437c64385c1c72935feb`;
- catalogue `6383216ec3ff3704ac8ce865f3b135b750dccd367be82f3cb1810c8b74206bcd`;
- runtime `f312f141d77dcb6415aca3f78db455e9fb11e76495b815253f87c18a4af1af11`;
- graph `b7e502bea3ed2b29901fbd2113c7ee201314dd693005840ed8735440e5dabfcf`.

Authority Preview → Confirm → Apply is content-bound and signed with Ed25519. Replay passes after HMAC seal rotation, rejects tampering, and retains the frozen Slice 80 rules display.

The fixed official source lock was not refreshed. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced. Slices 82–111 remain: `30` planned slices and `402` actionable atoms.
