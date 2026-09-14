# Ticket 22 / Slices 210–214 — final synthesis and acceptance roadmap

Date: 2026-09-14  
Status: active  
Project state on entry: 20/22 Tickets complete; Ticket 14 is 15/16 because
physical-device acceptance is deferred.

## Purpose

Ticket 22 packages the implemented StarCraft TMG Level-3 system into one
auditable handoff. It does not manufacture production evidence, broaden a
bounded rules fixture, approve training data, or waive the App device gate.

The acceptance vocabulary is fixed:

- `implemented_verified`: implementation and focused evidence exist for the
  stated denominator;
- `implemented_bounded`: the path works only for the named fixture or subset;
- `external_gate`: implementation is present, but deployment/device/independent
  approval evidence must be supplied outside the repository;
- `not_proven`: no valid evidence supports the broader claim.

Only Critical/High findings block integration. Medium findings are recorded as
debt. Existing green verifiers are consumed as immutable evidence rather than
rerun.

## Slices

| Slice | Deliverable | Acceptance |
| --- | --- | --- |
| 210 | Requirement traceability | Original product outcome and the standard template's eight final conditions map to exact code/evidence, status and non-claims. |
| 211 | Architecture, ADR and contract index | Five authority planes, deep-module ownership, runtime dependencies, version/Adapter policy and operational boundaries have one navigable index and explicit decisions. |
| 212 | Verification, risk, debt and external-gate matrix | Every material claim names a report or evidence file; open production/device/training gates and bounded-fixture limitations remain visible. |
| 213 | Developer/operator/user handoff bundle | A new team can locate, build, run and operate the bounded system without receiving credentials or mistaking development evidence for production readiness. |
| 214 | Final machine aggregate and closure | One focused verifier checks the handoff manifest and existing immutable evidence, emits a machine-readable report, and closes Ticket 22 without rerunning historical suites. |

## Dependency order

```text
210 requirements/evidence
  -> 211 architecture/contracts
  -> 212 verification/risk truth
  -> 213 handoff/runbook
  -> 214 machine aggregate
```

Ticket 14 physical-device acceptance is independent of the Ticket 22 document
and machine-evidence bundle. After Slice 214, it remains the project's final
open acceptance item unless a real Android/iOS device receipt is supplied.

## Fixed non-claims

- The Ticket 11 catalogue proves 912/912 actionable RuleAtoms and retains 114
  display-only atoms. It does not by itself prove every possible composition,
  map, roster or interaction in a production match.
- The complete current-rules and A–A runs are bounded Marine/Zergling Hold
  Position fixtures. They do not prove arbitrary-army strategy strength.
- The five accepted foundational Skills are usable, versioned strategy inputs;
  their tactical strength is not established for every faction/opponent pair.
- Ticket 19 exports and round-trips a real player-view terminal trajectory. It
  does not train a learner, and eligibility requires independent approval.
- Local demo and controlled experiment are ready. Production Web/App and a
  training-eligible run remain false until their exact external gates close.
- The APK build/hash exists; physical-device behavior has not yet been accepted.

## Validation policy

Slices 210–213 are document/manifest synthesis and consume already-passed
artifacts. Slice 214 adds exactly one ticket-specific acceptance verifier. It
checks only the files and evidence that Ticket 22 introduces or references; it
does not rerun Rules, browser, Skill, self-play, trajectory or production
subsystem suites.
