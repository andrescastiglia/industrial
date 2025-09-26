import eslintPlugin from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import type { Linter } from "eslint";

const compat = new FlatCompat();

const eslintConfig = [
  {
    name: "custom/eslint/recommended",
    files: ["**/*.ts?(x)"],
    ...eslintPlugin.configs.recommended,
  },
];

const ignoresConfig = [
  {
    name: "custom/eslint/ignores",
    // the ignores option needs to be in a separate configuration object
    // replaces the .eslintignore file
    ignores: [".next/", ".vscode/", "public/"],
  },
] as Linter.Config[];

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...eslintConfig,
  ...ignoresConfig,
] satisfies Linter.Config[];
