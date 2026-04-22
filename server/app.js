const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { loadOpenApi } = require("./docs/loadOpenApi");
const { ok, fail } = require("./utils/apiResponse");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const distributorRoutes = require("./routes/distributorRoutes");

function buildApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    const host = req.get("host") || "localhost:8000";
    const proto = req.protocol === "https" ? "https" : "http";
    const base = `${proto}://${host}`;
    const docsUrl = `${base}/api-docs`;
    const openApiUrl = `${base}/api-docs.json`;
    const apiBase = `${base}/api`;
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Garage B2B API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.5; color: #1a1a1a; }
    h1 { font-size: 1.35rem; font-weight: 600; }
    p.credit { color: #444; margin-top: 2rem; font-size: 0.95rem; }
    ul { padding-left: 1.2rem; }
    a { color: #0b57d0; }
  </style>
</head>
<body>
  <h1>Garage B2B API</h1>
  <p>This service is running here. Explore and try requests in the interactive docs.</p>
  <ul>
    <li><a href="${docsUrl}">API documentation (Swagger UI)</a></li>
    <li><a href="${openApiUrl}">OpenAPI JSON</a> — for Postman / codegen</li>
    <li>REST base path: <code>${apiBase}</code></li>
  </ul>
  <p class="credit">Made with love by Manya Shukla</p>
</body>
</html>`);
  });

  const healthPayload = { ok: true, service: "garage-b2b-backend" };

  app.get("/health", (req, res) => {
    ok(res, healthPayload);
  });

  app.get("/api/health", (req, res) => {
    ok(res, healthPayload);
  });

  const openApiDocument = loadOpenApi();
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));
  app.get("/api-docs.json", (req, res) => {
    res.json(openApiDocument);
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/distributor", distributorRoutes);

  app.use((req, res) => {
    fail(res, { message: "Not found", code: "NOT_FOUND", status: 404 });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    fail(res, { message: "Server error", code: "SERVER_ERROR", status: 500 });
  });

  return app;
}

module.exports = { buildApp };
