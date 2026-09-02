# Ticket 12 source registry and translation roadmap

Status: Slices 112–115 complete; Ticket 12 open at 4/7 planned slices.

The source capture is frozen for this development period. No slice may contact
the upstream Command Center, rulebook, FAQ, or P2P endpoints unless the user
explicitly requests a new capture. The current input remains source lock
`1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
normalized dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`,
and Command Center versions `71/69/48`.

## Planned slices

| Slice | Scope | Closure evidence |
| --- | --- | --- |
| 112 | **Complete.** Bind source/localization runtime v2 directly to the frozen official Command Center dataset; retain legacy v1 as historical display only and forbid fallback. | Exact source/snapshot/dataset hashes, complete display-field denominator, authority labels, tamper and fallback rejection, translation sidecar non-mutation. |
| 113 | **Complete.** Bind rulebook/P2P/FAQ page locators, source precedence, source-scope review, and rights/redistribution decisions to every public provenance class. The current FAQ semantic drift is quarantined while its reviewed older version remains historical display/pinned-replay evidence. | 271/271 current record locators, 83 product records/617 fields with 123 P2P page locators, 15 rule records/269 fields with Core page ranges, 192 Core anchors, current/historical FAQ 7/7 with seven drifted entries isolated, precedence conflicts, unresolved-rights isolation, old-source display retention. |
| 114 | **Complete.** Define the explicit-command-only importer, immutable raw capture, version/diff classification, review queue, rollback, and room pinning workflow. | Offline replay of stored captures, same-version display-only drift, value/schema drift quarantine, no silent replacement. |
| 115 | **Complete.** Implement the direct translation Provider Adapter and bounded prompt/glossary/cost/attempt receipts. DSH remains forbidden outside Skill generation. External paid smoke stays a deployment gate until a user supplies credentials. | Credential isolation, egress/model/profile binding, deterministic real-Adapter wire smoke, failure and retry accounting, canonical non-mutation; no false production claim. |
| 116 | Add the SQLite M1 and PostgreSQL production Adapter under one translation-review store contract. | Candidate/review/correction lifecycle, CAS/idempotency, audit lineage, restart/replay, cross-Adapter contract tests. |
| 117 | Add shared Web/App provenance, machine-draft review/correction UI, locale fallback, and offline cache. | Desktop/tablet/mobile UI evidence, stale-source fallback, offline/reconnect behavior, cache invalidation and accessibility. |
| 118 | Run the Ticket 12 aggregate, source/translation security audit, cross-version replay, and handoff gate. | All prior slice reports plus Ticket closure report; production claims remain limited to gates actually passed. |

## Authority boundaries

- Official source payload and RuleAtom truth are immutable inputs to localization.
- Translation is a display sidecar. It cannot modify IDs, numeric fields,
  geometry, legal actions, Rules, receipts, replay, or training truth.
- Community content transported beside official records stays community
  display-only.
- Rights and redistribution eligibility are independent of source identity and
  technical exactness.
- DSH is not a translation Provider. It remains reserved for Ticket 17 offline
  Skill generation.
