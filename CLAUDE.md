# Project: Bangladeshi Matrimonial SaaS

## Stack

- ASP.NET Core Web API
- Next.js
- TypeScript
- PostgreSQL
- MongoDB
- Docker
- GitHub Actions

## Architecture Rules

- PostgreSQL stores users, auth, requests, admin, logs, messages, and searchable profile index.
- MongoDB stores full matrimonial profile documents.
- Never store passwords in plain text.
- Use BCrypt or ASP.NET Identity password hashing.
- Hide phone, email, and full name by default.
- Build profile creation as a multi-step form.
- Do not implement payment, chat, video call, or advanced matching in v1.

## Workflow

- First explain plan.
- Then list files to create or modify.
- Then implement.
- After implementation, run build and tests.
- Do not delete existing files without asking.
