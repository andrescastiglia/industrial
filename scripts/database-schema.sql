-- Tabla para los Tipos de Componente (categorías de Materia Prima)
-- Permite clasificar la materia prima como perfiles, superficies, juntas, accesorios, etc.
CREATE TABLE Tipo_Componente (
    tipo_componente_id SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(100) NOT NULL UNIQUE -- Ej: 'PERFILES', 'SUPERFICIES', 'JUNTAS', 'ACCESORIOS'
);

-- Tabla para la Materia Prima
-- Almacena información detallada de todos los materiales y piezas individuales.
CREATE TABLE Materia_Prima (
    materia_prima_id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,                           -- Ej: "Riel de aluminio EDS", "TELA MOSQUITERA"
    descripcion TEXT,                                       -- Descripción más detallada del material.
    referencia_proveedor VARCHAR(255) UNIQUE,               -- Número de referencia del proveedor (Art.-Nr.)
    unidad_medida VARCHAR(50) NOT NULL,                     -- Ej: 'm' (metros) para perfiles/juntas, 'u' (unidades) para accesorios
    stock_actual DECIMAL(10, 2) NOT NULL DEFAULT 0,         -- Cantidad actual disponible en inventario.
    punto_pedido DECIMAL(10, 2),                            -- Umbral para generar una nueva compra.
    tiempo_entrega_dias INT,                                -- Tiempo de entrega del proveedor en días para este material.
    longitud_estandar_m DECIMAL(10, 2),                     -- Longitud estándar si es un material lineal (ej: 5.8 m, 6 m). Crucial para optimización de corte.
    color VARCHAR(100),                                     -- Color del material, ej: 'Black Brow/Black Brow', 'Negro', 'Marrón'
    id_tipo_componente INT REFERENCES Tipo_Componente(tipo_componente_id) -- FK al tipo de componente.
);

-- Tabla para los Productos Terminados (Aberturas: Ventanas, Puertas)
-- Representa los modelos específicos de aberturas que se fabrican, con sus dimensiones estándar.
CREATE TABLE Productos (
    producto_id SERIAL PRIMARY KEY,
    nombre_modelo VARCHAR(100) NOT NULL,                    -- Ej: 'V1', 'V2', 'V3'
    descripcion TEXT,                                       -- Ej: 'PUERTA- 2 HOJAS', 'VENTANA - 2 HOJAS'
    ancho DECIMAL(10, 2) NOT NULL,                          -- Ancho del producto en mm (ej: 1995, 2340)
    alto DECIMAL(10, 2) NOT NULL,                           -- Alto del producto en mm (ej: 2340, 1385)
    color VARCHAR(100),                                     -- Color predominante del producto (ej: 'Black Brow/Black Brow')
    tipo_accionamiento VARCHAR(255)                         -- Ej: 'ROTO CORREDERA MN3', 'GU CORREDERA M3.MQX'
);

-- Tabla para la Lista de Materiales (Bill of Materials - BOM)
-- Define qué materias primas, y en qué cantidades, se necesitan para fabricar cada Producto terminado.
CREATE TABLE Componentes_Producto (
    producto_id INT REFERENCES Productos(producto_id),
    materia_prima_id INT REFERENCES Materia_Prima(materia_prima_id),
    cantidad_necesaria DECIMAL(10, 2) NOT NULL,             -- Cantidad de materia prima requerida por unidad de producto. Ej: 'ToT L.Corte' para perfiles, 'ToT' para accesorios
    angulo_corte VARCHAR(50),                               -- Ángulo de corte si aplica, ej: '45º -45º', '90º -90º'
    PRIMARY KEY (producto_id, materia_prima_id)
);

-- Tabla para los Clientes
CREATE TABLE Clientes (
    cliente_id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255)
);

