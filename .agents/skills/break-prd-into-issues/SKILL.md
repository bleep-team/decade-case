---
name: break-prd-into-issues
description: Break a PRD into independently-grabbable GitHub issues using tracer-bullet vertical slices, labeled for autonomous agent tracking. Use when user wants to convert a PRD to issues, create implementation tickets, or break down a PRD into work items.
---

# Break PRD into Issues

Break a PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD

Ask the user for the PRD GitHub issue number (or URL).

If the PRD is not already in your context window, fetch it with `gh issue view <number>` (with comments).

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

**Always include an automated end-to-end test slice unless the PRD is purely UI polish, docs, or cleanup with no runtime/integration behavior to verify.** This slice is an AFK issue (not a substitute for the manual demo-bar sign-off in step 6) and is what ratchets the runtime/integration coverage into CI on every future PR. It pairs with — does not replace — the manual walkthrough. Canonical examples: #163 (Workflow v1.2), #184 (HITL v1), #143 (Triggers v1.1). If the PRD's `## Testing Decisions` section explicitly says no automated E2E is warranted and justifies why, honor that and omit the slice.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Pre-bake schema changes (DB-touching PRDs only)

If the approved slice breakdown introduces new tables, columns, or any other change under `packages/db/drizzle/**`, **author the schema on this branch yourself before filing any issues**. Sandcastle agents have no DATABASE_URL and run tests against a fresh in-process harness — they cannot detect drift between the migration journal and a long-lived dev database, and have repeatedly broken the shared dev Neon branch by regenerating `meta/_journal.json` with synthetic `when` timestamps. The migration ledger and the dev DB only stay in lockstep when the same human-driven `db:generate` call produces both at the same instant.

Workflow:

1. Author the Drizzle schema additions in `packages/db/src/*.ts`. Decide column names, FKs, indexes, RLS policies — these are load-bearing product calls and belong to the human author.
2. Run `pnpm --filter @decade/db db:generate`. This invokes drizzle-kit, which writes a new `00NN_<slug>.sql` file under `packages/db/drizzle/` and appends a single new entry to `meta/_journal.json` with an authentic `when` timestamp. Do **not** edit either file by hand.
3. Inspect the generated SQL. If it looks wrong (drizzle-kit can over-eagerly DROP/RECREATE on certain renames), rework the schema TypeScript and re-generate. Discard partial outputs cleanly with `git checkout -- packages/db/drizzle/`.
4. Add RLS policies / triggers / seed data to the new migration by hand-editing the new `.sql` file only.
5. Commit the schema TypeScript + generated migration + journal append in a single commit on the working branch. Suggested message: `db(repo): schema baseline for PRD #<n> — <noun>` (e.g. `db(repo): schema baseline for PRD #299 — attachments`).
6. Tell the user, in one short line: **"Run `pnpm --filter @decade/db db:migrate` to apply the new migration to your dev Neon branch."** Wait for them to confirm success before moving on. If migrate fails, debug together — do not file issues against a half-applied schema.

After the human has applied the migration to their dev branch:

- Reframe any "DB foundation" slice so its acceptance criteria implement the **repo + runtime + tests against the now-existing schema**, not "author the schema." For example, instead of "create the `attachments` table with RLS and FK columns X/Y," the AC becomes "implement `createDbAttachmentsRepo` against the existing `attachments` table; RLS isolation test against tenant A/B is green."
- Add this rule as a slice AC on every DB-touching slice: **"This slice must NOT modify `packages/db/drizzle/**`or the Drizzle schema TypeScript. The schema is already authored on the working branch."** The journal-immutability test in`@decade/db` enforces it; this AC keeps it visible in the issue body for the implementer agent.

### 6. Create the GitHub issues

Before creating issues:

- Resolve the GitHub username by running `gh api user --jq '.login'`
- Create the labels if missing: `gh label create "<username>-afk" --force`, `gh label create "type:slice" --color 0E8A16 --description "Implementation slice of a PRD" --force`, and `gh label create "type:e2e" --color FBCA04 --description "Automated end-to-end test slice" --force`
- Apply the label to the parent PRD issue: `gh issue edit <prd-number> --add-label "<username>-afk"`
- Pass `--label "<username>-afk"` to each `gh issue create` command below, **plus** a type label: `type:e2e` on the automated end-to-end test slice, `type:slice` on every other slice.

