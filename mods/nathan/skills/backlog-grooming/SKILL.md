---
name: backlog-grooming
description: "Groom an issue backlog that has grown past what you can track: merge duplicates, prune stale issues, refresh maps, and file work that has no issue."
disable-model-invocation: true
---

Groom the issue tracker of the current repo with a multi-agent workflow. The issue tracker, triage labels, and domain docs should have been provided to you (`docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`). If not, tell the user to run `/setup-matt-pocock-skills`.

The goal: every open issue is valid, unique, correctly labelled, and under the right map; every piece of real work found in the repo has an issue, a map line, or a runbook line; the user holds a short list of decisions only they can make.

## Steps

1. **Scout.** Inline, no subagents. Collect:
   - open and closed issue counts; every open issue (number, title, labels);
   - the `wayfinder:map` issues and their children;
   - the tracker rules: `docs/agents/*.md`, the `## Agent skills` section of `AGENTS.md` / `CLAUDE.md`, and the Notes section of each map (close rules, client or area labels, where one-off prod steps live);
   - **sources**: places where untracked work hides in this repo. Always: code TODOs, docs/ADRs, maps' open questions, recently closed issues, earlier grooming notes under `.scratch/`. Add repo-specific ones the scouting turns up (a runbook, a changelog, a client feedback sheet named in `CLAUDE.md`).

   Done when you can state each tracker rule in one line, with its file as the source.

2. **Ask.** Show the counts. If fewer than ~15 issues are open, say the backlog is small and offer `/triage` instead. Ask the user in one round:
   - scope: re-triage open issues / find untracked work / audit closed issues (multi-select);
   - apply mode: propose (default) or apply directly;
   - model caps (default: Haiku unlimited, Sonnet 50, Opus 20);
   - any rule that conflicts between the docs and what the user says. Settle it before you go on.

3. **Run.** Read [`workflow.js`](workflow.js) in this skill's folder and pass its full text to the Workflow tool as `script` (`scriptPath` accepts only files in the working directory), with `args`:

   | Key | Value |
   | --- | --- |
   | `repo` | absolute repo path |
   | `scratch` | your scratchpad dir |
   | `rules` | the tracker rules from step 1 and the user's answers, one per line |
   | `open` | open issue numbers if re-triage is in scope, else `[]` |
   | `sources` | `[{key, prompt}]`, one per source in scope; each prompt says where to look and what counts as untracked work |
   | `closed` | closed issue numbers to audit (e.g. closed in the last 30 days) if in scope, else `[]` |
   | `apply` | `true` only if the user picked apply directly |

   Done when the workflow returns. On a failed agent, resume with `resumeFromRunId`.

4. **Check.** Re-read the tracker: every `OK` op in the apply log is live (labels, state, parent map). Each `FAIL` or `SKIP` gets a reason. In propose mode, show the change list as a table and apply it after the user's OK, using the workflow's apply stage (re-run with the script path the Workflow tool returned, the same `args` plus `apply: true`, and `resumeFromRunId`; earlier stages replay from cache). If the user amended the list, apply the amended list yourself with the tracker operations.

5. **Report.** A table of changes (issue, change, reason); the sources the workflow could not reach; the user's decisions as numbered questions with reply options. Write the run's plan to `.scratch/grooming-<date>.md` so the next run reads it as a source.
