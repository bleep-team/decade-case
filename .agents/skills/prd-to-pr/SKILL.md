---
name: prd-to-pr
description: >
  Open a pull request for a completed PRD. Verifies all child implementation
  issues are closed, merges main forward if needed, runs every CI check (lint, typecheck,
  test, build), formats code, reviews docs, then creates a PR that auto-closes
  the PRD issue on merge. Use this skill whenever the user wants to open a PR
  for a PRD, close out a PRD, finalize implementation work, or says things
  like "let's open the PR", "PRD is done", "submit the PRD work".
---

# PRD to PR

After all implementation issues from a PRD have been completed, this skill verifies the work is done and opens a pull request that ties everything together.

This is the PRD-aware cousin of `/open-pr`. The CI-checks, formatting, main-forward merge, docs-review, and push steps are intentionally identical to `/open-pr` so that whichever skill the user reaches for, the branch is held to the same bar before it ships.

## Process

> **Git hooks**: This repo uses Husky with pre-commit (lint-staged), commit-msg (commitlint), and pre-push (typecheck) hooks. All commits must pass lint-staged and follow Conventional Commits format (`<type>(<scope>): <description>`). See CLAUDE.md → Git Hooks for details.

### 1. Locate the PRD

If the PRD issue number was not provided as an argument, ask the user for it.

Extract the issue number from whatever the user provides (a number like `19`, a `#19` reference, or a full GitHub URL).

### 2. Fetch the PRD and find child issues

Fetch the PRD issue with full details:

```bash
gh issue view <number> --comments
```

Find all child implementation issues by searching for issues whose body references this PRD as their parent. The `prd-to-issues` skill adds a `## Parent PRD` section with `#<number>` to every child issue:

```bash
gh issue list --search "Parent PRD #<number>" --state all --json number,title,state
```

If no child issues are found, also try parsing the PRD body and comments for `#<number>` references to other issues.

### 3. Verify child issue status

Check the state of each child issue. Present a summary:

```
Child issues for PRD #19:
  ✓ #20 - Set up Next.js project (closed)
  ✓ #21 - Add and display to-do items (closed)
  ✗ #22 - Complete/uncomplete to-do items (OPEN)
  ✓ #23 - Delete to-do items (closed)
```

If any child issues are still open, warn the user clearly and ask whether to proceed or stop. Do not silently continue — the user should consciously decide to open a PR with incomplete work.

One exception: **sign-off-only issues** (typically a "manual walkthrough" or "acceptance" issue whose body has no code-bearing scope, only a checklist) are expected to stay open until the PR that closes the PRD is merged. Surface them to the user and ask whether to close them via the PR body's `Closes #<n>` line.

### 4. Verify commits match issues

Every code-bearing child issue should have a corresponding commit on the branch. Sandcastle typically creates one commit per issue, but the last issue's work may not have been committed before the process ended.

1. Run `git log --oneline origin/main..HEAD` to list all commits on the branch since it diverged from `main`.
2. Compare the commits against the child issues from step 2. Sandcastle commits usually reference an issue number (e.g. `#24`) or contain the issue title. Identify any code-bearing child issues that have no matching commit.

**If all issues have commits and there are no uncommitted changes:** proceed to step 5.

**If there are missing commits:** check `git status` for uncommitted changes.

- **Uncommitted changes exist and they relate to the missing issue:** Show the user the list of changed files and suggest a commit message using **Conventional Commits** format based on the missing issue (e.g. `feat(db): add persistence across reloads (#24)`). The commit-msg hook will enforce this format. If the pre-commit hook fails during the commit, fix the lint issues, re-stage, and retry. Wait for the user to confirm or adjust before committing.
- **Uncommitted changes exist but don't clearly relate to the missing issue:** Show the user both the uncommitted changes and which issue is missing a commit. Ask the user how to proceed — they may need to explain or manually sort things out.
- **No uncommitted changes but a commit is still missing:** Warn the user that issue work may be incomplete. Ask whether to proceed anyway or stop.

Never silently open a PR when the commit count doesn't match the issue count — always surface this to the user.

### 5. Bring branch up to date with main

Bring the branch up to date with `main` so the merge is conflict-free at PR time.

**This repo uses squash-and-merge**, which collapses the PR's commits into one on `main` at merge time. That means the _shape_ of commit history on the feature branch is irrelevant — only the _tree_ needs to be mergeable. So `git rebase` is the wrong tool: it flattens any merge commits on the branch (e.g. sandcastle merges) and replays each underlying commit as a flat patch, which surfaces phantom conflicts that wouldn't exist in a real merge. Use `git merge` instead.

Logic:

```bash
git fetch origin main
if git merge-base --is-ancestor origin/main HEAD; then
  echo "main is already an ancestor of HEAD — nothing to do"
else
  # Stash any uncommitted changes (including untracked) so merge can proceed
  git stash --include-untracked || true
  git merge --no-edit origin/main
  git stash pop || true
fi
```

If the merge has conflicts, pause and show the user which files conflict. Help resolve them if straightforward, or ask the user for guidance if non-trivial. After resolution, commit the merge.

