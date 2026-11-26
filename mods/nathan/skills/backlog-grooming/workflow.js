export const meta = {
  name: 'backlog-grooming',
  description: 'Groom an issue backlog: summarise, cluster, triage, find untracked work, verify, synthesise, optionally apply',
  whenToUse: 'Run from the backlog-grooming skill, which builds args',
  phases: [
    { title: 'Inventory', detail: 'summarise open issues, sweep sources, audit closed', model: 'haiku' },
    { title: 'Cluster', detail: 'group open issues, spot duplicates', model: 'sonnet' },
    { title: 'Triage', detail: 'one agent per cluster', model: 'sonnet' },
    { title: 'Verify', detail: 'skeptics refute candidates and destructive ops', model: 'sonnet' },
    { title: 'Synthesize', detail: 'final change list', model: 'opus' },
    { title: 'Apply', detail: 'write changes to the tracker', model: 'sonnet' },
  ],
}

// args: {repo, scratch, rules, open: [n], closed: [n], sources: [{key, prompt}], apply: bool}
const A = { open: [], closed: [], sources: [], apply: false, ...args }
const CHUNK = 20
const VERIFY_BATCH = 5
const chunks = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

const COMMON = `
Repo: ${A.repo}. Scratch dir: ${A.scratch} (put temp and downloaded files in a new subdir there).
The tracker operations are in ${A.repo}/docs/agents/issue-tracker.md; label roles in docs/agents/triage-labels.md.
Tracker rules for this repo (the user confirmed these; they win over generic skill defaults):
${A.rules}
Read-only: do not create, edit, comment on, close, or relabel any issue; do not touch git state.
Ground every claim in a file:line, issue number, commit, or command output. Mark what you could not check as unverified.`

// ---------- Inventory ----------
const SUMMARY = {
  type: 'object',
  properties: { issues: { type: 'array', items: { type: 'object', properties: {
    number: { type: 'integer' },
    gist: { type: 'string', description: 'one line: what the issue wants' },
    area: { type: 'string', description: 'module, feature, or domain concept it touches' },
    done_signals: { type: 'string', description: 'commits, merged PRs, code that suggest it is done; "" if none' },
    stale_signals: { type: 'string', description: 'superseded decisions, dead references, no activity; "" if none' },
    related: { type: 'array', items: { type: 'integer' } },
  }, required: ['number', 'gist', 'area', 'done_signals', 'stale_signals', 'related'] } } },
  required: ['issues'],
}
const CAND = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' },
      kind: { type: 'string', enum: ['bug', 'enhancement', 'task', 'question', 'doc-gap', 'wrong-close'] },
      source: { type: 'string', description: 'file:line, issue #n comment, or external row' },
      evidence: { type: 'string', description: 'proof the work exists and is not done' },
      related_issues: { type: 'array', items: { type: 'integer' } },
    }, required: ['title', 'kind', 'source', 'evidence', 'related_issues'] } },
    unreachable: { type: 'string', description: 'sources you could not read and why; "" if none' },
  },
  required: ['items', 'unreachable'],
}

phase('Inventory')
const summariesP = parallel(chunks(A.open, CHUNK).map((nums, i) => () =>
  agent(`${COMMON}\n\nTASK: Summarise open issues ${nums.map(n => '#' + n).join(', ')}. For each: read it with comments, then check the code and git log for signs it is done or stale.`,
    { label: `summarise:${i}`, phase: 'Inventory', model: 'haiku', schema: SUMMARY })))

const finders = [
  ...A.sources.map(s => ({ key: s.key, prompt: s.prompt })),
  ...chunks(A.closed, CHUNK).map((nums, i) => ({ key: `closed-${i}`,
    prompt: `Audit closed issues ${nums.map(n => '#' + n).join(', ')}. Report (kind wrong-close) each close that breaks the tracker rules, and (other kinds) each deferred follow-up in the comments ("follow-up", "later", "new issue", "reopen if", "not done") that no open issue tracks.` })),
]
const candsP = parallel(finders.map(f => () =>
  agent(`${COMMON}\n\nTASK (${f.key}): ${f.prompt}\nReturn work that has no open issue. Search open issues (and map bodies) before you list an item.`,
    { label: `find:${f.key}`, phase: 'Inventory', model: 'haiku', schema: CAND })
    .then(r => r && { key: f.key, ...r })))

