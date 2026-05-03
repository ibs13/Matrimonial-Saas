# Environment Variables

All variables are defined in `.env` at the repository root. Copy `.env.example` to `.env` and fill in the values before running the application.

---

## PostgreSQL

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `POSTGRES_DB` | `matrimonial_db` | Yes | Database name |
| `POSTGRES_USER` | `matrimonial_user` | Yes | Database username |
| `POSTGRES_PASSWORD` | `strong_password` | Yes | Database password |
| `POSTGRES_CONNECTION_STRING` | `Host=postgres;Port=5432;Database=matrimonial_db;Username=matrimonial_user;Password=strong_password` | Yes | Full Npgsql connection string used by the API |

The connection string host must be `postgres` when running inside Docker and `localhost` when running the API natively.

---

## MongoDB

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `MONGO_USER` | `mongo_user` | Yes | MongoDB username |
| `MONGO_PASSWORD` | `strong_password` | Yes | MongoDB password |
| `MONGO_DB` | `matrimonial_profiles` | Yes | Database name inside MongoDB |
| `MONGODB_CONNECTION_STRING` | `mongodb://mongo_user:password@mongo:27017/matrimonial_profiles?authSource=admin` | Yes | Full MongoDB connection string used by the API |

The connection string host must be `mongo` inside Docker and `localhost` natively.

---

## JWT Authentication

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `JWT_SECRET` | `replace_with_64_char_random_string` | Yes | Symmetric signing key. **Minimum 32 characters.** Use a cryptographically random value in production. |
| `JWT_ISSUER` | `matrimonial-api` | Yes | Included in the `iss` claim. Must match on both token creation and validation. |
| `JWT_AUDIENCE` | `matrimonial-client` | Yes | Included in the `aud` claim. Must match on both token creation and validation. |
| `JWT_EXPIRY_MINUTES` | `60` | No | Access token lifetime in minutes. Default: 60. |

**Security note:** The JWT secret must be kept secret. Anyone with the secret can forge valid tokens. Rotate it if it is ever exposed — all existing sessions will be invalidated automatically.

---

## Frontend

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | Yes | Base URL for API calls from the browser. Baked into the JavaScript bundle at build time. Must be the publicly accessible URL for the API in production. |

This variable is prefixed with `NEXT_PUBLIC_` which means Next.js includes it in the client-side bundle. Do not put secrets here.

---

## pgAdmin (optional)

| Variable | Example | Description |
|----------|---------|-------------|
| `PGADMIN_EMAIL` | `admin@matrimonial.local` | Login email for pgAdmin UI |
| `PGADMIN_PASSWORD` | `admin_password` | Login password for pgAdmin UI |

Only used by the `pgadmin` Docker service. Not needed for the application itself.

---

## mongo-express (optional)

| Variable | Example | Description |
|----------|---------|-------------|
| `ME_BASICAUTH_USERNAME` | `admin` | HTTP basic auth username for mongo-express |
| `ME_BASICAUTH_PASSWORD` | `admin` | HTTP basic auth password for mongo-express |

Only used by the `mongo-express` Docker service.

---

## Anthropic API (optional)

The AI match explainer is configured in `appsettings.json` (not in `.env`):

```json
{
  "Anthropic": {
    "ApiKey": "sk-ant-..."
  }
}
```

When this key is empty or missing, the system falls back to a deterministic template-based explainer. The application starts and functions normally without it.

---

## Chat Configuration

Configured in `appsettings.json` under the `Chat` section:

```json
{
  "Chat": {
    "BannedWords": [],
    "RateLimit": {
      "MaxMessagesPerMinute": 20
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `Chat:BannedWords` | `[]` | Array of strings. Any chat message containing these words (case-insensitive) is rejected. |
| `Chat:RateLimit:MaxMessagesPerMinute` | `20` | Maximum messages a single user can send per minute. Enforced in-memory; resets on API restart. |

---

## Production Checklist

Before deploying to production, verify:

- [ ] `JWT_SECRET` is at least 32 characters, cryptographically random, and never committed to source control
- [ ] `POSTGRES_PASSWORD` and `MONGO_PASSWORD` are strong and unique
- [ ] `NEXT_PUBLIC_API_URL` points to the production API domain (HTTPS)
- [ ] `PGADMIN_PASSWORD` and `ME_BASICAUTH_PASSWORD` are changed from defaults
- [ ] MongoDB and PostgreSQL are not exposed on public ports in production
- [ ] `Anthropic:ApiKey` is set if AI explanations are needed
- [ ] An actual email sender implementation is wired up (see `docs/operations/deployment.md`)
