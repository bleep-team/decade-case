---
name: create-prd
description: Create a PRD through user interview, codebase exploration, and module design, then submit as a labeled GitHub issue. Use when user wants to write a PRD, create a product requirements document, or plan a new feature.
---

This skill will be invoked when the user wants to create a PRD. You may skip steps if you don't consider them necessary.

1. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.

2. Explore the repo to verify their assertions and understand the current state of the codebase.

3. Interview the user relentlessly about every aspect of this plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

4. Sketch out the major modules you will need to build or modify to complete the implementation. Actively look for opportunities to extract deep modules that can be tested in isolation.

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

Check with the user that these modules match their expectations. Check with the user which modules they want tests written for.

5. Once you have a complete understanding of the problem and solution, use the template below to write the PRD. The PRD should be submitted as a GitHub issue.

Before creating the issue:

- **Title (required grammar):** `PRD: <Feature> — <one-line scope>`. The `PRD:` prefix is mandatory so the issue is filterable and unambiguous (e.g. `PRD: Slack integration — Slack as a first-class surface for creating and running Tasks`). Keep it under ~100 chars; no body content in the title.
- Resolve the GitHub username by running `gh api user --jq '.login'`
- Create the labels if missing: `gh label create "<username>-afk" --force` and `gh label create "type:prd" --color 1D76DB --description "Product Requirements Document (parent)" --force`
- Pass **both** `--label "<username>-afk"` and `--label "type:prd"` to the `gh issue create` command

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)
- **Whether the PRD will include a dedicated automated end-to-end test slice.** Default to yes for any PRD touching runtime, durable execution, or cross-package integration. Default to no for pure UI polish, docs, or cleanup. When no, state the reason explicitly so `/break-prd-into-issues` honors the omission. The automated E2E slice is in addition to (never a substitute for) the manual demo-bar sign-off issue.

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

## Next step

Once the PRD issue is created, run `/break-prd-into-issues <prd-number>` to slice it into implementation issues, a demo-bar sign-off issue, and a pre-sandcastle setup checklist. See `docs/guides/dev-process.md` for the full chain.
