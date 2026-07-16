import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/.venv/**",
      "**/._*",
      "**/*.config.*",
      "load/k6/**",
      "apps/mobile/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
