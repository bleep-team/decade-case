---
name: open-pr
description: >
  Wrap up work on the current branch and open a pull request. Runs all CI
  checks (lint, typecheck, test, build), formats code, merges main forward if needed,
  handles uncommitted changes, pushes, and opens a PR with a standard
  template. Use this skill whenever the user is done coding and wants to
  ship — e.g. "let's open a PR", "wrap it up", "ship it", "push and create
  a PR", "I'm done, let's get this merged", "open-pr", or "/open-pr".
  Also use it if the user says "run checks and push" or "make sure
  everything passes before we PR".
---

# Open PR

Finalize work on the current branch: run every check CI would run, handle uncommitted changes, and open a clean pull request.

## Process

### 1. Bring branch up to date with main

Before running checks, make sure the branch is up to date with `main` so the PR merges cleanly.

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

### 2. Format code

Run the formatter so style issues don't pollute the diff or fail lint:

```bash
pnpm format
```

> **Note:** The pre-commit hook runs lint-staged (ESLint + Prettier) on staged files automatically when you commit. Running `pnpm format` here is a broader sweep that catches files not touched in this branch. If `pnpm format` changes zero files, skip to step 3.

After formatting, check how many files changed with `git diff --stat`. If formatting touched **more than 10 files** that aren't part of the current branch's work (e.g., Prettier reformatting the entire repo because it hadn't been run before), flag this to the user and suggest committing formatting changes as a **separate commit** before the feature changes. This keeps the PR reviewable — a 100-file formatting diff mixed into a 5-file feature diff is hard to review.

If formatting only touched a handful of files related to the current work, stage them normally — they'll be committed in step 5.

### 3. Run CI checks

Run the same checks CI runs, in this order (fail-fast — stop at the first failure):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

**If a check fails:** Read the error output, diagnose the issue, and fix it. After fixing, re-run the failing check to confirm it passes, then continue with the remaining checks. If a fix is non-trivial or ambiguous, show the error to the user and ask how to proceed rather than guessing.

**If build fails with a DTS or "overwrite input file" error:** This usually means stale build artifacts in a `dist/` directory are conflicting. Run `pnpm clean` (or `rm -rf` the offending `dist/` folder) and retry the build before investigating further.

Note: `typecheck` depends on `build` (see `turbo.json`). If build hasn't run yet in this session, typecheck may trigger builds automatically via Turbo's dependency graph. If typecheck fails due to missing build outputs, run build first.

### 4. Docs review

Now that the work compiles and passes tests, the next thing the user has to ship is **docs that match the code**. This is the moment to catch doc rot before the PR lands — much easier to fix here than in a follow-up after a reviewer notices.

Get a summary of what changed on the branch:

```bash
git diff origin/main...HEAD --stat
git diff origin/main...HEAD --name-only
```

**This is an active step — read the docs, don't just list them.** Scope the change first, then audit proportionally.

**Classify the change.** Treat it as a **major surface change** if the diff includes any of: a new `packages/<name>/` or `apps/<name>/` directory; a schema or migration change under `packages/db/**`; a new top-level runtime dependency in a `package.json`; a new external surface, route namespace, ingress, or background-job family (e.g. a new channel); or a change to a multi-tenancy / auth / runtime invariant. Otherwise it is a **routine change**.

- **Routine change** — open the specific docs the hint table below points at, read them against the diff, and fix anything stale. Listing candidates is not enough; the failure mode is skimming a file you never opened.
- **Major surface change** — spawn a docs-audit sub-agent (Explore or general-purpose) to _read_, not path-map. Give it: a short description of what landed (new package / surface / tables / env vars), the changed-file list, and the docs that enumerate things which may now be incomplete. Tell it to grep for and read every place that enumerates surfaces, packages, channels, integrations, runtimes, env vars, domain terms, and the guide & ADR indexes, then return a **ranked findings list** — each finding with the file path, the stale or missing line quoted, a concrete fix, and a severity (HIGH = factually wrong or a setup blocker; LOW = nice-to-have). Require it to answer the net-new gate below. A whole new package or surface is the case a path-lookup most reliably misses — this is where the sub-agent earns its keep.

**Net-new gate (check explicitly on a major surface change — these are the docs most often forgotten):**

- New package → its `README.md` + the package table in `CLAUDE.md` + `docs/architecture/repo-structure.md` + `docs/architecture/package-guide.md`.
- New external surface or integration → a `docs/guides/<name>.md` guide + its entry in the `docs/README.md` Quick Links.
- New architectural decision, external dependency, or invariant change → a new ADR in `docs/adr/` + the ADR index.
- New or renamed canonical domain term → `UBIQUITOUS_LANGUAGE.md`.

The hint table below maps changed paths to docs that frequently go stale. It **feeds** the audit; it does not replace reading them:

| What changed                                                                                | Docs to check                                                               |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/auth/**`, multi-tenancy logic, RLS, role checks                                   | `docs/architecture/multi-tenancy.md`, `packages/auth/README.md`             |
| `packages/db/**`, schema, migrations, RLS policies                                          | `packages/db/README.md`, `docs/architecture/overview.md`                    |
| `packages/llm/**`, model swaps, gateway config                                              | `docs/guides/llm-gateway.md`, `packages/llm/README.md`                      |
| Any package's public API (exports in `src/index.ts`)                                        | That package's `README.md`                                                  |
| `.env.example` (root or any package)                                                        | `docs/getting-started.md`                                                   |
| `.github/workflows/**`                                                                      | `docs/operations/ci-cd-pipeline.md`                                         |
| New `apps/` or `packages/` directory                                                        | `docs/architecture/repo-structure.md`, `docs/architecture/package-guide.md` |
| New external runtime dependency in any `package.json`                                       | Consider a new ADR in `docs/adr/`                                           |
| Foundational tool swap, new infrastructure, change to multi-tenancy/auth/runtime invariants | New ADR in `docs/adr/`                                                      |
| New canonical domain term, or rename of an existing one                                     | `UBIQUITOUS_LANGUAGE.md`                                                    |

**Act on what the review surfaces — do not default to skip:**

- Fix every HIGH / correctness finding now: stale enumerations (package tables, architecture diagrams, identity/surface tables), missing env vars, wrong invariants. These are not optional — they are the rot a path-lookup misses.
- For discretionary net-new work (a full guide, an ADR), present the recommendation and let the user decide to write it now or defer — an explicit, evidence-backed call, never a blanket "skip".

**For ADRs:** the next number is one greater than the highest existing — `ls docs/adr/0*.md | tail -1` shows the current max. Filename format is `NNNN-<kebab-title>.md` with `NNNN` zero-padded to 4 digits. After writing the ADR, append it to the index table in `docs/adr/README.md`.

Do not silently commit doc edits — show the user the diff of any docs touched in this step before bundling them into the commit in step 5.

### 5. Handle uncommitted changes

Run `git status` to check for unstaged or uncommitted work.

**If the working tree is clean:** skip to step 6.

**If there are changes** (including any formatting changes from step 2):

1. Show the user a summary: which files are modified, added, or deleted.
2. Run `git diff --stat` so they can see the scope at a glance.
3. Ask the user whether to:
   - **Commit everything** — stage all changes and commit with a message the user provides or approves.
   - **Commit selectively** — let the user specify which files to include.
   - **Discard** — if the user says some changes are throwaway.

Do not silently commit changes the user hasn't seen. The only exception is formatting-only changes from step 2 — mention them but don't require detailed review (e.g., "Prettier reformatted 3 files — I'll include those in the commit").

When committing, use **Conventional Commits** format: `<type>(<scope>): <description>`. The commit-msg hook will validate this automatically. Common types: `feat`, `fix`, `chore`, `refactor`, `docs`. Scope should be the package directory name (e.g., `agent-sdk`, `db`, `ui`) or a meta-scope (`ci`, `deps`, `repo`). Example: `feat(ui): add dialog component`.

If the pre-commit hook fails (lint-staged finds unfixable lint errors), read the error output, fix the issue, re-stage, and retry the commit. Do not use `--no-verify` to bypass hooks.

### 6. Push to remote

Push the branch to the remote:

```bash
git push -u origin <branch-name>
```

If the branch already tracks a remote and is up to date, a regular `git push` suffices. Since step 1 uses merge (not rebase), no force-push is needed — the merge commit is additive on top of existing history.

> **Note:** The pre-push hook runs `pnpm turbo run typecheck --filter='...[origin/main]'`. If it fails, fix the type error before retrying. Do not use `git push --no-verify` to bypass hooks.

### 7. Resolve the PR label

The PR should carry a user-specific label so team members can easily filter PRs by author. Derive it dynamically:

1. Get the GitHub username: `gh api user --jq '.login'`
2. Construct the label: `<username>-hitl` (e.g. `joao-tail-hitl`)
3. Check if the label exists: `gh label list --search "<label>"`
4. If it doesn't exist, create it: `gh label create "<label>" --color "0E8A16"`

### 8. Open the pull request

Derive the PR title from the branch name or the most descriptive recent commit. Keep it under 70 characters and in imperative mood (e.g., "Add WorkOS auth middleware and per-package env setup").

Create the PR using a HEREDOC for the body, and include the `--label` flag:

```bash
gh pr create --title "<title>" --label "<username>-hitl" --body "$(cat <<'EOF'
## Summary

<2-3 bullet points describing what this PR does and why>

## Test plan

- [x] Lint passes (`pnpm lint`)
- [x] Typecheck passes (`pnpm typecheck`)
- [x] All tests pass (`pnpm test`)
- [x] Build succeeds (`pnpm build`)
- [ ] Manual verification of <describe what to check>
EOF
)"
```

If the branch is associated with specific GitHub issues (mentioned in commit messages or branch name), add a `## Related issues` section before the test plan:

```markdown
## Related issues

Closes #<number>
```

### 9. Report back

Display the PR URL to the user. Done.

## Edge cases

- **No commits on branch yet:** Warn the user that there's nothing to PR and stop.
- **Branch is `main`:** Refuse to open a PR from main to main. Ask the user to create a feature branch first.
- **CI check takes too long:** If `pnpm build` or `pnpm test` hangs for more than 5 minutes, notify the user rather than waiting silently.
- **Multiple unrelated changes:** If `git log` shows the branch has commits touching very different areas with no clear theme, suggest the user consider splitting into multiple PRs — but proceed if they say it's fine.
- **Untracked files:** When stashing before merge, use `--include-untracked` so new files aren't left behind. When checking for uncommitted changes in step 5, also check for untracked files with `git status`.
