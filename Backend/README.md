# Pharmacy Backend

## Quick Start (Local)

1. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   cd Backend
   pnpm install
   ```

3. Run migrations (creates all tables):
   ```bash
   pnpm run migrate
   ```

4. Run seed once (creates admin user only — all other data is entered manually):
   ```bash
   pnpm run seed
   ```

5. Start dev server:
   ```bash
   pnpm run dev
   ```

---

## Docker (Full Stack)

Run from the **project root** (where `docker-compose.yml` is):

```bash
# First time / after code changes
docker compose build

# Start all services (db, backend, frontend, adminer)
docker compose up

# Run seed manually inside backend container (first time only)
docker compose exec backend npm run seed

# Stop all services
docker compose down

# Stop and delete volume (WARNING: deletes all DB data)
docker compose down -v
```

Adminer (DB viewer): http://localhost:8080
- Server: `db`
- Username / Password / Database: as in your `.env`

---

## Project Structure

```
Backend/
  migrations/     # Ordered SQL migration files (run by migrate.js)
  seeds/          # Seed scripts (admin user only — run manually)
  src/
    migrate.js    # Runs all files in migrations/ in order
    index.js      # Express app entry point
    db.js         # Postgres connection pool
    routes/       # API route handlers
    middleware/   # Auth, error handling
    utils/        # Shared helpers
```

---

## APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, receive JWT |
| GET | `/api/products` | List / search products |
| POST | `/api/products` | Create product |
| POST | `/api/purchases` | Create purchase & batches |
| POST | `/api/sales` | Create sale (FEFO stock) |
| GET | `/api/reports/sales` | Sales report |
| GET | `/api/stock` | Stock report |
