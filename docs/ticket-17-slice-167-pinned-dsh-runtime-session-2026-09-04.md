# Ticket 17 Slice 167 — pinned DSH runtime, profile and Session

Date: 2026-09-04

Status: complete

Ticket progress: 5/9

Project progress: 15/22 Tickets complete; Ticket 14 remains 15/16

## Outcome

Slice 167 installs and actually starts the exact DeepSeek Harness package in
the disposable M1 boundary from Slice 166. This is a boot/configuration and
Session-lifecycle proof, not a model-generation run.

The frozen runtime identity is:

- npm package: `@deepseek-ai/dsh@0.1.1-rc.2`;
- npm integrity:
  `sha512-UP1UIh6q3Gme/yXRn/QL2P8IsVlv8Shpg22TRJIZPsCRWLm4CBiA1MUvXmJAfsOEETBMLAl+xWPtFw6ICsN3wg==`;
- npm shasum: `1a5112369f1c46b13a6e6f21de8af5e6afd45074`;
- audited npm tarball SHA-256:
  `47ec05f45ada5ab87779ae18a90456b5ebff5421dc0ff5c179677d65e1c16057`;
- upstream tag/commit: `dsh-v0.1.1-rc.2` /
  `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`;
- pnpm version: `9.12.0`;
- install mode: `--frozen-lockfile --ignore-scripts`;
- package/lock hashes: `0daf52a7...84e` / `dca7c3a7...0615`;
- staged runtime tree: `35,962` entries, `204,121,239` regular-file
  bytes, hash `df140b79...e1cd`.

The lock file is committed; `node_modules` is reproducible ignored build
state. Missing installation, a different package/lock/profile byte, a changed
tree entry, an escaping symlink, a group/world-writable runtime file, or a DSH
package version outside the pin fails closed. The M1 runner stages verified
regular files as hard links and recreates only validated internal relative
symlinks. The OS policy denies all writes to the staged runtime, so the shared
inode cannot be modified by the DSH process.

## Restricted profile

The Project D profile is an overlay after the shipped `dsh-base` and
`dsh-headless` bundles. Its exact patch hash is `86a70a68...57d4d`. The
official DSH `--dump-config` composition is normalized and frozen as:

- effective dump hash: `b299aa29...2838`;
- effective row hash: `1da2d9cb...0985`;
- `81` total rows: `15` enabled and `66` explicitly disabled;
- `78` resolved plugin packages, lock hash `e72d2353...64b9`;
- every `@deepseek-ai/dsh*` plugin is exactly `0.1.1-rc.2`.

Only the in-process timer, LLM service seam, Session, non-model title,
Agent/default route, token meter, timeout/checkpoint policy, tool registry,
system prompt, Agent loop and headless startup/runner remain active. The
profile names `project-d-offline-broker`, but Slice 167 mounts no Provider
broker.

The following capabilities are disabled in effective config and also denied
at the OS boundary: direct DSH Provider adapters, credential/settings readers,
telemetry, Web/search, subprocess/shell/PowerShell, code worker, filesystem
tools, local sandbox, jobs, subagents/workflows, repository instruction/Skill
readers, compaction/goal/todo/editor tools and SQLite query projection.
Session persistence is explicitly `compression: none` and
`packChunks: false`, preserving one externally auditable event per JSONL line.

## Session contract

The isolated smoke imports the official pinned DSH `Session` class and event
catalogue, creates one top-level `starcraft-tmg-skill-v1` Session and appends:

1. `turn/start`;
2. `step/start`;
3. one zero-usage `assistant/chunk`;
4. `step/end`;
5. `turn/end`.

The independent parser freezes Session format `0` and the 48-type catalogue
hash `c0d9788f...a2a0`. It verifies exact header/envelope shapes, top-level
delegation, contiguous sequence/time order, turn/step brackets, tool
call/result pairing and disjoint input/output/cache-read/cache-write/reasoning
usage. Unknown required events, sequence gaps, usage disagreement, unmatched
tools and open brackets fail closed. An unknown event is skipped only when its
envelope explicitly says `ignorable: true`.

## Verification

- focused Slice 167 checks: `23/23`;
- predecessor Slice 166 isolation checks: `17/17`;
- focused combined gate: pass;
- full Ticket 15 → Ticket 16 → Slice 163 → 164 → 165 → 166 →
  167 aggregate: exit `0`;
- final aggregate Slice 167 report: `23/23`, hash
  `2e217f37...cc1f5`;
- runtime receipt: `b9f485a9...ffa5`;
- runtime tree: `df140b79...e1cd`;
- config dump/rows: `b299aa29...2838` / `1da2d9cb...0985`;
- plugin lock: `e72d2353...64b9`.

Session, OS-job, lifecycle and report hashes include current timestamps or
ephemeral paths and therefore are run receipts rather than frozen constants.
The latest aggregate report is at
`build/ticket-17-skill-generation-v1/slice-167-report.json`.

## Authority, tokens and next Slice

No official StarCraft source refresh occurred. Slice 167 made zero Provider
calls and added `0` input, output, cache-hit, cache-miss or total billable
tokens and `¥0` estimated Provider cost. The externally auditable project
total remains `2,424` input + `44` output = `2,468` tokens and approximately
`$0.00056232`; no `¥100` notification tier was approached. The long-task Codex
internal token counter is tracked separately because it is not an external API
invoice meter.

No candidate Skill was generated or published, no Memory was written, and no
Rules, Room, MuZero, self-play or training-truth authority was granted.
Large-scale four-family production still requires the user's separate
confirmation.

Slice 168 is next. It implements one common credential/Provider broker and the
real DSH-off control executor, pins pricing and USD/CNY forecast evidence, and
enforces notification before every cumulative estimated `¥100` crossing.
