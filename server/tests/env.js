process.env.NODE_ENV = "test";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-for-automated-api-tests-only";
}
process.env.JWT_EXPIRES_IN = "1h";
