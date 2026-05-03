# Troubleshooting

## API Issues

### API fails to start — "JWT_SECRET must be at least 32 characters"

The `JWT_SECRET` in your `.env` or environment is missing or too short. The API fails fast at startup to prevent running with a weak signing key.

**Fix:** Set a strong secret (32+ chars):
```bash
# Generate a random 64-character secret
openssl rand -base64 48
```
Add the output to `JWT_SECRET` in `.env`.

---

### API fails to start — "Connection refused" / database not reachable

The API is starting before the databases are healthy.

**In Docker:** Check that `postgres` and `mongo` are healthy:
```bash
docker compose ps
```
If either shows `starting` or `unhealthy`, wait or restart them:
```bash
docker compose restart postgres mongo
docker compose up api -d  # restart API after DBs are healthy
```

**Running API natively:** Verify PostgreSQL and MongoDB are running:
```bash
docker compose up postgres mongo -d
# Wait for both to be healthy, then:
cd apps/api/src/MatrimonialApi && dotnet run
```

---

### 500 Internal Server Error on all requests

Check the API logs:
```bash
docker compose logs api --tail=50
```

Common causes:
1. Migration not applied — run `dotnet ef database update`
2. MongoDB collection not accessible — check `MONGODB_CONNECTION_STRING`
3. Unhandled exception — the `ExceptionMiddleware` will log the stack trace

---

### Migrations fail — "relation already exists"

The migration is trying to create a table that already exists. This happens if the `__EFMigrationsHistory` table is out of sync.

**Check migration history:**
```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";
```

If a migration is marked as applied but the schema is actually missing tables, manually insert the migration record:
```sql
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260503060000_AddChatModeration', '8.0.0');
```

If a table exists that the migration tries to create, either drop the table (if safe) or modify the migration's `Up()` method to check first.

---

### Enum values arrive as integers instead of strings

The `JsonStringEnumConverter` is not registered on the controller or the DTO. All controllers should have:

```csharp
[JsonConverter(typeof(JsonStringEnumConverter))]
```
on their enum response properties, or registered globally in `Program.cs`:

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
```

---

### 401 on all API calls after login

The access token has expired and the refresh is failing. Check:
1. `localStorage` contains both `accessToken` and `refreshToken` in browser dev tools
2. The refresh token is not expired (7-day lifetime)
3. The `JWT_SECRET` in the API environment matches the one used when the token was issued

If the JWT_SECRET was rotated, all existing sessions are invalid — users must log in again.

---

### Rate limit hit on auth — 429 Too Many Requests

You are calling `/api/auth/*` more than 10 times per minute from the same IP. In development this is most commonly hit when running automated test scripts.

**Fix for dev:** Temporarily disable the rate limiter in `Program.cs` by removing or commenting out the `builder.Services.AddRateLimiter` block and `app.UseRateLimiter()` call.

---

## Frontend Issues

### NEXT_PUBLIC_API_URL not updating after .env change

`NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at build time. You must rebuild after changing them:

```bash
cd apps/web
npm run build
npm run start
# or in dev:
npm run dev  # dev server picks up .env.local on restart
```

---

### "Module not found" / TypeScript errors after pulling new code

Run `npm install` to pick up new packages:
```bash
cd apps/web
npm install
```

For the API:
```bash
cd apps/api/src/MatrimonialApi
dotnet restore
```

---

### TypeScript type errors on build

The frontend uses strict TypeScript. Common issues:

**Enum value doesn't match** — check that frontend enums in `types/index.ts` match the C# enum values exactly (case-sensitive strings).

**Missing field on DTO** — a backend field was added but not added to the TypeScript interface in `types/index.ts`. Add it with the correct type.

**Implicit `any`** — add an explicit type annotation.

Run `npm run type-check` to see all errors before building.

---

### Chat unread count badge not updating

The badge polls every 60 seconds via `setInterval` in `Navbar.tsx`. If it is stuck:
1. Verify `GET /api/chat/unread-count` returns the correct count
2. Check browser console for network errors on that endpoint
3. Hard-refresh the page to restart the polling interval

---

## Database Issues

### PostgreSQL: "too many connections"

The default `max_connections` in PostgreSQL is 100. With EF Core connection pooling, the API maintains a pool per process. If running multiple API instances:

1. Check current connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'matrimonial_db';
   ```

2. Reduce pool size in the connection string:
   ```
   Host=postgres;...;Maximum Pool Size=20
   ```

3. Or use a connection pooler like **PgBouncer** in front of PostgreSQL.

---

### MongoDB: profiles collection missing

The MongoDB collection is created automatically on first write. If it is missing, it means no profile has ever been created. Create a profile through the API to initialize the collection.

---

### ProfileIndexes out of sync with MongoDB

If a profile shows as Active in MongoDB but does not appear in search results, the PostgreSQL index row may be stale.

**Diagnose:**
```sql
SELECT "Id", "Status", "ProfileVisible" FROM "ProfileIndexes"
WHERE "Id" = '<user-guid>';
```

**Fix:** Re-save any profile section for that user. The `ProfileService` always updates both databases. If you cannot log in as that user, update the index row directly:
```sql
UPDATE "ProfileIndexes"
SET "Status" = 'Active', "ProfileVisible" = true
WHERE "Id" = '<user-guid>';
```

---

### Payment attempt already exists (409 Conflict)

A user is submitting a payment with a `GatewayTransactionId` that already exists in the database. The unique constraint on `PaymentAttempts.GatewayTransactionId` prevents duplicate processing.

If the duplicate is legitimate (user accidentally submitted twice with the same transaction ID):
1. Check the existing attempt status
2. If it was already verified: the membership should already be active
3. If it was rejected: the user needs a new transaction ID from their bank

---

## Docker Issues

### Container exits with code 137 (OOM)

A container was killed by the OS due to insufficient memory. Increase Docker Desktop's memory limit in Settings → Resources → Memory. The API requires at least 512MB; 1GB is recommended.

### Port already in use

```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

Stop the process using the port or change the host-side port mapping in `docker-compose.yml`:
```yaml
ports:
  - "5001:5000"  # change host port from 5000 to 5001
```

### Volume data persists after code changes

If you modify the database schema but old data from a volume is causing issues:
```bash
# Stop and remove volumes (ALL DATA LOST)
docker compose down -v
docker compose up -d
```

Only do this in development. Never run `down -v` in production without a backup.
