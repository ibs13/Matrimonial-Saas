# Matrimonial SaaS

A Bangladeshi matrimonial platform built as a SaaS. v1 covers registration, profile creation (multi-step), search, and connection requests.

## Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core 8 Web API |
| Frontend | Next.js 14 + TypeScript |
| Relational DB | PostgreSQL 16 |
| Document DB | MongoDB 7 |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## Repository Structure

```
matrimonial-saas/
├── apps/
│   ├── api/                   # ASP.NET Core Web API
│   │   ├── src/
│   │   │   ├── Controllers/   # HTTP endpoints
│   │   │   ├── Models/        # Domain entities (EF Core + MongoDB)
│   │   │   ├── Services/      # Business logic
│   │   │   ├── Data/          # DbContexts (Postgres + Mongo)
│   │   │   ├── DTOs/          # Request/response shapes
│   │   │   └── Middleware/    # Auth, error handling, logging
│   │   └── tests/             # xUnit integration tests
│   └── web/                   # Next.js frontend
│       └── src/
│           ├── app/           # App Router pages
│           ├── components/    # Reusable UI components
│           ├── lib/           # API client, helpers
│           └── types/         # Shared TypeScript types
├── infra/
│   ├── docker/                # Dockerfiles for api and web
│   ├── nginx/                 # Reverse proxy config
│   └── db/                    # Postgres init SQL
└── .github/workflows/         # CI pipelines per app
```

## Data Architecture

### PostgreSQL (structured/relational)
Stores: users, auth sessions, JWT refresh tokens, connection requests, admin records, audit logs, messages metadata, profile search index (denormalized).

### MongoDB (document store)
Stores: full matrimonial profile documents — photos, family details, lifestyle preferences, partner expectations. Flexible schema per user.

## Local Development

```bash
cp .env.example .env
# fill in values in .env

docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:5000 |
| Web | http://localhost:3000 |
| Adminer (DB UI) | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| MongoDB | localhost:27017 |

## Privacy Rules

- Phone, email, and full name are hidden by default until a connection is accepted.
- Passwords are hashed with BCrypt / ASP.NET Identity — never stored plain.

## v1 Scope

- User registration and authentication (JWT)
- Multi-step profile creation
- Profile search and filtering
- Connection requests
- Admin dashboard (basic)

Out of scope for v1: payments, chat, video calls, AI matching.
