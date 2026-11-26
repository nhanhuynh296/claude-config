---
name: implement-parallel
description: "Implement a batch of independent tickets in parallel, from a map file or ticket IDs, onto one integration branch."
disable-model-invocation: true
---

Implement a batch of tickets in parallel. Input is a **map** file (preferred) or a list of ticket IDs. The issue tracker should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

The goal is every ticket in the batch implemented on a single **integration branch**, the full suite green, and one PR that closes every ticket.


## Roles and models

| Role | Model | Count |
| --- | --- | --- |
| Orchestrator | Opus | 1 |
| Investigator, small feature | Haiku 5.5 | outside the cap; soft limit 15 |
| Investigator, cross-module or touching contracts or migrations | Sonnet 5.5 | cap 7 |
| Implementer | Sonnet 5.5; Opus for tickets investigators flag as complex | cap 7 concurrent |
| Merger | Sonnet 5.5 | one per merge |

Above the soft limit of 15 small investigators, merge neighbouring small features into one investigator.

## Steps

1. **Collect the batch.**
   - From a map: take its tickets. The map is a hint; step 3 re-checks it against current code.
   - From IDs: fetch each ticket's description and comments.
   - Eligible: label `ready-for-agent` or `wayfinder:task`, open, unclaimed. Drop every other ticket and tell the user which and why.
   - Done when every ticket in the batch is eligible and fetched.

2. **Test isolation.** Read `docs/agents/testing.md`. If it is missing, build it per [TEST-ISOLATION.md](TEST-ISOLATION.md), then continue. Done when `docs/agents/testing.md` gives a per-worktree recipe and a cleanup recipe.

3. **Map the blast radius.** List the features the batch touches (modules, domain concepts from `docs/agents/domain.md` where it exists, whatever the tickets and map imply). Spawn one investigator per feature, in the background, choosing the model per the table. A ticket may sit under several features. Each investigator reads its tickets (description and comments) and the relevant code, then writes to the notes dir, per ticket:
   - files and modules it expects the ticket to touch;
   - contracts the ticket creates, changes, or consumes (APIs, schemas, migrations, shared types);
   - explicit `Blocked by` links;
   - complexity: `routine` or `complex`.

   Done when every ticket is covered by at least one investigator report.

4. **Plan the waves.** A ticket is **blocked** by another only through an explicit `Blocked by` link or a **contract dependency** (it consumes a contract the other creates or changes). Blocked tickets go into a later **wave** than their blockers. Shared files are not blockers: record each overlap as a **conflict warning** for the implementers involved. Show the user the wave plan: tickets per wave, each serialisation with its reason, every conflict warning, the model per implementer. **Wait for the user's go-ahead.**

5. **Claim and branch.** Claim every ticket in the batch the way the tracker claims work (assign to yourself, or the claim operation in `docs/agents/issue-tracker.md`). Create the integration branch.

6. **Implement.** Run wave 1, then each later wave once its blockers have merged; within a wave, keep up to 7 implementers running and start the next queued ticket as one finishes. Each implementer runs in the background in its own worktree on its own branch. Brief each with: the ticket link, its investigator notes, its conflict warnings, `docs/agents/testing.md`, the notes dir. Each implementer:
   - confirms its worktree is based on the integration branch, and resets onto it if not;
   - applies the isolation recipe from `docs/agents/testing.md`;
   - calls the Skill tool with `tdd` to build the ticket, running only the tests it creates, plus typechecking;
   - merges the integration branch tip into its own branch;
   - runs the cleanup recipe;
   - writes its report per [REPORT.md](REPORT.md) and hands back only the report path.

7. **Merge.** When an implementer finishes, spawn a merger to merge its branch into the integration branch. On a conflict, the merger reads both implementers' reports and resolves it so both intents survive. It escalates to you only when the two intents genuinely clash; then decide, or ask the user. Done when the branch is merged and the merge commit SHA is recorded against the ticket.

8. **Full suite.** Once every ticket is merged, run the full suite on the integration branch, applying the isolation and cleanup recipes. If it is **green**, go to step 10.

9. **Fix loop.** Attribute each failure to a ticket, first match wins:
   1. the failing test file was created by ticket X (per its report);
   2. the failure touches files only ticket X changed;
   3. `git bisect` over the merge commits on the integration branch.

   Resume that ticket's implementer with SendMessage, passing the failure output; route the fix back through step 7. Re-run the full suite once per fix batch. After 2 fix rounds on one ticket, stop and report to the user: ticket, failure output, what each round tried.

10. **Review.** Call the Skill tool with `code-review` on the integration branch. Attribute each finding to a ticket (same order as step 9) and resume that implementer to fix it, through step 7. Re-run step 8 after the fixes.

11. **Ship.** Open one PR from the integration branch, ready for review, marked as closing every ticket in the batch. Release the claims on any ticket dropped or escalated. Remove every worktree. Report: PR link, tickets closed, tickets escalated.