-- Tabla para las Órdenes de Venta (pedidos de clientes)
-- Registra las solicitudes de productos terminados por parte de los clientes.
CREATE TABLE Ordenes_Venta (
    orden_venta_id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES Clientes(cliente_id) NOT NULL,
    fecha_pedido DATE NOT NULL,                             -- Fecha del pedido. Para análisis de estacionalidad de ventas
    fecha_entrega_estimada DATE,
    fecha_entrega_real DATE,
    estado VARCHAR(50) NOT NULL,                            -- Ej: 'Pendiente', 'Completada', 'Cancelada'
    total_venta DECIMAL(12, 2)
);

-- Tabla para los Detalles de la Orden de Venta
-- Desglosa los productos y cantidades dentro de cada orden de venta.
CREATE TABLE Detalle_Orden_Venta (
    detalle_orden_venta_id SERIAL PRIMARY KEY,
    orden_venta_id INT REFERENCES Ordenes_Venta(orden_venta_id) NOT NULL,
    producto_id INT REFERENCES Productos(producto_id) NOT NULL,
    cantidad INT NOT NULL,                                  -- Unidades del producto a fabricar/entregar (Uds en fuentes)
    precio_unitario_venta DECIMAL(10, 2),
    UNIQUE (orden_venta_id, producto_id)
);

-- Tabla para las Órdenes de Producción
-- Gestiona la fabricación de los productos, ya sea para un pedido de venta o para stock.
CREATE TABLE Ordenes_Produccion (
    orden_produccion_id SERIAL PRIMARY KEY,
    orden_venta_id INT REFERENCES Ordenes_Venta(orden_venta_id), -- Opcional, NULL si se produce para stock.
    producto_id INT REFERENCES Productos(producto_id) NOT NULL,
    cantidad_a_producir INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio TIMESTAMP,
    fecha_fin_estimada TIMESTAMP,
    fecha_fin_real TIMESTAMP,                               -- Para cálculo y análisis de tiempos de producción
    estado VARCHAR(50) NOT NULL                             -- Ej: 'Pendiente', 'En Proceso', 'Completada', 'Cancelada'
);

-- Tabla para el Consumo de Materia Prima en Producción
-- Registra el uso de materia prima por cada orden de producción, permitiendo el cálculo de merma.
CREATE TABLE Consumo_Materia_Prima_Produccion (
    consumo_id SERIAL PRIMARY KEY,
    orden_produccion_id INT REFERENCES Ordenes_Produccion(orden_produccion_id) NOT NULL,
    materia_prima_id INT REFERENCES Materia_Prima(materia_prima_id) NOT NULL,
    cantidad_requerida DECIMAL(10, 2) NOT NULL,             -- Cantidad teórica de materia prima necesaria (según BOM).
    cantidad_usada DECIMAL(10, 2) NOT NULL,                 -- Cantidad real utilizada. Para optimización de materia prima y cálculo de merma
    merma_calculada DECIMAL(10, 2),                         -- Diferencia entre cantidad_usada y cantidad_requerida. Para cálculo de merma
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (orden_produccion_id, materia_prima_id) -- Un material se registra una vez por orden de producción
);

-- Tabla para los Proveedores
-- Almacena la información de los proveedores de materia prima.
CREATE TABLE Proveedores (
    proveedor_id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,                           -- Ej: 'REHAU S. A'
    contacto VARCHAR(255),
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    cuit VARCHAR(50)
);

-- Tabla para las Compras (Órdenes de Pedido a Proveedores)
-- Registra los pedidos de materia prima realizados a los proveedores.
CREATE TABLE Compras (
    compra_id SERIAL PRIMARY KEY,
    proveedor_id INT REFERENCES Proveedores(proveedor_id) NOT NULL,
    fecha_pedido DATE NOT NULL,
    fecha_recepcion_estimada DATE,
    fecha_recepcion_real DATE,
    estado VARCHAR(50) NOT NULL,                            -- Ej: 'Pendiente', 'Recibida', 'Cancelada'
    total_compra DECIMAL(12, 2),
    cotizacion_ref VARCHAR(100)                             -- Referencia de la cotización del proveedor
);