**Slice title (required grammar):** `<Feature>: <slice scope>` — the same `<Feature>` prefix on every slice of the PRD so the family groups together (e.g. `Slack integration: events webhook + identity resolver`, `Slack integration: automated end-to-end test slice`). No `[N/M]` numbering (it rots when slices are split/merged). Under ~100 chars.

For each approved slice, create a GitHub issue using `gh issue create`. Use the issue body template below.

Create issues in dependency order (blockers first) so you can reference real issue numbers in the "Blocked by" field.

<issue-template>
## Parent PRD

#<prd-issue-number>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number> (if any)

Or "None - can start immediately" if no blockers.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

Do NOT close or modify the parent PRD issue.

**Hard rule on acceptance criteria for AFK slices.** Every AC on an AFK slice MUST be auto-verifiable by sandcastle within a single iteration. The Merger's policy is: any unchecked `- [ ]` keeps the issue open. Sandcastle has no way to tick boxes it can't programmatically verify. If even one such AC sneaks in, the slice can never close, sandcastle re-picks it every iteration forever, and every child slice that depends on it never runs — wedging the whole queue.

#### What sandcastle's container can actually do

The sandcastle image is `node:22-bookworm` with **only** these tools installed: `git`, `curl`, `jq`, `gh`, `pnpm`, and the Claude Code CLI. That defines a hard ceiling on what's auto-verifiable. Always re-read `.sandcastle/Dockerfile` before treating something as "verifiable" — capabilities listed here become wrong if the image gains or loses tools.

✅ **Verifiable inside the container**

- `pnpm install` succeeds; lockfile is consistent.
- `pnpm lint`, `pnpm typecheck` are green.
- `pnpm test` — every flavor of test the repo already runs in CI works here too:
  - Unit tests (vitest in Node) — pure logic, state machines, reducers, parsers.
  - Integration tests that drive multiple modules together as long as they don't reach out of the process. Test against the public interface, mock only at system boundaries (external APIs, real vendor SDKs).
  - DB tests that use the repo's existing test harness (in-memory / pglite / whatever the package already wires up). They don't need a live Postgres because the harness doesn't.
  - Route / handler tests that exercise Next.js route handlers in-process with mocked auth + mocked downstream services.
  - Inngest function tests using `@inngest/testing` (or equivalent in-process driver) with stubbed adapters.
- `pnpm build` — Next.js compilation, package tsup builds. Build success only, not runtime behavior.
- `pnpm -w run i18n:check` and similar static checks on translation parity / file shape.
- `gh` operations (reading other issues, leaving comments, closing).
- Any assertion an agent can derive from reading the diff: "file `X` exists," "export `Y` is declared," "table `Z` has column `W`," "the type signature matches `…`."

The principle: **if it runs as part of `pnpm test` in CI on `main`, it runs in sandcastle.** Tests are the primary way ACs get ticked. Write more of them, not fewer.

❌ **NOT verifiable inside the container** (move these to the demo-bar issue)

- Anything that requires a **real browser**: Playwright with Chromium is not installed in the image, and the existing CI E2E pipeline runs outside sandcastle. An AC of the form "a browser navigates to X and clicks Y" can only be ticked by demo-bar (or by adding a real E2E run to the image — out of scope for normal PRDs).
- Anything that requires a **running Next.js dev server**, a live Inngest dev server with the cloud/realtime UI, realtime channels firing through a real WebSocket round-trip, or any out-of-process orchestration. In-process tests are fine; cross-process choreography is not.
- Anything that requires **real third-party credentials** — Vercel Blob, Extend.ai, Composio, WorkOS, Anthropic. Even when keys are present in `.sandcastle/.env`, ACs must mock at the adapter boundary, never hit real vendors. Reason: cost, rate limits, side effects on shared accounts, non-determinism.
- Anything that requires **a deployed environment**: Vercel preview, staging tenant, production data, DNS, OAuth callback registration.
- Anything that requires **human perception**: visual identity, color/spacing/density "feels native," "the chip animates smoothly," "the copy reads warmly," "dark mode looks right."
- Anything that requires **a real-time observation by a human**: "the chip flips from parsing to ready without refresh," "the badge updates live," "the toast appears." A unit test can assert the publish/subscribe contract; the "looks right live" judgement is demo-bar.
- Anything that requires **the locale matrix to be visually inspected** — `i18n:check` proves key parity exists; it does NOT prove rendered pt-BR strings look right.

