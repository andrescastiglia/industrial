import { NextRequest, NextResponse } from "next/server";
import { getWebSocketConfig } from "@/lib/websocket-config";
import { authenticateApiRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Global WebSocket server instance
let wsServer: any = null;

export async function GET(request: NextRequest) {
  // Autenticar usuario
  const auth = authenticateApiRequest(request);
  if (auth.error) {
    return NextResponse.json(auth.error, { status: auth.error.statusCode });
  }

  if (!wsServer && typeof window === "undefined") {
    // Server-side WebSocket implementation for development
    const { WebSocketServer } = await import("ws");
    const config = getWebSocketConfig();

    try {
      wsServer = new WebSocketServer({
        port: config.port,
        perMessageDeflate: false,
      });

      console.log(`🔌 WebSocket Server iniciado en ${config.url}`);

      wsServer.on("connection", (ws: any, req: any) => {
        console.log(
          "👤 Nueva conexión WebSocket desde:",
          req.socket.remoteAddress
        );

        // Enviar mensaje de bienvenida
        ws.send(
          JSON.stringify({
            type: "connection_established",
            message: "Conectado al Sistema Industrial Maese",
            timestamp: new Date().toISOString(),
          })
        );

        // Configurar intervalo para actualizaciones del dashboard
        const dashboardInterval = setInterval(async () => {
          try {
            // Simular datos del dashboard (en producción, esto vendría de la base de datos)
            const dashboardData = await getDashboardData();
            ws.send(
              JSON.stringify({
                type: "dashboard_update",
                data: dashboardData,
                timestamp: new Date().toISOString(),
              })
            );
          } catch (error) {
            console.error("Error enviando datos del dashboard:", error);
          }
        }, 30000); // Cada 30 segundos

        // Configurar intervalo para notificaciones de producción
        const notificationInterval = setInterval(() => {
          // Simular alertas de producción
          const notifications = generateProductionNotifications();
          if (notifications.length > 0) {
            notifications.forEach((notification) => {
              ws.send(
                JSON.stringify({
                  type: "production_notification",
                  data: notification,
                  timestamp: new Date().toISOString(),
                })
              );
            });
          }
        }, 15000); // Cada 15 segundos

        // Manejar mensajes del cliente
        ws.on("message", (message: any) => {
          try {
            const data = JSON.parse(message.toString());
            console.log("📥 Mensaje recibido:", data);

            switch (data.type) {
              case "subscribe_dashboard":
                // Cliente se suscribe a actualizaciones del dashboard
                break;

              case "order_update":
                // Broadcast de actualización de orden a otros clientes
                broadcastToOthers(ws, {
                  type: "order_collaboration",
                  orderId: data.orderId,
                  changes: data.changes,
                  user: data.user,
                  timestamp: new Date().toISOString(),
                });
                break;

              case "production_debug":
                // Enviar información de debug específica
                ws.send(
                  JSON.stringify({
                    type: "debug_response",
                    orderId: data.orderId,
                    debugData: getOrderDebugInfo(data.orderId),
                    timestamp: new Date().toISOString(),
                  })
                );
                break;
            }
          } catch (error) {
            console.error("Error procesando mensaje:", error);
          }
        });

        // Cleanup cuando se cierra la conexión
        ws.on("close", () => {
          console.log("❌ Conexión WebSocket cerrada");
          clearInterval(dashboardInterval);
          clearInterval(notificationInterval);
        });

        ws.on("error", (error: any) => {
          console.error("❌ Error WebSocket:", error);
          clearInterval(dashboardInterval);
          clearInterval(notificationInterval);
        });
      });
    } catch (error) {
      console.error("Error iniciando WebSocket server:", error);
    }
  }

  const config = getWebSocketConfig();

  return NextResponse.json({
    status: "WebSocket server running",
    config: {
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      url: config.url,
    },
    message: "Servidor WebSocket activo para comunicación en tiempo real",
  });
}

// Función para obtener datos del dashboard
async function getDashboardData() {
  // En producción, esto haría una consulta real a la base de datos
  return {
    operariosActivos: Math.floor(Math.random() * 50) + 20,
    ordenesPendientes: Math.floor(Math.random() * 15) + 5,
    produccionHoy: Math.floor(Math.random() * 100) + 50,
    eficiencia: Math.floor(Math.random() * 30) + 70,
    alertasActivas: Math.floor(Math.random() * 5),
    timestamp: new Date().toISOString(),
  };
}

// Función para generar notificaciones de producción
function generateProductionNotifications() {
  const notifications = [];
  const random = Math.random();

  if (random < 0.1) {
    // 10% de probabilidad
    notifications.push({
      id: Date.now(),
      type: "warning",
      priority: "high",
      title: "Stock Bajo Detectado",
      message: 'El material "Chapa 2mm" tiene stock inferior a 10 unidades',
      category: "inventory",
      action: "Revisar inventario de materia prima",
    });
  }

  if (random > 0.8) {
    // 20% de probabilidad
    notifications.push({
      id: Date.now() + 1,
      type: "info",
      priority: "medium",
      title: "Orden Completada",
      message: `Orden #${Math.floor(Math.random() * 1000)} ha sido finalizada`,
      category: "production",
      action: "Verificar calidad y proceder con envío",
    });
  }

  return notifications;
}

// Función para hacer broadcast a otros clientes (colaboración)
function broadcastToOthers(sender: any, message: any) {
  if (wsServer) {
    wsServer.clients.forEach((client: any) => {
      if (client !== sender && client.readyState === 1) {
        // OPEN
        client.send(JSON.stringify(message));
      }
    });
  }
}

// Función para obtener información de debug de una orden
function getOrderDebugInfo(orderId: number) {
  return {
    orderId,
    currentStep: "Fabricación",
    progress: Math.floor(Math.random() * 100),
    estimatedCompletion: new Date(
      Date.now() + 2 * 60 * 60 * 1000
    ).toISOString(),
    componentsUsed: [
      { name: "Chapa 2mm", quantity: 2, status: "completed" },
      { name: "Tornillos M6", quantity: 8, status: "in_progress" },
      { name: "Pintura", quantity: 1, status: "pending" },
    ],
    issues: [],
    performance: {
      timeElapsed: Math.floor(Math.random() * 120) + 30,
      efficiency: Math.floor(Math.random() * 30) + 70,
    },
  };
}
