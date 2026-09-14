# Ticket 21 — Production operations, security and observability

Date: 2026-09-14  
Status: complete, 8/8

## Outcome

Ticket 21 turns the already implemented Web/App, authoritative room, Provider,
Skill, self-play and training-data paths into one explicit operational control
plane. It does not claim that a local process, a PostgreSQL protocol double or a
development key is a production deployment. Four modes are distinct and cannot
silently escalate:

1. `local_demo`
2. `controlled_experiment`
3. `production_room`
4. `training_eligible_run`

Content hashes continue to identify lineage. Compatibility is decided by the
existing data/rules/action-space version contracts and declared adapters, not by
requiring every historical hash to match the current build.

## Reference audit

The local StarCraft implementation already supplies RoomStore CAS, SQLite and
PostgreSQL adapters, append-only journals, Provider attempt accounting, isolated
credential/egress workers, Strategy Release Store leases, immutable Skill
artifacts, viewer-safe trajectory auditing and independent training approval.
The audited Maze Tower League reference adds useful patterns for authorization
boundaries, KMS envelope encryption, durable background work and subject
deletion. Ticket 21 extracts those operational ideas into StarCraft-owned deep
modules instead of copying game-coupled code.

The remaining gap is composition: no single authority currently proves that an
identity, environment, key source, store, release, retention policy, telemetry
policy and incident state all permit the requested operation.

## Slices

| Slice | Deliverable | Focused acceptance |
| --- | --- | --- |
| 202 | **Complete.** Environment and readiness contract | Four modes have explicit capabilities and prerequisites; a lower mode cannot claim a higher one. |
| 203 | **Complete.** Identity/RBAC authorization boundary | Public, owner, seat, worker, reviewer and administrator actions are scoped; BYOK never grants administration or cross-user access. |
| 204 | **Complete.** Key-provider and rotation control | KMS-style key references, purpose/context binding, active/retired/revoked lifecycle and historical verification; BYOK is never persisted. |
| 205 | **Complete.** Multi-instance CAS and durable queue | RoomStore and job-store health are classified; queue leases use revision/fence/idempotency and reject stale workers after recovery. |
| 206 | **Complete.** Immutable release and distribution gate | Exact app/rules/data/action-space/Skill/source/assets manifests, rights state and rollback target are pinned; development media cannot ship publicly. |
| 207 | **Complete.** Privacy retention and deletion workflow | Artifact classes have retention/deletion/legal-hold rules, subject discovery is scoped, deletion is resumable and unrelated records are invariant. |
| 208 | **Complete.** Telemetry, SLO and budget control | Secret-safe metrics cover room/agent/queue/Provider/training paths, token/cost thresholds alert, and availability/error/latency objectives are evaluated. |
| 209 | **Complete.** Incident quarantine, rollback and aggregate readiness | Critical/High incidents quarantine affected scope, immutable release rollback is rehearsed, and one aggregate report exposes every external production gate. |

## Closure

All eight focused Slice verifiers passed. The aggregate operational result is
truthful rather than binary marketing status:

- local demo: ready;
- controlled experiment: ready;
- production Web: not ready until external infrastructure/operations gates close;
- production App: additionally blocked by real physical-device acceptance;
- training-eligible run: separately blocked until an exact trajectory receives
  independent approval.

The implementation is complete; external deployment configuration and approvals
remain inputs to the gates, not code-path substitutes.


## Acceptance boundaries

- Only Critical/High findings block integration. Medium findings are retained.
- User API keys and seat credentials never enter release, telemetry, audit or
  training artifacts.
- Training eligibility always remains a separate approval step after technical
  eligibility.
- A production room requires external identity, externally managed keys,
  production PostgreSQL/multi-instance CAS, durable queue, approved rights and
  an immutable release. Missing infrastructure is reported, never substituted.
- Each Slice runs one focused verifier after its code change. Passed unrelated
  gates are not repeated.
- No source refresh and no Provider/model call are required by this Ticket.
