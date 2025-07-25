// Cliente API para hacer llamadas al backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      throw error
    }
  }

  // Órdenes de Producción
  async getOrdenesProduccion() {
    return this.request("/ordenes-produccion")
  }

  async getOrdenProduccion(id: number) {
    return this.request(`/ordenes-produccion/${id}`)
  }

  async createOrdenProduccion(data: any) {
    return this.request("/ordenes-produccion", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateOrdenProduccion(id: number, data: any) {
    return this.request(`/ordenes-produccion/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteOrdenProduccion(id: number) {
    return this.request(`/ordenes-produccion/${id}`, {
      method: "DELETE",
    })
  }

  // Materia Prima
  async getMateriaPrima() {
    return this.request("/materia-prima")
  }

  async getMateriaPrimaById(id: number) {
    return this.request(`/materia-prima/${id}`)
  }

  async createMateriaPrima(data: any) {
    return this.request("/materia-prima", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateMateriaPrima(id: number, data: any) {
    return this.request(`/materia-prima/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteMateriaPrima(id: number) {
    return this.request(`/materia-prima/${id}`, {
      method: "DELETE",
    })
  }

  // Productos
  async getProductos() {
    return this.request("/productos")
  }

  async getProductoById(id: number) {
    return this.request(`/productos/${id}`)
  }

  async createProducto(data: any) {
    return this.request("/productos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateProducto(id: number, data: any) {
    return this.request(`/productos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteProducto(id: number) {
    return this.request(`/productos/${id}`, {
      method: "DELETE",
    })
  }

  // Clientes
  async getClientes() {
    return this.request("/clientes")
  }

  async getClienteById(id: number) {
    return this.request(`/clientes/${id}`)
  }

  async createCliente(data: any) {
    return this.request("/clientes", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateCliente(id: number, data: any) {
    return this.request(`/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteCliente(id: number) {
    return this.request(`/clientes/${id}`, {
      method: "DELETE",
    })
  }

  // Proveedores
  async getProveedores() {
    return this.request("/proveedores")
  }

  async getProveedorById(id: number) {
    return this.request(`/proveedores/${id}`)
  }

  async createProveedor(data: any) {
    return this.request("/proveedores", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateProveedor(id: number, data: any) {
    return this.request(`/proveedores/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteProveedor(id: number) {
    return this.request(`/proveedores/${id}`, {
      method: "DELETE",
    })
  }

  // Operarios
  async getOperarios() {
    return this.request("/operarios")
  }

  async getOperarioById(id: number) {
    return this.request(`/operarios/${id}`)
  }

  async createOperario(data: any) {
    return this.request("/operarios", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateOperario(id: number, data: any) {
    return this.request(`/operarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteOperario(id: number) {
    return this.request(`/operarios/${id}`, {
      method: "DELETE",
    })
  }

  // Ventas
  async getVentas() {
    return this.request("/ventas")
  }

  async createVenta(data: any) {
    return this.request("/ventas", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Compras
  async getCompras() {
    return this.request("/compras")
  }

  async createCompra(data: any) {
    return this.request("/compras", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Tipos de Componente
  async getTiposComponente() {
    return this.request("/tipo-componente")
  }

  async createTipoComponente(data: any) {
    return this.request("/tipo-componente", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient()
