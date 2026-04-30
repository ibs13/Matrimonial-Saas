# ── Stage 1: restore & publish ────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy .csproj first so the restore layer is cached until dependencies change
COPY apps/api/src/MatrimonialApi/MatrimonialApi.csproj \
     apps/api/src/MatrimonialApi/MatrimonialApi.csproj
RUN dotnet restore apps/api/src/MatrimonialApi/MatrimonialApi.csproj

# Copy remaining source and publish
COPY apps/api/src/MatrimonialApi/ apps/api/src/MatrimonialApi/
RUN dotnet publish apps/api/src/MatrimonialApi/MatrimonialApi.csproj \
      --configuration Release \
      --output /app/publish \
      --no-restore

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# curl is needed by the docker-compose healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "MatrimonialApi.dll"]
