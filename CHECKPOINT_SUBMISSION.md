# EduCMS Checkpoint Submission

## Goal
Deploy all work to a public GitHub repository and provide a deployed application link.

## What is included

- Responsive React + Tailwind CSS admin panel using Montserrat.
- Public educational article library with search, category/tag filters, and article details.
- JWT authentication with roles: admin, editor, author, subscriber.
- PostgreSQL persistence with indexed content tables.
- Redis caching for public post listing (with a safe in-memory fallback when Redis is unavailable).
- Post CRUD, drafts, publishing, archiving, SEO metadata, language field, tags and featured content.
- Post version history and draft restoration.
- Category and tag management.
- Comment submission and moderation.
- Media upload and media library.
- Analytics overview.
- Helmet, rate limiting, validation, password hashing, secure HTTP-only cookie JWT.
- ErrorBoundary and loading/error states to avoid blank pages on ordinary runtime/API failures.
- Docker Compose for PostgreSQL and Redis.
- Render deployment manifest and production Express serving of the React build.

## Required submission links

### GitHub
Replace with the public repository URL after pushing:

`https://github.com/YOUR_USERNAME/educms-cms`

### Deployed app
Replace with your live URL after deployment:

`https://YOUR-EDUCMS-APP.example`

## Demo account

- Email: `admin@educms.local`
- Password: `Admin123!`

Change this password before using the application publicly.

## Local verification

```bash
docker compose up -d
npm install
npm run install-all
npm run seed
npm run dev
```

Run the backend test suite:

```bash
npm test
```

Create the production frontend build:

```bash
npm run build
```

## Important verification note

The source files were statically validated in the build workspace, including JavaScript/JSX parsing and local file/import structure. A dependency-backed Vite build and live PostgreSQL/Redis integration run were not possible inside the build environment because external npm dependency installation and Docker services are not available there. The project is intentionally configured so the final build and integration checks run on the user's Windows/Docker Desktop environment with the provided setup commands.
