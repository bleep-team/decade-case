import * as sandcastle from '@ai-hero/sandcastle'
import { docker } from '@ai-hero/sandcastle/sandboxes/docker'

import { cleanup } from './cleanup.js'

const MAX_ITERATIONS = 10
const MAX_PARALLEL = 4

// Match the explicit tag from `pnpm sandcastle:build` so the image lookup
// doesn't fall back to deriving from the cwd basename (which breaks under
// Conductor workspaces where the folder name isn't the repo name).
const IMAGE_NAME = 'sandcastle:decade'

const opusHigh = sandcastle.claudeCode('claude-opus-4-7', { effort: 'high' })
const sonnetHigh = sandcastle.claudeCode('claude-sonnet-4-6', { effort: 'high' })

/**
 * Anthropic quota signal recogniser. Anthropic emits at least two distinct
 * quota messages today:
 *   - "You've hit your limit · resets <time>"  — standard quota exhausted
 *   - "You're out of extra usage · resets <time>" — standard + burst exhausted
 * Plus a few defensive variants for forward-compatibility (rate-limit
 * exhaustion, generic 429s). The "resets <time>" suffix is also a strong
 * Anthropic-specific signature, so we accept that as a fallback even if the
 * leading phrase changes.
 */
function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /hit your limit|out of (extra )?usage|usage limit|rate.?limit|too many requests|resets \d{1,2}:\d{2}\s*(am|pm)/i.test(
    msg,
  )
}

/**
 * Sentinel thrown to bail out of the iteration loop on quota. Caught by the
 * top-level handler, which exits 0 with a friendly message instead of a
 * stack trace — re-running `pnpm sandcastle` is the recovery path.
 */
class QuotaExceededError extends Error {
  constructor(public readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'QuotaExceededError'
  }
}

