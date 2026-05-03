# Local Development Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| .NET SDK | 8.0 LTS | API backend |
| Node.js | 20 LTS | Frontend |
| Docker Desktop | Latest | PostgreSQL + MongoDB |
| Git | Any | Source control |

Optional but recommended:
- **pgAdmin 4** or **TablePlus** — PostgreSQL GUI
- **MongoDB Compass** — MongoDB GUI
- **VS Code** with C# Dev Kit and ESLint extensions

---

## 1. Clone and Configure

```bash
git clone <repo-url>
cd matrimonial-saas
```

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` and change all `change_me` placeholders. The minimum required values:

```
POSTGRES_PASSWORD=your_dev_password
JWT_SECRET=a_random_string_of_at_least_32_characters
```

---

## 2. Start Databases

The easiest way to run the databases locally is with Docker Compose:

```bash
# Start only PostgreSQL and MongoDB (skip the app containers)
docker compose up postgres mongo -d
```

Verify they are healthy:
```bash
docker compose ps
```

Both should show `healthy` in the Status column within 30 seconds.

---

## 3. Run the API

```bash
cd apps/api/src/MatrimonialApi
dotnet restore
dotnet run
```

The API will:
1. Apply pending database migrations automatically (development mode only)
2. Start listening on `http://localhost:5000`
3. Serve Swagger UI at `http://localhost:5000/swagger`

**Health check endpoints:**
- `GET http://localhost:5000/health` — liveness (process up)
- `GET http://localhost:5000/health/ready` — readiness (databases reachable)

**Environment override for local dev** — the API reads from `appsettings.json` and then `appsettings.Development.json`. You can override any setting in `appsettings.Development.json` without committing secrets. The connection strings default to `localhost` ports when not overridden via environment variables.

---

## 4. Run the Frontend

```bash
cd apps/web
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

It reads `NEXT_PUBLIC_API_URL` from `.env.local` (or the process environment). Create `apps/web/.env.local` if it does not exist:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 5. Create an Admin Account

After the API is running, register a normal account through the frontend or the API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}'
```

Then promote it to Admin directly in PostgreSQL:

```sql
UPDATE "Users"
SET "Role" = 'Admin'
WHERE "Email" = 'admin@example.com';
```

Connect with:
```bash
docker exec -it matrimonial-saas-postgres-1 psql -U matrimonial_user -d matrimonial_db
```

---

## 6. Email Verification in Dev

The development email sender logs verification links to the **API console** instead of sending real emails. After registering, look for a line like:

```
[DEV EMAIL] To: user@example.com
Subject: Verify your email
Body: Click here to verify: http://localhost:3000/verify-email?token=abc123...
```

Copy the `token=` value and visit `http://localhost:5000/api/auth/verify-email?token=<token>` to verify the account.

---

## 7. Photo Storage in Dev

Photos are stored on the local disk at `apps/api/src/MatrimonialApi/wwwroot/photos/`. The API serves them at `http://localhost:5000/photos/<filename>`.

---

## 8. AI Match Explanations in Dev

The Anthropic API key is optional. When `Anthropic:ApiKey` is empty (the default in dev), the system uses a deterministic fallback explainer that generates template-based match explanations without calling any external API.

To test with real AI explanations, add to `appsettings.Development.json`:

```json
{
  "Anthropic": {
    "ApiKey": "sk-ant-..."
  }
}
```

---

## 9. Common Commands

```bash
# Apply a new migration
cd apps/api/src/MatrimonialApi
dotnet ef database update

# Create a new migration after model changes
dotnet ef migrations add MigrationName

# Reset the database (dev only)
dotnet ef database drop --force
dotnet ef database update

# Type-check the frontend
cd apps/web
npm run type-check

# Lint the frontend
npm run lint

# Build the frontend (checks for build errors)
npm run build
```

---

## 10. Port Reference

| Service | URL |
|---------|-----|
| API | http://localhost:5000 |
| Swagger UI | http://localhost:5000/swagger |
| Frontend | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| MongoDB | localhost:27017 |
| pgAdmin | http://localhost:5050 |
| mongo-express | http://localhost:8081 |

pgAdmin and mongo-express are only available when started with `docker compose up`.
