# Slice 174 preparation — source-backed faction inputs

This is preparation during Slice173's live generation, not Slice174 closure.
No paid faction generation starts before the accepted overall dependency.
Ticket18 remains1/8, project16/22, formal Skills0/5.

`packages/skill-production-v3/faction-evidence.mjs` binds all83 frozen official
product records to the current Skill catalogue, validates every payload/source
identity, and invokes the existing faction-card selection and faction-tag
eligibility Rules kernels. It does not reimplement faction eligibility or
filter only by a broad race name. Source/profile drift and incomplete product
sets fail closed; the compiler snapshots immutable data.

| Selected faction | Tag-eligible units/cards | Units within that total | Excluded army candidates |
| --- | --- | --- | --- |
| Terran Armed Forces |15 |5 |38 |
| Zerg Swarm |19 |9 |34 |

For each faction, all83 products are accounted for exactly once: selected
faction, eligible pool, excluded candidates, four non-army-building units,
five alternative faction cards and20 mission/deployment records. Full raw
payloads remain intact in included source records; exclusions retain exact
source references, missing tags and disposition. The complete global source
context is still mandatory at generation, not replaced by this focused view.

These15/19 are tag eligibility counts, not recommended rosters or complete
army legality. Slots, mineral/vespene, composition, upgrades, unique copies,
scenario choices and rule-specific summoned-unit entry require their own
gates. In particular, non-army-building units cannot silently become purchases
and alternative faction cards cannot be stacked with the selected one.

Ten test groups exercise both real Rules kernels, all83 records, raw payload
preservation, source/type/faction rejection, tampered/resealed or omitted/
duplicated products, input mutation isolation and no-generation/no-promotion
boundaries. Report:
`9ca89600c35b06366ab2ca5992df4ddb084f1324a8fa906799277efd714ace8a`.
The resulting evidence hashes are
`c3c6df5922a691536abbbc56fb9235d26f16ba6ca1046b11cfd86771bad770c3`
and `e9ad1e35ec0df9824c8239077591de9bcc222ad094fb4c18b9786ab0a65e3b52`.

No Provider calls, Skills, strategic-effectiveness claims, Room writes,
official-source refresh or training truth are produced by this preparation.
