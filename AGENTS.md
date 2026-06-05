# AGENTS.md — Issue Scout Agent

## What this is
GitHub Action (`action.yml`, `runs.using: node24`) that auto-investigates issues using Vercel AI SDK + 5 sync tools and posts technical plans.

## Commands
```sh
npm run type-check         # tsc --noEmit
npm run lint               # eslint src/**/*.ts (flat config, ESLint v9)
npm run lint:fix
npm run test:unit          # jest tests/unit
npm run test:integration   # jest tests/integration
npm run test:e2e           # jest tests/e2e (NOT run in CI)
npm run build              # tsc --noEmit && esbuild → dist/index.cjs
```
**CI order** (`.github/workflows/test.yml`): `type-check` → `lint` → `test:unit` → `test:integration` → `build`.

## Quirks
- `package.json` has `"type": "module"` but `tsconfig.json` uses `module: "commonjs"` + `moduleResolution: "bundler"`. esbuild bundles to CommonJS.
- `tsc` is type-check only (`--noEmit`); esbuild produces `dist/index.cjs`. `action.yml` references `dist/index.cjs`.
- `tsconfig.test.json` (`extends: ./tsconfig.json`, adds jest/node types) used by ts-jest.
- ESLint v9 flat config (`eslint.config.js`) — no `.eslintrc*`.
- `loadConfig()` at `shared/config/environment.config.ts` uses Zod, receives Action input overrides (not raw `process.env`), calls `process.exit(1)` on invalid env.
- Workflows set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`.

## Architecture

```
presentation/github-actions/index.ts  ← entrypoint (event router)
application/use-cases/                ← InvestigateIssueUseCase, HandleCommandUseCase
application/services/agent.service.ts ← AI orchestration (generateText), NOT behind interface
domain/                               ← entities (Command), value-objects (IssueNumber), enums, errors
infrastructure/ai/                    ← ProviderFactory (openai/anthropic/deepseek/custom), 5 sync tools, Spanish prompts
infrastructure/github/                ← Octokit adapter (IGitHubService)
shared/config/                        ← Zod env validation (loadConfig acceps overrides from Action inputs)
shared/templates/                     ← Templates & Labels (PLAN, REPLY, ERROR, UPDATE_CONFIRM, INVESTIGATE_CONFIRM)
```

## Events
- `issues: opened` → `InvestigateIssueUseCase.execute()` → posts `PLAN`-wrapped comment, labels `scout-investigated`.
- `issue_comment: created` with leading `/` → `HandleCommandUseCase.execute()`.
- Commands (`src/domain/entities/command.entity.ts`): `/ask [question]` (new `REPLY`-wrapped comment), `/update` (edits original plan in-place), `/investigate [component]` (edits plan in-place).
- `/update` posts `UPDATE_CONFIRM` comment + `plan-updated` label.
- Plan comments found by searching for `<!-- scout:plan -->` marker (HTML comment).
- Reactions: 👀 on trigger comment for commands; 👀 on issue for new issues.

## Env config (Zod-validated, `shared/config/environment.config.ts`)
```
AI_PROVIDER=openai|anthropic|deepseek|custom (default openai)
AI_API_KEY= required
AI_MODEL= required
AI_BASE_URL= optional, required for custom
AI_TEMPERATURE=0.3, AI_MAX_TOKENS=2000, AI_MAX_ITERATIONS=10, AI_TIMEOUT=60
GITHUB_TOKEN= required
GITHUB_REPOSITORY_OWNER= required
GITHUB_REPOSITORY_NAME= required
LOG_LEVEL=info|debug|warn|error
DEBUG_TOOLS=false       # logs each AI tool call at info level
DEBUG_PROMPTS=false     # dumps full AI response text at debug level
```
Tests inject env vars from `test.yml`: `AI_API_KEY=sk-test-key`, `AI_PROVIDER=openai`, `AI_MODEL=gpt-4-turbo`.

## AI tools (sync — `execSync`/`readFileSync`)
| Tool          | Backend                                                               |
| ------------- | --------------------------------------------------------------------- |
| `listDir`     | `find <path> -maxdepth <N> -type f 2>/dev/null \| head -100`          |
| `readFile`    | `fs.readFileSync` (head 50 / tail 20 truncation for large files)      |
| `searchCode`  | `grep -rl <includeFlags> <query> <path> \| head -<N>` (wraps `rg`-like but uses grep) |
| `getFileTree` | `find . -maxdepth <N> -type f -name <pattern> \| head -<N>`           |
| `gitDiff`     | `git diff <base>...<head> \| head -<N>`                               |

## IGitHubService (`application/interfaces/github-service.interface.ts`)
- Methods: `createComment`, `updateComment`, `replyToComment`, `reactToIssue`, `reactToComment`, `addLabel`, `removeLabel`, `getIssue`, `getIssueComments`.
- `createComment`/`updateComment` wrap body with `Templates.PLAN.build()` (header + footer).
- `replyToComment` wraps with `Templates.REPLY.build()` — **known bug**: passes `commentId` as `issue_number` to Octokit.
- All methods use try/catch with warn-level logs on failure.

## Templates (`shared/templates/scout-templates.ts`)
- `PLAN` (`<!-- scout:plan -->`): header `🤖 Plan Técnico Generado por Issue Scout` + footer disclaimer
- `REPLY` (`<!-- scout:reply -->`): header `🤖 Respuesta de Issue Scout`
- `ERROR_INVESTIGATION` / `ERROR_COMMAND`: error report templates
- `UPDATE_CONFIRM` / `INVESTIGATE_CONFIRM`: success confirmation templates
- Labels: `scout-investigated`, `plan-updated`

## Style
- Bilingual: strings/comments in Spanish, var/function names in English.
- System prompt in Spanish (`infrastructure/ai/prompts/system-prompt.ts`).
- Investigation and command prompts also in Spanish.

## Release
- Push to `main` triggers CI → if tests pass: build → commit `dist/` with `[skip ci]` → auto-tag `v$(package.json version)` → `softprops/action-gh-release@v2` with `dist/**` + `action.yml`.
- Also creates/updates major version tag (e.g., `v1` → `v1.4.0`).
- Manual: bump `package.json` version, commit, push.

## ALWAYS DO
- Run `type-check` → `lint` → `test:unit` → `test:integration` → `build` after any change.
- Never modify `dist/` directly; the release workflow handles it.
- No `.cursorrules`, `opencode.json`, or `copilot-instructions.md` exist in this repo.
