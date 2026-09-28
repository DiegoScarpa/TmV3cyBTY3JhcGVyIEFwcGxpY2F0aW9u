# News Intelligence

News Intelligence is a standalone personal news briefing application. It discovers stories from configurable RSS feeds, attempts respectful direct extraction, uses the public SMRY reader as a fallback when direct extraction is insufficient, groups duplicate coverage into stories, and optionally uses OpenAI to produce structured summaries.

This is a new project and does not share or modify the separate Pallets Argentina website.

## Architecture

```text
RSS feeds → normalize → direct Readability extraction → SMRY public-reader fallback
          → metadata-only record → duplicate detection → story clustering
          → local classification → optional OpenAI synthesis → PostgreSQL → Next.js UI
```

The extraction layer does not bypass authentication, CAPTCHAs, hard paywalls, DRM, robots restrictions, or anti-bot controls. If public content is unavailable, the app keeps the headline, metadata, and original link. Sources are configurable in the `Source` table and can be disabled without changing application code.

## Requirements

- Node.js 20+
- PostgreSQL 14+
- Optional OpenAI API key for structured synthesis

## Install and run

```bash
npm install
cp .env.example .env
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open http://localhost:3000. Demo content renders immediately after seeding. Set `DATABASE_URL` to a PostgreSQL database such as `postgresql://postgres:postgres@localhost:5432/news_intelligence?schema=public`.

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string.
- `OPENAI_API_KEY` — optional; enables source-grounded structured story synthesis through the OpenAI Responses API.
- `SMRY_API_KEY` — optional placeholder for a future authenticated SMRY integration; the current fallback uses the public reader URL and does not require a key.
- `OPENAI_CLASSIFICATION_MODEL` and `OPENAI_SUMMARY_MODEL` — model configuration hooks.
- `INGESTION_SECRET` — required as `x-ingestion-secret` for production `POST /api/ingest` requests.
- `NEXT_PUBLIC_APP_URL` — public app URL.

## Ingestion

Verify a real initial RSS feed:

```bash
npm run check:feed
```

Run the complete pipeline:

```bash
npm run ingest
```

Start the standalone hourly worker:

```bash
npm run ingest:hourly
```

The worker runs `hourlyNewsIngestion` immediately, then uses `node-cron` to check once per minute whether the configured interval is due. The interval defaults to 60 minutes and is controlled by `NEWS_INGEST_INTERVAL_MINUTES`. This is a scheduler process, not a browser-dependent loop. The PostgreSQL `IngestionLock` lease prevents overlapping manual, scheduled, or multi-instance runs; stale locks expire after two hours.

Each source is isolated so one feed failure does not abort the run. Repeated articles are skipped by canonical URL, content hash, and story clustering. Story refreshes are batched until all feeds have been discovered, and AI summaries are only requested when a story is new or has new article coverage. Every run records discovered articles, processed articles, stories created, stories updated, completion status, and errors in `IngestionRun`.

The dashboard and `/status` page expose a manual local trigger plus last-successful-run, next-scheduled-run, current status, run counts, failed sources, and recent errors. The worker itself does not require the dashboard to be open.

## Production scheduling

For the existing Vercel/Next.js deployment, the recommended production scheduler is Vercel Cron. `vercel.json` schedules `GET /api/ingest` at the top of every hour. Set `CRON_SECRET` in Vercel project settings; Vercel sends it as a bearer token and the route validates it before starting ingestion. Also configure `DATABASE_URL`, `OPENAI_API_KEY` when AI summaries are desired, and `NEWS_INGEST_INTERVAL_MINUTES=60`.

Deploy with:

```bash
npm run build
npm run db:migrate
```

Vercel Cron is appropriate for hourly invocations because the request starts a bounded ingestion run and exits; it does not depend on a browser tab or a permanently running Next.js process. If you deploy outside Vercel, run `npm run ingest:hourly` as a managed background worker under systemd, Docker, Railway, Render, Fly.io, or a similar service, with automatic restart enabled. Do not run the hourly worker inside every web-server replica; use one worker or rely on the database lease lock.

## AI behavior

When `OPENAI_API_KEY` is present, the app uses the Responses API with strict JSON schema output and `store: false`. The prompt requires source attribution, uncertainty preservation, no invented facts, and neutral political coverage. Without a key, the app still ingests, clusters, ranks, searches, and renders source-linked stories with a limited synthesis.

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Vitest
npm run db:migrate   # Prisma migration
npm run db:push      # push schema without migration
npm run db:seed      # seed categories, sources, demo content
npm run db:studio    # Prisma Studio
npm run ingest       # RSS → extraction → clustering → synthesis
npm run ingest:hourly # standalone hourly scheduler/worker
```

## API surface

`GET /api/stories`, `GET /api/stories/:id`, `GET /api/articles/:id`, `GET /api/categories`, `GET /api/sources`, `GET /api/search?q=...`, `GET /api/briefing`, `GET /api/status`, `GET|POST /api/ingest`, `POST /api/summarize`, `GET|POST /api/preferences`, and `GET|POST /api/bookmarks`.

## Deployment and limitations

Build with `npm run build`, provide managed PostgreSQL, run Prisma migrations during deployment, and schedule ingestion. Keep API keys and ingestion secrets server-side. The app can run without OpenAI, but summaries will be limited. Live RSS and end-to-end ingestion require outbound network access and PostgreSQL. Image extraction and article bodies depend on what each publisher publicly delivers.
