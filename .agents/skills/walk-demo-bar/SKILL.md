---
name: walk-demo-bar
description: >
  Interactively shepherd the user through a PRD's demo-bar sign-off issue, one
  acceptance-criterion checkbox at a time. Spells out the exact action to take
  (copy-paste-ready URLs, field values, button clicks) and the expected
  outcome, pauses for the user to report back, and pivots into `/file-prd-bug`
  when a bug surfaces. When every box is verified, posts the sign-off comment
  on the demo-bar issue. Use this skill whenever the user wants to start or
  resume a demo-bar review, run a manual walkthrough, or sign off a PRD —
  e.g. "let's walk the demo bar", "run me through the sign-off",
  "verify the PRD", or "/walk-demo-bar".
---

# Walk Demo Bar

Shepherd the user through the demo-bar sign-off issue for a PRD. The user is the human in the loop; this skill removes every decision they don't need to make so they can focus on observing whether each step works.

## Pacing rule (load-bearing)

**One action per prompt. One outcome per prompt.** Never advance two checkboxes in a single response. The user should never have to scan a wall of instructions and decide what to do — the skill picks the next step and the user just follows it.

If a step has sub-actions (e.g. "fill 3 fields, then click Save"), present them as a single contiguous procedure but still **one outcome to verify** at the end. Don't fork the user's attention.

## Process

### 1. Locate the demo-bar issue

If the user supplied an issue number, use it. Otherwise, auto-detect:

1. Resolve the GitHub username: `gh api user --jq '.login'`
2. List open issues labeled `<username>-hitl`: `gh issue list --label "<username>-hitl" --state open --json number,title,body`
3. If exactly one matches, use it. If multiple, ask the user which PRD they're signing off.

Confirm the choice with the user before continuing (one short line: "Walking demo bar for PRD #<n> — issue #<m>: '<title>'. Ready?").

### 2. Parse the acceptance criteria

Fetch the issue body with `gh issue view <n> --json body --jq '.body'`. Extract the `## Acceptance criteria` section. Each `- [ ]` line is one checkbox to walk through. Track which boxes are already checked (skip them on resume) and which remain.

If the issue has a `## What to build` section, read it once at the start so you have the demo workflow shape in context. Don't read it back to the user — they wrote or reviewed it.

### 3. Walk each unchecked checkbox

For every remaining checkbox, emit a turn that contains exactly:

1. **The action.** Spelled out concretely — literal URLs, literal field values, exact button labels. Copy-paste-ready. If the demo-bar PRD says "configure the HTTP node to fetch a vendor record," translate that into "Open the HTTP node panel. In the URL field, paste `https://...`. In the Method dropdown, pick `GET`. Click Save." Use real values from the PRD's example payload whenever possible.
2. **The expected outcome.** One sentence on what the user should see. Be specific: "The approval node turns yellow and the run-view inspector shows 'Waiting on approval' with the assigned email."
3. **The prompt.** End the turn with a direct question: "Did that work?" or "What do you see?"

Then stop and wait.

### 4. Handle the user's response

- **"Works" / "looks good" / "yes":** check the box mentally, fetch the issue body, edit the box from `- [ ]` to `- [x]`, run `gh issue edit <n> --body-file <updated>`. Then move to the next checkbox.
- **"Bug" / "broken" / observed behavior doesn't match:** **do not** keep walking. Invoke `/file-prd-bug` with the parent PRD number and a one-line summary of the bug. Wait for the bug-fix issue to be filed. Tell the user: "Filed #<bug-issue>. Kick off sandcastle in another terminal on that issue. When the fix lands and you're back, I'll resume from this same checkbox — let me know when you're ready." Then pause until the user resumes the walkthrough.
- **"Wait" / "let me re-check":** acknowledge and stay paused. Do not advance.
- **Question instead of an answer** (e.g. "should I see the badge here?"): answer based on the PRD's acceptance criteria. Don't guess. If the PRD doesn't specify, surface that as a scope question and ask the user how to proceed — possibly file a clarifying comment on the demo-bar issue rather than a bug.

### 5. Resume after a bug fix

When the user signals they're ready (the bug-fix issue is closed and sandcastle's local commit has landed on the PRD branch), re-fetch the demo-bar issue body (the user may have ticked off boxes manually) and resume from the _same_ checkbox you paused on — a fix often changes what's correct to observe, so re-do the box rather than skipping forward. Re-read the action and outcome cleanly; don't summarize "we were at step N when…".

### 6. Sign-off comment

Once every checkbox is `- [x]`, post a sign-off comment on the demo-bar issue:

```bash
gh issue comment <demo-bar-issue> --body "$(cat <<'EOF'
Demo-bar manual walkthrough complete. All acceptance criteria verified end-to-end.

<one short paragraph naming the paths verified — Approve, Reject, Timeout, Cancel, etc. — and the locale/theme matrix>

Signing off. PRD ready to ship.
EOF
)"
```

Do **not** close the demo-bar issue. It stays open and is closed by the PR via `Closes #<demo-bar-issue>` on merge.

### 7. Hand off to /prd-to-pr

Tell the user: "Sign-off posted on #<demo-bar-issue>. Run `/prd-to-pr <prd-number>` to open the PR — it'll close both the PRD and this demo-bar issue on merge."

## Edge cases

- **Empty `## Acceptance criteria` section:** stop and tell the user. The demo-bar issue is malformed; ask whether to populate it now (manually or by re-running `/break-prd-into-issues`).
- **All checkboxes already checked when starting:** confirm with the user — they may want to re-verify after a recent fix, or they may want to skip straight to sign-off.
- **User reports a scope gap rather than a bug** ("the PRD doesn't say what should happen here"): don't file a bug. Suggest a comment on the demo-bar issue with a question for the PRD author, or surface the gap and let the user decide whether to amend the PRD before shipping.
- **Multiple bugs in one walkthrough:** that's normal. File each via `/file-prd-bug`. Resume from the current checkbox after each fix lands.

## Next step

When sign-off is posted, run `/prd-to-pr <prd-number>` to open the PR.