Do **not** use `git rebase origin/main` in this repo — it breaks on branches with sandcastle merge commits and offers no benefit when the PR will be squashed. If a contributor explicitly wants a rebase, they can run it themselves outside this skill.

### 6. Format code

Run the formatter so style issues don't pollute the diff or fail lint:

```bash
pnpm format
```

> **Note:** The pre-commit hook runs lint-staged (ESLint + Prettier) on staged files automatically when you commit. Running `pnpm format` here is a broader sweep that catches files not touched in this branch. If `pnpm format` changes zero files, skip to step 7.

After formatting, check how many files changed with `git diff --stat`. If formatting touched **more than 10 files** that aren't part of the current branch's work, flag this to the user and suggest committing formatting changes as a **separate commit** before the feature changes. A 100-file formatting diff mixed into a feature diff is hard to review.

If formatting only touched a handful of files related to the current work, stage them — they'll be bundled into the next commit or into a small `chore(repo): format` commit if the branch is otherwise clean.

### 7. Run CI checks

Run the same checks CI runs, in this order (fail-fast — stop at the first failure):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

**If a check fails:** Read the error output, diagnose the issue, and fix it. After fixing, re-run the failing check to confirm it passes, then continue with the remaining checks. If a fix is non-trivial or ambiguous, show the error to the user and ask how to proceed rather than guessing.

**If build fails with a DTS or "overwrite input file" error:** This usually means stale build artifacts in a `dist/` directory are conflicting. Run `pnpm clean` (or `rm -rf` the offending `dist/` folder) and retry the build before investigating further.

Note: `typecheck` depends on `build` (see `turbo.json`). If build hasn't run yet in this session, typecheck may trigger builds automatically via Turbo's dependency graph. If typecheck fails due to missing build outputs, run build first.

### 8. Docs review

Now that the work compiles and passes tests, the next thing to ship is **docs that match the code**. This is the moment to catch doc rot before the PR lands — much easier to fix here than in a follow-up after a reviewer notices.

Get a summary of what changed on the branch:

```bash
git diff origin/main...HEAD --stat
git diff origin/main...HEAD --name-only
```

**This is an active step — read the docs, don't just list them.** Scope the change first, then audit proportionally.

**Classify the change.** Treat it as a **major surface change** if the diff includes any of: a new `packages/<name>/` or `apps/<name>/` directory; a schema or migration change under `packages/db/**`; a new top-level runtime dependency in a `package.json`; a new external surface, route namespace, MCP tool, Inngest job/realtime channel, or webhook family; or a change to an auth, settlement, matching, or runtime invariant (the money-in-cents and price-time-priority rules at the heart of the exchange). Otherwise it is a **routine change**.

- **Routine change** — open the specific docs the hint table below points at, read them against the diff, and fix anything stale. Listing candidates is not enough; the failure mode is skimming a file you never opened.
- **Major surface change** — spawn a docs-audit sub-agent (Explore or general-purpose) to _read_, not path-map. Give it: a short description of what landed (new package / surface / tables / env vars), the changed-file list, and the docs that enumerate things which may now be incomplete. Tell it to grep for and read every place that enumerates surfaces, packages, channels, integrations, runtimes, env vars, domain terms, and the guide & ADR indexes, then return a **ranked findings list** — each finding with the file path, the stale or missing line quoted, a concrete fix, and a severity (HIGH = factually wrong or a setup blocker; LOW = nice-to-have). Require it to answer the net-new gate below. A whole new package or surface is the case a path-lookup most reliably misses — this is where the sub-agent earns its keep, and a PRD-sized branch is almost always a major surface change.

**Net-new gate (check explicitly on a major surface change — these are the docs most often forgotten):**

- New package → its `README.md` + the package table in `CLAUDE.md` + `docs/architecture/package-guide.md` + the directory tree in `docs/architecture/repo-structure.md` + the module map in `docs/architecture/overview.md` + the `docs/README.md` index.
- New external surface or integration (REST route family, MCP tool, Inngest job/realtime channel, webhook event) → the order-lifecycle / surfaces section of `docs/architecture/overview.md`, linked from `docs/README.md`.
- New architectural decision, external dependency, or invariant change → a new ADR in `docs/adr/` + the `docs/adr/README.md` index.
- New or renamed canonical domain term (Bid/Ask, Order, Trade, Book, Cents…) → `UBIQUITOUS_LANGUAGE.md`.

The hint table below maps changed paths to docs that frequently go stale. It **feeds** the audit; it does not replace reading them:

