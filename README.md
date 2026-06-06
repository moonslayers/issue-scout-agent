# Issue Scout Agent 🕵️‍♂️

AI agent that investigates GitHub issues and generates detailed technical plans using tool use and the Vercel AI SDK.

## Features

- 🔍 **Automatic investigation** — When an issue is opened, the agent explores the codebase and generates a technical plan
- 📝 **Technical plan generation** — Detailed plans with affected files, implementation steps, and considerations
- 💬 **Command support** — Interact with the agent using commands in issue comments
- 🔄 **Plan updates** — `/update` command re-investigates and updates the original plan comment
- 🤖 **Multi-provider** — Supports OpenAI, Anthropic, and any OpenAI-compatible endpoint
- 🛠️ **Tool use** — The agent uses tools to explore code:
  - `listDir` — List files in a directory
  - `readFile` — Read file content (smart head/tail truncation)
  - `searchCode` — Search code with grep
  - `getFileTree` — Get repository structure
  - `gitDiff` — See recent code changes

## Quick Start

### 1. Add to your repository

Create `.github/workflows/issue-scout.yml`:

**OpenAI:**
```yaml
name: Issue Scout
on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]

jobs:
  scout:
    if: ${{ github.event.sender.type != 'Bot' && ( github.event_name == 'issues' || github.event.issue.pull_request == null ) }}
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: moonslayers/issue-scout-agent@v1
        with:
          ai_provider: openai
          ai_api_key: ${{ secrets.OPENAI_API_KEY }}
          ai_model: gpt-4-turbo
```

**Anthropic:**
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: moonslayers/issue-scout-agent@v1
    with:
      ai_provider: anthropic
      ai_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
      ai_model: claude-3-sonnet-20240229
```

**DeepSeek (nativo):**
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: moonslayers/issue-scout-agent@v1
    with:
      ai_provider: deepseek
      ai_api_key: ${{ secrets.DEEPSEEK_API_KEY }}
      ai_model: deepseek-chat
```

### 2. Configure secrets

Add these secrets to your GitHub repository (`Settings → Secrets and variables → Actions`):

| Secret              | Description                                   |
| ------------------- | --------------------------------------------- |
| `OPENAI_API_KEY`    | API key for OpenAI                            |
| `ANTHROPIC_API_KEY` | API key for Anthropic                         |
| `PROVIDER_API_KEY`  | API key for custom providers (DeepSeek, etc.) |

### 3. Create an issue

The agent will automatically investigate and comment with a technical plan.

## Inputs reference

| Input               | Description                                          | Required | Default  | Examples                                                                        |
| ------------------- | ---------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------- |
| `ai_provider`       | AI provider                                          | No       | `openai` | `openai`, `anthropic`, `deepseek`, `custom`                                     |
| `ai_api_key`        | API key for the provider                             | **Yes**  | —        | `sk-...`                                                                        |
| `ai_model`          | Model to use                                         | **Yes**  | —        | `gpt-4-turbo`, `claude-3-sonnet-20240229`, `deepseek-chat`, `deepseek-reasoner` |
| `ai_base_url`       | Base URL override (works with `openai` and `custom`) | No       | —        | `https://api.deepseek.com/v1`                                                   |
| `ai_temperature`    | Temperature (0.0 - 2.0)                              | No       | `0.3`    | `0.7`                                                                           |
| `ai_max_tokens`     | Max tokens per response                              | No       | `2000`   | `4000`                                                                          |
| `ai_max_iterations` | Max agent loop iterations                            | No       | `10`     | `15`                                                                            |
| `ai_timeout`        | Timeout for AI calls (seconds)                       | No       | `60`     | `120`                                                                           |
| `log_level`         | Log level                                            | No       | `info`   | `debug`, `warn`                                                                 |

> 💡 Para usar OpenAI-compatible endpoints no-OpenAI (Ollama, Together AI, etc.) usa `ai_provider: openai` + `ai_base_url`. O bien usa `ai_provider: custom` (requiere `ai_base_url` sí o sí). DeepSeek tiene su propio provider nativo.

## Commands

Use these in issue comments:

| Command                    | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `/ask [question]`          | Ask a specific question about the issue                     |
| `/update`                  | Re-investigate and update the plan with latest code changes |
| `/investigate [component]` | Deep investigation of a specific component                  |

### How `/update` works

1. Someone comments `/update` on the issue
2. The agent reacts with 👀 to acknowledge
3. The agent re-explores the codebase (files may have changed)
4. The **original plan comment is updated** with the new analysis
5. A confirmation comment is posted: "✅ Plan updated — 2026-06-04 15:30 UTC"
6. A `plan-updated` label is added to the issue

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Test
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Project Structure

```
src/
├── presentation/
│   └── github-actions/        # GitHub Actions entry point
├── application/
│   ├── use-cases/             # Business use cases
│   ├── services/              # Agent orchestrator
│   └── interfaces/            # Ports (interfaces)
├── domain/
│   ├── entities/              # Core business entities
│   ├── value-objects/         # Value objects
│   ├── enums/                 # Enumerations
│   └── errors/                # Domain errors
├── infrastructure/
│   ├── ai/
│   │   ├── tools/             # Code exploration tools
│   │   ├── prompts/           # System prompts
│   │   └── provider-factory.ts
│   └── github/                # GitHub API adapter
└── shared/
    ├── config/                # Environment config (Zod)
    └── logger/                # Structured logging
```

## Architecture

Built with **Clean Architecture** and **Vercel AI SDK**.

See [docs/adr](./docs/adr) for Architecture Decision Records.

## Release Process

Las releases son **automáticas**. No necesitas comandos manuales.

### Cómo hacer un release

1. Actualiza la versión en `package.json`
2. Haz commit y push a `main`:

```bash
git add package.json
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

3. El CI ejecutará los tests automáticamente
4. Si los tests pasan, el Release workflow:
   - Buildeará `dist/` y lo comiteará con `[skip ci]`
   - Creará un tag `vX.Y.Z` automáticamente
   - Creará un **GitHub Release** con release notes generados

> ⚠️ El release **solo ocurre si los tests pasan**. Si algún test falla, el release se omite automáticamente.

### Arquitectura de CI/CD

```
.github/workflows/
├── test.yml       ← Reusable: steps de test (type-check, lint, tests, build)
├── ci.yml         ← PR + push a main → llama a test.yml (read-only)
└── release.yml    ← Push a main → test.yml + build + tag + release
```

El workflow `release.yml` tiene `needs: [test]`, lo que garantiza que **nunca** se publique un release con tests fallando.

## License

MIT
