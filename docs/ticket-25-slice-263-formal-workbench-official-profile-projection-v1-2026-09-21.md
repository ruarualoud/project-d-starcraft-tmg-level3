# Ticket 25 / Slice 263 — formal Workbench official-profile projection

Date: 2026-09-21
Status: complete

## Defect reproduced

The formal Standard-2000 Marine piece deliberately carries identity and
selected equipment, but no legacy inline `stats` or `weapons`. The authoritative
Room already freezes the current official combat profile, V2 attack catalogue
and action-route catalogue. `battle-workbench-v1` ignored those sources and
therefore projected `hpPerModel:null`, zero weapons and zero threat weapons.

## Repair

- RoomRuntime supplies the Workbench query with the current Room's frozen
  official combat, V2 attack and action-route catalogues. They are query input,
  not a second mutable data source.
- Workbench resolves each official piece by `officialUnitRecordKey`, filters
  attack profiles through that piece's viewer-visible selected equipment, and
  projects HP, shield, armour, evade, printed movement branch and weapon facts.
- An official piece never silently falls back to stale inline weapons when the
  official catalogue is present. Legacy rooms continue to use inline profiles.
- Viewer projection preserves the already-public equipment row identity fields
  needed for selection. It does not expose private roster or Provider state.
- Multi-tag official weapon targets are matched as a set rather than one comma
  literal.

## Focused receipt

`node scripts/verify-ticket-25-slice-263-formal-workbench-official-profiles-v1.mjs`
passed 18/18 after one failing reproduction and two focused repairs:

- official Marine combat weapons: 2;
- selected/equipped official attack profiles: 4;
- Workbench weapons: 4;
- threat weapons: 4;
- Provider calls: 0; estimated cost: ¥0.

No source refresh, Rules mutation, full-suite test or paid model call occurred.
