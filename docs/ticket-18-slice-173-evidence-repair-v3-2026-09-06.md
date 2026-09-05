# Slice 173: full-context, evidence-driven repair v3

Status: Ticket 18 remains **1/8**, Slice 173 is in progress; project 16/22,
formal five-Skill acceptance **0/5**. The new long-task goal ends only after
actual five-Skill production, usability/strategy assessment and replay-driven
versioned improvement/regression/rollback. This checkpoint is not that acceptance.

## Implemented boundary

- `packages/skill-production-v3/context.mjs`: all frozen non-placeholder Core
  (220 rows), FAQ (68) and official products (83) are delivered in every role
  prompt. The writing assignment is local; reading context is global. Exact
  source hashes and span addresses are retained. No official data refresh.
- `contracts.mjs`: claim truth and source completeness are separate axes.
  Missing citation is not automatically a missing rule. Both reviewers must
  explicitly identify non-normative prose; their reasons remain in evidence.
  Claim, passage and citation denominators are validated. Unknowns remain open.
- `issues.mjs`: typed source-grounded diagnosis and append-only, parent-bound
  issue history persisted through the existing SQLite checkpoint store.
  Diagnosis can never directly resolve an issue or change rule authority.
- `runtime.mjs`: full-context, fresh supportive/adversarial reviews; typed
  diagnosis; restricted edits to flagged claim paths or missing passages;
  citation-only edits preserve prose. Whole-draft hashes and unaffected claims
  survive. Empty patches do not trigger JSON regeneration. Source uncertainty
  quarantines; a verifier-error hypothesis may cause one evidence-backed fresh
  review, never unlimited same-output resampling. Repeated draft hashes stop.
- `seeds.mjs`: import the five actual v2 drafts with parent recipe, source,
  model, packet and artifact hashes. No reviewer acceptance, tool-read claim,
  paid-response cache entry or previous cost is fabricated or inherited.
- `skill-production/model.mjs`: old recipes retain the 180,000-byte default.
  v3 explicitly chooses a bounded 786,432-byte request allowance; hard upper
  validation remains. Shared usage-first accounting and balance stops remain.
- `run-ticket-18-overall-rules-v3.mjs`: repair only the five existing packets
  first. It cannot silently start the remaining 32. Exact current code/source/
  full-context DSH readiness must pass before Keychain ingress or paid egress.

## Verification at this checkpoint

1. Reproduced v2 rejecting explicit `non_normative` at the real review seam,
   using the saved LoS designer-note failure. New contract accepts an explicitly
   recorded disposition but continues rejecting actual negative/unknown claims.
2. Ten contract/workflow groups pass: full source completeness/tamper rejection,
   claim/citation bounds, typed diagnosis, journal lineage, real draft imports,
   SQLite interruption/restart without repeated completed review, local patch,
   no-progress quarantine, uncertain-source stop and bounded evidence recheck.
   **Model/DSH outputs here are injected, not actual semantic acceptance.**
3. Five model-cap checks pass, including the reproduced old full-source size
   failure, preserved old default, explicit larger bound and rejection before
   reservation/egress when oversized. No actual Provider calls.
4. Eighteen affected predecessor groups pass, including actual pinned DSH
   sessions, command/tool isolation, usage-first ledger and exact request reuse.
5. Two actual pinned DSH full-context sessions passed through the production
   request serializer and injected HTTPS transport. Request upper bounds were
   408,480 and 409,891 bytes; wire bodies 470,128 and 471,743 bytes. Second
   session reused both completed responses. No source truncation. This proves
   our transport capacity, **not the real Provider's model comprehension**.

The only historical live status before v3 is 5/37 v2 packets processed,
1 semantic pass and 4 quarantined. All are constituents of one overall Skill,
not five Skills. Prior lower-bound tokens: 5,381,623. Known estimate plus
historical unknown-call reserve: ¥37.615729, not an invoice.

## Real production next

Run the v3 preflight, then authorized `--live` repairs using local Keychain.
The repair run is capped at 140 calls, ¥10, 8M reserved/known tokens, three hours
and three revision rounds. Global historical accounting remains cumulative;
API balance exhaustion stops all development. Inspect real drafts, unresolved
issues and source-backed findings before preparing the remaining production.

Independent semantic contexts use the same configured model and are **not
independent models**. Model consensus never substitutes for source review,
kernel counterexamples, withheld tests or real Room/LegalSpace/Preview/Apply/
Replay assessment. No promotion, rule authority or training truth is granted.

Required loop reporting: ctx2skillLoopUsed=true; harnessLoopUsed=true;
targetGames=[starcraft-tmg]; role routes=Tutor/Generator/fresh supportive/fresh
adversarial/diagnosis/local editor; tools=read/query/development-only probe;
promotions=[]; actual room replay pending; trainingTruth=false.
