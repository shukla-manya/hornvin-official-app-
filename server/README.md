# Garage B2B Backend

Role-based **B2B garage marketplace** API built with **Node.js**, **Express**, and **MongoDB** (Mongoose). This folder is the **Day 1 foundation** API package (sibling to `../app/` in the repo): authentication, users, roles, approval workflow for garages, admin tooling, and **OpenAPI / Swagger** documentation for frontend (e.g. Flutter) integration.

The **`app/`** client (for example Flutter) is expected to consume these APIs using JWT in the `Authorization` header.

---

## What this app is

- **Company admin** runs the platform: creates **distributors**, lists users, and **approves** garage accounts.
- **Distributors** are created by admin only (not public self-signup).
- **Garages** are the main B2B users: they can self-register but start as **`pending`** until an admin approves them. Pending garages **cannot log in**.
- **End users** (`user` role) can self-register for optional lighter flows; they are **auto-approved**.

Planned later (not implemented in this codebase yet): products, orders, marketplace, real-time chat (e.g. Socket.IO), invoices, inventory.

---

## Tech stack

| Layer        | Choice                          |
|-------------|----------------------------------|
| Runtime     | Node.js 18+                     |
| HTTP        | Express 4                       |
| Database    | MongoDB + Mongoose 8            |
| Auth        | JWT (`jsonwebtoken`)            |
| Passwords   | bcrypt (hash on save)           |
| Config      | dotenv                          |
| CORS        | cors                            |
| API docs    | OpenAPI 3 YAML + Swagger UI     |

---

## What is done so far (Day 1)

- [x] Express server with JSON body parsing and CORS  
- [x] MongoDB connection (`config/db.js`)  
- [x] **User** model: `name`, `phone`, `password`, `role`, `status`, `createdBy`, timestamps  
- [x] **Register** — public signup for `garage` or `user` only; garage → `pending`; user → `approved` (JWT returned for approved users only)  
- [x] **Login** — phone + password; **blocked** for `pending` garages with error code `ACCOUNT_PENDING`  
- [x] **JWT** payload: `userId`, `role`  
- [x] **Auth middleware** — verifies Bearer token; blocks `pending` accounts on protected routes  
- [x] **Role middleware** — restrict routes by role (`admin`, `distributor`, …)  
- [x] **GET `/api/auth/me`** — current user (protected)  
- [x] **Admin**: list all users, approve garage, create distributor (with `createdBy`)  
- [x] **Sample distributor route**: `GET /api/distributor/ping`  
- [x] **Unified API responses**: `{ success, data }` / `{ success, message, code }`  
- [x] **Public user shape** for JSON: `id`, `name`, `phone`, `role`, `status`, `createdBy`, timestamps (no password)  
- [x] **OpenAPI** spec: `docs/openapi.yaml`  
- [x] **Swagger UI**: `/api-docs` and raw JSON at `/api-docs.json`  
- [x] **Health**: `GET /health` and `GET /api/health`  
- [x] **Seed script** for first super admin: `npm run seed:admin`  

---

## Project structure

This package lives in the repo’s `server/` directory (sibling to `app/`).

```
server/
├── server.js                 # App entry: middleware, routes, Swagger, listen
├── package.json
├── .env.example
├── README.md
├── scripts/
│   └── seedAdmin.js          # Creates super admin if phone not taken
├── config/
│   └── db.js                 # Mongoose connect
├── docs/
│   ├── openapi.yaml          # OpenAPI 3 contract (source of truth for FE)
│   └── loadOpenApi.js        # Loads YAML for Swagger + /api-docs.json
├── models/
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   └── distributorRoutes.js
├── controllers/
│   ├── authController.js
│   └── adminController.js
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
└── utils/
    ├── apiResponse.js        # ok() / fail() helpers
    ├── serializeUser.js      # API-facing user object
    └── token.js              # JWT sign/verify
```

---

## Quick start

### Prerequisites

- Node.js **18+**  
- MongoDB running locally or **MongoDB Atlas** URI  

### Install

From the repository root:

```bash
cd server
npm install
```

### Environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default **8000**) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | Secret for signing JWTs (use a long random value in production) |
| `JWT_EXPIRES_IN` | Optional JWT expiry (default `7d`) |
| `SEED_ADMIN_*` | Used only by `npm run seed:admin` |

