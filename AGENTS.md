# Project Instructions

## Project

Frontend of mfin.uz, a Didox-like signed-document SaaS.

- **Framework:** Vue 3
- **Language:** TypeScript
- **Application:** SPA
- **Build tool:** Vite
- **Runtime / package manager:** Bun
- **Routing:** vue-router 4
- **State management:** Pinia
- **Forms:** vee-validate + Zod
- **Internationalization:** vue-i18n
- **API client:** openapi-fetch

The backend is maintained in a SEPARATE repository using FastAPI. It replaces the previous Go API.

This repository is being migrated from the old Go backend contract to the new FastAPI backend contract.

### Core migration principle

**UI/UX must not change unless I explicitly request it.**

The scope of backend migration is the data and API integration layer.

- Preserve existing screens and layouts.
- Preserve component interfaces and expected data shapes.
- Preserve existing user workflows and interactions.
- Do not redesign, restyle, or restructure UI components as part of API migration.
- Absorb old/new API differences through repositories, adapters, and mappers.
- Do not introduce unrelated frontend refactoring.

---

## Session Start

At the beginning of every new session:

1. Read `.opencode/memory/PROJECT.md`.
2. Read `.opencode/memory/CURRENT_STATE.md`.
3. Read only relevant entries from `.opencode/memory/DECISIONS.md`.
4. Inspect the current Git branch, working tree, and existing changes.
5. For API migration tasks, read the relevant files from `.audit/`:
   - `new-backend-openapi.json` — canonical NEW backend contract.
   - `error-codes.md`
   - `frontend-contract-notes.md`
   - `api-endpoints.md`
   - `frontend-api-inventory.md`
   - `flows.md`
   - `migration-mapping.md`
   - `risks-and-plan.md`

6. Read only the audit documents relevant to the current task when possible. For a migration task affecting multiple endpoints or workflows, review the complete relevant audit set before implementation.

7. Read `TASK_LOG.md` only when historical context is necessary.

### Source of truth

- Repository source code and current Git state are authoritative for the current frontend implementation.
- `.audit/new-backend-openapi.json` is the canonical source of truth for the NEW backend API contract.
- Relevant `.audit/` documentation provides migration analysis and implementation context.
- Memory files provide context, not unquestionable facts.
- If memory conflicts with repository code or Git state, trust the repository for frontend implementation facts.
- If audit documents conflict with the canonical OpenAPI contract, report the discrepancy instead of guessing.
- Never silently resolve contradictory API contracts.

---

## Hard Rules

### Git and filesystem safety

- Never commit, push, or install packages unless I explicitly authorize it.
- I run Bun, TypeScript, lint, and test commands myself. Provide exact commands when necessary.
- Do not start the development server unless explicitly requested.
- Never stage files automatically unless I explicitly request a commit.
- When committing, stage the working tree AS IS using explicit file paths. Never use `git add -A` or `git add .`.
- Before committing, show `git diff --cached --stat` and wait for my explicit approval (`go`).
- Never revert, rewrite, or delete files to split commits.
- The following operations are forbidden without explicit approval:
  - `git reset`
  - `git checkout` or `git restore` over existing changes
  - `git clean`
  - `git stash drop` or `git stash pop`
  - `git rebase`
  - `git commit --amend`
  - `git branch -D`
  - Removing tracked files

### Branch safety

- All API migration work must be performed on branch `api-migration`.
- Never switch to `main` for migration work.
- Never create, delete, rename, or switch branches without explicit approval.
- At session start, verify the current branch.
- If the current branch is not `api-migration`, stop before modifying files and report the discrepancy.
- Never assume that the branch name alone proves the working tree is safe to modify.

### API contract safety

- Never guess the new backend API contract.
- `.audit/new-backend-openapi.json` is the canonical NEW backend contract.
- Do not invent:
  - Endpoints
  - HTTP methods
  - Request fields
  - Response fields
  - Query parameters
  - Headers
  - Authentication behavior
  - Pagination structures
  - Error codes
  - Validation behavior

