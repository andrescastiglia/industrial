import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  getCompraEstadoLabel,
  getOrdenProduccionEstadoLabel,
  getVentaEstadoLabel,
  normalizeCompraEstado,
  normalizeOrdenProduccionEstado,
  normalizeVentaEstado,
} from "@/lib/business-constants";

describe("business-constants.ts", () => {
  describe("auth constants", () => {
    it("uses the unified auth cookie contract", () => {
      expect(AUTH_COOKIE_NAME).toBe("token");
      expect(AUTH_COOKIE_MAX_AGE_SECONDS).toBe(900);
    });
  });

  describe("normalizeCompraEstado", () => {
    it("normalizes canonical and legacy purchase states", () => {
      expect(normalizeCompraEstado("pendiente")).toBe("pendiente");
      expect(normalizeCompraEstado("Pendiente")).toBe("pendiente");
      expect(normalizeCompraEstado("Recibida")).toBe("recibida");
      expect(normalizeCompraEstado(" cancelada ")).toBe("cancelada");
    });

    it("returns null for invalid values", () => {
      expect(normalizeCompraEstado("desconocido")).toBeUndefined();
    });
  });

  describe("normalizeOrdenProduccionEstado", () => {
    it("maps legacy production states to the real contract", () => {
      expect(normalizeOrdenProduccionEstado("Planificada")).toBe("pendiente");
      expect(normalizeOrdenProduccionEstado("En Proceso")).toBe("en_proceso");
      expect(normalizeOrdenProduccionEstado("Pausada")).toBe("en_proceso");
      expect(normalizeOrdenProduccionEstado("Completada")).toBe("completada");
      expect(normalizeOrdenProduccionEstado("cancelada")).toBe("cancelada");
    });

    it("returns null when the state is not recognized", () => {
      expect(normalizeOrdenProduccionEstado("bloqueada")).toBeUndefined();
    });
  });

  describe("normalizeVentaEstado", () => {
    it("maps legacy sales states to the canonical contract", () => {
      expect(normalizeVentaEstado("Cotización")).toBe("cotizacion");
      expect(normalizeVentaEstado("Confirmada")).toBe("confirmada");
      expect(normalizeVentaEstado("En Producción")).toBe("en_produccion");
      expect(normalizeVentaEstado("Lista")).toBe("lista");
      expect(normalizeVentaEstado("Entregada")).toBe("entregada");
      expect(normalizeVentaEstado("cancelada")).toBe("cancelada");
    });

    it("returns null for unsupported sales states", () => {
      expect(normalizeVentaEstado("pagada")).toBeUndefined();
    });
  });

  describe("label getters", () => {
    it("returns human-friendly labels for normalized values", () => {
      expect(getCompraEstadoLabel("pendiente")).toBe("Pendiente");
      expect(getOrdenProduccionEstadoLabel("en_proceso")).toBe("En Proceso");
      expect(getVentaEstadoLabel("cotizacion")).toBe("Cotización");
    });

    it("falls back to the original value when it cannot normalize", () => {
      expect(getCompraEstadoLabel("custom")).toBe("custom");
      expect(getOrdenProduccionEstadoLabel("custom")).toBe("custom");
      expect(getVentaEstadoLabel("custom")).toBe("custom");
    });
  });
});
