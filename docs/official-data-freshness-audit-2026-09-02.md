# StarCraft TMG official-data freshness audit

Date: 2026-09-02 (Asia/Shanghai)
Live observation window: 2026-09-02T13:08:56Z–2026-09-02T15:33:31Z
Mode: read-only research; this report is the only repository artifact; no source
refresh, snapshot mutation, import, or rules change

## Verdict

The short answer is **not fully**.

| Question | Finding | Confidence |
| --- | --- | --- |
| Are the frozen sources genuinely first-party/official? | **Yes for the selected source chain.** The publisher site links directly to the Command Center; that app names Archon Studio and its live Firebase configuration points to the same `starcrafttmgbeta` project used by the repository. The rulebook, P2P sheets, FAQ, news, and Downloads inventory are served from the publisher domain. | High, but based on first-party web provenance rather than a publisher cryptographic signature. |
| Was the 2026-08-30 capture the live upstream at capture time? | **It was a direct, complete response from the selected endpoints**, with no Firestore page token and with version tuple `71/69/48`. Absolute “latest at that instant” cannot be independently proven because the Firestore collections expose neither ETags nor a public signed release log. | High for direct capture; not mathematically provable as global latest. |
| Is the frozen Command Center gameplay projection still current now? | **Yes as observed.** All 26 Unit documents, 37 Tactical Card documents, 15 Rules Section documents, and 20 official mission/deployment documents are field-identical to live. The version tuple remains `units=71 / cards=69 / rules=48`. | High as of the observation window. |
| Is the complete frozen Firestore response still current now? | **No.** `faction_cards` is now 194 rather than 193 documents. One pending community mission was added and three community-mission `upvotes` fields changed. No official-product or rules-prose record changed. | High. |
| Are all current official rules materials represented by the frozen source lock? | **No. This is the material gap.** The official Downloads page now exposes `StarCraft-TMG-FAQ_EN.pdf`, `FAQ V1.0`, last modified 2026-09-01—after the 2026-08-30 freeze. It is absent from the repository source lock and contains approximately 68 gameplay Q&A entries. | High. |

Therefore the correct claim is:

> The repository has an authentic, immutable 2026-08-30 official-source capture whose Command Center gameplay records are still current as of 2026-09-02, but it does **not** yet contain or reconcile the newest official FAQ PDF. It must not be described as a complete latest-official-rules corpus.

## What the repository actually freezes

The active development lock is [`content/official-development-tranche-s75-111-source-lock-v1.json`](../content/official-development-tranche-s75-111-source-lock-v1.json):

- captured at `2026-08-30T06:18:09.287Z`;
- lock hash `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`;
- derived Command Center snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`;
- normalized dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`;
- version tuple `units=71 / cards=69 / rules=48`;
- 271 normalized records: 83 official-product candidates, 15 official rules-prose records, and 173 community display-only records;
- 20 selected upstream resources: five Firestore endpoints, four PDFs, the Command Center shell plus eight app assets, the mutable website FAQ, and the rules-news index;
- explicit policy: no automatic refresh, no repository fallback, no silent replacement, old room bindings remain snapshot-pinned, and a new capture requires an explicit user command.

The offline verification report at [`build/ticket-11-rule-atoms-v1/official-development-tranche-source-lock-report.json`](../build/ticket-11-rule-atoms-v1/official-development-tranche-source-lock-report.json) reproduces the lock/snapshot/dataset identities. The lock itself is content-hashed, but it is not signed by Archon Studio or Blizzard.

## Why the selected sources are first-party

The provenance chain is internally consistent:

