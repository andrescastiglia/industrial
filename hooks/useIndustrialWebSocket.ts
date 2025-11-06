import { useState, useEffect, useCallback, useRef } from "react";
import { getClientWebSocketUrl } from "@/lib/websocket-config";

export interface IndustrialNotification {
  id: number;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high";
  title: string;
  message: string;
  category: "production" | "inventory" | "orders" | "system";
  action?: string;
  timestamp: string;
}

export interface DashboardUpdate {
  operariosActivos: number;
  ordenesPendientes: number;
  produccionHoy: number;
  eficiencia: number;
  alertasActivas: number;
  timestamp: string;
}

export interface OrderCollaboration {
  type: "order_collaboration";
  orderId: number;
  changes: Record<string, unknown>;
  user: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type:
    | "connection_established"
    | "dashboard_update"
    | "production_notification"
    | "order_collaboration"
    | "debug_response";
  data?:
    | DashboardUpdate
    | IndustrialNotification
    | OrderCollaboration
    | { [key: string]: unknown };
  message?: string;
  timestamp: string;
}

export function useIndustrialWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<IndustrialNotification[]>(
    []
  );
  const [dashboardData, setDashboardData] = useState<DashboardUpdate | null>(
    null
  );
  const [orderUpdates, setOrderUpdates] = useState<OrderCollaboration[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  // Función para conectar al WebSocket
  const connect = useCallback(() => {
    try {
      const wsUrl = getClientWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`🔌 Conectado al WebSocket Industrial en ${wsUrl}`);
        setIsConnected(true);
        setSocket(ws);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000; // Suscribirse a actualizaciones del dashboard
        ws.send(
          JSON.stringify({
            type: "subscribe_dashboard",
            timestamp: new Date().toISOString(),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "connection_established":
              console.log("✅", message.message);
              break;

            case "dashboard_update":
              setDashboardData(message.data as DashboardUpdate);
              break;

            case "production_notification": {
              const notification = message.data as IndustrialNotification;
              setNotifications((prev) => [notification, ...prev.slice(0, 19)]); // Mantener máximo 20 notificaciones

              // Mostrar notificación del navegador si es de alta prioridad
              if (
                notification.priority === "high" &&
                "Notification" in window
              ) {
                if (Notification.permission === "granted") {
                  new Notification(notification.title, {
                    body: notification.message,
                    icon: "/favicon.ico",
                    tag: `industrial-${notification.id}`,
                  });
                }
              }
              break;
            }

            case "order_collaboration": {
              const orderUpdate = message.data as OrderCollaboration;
              setOrderUpdates((prev) => [orderUpdate, ...prev.slice(0, 9)]); // Mantener últimas 10 actualizaciones

              // Mostrar notificación de colaboración
              setNotifications((prev) => [
                {
                  id: Date.now(),
                  type: "info",
                  priority: "medium",
                  title: "Colaboración en Tiempo Real",
                  message: `${orderUpdate.user} está editando la orden #${orderUpdate.orderId}`,
                  category: "orders",
                  timestamp: orderUpdate.timestamp,
                },
                ...prev.slice(0, 19),
              ]);
              break;
            }

            case "debug_response": {
              const orderId =
                typeof message.data === "object" &&
                message.data !== null &&
                "orderId" in message.data
                  ? (message.data as { orderId?: number }).orderId
                  : undefined;
              console.group(
                "🐛 Debug Info - Orden #" +
                  (orderId !== undefined ? orderId : "N/A")
              );
              console.table(message.data);
              console.groupEnd();
              break;
            }
          }
        } catch (error) {
          console.error("Error procesando mensaje WebSocket:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("❌ Conexión WebSocket cerrada:", event.code);
        setIsConnected(false);
        setSocket(null);

        // Intentar reconectar si no fue un cierre intencional
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          setTimeout(() => {
            console.log(
              `🔄 Intentando reconectar... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`
            );
            reconnectAttempts.current++;
            reconnectDelay.current = Math.min(
              reconnectDelay.current * 2,
              30000
            ); // Máximo 30 segundos
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Error WebSocket:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Error creando conexión WebSocket:", error);
    }
  }, []);

  // Función para enviar actualizaciones de órdenes (colaboración)
  const sendOrderUpdate = useCallback(
    (orderId: number, changes: Record<string, unknown>, user: string) => {
      if (socket && isConnected) {
        socket.send(
          JSON.stringify({
            type: "order_update",
            orderId,
            changes,
            user,
            timestamp: new Date().toISOString(),
          })
        );
      }
    },
    [socket, isConnected]
  );

  // Función para solicitar debug de una orden
  const requestOrderDebug = useCallback(
    (orderId: number) => {
      if (socket && isConnected) {
        socket.send(
          JSON.stringify({
            type: "production_debug",
            orderId,
            timestamp: new Date().toISOString(),
          })
        );
      }
    },
    [socket, isConnected]
  );

  // Función para limpiar notificaciones
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Función para remover una notificación específica
  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Conectar al montar el componente
  useEffect(() => {
    // Solicitar permisos de notificación
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    connect();

    // Cleanup al desmontar
    return () => {
      if (socket) {
        socket.close(1000, "Component unmounting");
      }
    };
  }, [connect, socket]);

  return {
    // Estado de conexión
    isConnected,
    socket,

    // Datos en tiempo real
    dashboardData,
    notifications,
    orderUpdates,

    // Funciones
    sendOrderUpdate,
    requestOrderDebug,
    clearNotifications,
    removeNotification,

    // Función para reconectar manualmente
    reconnect: connect,
  };
}
