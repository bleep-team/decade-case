/** The public source repository for the exchange. */
export const REPO_URL = 'https://github.com/bleep-team/decade-case'

/** A file or directory in the repo on the default branch. */
export function repoPath(path: string): string {
  const clean = path.replace(/^\//, '')
  const kind = clean.includes('.') ? 'blob' : 'tree'
  return `${REPO_URL}/${kind}/main/${clean}`
}
