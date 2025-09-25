// eslint.config.js (ESLint v9 Flat Config, ESM)
import js from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import pluginN from "eslint-plugin-n";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module", // ✅ ESM(import/export) 사용
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      import: pluginImport,
      n: pluginN,
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "import/order": ["warn", { "newlines-between": "always" }],
      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
    },
    settings: {
      "import/resolver": {
        node: { extensions: [".js", ".cjs", ".mjs", ".json"] },
      },
    },
  },
];
