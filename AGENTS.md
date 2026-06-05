# AGENTS.md — Issue Scout Agent

## Repo purpose
A GitHub Action that auto-investigates issues using AI (Vercel AI SDK) and posts technical plans.

## Quick commands
```sh
npm install
npm run type-check      # tsc --noEmit
npm run lint            # eslint src/**/*.ts
npm run lint:fix        # --fix variant
npm run test            # jest (all)
npm run test:unit       # jest tests/unit
npm run test:integration # jest tests/integration
npm run build           # tsc → dist/
```

**CI order** (must pass in this sequence): `type-check` → `lint` → `test:unit` → `test:integration` → `build`.

## Architecture
Clean Architecture (4 layers):

```
presentation/github-actions/index.ts   ← entrypoint, event router
application/use-cases/                  ← investigate-issue, handle-command
application/services/agent.service.ts   ← AI orchestration via generateText
domain/                                 ← entities, value-objects, enums
infrastructure/ai/                      ← provider-factory, tools, prompts
infrastructure/github/                  ← Octokit adapter
shared/config/                          ← Zod env validation
```

- Always `loadConfig()` at the top; missing env vars exit immediately.
- `IGitHubService` defined in `application/interfaces/`, implemented in `infrastructure/github/`.
- `AgentService` is NOT behind an interface — it's a concrete class instantiated directly.

## Key behaviors

### Event handling
- `issues: opened` → `InvestigateIssueUseCase.execute()` → posts plan, labels `scout-investigated`.
- `issue_comment: created` → `HandleCommandUseCase.execute()` if body starts with `/`.
- Commands: `/ask [question]`, `/update`, `/investigate [component]`.
- `/update` edits the original plan comment in-place (stored via `planCommentId`), posts confirmation + `plan-updated` label.
- All comments wrapped with `wrapPlan()` — header `🤖 Plan Técnico Generado por Issue Scout` + footer disclaimer.

### AI config (Zod-validated)
```ts
AI_PROVIDER     // 'openai' | 'anthropic' | 'custom'
AI_API_KEY      // required
AI_MODEL        // required
AI_BASE_URL     // optional, required for 'custom'
AI_TEMPERATURE  // default 0.3
AI_MAX_TOKENS   // default 2000
AI_MAX_ITERATIONS // default 10 (agent loop steps)
AI_TIMEOUT      // default 60s
```
- `custom` provider uses `createOpenAI` with the custom base URL (must be OpenAI-compatible).
- Tests inject fake env vars (`AI_API_KEY=sk-test-key`, etc.) — don't assume real keys.

### Code exploration tools (the AI agent uses these)
| Tool | Implementation | Notes |
|------|---------------|-------|
| `listDir` | `find <path> -maxdepth <N> -type f` via `execSync` | Synchronous shell call, defaults depth 2, max 100 results |
| `readFile` | `fs.readFileSync` | Head/tail truncation (default 50/20 lines) for large files |
| `searchCode` | `rg <pattern>` via `execSync` | Returns `path:line:content` |
| `getFileTree` | `find <path>` via `execSync` | Full tree of files |
| `gitDiff` | `git diff <base>..<head>` via `execSync` | |

All tools use **synchronous** `execSync`/`readFileSync` — no `fs/promises`.

### System prompt
- Written in Spanish (`src/infrastructure/ai/prompts/system-prompt.ts`).
- Response format: Analysis → Affected Files → Implementation Plan → Considerations → Next Step.
- Agent instructed to never invent files, verify with tools first.

## Testing
- **Jest** with `ts-jest`, config in `jest.config.ts`.
- Unit tests: `tests/unit/domain/` and `tests/unit/infrastructure/`.
- Integration tests: `tests/integration/` (mock GitHub via Octokit).
- Coverage thresholds: branches 55%, functions 65%, lines 65%, statements 65%.
- No `test:e2e` suite is run in CI.
- When adding a new tool, add unit tests in `tests/unit/infrastructure/`.

## Build & release
- `npm run build` compiles `src/` → `dist/` (CommonJS, ES2023 target).
- `action.yml` references `dist/index.js` as the Action entrypoint.
- CI uploads coverage to Codecov.
- Release workflow: push tag `v*` → build → `softprops/action-gh-release` with `dist/**` + `action.yml`.

## Spanish-English mix
Codebase is bilingual. Domain names, comments, strings are often in Spanish. Variable/function names in English. Keep this mix consistent.

## .env file
Copy `.env.example` → `.env`. Required vars: `AI_API_KEY`, `AI_MODEL`, `GITHUB_TOKEN`, `GITHUB_REPOSITORY_OWNER`, `GITHUB_REPOSITORY_NAME`.
