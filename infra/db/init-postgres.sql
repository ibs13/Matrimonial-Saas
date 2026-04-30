-- Matrimonial SaaS — PostgreSQL schema scaffold
-- Tables will be managed by EF Core migrations in development.
-- This file documents the intended schema for reference and CI seeding.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for trigram text search on profiles

-- Placeholder: schema is defined via EF Core migrations.
-- See apps/api/src/Data/ for the DbContext and entity configurations.
