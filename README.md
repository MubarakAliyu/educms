# EduCMS — Educational Content Management System

A complete educational CMS built to satisfy the course checkpoint while demonstrating stronger software-engineering practices: role-based access control, content CRUD, drafts, version history, comments moderation, media management, SEO fields, search/filtering, analytics, PostgreSQL, Redis caching, REST APIs, and a responsive Tailwind CSS admin workspace.

## Checkpoint requirements

- Public GitHub repository: ready for Git version control.
- Deployed app: production build can be served by the Express server or deployed to a Node host.
- Clean responsive UI: React + Tailwind CSS + Montserrat.
- CMS roles: Admin, Editor, Author, Subscriber.
- Content: posts, categories, tags, drafts, publishing, version history.
- Security foundations: JWT in an HTTP-only cookie, Helmet, CORS, validation, rate limiting, password hashing.
- Performance: PostgreSQL indexes and Redis caching for public post listing.
- Media: Multer upload endpoint and media library.
- Analytics: content/user/comment/view overview.

## Stack

Backend: Node.js, Express.js, PostgreSQL (`pg`), Redis, JWT, bcryptjs, Multer, express-validator, Helmet.

Frontend: React 18, Vite, Tailwind CSS, React Router, Axios, Lucide icons, Montserrat.

## Local setup with Docker

1. Install Docker Desktop.
2. Extract this folder.
3. Copy `server/.env.example` to `server/.env`.
4. Start services:

```bash
docker compose up -d
```

5. Install dependencies:

```bash
npm install
npm run install-all
```

6. Seed database:

```bash
npm run seed
```

7. Start backend + frontend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`
Health: `http://localhost:5000/api/health`

## Demo admin

Email: `admin@educms.local`
Password: `Admin123!`

Change the demo credentials before any public deployment.

## Core API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/posts`
- `GET /api/posts/:slug`
- `GET /api/posts/mine`
- `POST /api/posts`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `GET /api/posts/:id/versions`
- `POST /api/posts/:id/restore/:versionId`
- `GET /api/categories`
- `GET /api/tags`
- `GET /api/comments/post/:postId`
- `POST /api/comments/post/:postId`
- `GET /api/comments/moderation`
- `PATCH /api/comments/:id`
- `GET /api/media`
- `POST /api/media`
- `GET /api/users`
- `PATCH /api/users/:id/role`
- `GET /api/analytics/overview`

## Database model

The schema includes users, categories, posts, tags, the post-tag many-to-many relationship, post versions, comments, media, and activity logs. Important foreign keys use `ON DELETE` behavior, and performance indexes are created for frequent filters and joins.

## Security notes

- Passwords are hashed with bcryptjs.
- JWT is delivered through an HTTP-only cookie.
- `.env` is ignored by Git.
- Helmet adds security headers.
- Rate limiting is applied globally.
- Express-validator protects authentication inputs.
- The media endpoint restricts file types and file size.
- Comment moderation defaults to `pending`.

## Deployment

### Render

A `render.yaml` file is included. Create a Render PostgreSQL database and Redis instance, then connect the environment variables shown there. The single Node service builds the Vite app and the Express server serves `client/dist` in production.

### Heroku-style flow

The course material demonstrates a Heroku workflow using `heroku login`, `heroku create`, environment variables, and `git push heroku main`. Heroku CLI commands may vary by current platform policy; the important part for this project is keeping production secrets in environment variables and deploying the Node service from the repository root.

## GitHub submission

```bash
git init
git add .
git commit -m "Complete EduCMS checkpoint"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/educms-cms.git
git push -u origin main
```

The checkpoint requires a public GitHub repository and a deployed app link.

## Verification checklist

- `npm run test` passes backend tests.
- `npm run build --prefix client` builds the frontend.
- `docker compose up -d` starts PostgreSQL and Redis.
- `npm run seed` creates demo content and admin user.
- `/api/health` returns `status: ok`.
- Public article search/filtering works.
- Protected dashboard redirects unauthenticated users to `/login`.
- Admin/editor/author capabilities are role-aware.
- ErrorBoundary prevents an application crash from producing a blank page.

## Educational scope

The original course material frames the project as a master's-level CMS and suggests advanced extensions including AI recommendations, Elasticsearch, WebSockets, collaborative editing, PWA support, CDN integration, and research benchmarking. This implementation focuses on a strong, reproducible core so the checkpoint remains practical and presentable.

## Author

Mubarak Aliyu