const summaries = (await summariesP).filter(Boolean).flatMap(r => r.issues)
const missing = A.open.filter(n => !summaries.some(s => s.number === n))
if (missing.length) log(`No summary for ${missing.length} open issues: ${missing.join(', ')}`)

// ---------- Cluster (barrier: needs every summary) ----------
const CLUSTERS = {
  type: 'object',
  properties: { clusters: { type: 'array', items: { type: 'object', properties: {
    theme: { type: 'string' },
    issues: { type: 'array', items: { type: 'integer' } },
    suspected_duplicates: { type: 'array', items: { type: 'array', items: { type: 'integer' } } },
  }, required: ['theme', 'issues', 'suspected_duplicates'] } } },
  required: ['clusters'],
}
let clusters = []
if (summaries.length) {
  phase('Cluster')
  const c = await agent(`${COMMON}\n\nTASK: Group these open issues into clusters of related work (max ~10 issues each; every issue in exactly one cluster). Flag sets that look like duplicates or overlap.\n${JSON.stringify(summaries)}`,
    { label: 'cluster', phase: 'Cluster', model: 'sonnet', schema: CLUSTERS })
  clusters = c ? c.clusters : chunks(summaries.map(s => s.number), 10).map(issues => ({ theme: 'unclustered', issues, suspected_duplicates: [] }))
}

// ---------- Triage ----------
const TRI = {
  type: 'object',
  properties: { decisions: { type: 'array', items: { type: 'object', properties: {
    issue: { type: 'integer' },
    action: { type: 'string', enum: ['keep', 'close-completed', 'close-not-planned', 'merge-into', 'edit'] },
    merge_into: { type: ['integer', 'null'] },
    retitle: { type: ['string', 'null'] },
    labels_add: { type: 'array', items: { type: 'string' } },
    labels_remove: { type: 'array', items: { type: 'string' } },
    body_changes: { type: ['string', 'null'], description: 'exact stale lines and their replacement' },
    rationale: { type: 'string' },
    next_step: { type: 'string', description: 'concrete next action and who owns it' },
  }, required: ['issue', 'action', 'merge_into', 'retitle', 'labels_add', 'labels_remove', 'body_changes', 'rationale', 'next_step'] } } },
  required: ['decisions'],
}
const triageP = pipeline(clusters, cl =>
  agent(`${COMMON}\n\nTASK: Triage cluster "${cl.theme}": issues ${cl.issues.map(n => '#' + n).join(', ')}. Suspected duplicates: ${JSON.stringify(cl.suspected_duplicates)}.
Read each issue fully. Decide one action per issue. Keep is right for a valid issue. Merge only true duplicates: the survivor is the one with the richer history. For a wayfinder map, list every stale line in its body with replacement text and check its child list against the live children.
Summaries for context: ${JSON.stringify(summaries.filter(s => cl.issues.includes(s.number)))}`,
    { label: `triage:${cl.theme.slice(0, 30)}`, phase: 'Triage', model: 'sonnet', schema: TRI }))

// ---------- Verify ----------
const VER = {
  type: 'object',
  properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' },
    holds: { type: 'boolean', description: 'true only if it survives your attempt to refute it' },
    better_home: { type: ['string', 'null'], description: 'for a candidate: "comment on #n", "map line", "doc edit", or null for its own issue' },
    reason: { type: 'string' },
  }, required: ['id', 'holds', 'better_home', 'reason'] } } },
  required: ['verdicts'],
}
const [disc, triRaw] = await Promise.all([candsP, triageP])
const found = disc.filter(Boolean)
const decisions = triRaw.filter(Boolean).flatMap(t => t.decisions)
const seen = new Set()
const cands = found.flatMap(f => f.items.map(i => ({ ...i, finder: f.key })))
  .filter(c => { const k = c.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); return !seen.has(k) && seen.add(k) })
  .map((c, i) => ({ id: `C${i + 1}`, ...c }))
const risky = decisions.filter(d => d.action !== 'keep' && d.action !== 'edit').map(d => ({ id: `T${d.issue}`, ...d }))
const claims = [...cands, ...risky]
log(`${cands.length} candidates (${found.length}/${finders.length} finders), ${decisions.length} triage decisions, ${risky.length} closes/merges; verifying all ${claims.length}`)

