require("dotenv").config();
const { buildApp } = require("./app");
const { connectDB } = require("./config/db");

const app = buildApp();
const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      const base = `http://localhost:${PORT}`;
      console.log(`Server listening on port ${PORT} — Made with love by Manya Shukla`);
      console.log(`API docs: ${base}/api-docs`);
      console.log(`OpenAPI JSON: ${base}/api-docs.json`);
      console.log(`Home: ${base}/`);
    });
  })
  .catch((e) => {
    console.error("Failed to start:", e.message);
    process.exit(1);
  });
