import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/db",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export { pool };

// Tipos de base de datos actualizados según el nuevo esquema
export interface TipoComponente {
  tipo_componente_id: number;
  nombre_tipo: string;
}

export interface MateriaPrima {
  materia_prima_id: number;
  nombre: string;
  descripcion: string;
  referencia_proveedor: string;
  unidad_medida: string;
  stock_actual: number;
  punto_pedido: number;
  tiempo_entrega_dias: number;
  longitud_estandar_m: number;
  color: string;
  id_tipo_componente: number;
  nombre_tipo_componente?: string;
}

export interface Producto {
  producto_id: number;
  nombre_modelo: string;
  descripcion: string;
  ancho: number;
  alto: number;
  color: string;
  tipo_accionamiento: string;
  componentes?: ComponenteProducto[];
}

export interface ComponenteProducto {
  producto_id: number;
  materia_prima_id: number;
  cantidad_necesaria: number;
  angulo_corte: string;
  nombre_material?: string;
  unidad_medida?: string;
  color_material?: string;
  referencia_proveedor?: string;
  stock_actual?: number;
  tipo_componente?: string;
}

export interface Cliente {
  cliente_id: number;
  nombre: string;
  contacto: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface OrdenVenta {
  orden_venta_id: number;
  cliente_id: number;
  fecha_pedido: Date;
  fecha_entrega_estimada: Date;
  fecha_entrega_real?: Date;
  estado: string;
  cliente_nombre?: string;
  cliente_contacto?: string;
  detalle?: DetalleOrdenVenta[];
}

export interface DetalleOrdenVenta {
  detalle_orden_venta_id: number;
  orden_venta_id: number;
  producto_id: number;
  cantidad: number;
}

export interface OrdenProduccion {
  orden_produccion_id: number;
  orden_venta_id?: number;
  producto_id: number;
  cantidad_a_producir: number;
  fecha_creacion: Date;
  fecha_inicio?: Date;
  fecha_fin_estimada: Date;
  fecha_fin_real?: Date;
  estado: string;
  consumos?: ConsumoMateriaPrimaProduccion[];
  etapas?: EtapaProduccion[];
}

export interface ConsumoMateriaPrimaProduccion {
  consumo_id: number;
  orden_produccion_id: number;
  materia_prima_id: number;
  cantidad_requerida: number;
  cantidad_usada: number;
  merma_calculada: number;
  fecha_registro: Date;
}

export interface Proveedor {
  proveedor_id: number;
  nombre: string;
  contacto: string;
  direccion: string;
  telefono: string;
  email: string;
  cuit: string;
}

export interface Compra {
  compra_id: number;
  proveedor_id: number;
  fecha_pedido: Date;
  fecha_recepcion_estimada: Date;
  fecha_recepcion_real?: Date;
  estado: string;
  total_compra: number;
  cotizacion_ref: string;
  nombre_proveedor?: string;
}

export interface DetalleCompraMateriaPrima {
  detalle_compra_id: number;
  compra_id: number;
  materia_prima_id: number;
  cantidad_pedida: number;
  cantidad_recibida: number;
  unidad_medida: string;
}

export interface Operario {
  operario_id: number;
  nombre: string;
  apellido: string;
  rol: string;
}

export interface EtapaProduccion {
  etapa_id: number;
  orden_produccion_id: number;
  nombre_etapa: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  operario_id?: number;
  estado: string;
  nombre_operario?: string;
  apellido_operario?: string;
  rol_operario?: string;
}