- If required contract information is missing, mark it as `UNKNOWN` and ask me.
- Do not preserve old API assumptions without verifying them against the new contract.
- Do not treat frontend audit reports as a substitute for the actual OpenAPI contract.
- Never modify `.audit/` files. They are generated and maintained by me.

### Package and API verification

- Do not write third-party API usage from memory.
- Before using an unfamiliar third-party API:
  1. Inspect the installed package source in `node_modules`.
  2. Verify the actual API and types.
  3. Perform a small experiment when necessary.
  4. Follow established project conventions.
- Never install packages without explicit approval.
- Do not assume that documentation for another package version applies to the installed version.

### Testing and verification

- Never claim lint, TypeScript checks, or tests passed unless you actually executed the relevant commands.
- I normally run `bun`, `vue-tsc`, lint, and tests myself. Provide exact verification commands instead of executing them unless I explicitly authorize execution.
- Report every skipped test and explain why.
- Distinguish clearly between:
  - Executed and passed
  - Executed and failed
  - Skipped
  - Not executed
- Never report a skipped test as passed.
- Never trust previous reports without verification.
- Do not silently omit failed checks.

### Code changes

- Inspect existing implementations and reuse established project patterns.
- Keep changes scoped to the requested task.
- Avoid unnecessary abstractions, dependencies, refactoring, or architectural changes.
- Do not repeat completed work.
- Do not overwrite another session's in-progress changes.
- If ownership of a change is unclear, inspect and report before modifying it.

### Security and privacy

Never put the following information in memory files, reports, mocks, or commits:

- Secrets and credentials
- Access and refresh tokens
- Private keys
- `.env` contents
- Personal identifiable information

Never use real user data in fixtures, tests, or mock responses.

### Protected files

- Never stage or modify `AGENTS.md` unless explicitly authorized.
- Do not modify `.opencode/` except for the explicitly authorized project-memory operations described in the Handoff section.
- Never modify `.audit/`.
- Do not modify unrelated project instructions or generated audit files.

---

## Architecture Rules

### Feature architecture

The application uses feature slices with four layers:

1. `domain`
2. `application`
3. `infrastructure`
4. `presentation`

Layer boundaries are enforced by `eslint-plugin-boundaries`.

- Respect all existing import boundaries.
- Do not introduce cross-feature internal imports.
- Do not bypass architectural boundaries.
- Never add boundary exceptions or weaken existing rules without asking.
- Reuse established feature structures and naming conventions.

### HTTP and repository ownership

- All HTTP communication must live in `features/*/infrastructure/*Repository.ts`.
- HTTP repositories must be bound only in `src/app/di/container.ts`.
- Do not make HTTP requests directly from Vue components, composables, stores, domain code, or application services.
- Do not introduce raw `fetch`, XHR, or Axios usage in application code.
- Use the centralized API client:
  `src/shared/infrastructure/api/client.ts`

### Generated API types

The API generation pipeline is:

`openapi/openapi.json` → `bun run api:generate` → `src/shared/infrastructure/api/schema.ts`

Rules:

- Never edit `schema.ts` manually.
- Generated API types must remain inside the infrastructure layer.
- Domain and presentation layers must never import generated OpenAPI types.
- Repositories and mappers are responsible for translating API types into application/domain-facing structures.
- Do not expose generated API response types through public feature interfaces.
- Do not manually modify generated output to work around contract mismatches.

### Adapter and mapper principle

Existing UI components must continue receiving the same data shapes they receive today unless I explicitly request a UI contract change.

When old and new backend contracts differ:

1. Read the existing repository implementation.
2. Read the canonical new OpenAPI contract.
3. Identify the differences.
4. Implement the necessary adapter or mapper in the infrastructure layer.
5. Preserve existing application-facing and presentation-facing interfaces.
6. Update tests for the mapping behavior where appropriate.

Do not push backend-specific compatibility logic into Vue components.

### API client

- Use `src/shared/infrastructure/api/client.ts` as the centralized HTTP client.
- Respect its existing authentication, error handling, request configuration, and middleware patterns.
- Do not introduce a second API client.
- Do not bypass centralized request handling.

### OpenAPI generation

