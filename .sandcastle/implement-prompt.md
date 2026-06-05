# TASK

Fix issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view`, with comments. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits, run tests, and close the issue when done.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` to ensure everything passes.

# GIT IDENTITY

NEVER run `git config user.name` or `git config user.email`. The pre-configured git identity belongs to the repo owner and must not be changed. The `RALPH:` prefix in commit messages is sufficient to identify agent-authored commits.

# COMMIT

Make a git commit. The commit message must:

1. Start with `RALPH:` prefix
2. Include task completed + PRD reference
3. Key decisions made
4. Files changed
5. Blockers or notes for next iteration

Keep it concise.

# THE ISSUE

The issue's `## Acceptance criteria` section is binding. Treat every `- [ ]` line as a deliverable for this iteration. As each AC is satisfied by your commits, update the issue body to flip that line to `- [x]` (use `gh issue edit <n> --body-file`).

Do **not** split scope. Do **not** file follow-up issues for parts of the original AC. If an AC is larger than expected, leave it unchecked, leave the issue open, and stop — a follow-on iteration will pick up where you left off. The merge phase will refuse to close issues with unchecked AC.

If you believe an AC is wrong or unnecessary, leave a comment asking before deviating. Do not silently drop or reinterpret it.

If the task is not complete (any AC remains `- [ ]`), leave a comment on the GitHub issue explaining what was done, what remains, and any blockers.

Do NOT close the issue — closing happens in the merge phase, only after the branch is successfully merged AND every AC is `- [x]`.

Once your work is complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
Do NOT create pull requests.
Do NOT merge branches.
Do NOT push to remote (no `git push`).
Do NOT close parent PRD issues — only close YOUR assigned issue.
Only make commits on YOUR assigned branch ({{BRANCH}}).

## Database schema is off-limits

NEVER run `drizzle-kit generate` or `pnpm --filter @decade/db db:generate`.
NEVER modify any file under `packages/db/drizzle/**` (including `meta/_journal.json`).
NEVER modify Drizzle schema TypeScript that declares tables, columns, or relations.

If your task requires schema not already present on the branch, STOP. Leave a comment on the issue describing the gap. End your iteration with no commits to schema files. The PRD owner authors the schema before sandcastle runs; you implement the code that uses it.

A journal-immutability test in `@decade/db` enforces this and will fail your build if you touch the migration files.
