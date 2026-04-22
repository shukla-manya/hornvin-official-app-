require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { connectDB } = require("./config/db");
const { loadOpenApi } = require("./docs/loadOpenApi");
const { ok, fail } = require("./utils/apiResponse");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const distributorRoutes = require("./routes/distributorRoutes");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

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

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Failed to start:", e.message);
    process.exit(1);
  });
