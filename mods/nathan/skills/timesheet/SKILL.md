---
name: timesheet
description: Billing timesheet for the current Claude Code session — start time, session duration, focused time, and an itemised estimate of how long a senior LAMP engineer would take without AI, plus a rounded billing line. Use when the user invokes /timesheet or asks to bill, estimate time, or log time for a client task.
---

# Timesheet

## 1. Measure

Run:

```bash
python3 "${CLAUDE_SKILL_DIR}/session_times.py" ${CLAUDE_SESSION_ID}
```

If the command shows a literal `CLAUDE_SKILL_DIR` variable, use the path after "Base directory for this skill:".

Gives `started`, `session_duration`, `focused_time`, plus a work inventory (`files_edited`, `tool_calls`, `prompts`).

- Focused time: sum of gaps from Claude's last reply to the user's next prompt, and from each AskUserQuestion to its answer. Each gap is capped at 10 min. Includes typing; excludes Claude working time.
- If the transcript path printed is not this session, say so and stop.

## 2. Estimate

Estimate the hours a **senior LAMP engineer** needs without AI to produce what the session delivered. The engineer knows the stack (Linux/Apache/MySQL/PHP, Moodle, Totara, AWS) and the client's environment. Read the transcript or the inventory, not only this conversation's summary. Claude's working time goes into this estimate, not into focus.

**Direct path.** Bill the fewest steps that produce the final outcome: look at the live system before the code, one query that answers the question, one short script on a core API, one edit for N identical targets. Size each item from the final scope. Claude's breadth (side-path code audits, rework after a scope change, dead ends, subagent fan-out) goes in only where a senior needs it for the same outcome.

**Scope.** Estimate the work the session did. Steps the session prepared but did not run (for example a UAT or PROD run) stay out. Name them in one line under the itemised table. Add them only when the user asks; then assume a **smooth run**.

**Item sizes** (low–high; high is at most 2 × low):

- Read the ticket, agree definitions: 10–15 min.
- One unit of hands-on work (an investigation that ends in an answer, a query set, a script, a config or content change): 30–60 min. A small admin settings change: 10 min.
- Smooth run on one environment (backup, apply, spot check): 15–30 min. PROD bulk change out of hours with a load watch: 30–60 min.
- Visual check of a few pages: 10 min.
- Write-up, client reply, sign-off: 15–30 min for the ticket. A short reply: 10 min.
- Research: only what a senior does not know.
- Access overhead: one item of 15–30 min, only when access is slow and manual (jumphost). Direct SSH/DB access adds none.
- Context switch: 15 min maximum, only for a client or environment new to the engineer.

Use only the items that apply. Each item: low, high, one-line assumption.

**Total** = sum of most-likely values. Most-likely is the low value, unless a named risk in the assumption moves it up. Midpoints are too high.

**Band check.** A plan-only ticket (no code written, nothing applied) is 1 h or less. A ticket taken through PROD is 1–2.5 h. A total above its band needs a cause the client would accept (more environments, more deliverables, a real unknown); if there is none, cut the items back to the direct path.

Done when each item has low, high and assumption, and the total passes the band check.

## 3. Output

Times in local timezone. Exactly this shape:

| Metric | Value |
| --- | --- |
| Started | … |
| Session duration | … |
| Focused time | … |
| Engineer estimate | Xh Ym (low–high) |

Then the itemised estimate as a table (item, low, high, assumption), with the "not run, not included" line below it when it applies.

Then the billing line: engineer estimate rounded **up** to the next 15 min. Show the other two metrics rounded up to 15 min beside it so the user can pick a different basis.

Under the billing line, write one bullet per **deliverable**: a separate outcome the client would recognise and could have requested on its own (a fix, a feature, a plan, a report). Investigation, backups, verification and the client reply belong inside the deliverable they served. A single-ticket fix is one deliverable, so it gets one bullet, written as one sentence of the form *outcome + cause or scope*. Example: "Restored LMS login for a staff member (and two others with the same fault) after a name change broke their Microsoft sign-in link." Write each bullet in client-facing language: outcomes, not tool names. Maximum 4 bullets.

A user override (basis, scope, rounding, bullet count, format) wins for that invocation.
