# ADR 001: Use Vercel AI SDK for Agent Orchestration

## Status
Accepted

## Context
We need an AI SDK to power the Issue Scout agent. The agent needs to:
- Call multiple AI providers (OpenAI, Anthropic, Custom endpoints)
- Use tool calling for code exploration
- Support streaming and non-streaming responses
- Have a clean, typed API

## Decision
We will use the Vercel AI SDK (`ai` package) as our primary AI orchestration layer.

## Rationale
- **Multi-provider support**: Built-in support for OpenAI and Anthropic through `@ai-sdk/openai` and `@ai-sdk/anthropic`
- **Tool calling first-class**: The `tool()` helper and `generateText` with tools map directly to our use case
- **Type safety**: Full TypeScript support with Zod integration for tool parameters
- **Lightweight**: Unlike LangChain, it doesn't add unnecessary abstraction layers
- **Active maintenance**: Backed by Vercel, frequent updates

## Consequences
- We depend on the `ai` package and provider-specific packages
- Custom providers must be OpenAI-compatible to work with `createOpenAI`
- We can use `maxSteps` for agent loop instead of implementing our own

## Alternatives Considered
- **LangChain**: Too heavy for our use case, adds complexity without benefit
- **Raw API calls**: Would need to implement tool calling, provider abstraction, etc. from scratch
- **Custom agent loop**: More control but more maintenance burden
