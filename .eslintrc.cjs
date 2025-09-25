/* eslint v8 classic config for Node.js */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "script", // index.js가 CommonJS라면 "script"
  },
  extends: [
    "eslint:recommended",
    "plugin:n/recommended",
    "plugin:import/recommended",
  ],
  plugins: ["n", "import"],
  rules: {
    // 팀 규칙(원하면 조정)
    "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "no-console": "off",
    "import/order": ["warn", { "newlines-between": "always" }],
    "n/no-missing-import": "off", // CommonJS require 사용 시 false-positive 방지
    "n/no-unsupported-features/es-syntax": "off",
  },
  settings: {
    "import/resolver": {
      node: { extensions: [".js", ".cjs", ".mjs", ".json"] },
    },
  },
};
