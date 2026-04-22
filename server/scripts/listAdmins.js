require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const admins = await User.find({ role: "admin" })
    .select("name phone role status createdAt")
    .sort({ createdAt: 1 })
    .lean();
  if (!admins.length) {
    console.log("No admin users found. Run: npm run seed:admin");
  } else {
    console.log(JSON.stringify(admins, null, 2));
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