#### Forbidden phrasings on AFK slices

Move every one of these to the demo-bar issue, never duplicate:

- "End-to-end demoable" / "demo bar verified" / "walkthrough verified."
- "Human verifies …" / "Manually confirm …" / "Sign-off in a comment."
- "On a deployed environment …" / "On a live tenant …" / "With real `<VENDOR>` credentials …"
- "Watch the chip flip / the badge update / the button animate" — anything that needs eyes on a running app.
- "Verified on /en light, /en dark, /pt-br light, /pt-br dark" — that lives on demo-bar.
- "Visual identity matches the rest of the dashboard" — that lives on demo-bar.
- "Realtime updates without page refresh" — sandcastle can test the publish/subscribe contract via unit tests, but the "without refresh" observation is demo-bar.

HITL slices are a different category: they may carry manual ACs because they exist for human decisions / reviews and are not handed to sandcastle. The hard rule applies to **AFK** slices specifically.

#### Pre-filing checklist (run on every AC of every AFK slice)

1. Does it require any tool the sandcastle container does NOT have (Chromium, Postgres, Docker daemon, dev server, vendor SDK with live creds)?
2. Does it require a human eye, a running app, or "verified on a deployed env"?
3. Does the slice commit a test or code shape that makes the AC true via `pnpm lint` / `typecheck` / `test` / `build`?

If (1) or (2) is "yes," or (3) is "no," that AC belongs on the demo-bar issue and must be **removed** from the slice — not paraphrased to sound auto-verifiable, removed.

#### Decomposition technique

When an AC sounds manual, don't reject it — **decompose** it. Most "the feature works end-to-end" intents fan out into 3–6 smaller, individually testable claims about specific code paths.

Ask, in order:

1. **What code paths execute when a human does this?** List them: route handler → repo write → Inngest event → adapter call → repo read → realtime publish.
2. **Which of those paths can be exercised in-process?** Almost all of them can, with mocks at the system boundary (vendor SDK, network, time, randomness).
3. **What observable does each path produce?** A return value, a row written, an event emitted, a function called with specific args, a publish payload.
4. **Write one AC per observable.** Each becomes a `- [ ]` backed by a vitest test.

You almost always end up with more ACs than the original draft, each one smaller and individually provable. That's correct. Prefer ten small, provable ACs over two big "demoable" ones.

#### Worked examples — rewriting demo-bar-style ACs into AFK ACs

In every pair below, the **bad** version is what tripped sandcastle on PRD #299. The **good** rewrites decompose the same intent into things `pnpm test` can prove. Canonical existing examples in the repo are named so the implementer agent has a real precedent to imitate.

**Example 1 — End-to-end demoable**

❌ "End-to-end demoable: create a task with a small PDF attached, see the chip parse and turn green, click it, read the markdown, watch the agent run with that content."

✅ Decomposed into observable code paths:

- The new-task form's submit action persists an `attachments` row tied to the first user message, asserted by a test that calls the server action with a mocked Blob client and reads back via the repo.
- The Inngest `attachment-parse` function transitions an attachment row through `uploading → parsing → ready` against a stubbed Extend adapter, asserted by an in-process Inngest function test (pattern: `agent-schedule-tick.test.ts`).
- The function emits `task.turn.attachments.ready` once the last pending attachment on a turn flips to `ready`, asserted by the same test.
- The `agent-task-runner` does not invoke the model when there is at least one non-`ready` attachment on the latest user turn, asserted by a runner test with a stubbed model adapter.

**Example 2 — Realtime status updates without page refresh**

❌ "Chip flips from `parsing` to `ready` in place without a refresh."

✅ Two halves, each testable:

- Server side: when the parse function transitions an attachment to `ready`, it calls `publishToTaskChannel` with an `attachment_status` envelope containing the attachment id and new status. Asserted by a unit test on the parse function with a spy on the publish helper.
- Client side: the chat state reducer, given an existing `parsing` chip and an inbound `attachment_status` envelope, returns state with the chip's status set to `ready`. Asserted by a state-machine test (pattern: `task-chat-state.test.ts`, `inbox-state.test.ts`).

The "without page refresh" judgement belongs on demo-bar — both halves above provably wire up the contract.

**Example 3 — Tenant isolation**

❌ "Tenant A cannot read tenant B's attachments."

✅ Three concrete shapes:

