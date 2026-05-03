# Architecture Overview

## System Diagram

```
Browser
   │
   ▼
┌──────────────────────────────┐
│  Next.js 16 (Port 3000)      │
│  React 18 / TypeScript       │
│  Tailwind CSS                │
└──────────────┬───────────────┘
               │  HTTP REST (JWT Bearer)
               ▼
┌──────────────────────────────┐
│  ASP.NET Core 8 (Port 5000)  │
│  JWT Auth + Role Policies    │
│  15 Controllers / 23 Services│
│  EF Core 8 + MongoDB Driver  │
└────────┬─────────────────────┘
         │                │
         ▼                ▼
┌─────────────┐   ┌──────────────────┐
│ PostgreSQL  │   │  MongoDB          │
│ 22 tables   │   │  profiles coll.   │
│ Relational  │   │  Rich documents   │
│ Search idx  │   │  Nested sections  │
└─────────────┘   └──────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Frontend | Next.js | 16.2.4 | React SSR/SPA hybrid |
| Frontend | TypeScript | 5.5.4 | Type safety |
| Frontend | Tailwind CSS | 3.4.10 | Utility-first styling |
| Frontend | Axios | 1.7.7 | HTTP client with interceptors |
| API | ASP.NET Core | 8.0 LTS | REST API framework |
| API | Entity Framework Core | 8.0 | ORM for PostgreSQL |
| API | MongoDB.Driver | 2.28 | MongoDB client |
| API | BCrypt.Net | 4.0.3 | Password hashing |
| API | JwtBearer | 8.0 | Token authentication |
| Database | PostgreSQL | 16 | Relational / search index |
| Database | MongoDB | 7 | Profile document store |
| Infra | Docker Compose | Latest | Local + production deployment |
| CI | GitHub Actions | - | Build, lint, type-check |

---

## Core Design Decisions

### Dual Database

PostgreSQL stores everything that needs relational integrity: user accounts, transactions, audit logs, interest requests, notifications, chat messages, and a denormalized search index.

MongoDB stores the full matrimonial profile document — a deeply nested structure with 8 sections and variable-length arrays (photos, hobbies, preferred countries). The schema is flexible and evolves without migrations.

The two databases are kept in sync by the `ProfileService`: every profile update writes to MongoDB first, then upserts the relevant fields into the `ProfileIndexes` PostgreSQL table. Search queries hit only PostgreSQL. Full profile reads hit MongoDB.

### Hybrid Profile Storage

```
User writes PATCH /api/profile/basic
          │
          ├─► MongoDB: update full Profile document
          └─► PostgreSQL: update ProfileIndex row
                          (denormalized search fields)

User sends POST /api/search
          │
          └─► PostgreSQL only: query ProfileIndex
                               (fast, indexed)

User views GET /api/profile/me
          │
          └─► MongoDB only: load full Profile document
                            (complete, nested)
```

This pattern avoids joining large JSON from PostgreSQL and keeps search queries purely relational.

### Stateful Refresh Tokens

Access tokens are short-lived (default 60 minutes). Refresh tokens are stored in PostgreSQL as hashed values with an expiry and a revocation flag. On refresh, the old token is revoked and a new one issued. This allows logout from any device to immediately invalidate that device's session.

### Privacy by Default

Full name, phone number, and address are hidden on every profile by default. They are revealed only when the viewing user has an accepted interest request with the profile owner, and only when the owner has explicitly toggled visibility on. Contact details require an additional `ContactUnlock` which is a premium-only feature.

### Email as Unique Identity

Email is the only login identifier. It is case-normalized on write and lookup. No username system exists in v1. Phone number is collected only as contact information, not for auth.

---

## Request Lifecycle

```
1. Browser sends: POST /api/auth/login

2. Nginx (or reverse proxy in prod) terminates TLS

3. ASP.NET Core pipeline:
   a. CorrelationIdMiddleware     → adds X-Correlation-ID header
   b. Authentication middleware   → validates JWT, populates ClaimsPrincipal
   c. Authorization middleware    → checks [Authorize] attributes and policies
   d. RateLimiter (auth routes)   → 10 req/min per IP
   e. ExceptionMiddleware         → wraps unhandled exceptions as JSON errors
   f. Controller action           → calls service
   g. Service                     → calls DB, returns DTO
   h. Response                    → serialized as JSON (enums as strings)

4. Browser receives JSON response
```

---

## Directory Structure

```
matrimonial-saas/
├── apps/
│   ├── api/
│   │   └── src/MatrimonialApi/
│   │       ├── Controllers/      # 15 API controllers
│   │       ├── Services/         # 23 business logic services
│   │       ├── Models/           # EF Core entities
│   │       ├── Models/Mongo/     # MongoDB document models
│   │       ├── DTOs/             # Request / response shapes
│   │       ├── Data/             # AppDbContext, MongoDbContext, Migrations
│   │       ├── Middleware/       # Exception handler, correlation ID
│   │       └── Program.cs        # Service registration, pipeline
│   └── web/
│       └── src/
│           ├── app/              # Next.js App Router pages
│           │   ├── (auth)/       # Login, register
│           │   ├── (main)/       # All authenticated pages
│           │   └── admin/        # Admin-only pages
│           ├── components/       # Shared UI components
│           ├── contexts/         # React contexts (AuthContext)
│           ├── lib/              # API client (api.ts)
│           └── types/            # TypeScript type definitions
├── infra/
│   ├── docker/                   # Dockerfiles for api and web
│   └── db/                       # PostgreSQL init scripts
├── docs/                         # All documentation
├── .github/workflows/            # CI pipelines
└── docker-compose.yml
```

---

## Adding a New Feature

A typical feature spans these layers in order:

1. **Model** — add/modify a model in `Models/` and run `dotnet ef migrations add`
2. **Service** — add business logic in a new `Services/FeatureService.cs`
3. **DTOs** — add request and response classes in `DTOs/Feature/`
4. **Controller** — add a controller in `Controllers/FeatureController.cs`
5. **Register** — add `builder.Services.AddScoped<FeatureService>()` in `Program.cs`
6. **Frontend types** — add TypeScript types to `web/src/types/index.ts`
7. **API client** — add API calls to `web/src/lib/api.ts`
8. **Pages** — add or modify pages under `web/src/app/(main)/`

See `docs/features/` for how existing features work end-to-end.
