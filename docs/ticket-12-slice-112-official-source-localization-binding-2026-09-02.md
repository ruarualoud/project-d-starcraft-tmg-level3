# Ticket 12 Slice 112 — official source/localization binding v2

Status: implemented; Ticket 12 remains open at 1/7 planned slices.

## What changed

The v1 localization factory remains frozen for historical legacy-pack display.
The v2 factory has no legacy or repository fallback and accepts only the
already captured official Command Center chain:

- source lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`;
- snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`;
- official dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`;
- version tuple `units=71`, `cards=69`, `rules=48`.

The projection covers 271 captured records and 1,440 non-empty display-text
leaves. Every rendered field carries the lock, snapshot, official dataset,
localization dataset, record, payload, authority, review, and rights identities.
The denominator is split into 617 official-current product fields, 269 official
rule-prose fields still awaiting rulebook precedence review, and 554 community
display-only fields.

The resulting localization dataset is
`299b075b83ccd7f4147ed9f1119ae2b54eed58446ea7385399af4373d4abd42c`;
the source binding is
`d653698582c68ff08a36e4837a851225913a769c0ab1ae10f0e0b1a76563c09e`;
the display-field catalogue is
`a77d47770eef9a6af23bcbe30c53b6499015361aacc098f0eb30a8e8d3cb2305`;
and the field-provenance catalogue is
`41cb286586d7922f4a17772a02c4c64d6992f50c6f06fe6de46b20f8d945c896`.

## Failure policy

- A legacy pack argument, repository fallback, wrong lock, wrong snapshot,
  wrong dataset, mutated record, missing field provenance, or widened source
  authority fails before the runtime is created.
- Community fields cannot acquire an official-product label.
- Rule prose cannot bypass PDF/P2P precedence review.
- Machine drafts remain administrator-only; human correction changes only the
  translation sidecar.
- DSH is rejected before the translation Provider is invoked.
- No network source refresh occurred in this slice.

Focused verification passes 11/11. Adjacent v1 source/translation passes 6/6,
v1 localization runtime passes 5/5, the offline source lock passes 4/4, the
official Command Center Adapter passes 11/11, official latest-data binding
passes 12/12, and the frozen Ticket 11 closure remains 12/12.

## Remaining Ticket 12 work

This slice is not a real translation Provider, persistent review store,
human-review UI, offline cache, completed rights decision, or production
release. Those gates are assigned to Slices 113–118 in the Ticket roadmap.

No Skill was read into runtime, generated, promoted, or granted Rules/training
authority. No DSH, MuZero, self-play, memory promotion, or training-data
promotion ran.