- The `attachments` repo's RLS test: opening a `withMembershipDb` session for tenant A returns zero rows for an attachment seeded under tenant B. Pattern: existing `tasks-repo.test.ts` RLS tests.
- The `GET /api/attachments/[id]/original` route returns 404 when called by a user with no membership on the attachment's tenant, 200 when called by a user with membership. Pattern: existing `route.test.ts` files (now including `attachments/[id]/original/route.test.ts`).
- The `handleUpload` callback rejects a put-URL request whose target pathname's tenant prefix does not match the requesting user's tenant, asserted by a unit test on the callback handler.

**Example 4 — Vendor integration works**

❌ "Extend.ai parses a real PDF and returns markdown."

✅ Mock at the adapter boundary; assert on the contract, not the vendor:

- The `AttachmentAdapter` fake adapter, given canned `extend.poll` responses representing the success path, drives the runtime through `parsing → ready` and persists the returned markdown on the row. Asserted by unit tests on `@decade/attachments-runtime`.
- The Extend adapter implementation, given a stubbed HTTP client returning a canned Extend response shape, emits a `Ready` status event with the parsed markdown. Asserted by an adapter unit test.
- Composition: the Inngest parse function, given the real adapter wired against the stubbed HTTP client, drives a fixture row to `ready`.

"It actually calls Extend.ai" is demo-bar.

**Example 5 — Failure handling (retry / replace / remove)**

❌ "Failed chip exposes Retry / Replace / Remove and they all work."

✅ Per code path:

- The chip component, given an attachment in `failed` state, renders three action buttons with the expected aria-labels and `data-testid` values. Asserted via a React Testing Library unit test.
- Retry: the action handler re-enqueues `attachment.parse.requested` for the same row, asserted by a unit test that spies on the Inngest send helper.
- Replace: the action handler creates a new attachment row, marks the old one as superseded, and triggers an upload + parse for the new bytes. Asserted by a server-action test reading rows back via the repo.
- Remove: the action handler deletes the attachment row; the turn-ready predicate flips from `false` to `true` when the last failed row is removed. Asserted by a runtime unit test on the predicate.
- Agent gate: when at least one chip on a turn is `failed`, the runner does not invoke the model. Asserted by the same runner test from Example 1.

**Example 6 — i18n / locale matrix**

❌ "Localized strings on every attachments surface look correct in pt-BR (no English fallbacks visible)."

✅ The look-correct part is demo-bar, but two structural claims are AFK-verifiable:

- `pnpm -w run i18n:check` passes — every key used in the new attachments surfaces exists in both `en.json` and `pt-br.json`. This is what the existing `inbox-pt-br.test.ts` / `agents-tasks-pt-br.test.ts` pattern proves.
- New surface unit tests render with `<NextIntlClientProvider>` wrapping the `pt-br` message bundle and assert that user-visible strings come from the bundle, not the English fallback. Pattern: existing pt-br tests render the page with a pt-br messages prop and assert against Portuguese strings.

**Example 7 — Visual identity matches the dashboard**

❌ "Visual identity sweep verified against an existing dashboard page (e.g. `/agents`) — the attachments surfaces feel native, not bolted on."

✅ Almost entirely demo-bar, but a handful of structural claims are AFK-verifiable:

- New components import shadcn primitives from `@decade/ui/components/*` and not hand-rolled equivalents. Asserted by a snapshot test or a grep-based static check committed alongside.
- New components use `lucide-react` icons (no other icon library introduced). Asserted by a static check on imports.
- No new Tailwind color tokens introduced — diff scan of `tailwind.config.ts`. Asserted by checking the config file isn't modified by the slice (or only modified in approved ways).

The "feels native" judgement is demo-bar.

#### When in doubt

If you cannot articulate a concrete test or code-shape check that proves an AC true in a single `pnpm test` run inside the sandcastle container, the AC belongs on the demo-bar issue. Don't paraphrase. Don't add a "manual verification" caveat. Don't promise the implementer agent "it'll figure out how to verify." Move it.

### 7. Create the demo-bar sign-off issue

Every PRD lands behind a manual sign-off by the user. The demo-bar issue is the gate: it lists the human-verifiable acceptance criteria and stays open until the PR that closes the PRD is merged. Canonical example: #185 on PRD #176.

**Title (required grammar):** `<Feature>: Demo bar walkthrough (sign-off)` — same `<Feature>` prefix as the slices so it groups with its family.

