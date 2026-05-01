using MatrimonialApi.Data;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MatrimonialApi;

public class PostgresHealthCheck(IServiceScopeFactory scopeFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await db.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("Cannot reach PostgreSQL");
        }
        catch
        {
            return HealthCheckResult.Unhealthy("PostgreSQL check failed");
        }
    }
}

public class MongoHealthCheck(MongoDbContext mongo) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await mongo.PingAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch
        {
            return HealthCheckResult.Unhealthy("MongoDB check failed");
        }
    }
}

public static class HealthResponseWriter
{
    public static Task WriteAsync(HttpContext ctx, HealthReport report)
    {
        ctx.Response.ContentType = "application/json; charset=utf-8";

        var payload = new
        {
            status = report.Status.ToString().ToLowerInvariant(),
            checks = report.Entries.Count > 0
                ? report.Entries.ToDictionary(
                    e => e.Key,
                    e => e.Value.Status.ToString().ToLowerInvariant())
                : (Dictionary<string, string>?)null,
        };

        return ctx.Response.WriteAsJsonAsync(payload);
    }
}
