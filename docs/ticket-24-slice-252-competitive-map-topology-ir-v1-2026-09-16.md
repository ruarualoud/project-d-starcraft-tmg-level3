# Ticket 24 / Slice 252 — Competitive map topology IR v1

Date: 2026-09-16
Status: implementation candidate; not Rules truth until Slice 253/254 compilation
Provider usage: none

## Delivery

`official-competitive-map-topology-catalogue-v1` transcribes all 20 Slice 251
research seeds into map-specific normalized topology records. This is not one
template with different names. Every record independently describes:

- deployment, contest, staging, flank, control and pocket zones;
- direct, flank, control and back-door lanes;
- lane clearance intent and gates/ramps/bridges/back doors;
- independently selectable source-derived terrain elements;
- a map-specific art composition hint for the later art layer.

Coordinates use a source-composition space of `1000 × 1000`. They preserve
relative topology only. They are not inches, do not become collision geometry,
and cannot be inferred from generated pixels at runtime.

## Two-layer selection contract

Every element exposes two independent choices.

1. Art layer: retain or hide the element's visible depiction. Art is retained
   by default so each selected classic map remains recognisable.
2. Rules layer: keep the default rule meaning, select another allowed meaning,
   or disable its rule object completely.

For a source obstacle this produces the required choices:

- `blocking`: visible and impassable;
- `passable_difficult`: visible, traversable and rules-significant;
- `visual_only`: visible but ordinary traversable board space;
- hide art + disable rules: remove the element entirely.

Other source kinds receive only semantically compatible choices. For example,
a high-ground element may be standable high ground, cover, difficult terrain or
visual-only; it cannot silently become an unrelated sight rule.

The choices are declarations only in this slice. Slice 253 adapts topology to
the 54 × 36 inch table and complete model bases. Slice 254 compiles a selected
declaration into separate immutable `artLayer` and authoritative `rulesLayer`
receipts and freezes them when a room is created.

## Safety and provenance

- All 20 records retain their Slice 251 seed hash.
- Each topology and the aggregate catalogue are content-hashed for drift
  detection, not as a production-start blocker.
- Generated art is never parsed back into Rules truth.
- These records remain `trainingTruth=false` until tabletop compilation and
  acceptance prove reachability, deployment, objectives, fire lanes and
  complete-base clearance.

## Focused gate

The Slice 252 gate checks only this delivery: module syntax, 20/20 seed
coverage, catalogue verification, unique topology hashes, per-element art/rule
toggles, and clean diff formatting. It does not rerun Slice 251, the unfinished
Slice 247 match, full builds or unrelated test suites.
