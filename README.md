# Matrimonial SaaS

A full-stack Bangladeshi matrimonial platform. v1 covers registration, multi-step profile creation, profile search and filtering, interest requests, and an admin moderation dashboard.

![CI — API](https://github.com/ibs13/matrimonial-saas/actions/workflows/api-ci.yml/badge.svg)
![CI — Web](https://github.com/ibs13/matrimonial-saas/actions/workflows/web-ci.yml/badge.svg)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Local Setup (Docker)](#local-setup-docker)
- [Local Setup (without Docker)](#local-setup-without-docker)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Health Check Endpoints](#health-check-endpoints)
- [Security Considerations](#security-considerations)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)

---

## Features

### Users
- Register and log in with JWT-based authentication (access + refresh token rotation)
- Build a profile via a guided **10-step form**: basic info, physical attributes, education, career, family background, religion, lifestyle, partner expectations, contact details, and visibility settings
- Search active profiles with filters: gender, religion, age range, education level, employment type, and location
- Send, accept, reject, and cancel interest requests with an optional message
- Phone, email, and full name stay hidden until an interest is accepted

### Admins
- Review profiles submitted for approval (pending queue)
- Approve, reject (with reason), or suspend profiles
- Full audit log of every admin action, filterable by action type, admin, or target profile

### Platform
- Dual-database design: PostgreSQL for structured/relational data, MongoDB for flexible profile documents
- Automatic EF Core migrations on startup in Development
- Swagger UI available at `/swagger` in Development
- Docker Compose stack with health-checked service dependencies

---

## Architecture

```
Browser
  │
  ▼
┌─────────────────┐
│   Next.js 16    │  (port 3000)
│   App Router    │
│   TypeScript    │
└────────┬────────┘
         │ HTTP  (NEXT_PUBLIC_API_URL)
         ▼
┌─────────────────┐
│ ASP.NET Core 8  │  (port 5000 → internal 8080)
│   Web API       │
│   JWT Auth      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────┐
│Postgres│ │ MongoDB │
│  16    │ │    7    │
└────────┘ └─────────┘
```

### Data split

| Store | Holds |
|---|---|
| **PostgreSQL** | Users, refresh tokens, profile search index (denormalized), interest requests, audit logs |
| **MongoDB** | Full profile documents — all 10 form sections, flexible per-user schema |

The `ProfileIndex` table in PostgreSQL is a lightweight copy of filterable fields (age, gender, religion, location, education, status). All profile search queries hit PostgreSQL for speed; the full document is fetched from MongoDB only when viewing a detail page.

### Nginx reverse proxy (optional)

`infra/nginx/nginx.conf` proxies `/api/*` → `api:8080` and `/*` → `web:3000` on port 80, suitable for staging or production deployments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core 8 Web API, C# 12 |
| ORM | EF Core 8 + Npgsql |
| Document DB client | MongoDB.Driver 2.28 |
| Auth | JWT Bearer (HS256), BCrypt password hashing |
| Frontend | Next.js 16.2, React 18, TypeScript 5 |
| Styling | Tailwind CSS 3 |
| HTTP client | Axios (with request/response interceptors) |
| Relational DB | PostgreSQL 16 |
| Document DB | MongoDB 7 |
| Container | Docker, Docker Compose V2 |
| CI/CD | GitHub Actions |
| Reverse proxy | Nginx (optional) |

---

## Repository Structure

```
matrimonial-saas/
├── apps/
│   ├── api/
│   │   └── src/MatrimonialApi/
│   │       ├── Controllers/       # AuthController, ProfileController, SearchController,
│   │       │                      # InterestController, AdminController
│   │       ├── Models/            # EF Core + MongoDB document models
│   │       │   ├── Enums/         # ProfileEnums, InterestRequestStatus
│   │       │   └── Mongo/         # Profile (MongoDB document)
│   │       ├── Services/          # AuthService, ProfileService, SearchService,
│   │       │                      # InterestService, AdminService, TokenService
│   │       ├── Data/              # AppDbContext (Postgres), MongoDbContext,
│   │       │                      # Migrations/
│   │       ├── DTOs/              # Request/response shapes
│   │       └── Middleware/        # ExceptionMiddleware
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── page.tsx           # Landing page
│           │   ├── (auth)/            # login, register
│           │   ├── (main)/            # dashboard, search, interests, profile
│           │   └── admin/             # pending profiles + audit logs
│           ├── components/
│           │   ├── profile/steps/     # 10 profile form step components
│           │   └── ui/                # Navbar, Spinner, Modal
│           ├── contexts/              # AuthContext
│           ├── lib/api.ts             # Axios instance + all API modules
│           └── types/index.ts         # All TypeScript types
├── infra/
│   ├── docker/
│   │   ├── api.Dockerfile         # Multi-stage .NET 8 build
│   │   └── web.Dockerfile         # Multi-stage Next.js standalone build
│   ├── nginx/nginx.conf           # Optional reverse proxy
│   └── db/init-postgres.sql       # Enables uuid-ossp + pg_trgm extensions
├── .github/workflows/
│   ├── api-ci.yml                 # .NET restore → build → test
│   └── web-ci.yml                 # npm ci → lint → type-check → build
├── docker-compose.yml
├── docker-compose.override.yml    # Per-developer overrides (not committed)
└── .env.example
```

---

## Local Setup (Docker)

Docker Compose brings up the full stack — databases, API, frontend, and admin UIs — with a single command.

**Prerequisites:** Docker Desktop (or Docker Engine + Compose V2)

```bash
# 1. Clone the repo
git clone https://github.com/ibs13/matrimonial-saas.git
cd matrimonial-saas

# 2. Create your local env file and fill in the secrets
cp .env.example .env

# 3. Build images and start all services
docker compose up --build
```

**Services after startup:**

| Service | URL | Notes |
|---|---|---|
| Web (Next.js) | http://localhost:3000 | Main application |
| API (Swagger UI) | http://localhost:5000/swagger | Available in Development mode |
| pgAdmin | http://localhost:5050 | PostgreSQL admin UI |
| mongo-express | http://localhost:8081 | MongoDB admin UI |
| PostgreSQL | localhost:5432 | Direct DB access |
| MongoDB | localhost:27017 | Direct DB access |

**Service dependency order:**
```
postgres ──┐
            ├──(healthy)──▶ api ──(started)──▶ web
mongo    ──┘
```
EF Core migrations run automatically when the API starts in Development.

**To stop:**
```bash
docker compose down          # keep volumes
docker compose down -v       # also delete database volumes
```

---

## Local Setup (without Docker)

**Prerequisites:** .NET 8 SDK, Node.js 20+, PostgreSQL 16, MongoDB 7

### Backend

```bash
cd apps/api/src/MatrimonialApi

# Set environment variables (or use a .env / user-secrets)
export ConnectionStrings__Postgres="Host=localhost;Port=5432;Database=matrimonial_db;Username=your_user;Password=your_password"
export MongoDB__ConnectionString="mongodb://localhost:27017"
export MongoDB__Database="matrimonial_profiles"
export Jwt__Secret="your_secret_at_least_32_characters_long"

dotnet restore
dotnet run
# API listens on http://localhost:5000
```

On first run in Development, EF Core migrations execute automatically and create all tables.

### Frontend

```bash
cd apps/web

# Create a local env file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

npm install
npm run dev
# Frontend on http://localhost:3000
```

---

## Environment Variables

Copy `.env.example` to `.env` and replace the placeholder values before running Docker Compose.

| Variable | Used by | Description |
|---|---|---|
| `POSTGRES_DB` | postgres, api | Database name |
| `POSTGRES_USER` | postgres, api | DB username |
| `POSTGRES_PASSWORD` | postgres, api | DB password |
| `POSTGRES_CONNECTION_STRING` | api | Full EF Core connection string |
| `MONGO_USER` | mongo, api | MongoDB root username |
| `MONGO_PASSWORD` | mongo, api | MongoDB root password |
| `MONGO_DB` | mongo, api | MongoDB database name |
| `MONGODB_CONNECTION_STRING` | api | Full MongoDB connection string |
| `JWT_SECRET` | api | HS256 signing key — **minimum 32 characters** |
| `JWT_ISSUER` | api | Token issuer claim (default: `matrimonial-api`) |
| `JWT_AUDIENCE` | api | Token audience claim (default: `matrimonial-client`) |
| `JWT_EXPIRY_MINUTES` | api | Access token lifetime (default: `60`) |
| `NEXT_PUBLIC_API_URL` | web build | API base URL — **baked into the JS bundle at build time** |
| `PGADMIN_EMAIL` | pgadmin | pgAdmin login email |
| `PGADMIN_PASSWORD` | pgadmin | pgAdmin login password |
| `ME_BASICAUTH_USERNAME` | mongo-express | mongo-express HTTP basic auth username |
| `ME_BASICAUTH_PASSWORD` | mongo-express | mongo-express HTTP basic auth password |

> `NEXT_PUBLIC_API_URL` is a Next.js build-time variable. In Docker Compose it is passed as a build argument (`build.args`), not a runtime environment variable — changing it requires a rebuild.

---

## API Overview

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <access_token>`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Create account (email + password) |
| `POST` | `/login` | — | Authenticate, returns access + refresh token |
| `POST` | `/refresh` | — | Rotate tokens using a valid refresh token |
| `POST` | `/logout` | User | Revoke refresh token |
| `GET` | `/me` | User | Current user info (id, email, role) |

### Profile — `/api/profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | User | Create profile (auto-called by setup wizard) |
| `GET` | `/me` | User | Fetch your own full profile |
| `PATCH` | `/basic` | User | Update basic info (name, gender, DOB, location…) |
| `PATCH` | `/physical` | User | Update physical attributes |
| `PATCH` | `/education` | User | Update education details |
| `PATCH` | `/career` | User | Update career details |
| `PATCH` | `/family` | User | Update family background |
| `PATCH` | `/religion` | User | Update religion and practice details |
| `PATCH` | `/lifestyle` | User | Update lifestyle info |
| `PATCH` | `/partner-expectations` | User | Update partner preference criteria |
| `PATCH` | `/contact` | User | Update contact info (hidden by default) |
| `PATCH` | `/visibility` | User | Control which sections are visible to others |
| `POST` | `/submit` | User | Submit profile for admin review |

### Search — `/api/search`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | User | Search active profiles with filters + pagination |

**Available filters:** `gender`, `minAge`, `maxAge`, `religions[]`, `educationLevels[]`, `employmentTypes[]`, `locations[]`, `sortBy` (LastActive / Newest / Completion), `page`, `pageSize`

### Interests — `/api/interests`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | User | Send an interest request (optional message) |
| `GET` | `/sent` | User | List interests you have sent |
| `GET` | `/received` | User | List interests you have received |
| `DELETE` | `/{id}` | User | Cancel a pending interest you sent |
| `PATCH` | `/{id}/accept` | User | Accept a received interest |
| `PATCH` | `/{id}/reject` | User | Reject a received interest |

### Admin — `/api/admin` (Admin role required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/profiles/pending` | List all profiles awaiting review |
| `GET` | `/profiles/{id}` | Full profile detail for a specific user |
| `PATCH` | `/profiles/{id}/approve` | Approve a pending profile → Active |
| `PATCH` | `/profiles/{id}/reject` | Reject a pending profile → Draft (reason required) |
| `PATCH` | `/profiles/{id}/suspend` | Suspend an active profile → Paused (reason required) |
| `GET` | `/audit-logs` | Paginated audit log, filterable by action / admin / profile |

A Swagger UI with full schema documentation is available at **http://localhost:5000/swagger** when running in Development mode.

---

## Health Check Endpoints

Two unauthenticated, rate-limit-exempt endpoints are available for deployment platform monitoring.

| Endpoint | Purpose | Success | Failure |
|---|---|---|---|
| `GET /health` | **Liveness** — confirms the process is running | `200 {"status":"healthy"}` | Never fails (no I/O) |
| `GET /health/ready` | **Readiness** — confirms both databases are reachable | `200 {"status":"healthy"}` | `503 {"status":"unhealthy"}` |

### Example responses

```jsonc
// GET /health  — 200 OK
{ "status": "healthy" }

// GET /health/ready  — 200 OK (both databases up)
{
  "status": "healthy",
  "checks": {
    "postgres": "healthy",
    "mongodb": "healthy"
  }
}

// GET /health/ready  — 503 Service Unavailable (one database down)
{
  "status": "unhealthy",
  "checks": {
    "postgres": "healthy",
    "mongodb": "unhealthy"
  }
}
```

### Platform configuration

**Railway** — set the health check path to `/health` (liveness) in the service settings. Use `/health/ready` as the startup probe if you want Railway to wait for database connectivity before marking the deploy live.

**Render** — configure the health check path to `/health` in the Web Service settings. The endpoint returns `200` as long as the process is running, which satisfies Render's liveness requirement without depending on database availability at the time of the health ping.

> Connection strings, credentials, and error stack traces are never included in health check responses.

---

## Security Considerations

### Authentication
- **JWT HS256** with configurable secret, issuer, audience, and expiry. Clock skew is set to zero — tokens expire exactly when they say they do.
- **Refresh token rotation** — each use issues a new refresh token and revokes the old one. Reuse of a revoked token is rejected.
- **BCrypt** password hashing (bcrypt cost factor default, via BCrypt.Net-Next).
- Passwords are never logged or returned in any response.

### Authorization
- Two policies: `AdminOnly` and `UserOrAdmin`. All admin endpoints enforce `AdminOnly`.
- Users can only modify their own profiles — service layer validates ownership before any write.

### Data Privacy
- **Contact details** (phone, full name, email) are hidden from search results and other users' profile views by default.
- Visibility is only lifted after an interest request is mutually accepted.
- Visibility preferences per section are stored in MongoDB and enforced at the API response layer.

### Audit Trail
- Every admin action (approve / reject / suspend) writes an `AuditLog` record with admin ID, admin email (denormalized), action type, target profile ID, optional reason, and timestamp.
- Audit logs are immutable — there is no delete or update endpoint.

### Infrastructure
- Database credentials, JWT secret, and admin UI passwords are supplied entirely through environment variables — never hardcoded.
- `.env` is in `.gitignore`; only `.env.example` with placeholder values is committed.
- CORS is restricted to `http://localhost:3000` in Development and should be locked to the production origin in Production.
- pgAdmin and mongo-express are not exposed to the internet in production — they are local-only admin tools.

---

## Screenshots

> Screenshots will be added after the initial deployment. The sections below describe what each screen shows.

| Screen | Description |
|---|---|
| **Landing page** | Hero section with register / login CTA |
| **Register / Login** | Clean auth forms with validation |
| **Dashboard** | Profile completion progress, recent interests summary |
| **Profile setup** | 10-step tabbed form with save-per-step |
| **Search** | Filter sidebar + profile card grid with pagination |
| **Profile detail** | Full profile view with send-interest form |
| **Sent interests** | Status badges (Pending / Accepted / Rejected / Cancelled) |
| **Received interests** | Accept / Reject actions inline |
| **Admin — pending** | Split-pane: profile list left, detail + action buttons right |
| **Admin — audit logs** | Timestamped log table with filter by profile UUID |

---

## Roadmap

Features intentionally excluded from v1 and planned for future releases:

| Feature | Notes |
|---|---|
| **Photo upload** | Profile photos stored in object storage (S3 / R2); blur until interest accepted |
| **Real-time messaging** | WebSocket chat unlocked after mutual interest |
| **Multi-tenant / SaaS billing** | Stripe integration, subscription plans, free tier limits |
| **AI-assisted matching** | Compatibility scoring based on partner preferences |
| **Email notifications** | Interest received, profile approved/rejected, new message |
| **Mobile app** | React Native client sharing the same API |
| **Video call** | WebRTC session between matched users |
| **Advanced admin dashboard** | User analytics, registration trends, moderation queue metrics |
| **Two-factor authentication** | TOTP or SMS OTP for login |
| **Soft delete and data export** | GDPR-compliant account deletion and data export |
