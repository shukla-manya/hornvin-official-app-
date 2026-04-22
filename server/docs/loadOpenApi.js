const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

function loadOpenApi() {
  const filePath = path.join(__dirname, "openapi.yaml");
  return YAML.parse(fs.readFileSync(filePath, "utf8"));
}

module.exports = { loadOpenApi };
