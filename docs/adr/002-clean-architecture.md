# ADR 002: Clean Architecture with Domain-Driven Design

## Status
Accepted

## Context
Issue Scout needs to be maintainable, testable, and adaptable to new requirements. The architecture must:
- Allow testing business logic without infrastructure dependencies
- Support multiple AI providers interchangeably
- Allow tools to be added/removed without affecting core logic
- Be understandable for new contributors

## Decision
We will use Clean Architecture with 4 layers:

```
┌─────────────────────────────────────┐
│  PRESENTATION (GitHub Actions)       │
│  APPLICATION (Use Cases, Services)   │
│  DOMAIN (Entities, Value Objects)    │
│  INFRASTRUCTURE (Tools, Providers)   │
└─────────────────────────────────────┘
```

## Layer Rules
1. **Domain**: No external dependencies. Pure TypeScript with business logic
2. **Application**: Depends only on Domain. Orchestrates use cases
3. **Infrastructure**: Implements interfaces from Application/Domain. Has external dependencies
4. **Presentation**: Entry point. Wires everything together

## Rationale
- **Testability**: Domain and Application can be unit-tested without mocks
- **Flexibility**: AI providers and tools can be swapped by changing Infrastructure only
- **Separation of concerns**: Each layer has a single responsibility
- **Dependency inversion**: Application defines interfaces, Infrastructure implements them

## Consequences
- More files and folders than a flat structure
- Strict dependency rules must be enforced in code reviews
- Initial setup takes longer but pays off in maintenance
