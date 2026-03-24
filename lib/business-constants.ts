export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 15;

export const COMPRA_ESTADOS = ["pendiente", "recibida", "cancelada"] as const;

export const ORDEN_PRODUCCION_ESTADOS = [
  "pendiente",
  "en_proceso",
  "completada",
  "cancelada",
] as const;

export const VENTA_ESTADOS = [
  "cotizacion",
  "confirmada",
  "en_produccion",
  "lista",
  "entregada",
  "cancelada",
] as const;

export type CompraEstado = (typeof COMPRA_ESTADOS)[number];
export type OrdenProduccionEstado = (typeof ORDEN_PRODUCCION_ESTADOS)[number];
export type VentaEstado = (typeof VENTA_ESTADOS)[number];
type NormalizableValue = string | null | undefined;

const COMPRA_ESTADO_LABELS: Record<CompraEstado, string> = {
  pendiente: "Pendiente",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

const ORDEN_PRODUCCION_ESTADO_LABELS: Record<OrdenProduccionEstado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const VENTA_ESTADO_LABELS: Record<VentaEstado, string> = {
  cotizacion: "Cotización",
  confirmada: "Confirmada",
  en_produccion: "En Producción",
  lista: "Lista",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

function normalizeKey(value: NormalizableValue): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function normalizeCompraEstado(
  value: NormalizableValue
): CompraEstado | undefined {
  const normalized = normalizeKey(value);

  switch (normalized) {
    case "pendiente":
      return "pendiente";
    case "recibida":
      return "recibida";
    case "cancelada":
      return "cancelada";
    default:
      return undefined;
  }
}

export function normalizeOrdenProduccionEstado(
  value: NormalizableValue
): OrdenProduccionEstado | undefined {
  const normalized = normalizeKey(value);

  switch (normalized) {
    case "pendiente":
    case "planificada":
      return "pendiente";
    case "en_proceso":
    case "enproceso":
    case "pausada":
      return "en_proceso";
    case "completada":
      return "completada";
    case "cancelada":
      return "cancelada";
    default:
      return undefined;
  }
}

export function normalizeVentaEstado(
  value: NormalizableValue
): VentaEstado | undefined {
  const normalized = normalizeKey(value);

  switch (normalized) {
    case "cotizacion":
      return "cotizacion";
    case "confirmada":
      return "confirmada";
    case "en_produccion":
      return "en_produccion";
    case "lista":
      return "lista";
    case "entregada":
      return "entregada";
    case "cancelada":
      return "cancelada";
    default:
      return undefined;
  }
}

export function getCompraEstadoLabel(value: NormalizableValue): string {
  const normalized = normalizeCompraEstado(value);
  return normalized ? COMPRA_ESTADO_LABELS[normalized] : value || "Sin estado";
}

export function getOrdenProduccionEstadoLabel(
  value: NormalizableValue
): string {
  const normalized = normalizeOrdenProduccionEstado(value);
  return normalized
    ? ORDEN_PRODUCCION_ESTADO_LABELS[normalized]
    : value || "Sin estado";
}

export function getVentaEstadoLabel(value: NormalizableValue): string {
  const normalized = normalizeVentaEstado(value);
  return normalized ? VENTA_ESTADO_LABELS[normalized] : value || "Sin estado";
}
