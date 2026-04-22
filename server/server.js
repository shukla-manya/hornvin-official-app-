require("dotenv").config();
const { buildApp } = require("./app");
const { connectDB } = require("./config/db");

const app = buildApp();
const PORT = process.env.PORT || 8000;

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