-- Tabla para los Detalles de la Compra de Materia Prima
-- Desglosa la materia prima y cantidades dentro de cada orden de compra.
CREATE TABLE Detalle_Compra_Materia_Prima (
    detalle_compra_id SERIAL PRIMARY KEY,
    compra_id INT REFERENCES Compras(compra_id) NOT NULL,
    materia_prima_id INT REFERENCES Materia_Prima(materia_prima_id) NOT NULL,
    cantidad_pedida DECIMAL(10, 2) NOT NULL,                -- Cantidad solicitada al proveedor
    cantidad_recibida DECIMAL(10, 2) DEFAULT 0,             -- Cantidad realmente recibida.
    unidad_medida VARCHAR(50)                               -- Unidad de medida de la compra
);

-- Tabla para los Operarios
CREATE TABLE Operarios (
    operario_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rol VARCHAR(100)                                        -- Ej: 'Corte', 'Ensamblaje', 'Control de Calidad'
);

-- Opcional: Tabla para Etapas de Producción (para mayor granularidad en el seguimiento)
-- Permite rastrear el progreso y los tiempos en fases específicas de la producción.
CREATE TABLE Etapas_Produccion (
    etapa_id SERIAL PRIMARY KEY,
    orden_produccion_id INT REFERENCES Ordenes_Produccion(orden_produccion_id) NOT NULL,
    nombre_etapa VARCHAR(100) NOT NULL,                     -- Ej: 'Corte de Perfiles', 'Ensamblaje', 'Acristalamiento'
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    operario_id INT REFERENCES Operarios(operario_id),      -- Operario asignado a la etapa.
    estado VARCHAR(50)                                      -- 'Pendiente', 'En Curso', 'Completada'
);

-- Índices para mejorar el rendimiento de las consultas frecuentes
CREATE INDEX idx_ventas_fecha_cliente ON Ordenes_Venta (fecha_pedido, cliente_id);
CREATE INDEX idx_produccion_fecha_estado ON Ordenes_Produccion (fecha_creacion, estado);
CREATE INDEX idx_compras_fecha_proveedor ON Compras (fecha_pedido, proveedor_id);
CREATE INDEX idx_materia_prima_stock ON Materia_Prima (stock_actual, punto_pedido);
CREATE INDEX idx_producto_modelo_dims ON Productos (nombre_modelo, ancho, alto);
CREATE INDEX idx_consumo_produccion_materia ON Consumo_Materia_Prima_Produccion (orden_produccion_id, materia_prima_id);

-- Insertar datos iniciales de tipos de componente
INSERT INTO Tipo_Componente (nombre_tipo) VALUES 
('PERFILES'),
('SUPERFICIES'),
('JUNTAS'),
('ACCESORIOS'),
('HERRAJES'),
('VIDRIOS'),
('SELLADORES'),
('ELEMENTOS_FIJACION'),
('HERRAMIENTAS_CORTE'),
('CONSUMIBLES')
ON CONFLICT (nombre_tipo) DO NOTHING;

-- Insertar datos de ejemplo para clientes
INSERT INTO Clientes (nombre, contacto, direccion, telefono, email) VALUES 
('Constructora ABC S.A.C.', 'Ana Martínez', 'Av. Principal 123, San Isidro, Lima', '555-1001', 'ana.martinez@constructoraabc.com'),
('Industrias XYZ E.I.R.L.', 'Roberto Silva', 'Jr. Comercio 456, Arequipa', '555-1002', 'roberto.silva@industriasxyz.com'),
('Metales del Sur S.R.L.', 'Carmen López', 'Av. Industrial 789, Cusco', '555-1003', 'carmen.lopez@metalesdelsur.com'),
('Aberturas Norte S.A.', 'Luis García', 'Calle Los Metales 321, Trujillo', '555-1004', 'luis.garcia@aberturanorte.com'),
('Ventanas Premium S.A.C.', 'María Rodríguez', 'Av. Argentina 654, Callao', '555-1005', 'maria.rodriguez@ventanaspremium.com')
ON CONFLICT DO NOTHING;

