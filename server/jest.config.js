/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/env.js"],
  testTimeout: 120000,
  forceExit: true,
  detectOpenHandles: true,
};
