# apps/api

This directory contains the NestJS backend API for the VulHub Leaderboard.

## 🧠 Architecture Principles

The API follows a clean, modular architecture based on Domain-Driven Design (DDD) principles and Ports & Adapters.

1.  **Separation of Concerns**: The API is divided into domain modules (e.g., `users`, `submissions`, `leaderboards`).
2.  **Strict Boundaries**: Modules only expose a public facade. Internal implementation details are not accessible to other modules, enforced by TypeScript path aliases and ESLint rules.
3.  **Layered Architecture (per module)**: Each module is structured into three distinct layers:
    *   `domain/`: Contains the core business logic, entities, value objects, and domain events. This layer has no dependencies on frameworks or infrastructure.
    *   `application/`: Orchestrates the business logic by implementing use cases (CQRS-style). It depends on the `domain` layer and `infrastructure` ports (interfaces).
    *   `infrastructure/`: Contains adapters to external systems (e.g., database repositories, message queue publishers), controllers, and other framework-specific code. It implements the ports defined in the `application` layer.
4.  **Tenant Safety by Default**: All database access is scoped to a tenant using PostgreSQL Row-Level Security (RLS), enforced via a tenant-aware Prisma client.
5.  **Event-Driven Core**: Key business state changes produce domain events, which are published asynchronously via a transactional outbox pattern to ensure eventual consistency and system resilience.

## 📁 Folder Structure

```bash
src/
├─ common/          # Cross-cutting concerns (interceptors, guards, pipes)
├─ adapters/        # Concrete implementations for external systems (Prisma, Redis, S3)
├─ modules/
│  └─ [domain-name]/ # e.g., submissions/
│     ├─ application/ # Use cases, DTOs, policies
│     ├─ domain/      # Entities, events, domain services
│     └─ infrastructure/ # Repositories, controllers, subscribers
├─ ws/              # WebSocket gateways
├─ jobs/            # BullMQ queue processors
└─ ...
```

## 📜 API Conventions

*   **Versioning**: URI-based (`/api/v1/...`).
*   **Pagination**: Cursor-based for all list endpoints.
*   **Errors**: Standardized error envelope compliant with RFC7807 (Problem Details).
*   **Authentication**: OIDC with JWTs and secure refresh token cookies.
*   **Contracts**: OpenAPI specification generated from code, with DTOs validated by Zod.
