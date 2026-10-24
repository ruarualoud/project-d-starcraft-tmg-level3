# T27 / S272 — temporary Kimi Code validation, v221

## Purpose and boundaries

The user authorized the installed K3 Code Plan as a temporary validation route
after DeepSeek failed even on the small v219 request. This is NOT a production
provider migration or permission to restart the four games.

Use Kimi Code CLI 2.0.2 and its managed `kimi-code/k3` subscription, not a direct
K3 API key. Existing Roster Strategist and workspace revision services still own
evidence reads, normalization and Plan validation. Kimi has no native tools or
subagents. The original B draft, Plan19, roster, schedule and fee ledger remain
read-only; any successful candidate is saved separately pending review.

T27 5/6; T23 33/36; remaining main slices272/248/249/250=4; accepted games0/12.

## Delivered files

- `packages/roster-planning-workspace/kimi-code-shadow-deliberation-v1.mjs`:
  an explicit offline adapter at the existing deliberationFactory seam. No
  production default imports or selects it. ACP transports the full input over
  stdin, avoiding command-line argument-size limits. The host handles retained
  evidence requests; public output is locally schema-checked and then consumed
  by the original strategist. Thought chunks are not public evidence.
- `scripts/run-slice272-B-kimi-shadow-v221.mjs`: in-memory copy of the actual B
  revision workflow, exact first input/context/schema comparison against v218,
  separate accounting, original-draft identity check, no Native/room operations.
  At most4 logical deliberations (including existing retained-evidence reads).

No new tests, no old passed gates repeated, no install/delete/commit/push.

## Local preflight failures and source fix

1. v221: ACP ignored the root command's `--agent-file` launch selection. Actual
   profile remained the standard coding agent. Detected before model send;
   zero model requests, original B unchanged.
2. v221r2: a project agent override below an arbitrary cwd was also not found.
   Kimi discovers project agents from the nearest Git root, not every nested
   directory. Again zero model requests and B unchanged.
3. v221r3: initialize an empty Git repository ONLY in the isolated generated
   evidence directory and put the override there. Actual profile confirms the
   original instructions, `kimi-code/k3`, tools[] and subagents[] before send.
   Main worktree/global Kimi configuration are untouched. Third preflight passed;
   do not repeat these checks or launch another copy while the request runs.

This is a local integration issue, not another model outage. See the official
[agent discovery rules](https://moonshotai.github.io/kimi-code/en/customization/agents)
and [ACP transport reference](https://moonshotai.github.io/kimi-code/en/reference/kimi-acp.html).

## Live result — stopped without a new Plan

Later public-wire inspection during v223 found22285 characters of interrupted
public JSON,4complete repair objects, then an unfinished string. Thus “no
completed answer” below does NOT mean no model generation. The CLI retained this
prefix even though the temporary Adapter did not save it on timeout. See the
v222-v223 report and `turn-01.public-interrupted.private.txt`; no private think
blocks were copied. This changes the next action to progress-aware continuation,
not another full identical rewrite.

Base: `build/ticket-23-three-arm-performance-baseline-20261010-v1`.

- Runner65780, ACP65840; started2026-10-15T03:37:03.925Z.
- Progress: `common-v221r3-B-kimi-shadow-progress.private.json`.
- Isolated directory: `B/kimi-code-revision-shadow-v221r3`.
- Kimi session: `session_b3184a73-3105-412b-bc94-e1d02e84dcec`.
- First original context: `21439f5581f8aff322e11423abf41ddfc06fd1aedf8c5e3916dd8698e3297e55`.
- Original input1545364bytes, wrapped prompt1547708bytes; byte size is NOT a
  tokenizer count. Original input/schema comparison passed before dispatch.
- Ended2026-10-15T03:47:19.651Z. The host's600000ms `session/prompt` deadline
  expired, sent cancellation, closed the session and terminated its own ACP
  process. Both runner65780 and ACP65840 are confirmed exited.
- Saved wire has one `llm.request`, one cancellation and `prompt.aborted`;
  no completed answer. Kimi's turn duration is598397ms (its turn clock starts
  after host dispatch). There is no new candidate or evidence-read round.
- The cancellation emits an all-zero turn usage record. This is NOT a provider
  bill proving zero consumption. Host settled usage delta is0; charge remains
  unknown. Client token-counting metadata says392665, not a provider usage receipt
  and not a DeepSeek-compatible token count.
- Original B draft unchanged=true; Plan19/hash, army, schedule and all historical
  dispatches unchanged. `originalWrites=0`, `nativeCalls=0`, no games.
- The progress report's `claimRepairCoverage` and `teachDelivery` are historical
  last entries dated2026-10-13, NOT new successful repairs from this K3 trial.
  Its explicit failed status and unchanged Plan19 are the terminal authority.

Kimi's configured internal transport attempts are not claimed to be one physical
HTTP send solely from one logical `llm.request`. Subscription money is unreported,
not zero cost. Old DeepSeek ambiguous charges are retained. A/B authoritative
Plan9/19 and settled usage remain unchanged. No additional retry was launched.

Conclusion: the existing Kimi Code subscription works for the small v220 probe,
but this unchanged long B revision did not complete within10minutes. There is no
context-overflow response, so this does not establish a K3 context limit or an
upstream internal cause. Nor is it proof that DeepSeek's incident was caused by
length: DeepSeek's tiny request failed independently. The new adapter is only a
temporary experimental route, NOT a verified production fallback.

## Next deliverables

1. Separate current canonical Plan/question conclusions from the retained full
   archive, using the existing read-only evidence lookup. Preserve contradictory
   evidence, dependencies and all strategic alternatives; no arbitrary truncation.
2. Check that every reference is actually retrievable before one future bounded
   real trial. This long-input assembly change is NOT implemented in v221.
3. If a new candidate is eventually produced, inspect the five B correction points
   and run independent Teach acceptance before any game restart. A's native Omega
   evidence investigation remains a separate unfinished deliverable.

The preceding system diagnosis remains in
`ticket-27-slice-272-provider-outage-and-input-diagnosis-v218-v219-2026-10-15.md`.
