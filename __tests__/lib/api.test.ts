/**
 * Tests para el módulo ApiClient
 * Verifica las llamadas HTTP y manejo de errores del cliente API
 */

import { apiClient } from "@/lib/api";
import type { Dashboard } from "@/lib/dashboard";
import type {
  Cliente,
  Producto,
  MateriaPrima,
  Proveedor,
  Operario,
  OrdenProduccion,
  OrdenVenta,
  Compra,
  TipoComponente,
  ComponenteProducto,
} from "@/lib/database";

// Mock de fetch global
global.fetch = jest.fn();

describe("api.ts - ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper para mockear respuestas exitosas
  const mockSuccessResponse = <T>(data: T) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => data,
      status: 200,
    });
  };

  // Helper para mockear respuestas de error
  const mockErrorResponse = (status: number, error?: string) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ error: error || "Error" }),
    });
  };

  describe("getDashboard()", () => {
    it("should fetch dashboard data successfully", async () => {
      const mockDashboard: Dashboard = {
        operariosActivos: 5,
        clientes: 10,
        proveedores: 8,
        comprasMes: 15,
        ventasMes: 20,
        ordenesPendientes: 3,
        ultimaOrden: "2 días",
        ultimaCompra: "1 día",
        alertas: [],
      };

      mockSuccessResponse(mockDashboard);

      const result = await apiClient.getDashboard();

      expect(result).toEqual(mockDashboard);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/dashboard",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should throw error when dashboard fetch fails", async () => {
      mockErrorResponse(500, "Server error");

      await expect(apiClient.getDashboard()).rejects.toThrow();
    });
  });

  describe("Clientes API", () => {
    const mockCliente: Cliente = {
      cliente_id: 1,
      nombre: "Test Cliente",
      contacto: "John Doe",
      direccion: "Test Address",
      telefono: "123456789",
      email: "test@example.com",
    };

    it("should get all clientes", async () => {
      const mockClientes = [mockCliente];
      mockSuccessResponse(mockClientes);

      const result = await apiClient.getClientes();

      expect(result).toEqual(mockClientes);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/clientes",
        expect.any(Object)
      );
    });

    it("should get cliente by id", async () => {
      mockSuccessResponse(mockCliente);

      const result = await apiClient.getClienteById(1);

      expect(result).toEqual(mockCliente);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/clientes/1",
        expect.any(Object)
      );
    });

    it("should create new cliente", async () => {
      mockSuccessResponse(mockCliente);

      const result = await apiClient.createCliente(mockCliente);

      expect(result).toEqual(mockCliente);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/clientes",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(mockCliente),
        })
      );
    });

    it("should update existing cliente", async () => {
      mockSuccessResponse(mockCliente);

      const result = await apiClient.updateCliente(1, mockCliente);

      expect(result).toEqual(mockCliente);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/clientes/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(mockCliente),
        })
      );
    });

    it("should delete cliente", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteCliente(1);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/clientes/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Productos API", () => {
    const mockProducto: Producto = {
      producto_id: 1,
      nombre_modelo: "Test Producto",
      descripcion: "Test description",
      ancho: 100,
      alto: 200,
      color: "blanco",
      tipo_accionamiento: "manual",
    };

    const mockComponente: ComponenteProducto = {
      producto_id: 1,
      materia_prima_id: 1,
      cantidad_necesaria: 5,
      angulo_corte: "45",
    };

    it("should get all productos", async () => {
      mockSuccessResponse([mockProducto]);

      const result = await apiClient.getProductos();

      expect(result).toEqual([mockProducto]);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/productos",
        expect.any(Object)
      );
    });

    it("should get producto by id", async () => {
      mockSuccessResponse(mockProducto);

      const result = await apiClient.getProductoById(1);

      expect(result).toEqual(mockProducto);
    });

    it("should create producto with componentes", async () => {
      mockSuccessResponse(mockProducto);

      const result = await apiClient.createProducto(mockProducto, [
        mockComponente,
      ]);

      expect(result).toEqual(mockProducto);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.componentes).toEqual([mockComponente]);
    });

    it("should update producto with componentes", async () => {
      mockSuccessResponse(mockProducto);

      const result = await apiClient.updateProducto(1, mockProducto, [
        mockComponente,
      ]);

      expect(result).toEqual(mockProducto);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.componentes).toEqual([mockComponente]);
    });

    it("should delete producto", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteProducto(1);

      expect(result).toBe(true);
    });
  });

  describe("Materia Prima API", () => {
    const mockMateriaPrima: MateriaPrima = {
      materia_prima_id: 1,
      nombre: "Test Material",
      descripcion: "Test description",
      referencia_proveedor: "REF-001",
      unidad_medida: "metros",
      stock_actual: 100,
      punto_pedido: 20,
      tiempo_entrega_dias: 7,
      longitud_estandar_m: 6,
      color: "blanco",
      id_tipo_componente: 1,
    };

    it("should get all materia prima", async () => {
      mockSuccessResponse([mockMateriaPrima]);

      const result = await apiClient.getMateriaPrima();

      expect(result).toEqual([mockMateriaPrima]);
    });

    it("should get materia prima by id", async () => {
      mockSuccessResponse(mockMateriaPrima);

      const result = await apiClient.getMateriaPrimaById(1);

      expect(result).toEqual(mockMateriaPrima);
    });

    it("should create materia prima", async () => {
      mockSuccessResponse(mockMateriaPrima);

      const result = await apiClient.createMateriaPrima(mockMateriaPrima);

      expect(result).toEqual(mockMateriaPrima);
    });

    it("should update materia prima", async () => {
      mockSuccessResponse(mockMateriaPrima);

      const result = await apiClient.updateMateriaPrima(1, mockMateriaPrima);

      expect(result).toEqual(mockMateriaPrima);
    });

    it("should delete materia prima", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteMateriaPrima(1);

      expect(result).toBe(true);
    });
  });

  describe("Proveedores API", () => {
    const mockProveedor: Proveedor = {
      proveedor_id: 1,
      nombre: "Test Proveedor",
      contacto: "Contact Name",
      direccion: "Test Address",
      telefono: "123456789",
      email: "proveedor@test.com",
      cuit: "20-12345678-9",
    };

    it("should get all proveedores", async () => {
      mockSuccessResponse([mockProveedor]);

      const result = await apiClient.getProveedores();

      expect(result).toEqual([mockProveedor]);
    });

    it("should get proveedor by id", async () => {
      mockSuccessResponse(mockProveedor);

      const result = await apiClient.getProveedorById(1);

      expect(result).toEqual(mockProveedor);
    });

    it("should create proveedor", async () => {
      mockSuccessResponse(mockProveedor);

      const result = await apiClient.createProveedor(mockProveedor);

      expect(result).toEqual(mockProveedor);
    });

    it("should update proveedor", async () => {
      mockSuccessResponse(mockProveedor);

      const result = await apiClient.updateProveedor(1, mockProveedor);

      expect(result).toEqual(mockProveedor);
    });

    it("should delete proveedor", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteProveedor(1);

      expect(result).toBe(true);
    });
  });

  describe("Operarios API", () => {
    const mockOperario: Operario = {
      operario_id: 1,
      nombre: "Juan",
      apellido: "Pérez",
      rol: "Operador",
    };

    it("should get all operarios", async () => {
      mockSuccessResponse([mockOperario]);

      const result = await apiClient.getOperarios();

      expect(result).toEqual([mockOperario]);
    });

    it("should get operario by id", async () => {
      mockSuccessResponse(mockOperario);

      const result = await apiClient.getOperarioById(1);

      expect(result).toEqual(mockOperario);
    });

    it("should create operario", async () => {
      mockSuccessResponse(mockOperario);

      const result = await apiClient.createOperario(mockOperario);

      expect(result).toEqual(mockOperario);
    });

    it("should update operario", async () => {
      mockSuccessResponse(mockOperario);

      const result = await apiClient.updateOperario(1, mockOperario);

      expect(result).toEqual(mockOperario);
    });

    it("should delete operario", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteOperario(1);

      expect(result).toBe(true);
    });
  });

  describe("Órdenes de Producción API", () => {
    const mockOrden: OrdenProduccion = {
      orden_produccion_id: 1,
      producto_id: 1,
      cantidad_a_producir: 10,
      fecha_creacion: new Date("2024-01-01"),
      fecha_fin_estimada: new Date("2024-01-10"),
      estado: "pendiente",
    };

    it("should get all ordenes produccion", async () => {
      mockSuccessResponse([mockOrden]);

      const result = await apiClient.getOrdenesProduccion();

      expect(result).toEqual([mockOrden]);
    });

    it("should get orden produccion by id", async () => {
      mockSuccessResponse(mockOrden);

      const result = await apiClient.getOrdenProduccion(1);

      expect(result).toEqual(mockOrden);
    });

    it("should create orden produccion", async () => {
      mockSuccessResponse(mockOrden);

      const result = await apiClient.createOrdenProduccion(mockOrden);

      expect(result).toEqual(mockOrden);
    });

    it("should update orden produccion", async () => {
      mockSuccessResponse(mockOrden);

      const result = await apiClient.updateOrdenProduccion(1, mockOrden);

      expect(result).toEqual(mockOrden);
    });

    it("should delete orden produccion", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteOrdenProduccion(1);

      expect(result).toBe(true);
    });
  });

  describe("Ventas API", () => {
    const mockVenta: OrdenVenta = {
      orden_venta_id: 1,
      cliente_id: 1,
      fecha_pedido: new Date("2024-01-01"),
      fecha_entrega_estimada: new Date("2024-01-15"),
      estado: "pendiente",
    };

    it("should get all ventas", async () => {
      mockSuccessResponse([mockVenta]);

      const result = await apiClient.getVentas();

      expect(result).toEqual([mockVenta]);
    });

    it("should create venta", async () => {
      mockSuccessResponse(mockVenta);

      const result = await apiClient.createVenta(mockVenta);

      expect(result).toEqual(mockVenta);
    });

    it("should delete venta", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteVenta(1);

      expect(result).toBe(true);
    });
  });

  describe("Compras API", () => {
    const mockCompra: Compra = {
      compra_id: 1,
      proveedor_id: 1,
      fecha_pedido: new Date("2024-01-01"),
      fecha_recepcion_estimada: new Date("2024-01-10"),
      estado: "pendiente",
      total_compra: 1000,
      cotizacion_ref: "COT-001",
    };

    it("should get all compras", async () => {
      mockSuccessResponse([mockCompra]);

      const result = await apiClient.getCompras();

      expect(result).toEqual([mockCompra]);
    });

    it("should create compra", async () => {
      mockSuccessResponse(mockCompra);

      const result = await apiClient.createCompra(mockCompra);

      expect(result).toEqual(mockCompra);
    });

    it("should update compra", async () => {
      mockSuccessResponse(mockCompra);

      const result = await apiClient.updateCompra(1, mockCompra);

      expect(result).toEqual(mockCompra);
    });

    it("should delete compra", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await apiClient.deleteCompra(1);

      expect(result).toBe(true);
    });
  });

  describe("Tipos de Componente API", () => {
    const mockTipo: TipoComponente = {
      tipo_componente_id: 1,
      nombre_tipo: "Perfil",
    };

    it("should get all tipos componente", async () => {
      mockSuccessResponse([mockTipo]);

      const result = await apiClient.getTiposComponente();

      expect(result).toEqual([mockTipo]);
    });

    it("should create tipo componente", async () => {
      mockSuccessResponse(mockTipo);

      const result = await apiClient.createTipoComponente(mockTipo);

      expect(result).toEqual(mockTipo);
    });
  });

  describe("Error Handling", () => {
    it("should throw error with message when response is not ok", async () => {
      mockErrorResponse(404, "Resource not found");

      await expect(apiClient.getClientes()).rejects.toThrow(
        "Resource not found"
      );
    });

    it("should throw generic error when no error message provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(apiClient.getClientes()).rejects.toThrow();
    });

    it("should log error to console on failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockErrorResponse(500);

      await expect(apiClient.getClientes()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      await expect(apiClient.getClientes()).rejects.toThrow("Network error");
    });
  });

  describe("Request Headers", () => {
    it("should include Content-Type header in all requests", async () => {
      mockSuccessResponse([]);

      await apiClient.getClientes();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should include custom headers when provided", async () => {
      mockSuccessResponse([]);

      const customHeaders = { Authorization: "Bearer token" };
      await (apiClient as any).getRequest("/test", {
        headers: customHeaders,
      });

      // Verificar que la llamada incluye el header custom
      // Nota: debido al orden del spread operator en el código (headers primero, luego ...options),
      // los headers de options sobrescriben los default headers
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const callConfig = fetchCall[1];

      expect(callConfig.headers).toBeDefined();
      expect(callConfig.headers.Authorization).toBe("Bearer token");
    });
  });

  describe("HTTP Methods", () => {
    it("should use GET method for read operations", async () => {
      mockSuccessResponse([]);

      await apiClient.getClientes();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].method).toBeUndefined(); // GET is default
    });

    it("should use POST method for create operations", async () => {
      mockSuccessResponse({} as Cliente);

      await apiClient.createCliente({} as Cliente);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].method).toBe("POST");
    });

    it("should use PUT method for update operations", async () => {
      mockSuccessResponse({} as Cliente);

      await apiClient.updateCliente(1, {} as Cliente);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].method).toBe("PUT");
    });

    it("should use DELETE method for delete operations", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await apiClient.deleteCliente(1);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].method).toBe("DELETE");
    });
  });
});
