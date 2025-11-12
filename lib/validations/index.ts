/**
 * Validation Schemas Index
 * Central export point for all validation schemas
 */

// Common validation utilities
export * from "./common";

// Entity-specific schemas
export * from "./clientes";
export * from "./productos";
export * from "./materia-prima";
export * from "./ordenes-produccion";
export * from "./proveedores";
export * from "./operarios";
export * from "./ventas";
export * from "./compras";

// Re-export for convenience
export { z } from "zod";
