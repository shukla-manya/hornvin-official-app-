const { fail } = require("../utils/apiResponse");

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, {
        message: "Not authorized",
        code: "UNAUTHORIZED",
        status: 401,
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, {
        message: "Forbidden: insufficient role",
        code: "FORBIDDEN",
        status: 403,
      });
    }
    next();
  };
}

module.exports = { requireRoles };
