# Deployment

## Overview

The application is containerized. Production deployment uses the same `docker-compose.yml` with production environment variables. The primary differences from development are:

| Setting | Development | Production |
|---------|------------|-----------|
| Database migrations | Auto-applied on startup | Applied manually before deploy |
| Email sender | Logs to console | Real provider (SendGrid, SES, etc.) |
| Photo storage | Local disk | Cloud storage (S3, R2, etc.) |
| Anthropic API | Optional / fallback | Set key for AI explanations |
| HTTPS | Disabled | Enforced via HSTS |
| Swagger UI | Enabled | Disable or protect behind auth |

---

## Pre-Deployment Checklist

- [ ] All environment variables set in `.env` (no `change_me` values)
- [ ] `JWT_SECRET` is at least 32 characters, cryptographically random
- [ ] `NEXT_PUBLIC_API_URL` points to the production API domain with HTTPS
- [ ] Email sender implementation wired up (see below)
- [ ] Photo storage implementation wired up (see below)
- [ ] Database migrations reviewed and ready to apply
- [ ] `appsettings.Production.json` does not contain secrets (use env vars)

---

## Running Migrations in Production

**Never rely on auto-migration in production.** The `MigrateAsync()` call is guarded by `app.Environment.IsDevelopment()`.

Apply migrations manually before deploying a new version:

```bash
# From the repository root
dotnet ef database update \
  --project apps/api/src/MatrimonialApi \
  --connection "Host=<prod-host>;Port=5432;Database=matrimonial_db;Username=matrimonial_user;Password=<password>"
```

Or using the Docker API container:
```bash
docker compose run --rm api dotnet ef database update
```

Always back up the database before applying migrations in production (see `docs/operations/backup-restore.md`).

---

## Email Sender Setup

The `IEmailSender` interface is in `apps/api/src/MatrimonialApi/Services/`. Create a new implementation for your chosen provider.

**Example: SendGrid**

1. Install the package:
   ```bash
   dotnet add package SendGrid
   ```

2. Create `Services/SendGridEmailSender.cs`:
   ```csharp
   public class SendGridEmailSender(IConfiguration config) : IEmailSender {
       public async Task SendAsync(string to, string subject, string body, CancellationToken ct = default) {
           var client = new SendGridClient(config["SendGrid:ApiKey"]);
           var from = new EmailAddress(config["SendGrid:FromEmail"], config["SendGrid:FromName"]);
           var msg = MailHelper.CreateSingleEmail(from, new EmailAddress(to), subject, body, body);
           await client.SendEmailAsync(msg, ct);
       }
   }
   ```

3. Register in `Program.cs`:
   ```csharp
   if (builder.Environment.IsProduction()) {
       builder.Services.AddScoped<IEmailSender, SendGridEmailSender>();
   } else {
       builder.Services.AddScoped<IEmailSender, DevEmailSender>();
   }
   ```

4. Add to `appsettings.Production.json` or environment:
   ```json
   {
     "SendGrid": {
       "ApiKey": "SG.xxx",
       "FromEmail": "noreply@yourdomain.com",
       "FromName": "MatrimonialBD"
     }
   }
   ```

---

## Photo Storage Setup (S3 / R2)

The `IPhotoStorage` interface is in `apps/api/src/MatrimonialApi/Services/`. The current development implementation uses local disk.

**Example: AWS S3**

1. Install the package:
   ```bash
   dotnet add package AWSSDK.S3
   ```

2. Create `Services/S3PhotoStorage.cs` implementing `IPhotoStorage`:
   - `SaveAsync`: Upload the file to S3, return the public URL
   - `DeleteAsync`: Delete the object by URL/key

3. Register in `Program.cs`:
   ```csharp
   if (builder.Environment.IsProduction()) {
       builder.Services.AddScoped<IPhotoStorage, S3PhotoStorage>();
   } else {
       builder.Services.AddScoped<IPhotoStorage, LocalDiskPhotoStorage>();
   }
   ```

4. Add S3 config to environment variables or `appsettings.Production.json`.

---

## AI Match Explainer Setup

Set the Anthropic API key in the environment:

```json
{
  "Anthropic": {
    "ApiKey": "sk-ant-..."
  }
}
```

When the key is present, `AnthropicMatchExplainerService` is used. When absent, `FallbackMatchExplainerService` (deterministic templates) is used. The system functions normally either way.

---

## Disabling Swagger in Production

Add to `Program.cs`:
```csharp
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

If Swagger is needed in production for internal tools, protect it with authentication middleware.

---

## CI/CD Pipelines

Two GitHub Actions workflows run on pushes to `main` and on all pull requests:

### API CI (`.github/workflows/api-ci.yml`)

Triggers on changes to `apps/api/**`:
1. `dotnet restore`
2. `dotnet build -c Release`
3. `dotnet test` (if test projects exist)

### Web CI (`.github/workflows/web-ci.yml`)

Triggers on changes to `apps/web/**`:
1. `npm ci`
2. `npm run lint` (ESLint)
3. `npm run type-check` (TypeScript)
4. `npm run build` (Next.js production build)

Both pipelines run on `ubuntu-latest`. A failing CI blocks merge.

---

## Docker Build in CI

To build and push Docker images from CI, add these steps after the test steps:

```yaml
- name: Build and push API image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: infra/docker/api.Dockerfile
    push: true
    tags: your-registry/matrimonial-api:latest
```

The `NEXT_PUBLIC_API_URL` must be passed as a build argument for the web image since it is baked into the JavaScript bundle at build time:

```yaml
- name: Build and push Web image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: infra/docker/web.Dockerfile
    build-args: |
      NEXT_PUBLIC_API_URL=https://api.yourdomain.com
    push: true
    tags: your-registry/matrimonial-web:latest
```

---

## Health Checks

The API exposes two health check endpoints:

| Endpoint | Checks | Use Case |
|----------|--------|---------|
| `GET /health` | Process alive only (no DB query) | Liveness probe — restart if dead |
| `GET /health/ready` | PostgreSQL and MongoDB connectivity | Readiness probe — remove from load balancer if DB is unreachable |

Configure your orchestrator (Kubernetes, Railway, Render, ECS) to use `/health/ready` for readiness and `/health` for liveness.

---

## Reverse Proxy (Nginx)

For production, place Nginx in front of the API and web containers:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://api:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The API reads `X-Forwarded-For` for IP-based rate limiting to work correctly behind a proxy. Add `app.UseForwardedHeaders()` in `Program.cs` if not already present.
