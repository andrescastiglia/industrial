import { RequestInit } from "next/dist/server/web/spec-extension/request";
import { Dashboard } from "./dashboard";
import {
  Cliente,
  Compra,
  ComponenteProducto,
  MateriaPrima,
  Operario,
  OrdenProduccion,
  OrdenVenta,
  Producto,
  Proveedor,
  TipoComponente,
} from "./database";

// Cliente API para hacer llamadas al backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

class ApiClient {
  private async postRequest<T>(endpoint: string, data: T): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return await response.json();
  }

  private async putRequest<T>(endpoint: string, data: T): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return await response.json();
  }

  private async deleteRequest(endpoint: string): Promise<boolean> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, { method: "DELETE" });
    return response.ok;
  }

  private async getRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async getDashboard(): Promise<Dashboard> {
    return this.getRequest<Dashboard>("/dashboard");
  }

  // Órdenes de Producción
  async getOrdenesProduccion(): Promise<OrdenProduccion[]> {
    return this.getRequest<OrdenProduccion[]>("/ordenes-produccion");
  }

  async getOrdenProduccion(id: number): Promise<OrdenProduccion> {
    return this.getRequest<OrdenProduccion>(`/ordenes-produccion/${id}`);
  }

  async createOrdenProduccion(data: OrdenProduccion): Promise<OrdenProduccion> {
    return this.postRequest<OrdenProduccion>("/ordenes-produccion", data);
  }

  async updateOrdenProduccion(
    id: number,
    data: OrdenProduccion
  ): Promise<OrdenProduccion> {
    return this.putRequest<OrdenProduccion>(`/ordenes-produccion/${id}`, data);
  }

  async deleteOrdenProduccion(id: number): Promise<boolean> {
    return this.deleteRequest(`/ordenes-produccion/${id}`);
  }

  // Materia Prima
  async getMateriaPrima(): Promise<MateriaPrima[]> {
    return this.getRequest<MateriaPrima[]>("/materia-prima");
  }

  async getMateriaPrimaById(id: number): Promise<MateriaPrima> {
    return this.getRequest<MateriaPrima>(`/materia-prima/${id}`);
  }

  async createMateriaPrima(data: MateriaPrima): Promise<MateriaPrima> {
    return this.postRequest<MateriaPrima>("/materia-prima", data);
  }

  async updateMateriaPrima(
    id: number,
    data: MateriaPrima
  ): Promise<MateriaPrima> {
    return this.putRequest<MateriaPrima>(`/materia-prima/${id}`, data);
  }

  async deleteMateriaPrima(id: number): Promise<boolean> {
    return this.deleteRequest(`/materia-prima/${id}`);
  }

  // Productos
  async getProductos(): Promise<Producto[]> {
    return this.getRequest<Producto[]>("/productos");
  }

  async getProductoById(id: number): Promise<Producto> {
    return this.getRequest<Producto>(`/productos/${id}`);
  }

  async createProducto(
    data: Producto,
    componentes: ComponenteProducto[] = []
  ): Promise<Producto> {
    const payload = { ...data, componentes };
    return this.postRequest<Producto>("/productos", payload);
  }

  async updateProducto(
    id: number,
    data: Producto,
    componentes: ComponenteProducto[] = []
  ): Promise<Producto> {
    const payload = { ...data, componentes };
    return this.putRequest<Producto>(`/productos/${id}`, payload);
  }

  async deleteProducto(id: number): Promise<boolean> {
    return this.deleteRequest(`/productos/${id}`);
  }

  // Clientes
  async getClientes(): Promise<Cliente[]> {
    return this.getRequest<Cliente[]>("/clientes");
  }

  async getClienteById(id: number): Promise<Cliente> {
    return this.getRequest<Cliente>(`/clientes/${id}`);
  }

  async createCliente(data: Cliente): Promise<Cliente> {
    return this.postRequest<Cliente>("/clientes", data);
  }

  async updateCliente(id: number, data: Cliente): Promise<Cliente> {
    return this.putRequest<Cliente>(`/clientes/${id}`, data);
  }

  async deleteCliente(id: number): Promise<boolean> {
    return this.deleteRequest(`/clientes/${id}`);
  }

  // Proveedores
  async getProveedores(): Promise<Proveedor[]> {
    return this.getRequest<Proveedor[]>("/proveedores");
  }

  async getProveedorById(id: number): Promise<Proveedor> {
    return this.getRequest<Proveedor>(`/proveedores/${id}`);
  }

  async createProveedor(data: Proveedor): Promise<Proveedor> {
    return this.postRequest<Proveedor>("/proveedores", data);
  }

  async updateProveedor(id: number, data: Proveedor): Promise<Proveedor> {
    return this.putRequest<Proveedor>(`/proveedores/${id}`, data);
  }

  async deleteProveedor(id: number): Promise<boolean> {
    return this.deleteRequest(`/proveedores/${id}`);
  }

  // Operarios
  async getOperarios(): Promise<Operario[]> {
    return this.getRequest<Operario[]>("/operarios");
  }

  async getOperarioById(id: number): Promise<Operario> {
    return this.getRequest<Operario>(`/operarios/${id}`);
  }

  async createOperario(data: Operario): Promise<Operario> {
    return this.postRequest<Operario>("/operarios", data);
  }

  async updateOperario(id: number, data: Operario): Promise<Operario> {
    return this.putRequest<Operario>(`/operarios/${id}`, data);
  }

  async deleteOperario(id: number): Promise<boolean> {
    return this.deleteRequest(`/operarios/${id}`);
  }

  // Ventas
  async getVentas(): Promise<OrdenVenta[]> {
    return this.getRequest<OrdenVenta[]>("/ventas");
  }

  async createVenta(data: OrdenVenta): Promise<OrdenVenta> {
    return this.postRequest<OrdenVenta>("/ventas", data);
  }

  async deleteVenta(id: number): Promise<boolean> {
    return this.deleteRequest(`/ventas/${id}`);
  }

  // Compras
  async getCompras(): Promise<Compra[]> {
    return this.getRequest<Compra[]>("/compras");
  }

  async createCompra(data: Compra): Promise<Compra> {
    return this.postRequest<Compra>("/compras", data);
  }

  // Tipos de Componente
  async getTiposComponente(): Promise<TipoComponente[]> {
    return this.getRequest<TipoComponente[]>("/tipo-componente");
  }

  async createTipoComponente(data: TipoComponente): Promise<TipoComponente> {
    return this.postRequest<TipoComponente>("/tipo-componente", data);
  }
  async updateCompra(id: number, data: Compra): Promise<Compra> {
    return this.putRequest<Compra>(`/compras/${id}`, data);
  }

  async deleteCompra(id: number): Promise<boolean> {
    return this.deleteRequest(`/compras/${id}`);
  }
}

export const apiClient = new ApiClient();
