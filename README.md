# News Intelligence

News Intelligence is a standalone personal news briefing application. It discovers stories from configurable RSS feeds, attempts respectful direct extraction, uses the public SMRY reader as a fallback when direct extraction is insufficient, groups duplicate coverage into stories, and optionally uses OpenAI to produce structured summaries.

This is a new project and does not share or modify the separate Pallets Argentina website.

## Architecture

```text
RSS feeds → normalize → direct Readability extraction → SMRY public-reader fallback
          → metadata-only record → duplicate detection → story clustering
          → local classification → optional OpenAI synthesis + impact analysis
          → PostgreSQL topics/analysis graph → Next.js intelligence UI
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
- `NEWS_REEL_DURATION_SECONDS` — duration of each `/news-reel` slide; defaults to `20` seconds.
- `IMPACT_MIN_CONFIDENCE` — minimum internal evidence/confidence threshold for rendering an impact section; defaults to `0.70`. The numeric score is never shown to readers.
- `INGESTION_SECRET` — secret for server-side production ingestion requests. The dashboard's manual `POST /api/ingest` refresh is accepted only from the same origin; scheduled/server calls must send this secret (or `CRON_SECRET`).
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

Article times are stored in UTC and kept separate: `publishedAt` is the publisher's timestamp, `discoveredAt` is when this system found the item, `lastCheckedAt` is the last source check, and Prisma's `updatedAt` is the database record update time. The ingestion logs include per-source fetch time, item count, newest publication, new articles, story changes, and failures. `Source` stores the latest fetch and newest-item diagnostics.

The homepage defaults to `Latest` (published time descending, with discovered time as the fallback) over the last 24 hours. `Top stories` is a separate importance/relevance feed and defaults to all available coverage. Both feeds offer one-hour, six-hour, 24-hour, three-day, seven-day, and all-available windows. API responses are explicitly `no-store`, and the homepage/status routes are dynamic so a completed ingestion is visible on the next request. The Refresh news button waits for the protected ingestion request to finish and then refreshes the server-rendered feed.

The dashboard and `/status` page expose a manual local trigger plus last-successful-run, next-scheduled-run, current status, run counts, failed sources, and recent errors. The worker itself does not require the dashboard to be open.

## Business intelligence and impact analysis

The database contains a hierarchical `Topic` taxonomy with business, finance and markets, real estate, economy, energy, technology/AI, and other news topics. `StoryTopic` links stories to subtopics for navigation and personalization. The source registry stores website, RSS URL, source type, extraction preference, reliability, and configurable subtopics. Verified business-focused feeds include Financial Times, Business Insider, Supply Chain Dive, Federal Reserve press releases, MarketWatch, HousingWire, and Utility Dive in addition to the existing general and technology sources. Run `npm run db:seed:sources` to upsert the configured source list.

When an OpenAI key is configured, new or updated stories receive a structured `StoryAnalysis`. Every possible impact category is independent and nullable. It is rendered only when it has relevant items, evidence passages tied to exact source names, and a confidence score at or above `IMPACT_MIN_CONFIDENCE`. Direct impact is kept separate from indirect transmission chains. Empty sections are omitted completely; the UI does not show “no impact” filler. The model is instructed not to invent tickers, affected companies, causal relationships, numbers, or future events. Without OpenAI, the app stores metadata-only analysis and continues without fabricated effects. Existing stories can be backfilled with the taxonomy using `npm run db:seed:topics`.

The initial source request also included Yahoo Finance, Forbes, and Fortune. Their checked public endpoints returned 429, 404, and 403 responses respectively, so they are not enabled as unverified or blocked feeds. They can be added later when a compliant, usable official feed or public endpoint is identified. The app never bypasses paywalls, CAPTCHAs, robots restrictions, or anti-bot controls.

## News Reel

Open `/news-reel` or select **News Reel** from the dashboard. Choose All News, My Feed, a preset such as IPO, Private Equity, Federal Reserve, or Supply Chain, or multiple classified topics before starting. Exact subtopic filters use `StoryTopic` classification rather than headline substring matching. Stories play one at a time for `NEWS_REEL_DURATION_SECONDS` (20 seconds by default), with a progress bar, source attribution, summary, only the evidence-backed impact sections that passed the threshold, and a link to the full story. Source-diversity ordering prefers different publishers when the queue allows it, while preserving single-source stories. Space pauses or resumes, the left/right arrows navigate, Escape exits, and mobile swipes move between stories. The next image is preloaded and the client checks for newly ingested stories while the reel is playing without interrupting the current slide. A short queue is reported honestly instead of being padded with unrelated stories.

## Production scheduling

The current Vercel account is on the Hobby plan, which rejects hourly Vercel Cron expressions. The app therefore deploys without a Vercel Cron declaration; this does not affect the application routes or the standalone worker. Run `npm run ingest:hourly` as a managed background worker under systemd, Docker, Railway, Render, Fly.io, or a similar service, with automatic restart enabled.

For a serverless hourly trigger on this repository, enable the included GitHub Actions workflow at `.github/workflows/hourly-ingestion.yml`. Configure these repository settings:

- Actions variable `NEWS_APP_URL=https://tichilogin.com`
- Actions secret `CRON_SECRET`, matching the Vercel environment variable of the same name
- Vercel environment variables `DATABASE_URL`, `CRON_SECRET`, and optionally `OPENAI_API_KEY`

The workflow calls `GET /api/ingest` hourly and can also be started manually. Vercel Cron can be restored after upgrading to a Vercel plan that supports hourly schedules. Do not run the hourly worker inside every web-server replica; use one worker or rely on the database lease lock.

Deploy with:

```bash
npm run build
npm run db:migrate
npm run db:migrate:deploy
```

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
npm run db:migrate:deploy # apply committed migrations in production
npm run db:push      # push schema without migration
npm run db:seed      # seed categories, sources, demo content
npm run db:seed:topics # seed topic hierarchy and backfill existing story metadata
npm run db:seed:sources # upsert verified RSS source configuration
npm run db:studio    # Prisma Studio
npm run ingest       # RSS → extraction → clustering → synthesis
npm run ingest:hourly # standalone hourly scheduler/worker
```

## API surface

`GET /api/stories`, `GET /api/stories/:id`, `GET /api/articles/:id`, `GET /api/categories`, `GET /api/sources`, `GET /api/search?q=...`, `GET /api/briefing`, `GET /api/status`, `GET|POST /api/ingest`, `POST /api/summarize`, `GET|POST /api/preferences`, and `GET|POST /api/bookmarks`.

## Deployment and limitations

Build with `npm run build`, provide managed PostgreSQL, run Prisma migrations during deployment, and schedule ingestion. Keep API keys and ingestion secrets server-side. The app can run without OpenAI, but summaries will be limited. Live RSS and end-to-end ingestion require outbound network access and PostgreSQL. Image extraction and article bodies depend on what each publisher publicly delivers.

Production checklist: set `DATABASE_URL` in the Vercel Production environment, apply the Prisma schema with `npm run db:push` (or a named Prisma migration) against that database, and set `CRON_SECRET` for the GitHub Actions hourly workflow. If `DATABASE_URL` is missing, the dashboard deliberately shows no live stories instead of presenting stale seed content, and `/api/stories` cannot query PostgreSQL.
