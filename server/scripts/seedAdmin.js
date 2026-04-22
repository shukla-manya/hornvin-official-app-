require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  const phone = process.env.SEED_ADMIN_PHONE;
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!phone || !password) {
    console.error("Set SEED_ADMIN_PHONE and SEED_ADMIN_PASSWORD in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const existing = await User.findOne({ phone: String(phone).replace(/\s/g, "") });
  if (existing) {
    console.log("Admin with this phone already exists. Skipping.");
    await mongoose.disconnect();
    return;
  }
  await User.create({
    name,
    phone: String(phone).replace(/\s/g, ""),
    password,
    role: "admin",
    status: "approved",
    createdBy: null,
  });
  console.log("Super admin created:", phone);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
