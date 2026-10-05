# EduCMS Architecture

## Runtime

```text
Browser
  |
  v
React + Vite + Tailwind + Montserrat
  |
  | HTTP / JSON / HTTP-only cookie
  v
Express REST API
  |
  +--> Authentication / RBAC
  +--> Validation / Rate limiting / Helmet
  +--> Controllers
  |      +--> Posts / Versions
  |      +--> Categories / Tags
  |      +--> Comments
  |      +--> Media
  |      +--> Users / Analytics
  |
  +--> PostgreSQL
  |
  +--> Redis cache
```

## Roles

- **Admin:** full system administration, user roles, content, taxonomy, moderation and media.
- **Editor:** content, taxonomy and moderation.
- **Author:** create/edit own posts and manage media.
- **Subscriber:** authenticated reader account.

## Caching

Public post listing responses are cached in Redis for a short TTL. Write operations invalidate the `posts:` cache prefix so readers do not receive stale lists after editorial changes.

## Content lifecycle

Draft -> Published -> Archived

Each post create/update also records a version in `post_versions`. Editors can restore an existing version as a new draft.

## Security

- Password hashing with bcryptjs.
- JWT in an HTTP-only cookie.
- Helmet security headers.
- CORS restricted to configured frontend origin.
- Global rate limiting.
- Express-validator input checks.
- Upload file type/size restrictions.
- Environment secrets excluded from Git.
