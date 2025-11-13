import type { Linter } from "eslint";

const config: Linter.Config[] = [
  {
    ignores: [
      ".next/**",
      ".vscode/**",
      "public/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },
];

export default config;
