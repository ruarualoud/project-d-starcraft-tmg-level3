# FAQ F3 — movement, battlefield and deployment rules

Date: 2026-09-03
Status: F3 overlay executable; aggregate current-runtime promotion waits for F4–F5

## Outcome

FAQ entries 05–27 are implemented as a source-versioned rules overlay above
the immutable Ticket 11 runtime. The 23 FAQ entries produce 40 atomic rules
rather than 23 question-sized macro rules. Each atom identifies one
definition, permission, constraint, derived value, normalization or state
transition; declares the state it reads and writes; binds the source question
and answer hashes; and links to its applicable pre-FAQ RuleAtoms.

The overlay exposes 23 strict behavior handlers with unknown fields, unknown
enums and out-of-scope entries rejected. The handlers cover:

- last-movement coherency snapshots, model/terrain gaps, engaged-enemy link
  traversal, Access Points, positive Move/Run displacement and Hold routing;
- maximum direct movement, Wobbly support/overhang, size-specific High Ground
  gap clearance, connected elevation routes and Direct Cover;
- deactivated marker control, physical-card-instance draft blocking, official
  long-wall components and Artefact claiming;
- High Ground deployment, Omega Worm/Pylon Entry Edges, enemy-denial immunity,
  Pylon Activation consumption, Activation Marker placement and ZOI limits;
- end-round marker deployment/failure consumption, reserve ability exceptions,
  deployment nomination and printed-Speed/no-pre-entry-Creep behavior.

## Atomic graph

Every F3 source entry and atom enters an additive relationship graph. The graph
has 175 nodes and 255 edges and links source lock → reconciliation → frozen
base graph → FAQ entry → atomic rule → executable behavior → state reads and
writes. It also links each relevant new atom to its existing base RuleAtoms.
Missing entry, behavior, state or base lineage fails closed.

Seven FAQ entries (16, 19, 21–24 and 27) directly affect Token/Marker
semantics. They expand to 16 atomic rules. Ticket 14 Slice 140 must eventually
consume the F5 aggregate graph and these exact identities; it must not use the
pre-FAQ graph as current truth.

## Version boundary and evidence

The Ticket 11 catalogue/runtime/graph are unmodified and remain available for
historical room display and Replay. F3 itself is executable and content
addressed, but cannot become the aggregate current runtime before F4 and F5.
No silent compatibility path exists.

Focused F3 verification passes 15/15 and exercises 23 positive plus 23
negative/boundary witnesses and five interaction groups. F2 passes 14/14;
the historical Standard Move and Reserve Deploy regressions pass 12/12 and
13/13. Release hash:
`ca9d1bdc610a9869e5af76f3ee652073b4e67f95a38d48db552310ce34bb14dd`.
Overlay graph hash:
`1eef1396afb057bf9ea47353bd41ee9003d185b0f378ccbb6bac844a89910ab7`.

No new source refresh, Provider, Skill generation, DSH, MuZero export,
self-play, memory promotion or training promotion ran in F3.