async function main(): Promise<void> {
  await cleanup()

  // Issues closed by the immediately-prior iteration's Merger. GitHub Issues
  // search has ~5–15 s eventual consistency; without this filter, the next
  // iteration's Planner re-picks them via `gh issue list --state open` and
  // we waste a full Implementer sandbox discovering the work is already done.
  let prevClosedNumbers = new Set<number>()

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`)

    // Phase 1: Plan — orchestrator agent analyzes issues and picks parallelizable work.
    // Pass `prevClosedNumbers` into the prompt so the Planner can treat issues
    // closed in the immediately-prior iteration as resolved blockers, even
    // when GitHub's search index still lists them as open. Without this, the
    // Planner sees a child as blocked by its just-closed parent and we waste
    // an entire iteration that should have unblocked the next wave.
    const recentlyClosed =
      prevClosedNumbers.size > 0
        ? [...prevClosedNumbers]
            .sort((a, b) => a - b)
            .map((n) => `- #${n}`)
            .join('\n')
        : '(none)'

    let plan: Awaited<ReturnType<typeof sandcastle.run>>
    try {
      plan = await sandcastle.run({
        sandbox: docker({ imageName: IMAGE_NAME }),
        name: 'Planner',
        agent: opusHigh,
        promptFile: './.sandcastle/plan-prompt.md',
        promptArgs: {
          RECENTLY_CLOSED: recentlyClosed,
        },
      })
    } catch (err) {
      if (isQuotaError(err)) throw new QuotaExceededError(err)
      throw err
    }

    // Take the LAST <plan> block, not the first. The Planner agent sometimes
    // emits a tentative plan, reasons about dependencies, then emits a
    // corrected plan — we want the corrected one. Without `matchAll` + last,
    // an agent that thought twice silently exits with "No issues to work on."
    const planMatches = [...plan.stdout.matchAll(/<plan>([\s\S]*?)<\/plan>/g)]
    if (planMatches.length === 0) {
      throw new Error('Orchestrator did not produce a <plan> tag.\n\n' + plan.stdout)
    }
    const lastPlanMatch = planMatches[planMatches.length - 1]!

    let { issues } = JSON.parse(lastPlanMatch[1]!) as {
      issues: { number: number; title: string; branch: string }[]
    }

    // Filter out issues we just closed in the previous iteration. They may
    // still appear in `gh issue list --state open` due to GH search-index lag.
    if (prevClosedNumbers.size > 0) {
      const filteredOut = issues.filter((i) => prevClosedNumbers.has(i.number))
      if (filteredOut.length > 0) {
        console.log(
          `Filtered ${filteredOut.length} freshly-closed issue(s) from plan: ${filteredOut
            .map((i) => '#' + i.number)
            .join(', ')}`,
        )
        console.log(
          '(GitHub Issues search index lag — closed in previous iteration but still appearing in --state open results)',
        )
      }
      issues = issues.filter((i) => !prevClosedNumbers.has(i.number))
    }
    prevClosedNumbers = new Set()

    if (issues.length === 0) {
      console.log('No issues to work on. Exiting.')
      break
    }

    console.log(`Planning complete. ${issues.length} issue(s) to work in parallel:`)
    for (const issue of issues) {
      console.log(`  #${issue.number}: ${issue.title} → ${issue.branch}`)
    }

    // Phase 2: Execute + Review — implement then review each branch, max 4 in parallel
    let running = 0
    const queue: (() => void)[] = []
    const acquire = () =>
      running < MAX_PARALLEL
        ? (running++, Promise.resolve())
        : new Promise<void>((resolve) => queue.push(resolve))
    const release = () => {
      running--
      const next = queue.shift()
      if (next) {
        running++
        next()
      }
    }

    const settled = await Promise.allSettled(
      issues.map(async (issue) => {
        await acquire()
        try {
          // copyToWorktree intentionally omitted: APFS clonefile (`cp -cR`)
          // preserves pnpm's hardlinks into the host's content-addressable
          // store, and Linux-platform `pnpm install` inside the container
          // mutates inodes the host shares — polluting the host node_modules
          // with linux-arm64 binaries. Letting the container do a cold install
          // (~30–60 s) keeps the host fully isolated.
          await using sandbox = await sandcastle.createSandbox({
            sandbox: docker({ imageName: IMAGE_NAME }),
            branch: issue.branch,
            hooks: {
              sandbox: {
                onSandboxReady: [{ command: 'pnpm install && pnpm run build' }],
              },
            },
          })

          const result = await sandbox.run({
            name: 'Implementer #' + issue.number,
            agent: opusHigh,
            promptFile: './.sandcastle/implement-prompt.md',
            promptArgs: {
              ISSUE_NUMBER: String(issue.number),
              ISSUE_TITLE: issue.title,
              BRANCH: issue.branch,
            },
          })

          if (result.commits.length > 0) {
            await sandbox.run({
              name: 'Reviewer #' + issue.number,
              agent: opusHigh,
              promptFile: './.sandcastle/review-prompt.md',
              promptArgs: {
                ISSUE_NUMBER: String(issue.number),
                ISSUE_TITLE: issue.title,
                BRANCH: issue.branch,
              },
            })
          }

          return result
        } finally {
          release()
        }
      }),
    )

    for (const [i, outcome] of settled.entries()) {
      if (outcome.status === 'rejected') {
        console.error(`  ✗ #${issues[i].number} (${issues[i].branch}) failed: ${outcome.reason}`)
      }
    }

    // If any implementer/reviewer hit quota, bail out — the next iteration's
    // Planner would just hit it too. Surfaces the friendly top-level message.
    const quotaFailure = settled.find(
      (outcome) => outcome.status === 'rejected' && isQuotaError(outcome.reason),
    )
    if (quotaFailure && quotaFailure.status === 'rejected') {
      throw new QuotaExceededError(quotaFailure.reason)
    }

    const completedIssues = settled
      .map((outcome, i) => ({ outcome, issue: issues[i] }))
      .filter(
        (
          entry,
        ): entry is {
          outcome: PromiseFulfilledResult<Awaited<ReturnType<typeof sandcastle.run>>>
          issue: (typeof issues)[number]
        } => entry.outcome.status === 'fulfilled' && entry.outcome.value.commits.length > 0,
      )
      .map((entry) => entry.issue)

    const completedBranches = completedIssues.map((i) => i.branch)

    console.log(`\nExecution complete. ${completedBranches.length} branch(es) with commits:`)
    for (const branch of completedBranches) {
      console.log(`  ${branch}`)
    }

    if (completedBranches.length === 0) {
      console.log('No commits produced. Nothing to merge.')
      continue
    }

    // Phase 3: Merge — one agent merges all branches together
    try {
      await sandcastle.run({
        sandbox: docker({ imageName: IMAGE_NAME }),
        name: 'Merger',
        maxIterations: 10,
        agent: sonnetHigh,
        promptFile: './.sandcastle/merge-prompt.md',
        promptArgs: {
          BRANCHES: completedBranches.map((b) => `- ${b}`).join('\n'),
          ISSUES: completedIssues.map((i) => `- #${i.number}: ${i.title}`).join('\n'),
        },
      })
    } catch (err) {
      if (isQuotaError(err)) throw new QuotaExceededError(err)
      throw err
    }

    console.log('\nBranches merged.')

    // Remember which issues this iteration's Merger just closed so the next
    // iteration's Planner can filter them out, even if GH's search index
    // hasn't propagated yet.
    prevClosedNumbers = new Set(completedIssues.map((i) => i.number))
  }

  console.log('\nAll done.')
}

main().catch((err: unknown) => {
  if (err instanceof QuotaExceededError || isQuotaError(err)) {
    console.log('\n=== Hit Claude usage quota ===')
    console.log('Re-run `pnpm sandcastle` after the quota window resets.')
    console.log('Branches, worktrees, and containers will be auto-cleaned on the next run.')
    process.exit(0)
  }
  console.error(err)
  process.exit(1)
})
