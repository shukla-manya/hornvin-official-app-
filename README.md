# Garage B2B

Monorepo layout:

| Folder | Purpose |
|--------|---------|
| **`server/`** | Express + MongoDB API (`package.json`, env, scripts, routes). |
| **`app/`** | Client application (add your app here). |

## API (backend)

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` with `MONGODB_URI`, `JWT_SECRET`, and optional seed variables. Then:

```bash
npm run dev
```

Full API documentation, endpoints, and roles: **[server/README.md](server/README.md)**.
