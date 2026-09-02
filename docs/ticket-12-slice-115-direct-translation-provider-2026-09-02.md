# Ticket 12 Slice 115 — direct translation Provider v1

Status: implemented; Ticket 12 remains open at 4/7 planned slices.

The localization runtime now has a translation-specific direct Provider Adapter.
It uses an OpenAI-compatible HTTPS JSON contract but does not share the online
character Provider's authority or retry policy.

## Boundary

- A sealed profile binds Provider, model, HTTPS base URL, host allowlist,
  prompt-template version, output bound, timeout, at most three attempts,
  pricing, and a hard per-request cost ceiling.
- The profile stores only a server-side secret reference. The secret is resolved
  immediately before egress, sent only in the authorization header, and omitted
  from prompts, candidates, receipts, errors, and logs. A Provider response that
  echoes the secret is rejected.
- The prompt binds the exact localization dataset, record, canonical-text hash,
  glossary, locale pair, and display-only constraints. Responses must be one JSON
  object with a non-empty `translatedText`.
- 408/429/5xx and transport/timeout failures may retry only to the profile's
  bounded attempt count. Each attempt is hash-sealed. Other contract, security,
  and budget failures do not retry.
- Cost is reserved before secret resolution and checked again using the returned
  usage. A machine draft still needs human review and cannot overwrite canonical
  data, RuleAtoms, replay, or training truth.
- DSH fails before profile resolution and egress. It remains reserved for Ticket
  17 offline Skill generation.

## Evidence boundary

`npm run verify:direct-translation-provider` exercises the real Adapter and wire
contract through an injected deterministic HTTPS Provider transport: retry,
credential isolation, structured response, receipt binding, cost failure,
retry exhaustion, malformed output, credential echo, HTTPS/host policy, DSH
rejection, runtime failure accounting, and canonical byte stability.

No external Provider credential was supplied for this development slice, so a
paid external call was not made and `productionReady` remains false. This is an
explicit deployment gate, not a silent fake production claim.

ctx2skill is fact-probe only: zero Skills read/generated/promoted; DSH, MuZero,
self-play, memory, and training promotion remain off.
