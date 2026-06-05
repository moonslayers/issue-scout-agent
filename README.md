# Issue Scout Agent 🕵️‍♂️

AI agent that investigates GitHub issues and generates detailed technical plans using tool use and the Vercel AI SDK.

## Features

- 🔍 **Automatic investigation** — When an issue is opened, the agent explores the codebase and generates a technical plan
- 📝 **Technical plan generation** — Detailed plans with affected files, implementation steps, and considerations
- 💬 **Command support** — Interact with the agent using commands in issue comments
- 🔄 **Plan updates** — `/update` command re-investigates and updates the original plan comment
- 🤖 **Multi-provider** — Supports OpenAI, Anthropic, and custom OpenAI-compatible endpoints
- 🛠️ **Tool use** — The agent uses tools to explore code:
  - `listDir` — List files in a directory
  - `readFile` — Read file content (smart head/tail truncation)
  - `searchCode` — Search code with grep
  - `getFileTree` — Get repository structure
  - `gitDiff` — See recent code changes

## Quick Start

### 1. Add to your repository

Create `.github/workflows/issue-scout.yml`:

```yaml
name: Issue Scout
on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]

jobs:
  scout:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: moonslayers/issue-scout-agent@v1
        with:
          ai_provider: ${{ secrets.AI_PROVIDER }}
          ai_api_key: ${{ secrets.AI_API_KEY }}
          ai_model: ${{ secrets.AI_MODEL }}
```

### 2. Configure secrets

Add these secrets to your repository:

| Secret | Description | Example |
|--------|-------------|---------|
| `AI_PROVIDER` | AI provider to use | `openai`, `anthropic`, `custom` |
| `AI_API_KEY` | API key for the provider | `sk-...` |
| `AI_MODEL` | Model to use | `gpt-4-turbo`, `claude-3-sonnet-20240229` |

### 3. Create an issue

The agent will automatically investigate and comment with a technical plan.

## Commands

Use these in issue comments:

| Command | Description |
|---------|-------------|
| `/ask [question]` | Ask a specific question about the issue |
| `/update` | Re-investigate and update the plan with latest code changes |
| `/investigate [component]` | Deep investigation of a specific component |

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

## License

MIT
