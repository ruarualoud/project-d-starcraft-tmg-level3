# Ticket 25 / Slice 265 — fork action identity repair

## Defect

Forking run `20260921182729904` through revision 7 stopped before Provider
construction with `SLICE265_FORK_DOMAIN_MISSING:7`. The accepted executable
Creep Spread action retained its Rules discriminators (`definitionId` and
`effectKind`) but intentionally omitted the parameter domain's presentation
label `abilityName`. The fork resolver incorrectly required every current and
historical presentation field to be equal, so it rejected the same action.

## Repair

Fork matching now requires exact action type, side, phase and piece identity.
It then compares every Rules discriminator actually retained by the historical
accepted action, including definition ID and effect kind. A parameterized
action must resolve to exactly one current domain; zero and multiple matches
fail separately. This preserves fail-closed replay without requiring an
executable action to duplicate presentation-only domain fields.

## Focused verification

The revision-7 fork preflight replayed all seven accepted transitions with
Preview, Apply and Replay parity. Resulting branch:
`20260921192605226`, state revision 7. Provider stacks were not constructed;
Provider calls and paid cost were `0 / ¥0`; the invalid revision-8 suffix was
not copied.