-- Insertar datos de ejemplo para proveedores
INSERT INTO Proveedores (nombre, contacto, direccion, telefono, email, cuit) VALUES 
('REHAU S.A.', 'Carlos Mendoza', 'Av. Industrial 1234, Lima', '555-2001', 'ventas@rehau.com', '20-12345678-9'),
('Aluminios del Norte S.R.L.', 'Ana Rodríguez', 'Jr. Metalúrgica 567, Trujillo', '555-2002', 'pedidos@aluminiosnorte.com', '20-98765432-1'),
('Herrajes Industriales E.I.R.L.', 'Luis García', 'Av. Los Herreros 890, Arequipa', '555-2003', 'info@herrajesindustriales.com', '20-55566677-7'),
('Vidrios Especiales S.A.', 'María Fernández', 'Calle Proveedores 432, Cusco', '555-2004', 'maria.fernandez@vidriospe.com', '20-11223344-5'),
('Selladores Premium S.A.C.', 'Roberto Castillo', 'Av. Comercio 876, Lima', '555-2005', 'roberto.castillo@selladorespe.com', '20-99887766-3')
ON CONFLICT DO NOTHING;

-- Insertar datos de ejemplo para operarios
INSERT INTO Operarios (nombre, apellido, rol) VALUES 
('Juan', 'Pérez', 'Corte'),
('María', 'González', 'Ensamblaje'),
('Carlos', 'Rodríguez', 'Control de Calidad'),
('Ana', 'López', 'Acristalamiento'),
('Luis', 'Martínez', 'Herrajes'),
('Carmen', 'Silva', 'Supervisión'),
('Roberto', 'Torres', 'Corte'),
('Elena', 'Vargas', 'Ensamblaje')
ON CONFLICT DO NOTHING;

-- Insertar productos de ejemplo (Ventanas y Puertas)
INSERT INTO Productos (nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento) VALUES 
('V1', 'VENTANA - 2 HOJAS CORREDERA', 1200.00, 1000.00, 'Black Brown/Black Brown', 'ROTO CORREDERA MN3'),
('V2', 'VENTANA - 3 HOJAS CORREDERA', 1800.00, 1200.00, 'Negro/Negro', 'GU CORREDERA M3.MQX'),
('V3', 'VENTANA - 4 HOJAS CORREDERA', 2400.00, 1500.00, 'Marrón/Marrón', 'ROTO CORREDERA MN3'),
('P1', 'PUERTA - 2 HOJAS CORREDERA', 1600.00, 2100.00, 'Black Brown/Black Brown', 'ROTO CORREDERA PESADA'),
('P2', 'PUERTA - 1 HOJA ABATIBLE', 900.00, 2100.00, 'Negro/Negro', 'HERRAJES ABATIBLES PREMIUM'),
('VF1', 'VENTANA FIJA - 1 PAÑO', 1000.00, 800.00, 'Blanco/Blanco', 'FIJA SIN ACCIONAMIENTO')
ON CONFLICT DO NOTHING;

