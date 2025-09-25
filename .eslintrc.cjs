/* eslint v8 classic config for Node.js (ESM) */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module", // ✅ index.js가 import/export 사용
  },
  extends: [
    "eslint:recommended",
    "plugin:n/recommended",
    "plugin:import/recommended",
  ],
  plugins: ["n", "import"],
  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "no-console": "off",
    "import/order": ["warn", { "newlines-between": "always" }],
    "n/no-missing-import": "off",
    "n/no-unsupported-features/es-syntax": "off"
  },
  settings: {
    "import/resolver": {
      node: { extensions: [".js", ".cjs", ".mjs", ".json"] }
    }
  }
};
