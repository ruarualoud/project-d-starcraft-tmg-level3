# Ticket 11B — Slice 86 special terrain and Access Points

## Outcome

Slice 86 promotes the exact 13 atoms assigned by remaining-route v2. The ledger advances from `578/334/114` to `591/321/114` (`executable/review-required/display-only`), and `authority.special-terrain-rules-v1@1.0.0` becomes the 55th executor with a complete state and relationship contract.

The slice is split into four executable groups:

- Access Points and Ramps: a content-hashed setup agreement declares every terrain piece, adjacent elevation pair and globally unique Access Point. Ground models change elevation only through an Access Point. A Ramp is Size 1 Mid Ground, has exact base and top Access Points, permits an endpoint on its surface, and requires the corresponding route.
- Grass: Grass is exactly Size 2, does not block ground movement, blocks line of sight under the frozen Slice 84 Cover geometry, and is removed for the remainder of the battle when the Leading Model path or any Unit endpoint intersects it. Frozen Slice 83 semantics preserve Grass on Flying overflight and remove it at a Flying endpoint.
- Impassable and Size 0–1 terrain: missing Access Points on a declared adjacent-elevation boundary derive Impassable Terrain; ground transit, entry and endpoint overlap reject. Ordinary Size 0–1 terrain remains freely passable but still forbids endpoint overlap.
- Leading Model, Gap and coherency: every movement certificate invokes the frozen Slice 82 Gap kernel. Special-terrain coherency is rebuilt from the complete model placement denominator; links crossing Access terrain must pass a matching Access Point. The caller cannot nominate an unchecked link set.

## Authority and geometry boundary

The executor owns complete candidate certification, parameter-domain choice, Apply, Grass lifecycle mutation, receipt and log. Source, state, setup-agreement or MatchBinding geometry drift invalidates the pending action. The setup denominator retains removed Grass for audit while active geometry excludes it, so permanent removal does not corrupt the original battlefield agreement.

The geometry authority remains deliberately bounded to round model bases and axis-aligned rectangular terrain/Access Point footprints. Arbitrary bases, `Within`/`Wholly Within`, general measurement and the remaining model-placement denominator belong to Slice 87. This slice therefore remains production-quarantined and does not imply complete game LegalSpace.

## Frozen lineage and gates

No official source refresh occurred. The lock remains `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`, with snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`, dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`, and versions `71/69/48`.

- route v2: `10/10`;
- focused Slice 86 Judge: `30/30`;
- current runtime: `10/10`;
- aggregate: `10/10`, with 150 base reports / 1,664 assertions and 151 / 1,674 including the aggregate;
- relationship graph: 9,634 nodes / 28,774 edges, 55/55 declared state contracts, zero blocking gaps.

Frozen identities:

- slice `99454bd06cb660304dd4ae69f9f4753dd4936d402c3d072dcb8744de12d18059`;
- catalogue `da040b3e25a9d05e74dfe5af3b7a7baf94627574ede9aa59b171942f023a3622`;
- runtime `f429e97622753e125229d60ce8c45fc7b77a3f542b31166b0a5383b9cd14e016`;
- graph `92362a43427003eb612baf167f6b2d59c7faacd624ffe1b1f3bb235b18283497`.

Ed25519 replay survives HMAC seal rotation and rejects tampering. Historical executors and old-rules display remain frozen; no silent compatibility path is introduced. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training truth was produced. Slices 87–111 remain: 25 planned slices and 321 actionable atoms.