**Label resolution.** The demo-bar issue is human-in-the-loop work, not autonomous, so it carries a _different_ author label than the slices, plus its type label:

1. Construct the HITL label: `<username>-hitl` (reuses the username from step 5).
2. Create it if missing: `gh label create "<username>-hitl" --color "FBCA04" --force` (yellow, distinct from `-afk` green so the inbox is visually separable).
3. Create the type label if missing: `gh label create "type:demo-bar" --color 5319E7 --description "Demo-bar manual sign-off issue" --force`.
4. Pass **both** `--label "<username>-hitl"` and `--label "type:demo-bar"` to the `gh issue create` command.

**Body.** Use the template below. Pull the manual steps from the PRD's `## Solution` and `## Further Notes` → "Demo bar" sections, or from the PRD body's narrative if those sections aren't present.

<demo-bar-template>

```markdown
## Parent PRD

#<prd-issue-number>

## What to build

A manual end-to-end walkthrough of the demo bar described in the PRD, performed by a human on a freshly provisioned tenant. Acts as the "<feature> is shippable" acceptance gate. No code lands in this issue; output is sign-off in a comment.

Scope (per the PRD's Demo bar section):

- <step 1: literal action, real values where the PRD names them>
- <step 2>
- <…>
- <verify the happy path>
- <verify each named edge / cancellation / timeout / error path the PRD calls out>
- <verify the locale and theme matrix the PRD requires — typically /en and /pt-br × light/dark>

## Acceptance criteria

- [ ] Happy path verified end-to-end on /en light, /en dark, /pt-br light, /pt-br dark
- [ ] <edge / rejection / cancellation / timeout path 1> verified
- [ ] <edge path 2> verified
- [ ] <any badge / live-update / Realtime behavior> verified without page refresh
- [ ] Localized strings on every <feature> surface look correct in pt-BR (no English fallbacks visible)
- [ ] Sign-off comment added to this issue once all of the above are verified

## Blocked by

- Blocked by #<every-slice-issue-from-step-5>

## User stories addressed

- Demo bar verification (manual, human sign-off)
```

</demo-bar-template>

**Title format:** `"<short feature name>: Demo bar manual walkthrough (sign-off)"` — keep under 80 characters. Example: `"HITL v1: Demo bar manual walkthrough (HITL sign-off)"`.

**Create the issue:**

```bash
gh issue create \
  --title "<feature>: Demo bar manual walkthrough (sign-off)" \
  --label "<username>-hitl" \
  --body-file <temp-file>
```

The demo-bar issue does NOT get the `<username>-afk` label — sandcastle should not try to pick it up.

### 8. Surface pre-sandcastle setup needs

Before the user kicks off sandcastle, anything that requires _external_ setup must be visible. Scan the newly created slice issues (titles + bodies) for anything that implies a human action outside the repo:

| If you see in an issue                                          | Surface it as                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| New Composio integration / connection / tool                    | "Provision a Composio connection for `<integration>` and confirm it's reachable" |
| New environment variable                                        | "Add `<VAR_NAME>` to `.env.local` and to `.sandcastle/.env`"                     |
| New OAuth callback URL                                          | "Register the callback URL `<url>` in the provider's dashboard"                  |
| New webhook target                                              | "Create the webhook in the provider's dashboard pointing at `<endpoint>`"        |
| Seeded data (a workflow template, a sample row, a fixture file) | "Run `<seed command>` or import `<file>` before kicking off sandcastle"          |
| New external account or paid service                            | "Sign up for `<service>` and capture the API key into `.env`"                    |
| Anything referencing a new package, runtime, or system service  | "Install `<thing>` locally if it isn't already"                                  |

Emit the checklist conversationally — no artifact, just stdout. Use this exact frame:

> **Pre-sandcastle setup**
>
> Before you kick off sandcastle, do these by hand:
>
> 1. <item one>
> 2. <item two>
> 3. <…>
>
> When that's done, run sandcastle in another terminal. The slice issues are labeled `<username>-afk` and the demo-bar issue (`<username>-hitl`) is excluded.

If there is nothing to set up, say so explicitly:

> **Pre-sandcastle setup:** nothing external is needed for this PRD. You can kick off sandcastle now.

## Next step

When sandcastle finishes the AFK slices, run `/walk-demo-bar` to shepherd the demo-bar sign-off. When sign-off is posted, run `/prd-to-pr <prd-number>` to ship — it will close both the PRD and the demo-bar issue on merge.
