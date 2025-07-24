# Diagrama de Entidades

Explicación:

Este diseño se ha elaborado siguiendo principios de normalización para asegurar la integridad de los datos y minimizar la redundancia, al mismo tiempo que se adapta a las necesidades específicas de la gestión de una planta de aberturas y sus objetivos de optimización.

- Entidades:
  - Venta: Mapeado a la tabla Ordenes_Venta.
  - Orden de Produccion: Mapeado a la tabla Ordenes_Produccion.
  - Materia Prima: Mapeado a la tabla Materia_Prima.
  - Producto: Mapeado a la tabla Productos (representa la abertura terminada).
  - Compra: Mapeado a la tabla Compras.
  - Inventario: Integrado en la tabla Materia_Prima (campo stock_actual) y actualizado por las tablas Detalle_Compra_Materia_Prima y Consumo_Materia_Prima_Produccion.
  - Proveedor: Mapeado a la tabla Proveedores.
  - Cliente: Mapeado a la tabla Clientes.
  - Operario: Mapeado a la tabla Operarios.
- Gestión de la Materia Prima y Medidas:
  - Materia_Prima: Esta tabla es el corazón del sistema para la gestión de inventario. Incluye atributos como referencia_proveedor (ej. 1897221842.001), unidad_medida, costo_unitario, longitud_estandar_m (ej. 5.8 m o 6m), y color.
  - Productos: Contiene los detalles de las aberturas terminadas, como ancho, alto, nombre_modelo (V1, V2, V3) y tipo_accionamiento. Esto permite definir un producto específico por sus dimensiones y características.
  - Componentes_Producto (BOM - Lista de Materiales): Es fundamental. Aquí se desglosa cada Producto en sus Materia_Prima necesarias y las cantidad_necesaria para producir una unidad del producto. La información de ToT L.Corte y Ángulo de las fuentes se traduce en la cantidad_necesaria y angulo_corte para cada material por producto.
- Administración de Órdenes a Proveedores:
  - Las tablas Proveedores, Compras, y Detalle_Compra_Materia_Prima están diseñadas para registrar todo el ciclo de adquisición. Se capturan detalles como cotizacion_ref, Art.-Nr. (mapeado a referencia_proveedor en Materia_Prima), Precio unitario, Cant. pedida y Unidad de medida directamente de las estructuras de los documentos de pedido.
- Optimización y Control:
  - Optimizar Punto de Pedido (punto_pedido): El campo punto_pedido en Materia_Prima y tiempo_entrega_dias son cruciales. Un sistema externo (o una vista/función en la DB) podría usar el historial de Consumo_Materia_Prima_Produccion y las tendencias de Ordenes_Venta (para la estacionalidad) para recalcular dinámicamente este punto, asegurando que se ordene a tiempo para evitar quiebres de stock.
  - Estacionalidad de Ventas (fecha_pedido): La columna fecha_pedido en Ordenes_Venta permite realizar análisis de datos históricos para identificar patrones estacionales en la demanda de productos, lo que a su vez informará la planificación de la producción y la optimización del inventario de materia prima.
  - Tiempos de Producción (fecha_inicio, fecha_fin_real): La tabla Ordenes_Produccion registra los tiempos reales de inicio y fin, permitiendo calcular la duración efectiva de la producción. La tabla opcional Etapas_Produccion permite un seguimiento más granular de los tiempos por fase y por operario, crucial para identificar cuellos de botella y mejorar la eficiencia de los tiempos de produccion.
  - Optimización de Materia Prima en el Armado (cantidad_usada, merma_calculada, longitud_estandar_m):
    - La longitud_estandar_m en Materia_Prima es clave para los algoritmos de corte (nesting) que buscarán minimizar el desperdicio al cortar piezas de perfiles.
    - La tabla Consumo_Materia_Prima_Produccion es vital. Al registrar la cantidad_usada real frente a la cantidad_requerida teórica, se puede calcular la merma_calculada. Este dato es fundamental para medir la eficacia de las estrategias de optimización de corte y ensamble.
  - Cálculo de Merma (merma_calculada): Este campo, derivado en Consumo_Materia_Prima_Produccion, proporciona una métrica directa de la eficiencia en el uso de los materiales, permitiendo identificar áreas de mejora y cuantificar el impacto de las iniciativas de optimización.
- Orden de Producción Optimizada (Ordenes_Produccion):
  - El diseño proporciona la base de datos con los insumos para un sistema de optimización. La "orden de producción optimizada" sería el resultado de un proceso o algoritmo (externo a la base de datos pero que consume y actualiza sus datos) que toma en cuenta el stock de materia prima, las capacidades de producción, los tiempos de entrega, y la demanda, para generar un plan de producción eficiente. La base de datos registraría este plan optimizado (ej. fechas de inicio y fin calculadas, asignaciones de recursos).

![DER](out/der/der.plantuml.svg)