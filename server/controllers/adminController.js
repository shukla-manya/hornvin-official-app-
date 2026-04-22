const User = require("../models/User");
const { ok, fail } = require("../utils/apiResponse");
const { serializeUser } = require("../utils/serializeUser");

async function listUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    const safe = users.map((u) => serializeUser(u));
    return ok(res, { users: safe });
  } catch (err) {
    console.error(err);
    return fail(res, { message: "Server error", code: "SERVER_ERROR", status: 500 });
  }
}

async function approveUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return fail(res, { message: "User not found", code: "NOT_FOUND", status: 404 });
    }
    if (user.role !== "garage") {
      return fail(res, {
        message: "Only garage accounts use this approval flow",
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    user.status = "approved";
    await user.save();
    return ok(res, {
      message: "User approved",
      user: serializeUser(user),
    });
  } catch (err) {
    console.error(err);
    return fail(res, { message: "Server error", code: "SERVER_ERROR", status: 500 });
  }
}

function normalizePhone(phone) {
  return String(phone).replace(/\s/g, "");
}

async function createDistributor(req, res) {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return fail(res, {
        message: "name, phone, and password are required",
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    const exists = await User.findOne({ phone: normalizePhone(phone) });
    if (exists) {
      return fail(res, {
        message: "Phone already registered",
        code: "CONFLICT",
        status: 409,
      });
    }
    const distributor = await User.create({
      name,
      phone: normalizePhone(phone),
      password,
      role: "distributor",
      status: "approved",
      createdBy: req.user._id,
    });
    return ok(
      res,
      {
        message: "Distributor created",
        user: serializeUser(distributor),
      },
      201
    );
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, {
        message: "Phone already registered",
        code: "CONFLICT",
        status: 409,
      });
    }
    console.error(err);
    return fail(res, { message: "Server error", code: "SERVER_ERROR", status: 500 });
  }
}

module.exports = { listUsers, approveUser, createDistributor };
