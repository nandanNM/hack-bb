import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["dist", "eslint.config.js", "node_modules", "migrations", "*.log"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  importPlugin.flatConfigs.warnings,
  {
    rules: {
      "no-console": "warn",
      "no-duplicate-imports": "error",
      "no-useless-assignment": "warn",
      "import/no-unresolved": "off",
      "import/order": [
        "error",
        {
          groups: [["builtin", "external", "internal"], ["parent", "sibling", "index", "object"], "type"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          named: {
            enabled: true,
            types: "types-last",
          },
        },
      ],
    },
  },
];