- `openapi/openapi.json` is the input to the generated client.
- `src/shared/infrastructure/api/schema.ts` is generated output.
- `bun run api:generate` is the generation command, but do not execute it without explicit authorization if it changes generated files.
- Never manually edit generated schema files.
- Verify generation scripts and their actual behavior in `package.json` before relying on them.

---

## New Backend Contract Rules

These are known migration facts. Verify them against `.audit/` before relying on them for implementation.

### Error handling

Standard backend error envelope:

`{"error": {"code", "message", "problems?"}}`

Request-validation errors may use FastAPI's:

`{"detail": [...]}`

Rules:

- Map machine-readable error codes to frontend i18n messages.
- Do not hardcode user-facing backend messages in components.
- Preserve the application's existing error presentation behavior.
- Do not assume every HTTP error uses the same response shape.
- Verify actual endpoint-specific error behavior against the contract and audit documents.

### Authentication

- Access tokens are kept in memory only.
- Refresh tokens are stored in an HttpOnly cookie.
- Requests requiring cookie authentication use `credentials: 'include'`.
- Refresh, logout, and switch-tenant operations require:
  `X-Requested-With: XMLHttpRequest`
- Never decode the JWT in frontend code.
- Use `expires_in` and `/identity/me` for authentication state and identity information.
- Never persist access tokens in localStorage, sessionStorage, or other persistent browser storage.
- Preserve the established centralized authentication flow.
- Verify the exact endpoint contracts before modifying authentication behavior.

### Idempotency

Mutating document operations require an `Idempotency-Key` header.

Known operations include:

- Create draft
- Send document
- Sign document

Rules:

- Verify the exact affected endpoints against `.audit/new-backend-openapi.json`.
- Generate and attach idempotency keys according to the backend contract.
- Do not reuse a key for unrelated operations.
- Do not introduce duplicate idempotency mechanisms.
- Preserve existing user interaction and retry behavior unless explicitly requested.

### Money

- Monetary values are decimal strings.
- Never convert monetary values to floating-point numbers for financial calculations.
- Preserve precision when parsing, mapping, formatting, or serializing money.
- Follow existing project-specific money utilities and types.

### Pagination

- New backend lists use cursor pagination.
- Verify exact cursor field names, response structures, and query parameters against OpenAPI.
- Do not assume offset pagination.
- Adapt backend pagination to existing UI expectations inside repositories or mappers.
- Preserve existing list component interfaces and user interactions.

### Workspace and tenant model

- The new backend uses tenants and `switch-tenant`.
- There is no `select-workspace` step in the new authentication flow.
- Verify the actual tenant-switching contract before implementation.
- Do not retain old workspace-selection assumptions without evidence.
- Preserve existing frontend-facing behavior where possible through the adapter layer.

---

## Tooling

### Checks

Use `package.json` as the source of truth for available scripts.

Inspect the actual scripts before suggesting or running commands.

Relevant checks include:

- TypeScript / Vue type checking (`vue-tsc`)
- ESLint
- Tests
- Build
- API generation

Do not invent script names.

At session start, check whether `CURRENT_STATE.md` records the current script names. If it does not, inspect `package.json` when tooling information is needed.

### Code lookup

- Use the codebase-memory MCP first when available.
- Verify codebase-memory findings against actual source using grep or equivalent repository inspection.
- Use fully qualified symbol names when symbols are ambiguous.
- Inspect existing repository, mapper, DI, client, and test patterns before implementation.

---

## Prompt and Report Format

### Language

- All replies to me must be in Turkish.
- Code, prompts, documentation, identifiers, and commit messages must be in English.

### Task structure

For substantial tasks, use:

1. TASK
2. OUT OF SCOPE
3. GLOBAL RULES
4. STEPS
5. TESTS
6. VERIFY
7. FINAL REPORT

Do not invent unnecessary scope or steps for small tasks.

### Final report

Every substantial task must finish with:

**(a) Files changed**
- List modified, created, and deleted files separately.

**(b) Experiments**
- Describe experiments actually performed.

**(c) Commands run**
- List commands actually executed and their results.

**(d) Deviations and unresolved items**
- Explain deviations, blockers, and unfinished work.

**(e) Decisions for me to review**
- List implementation or architectural decisions requiring my approval.
- Explicitly state when no decisions are pending.

