Pharmacy backend (scaffold)

Quick start

1. Copy `.env.example` to `.env` and update values.
2. Install dependencies:

```bash
cd Backend
npm install
```

3. Create the Postgres database and run the SQL in `src/models/migrations.sql`.
4. Start server:

```bash
npm run dev
```

APIs
- `POST /api/auth/login` - login and receive JWT
- `POST /api/products` - create product
- `GET /api/products` - list/search products
- `POST /api/purchases` - create purchase & batches
- `POST /api/sales` - create sale (consumes batch-level stock FEFO)
