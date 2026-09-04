# Ticket 17 Slice 163 — DSH boundary, source and denominator freeze

Status: complete. Ticket 17 is 1/9; Slices 164–171 remain. Overall project
status remains 15/22 because Ticket 17 is not yet closed. Ticket 14 physical
device acceptance remains 15/16 and is not waived.

## What this Slice completed

Slice 163 replaces an open-ended “connect DSH” plan with a finite nine-Slice
implementation denominator. It freezes the exact Ticket16 predecessor, current
official StarCraft source/FAQ/Rules identities, audited DSH package and MTL
architectural inputs. It also byte-freezes the existing Skill-generation
scaffold and states exactly why it is not completed execution.

The npm registry and official Git refs were read on 2026-09-04. npm `latest`
remains `@deepseek-ai/dsh@0.1.1-rc.2`; the newer `0.1.2-rc.1` is tagged `next`.
The selected package stays on the already audited `latest` release with exact
tarball integrity and commit. A floating tag is forbidden at run time.

## Concrete corrections to the old scaffold

- The old verifier stages the legacy unreviewed data pack. Slice 164 will stage
  the frozen Command Center `71/69/48` plus the reconciled current FAQ Rules
  chain instead.
- Both old arm executors are fakes. Slices 168–169 implement separate real
  direct-control and DSH execution while retaining identical experiment inputs.
- The old scanner is weaker than Ticket16's multi-encoding secret gate. The
  real executor must reuse the stronger semantics before any event or candidate
  becomes durable evidence.
- The old in-memory scheduler and promotion functions are Ticket18 scaffolds.
  Ticket17 cannot invoke them to claim durability or publish a Skill.

## MTL changes rather than copy

MTL provides the desired Teach/Ctx2Skill and correction lineage, but its pinned
DSH transport inherits `process.env`, places the raw Provider key in the DSH
environment, disables Session persistence, parses stdout as the only result and
reports attempts/usage as unavailable. StarCraft therefore adopts the role and
artifact model while replacing the transport, isolation, secret, Session and
accounting behavior.

## Verification

`npm run verify:ticket-17-slice-163-focused` passes 15/15 checks. It verifies:

- the boundary hash and exact Ticket16 predecessor;
- nine contiguous Slices 163–171;
- the current source/FAQ/Rules chain and no source refresh;
- DSH package version, commit, dist-tag observation and npm integrity;
- fail-closed isolation planning;
- six exact existing-scaffold hashes;
- pinned MTL lineage and rejected unsafe transport properties;
- all four registry-driven Skill families;
- Teach/Ctx2Skill role and correction boundaries;
- same-input paired-arm fairness;
- candidate-only authority and Ticket18 ownership;
- one bounded future pair versus separately approved large-scale production;
- no install, DSH, Provider, Skill, Memory, MuZero, self-play or training side
  effect in this Slice.

The frozen boundary hash is
`4e6a7f0169b3805a2df7b9f3c1dd5d4e637b281a8ce93897bb148437da6ab3b7` and
the focused report hash is
`5e1f724da8d6740d9214a6e5f3ca9974118da00fe82f80b0722ea54d486a7456`.
The historical fake-arm scaffold independently passes 5/5 regression checks.
The full Ticket 16 predecessor through Slice 163 aggregate exits zero,
including real Chromium 11/11 and 16/16 evidence. It only re-verifies the
already sealed Ticket 16 live receipt; no second external Provider call occurs.

The next Slice is 164: build the hash-verified current-official staged evidence,
four-family curriculum and question-tree denominator without calling a model.