### Create super admin (once)

```bash
npm run seed:admin
```

Uses `SEED_ADMIN_PHONE`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` from `.env`. Skips if that phone already exists.

### Run

```bash
npm run dev    
# or
npm start
```

Server listens on `http://localhost:8000` by default (or your `PORT`).

---

## API documentation (Swagger)

After the server is running:

| Resource | URL |
|----------|-----|
| **Swagger UI** | [http://localhost:8000/api-docs](http://localhost:8000/api-docs) |
| **OpenAPI JSON** | [http://localhost:8000/api-docs.json](http://localhost:8000/api-docs.json) |

The spec lists request bodies, success payloads, and common errors. **Try it out** works against your local server.

**API base path (for clients):** `http://localhost:8000/api`

Example full URLs:

- `POST http://localhost:8000/api/auth/register`  
- `POST http://localhost:8000/api/auth/login`  
- `GET  http://localhost:8000/api/auth/me`  

---

## Roles and business rules

| Role | Notes |
|------|--------|
| `admin` | Full admin routes; seed creates the first admin. |
| `distributor` | Created only via `POST /api/admin/distributors` (approved immediately, `createdBy` set). |
| `garage` | Main B2B user; self-register → **`pending`** until `PATCH /api/admin/users/:id/approve`. |
| `user` | Self-register → **`approved`**; optional end-user flows. |

Rules enforced in code:

- Public **register** accepts only **`garage`** and **`user`** roles.  
- **Login** and **JWT-protected** routes reject **`pending`** users (`ACCOUNT_PENDING` / `UNAUTHORIZED` as applicable).  
- **Admin** routes require a valid JWT and role `admin`.  

---

## Response format

**Success**

```json
{
  "success": true,
  "data": { }
}
```

**Error**

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "MACHINE_CODE"
}
```

Common `code` values: `ACCOUNT_PENDING`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `SERVER_ERROR`.

---

## User object (what the frontend should expect)

This is the **API contract** (not the raw Mongo document). Password is never returned.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | User id |
| `name` | string | Display name |
| `phone` | string | Unique login identifier |
| `role` | string | `admin` \| `distributor` \| `garage` \| `user` |
| `status` | string | `pending` \| `approved` |
| `createdBy` | string \| null | Admin id when created by admin (e.g. distributor) |
| `createdAt` | string (ISO) | From Mongoose timestamps |
| `updatedAt` | string (ISO) | From Mongoose timestamps |

---

## Authentication (for Flutter / any client)

1. **Login** with `POST /api/auth/login` → read `data.token` and `data.user`.  
2. Store the token securely (e.g. secure storage).  
3. Send on every protected request:

   `Authorization: Bearer <token>`

4. If login returns **403** with `code: ACCOUNT_PENDING`, show a **waiting for approval** screen for garages.  
5. If the API returns **401** with `code: UNAUTHORIZED`, treat as logged out / invalid token and send the user to login.  

---

## Endpoint summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness (`success` envelope) |
| GET | `/api/health` | — | Same, under `/api` prefix |
| POST | `/api/auth/register` | — | Register `garage` or `user` |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/admin/users` | Bearer, admin | List users |
| PATCH | `/api/admin/users/:id/approve` | Bearer, admin | Approve a **garage** |
| POST | `/api/admin/distributors` | Bearer, admin | Create **distributor** |
| GET | `/api/distributor/ping` | Bearer, distributor | Sample gated route |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run server |
| `npm run dev` | Run with `--watch` |
| `npm run seed:admin` | Insert super admin if missing |

---

## Testing

- Use **Swagger UI** at `/api-docs` for interactive tests.  
- Or use **Postman** / **Insomnia** with the same URLs and the Bearer token from login.  

Suggested checks:

1. Register a **garage** → `pending`, no token (or `token: null` in `data`).  
2. Try **login** as that garage → **403** + `ACCOUNT_PENDING`.  
3. Login as **admin** → approve garage → garage can **login** and call **`/api/auth/me`**.  
4. Call protected routes **without** header → **401**.  

---

## Roadmap (not built yet)

- Products, catalog, images  
- Orders (stock + marketplace)  
- Real-time chat (Socket.IO)  
- Invoices and inventory modules  
- OTP / refresh tokens (if product requires)  

---


