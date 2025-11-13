/**
 * Tests para el módulo de utilidades
 * Verifica la función cn() para combinar clases CSS
 */

import { cn } from "@/lib/utils";

describe("utils.ts", () => {
  describe("cn()", () => {
    it("should merge single class name", () => {
      const result = cn("text-red-500");
      expect(result).toBe("text-red-500");
    });

    it("should merge multiple class names", () => {
      const result = cn("text-red-500", "bg-blue-200");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-200");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toContain("base-class");
      expect(result).toContain("active-class");
    });

    it("should filter out false/null/undefined values", () => {
      const result = cn(
        "text-red-500",
        false && "hidden",
        null,
        undefined,
        "bg-blue-200"
      );
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-200");
      expect(result).not.toContain("hidden");
    });

    it("should handle array of classes", () => {
      const result = cn(["text-red-500", "bg-blue-200"]);
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-200");
    });

    it("should merge conflicting Tailwind classes", () => {
      // twMerge debe resolver conflictos de Tailwind
      const result = cn("px-2 py-1", "px-4");
      // px-4 debería prevalecer sobre px-2
      expect(result).toContain("px-4");
      expect(result).not.toContain("px-2");
      expect(result).toContain("py-1");
    });

    it("should handle objects with boolean values", () => {
      const result = cn({
        "text-red-500": true,
        "bg-blue-200": false,
        "font-bold": true,
      });
      expect(result).toContain("text-red-500");
      expect(result).toContain("font-bold");
      expect(result).not.toContain("bg-blue-200");
    });

    it("should handle mixed input types", () => {
      const result = cn(
        "base",
        ["array-1", "array-2"],
        { conditional: true },
        false && "hidden",
        "final"
      );
      expect(result).toContain("base");
      expect(result).toContain("array-1");
      expect(result).toContain("array-2");
      expect(result).toContain("conditional");
      expect(result).toContain("final");
    });

    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle empty strings", () => {
      const result = cn("", "text-red-500", "");
      expect(result).toBe("text-red-500");
    });

    it("should trim whitespace", () => {
      const result = cn("  text-red-500  ", "  bg-blue-200  ");
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });

    it("should handle complex Tailwind utilities", () => {
      const result = cn(
        "hover:bg-blue-500",
        "focus:ring-2",
        "md:text-lg",
        "dark:bg-gray-800"
      );
      expect(result).toContain("hover:bg-blue-500");
      expect(result).toContain("focus:ring-2");
      expect(result).toContain("md:text-lg");
      expect(result).toContain("dark:bg-gray-800");
    });
  });
});
