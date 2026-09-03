# FAQ F4 — abilities, tactical cards and keywords

Date: 2026-09-03
Status: F4 overlay executable; F5 aggregate remains required

## Outcome

The 27 F4 entries (FAQ 34–59 and 64) are implemented as 57 atomic rules and
27 strict behavior handlers. Together F3 and F4 now cover 50 of 68 FAQ entries
with 97 executable overlay atoms. Each atom binds the F1 source hashes, F2
classification, related Ticket 11 atoms, its handler, state reads/writes and
positive/negative/interaction/cross-time evidence.

F4 covers exact resource-card exhaustion and excess loss, self-range,
Tactical Card Active prerequisites, named ability/Reaction limits, Concussive
Shells visibility, numeric and BUFF stacking, Force Field interactions,
Life Support total damage, Creep timing, Academy refresh, reactions outside an
activation, Structure targeting, select/target normalization, PINPOINT,
LOCKED IN, detection, while-within checkpoints, REPEATABLE Reaction limits and
Specialist-carrier removal.

Five entries (41, 47, 52, 54 and 57) affect Token/Marker state and expand to 11
atomic rules. They cover blocked Faction Indicators, Creep snapshots/removal,
claimed-Artefact movement restrictions and detection Faction Indicators.

## FAQ 56 correction

Implementation-level review corrected the earlier F2 assumption: FAQ 56 does
not supersede the Core-derived rule that a completely unseen Indirect Fire
target may Evade. When at least one model is visible, the target unit is in
line of sight, receives no off-line-of-sight Evade, and its non-visible models
may still be casualties. F2 is therefore corrected to 23 `confirm`, 26
`refine`, 19 `new`, zero `supersede` and zero `conflict`. F4 tests both the
partially visible and fully unseen cases and creates no `supersedes` graph
edge.

## Graph and evidence

The F4 graph contains 233 nodes and 367 edges and explicitly extends the
immutable F3 overlay graph. F4 verification passes 16/16 with 27 positive, 21
negative/boundary and six interaction groups. Release hash:
`fff6ddea41340e1f12de86fcb1b688865ca704fbbb8b8fc845815b0780d17c67`.
Graph hash:
`cd150943d06181ea5b0d3daf7e1306ea0c280be5b473073ad10794d4eb88ea42`.

The immutable Ticket 11 runtime and F3 release remain available by exact hash.
F4 cannot become the aggregate current room runtime until F5 closes the last
18 entries, combines the graphs and proves cross-time Replay. No new source
refresh, Provider, Skill generation, DSH, MuZero export, self-play, memory or
training promotion ran in F4.
