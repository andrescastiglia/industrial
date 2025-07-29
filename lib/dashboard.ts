export interface Dashboard {
  operariosActivos: number;
  clientes: number;
  proveedores: number;
  comprasMes: number;
  ventasMes: number;
  ordenesPendientes: number;
  ultimaOrden: string | null; // Tiempo transcurrido como cadena
  ultimaCompra: string | null; // Tiempo transcurrido como cadena
  alertas: Array<{
    nombre: string;
    detalle: string;
  }>;
}
