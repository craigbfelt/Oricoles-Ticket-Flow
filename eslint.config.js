import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // This codebase intentionally uses `any` in a number of UI/data-wrangling
      // spots; enforcing a blanket ban creates hundreds of errors and blocks CI.
      "@typescript-eslint/no-explicit-any": "off",

      // Allow pragmatic TS suppression comments in edge cases.
      // If you want stricter behavior later, switch this to "warn" and require descriptions.
      "@typescript-eslint/ban-ts-comment": "off",

      // Tailwind config (and other tooling) sometimes uses `require()` even in TS.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
