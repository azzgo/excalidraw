const dotenv = require("dotenv");
const { readFileSync } = require("fs");
const pkg = require("./package.json");
const parseEnvVariables = (filepath) => {
  const envVars = Object.entries(dotenv.parse(readFileSync(filepath))).reduce(
    (env, [key, value]) => {
      env[key] = value;
      return env;
    },
    {},
  );

  // Override with process.env values if they exist
  // This allows command-line environment variables to take precedence
  if (process.env.DISABLE_EMBEDDED !== undefined) {
    envVars.DISABLE_EMBEDDED = process.env.DISABLE_EMBEDDED;
  }
  if (process.env.DISABLE_FONT_CDN !== undefined) {
    envVars.DISABLE_FONT_CDN = process.env.DISABLE_FONT_CDN;
  }

  envVars.PKG_NAME = pkg.name;
  envVars.PKG_VERSION = pkg.version;

  return envVars;
};

module.exports = { parseEnvVariables };
