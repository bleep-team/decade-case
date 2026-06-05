# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

# SUMMARY COMMIT

After all branches have been merged, create one final commit that summarizes everything that was merged in this iteration. This serves as a changelog marker — for example: "Merge issues #34, #35, #37: extended Todo type, added label badges, added note field."

# CLOSE ISSUES

For each branch that was merged, **before closing the corresponding issue**:

1. Fetch the issue body with `gh issue view <n> --json body`.
2. Read its `## Acceptance criteria` section.
3. If every `- [ ]` line is `- [x]`, close the issue.
4. If any `- [ ]` line remains unchecked, **do NOT close the issue**. Instead, leave a comment on the issue listing the unmet criteria, and skip to the next branch. The issue stays open so a follow-on iteration can close out the remaining scope.

An issue is "done" only when every AC checkbox is `- [x]`. Partial-shipment closures are not allowed under any circumstance — even if the implementation agent's wrap-up comment says the deferred work is "follow-up-able."

Do NOT close parent PRD issues — those are closed separately when the full PRD is submitted as a PR.

Here are all the issues:

{{ISSUES}}

# GIT IDENTITY

NEVER run `git config user.name` or `git config user.email`. The pre-configured git identity belongs to the repo owner and must not be changed.

# RULES

Do NOT create pull requests.
Do NOT push to remote (no `git push`).
Only merge LOCAL branches into the current branch.

Once you've merged everything you can, output <promise>COMPLETE</promise>.
