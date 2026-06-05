# ISSUES

Here are the open issues in the repo:

<issues-json>

!`gh issue list --state open --label "$(gh api user --jq '.login')-afk" --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# RECENTLY CLOSED

These issues were closed by the immediately-prior iteration's Merger. They may still appear in `<issues-json>` above because GitHub's search index lags 5–15 seconds behind issue closures. Treat any issue number listed here as if it does **NOT** appear in `<issues-json>` when resolving `## Blocked by` references. In particular, a child whose only open blocker is an issue in this list is now **unblocked** and eligible to be picked up in this iteration.

{{RECENTLY_CLOSED}}

# TASK

Analyze the open issues and build a dependency graph. For each issue, determine whether it **blocks** or **is blocked by** any other open issue.

An issue B is **blocked by** issue A if:

- B requires code or infrastructure that A introduces
- B and A modify overlapping files or modules, making concurrent work likely to produce merge conflicts
- B's requirements depend on a decision or API shape that A will establish

An issue is **unblocked** if it has zero blocking dependencies on other open issues.

**Reading "Blocked by" sections.** Issue bodies typically contain a `## Blocked by` section listing `- Blocked by #N` lines. For each such line:

- If issue **#N appears in the `<issues-json>` list above** AND #N is **not** in the `# RECENTLY CLOSED` list, then this issue IS blocked by #N — count it as a blocker.
- If issue **#N does NOT appear in `<issues-json>`**, OR if #N **does** appear in `# RECENTLY CLOSED`, the dependency is **satisfied** — do NOT count #N as a blocker.

An issue whose `## Blocked by` references all resolve as satisfied is **unblocked** and eligible to be picked up. An issue with `Blocked by` saying "None - can start immediately" is also unblocked.

For each unblocked issue, assign a branch name using the format `sandcastle/issue-{number}-{slug}`.

# PRD ISSUES

NEVER include PRD issues in the output. A PRD is any issue whose title starts with "PRD:" or whose body contains sections like "## User Stories" or "## Implementation Decisions". PRDs are parent tracking issues — they are not implementation tasks and must never be assigned to an implementer.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"number": 42, "title": "Fix auth bug", "branch": "sandcastle/issue-42-fix-auth-bug"}]}
</plan>

Include only unblocked, non-PRD issues. If there are no actionable issues (all are blocked, all are PRDs, or there are no issues), output an empty list:

<plan>
{"issues": []}
</plan>

# RULES

Do NOT create pull requests.
Do NOT merge branches.
Do NOT push to remote (no `git push`).
Do NOT close or modify any issues.
Your only job is to analyze and output a plan.
