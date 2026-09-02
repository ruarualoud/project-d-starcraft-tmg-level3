# Ticket 14 Slice 131 — secure room access and recovery

Status: complete; Ticket 14 is 4/11 with 7 slices remaining.

## Outcome

The tracked Expo Web/App product now enters an existing authoritative room
through a bounded locator plus one of four server-owned principals: a current
SeatGrant, a one-time invite capability, a one-time same-seat recovery
capability, or a public observer. A room ID, URL query, route parameter or
client-selected side/role never mints authority.

The RoomRuntime and HTTP Adapter now expose authenticated invite/recovery issue
operations and unauthenticated one-time exchange operations. Invite and
recovery tokens contain 256 bits of entropy, are bound to one room, expire on
server audit time and are persisted only as digests. In-memory and SQLite
stores each prove exactly one compare-and-swap winner under concurrent
exchange. Recovery issues a second grant for the same seat without silently
revoking the first device or creating a ControlLease.

## Receipt and control integrity

Every issue, exchange and expiry transition produces a content-hashed receipt
with an Ed25519 long-term referee signature and HMAC-SHA256 current seal. The
full credential-free receipt is stored atomically in the encrypted private
journal and seat-recovery ledger. Verification proves that HMAC rotation
invalidates the old short seal while the Ed25519 proof remains valid, and that
content, signature or MAC tampering fails.

The Client Domain performs strict receipt structure, canonical hash and
credential/session binding checks. It does not claim trusted-public-key
cryptographic verification; that remains the authority service's job. The raw
invite/recovery token and resulting SeatGrant exist only in the immediate
exchange path and never enter the view, subscriptions or projection cache.

Same-seat devices may both read. Only the latest explicit control claim owns
the seat-scoped ControlLease; its increasing fence rejects the earlier device
before mutation. Viewer projections expose only control state and fence, never
lease IDs, seals, sessions, bearer tokens or the other controller's Grant ID.

## Expo ingress and recovery

The hidden `/room/[roomId]` route consumes initial and event deep links through
the root Provider, waits for a terminal result for the same room ID, and
surfaces initial-link failures instead of hanging. URL fragments may contain
one bounded invite or recovery capability. Query/fragment claims such as
`sideKey`, `roleMode`, `expectedRoomRevision`, `confirmationBoolean`, transport
origins, credentials and session values are scrubbed and never become
authority. A public link cannot downgrade or replace an already bound player
principal.

Production bearer links require one configured public HTTPS origin, iOS
Universal Link association and Android verified App Link routing. The custom
scheme is development-only; a production build or share attempt without a
valid origin fails closed before issuing a capability. Copy/share remains an
explicit user action, and generated UI material is cleared on dismissal,
backgrounding, room/authentication change or an in-flight context race.

Native connectivity uses `@react-native-community/netinfo`; foreground/network
recovery revalidates the authoritative projection, while a visible room also
retains an explicit refresh path. Offline state is viewer-cache read-only.

## Verification

`npm run verify:ticket-14-room-access-recovery` passes 18/18. It includes URL
and production-link adversarial cases, room-only rejection, memory/SQLite
invite and recovery CAS, exact expiry, signed receipt persistence and HMAC
rotation, two-device fencing, projection secret scans, HTTP parity, tampered
receipt/swapped grant/mismatched viewer rejection, Expo route/network/link
mount checks and Harness evidence. Contract hash:
`d8c9a93d51f9bc781bc8029becf8d939c746e1f9f58e60669b9a06cb483bf69e`;
report hash:
`3627a53d29e327da27951000f5ac2b711317ce27898f0068f418edd262ab94ff`.

Expo `tsc --noEmit` passes. The cumulative Slice 131 command passes the fixed
84/84 acceptance denominator: Slice 128 13/13, Slice 129 17/17, Room 7/7,
HTTP 4/4, Ticket 11 authority 15/15, Slice 130 10/10 and Slice 131 18/18.

No official-source refresh, Provider call, Skill generation, DSH run, MuZero
output, self-play or training promotion occurred. Real browser acceptance,
hosted domain-association proof, native build and real-device evidence remain
Slices 136 and 137. Slice 132 next mounts the authoritative battlefield flow
and scale-safe map/model/base rendering.