-- Insertar materia prima de ejemplo
INSERT INTO Materia_Prima (nombre, descripcion, referencia_proveedor, unidad_medida, stock_actual, punto_pedido, tiempo_entrega_dias, longitud_estandar_m, color, id_tipo_componente) VALUES 
('Riel de aluminio EDS Superior', 'Perfil superior para ventanas correderas', 'REHAU-EDS-SUP-001', 'm', 150.50, 50.00, 7, 6.00, 'Black Brown', 1),
('Riel de aluminio EDS Inferior', 'Perfil inferior para ventanas correderas', 'REHAU-EDS-INF-001', 'm', 145.75, 50.00, 7, 6.00, 'Black Brown', 1),
('Marco Lateral EDS', 'Perfil lateral para marcos de ventanas', 'REHAU-EDS-LAT-001', 'm', 200.25, 60.00, 7, 6.00, 'Black Brown', 1),
('Hoja Móvil EDS', 'Perfil para hoja móvil de ventana corredera', 'REHAU-EDS-MOV-001', 'm', 180.00, 55.00, 7, 6.00, 'Black Brown', 1),
('Vidrio Laminado 6+6', 'Vidrio laminado de seguridad 6mm+6mm', 'VIDRIOS-LAM-66-001', 'm2', 25.50, 10.00, 14, 0.00, 'Transparente', 6),
('Tela Mosquitera', 'Tela mosquitera de fibra de vidrio', 'MOSQ-FIBRA-001', 'm2', 45.00, 15.00, 5, 0.00, 'Gris', 2),
('Junta EPDM Superior', 'Junta de estanqueidad EPDM para perfil superior', 'JUNTA-EPDM-SUP-001', 'm', 120.00, 30.00, 10, 100.00, 'Negro', 3),
('Junta EPDM Lateral', 'Junta de estanqueidad EPDM para perfil lateral', 'JUNTA-EPDM-LAT-001', 'm', 110.00, 30.00, 10, 100.00, 'Negro', 3),
('Rodamiento Inferior', 'Rodamiento para hoja corredera inferior', 'ROTO-ROD-INF-001', 'u', 48, 12, 15, 0.00, 'Metálico', 4),
('Rodamiento Superior', 'Rodamiento para hoja corredera superior', 'ROTO-ROD-SUP-001', 'u', 52, 12, 15, 0.00, 'Metálico', 4),
('Manija Corredera Premium', 'Manija ergonómica para ventana corredera', 'MANIJA-CORR-PREM-001', 'u', 24, 6, 12, 0.00, 'Black Brown', 5),
('Cerradura Multipunto', 'Sistema de cerradura multipunto para puertas', 'CERR-MULTI-001', 'u', 8, 3, 20, 0.00, 'Metálico', 5)
ON CONFLICT (referencia_proveedor) DO NOTHING;

-- Insertar componentes de productos (BOM - Bill of Materials)
-- Para Ventana V1 (VENTANA - 2 HOJAS CORREDERA 1200x1000)
INSERT INTO Componentes_Producto (producto_id, materia_prima_id, cantidad_necesaria, angulo_corte) VALUES 
-- Perfiles para V1
(1, 1, 1.20, '90º -90º'),  -- Riel superior: 1.20m
(1, 2, 1.20, '90º -90º'),  -- Riel inferior: 1.20m  
(1, 3, 2.00, '90º -90º'),  -- Marco lateral: 2 x 1.00m = 2.00m
(1, 4, 4.40, '45º -45º'),  -- Hoja móvil: 2 hojas x (0.60+0.60+0.60+0.60) = 4.40m
-- Vidrio para V1
(1, 5, 1.08, NULL),        -- Vidrio: 1.20 x 1.00 = 1.20m2 - 10% marco = 1.08m2
-- Juntas para V1
(1, 7, 2.40, NULL),        -- Junta superior/inferior: 2 x 1.20m = 2.40m
(1, 8, 4.00, NULL),        -- Junta lateral: 2 x 2.00m = 4.00m
-- Herrajes para V1
(1, 9, 4, NULL),           -- Rodamientos inferiores: 4 unidades (2 por hoja)
(1, 10, 4, NULL),          -- Rodamientos superiores: 4 unidades (2 por hoja)
(1, 11, 2, NULL),          -- Manijas: 2 unidades (1 por hoja)
-- Mosquitera para V1
(1, 6, 1.08, NULL)         -- Tela mosquitera: misma área que vidrio
ON CONFLICT (producto_id, materia_prima_id) DO NOTHING;

