const User = require("../models/User");
const { signToken } = require("../utils/token");
const { ok, fail } = require("../utils/apiResponse");
const { serializeUser } = require("../utils/serializeUser");

function normalizePhone(phone) {
  return String(phone).replace(/\s/g, "");
}

async function register(req, res) {
  try {
    const { name, phone, password, role: requestedRole } = req.body;
    if (!name || !phone || !password) {
      return fail(res, {
        message: "name, phone, and password are required",
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    const role = requestedRole || "garage";
    if (!["garage", "user"].includes(role)) {
      return fail(res, {
        message: "Self-registration is only allowed for roles: garage, user",
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
    const status = role === "user" ? "approved" : "pending";
    const user = await User.create({
      name,
      phone: normalizePhone(phone),
      password,
      role,
      status,
      createdBy: null,
    });
    const payload = { userId: user._id.toString(), role: user.role };
    const data = {
      user: serializeUser(user),
      token: status === "approved" ? signToken(payload) : null,
    };
    return ok(res, data, 201);
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

async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return fail(res, {
        message: "phone and password are required",
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    const user = await User.findOne({ phone: normalizePhone(phone) }).select("+password");
    if (!user) {
      return fail(res, {
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        status: 401,
      });
    }
    const passwordOk = await user.comparePassword(password);
    if (!passwordOk) {
      return fail(res, {
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        status: 401,
      });
    }
    if (user.status === "pending") {
      return fail(res, {
        message: "Account pending approval. Contact admin.",
        code: "ACCOUNT_PENDING",
        status: 403,
      });
    }
    const token = signToken({ userId: user._id.toString(), role: user.role });
    return ok(res, {
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error(err);
    return fail(res, { message: "Server error", code: "SERVER_ERROR", status: 500 });
  }
}

async function me(req, res) {
  return ok(res, { user: serializeUser(req.user) });
}

module.exports = { register, login, me };
