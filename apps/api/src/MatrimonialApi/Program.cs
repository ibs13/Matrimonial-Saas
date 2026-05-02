using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using MatrimonialApi;
using MatrimonialApi.Data;
using MatrimonialApi.Email;
using MatrimonialApi.Middleware;
using MatrimonialApi.Services;
using MatrimonialApi.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Fail-fast: validate required secrets before any service is registered ─────
var postgresConn = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(postgresConn))
    throw new InvalidOperationException(
        "ConnectionStrings:Postgres is not configured. " +
        "Set the ConnectionStrings__Postgres environment variable.");

var mongoConn = builder.Configuration["MongoDB:ConnectionString"];
if (string.IsNullOrWhiteSpace(mongoConn))
    throw new InvalidOperationException(
        "MongoDB:ConnectionString is not configured. " +
        "Set the MongoDB__ConnectionString environment variable.");

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opts => opts.UseNpgsql(postgresConn));

// MongoDbContext is singleton — MongoClient is thread-safe and meant to be reused
builder.Services.AddSingleton<MongoDbContext>();

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<SearchService>();
builder.Services.AddScoped<InterestService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<SavedProfileService>();
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<EmailVerificationService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ProfileViewService>();
builder.Services.AddScoped<MembershipService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<ContactUnlockService>();

// Email delivery: DevEmailSender logs the verification link to the console (no real email sent).
// Replace with SendGrid, SES, Postmark, etc. in production by implementing IEmailSender.
if (builder.Environment.IsDevelopment())
    builder.Services.AddSingleton<IEmailSender, DevEmailSender>();
else
    builder.Services.AddSingleton<IEmailSender, NoOpEmailSender>();

// Photo storage: local disk for dev. Swap to S3/R2 in production by implementing IPhotoStorage.
builder.Services.AddSingleton<IPhotoStorage, LocalDiskPhotoStorage>();

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"])
    .AddCheck<MongoHealthCheck>("mongodb", tags: ["ready"]);

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException(
        "Jwt:Secret is not configured. " +
        "Set the Jwt__Secret environment variable (minimum 32 characters).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero,
        };
    });

// ── Role-based Authorization ──────────────────────────────────────────────────
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", p => p.RequireRole("Admin"))
    .AddPolicy("UserOrAdmin", p => p.RequireRole("User", "Admin"));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// "auth" policy: 10 requests per IP per minute, no queuing.
// Applied to AuthController via [EnableRateLimiting("auth")].
builder.Services.AddRateLimiter(opts =>
{
    opts.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }
        )
    );
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ── HSTS (production only) ────────────────────────────────────────────────────
if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddHsts(opts =>
    {
        opts.IncludeSubDomains = true;
        opts.MaxAge = TimeSpan.FromDays(365);
    });
}

// ── Controllers & Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Matrimonial API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer token. Example: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── CORS (dev) ────────────────────────────────────────────────────────────────
builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(p =>
        p.WithOrigins("http://localhost:3000")
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
// Order matters:
//   1. CorrelationId runs first — stamps X-Correlation-ID on the response and
//      opens a logging scope so every log line in this request carries CorrelationId.
//   2. Exception handler wraps everything below it.
//   3. HSTS / HTTPS redirect before any response is written (prod only).
//   4. CORS before rate-limiter so that 429 responses carry CORS headers.
//   5. Rate-limiter before auth to reject floods without touching the DB.
//   6. Auth / Authz last before controllers.
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();

// S-4: HTTPS enforcement — production only, never in local dev
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new
{
    app = "Matrimonial API",
    status = "Running",
    swagger = "/swagger"
}));

// ── Health check endpoints ────────────────────────────────────────────────────
// No auth required; excluded from rate limiting. Suitable for Railway / Render.
// /health     — liveness: process is up (no DB queries)
// /health/ready — readiness: both PostgreSQL and MongoDB are reachable
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = HealthResponseWriter.WriteAsync,
}).DisableRateLimiting();

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = HealthResponseWriter.WriteAsync,
    ResultStatusCodes =
    {
        [HealthStatus.Healthy] = StatusCodes.Status200OK,
        [HealthStatus.Degraded] = StatusCodes.Status200OK,
        [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
    },
}).DisableRateLimiting();

app.MapControllers();

// ── Auto-migrate on startup (dev only) ───────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();
