using System.Net;
using System.Text.Json;
using MatrimonialApi.Exceptions;

namespace MatrimonialApi.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (PlanLimitExceededException ex)
        {
            logger.LogInformation("{Method} {Path} 429: {Message}",
                context.Request.Method, context.Request.Path, ex.Message);
            await WriteError(context, HttpStatusCode.TooManyRequests, ex.Message, "MONTHLY_LIMIT_EXCEEDED");
        }
        catch (KeyNotFoundException ex)
        {
            await WriteError(context, HttpStatusCode.NotFound, ex.Message);
        }
        catch (ArgumentException ex)
        {
            await WriteError(context, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning("{Method} {Path} 409: {Message}",
                context.Request.Method, context.Request.Path, ex.Message);
            await WriteError(context, HttpStatusCode.Conflict, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogInformation("{Method} {Path} 401: {Message}",
                context.Request.Method, context.Request.Path, ex.Message);
            await WriteError(context, HttpStatusCode.Unauthorized, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await WriteError(context, HttpStatusCode.InternalServerError, "An unexpected error occurred.");
        }
    }

    private static Task WriteError(HttpContext context, HttpStatusCode status, string message, string? code = null)
    {
        context.Response.StatusCode = (int)status;
        context.Response.ContentType = "application/json";
        var body = code is not null
            ? JsonSerializer.Serialize(new { error = message, code })
            : JsonSerializer.Serialize(new { error = message });
        return context.Response.WriteAsync(body);
    }
}
