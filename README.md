# Pharmacy (Dockerized)

Quick steps so a collaborator can run everything with Docker (no SQL dumps needed).

1. Copy the backend example env and set strong secrets (do NOT commit this file):

```powershell
Copy-Item Backend\.env.example Backend\.env
# then edit Backend\.env to set strong values for POSTGRES_PASSWORD and JWT_SECRET
```

2. Build and start all services:

```bash
docker-compose up --build
```

3. Access the apps:
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:5000
- DB UI (Adminer): http://localhost:8080 — use `user` / password from `Backend/.env` and database `pharmacy_db`.

Notes
- The compose setup starts a Postgres container and persists data to a Docker volume so you don't need dumps.
- Never commit `Backend/.env` or real secrets — use environment variables or secrets in production.