1. The [StarCraft TMG publisher site](https://starcraft-tmg.com/) identifies the product and Archon Studio, displays the Blizzard licensing/trademark notice, and links its “Game APP” navigation directly to `https://sc.starcraft-tmg.com`.
2. The linked [Command Center](https://sc.starcraft-tmg.com/) identifies itself as “StarCraft TMG - Command Center”, `BETA v1.4`, and an Archon Studio beta system.
3. The Command Center’s live [`firebase-init.js`](https://sc.starcraft-tmg.com/modules/firebase-init.js) identifies Firebase project `starcrafttmgbeta`. That is the project used by the frozen and live [versions document](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions).
4. The [official Downloads page](https://starcraft-tmg.com/downloads), [core rulebook](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf), P2P sheets, [website FAQ](https://starcraft-tmg.com/faq), [rules-news index](https://starcraft-tmg.com/news/rules), and new [FAQ PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf) are all served from the same publisher domain.

This proves a strong first-party web chain. It does not turn the public Firestore backend into a documented or stability-guaranteed public API; the repository’s label `official_product_backend_candidate` remains the honest one.

## Live comparison against the frozen lock

All live requests were GET/HEAD observations made in memory or under `/tmp`. The capture script was not run and no live response was copied into the repository.

### Command Center and Firestore

| Source | Frozen | Live observation | Result |
| --- | ---: | ---: | --- |
| `system_metadata/versions` | `71 / 69 / 48` | `71 / 69 / 48`; document `updateTime=2026-05-26T13:23:51.064119Z` | Exact canonical match |
| `army_units` | 26 documents | 26; zero field changes; no page token | Exact canonical match |
| `tactical_cards` | 37 documents | 37; zero field changes; no page token | Exact canonical match |
| `rules_sections` | 15 documents | 15; zero field changes; no page token | Exact canonical match |
| Official faction records | 10 missions + 10 deployments | 10 missions + 10 deployments; zero field changes | Exact gameplay match |
| Community faction records | 129 missions + 44 deployments | 130 missions + 44 deployments | Display-only drift |
| Command Center shell and eight static assets | 9 content-bound resources | All nine byte-identical, including ETags where supplied | Exact byte match |

The raw Firestore response byte hashes for otherwise-equal collections differed because response serialization/order is not a stable identity. RFC8785-style canonical hashes and every document field were equal for Units, Tactical Cards, Rules Sections, and the versions document.

The four current differences in `faction_cards` are all community display-only data:

- added `rHDOTrC7d6qtr2EvcBiE`, a pending `community_mission` named “Escape From Aiur”, created `2026-08-31T20:50:46.908187Z`;
- `3TLSupHClPWA8DGwSkhm`: only `upvotes` changed;
- `AZLLFOxH1byrcErqhZsc`: only `upvotes` changed;
- `dvg3Z44m6YfT3W3xRDoy`: only `upvotes` changed.

These differences change the full upstream collection/snapshot identity, but not the official gameplay dataset used by the rules engine.

### Frozen PDFs and mutable web pages

| Source | Current observation | Result |
| --- | --- | --- |
| Core rulebook | 15,688,406 bytes; SHA-256 `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`; ETag `"6a281077-ef62d6"`; last modified 2026-06-09 | Byte-identical |
| Protoss P2P | SHA-256 `4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212` | Byte-identical |
| Terran P2P | SHA-256 `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c` | Byte-identical |
| Zerg P2P | SHA-256 `6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364` | Byte-identical |
| Website FAQ | Raw HTML changed with routing/template output; the same seven category-9 entries produce semantic hash `e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92` | Semantic match |
| Rules-news index | Raw HTML and locale routes differ; frozen and live pages both list seven articles, including “Immortal: Glory Through Endurance” dated 2026-08-23 | Article-set match; not rules authority |

The frozen website FAQ is a seven-entry, Polish-language product FAQ. It covers broad product questions such as board dimensions and line of sight. It is **not** the same document as the new English gameplay FAQ PDF.

## Missing current official FAQ PDF

The live [Downloads page](https://starcraft-tmg.com/downloads) exposed 24 English PDF links during the audit. The source lock binds only four of them: the core rulebook and three P2P card sheets. It does not freeze the Downloads inventory itself.

Most of the other unbound files are named as starter-set, force-expansion, promo, product, or terrain manuals, so this audit does not claim that every one is normative gameplay text. Their semantic relevance has not been reviewed. Inventory completeness nevertheless cannot be claimed.

One omitted file is unambiguously rules-relevant:

- official URL: [StarCraft-TMG-FAQ_EN.pdf](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf);
- document title/version: `FAQ V1.0`;
- HTTP `Last-Modified`: `Tue, 01 Sep 2026 14:45:31 GMT`;
- ETag: `"6a96e50b-5178f"`;
- size: 333,711 bytes;
- observed SHA-256: `eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c`;
- approximately 68 `Q:` entries across Units & Characteristics, Measuring & Movement, Battlefield, Deployment/Entry Edges, Attack Sequence, Abilities/Tactics Cards, Keywords, and Templates/Spillover.

Its publication timestamp is more than two days after the frozen source lock. It contains clarifications directly relevant to implemented rules areas: Shielded and non-lethal damage, zero-length movement, direct movement, high-ground placement and gaps, deployment and Entry Edges, Evade/Surge and modifier caps, casualty selection, reaction timing, Creep/Force Field interactions, Pinpoint/Indirect Fire/Locked In, Morph scoring, and template Spillover.

This does **not** by itself prove that a current RuleAtom is wrong: many FAQ answers may merely restate existing core rules and some may already agree with implemented behavior. It proves that the current rules engine has not been source-reconciled against the newest official FAQ corpus, so completeness/currentness cannot be asserted.

## What remains unprovable

- The publisher provides no cryptographically signed release manifest for the website, Firestore collections, or PDFs.
- The Firestore collection endpoints provide no ETag/Last-Modified value and the app exposes no public API schema or changelog contract. The audit proves equality at observation time, not future stability.
- The `system_metadata/versions` tuple remained unchanged even while community documents changed, so it is not a complete content revision identifier.
- The selected four Firestore collections are those consumed by the official Command Center app and repository adapter; without a first-party published collection inventory, the absence of another relevant backend collection cannot be proven.
- The 19 other English PDFs omitted from the lock were inventoried by URL and HTTP metadata only; this audit did not semantically classify their entire contents.
- “Latest” is necessarily time-scoped. The live results above are valid only for the stated observation window.

## Recommended next source action

Do not silently modify the existing lock or old room bindings. On a fresh explicit user command, create a new immutable source version that:

1. freezes the official Downloads inventory as a source in its own right;
2. captures `FAQ V1.0` with its exact bytes, ETag, Last-Modified value, and content hash;
3. classifies the remaining 19 unbound PDFs as rules-bearing, component/manual-only, or display-only;
4. splits and maps all FAQ questions to the existing RuleAtom relationship graph;
5. runs exact conflict and coverage review against current atoms before allowing the new source version into new rooms or any training-data path;
6. preserves the current `1adbdb65…d1757a1` lock and its rules display for historical rooms.

Until that explicit refresh/reconciliation is completed, retain the bounded claim: **current official Command Center gameplay data, frozen 2026-08-30; newest official FAQ not yet incorporated; production/training currentness not proven.**
