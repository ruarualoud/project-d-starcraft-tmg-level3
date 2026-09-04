# Ticket 17 Slice 166 — disposable OS isolation and capability firewall

Status: complete. Ticket 17 is 4/9; Slices 167–171 remain. Overall project
status remains 15/22 because Ticket 17 is not closed. Ticket 14 physical-device
acceptance remains 15/16 and is not waived.

## Delivered boundary

The offline Skill worker now has one M1-qualified execution backend:
`macos_sandbox_exec_behaviorally_attested_v1`. It is accepted only when the
root-owned, non-group/world-writable `sandbox-exec` and Node binaries are
content-hashed and a fresh behavioral attestation passes. Docker CLI presence
does not count: the unavailable daemon remains unqualified. Linux, missing or
tampered `sandbox-exec`, and the not-yet-implemented container path fail closed;
there is no ordinary `child_process` fallback.

Each job creates a private one-owner temporary scope containing separate
read-only runtime/input and writable output/tmp directories. The parent writes
only a bounded entry module and JSON staged input, closes stdin, ignores stdout
and stderr, supplies exactly `LANG`, `NODE_NO_WARNINGS` and `TMPDIR`, invokes no
shell, and accepts only a bounded credential-scanned JSON result file. The
profile denies repository and user/configuration data reads, writes outside the
two ephemeral writable directories, direct network and child-process creation.
Node receives the minimum host metadata/system-runtime read surface required by
this macOS backend; that exception is not an application-data mount.

Timeout kills the disposable process group. Success, failure, timeout,
malformed result and unsafe result all delete only the scope created for that
job and verify that it is gone. A job requires the exact in-process current
attestation hash. Every successful receipt binds the backend, profile template,
concrete profile, entry, staged input, output and cleanup result.

## Behavioral proof

The attestation worker is intentionally hostile. On every verifier run it
proves all of the following against the real OS backend:

- one staged input is readable and byte-hash exact;
- a synthetic host-data sibling is rejected with `EPERM`/`EACCES`;
- representative current Rules, Room and Skill-registry files are all rejected;
- a write outside the job output/tmp roots is rejected;
- spawning `/bin/sh` is rejected;
- connecting to a live parent loopback listener is rejected before the listener
  accepts any connection;
- only the three explicit environment keys are visible;
- stdout-only, credential-shaped input/output, wrong attestation, timeout,
  nonzero exit, malformed JSON and receipt mutation all fail closed.

The focused gate passes 17/17 and the Slice 165 role-graph regression passes
20/20. The stable profile-template hash is
`18110c7e0ef5de70bcf1c58f684204b0fd121d3435f69d4799b13be6506e23a0`.
The observed `sandbox-exec` binary hash is
`abc5bb136d6b5cce8fa85d789f78e3326c51ca60cae637b2064adfb67a1dcd9a`;
the observed Node binary hash is
`9e831e9b13aa47c5e5eaa3904d232aa527124e8abba7ca5d72b67b46cfb10ae8`.
Attestation, concrete-profile and job-receipt hashes are deliberately per-run
because the disposable path and timestamp change.

## Authority and remaining risk

This slice mounts no Provider broker, Room, Rules runtime or Skill registry and
creates no candidate. All Rules/room/Skill publication/Memory/training
authorities are false. Direct network is wholly denied; Slice 168 will add a
single common credential/Provider broker without granting the DSH worker raw
network or credential access.

`sandbox-exec` is deprecated by Apple, so this is an M1 development backend,
not the Ticket 21 production isolation claim. Production remains a disposable
container or microVM with the same hostile behavioral gates. A future DSH
runtime that requires another executable must add and prove one exact pinned
executable; this slice does not silently broaden process authority.

No source refresh, DSH installation/run, Provider call, candidate, Skill
promotion, Memory write, self-play, MuZero export or training-truth mutation
occurred. Slice 166 uses exactly zero input/output/cache/total Provider tokens
and costs `¥0`. The historical auditable external total remains 2,468 tokens
and approximately US$0.00056232, below the first `¥100` notification threshold.
Slice 167 is next: install the exact integrity-pinned DSH package only into this
isolated runtime and freeze its effective profile, plugin lock and Session
parser without a Provider call.
