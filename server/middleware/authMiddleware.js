const User = require("../models/User");
const { verifyToken } = require("../utils/token");
const { fail } = require("../utils/apiResponse");

async function protect(req, res, next) {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }
  if (!token) {
    return fail(res, {
      message: "Not authorized, no token",
      code: "UNAUTHORIZED",
      status: 401,
    });
  }
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return fail(res, {
        message: "User not found",
        code: "UNAUTHORIZED",
        status: 401,
      });
    }
    if (user.status === "pending") {
      return fail(res, {
        message: "Account pending approval",
        code: "ACCOUNT_PENDING",
        status: 403,
      });
    }
    req.user = user;
    next();
  } catch {
    return fail(res, {
      message: "Not authorized, invalid token",
      code: "UNAUTHORIZED",
      status: 401,
    });
  }
}

module.exports = { protect };
