# Ticket 15 Slice 146 — Provider Gateway supervisor

Status: complete. Ticket 15 is 3/9; Slices 147–152 remain. Overall project
status remains 13/22 Tickets complete. Web/backend development is active;
native package and physical-device acceptance remain user-deferred until full
development completion.

## Delivered

The online role-Agent runtime now has a credential-free Provider Gateway turn
supervisor composed over Slice 145's authenticated session lifecycle. The
Gateway receives only a Provider profile reference, prompt assembly reference,
bounded request hash, response-contract reference, server budget reservation
and AbortSignal. It cannot receive a seat token, principal reference, API key
or direct Provider transport through this contract.

Each online session owns an independent server policy and budget ledger. The
supervisor reserves input plus maximum output units before dispatch, enforces
per-turn input/output, session-total and turn-count limits, then settles a
hash-valid successful usage receipt at actual usage. When usage is unknown
after failure, cancellation or timeout, it conservatively consumes the full
reservation so a potentially billable request cannot silently restore budget.

Only one turn may wait on a Provider for a given session; different sessions
may proceed concurrently. Cancellation and timeout abort the Gateway signal
and become terminal immediately even if the Gateway ignores the signal. There
is no automatic retry. Any late result is reduced to an output hash and
quarantined without re-entering the terminal state.

Before accepting an output, the supervisor revalidates the session binding and
connection epoch. Reconnect, end, authority failure or binding drift therefore
fences the old response. Only a safe, bounded, current completion with a
reservation-bound usage receipt may return output to the caller; read-side
state contains hashes and status only.

An absent Gateway is represented as `provider_not_configured` and consumes no
budget. This is the honest Ticket 15 Web/backend state until Ticket 16 installs
the secure BYOK/live-Provider adapter behind the same port.

## Verification

- Slice 146 focused contract: 24/24.
- Slice 145 lifecycle regression: 21/21.
- Slice 144 boundary regression: 11/11.
- Historical four-role Character Agent regression: 9/9.
- Historical injected direct-Provider seam regression: 5/5.
- Ticket 14 Web/backend handoff regression: 13/13.
- Deterministic injected Gateway invocations: 11; live Provider invocations: 0.
- Supervisor contract hash:
  `57bf065c28bb4378aa804aa610b008986bac08dddbe9696ea51ffde7770b2976`.
- Slice report hash:
  `30b10b87e3283b9bf6f3d1bc612bf14c8bd8561cbcdaa780232a9d1eefae161a`.

No official source refresh, live Provider call, BYOK acceptance, Skill
generation, DSH run, MuZero export, self-play, memory promotion or training
promotion occurred.

## Harness evidence and next slice

The verifier records the Gateway complete/abort tools, observable
`provider_not_configured`, `waiting_provider`, cancel and timeout states,
cross-session budget isolation, late-result quarantine and rollback rules.
Prompt packs, game tools, histories and memory remain deliberately empty here.

Slice 147 now binds the exact mode-specific prompt pack, tool allowlist,
bounded history and memory namespaces to this supervisor and proves reconnect,
cross-mode and cross-room isolation. Slice 148 then validates role outputs and
connects Opponent decisions to sealed Preview without model Confirm/Apply.
