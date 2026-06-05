# AGENTS.md — Issue Scout Agent

## What this is
GitHub Action (node20, `dist/index.js`) that auto-investigates issues using Vercel AI SDK + tools and posts technical plans.

## Commands
```sh
npm run type-check        # tsc --noEmit (required first)
npm run lint              # eslint src/**/*.ts (flat config, ESLint v9)
npm run lint:fix          # --fix variant
npm run test:unit         # jest tests/unit
npm run test:integration  # jest tests/integration
npm run test:e2e          # jest tests/e2e (NOT run in CI)
npm run build             # tsc --noEmit && esbuild → dist/index.js
```
**CI order**: `type-check` → `lint` → `test:unit` → `test:integration` → `build`.

## Quirks
- `package.json` has `"type": "module"` but tsconfig uses `module: "commonjs"` and esbuild bundles to CommonJS.
- `tsc` is type-check only (`--noEmit`); esbuild produces the actual build artifact.
- `tsconfig.test.json` (`extends: ./tsconfig.json`, adds jest/node types) is used by ts-jest.
- ESLint v9 flat config (`eslint.config.js`), not `.eslintrc*`.
- `loadConfig()` from `shared/config/environment.config.ts` calls `process.exit(1)` on invalid env.

## Architecture

```
presentation/github-actions/index.ts  ← entrypoint (event router)
application/use-cases/                ← InvestigateIssueUseCase, HandleCommandUseCase
application/services/agent.service.ts ← AI orchestration (generateText), NOT behind interface
domain/                               ← entities, value-objects, enums
infrastructure/ai/                    ← ProviderFactory (openai/anthropic/custom), 5 sync tools, Spanish prompt
infrastructure/github/                ← Octokit adapter (implements IGitHubService)
shared/config/                        ← Zod env validation
```

## Events
- `issues: opened` → `InvestigateIssueUseCase.execute()` → posts `wrapPlan()`-wrapped comment, labels `scout-investigated`.
- `issue_comment: created` with leading `/` → `HandleCommandUseCase.execute()`.
- Commands: `/ask [question]` (new reply), `/update` (edits original plan comment in-place), `/investigate [component]` (edits plan in-place).
- `/update` posts confirmation comment + `plan-updated` label.
- `planCommentId` is shared between use cases via `getLastPlanCommentId()`/`setPlanCommentId()`.
- Reactions: 👀 on trigger comment for `/update`/`/ask`/`/investigate`; 👀 on issue itself for new issues.

## Env config (Zod-validated, `shared/config/environment.config.ts`)
```
AI_PROVIDER=openai|anthropic|custom (default openai)
AI_API_KEY= required
AI_MODEL= required
AI_BASE_URL= optional, required for custom
AI_TEMPERATURE=0.3, AI_MAX_TOKENS=2000, AI_MAX_ITERATIONS=10, AI_TIMEOUT=60
GITHUB_TOKEN= required
GITHUB_REPOSITORY_OWNER= required
GITHUB_REPOSITORY_NAME= required
LOG_LEVEL=info|debug|warn|error
DEBUG_TOOLS=false       # logs each AI tool call at info level
DEBUG_PROMPTS=false     # dumps full AI response text
```
Tests inject fake env vars (`AI_API_KEY=sk-test-key`, `AI_PROVIDER=openai`, `AI_MODEL=gpt-4-turbo`) in `test.yml`.

## AI tools (all synchronous — `execSync`/`readFileSync`)
| Tool | Backend |
|------|--------|
| `listDir` | `find <path> -maxdepth <N> -type 2>/dev/null \| head -100` |
| `readFile` | `fs.readFileSync` (truncates head 50 / tail 20 for large files) |
| `searchCode` | `rg <pattern>` → `path:line:content` |
| `getFileTree` | `find <path>` → full tree |
| `gitDiff` | `git diff <base>..<head>` |

## Testing
- Unit tests: `tests/unit/domain/`, `tests/unit/infrastructure/`.
- Integration tests: `tests/integration/` (mock GitHub via Octokit).
- Coverage thresholds: branches 55%, functions 65%, lines 65%, statements 65%.
- No `test:e2e` in CI. When adding a tool, add unit tests in `tests/unit/infrastructure/`.

## Release
- Push to `main` triggers CI + Release. If tests pass: build → commit `dist/` with `[skip ci]` → auto-tag `v$(package.json version)` → `softprops/action-gh-release` with `dist/**` + `action.yml`.
- Manual: bump `package.json` version, commit, push.

## Style
- Spanish/English bilingual: strings/comments in Spanish, var/function names in English.
- System prompt in Spanish (`infrastructure/ai/prompts/system-prompt.ts`).
- Comments wrapped with `wrapPlan()` (private in `GitHubServiceAdapter`): header `🤖 Plan Técnico Generado por Issue Scout` + footer disclaimer.
