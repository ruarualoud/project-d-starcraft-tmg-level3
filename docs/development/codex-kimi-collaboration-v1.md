# Codex–Kimi collaboration v1

## Outcome

Codex remains the integration owner. Kimi Code contributes one independently
verifiable vertical slice at a time from an isolated Git worktree. GitHub Issues
hold scope and progress; Git commits hold implementation; verification receipts
hold the exact gate result.

## Responsibilities

| Role | Owns | Does not own |
| --- | --- | --- |
| Codex | Architecture, Rules/Authority, source and Skill lifecycle, security, manifests, verification, review, integration and GitHub state | Concurrent edits inside a Kimi worktree |
| Kimi UI implementer | Web/App usability, responsive interaction, accessibility and StarCraft-style presentation within manifest paths | Rules truth, source refresh, Providers, secrets, remote Git |
| Kimi slice implementer | A complete low-coupling vertical slice with a frozen interface and focused gate | Cross-ticket refactors or unlisted paths |
| ChatGPT | Manually copied Ticket planning and milestone review | Repository mutation or per-action supervision |

Kimi K3 is used for UI architecture, multi-file presentation changes and harder
independent slices. K3-256K is used for small, bounded edits whose complete
context fits within 256K. Codex reviews either model's commit identically.

## Slice lifecycle

1. An approved GitHub Issue becomes one JSON manifest under
   `coordination/slices/`. It freezes owner, model, base ref, branch, worktree,
   allowed paths, one or more explicitly justified focused gates and acceptance
   criteria.
2. `npm run agent:slice -- prepare <manifest>` resolves the base commit and
   creates the branch and worktree. Preparation refuses a dirty integration
   worktree.
3. `npm run agent:slice -- run-kimi <manifest>` reads the K3 credential from
   macOS Keychain into the child process only and starts the selected project
   Agent. The Key never enters the manifest, prompt, output or repository.
4. Kimi commits its scoped implementation without running the acceptance gate.
5. `npm run agent:slice -- verify <manifest>` rejects out-of-scope paths and
   runs each declared command once for the current commit. A repeat against the
   same commit reuses the receipt instead of rerunning.
6. `npm run agent:slice -- handoff <manifest>` succeeds only for a clean
   worktree with a passing receipt. Codex reviews Critical/High findings,
   integrates the commit and updates GitHub.

## Review convergence

Only Critical/High findings block integration. Important/Medium findings become
follow-up Issues. The same review/repair loop stops after three rounds and
reports the remaining blocker. A passed gate is not rerun without a new commit
whose changed paths can affect it.

## Safety

- Integration and Kimi worktrees never share writable files.
- Kimi has no sub-agent delegation and never pushes remote state.
- Only Codex may refresh official data or invoke paid product Providers.
- Kimi receives no DeepSeek, BYOK or GitHub credential.
- Generated logs and runtime manifests live below ignored `.agent-runtime/`.
- `dist/`, databases and superseded preview art are ignored, not silently
  promoted as product evidence.

## Interface

```text
npm run agent:slice -- prepare <manifest.json>
npm run agent:slice -- status <manifest.json>
npm run agent:slice -- run-kimi <manifest.json>
npm run agent:slice -- verify <manifest.json>
npm run agent:slice -- handoff <manifest.json>
```

This five-command interface is the collaboration seam. Git/worktree creation,
Keychain injection, path enforcement, verification deduplication and handoff
evidence remain implementation details behind it.
