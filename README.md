# Allo Inventory — Reservation System

A Next.js inventory reservation platform for multi-warehouse retail. Handles the checkout race condition by holding stock for 10 minutes during payment.

## Live Demo

> Deploy URL goes here after deployment

---

## Running Locally

### Prerequisites

- Node.js 20+
- A hosted Postgres database (Supabase, Neon, or Railway — **not local/SQLite**)
- A Redis instance (Upstash works well for free tier)

### 1. Clone and install

```bash
git clone <repo-url>
cd allo-inventory
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
REDIS_URL="rediss://default:password@host:6379"
CRON_SECRET="any-random-string"
```

### 3. Run migrations and seed

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # apply migrations
npm run db:seed       # seed with 6 products, 3 warehouses
```

### 4. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## How Expiry Works in Production

Two layers handle reservation expiry:

**Layer 1 — Vercel Cron (every minute)**  
`vercel.json` schedules `GET /api/cron/expire-reservations` every minute. The endpoint is protected by `CRON_SECRET`. It finds all `PENDING` reservations where `expiresAt < now()`, sets them to `RELEASED`, and decrements `reserved` on the corresponding `StockLevel` rows — in a single DB transaction.

**Layer 2 — Lazy cleanup on read**  
`GET /api/reservations/:id` calls `releaseExpiredReservations()` before fetching, so even if the cron missed a window (cold start, deployment gap), the UI always sees accurate status.

**Why not a long-running background worker?**  
Vercel is serverless — no persistent processes. The cron + lazy read combo covers both the scheduled case and the edge case, with no infrastructure to manage.

---

## Concurrency: How the Race Condition Is Prevented

The core challenge: two customers simultaneously trying to reserve the last unit of a SKU.

**Solution: Redis distributed lock + Postgres transaction**

1. When a reserve request arrives, we acquire a Redis lock keyed on `reserve:{productId}:{warehouseId}` using `SET NX PX` (atomic, expires in 8s).
2. Only one request holds the lock at a time. The other gets a 429 and should retry.
3. Inside the lock, a Postgres transaction reads `totalUnits - reserved` to check availability, then atomically increments `reserved` and creates the `Reservation` row.
4. The lock is released with a Lua script (atomic check-and-delete) to prevent accidental release by a different request.

**Why both Redis and a DB transaction?**  
The DB transaction alone would work on a single Postgres instance (with `SELECT FOR UPDATE`), but a distributed lock prevents thundering-herd problems at scale and keeps the DB transaction short. The combination gives us correctness + performance.

---

## Idempotency (Bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support the `Idempotency-Key` header.

**How it works:**
1. Key is stored as `{endpoint}:{client-key}` in the `IdempotencyKey` table with the full response body and status code.
2. If the same key arrives again (client retry after network error), we return the stored response immediately without re-executing the handler.
3. Keys expire after 24 hours (configurable).
4. Race condition on first write: two simultaneous requests with the same key — the second write will fail with a unique constraint violation, which we catch and ignore. Both requests return the same result.

The frontend generates a fresh key per reserve/confirm attempt using `Date.now()`, so retrying a failed request in a new session doesn't accidentally replay old results.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units. 409 if not enough stock, 429 if lock contention |
| GET | `/api/reservations/:id` | Get reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm reservation. 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |
| GET | `/api/cron/expire-reservations` | Cron endpoint (requires `Authorization: Bearer {CRON_SECRET}`) |

---

## Trade-offs & What I'd Do Differently

**Trade-offs made:**

- **No auth/user accounts** — reservations are accessed directly by ID (UUID-guessability is low enough for a demo; production would need sessions).
- **Redis is required** — if Redis is unavailable, reservations fail. A fallback to `SELECT FOR UPDATE` in Postgres would make the system more resilient, at some throughput cost.
- **Idempotency keys are in Postgres, not Redis** — simpler for a demo; Redis would be faster and auto-expiring.
- **No WebSocket/SSE** — the checkout page doesn't get pushed updates if another session confirms/releases the same reservation. A polling interval or SSE would fix this.

**With more time:**
- Add `SELECT FOR UPDATE SKIP LOCKED` as a Redis fallback
- Use Postgres `LISTEN/NOTIFY` or Pusher for real-time stock updates on the product listing
- Add proper user sessions so reservation history is accessible
- Soft-delete products / archive old reservations
- Rate limiting per IP on the reserve endpoint
- E2E tests with Playwright simulating concurrent reservations

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** + hosted **Postgres** (Supabase/Neon)
- **Redis** (Upstash) for distributed locking
- **Zod** for shared validation schemas
- **Tailwind CSS** for styling
- **Vercel** for hosting + cron jobs
