/**
 * Sandcastle host-state cleanup.
 *
 * Brings the host into a known-clean state before/after a run. Idempotent and
 * best-effort — every step swallows errors so a partial environment can't
 * block the rest of the cleanup.
 *
 * Removes:
 *   - any docker container whose name starts with `sandcastle-`
 *   - any git worktree under `.sandcastle/worktrees/sandcastle-issue-*`
 *   - any local branch matching `sandcastle/issue-*` (force-deleted, so this
 *     also takes out branches with un-merged commits — see plan §5 for the
 *     edge case where an implementer committed but the Merger died)
 *
 * Importable so `.sandcastle/run.ts` can call it pre-run; runnable as a CLI so
 * `pnpm sandcastle:clean` invokes the same logic standalone.
 */

import { execFileSync, execSync } from 'node:child_process'

const BRANCH_PREFIX = 'sandcastle/issue-'
const CONTAINER_PREFIX = 'sandcastle-'
const WORKTREE_DIR_PATTERN = /^sandcastle-issue-/

function tryExec(label: string, fn: () => void): void {
  try {
    fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`  ⚠ ${label}: ${msg.split('\n')[0]}`)
  }
}

function listSandcastleContainers(): string[] {
  try {
    const out = execFileSync('docker', ['ps', '-aq', '--filter', `name=^${CONTAINER_PREFIX}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function listSandcastleWorktrees(): { path: string; branch: string }[] {
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const entries: { path: string; branch: string }[] = []
    let current: { path?: string; branch?: string } = {}
    for (const line of out.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path && current.branch) {
          entries.push({ path: current.path, branch: current.branch })
        }
        current = { path: line.slice('worktree '.length).trim() }
      } else if (line.startsWith('branch ')) {
        current.branch = line
          .slice('branch '.length)
          .trim()
          .replace(/^refs\/heads\//, '')
      }
    }
    if (current.path && current.branch) {
      entries.push({ path: current.path, branch: current.branch })
    }
    return entries.filter((e) => e.branch.startsWith(BRANCH_PREFIX))
  } catch {
    return []
  }
}

function listSandcastleBranches(): string[] {
  try {
    const out = execFileSync(
      'git',
      ['for-each-ref', '--format=%(refname:short)', `refs/heads/${BRANCH_PREFIX}*`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function commitsAheadOfHead(branch: string): number {
  try {
    const out = execFileSync('git', ['rev-list', '--count', `HEAD..${branch}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return parseInt(out.trim(), 10) || 0
  } catch {
    return 0
  }
}

export async function cleanup(): Promise<void> {
  console.log('=== Sandcastle cleanup ===')

  // 1. Force-remove any sandcastle-* docker containers.
  const containers = listSandcastleContainers()
  if (containers.length > 0) {
    console.log(`Removing ${containers.length} sandcastle container(s)...`)
    for (const id of containers) {
      tryExec(`docker rm -f ${id}`, () => {
        execFileSync('docker', ['rm', '-f', id], { stdio: 'ignore' })
      })
    }
  } else {
    console.log('No sandcastle containers to remove.')
  }

  // 2. Remove sandcastle worktrees.
  const worktrees = listSandcastleWorktrees()
  if (worktrees.length > 0) {
    console.log(`Removing ${worktrees.length} sandcastle worktree(s)...`)
    for (const { path, branch } of worktrees) {
      tryExec(`git worktree remove --force ${path}`, () => {
        execFileSync('git', ['worktree', 'remove', '--force', path], { stdio: 'ignore' })
      })
      console.log(`  removed worktree: ${path} (branch ${branch})`)
    }
  } else {
    console.log('No sandcastle worktrees to remove.')
  }

  // 3. Delete sandcastle/issue-* branches. Force-delete (covers merged + unmerged uniformly).
  const branches = listSandcastleBranches()
  if (branches.length > 0) {
    console.log(`Deleting ${branches.length} sandcastle branch(es)...`)
    for (const branch of branches) {
      const ahead = commitsAheadOfHead(branch)
      if (ahead > 0) {
        console.log(`  ⚠ ${branch} had ${ahead} commit(s) not merged into HEAD — force-deleting`)
      } else {
        console.log(`  ${branch}`)
      }
      tryExec(`git branch -D ${branch}`, () => {
        execFileSync('git', ['branch', '-D', branch], { stdio: 'ignore' })
      })
    }
  } else {
    console.log('No sandcastle branches to delete.')
  }

  // 4. Prune any stale .git/worktrees/ admin entries that might survive step 2.
  tryExec('git worktree prune', () => {
    execSync('git worktree prune', { stdio: 'ignore' })
  })

  console.log('Cleanup complete.\n')
}

const isCli =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('/cleanup.ts') === true

if (isCli) {
  cleanup().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
