# Ticket 21 production operations closure

Date: 2026-09-14  
Status: complete, 8/8  
Project status after closure: 20/22

## Delivered

- Four non-escalating workload/environment classes.
- Default-deny Identity/RBAC with exact resource grants and separation of duty.
- External-KMS port, Ed25519 long signatures, HMAC short seals, AES-GCM
  envelopes, version rotation, retirement and revocation.
- Generic durable jobs over the existing SQLite/PostgreSQL Strategy Store
  contract with input references, CAS, lease fences and restart recovery.
- Immutable release manifests, exact versions, media rights, independent
  distribution approvals, CAS activation and declared-target rollback.
- Hash-scoped privacy discovery, deletion/pseudonymization, minimum retention,
  legal hold, dependent invalidation and resumable proof.
- Secret-safe, low-cardinality telemetry; SLO and cost/accounting projections;
  ¥100 incremental soft notices and per-run max-call reset semantics.
- Critical/High incident quarantine, exact rollback drill and five-way readiness
  aggregation.

## Focused evidence

| Slice | Report |
| --- | --- |
| 202 | `build/ticket-21-slice-202-environment-readiness-v1/report.json` |
| 203 | `build/ticket-21-slice-203-identity-rbac-v1/report.json` |
| 204 | `build/ticket-21-slice-204-key-control-v1/report.json` |
| 205 | `build/ticket-21-slice-205-durable-operation-v1/report.json` |
| 206 | `build/ticket-21-slice-206-release-distribution-v1/report.json` |
| 207 | `build/ticket-21-slice-207-privacy-retention-v1/report.json` |
| 208 | `build/ticket-21-slice-208-telemetry-slo-budget-v1/report.json` |
| 209 | `build/ticket-21-slice-209-incident-readiness-v1/report.json` |

## External gates still open

The aggregate intentionally reports production Web/App and training eligibility
as false in the local workspace. It does not have an external production KMS,
real multi-instance PostgreSQL deployment, production privacy/telemetry sinks,
non-fixture incident drill, App physical-device receipt or independent approval
for a selected training trajectory. These are deployment/approval inputs; local
fixtures cannot satisfy them.

No Provider/model call, source refresh or billable token was used.