-- Para Ventana V2 (VENTANA - 3 HOJAS CORREDERA 1800x1200)
INSERT INTO Componentes_Producto (producto_id, materia_prima_id, cantidad_necesaria, angulo_corte) VALUES 
-- Perfiles para V2
(2, 1, 1.80, '90º -90º'),  -- Riel superior: 1.80m
(2, 2, 1.80, '90º -90º'),  -- Riel inferior: 1.80m
(2, 3, 2.40, '90º -90º'),  -- Marco lateral: 2 x 1.20m = 2.40m
(2, 4, 7.20, '45º -45º'),  -- Hoja móvil: 3 hojas x (0.60+0.60+0.60+0.60) = 7.20m
-- Vidrio para V2
(2, 5, 1.94, NULL),        -- Vidrio: 1.80 x 1.20 = 2.16m2 - 10% marco = 1.94m2
-- Juntas para V2
(2, 7, 3.60, NULL),        -- Junta superior/inferior: 2 x 1.80m = 3.60m
(2, 8, 4.80, NULL),        -- Junta lateral: 2 x 2.40m = 4.80m
-- Herrajes para V2
(2, 9, 6, NULL),           -- Rodamientos inferiores: 6 unidades (2 por hoja)
(2, 10, 6, NULL),          -- Rodamientos superiores: 6 unidades (2 por hoja)
(2, 11, 3, NULL),          -- Manijas: 3 unidades (1 por hoja)
-- Mosquitera para V2
(2, 6, 1.94, NULL)         -- Tela mosquitera: misma área que vidrio
ON CONFLICT (producto_id, materia_prima_id) DO NOTHING;

-- Para Puerta P1 (PUERTA - 2 HOJAS CORREDERA 1600x2100)
INSERT INTO Componentes_Producto (producto_id, materia_prima_id, cantidad_necesaria, angulo_corte) VALUES 
-- Perfiles para P1
(4, 1, 1.60, '90º -90º'),  -- Riel superior: 1.60m
(4, 2, 1.60, '90º -90º'),  -- Riel inferior: 1.60m
(4, 3, 4.20, '90º -90º'),  -- Marco lateral: 2 x 2.10m = 4.20m
(4, 4, 8.40, '45º -45º'),  -- Hoja móvil: 2 hojas x (0.80+0.80+1.05+1.05) = 8.40m
-- Vidrio para P1
(4, 5, 3.02, NULL),        -- Vidrio: 1.60 x 2.10 = 3.36m2 - 10% marco = 3.02m2
-- Juntas para P1
(4, 7, 3.20, NULL),        -- Junta superior/inferior: 2 x 1.60m = 3.20m
(4, 8, 8.40, NULL),        -- Junta lateral: 2 x 4.20m = 8.40m
-- Herrajes para P1 (más robustos para puertas)
(4, 9, 6, NULL),           -- Rodamientos inferiores: 6 unidades (3 por hoja, más pesada)
(4, 10, 4, NULL),          -- Rodamientos superiores: 4 unidades (2 por hoja)
(4, 11, 2, NULL),          -- Manijas: 2 unidades (1 por hoja)
(4, 12, 1, NULL)           -- Cerradura multipunto: 1 unidad
ON CONFLICT (producto_id, materia_prima_id) DO NOTHING;


-- Índice para consultas de compras por materia prima
CREATE INDEX idx_detalle_compra_materia_prima_id 
ON detalle_compra_materia_prima(materia_prima_id);

-- Índice para trazabilidad de venta a producción
CREATE INDEX idx_ordenes_produccion_orden_venta 
ON ordenes_produccion(orden_venta_id);

-- Índice para consultas de etapas por orden de producción
CREATE INDEX idx_etapas_produccion_orden 
ON etapas_produccion(orden_produccion_id);

-- Índice para análisis de producción por producto
CREATE INDEX idx_ordenes_produccion_producto 
ON ordenes_produccion(producto_id);

-- Índice para consultas de productividad por operario
CREATE INDEX idx_etapas_produccion_operario 
ON etapas_produccion(operario_id);

-- Índice para filtrar materias primas por tipo de componente
CREATE INDEX idx_materia_prima_tipo_componente 
ON materia_prima(id_tipo_componente);