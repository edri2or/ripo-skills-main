# Clean Architecture — Layer Definitions

This document is the authoritative reference for layer boundaries in this codebase.
The `enterprise-feature-scaffold` skill reads this file during the Discovery phase.

---

## Layer Overview

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│  (Controllers, HTTP handlers, request/response DTOs) │
├─────────────────────────────────────────────────────┤
│                  Application Layer                   │
│  (Services, use-case orchestrators, business logic)  │
├─────────────────────────────────────────────────────┤
│                Infrastructure Layer                  │
│  (Repositories, database adapters, external clients) │
├─────────────────────────────────────────────────────┤
│                    Domain Layer                      │
│  (Entities, value objects, domain events — PURE TS)  │
└─────────────────────────────────────────────────────┘
```

---

## Dependency Rule

> Source code dependencies must always point **inward** — toward the Domain layer.
> No inner layer may know anything about an outer layer.

| Layer | May import from | Must NOT import from |
|-------|----------------|----------------------|
| Presentation | Application | Infrastructure, Domain (directly) |
| Application | Domain | Infrastructure (use interface), Presentation |
| Infrastructure | Domain | Application, Presentation |
| Domain | (nothing) | All other layers |

---

## File Naming Conventions

| Artifact | File pattern | Example |
|----------|-------------|---------|
| Controller | `<Entity>Controller.ts` | `UserController.ts` |
| Service | `<Entity>Service.ts` | `UserService.ts` |
| Repository | `<Entity>Repository.ts` | `UserRepository.ts` |
| Entity | `<Entity>.entity.ts` | `User.entity.ts` |
| DTO | `<Entity><Action>Dto.ts` | `UserCreateDto.ts` |

---

## Dependency Injection Rules

1. **Constructor injection only** — never use property injection or service locators.
2. **Program to interfaces** — Services receive a `I{{Entity}}Repository` interface, not the concrete class.
3. **No `new` inside classes** — instantiation is the responsibility of the IoC container (or the top-level bootstrap module).

---

## Directory Structure

```
src/
└── modules/
    └── <feature-name>/          # kebab-case
        ├── <Entity>Controller.ts
        ├── <Entity>Service.ts
        ├── <Entity>Repository.ts
        ├── <Entity>.entity.ts   (TypeORM entity, added manually)
        └── index.ts             (barrel export)
```
