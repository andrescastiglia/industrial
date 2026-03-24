-- Seed deterministico para E2E.
-- Carga datos operativos del mes actual y del mes anterior para reportes.

DO $$
DECLARE
    current_month_start DATE := date_trunc('month', CURRENT_DATE)::date;
    previous_month_start DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date;
    cliente_base_id INT;
    proveedor_base_id INT;
    producto_v1_id INT;
    orden_venta_actual_id INT;
    orden_venta_previa_id INT;
    compra_actual_id INT;
    compra_previa_id INT;
    orden_produccion_actual_id INT;
    orden_produccion_previa_id INT;
BEGIN
    SELECT cliente_id
      INTO cliente_base_id
      FROM Clientes
     WHERE nombre = 'Constructora ABC S.A.C.'
     LIMIT 1;

    SELECT proveedor_id
      INTO proveedor_base_id
      FROM Proveedores
     WHERE nombre = 'REHAU S.A.'
     LIMIT 1;

    SELECT producto_id
      INTO producto_v1_id
      FROM Productos
     WHERE nombre_modelo = 'V1'
     LIMIT 1;

    IF cliente_base_id IS NULL OR proveedor_base_id IS NULL OR producto_v1_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo construir el seed e2e porque faltan datos base';
    END IF;

    INSERT INTO Ordenes_Venta (
        cliente_id,
        fecha_pedido,
        fecha_entrega_estimada,
        fecha_entrega_real,
        estado,
        total_venta
    )
    VALUES (
        cliente_base_id,
        current_month_start + 5,
        current_month_start + 12,
        current_month_start + 11,
        'entregada',
        240000.00
    )
    RETURNING orden_venta_id INTO orden_venta_actual_id;

    INSERT INTO Detalle_Orden_Venta (
        orden_venta_id,
        producto_id,
        cantidad,
        precio_unitario_venta
    )
    VALUES (
        orden_venta_actual_id,
        producto_v1_id,
        2,
        120000.00
    );

    INSERT INTO Ordenes_Venta (
        cliente_id,
        fecha_pedido,
        fecha_entrega_estimada,
        fecha_entrega_real,
        estado,
        total_venta
    )
    VALUES (
        cliente_base_id,
        previous_month_start + 7,
        previous_month_start + 14,
        previous_month_start + 13,
        'entregada',
        120000.00
    )
    RETURNING orden_venta_id INTO orden_venta_previa_id;

    INSERT INTO Detalle_Orden_Venta (
        orden_venta_id,
        producto_id,
        cantidad,
        precio_unitario_venta
    )
    VALUES (
        orden_venta_previa_id,
        producto_v1_id,
        1,
        120000.00
    );

    INSERT INTO Compras (
        proveedor_id,
        fecha_pedido,
        fecha_recepcion_estimada,
        fecha_recepcion_real,
        estado,
        total_compra,
        cotizacion_ref
    )
    VALUES (
        proveedor_base_id,
        current_month_start + 3,
        current_month_start + 8,
        current_month_start + 7,
        'recibida',
        98000.00,
        'SEED-CURRENT-MONTH'
    )
    RETURNING compra_id INTO compra_actual_id;

    INSERT INTO Detalle_Compra_Materia_Prima (
        compra_id,
        materia_prima_id,
        cantidad_pedida,
        cantidad_recibida,
        unidad_medida
    )
    SELECT
        compra_actual_id,
        mp.materia_prima_id,
        25.00,
        25.00,
        mp.unidad_medida
      FROM Materia_Prima mp
     WHERE mp.referencia_proveedor = 'REHAU-EDS-SUP-001';

    INSERT INTO Compras (
        proveedor_id,
        fecha_pedido,
        fecha_recepcion_estimada,
        fecha_recepcion_real,
        estado,
        total_compra,
        cotizacion_ref
    )
    VALUES (
        proveedor_base_id,
        previous_month_start + 2,
        previous_month_start + 6,
        previous_month_start + 5,
        'recibida',
        76000.00,
        'SEED-PREVIOUS-MONTH'
    )
    RETURNING compra_id INTO compra_previa_id;

    INSERT INTO Detalle_Compra_Materia_Prima (
        compra_id,
        materia_prima_id,
        cantidad_pedida,
        cantidad_recibida,
        unidad_medida
    )
    SELECT
        compra_previa_id,
        mp.materia_prima_id,
        18.00,
        18.00,
        mp.unidad_medida
      FROM Materia_Prima mp
     WHERE mp.referencia_proveedor = 'REHAU-EDS-INF-001';

    INSERT INTO Ordenes_Produccion (
        orden_venta_id,
        producto_id,
        cantidad_a_producir,
        fecha_creacion,
        fecha_inicio,
        fecha_fin_estimada,
        fecha_fin_real,
        estado
    )
    VALUES (
        orden_venta_actual_id,
        producto_v1_id,
        2,
        current_month_start + INTERVAL '5 days 08:00',
        current_month_start + INTERVAL '6 days 08:00',
        current_month_start + INTERVAL '10 days 17:00',
        current_month_start + INTERVAL '9 days 15:00',
        'completada'
    )
    RETURNING orden_produccion_id INTO orden_produccion_actual_id;

    INSERT INTO Consumo_Materia_Prima_Produccion (
        orden_produccion_id,
        materia_prima_id,
        cantidad_requerida,
        cantidad_usada,
        merma_calculada,
        fecha_registro
    )
    SELECT
        orden_produccion_actual_id,
        cp.materia_prima_id,
        cp.cantidad_necesaria * 2,
        cp.cantidad_necesaria * 2,
        0,
        current_month_start + INTERVAL '9 days 15:00'
      FROM Componentes_Producto cp
     WHERE cp.producto_id = producto_v1_id;

    INSERT INTO Ordenes_Produccion (
        orden_venta_id,
        producto_id,
        cantidad_a_producir,
        fecha_creacion,
        fecha_inicio,
        fecha_fin_estimada,
        fecha_fin_real,
        estado
    )
    VALUES (
        orden_venta_previa_id,
        producto_v1_id,
        1,
        previous_month_start + INTERVAL '7 days 08:00',
        previous_month_start + INTERVAL '8 days 08:00',
        previous_month_start + INTERVAL '12 days 17:00',
        previous_month_start + INTERVAL '11 days 16:00',
        'completada'
    )
    RETURNING orden_produccion_id INTO orden_produccion_previa_id;

    INSERT INTO Consumo_Materia_Prima_Produccion (
        orden_produccion_id,
        materia_prima_id,
        cantidad_requerida,
        cantidad_usada,
        merma_calculada,
        fecha_registro
    )
    SELECT
        orden_produccion_previa_id,
        cp.materia_prima_id,
        cp.cantidad_necesaria,
        cp.cantidad_necesaria,
        0,
        previous_month_start + INTERVAL '11 days 16:00'
      FROM Componentes_Producto cp
     WHERE cp.producto_id = producto_v1_id;
END $$;
