# Docker Setup

## Services

The `docker-compose.yml` at the repo root defines six services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16-alpine | 5432 | Primary relational database |
| `mongo` | mongo:7 | 27017 | Profile document store |
| `api` | Built from `infra/docker/api.Dockerfile` | 5000 | ASP.NET Core API |
| `web` | Built from `infra/docker/web.Dockerfile` | 3000 | Next.js frontend |
| `pgadmin` | dpage/pgadmin4 | 5050 | PostgreSQL admin UI |
| `mongo-express` | mongo-express | 8081 | MongoDB admin UI |

All services communicate over an internal bridge network named `matrimonial-net`. Containers reference each other by service name (e.g., the API connects to `postgres:5432`, not `localhost:5432`).

---

## Quick Start

```bash
# Copy environment file
cp .env.example .env
# Edit .env — change all change_me values

# Start everything
docker compose up -d

# Watch logs
docker compose logs -f api web

# Stop everything
docker compose down
```

---

## Dependency Order

```
postgres (healthy) ─┬─► api (healthy) ─► web
mongo    (healthy) ─┘
```

The `api` container waits for both databases to pass their health checks before starting. The `web` container starts once the `api` service is up (not necessarily healthy, to avoid long waits on first boot).

---

## Health Checks

**PostgreSQL** — runs `pg_isready` every 10 seconds:
```
pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
```

**MongoDB** — runs `mongosh --eval "db.adminCommand('ping')"` every 10 seconds.

**API** — runs `curl -f http://localhost:5000/health` every 15 seconds.

---

## Volumes

Three named volumes persist data between container restarts:

| Volume | Contents |
|--------|----------|
| `postgres_data` | All PostgreSQL tables and indexes |
| `mongo_data` | All MongoDB profile documents |
| `pgadmin_data` | pgAdmin server configuration |

**To fully reset all data:**
```bash
docker compose down -v
```
This deletes the volumes. All data will be lost. Run again with `docker compose up -d` and the migrations will re-apply on the next API start.

---

## Partial Startup (Dev)

For local development you usually only need the databases:

```bash
# Start just the databases
docker compose up postgres mongo -d

# Then run the API and web natively for faster iteration
cd apps/api/src/MatrimonialApi && dotnet run
cd apps/web && npm run dev
```

---

## Admin UIs

**pgAdmin** — `http://localhost:5050`
- Email: `admin@matrimonial.local` (or `$PGADMIN_EMAIL`)
- Password: `$PGADMIN_PASSWORD`
- On first login, add a server: Host `postgres`, Port `5432`, DB `$POSTGRES_DB`, User `$POSTGRES_USER`

**mongo-express** — `http://localhost:8081`
- Username: `$ME_BASICAUTH_USERNAME` (default `admin`)
- Password: `$ME_BASICAUTH_PASSWORD`
- Shows the `matrimonial_profiles` database with the `profiles` collection

---

## Environment Variables in Docker

Docker Compose reads the `.env` file from the repo root and substitutes variables in `docker-compose.yml`. Every `${VAR_NAME}` in the compose file is replaced with the value from `.env`.

The API container receives connection strings as environment variables that override `appsettings.json`:

```
ConnectionStrings__DefaultConnection=$POSTGRES_CONNECTION_STRING
ConnectionStrings__MongoDb=$MONGODB_CONNECTION_STRING
Jwt__Secret=$JWT_SECRET
Jwt__Issuer=$JWT_ISSUER
Jwt__Audience=$JWT_AUDIENCE
```

The web container receives:
```
NEXT_PUBLIC_API_URL=http://api:5000
```

Note that inside Docker, `api:5000` is the internal hostname. For browser requests (which run outside Docker), the frontend is configured to proxy API calls through Next.js or to use the public-facing API URL.

---

## Rebuilding After Code Changes

The API and web containers are built from source. After changing application code:

```bash
# Rebuild and restart a specific service
docker compose up --build api -d

# Rebuild everything
docker compose up --build -d
```

---

## Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f api
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 api
```

---

## Troubleshooting Containers

**Container exits immediately:**
```bash
docker compose logs api
```
Usually a missing or wrong environment variable. Check that `.env` is populated.

**Port already in use:**
```bash
# Find what is using port 5000
netstat -ano | findstr :5000   # Windows
lsof -i :5000                  # Mac/Linux
```
Stop the conflicting process or change the host port in `docker-compose.yml`.

**Database connection refused from API:**
- Ensure `postgres` and `mongo` are `healthy` before `api` starts
- Check that `POSTGRES_CONNECTION_STRING` uses `postgres` as hostname, not `localhost`
