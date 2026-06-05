---
name: file-prd-bug
description: >
  File a well-structured `Bug:`-prefixed GitHub issue under a parent PRD,
  including a root-cause hypothesis and a fix direction so a background
  sandcastle agent can pick it up and solve it autonomously. Use this skill
  when a demo-bar walkthrough surfaces a defect, when the user wants to
  open a bug ticket attached to a PRD in progress, or whenever you'd
  otherwise write a bug issue by hand — e.g. "file a bug", "open an issue
  for this", "this looks broken, ticket it", or "/file-prd-bug". Does NOT
  dispatch sandcastle — the user kicks that off separately.
---

# File PRD Bug

Open one well-structured `Bug:`-prefixed GitHub issue under a parent PRD. The issue must be self-sufficient for a background coding agent: the agent reads it once, locates the code, writes the fix, and closes the issue without asking questions.

## When this skill is invoked

Two main entry points:

1. **From `/walk-demo-bar`** during sign-off — the demo-bar walkthrough hands off the parent PRD number + a one-line observation.
2. **Directly by the user** — they describe a bug they hit and want a ticket so a sandcastle agent can take it.

In both cases, gather:

- **Parent PRD number** (required).
- **Bug observation** in the user's words (required). Press the user for the _symptom_, not their hypothesis.
- **Discovery context** — what they were doing when they noticed it. If invoked from `/walk-demo-bar`, capture the demo-bar issue number too.

## Process

### 1. Ground the bug in code

Before drafting the issue, read enough code to articulate a root cause. Specifically:

1. From the observation, identify the surface area — which package(s), which route(s), which dispatcher/component/function the bug touches.
2. Read the relevant file(s) end-to-end if short, or the relevant function(s) with surrounding context if long.
3. Form a root-cause hypothesis. It can be uncertain — flag uncertainty explicitly with "**Hypothesis:**" rather than asserting — but it has to be specific enough that an agent reading the issue knows where to start.
4. Identify 1–2 candidate fix directions. If the right fix is obvious, write one. If there's a tradeoff (e.g. fix-locally vs. lift-to-shared-helper), write both with a brief tradeoff line each.

Do **not** ask the user to do this triage. The skill's value is that the issue lands ready-to-pick-up.

### 2. Resolve the user label

The bug is for a sandcastle agent, so it carries the autonomous label plus its type label:

1. Get the GitHub username: `gh api user --jq '.login'`
2. Construct the label: `<username>-afk`
3. Check if the label exists: `gh label list --search "<username>-afk"`
4. If it doesn't exist, create it: `gh label create "<username>-afk" --color "0E8A16" --force`
5. Create the type label if missing: `gh label create "type:bug" --color D93F0B --description "Bug filed under a PRD" --force`. Pass **both** `--label "<username>-afk"` and `--label "type:bug"` to the `gh issue create` command.

The demo-bar issue keeps its own `<username>-hitl` label; only the bug-fix issue gets `-afk`.

### 3. Draft the issue body

Use the template below. Sections are required unless marked optional.

<bug-template>

```markdown
## Parent PRD

#<prd-issue-number>

(If surfaced during a demo-bar walkthrough, also reference: discovered during demo-bar walkthrough #<demo-bar-issue>.)

## Problem

<one sentence stating what's wrong and why it matters to the user. Imagine a reader who hasn't seen the demo bar — give them just enough to understand the impact>

## Observed behavior

<concrete description of what the user saw — the wrong output, the missing element, the unexpected error. Quote exact error messages when available>

## Root cause

<one to three short paragraphs locating the bug in the code. Cite file paths and line ranges. If certain, state it. If hypothetical, write **Hypothesis:** and explain the reasoning>

## Fix direction

<one or two numbered candidates. For each: what to change, where, and why. If there's a tradeoff between candidates, name it (e.g. "Option A is local but doesn't help the v2 dispatcher; Option B is a broader refactor")>

## Acceptance criteria

- [ ] <verifiable behavior change>
- [ ] <regression check, if applicable>
- [ ] <test coverage requirement>

## Reproduce

1. <numbered, copy-paste-ready steps>
2. <use literal values, URLs, field contents>
3. <…>

## Out of scope

<related concerns deliberately deferred. Prevents the agent from over-scoping the fix>

## References

- Demo-bar issue: #<n> (if applicable)
- Related code: `path/to/file.ts:120-145`
- Prior context: <PR#, ADR, or other issue, if relevant>
```

</bug-template>

### 4. Title

`Bug: <one-line summary>` — the summary should name _what_ is broken, not _why_. Examples (from PRD #176):

- `Bug: run-view requires manual refresh — Realtime publish/subscribe race in dev`
- `Bug: secrets loader aborts every workflow run when any tenant secret can't be decrypted`
- `Bug: Send for Approval dispatcher creates duplicate pending rows on Inngest replay`

Keep under 100 characters. No issue body content in the title.

### 5. Create the issue

```bash
gh issue create \
  --title "Bug: <summary>" \
  --label "<username>-afk" \
  --label "type:bug" \
  --body-file <temp-file>
```

After creation, fetch the issue number from the URL and report it back to the caller.

### 6. Hand back

Print one short line: `Filed #<issue-number>: Bug: <summary>. Kick off sandcastle on it in another terminal.`

That's it — the skill ends. The user kicks off sandcastle themselves; this skill does **not** dispatch it (per the project's local-first, no-per-slice-PR posture).

## What this skill does not do

- **Does not dispatch sandcastle.** The user does that in another terminal. This keeps parallel work coordinated through the user's awareness rather than through skill side effects.
- **Does not modify the parent PRD or demo-bar issues.** Cross-references go in the bug issue's body only.
- **Does not close anything.** The bug-fix issue is closed by the sandcastle agent's commit referencing `#<bug-issue>` (or by the user manually after merge).

## Edge cases

- **Bug spans multiple PRDs:** still file under one parent — the most directly related — and reference the others in `## References`. Don't split into multiple issues for the same defect.
- **User isn't sure whether it's a bug or a scope gap:** ask one question to disambiguate. If the PRD's acceptance criteria say behavior X and the system does Y, it's a bug. If the PRD is silent, it's a scope gap — surface that to the user; the right move is usually a PRD amendment or a clarifying comment, not a bug ticket.
- **The bug is trivial (typo, missing label):** still file it. Triviality isn't a reason to skip; sandcastle clears trivia fast and the issue records the discovery.
- **Code reading turns up that the bug is already filed:** stop. Tell the user the existing issue number rather than filing a duplicate.

## Next step

After filing, the user kicks off sandcastle on the new issue in a separate terminal. When the fix lands locally and you're back in the walkthrough, return to `/walk-demo-bar` and resume from the same checkbox.