phase('Verify')
const verdicts = (await parallel(chunks(claims, VERIFY_BATCH).map((batch, i) => () =>
  agent(`${COMMON}\n\nTASK: Try to REFUTE each claim below; default holds=false when unsure.
- A C* item claims untracked work: refute it if done (code, git log), tracked by an open issue or map line, stale, or speculative. If it holds but is small, name its better_home.
- A T* item proposes closing or merging an issue: refute it if the issue is not done, the close breaks a tracker rule, or the merge target does not cover it.
${JSON.stringify(batch, null, 1)}`,
    { label: `verify:${i}`, phase: 'Verify', model: 'sonnet', schema: VER }))))
  .filter(Boolean).flatMap(v => v.verdicts)
const byId = Object.fromEntries(verdicts.map(v => [v.id, v]))
const unchecked = claims.filter(c => !byId[c.id]).map(c => c.id)
if (unchecked.length) log(`No verdict for ${unchecked.length} claims: ${unchecked.join(', ')}`)

// ---------- Synthesize ----------
const OPS = {
  type: 'object',
  properties: {
    ops: { type: 'array', items: { type: 'object', properties: {
      op: { type: 'string', enum: ['create', 'close-completed', 'close-not-planned', 'comment', 'edit-title', 'edit-body', 'add-labels', 'remove-labels', 'add-subissue', 'add-blocked-by'] },
      issue: { type: ['integer', 'null'] },
      ref: { type: ['string', 'null'], description: 'create: local id like NEW1 that later ops can cite' },
      title: { type: ['string', 'null'] },
      body: { type: ['string', 'null'], description: 'issue body, full replacement body, or comment text' },
      labels: { type: 'array', items: { type: 'string' } },
      other: { type: ['string', 'null'], description: 'parent map or blocker (number or ref)' },
      why: { type: 'string' },
    }, required: ['op', 'issue', 'ref', 'title', 'body', 'labels', 'other', 'why'] } },
    rejected: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, why: { type: 'string' } }, required: ['title', 'why'] } },
    questions_for_user: { type: 'array', items: { type: 'string' }, description: 'each with reply options' },
    unreachable_sources: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['ops', 'rejected', 'questions_for_user', 'unreachable_sources', 'summary'],
}
phase('Synthesize')
const plan = await agent(`${COMMON}

TASK: Build the final tracker change list from the inputs. Act only where evidence holds; put judgement calls in questions_for_user.
- Use a triage decision only if it is keep/edit, or its T<issue> verdict holds.
- Use a candidate only if its verdict holds. Prefer its better_home (a comment, a map line) over a new issue; fold related candidates into one issue.
- A merge = a comment on the survivor carrying the unique content + close-not-planned on the duplicate ("Duplicate of #n").
- A new issue follows the tracker rules: category label, area/client labels, one state or wayfinder label, a parent map (add-subissue) when maps exist, a short body: problem, evidence, done-when.
- edit-body carries the FULL new body: fetch the current body, change only the stale parts, keep the rest verbatim.

TRIAGE DECISIONS: ${JSON.stringify(decisions)}
CANDIDATES: ${JSON.stringify(cands)}
VERDICTS: ${JSON.stringify(verdicts)}
UNREACHABLE (finders): ${JSON.stringify(found.map(f => f.unreachable).filter(Boolean))}`,
  { label: 'synthesize', phase: 'Synthesize', model: 'opus', schema: OPS })
if (!plan) return { error: 'synthesis failed', decisions, cands, verdicts }

if (!A.apply) return { plan, applied: null, decisions, candidates: cands.length, verdicts: verdicts.length }

// ---------- Apply ----------
phase('Apply')
const applied = await agent(`Apply this tracker change list in ${A.repo}, in order, with the operations in docs/agents/issue-tracker.md. The user authorised these writes.
- Write each body to a file under ${A.scratch}/apply and pass it by file.
- After each create, map its ref (NEW1) to the new number and substitute it in every later op.
- Re-read an issue before you close or edit it; if its state changed or the op no longer fits, skip it.
- Use only labels that exist; report a missing label instead of creating it.
Return plain text, one line per op: OK|SKIP|FAIL, op, issue number, note.

OPS: ${JSON.stringify(plan.ops, null, 1)}`,
  { label: 'apply', phase: 'Apply', model: 'sonnet' })

return { plan, applied, decisions, candidates: cands.length, verdicts: verdicts.length }