**(f) Verification commands for me**
- Provide exact commands I should run for checks that were not executed.

Never report planned commands as executed commands.

---

## Handoff

Handoff preserves verified frontend implementation state and enables a new session to continue without relying on the previous conversation.

### Trigger Conditions

Perform a handoff when:

- I explicitly request `/handoff` or ask you to prepare a session handoff.
- The project-memory plugin explicitly requests a handoff.
- The session is ending and unfinished work or important context needs to be preserved.
- Context compaction is imminent and important working state is not yet persisted, provided the available plugin or lifecycle mechanism supports this trigger.

Do not create redundant handoffs when nothing meaningful has changed.

Do not assume that a Markdown instruction alone automatically detects session termination or context compaction. Automatic triggers require an actual OpenCode plugin or supported lifecycle hook.

### Required Steps

1. Verify all facts against:
   - Repository source code
   - Current Git branch and working-tree status
   - Actual diffs
   - Commands actually executed
   - Current session messages
   - Relevant audit documents, when migration work is involved

2. Inspect existing memory files and session handoffs before modifying them.

3. Update `.opencode/memory/CURRENT_STATE.md`:
   - Replace stale information.
   - Record verified frontend implementation state.
   - Include the current branch.
   - Record the actual API migration status.
   - Identify completed and pending migration areas.
   - Include concrete next steps.
   - Record verified tooling script names when relevant.
   - Keep it concise.
   - Separate repository facts from session-specific observations.
   - Never record assumptions as verified facts.

4. Append one concise entry to `TASK_LOG.md`:
   - Task summary
   - Important implementation results
   - Files or feature areas affected
   - Checks actually executed
   - Remaining work

5. Update `.opencode/memory/DECISIONS.md` only when a durable architectural or technical decision has actually been made and verified.

6. Create a new session handoff under:
   `.opencode/memory/sessions/`

7. Never overwrite an existing session handoff. Use a unique filename.

### Session Handoff Contents

Every handoff must contain:

- Task objective
- Current branch
- Current implementation status
- API migration scope
- Canonical OpenAPI contract areas examined
- Relevant audit documents examined
- Files modified, created, or deleted
- Important implementation details
- Repository patterns reused
- Commands actually executed and their results
- Type checks passed or failed
- Lint checks passed or failed
- Tests passed
- Tests failed
- Tests skipped and why
- Checks not executed
- Current Git status
- Uncommitted changes
- Unfinished work
- Known blockers
- UNKNOWN contract items requiring clarification
- Decisions requiring my approval
- Exact next steps for the next session

### Multi-Session Safety

- Never assume that the current session is the only active session.
- Inspect Git status, existing diffs, and session handoffs before updating memory.
- Preserve changes made by other sessions.
- Never overwrite another session's work or handoff.
- Never resolve conflicting changes automatically.
- If multiple sessions have conflicting modifications to shared memory files, stop and report the conflict.
- Keep `CURRENT_STATE.md` focused on verified repository state, not individual session assumptions.
- Session-specific progress belongs in the corresponding session handoff.
- Do not claim ownership of changes without evidence.

### Handoff Safety

- Never invent test results, command outputs, or migration status.
- Never claim unverified work is complete.
- Never include secrets, tokens, private keys, PII, or environment values.
- Never include real user data in memory, reports, or fixtures.
- Never commit, push, or stage files during handoff.
- Never modify `AGENTS.md`.
- Never modify `.audit/`.
- `.opencode/` modifications are permitted only for the explicitly listed project-memory files.
- Do not modify unrelated plugin configuration, skills, commands, or project instructions.
- If a required verification cannot be performed, explicitly record it as not verified.
- If the handoff cannot be completed safely, report the reason instead of forcing the operation.

### Handoff Completion

After completing the handoff:

- List all memory files modified.
- Identify the new session handoff filename.
- Summarize the verified current implementation state.
- State the current branch and Git status.
- Identify unresolved API contract questions.
- List unfinished work and blockers.
- Provide the next session's exact starting steps.

Do not claim that a handoff was saved unless the corresponding files were actually written and verified.
