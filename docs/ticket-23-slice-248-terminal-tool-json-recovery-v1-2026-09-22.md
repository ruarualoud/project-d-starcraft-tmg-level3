# Ticket 23 / Slice 248 — terminal-tool JSON recovery

## Diagnosed defect

The secure Provider transport already used
`normalizeProviderJsonDocumentV1` for ordinary JSON content, but native tool
arguments bypassed that grammar-only recovery path. A malformed
`submit_decision` argument therefore became `arguments_invalid_json` and `{}`
even when the same syntax defect was locally recoverable. The following
correction round was also a normal Action round with query tools still exposed,
rather than a bounded format-only retry.

The preserved live branch `20260921211447031` proves the production symptom:
planning and read-only queries succeeded, then three terminal tool argument
payloads failed JSON parsing without reaching Preview or Apply. Their output
sizes were well below the limit, so truncation is not the supported cause.

## Repair

1. Native tool arguments now reuse the existing deterministic grammar-only
   normalizer before being rejected. A recovery may repair only already
   supported syntax shapes; it cannot add fields or alter visible scalar
   content.
2. A recovered call carries `argumentRecovery` with normalization kind and
   hash/offset evidence. The recovered object still passes the full tool schema
   and every downstream semantic/Rules/Authority gate.
3. An unrecovered terminal-format failure sets a durable
   `terminalFormatRepairPending` state. The next call exposes only the current
   stage's strict submit tool, preserves the selected plan and existing query
   receipts, and instructs the model to repair JSON syntax and concision only.
4. A valid terminal submission clears the format-only state before the next
   stage. A later semantic correction is not mislabeled as format repair.
5. Provider traces now report grammar-recovery and terminal-format-repair
   counts. Raw Provider output remains unretained.

Prompt policy advances from v20 to v21. Rules data, official sources, action
semantics and correction limits are unchanged.

## Focused verification

The existing Provider continuation verifier was extended with a concrete native
tool argument containing one unescaped inch quote. Before the production fix it
returned `{}` plus `arguments_invalid_json`. After the change, the same command
passed once with the exact original scalar value restored and
`single_unescaped_quote_v1` hash/offset evidence. The verifier also exposed two
pre-existing stale expectations (current frozen `json_object` response mode and
the already-present null `argumentIssue` field); only those fixture expectations
were synchronized.

Command:

```text
node scripts/verify-ticket-23-slice-247-provider-continuation-v1.mjs
```

Final result: pass. Provider calls / token / cost: `0 / 0 / ¥0`.

## Continuation

The prior three-round cycle remains closed. A new post-repair live acceptance
may fork from the safe r8 Authority state and generate exactly one action. If
format recovery occurs, its typed evidence must appear in the decision trace;
if the terminal format still fails three times under the new lane, stop again.
