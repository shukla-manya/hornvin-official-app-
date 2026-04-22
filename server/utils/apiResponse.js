function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, { message, code, status = 400 }) {
  return res.status(status).json({ success: false, message, code });
}

module.exports = { ok, fail };
