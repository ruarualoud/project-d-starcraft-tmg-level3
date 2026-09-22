# Ticket 23 / Slice 248h — Data-wiring impact and formal-match restart contract

## Decision

The previous Agent-versus-Agent branch is preserved as the low-strategy control
and defect evidence. It is not resumed as high-strategy evidence.

The first model decision on that branch was built before the complete
current-product data-wiring audit became a production preflight. The branch can
still prove that Authority accepted and replayed its actions, but its strategy
prose and memories cannot prove behavior under the corrected public cards,
faction/Skill routing and full Unit catalogue. Replaying only later revisions
would keep an untrusted planning history.

## Restart boundary

The optimized comparison therefore starts from a fresh current-product room:

1. create the Standard-2000 room through match runtime `1.0.1`;
2. require the embedded data-wiring audit to report zero Critical/High findings;
3. execute the deterministic initial authority transition;
4. begin paid Agent decisions only after that audited transition;
5. retain the old branch unchanged and label it `trainingTruth: false`.

The old control branch consumed 22 Provider calls, 1,348,904 usage units and
approximately ¥1.814114. Slice 248g/248h added no Provider calls and no cost.

## Web initiation contract

Formal Agent actions must now be initiated from the product Web page instead of
an out-of-band test-runner POST. The local server exposes a same-origin,
short-lived browser control lane:

- `GET /__ticket23/a2a/ui-status` returns the public current job and manifest;
- `POST /__ticket23/a2a/ui-drive` queues exactly one action;
- both require a random HttpOnly, SameSite-Strict cookie scoped to
  `/__ticket23/a2a`;
- the runner-only token endpoints remain available only for observation and
  recovery of the durable job boundary.

The UI owns the visible action button and status states. The backend contract is
frozen for the isolated K3 UI slice and does not expose the runner token.

## Evidence contract

Every formal action records:

- a screenshot immediately before the user-visible Web control starts the
  Agent decision;
- the accepted Rules/Authority trace and receipt hashes;
- a screenshot after the resulting Room revision is rendered;
- the observed Room revision associated with that screenshot;
- data-wiring audit schema/hash/status from the experiment manifest.

No prior action is reconstructed as though it were a newly observed browser
action. Historical reconstruction remains explicitly labelled. Hidden
chain-of-thought is not requested or stored; public plan, intent, predictions,
tool receipts, calibration and replanning evidence remain the review material.

## Completion state

Backend contracts and the audited match preflight are implemented. The formal
restart waits only for the isolated K3 Web control component to be integrated
and focused-browser accepted. Once integrated, the next run starts fresh under
this contract; it does not resume the old r14 branch.