| What changed                                                                                      | Docs to check                                                                                                  |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/db/**`, schema, migrations                                                              | `packages/db/README.md`, `docs/architecture/overview.md`                                                       |
| `packages/auth/**`, broker identity, API keys                                                     | `packages/auth/README.md`, `UBIQUITOUS_LANGUAGE.md` (Broker)                                                   |
| `packages/matching-engine/**`, matching/price-time rules, partial fills                           | `packages/matching-engine/README.md`, `docs/architecture/overview.md`, `UBIQUITOUS_LANGUAGE.md`                |
| Order lifecycle, REST routes, MCP tools, Inngest jobs/realtime, webhooks                          | `docs/architecture/overview.md`, `docs/README.md`                                                              |
| Any package's public API (exports in `src/index.ts`)                                              | That package's `README.md`                                                                                     |
| `apps/web/.env.example` or a new env var                                                          | root `README.md`, `docs/runbooks/deploy.md`                                                                    |
| `.github/workflows/**`, CI/CD, Docker, deploy                                                     | `docs/operations/ci-cd-pipeline.md`, `docs/runbooks/deploy.md`                                                 |
| New `apps/` or `packages/` directory                                                              | package table in `CLAUDE.md`, `docs/architecture/{package-guide,repo-structure,overview}.md`, `docs/README.md` |
| New external runtime dependency in any `package.json`                                             | Consider a new ADR in `docs/adr/`                                                                              |
| Foundational tool swap, new infrastructure, change to auth/settlement/matching/runtime invariants | New ADR in `docs/adr/`                                                                                         |
| New canonical domain term, or rename of an existing one                                           | `UBIQUITOUS_LANGUAGE.md`                                                                                       |

**Act on what the review surfaces — do not default to skip:**

- Fix every HIGH / correctness finding now: stale enumerations (package tables, architecture diagrams, identity/surface tables), missing env vars, wrong invariants. These are not optional — they are the rot a path-lookup misses.
- For discretionary net-new work (a full guide, an ADR), present the recommendation and let the user decide to write it now or defer — an explicit, evidence-backed call, never a blanket "skip".

**For ADRs:** the next number is one greater than the highest existing — `ls docs/adr/0*.md | tail -1` shows the current max. Filename format is `NNNN-<kebab-title>.md` with `NNNN` zero-padded to 4 digits. After writing the ADR, append it to the index table in `docs/adr/README.md`.

Do not silently commit doc edits — show the user the diff of any docs touched in this step before bundling them into a commit.

### 9. Push to remote

Push the current branch to the remote:

```bash
git push -u origin <branch-name>
```

If the branch already tracks a remote and is up to date, a regular `git push` suffices. Since step 5 uses merge (not rebase), no force-push is needed — the merge commit is additive on top of existing history.

> **Note:** The pre-push hook runs `pnpm turbo run typecheck --filter='...[origin/main]'`. If it fails, fix the type error before retrying. Do not use `git push --no-verify` to bypass hooks.

### 10. Resolve the PR label

The PR should carry a user-specific label so team members can easily filter PRs by author. Derive it dynamically:

1. Get the GitHub username: `gh api user --jq '.login'`
2. Construct the label: `<username>-hitl` (e.g. `joao-tail-hitl`)
3. Check if the label exists: `gh label list --search "<label>"`
4. If it doesn't exist, create it: `gh label create "<label>" --color "0E8A16"`

### 11. Open the pull request

Create a PR from the current branch to `main` (or the repo's default branch).

Derive the PR title from the PRD issue title. If the PRD title starts with `PRD:`, strip that prefix. Keep it concise (under 70 characters).

Use the following template for the PR body (via HEREDOC for correct formatting), and include the `--label` flag:

<pr-template>

```bash
gh pr create --title "<title>" --label "<username>-hitl" --body "$(cat <<'EOF'
## Summary

<2-3 sentence summary of what this PRD implements, written from the user's perspective>

## PRD

Closes #<PRD_NUMBER>

## Implementation Issues

<for each child issue, a checked or unchecked checkbox; if a sign-off-only issue was kept open per step 3, add a Closes #<n> line for it here too>

- [x] #20 - Set up Next.js project
- [x] #21 - Add and display to-do items
- [x] #22 - Complete/uncomplete to-do items
- [x] #23 - Delete to-do items

## Test plan

- [x] Lint passes (\`pnpm lint\`)
- [x] Typecheck passes (\`pnpm typecheck\`)
- [x] All tests pass (\`pnpm test\`)
- [x] Build succeeds (\`pnpm build\`)
- [ ] Manual verification of core functionality
EOF
)"
```

</pr-template>

The `Closes #<PRD_NUMBER>` line is important — GitHub will automatically close the PRD issue when this PR is merged. Add additional `Closes #<n>` lines for any sign-off-only issues identified in step 3.

### 12. Report back

After the PR is created, display the PR URL to the user.

## Edge cases

- **No commits on branch yet:** Warn the user that there's nothing to PR and stop.
- **Branch is `main`:** Refuse to open a PR from `main` to `main`. Ask the user to create a feature branch first.
- **CI check takes too long:** If `pnpm build` or `pnpm test` hangs for more than 5 minutes, notify the user rather than waiting silently.
- **Multiple unrelated changes:** If the branch's commits touch very different areas with no clear theme, suggest the user consider splitting into multiple PRs — but proceed if they say it's fine.
- **Untracked files:** When stashing before merge, use `--include-untracked` so new files aren't left behind. When checking for uncommitted changes, also check for untracked files with `git status`.
- **Sign-off-only child issues left open:** Expected for "manual walkthrough" issues that ship without code. Close them via the PR body rather than asking the user to close them by hand.
