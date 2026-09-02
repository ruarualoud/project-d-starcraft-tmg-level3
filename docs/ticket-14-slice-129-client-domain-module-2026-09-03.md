# Ticket 14 Slice 129 — executable Client Domain Module

Status: complete; Ticket 14 is 2/11 with 9 slices remaining.

## Outcome

The shared Web/App seam is now executable rather than descriptive. Expo Web,
Expo Native and Battle Lab can all consume one deep Client Domain Module with
exactly four caller operations:

```text
bootstrap(route_and_principal_context)
read()
dispatch(typed_client_intent)
subscribe(listener)
```

The Module hides authoritative transport, viewer-projection persistence,
lifecycle, revision, reconnect, LegalSpace membership, Preview, explicit human
confirmation, ControlLease, idempotency, Apply receipt and Replay sequencing.
Its interface hash is
`dbaa31a183518e0bbfdd4a0ec44314039a5a1fad1b40f2b83b90ea0c982da76a`.

## Typed intent contract

Callers may request only:

- authoritative projection refresh;
- current LegalSpace;
- Preview of a finite action key already present in that LegalSpace;
- Preview of parameters under a Rules-owned parameter domain already present
  in that LegalSpace;
- explicit human confirm-and-apply of the currently displayed Preview; or
- current Replay verification.

The Module rejects caller-owned whole state, side, role, confirmation boolean,
game RNG, Rules/source override and Provider credentials before transport. It
generates the session identifier and idempotency key internally and takes the
expected state revision, Preview ID, confirmation ID and ControlLease fence
from current authoritative results.

## Real internal seams

- `AuthoritativeTransportPort`: HTTP Adapter and in-memory RoomRuntime Adapter;
- `ProjectionStorePort`: AsyncStorage Adapter and in-memory Adapter;
- `LifecyclePort`: browser visibility/network, Expo AppState and in-memory
  verifier Adapters.

The core package has no Node built-in import. A portable RFC 8785/SHA-256
implementation is checked against the authoritative Node hash, including
multi-block UTF-8 input. Projection caches contain a viewer-scoped read model,
scope key and integrity hash, but no SeatGrant token. Another principal cannot
reuse the cache, and any byte change fails closed.

## Recovery and authority behavior

An online bootstrap reads the current server projection and replaces its cache.
A known-offline or background client may display only an integrity-verified
cache and cannot read LegalSpace, Preview or Apply. Foreground recovery is
serialized before later caller work. Concurrent caller dispatches are ordered
through one operation queue.

An interrupted Apply is sent once. It is never silently retried; the view marks
the authoritative outcome uncertain and requires a fresh authoritative read.
Revision, LegalSpace, ControlLease or receipt drift similarly forces refresh or
fails closed. Accepted results expose only a signed receipt reference and a
Replay reference, not an authoritative write model.

## Verification

`npm run verify:ticket-14-client-domain` passes 17/17 at report
`9e27096967e3313da13a15c95dd21f299f86e7dfcf60f1374690cb0fa00ee4c0`.
It uses an actual authoritative room to run:

```text
projection → LegalSpace → parameterized Preview → human confirmation
→ ControlLease → idempotent Apply → Ed25519 receipt → projection refresh
→ Replay matches current
```

It also proves HTTP/in-memory transport parity, AsyncStorage/in-memory store
parity, browser/Expo/in-memory lifecycle behavior, viewer cache isolation,
tamper rejection, serialized dispatch, background/offline read-only behavior,
and uncertain-outcome handling.

The generated architecture and acceptance preview is
`build/ticket-14-slice-129-client-domain-v1/preview.html`.

No product framework mount, real browser/device session, official-source
refresh, Provider call, Skill generation, DSH, MuZero, self-play or training
promotion occurred. Slice 130 next derives the tracked Expo product worktree
from the immutable baseline and mounts this Module into its shell.
