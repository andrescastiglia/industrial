import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  IndustrialDevTools,
  ProductionDebugger,
} from "@/lib/industrial-devtools";
import { useIndustrialWebSocket } from "@/hooks/useIndustrialWebSocket";
import { getClientWebSocketUrl } from "@/lib/websocket-config";

/**
 * Panel de DevTools personalizado para monitoreo industrial
 * Este componente puede ser usado durante el desarrollo para tener
 * un control completo sobre la aplicación industrial
 */
export function IndustrialDevPanel() {
  const {
    isConnected,
    dashboardData,
    notifications,
    orderUpdates,
    requestOrderDebug,
    clearNotifications,
  } = useIndustrialWebSocket();

  const [isVisible, setIsVisible] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<number>(1);

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Simular métricas para demostración
  const mockProductionMetrics = {
    completedOrders: dashboardData?.operariosActivos || 25,
    avgTime: 6.5,
    efficiency: dashboardData?.eficiencia || 85,
    resourceUsage: {
      "Chapa 2mm": 78,
      Tornillería: 92,
      Pintura: 65,
      Soldadura: 88,
    },
    activeOrders: dashboardData?.ordenesPendientes || 12,
    delayedOrders: 3,
  };

  const handleLogMetrics = () => {
    IndustrialDevTools.logProductionMetrics(mockProductionMetrics);
  };

  const handleTrackComponent = () => {
    IndustrialDevTools.trackComponentUsage(1, "Chapa 2mm", 5);
  };

  const handleInventoryAlert = () => {
    IndustrialDevTools.alertInventory("Tornillos M6", 8, 10);
  };

  const handleStartOrderTrace = () => {
    const orderDebugger = ProductionDebugger.traceOrderFlow(selectedOrderId, 4);

    // Simular pasos de producción
    setTimeout(() => {
      orderDebugger.addStep("Inicio de producción", { operator: "Juan Pérez" });
      orderDebugger.addComponent({
        componentId: 1,
        name: "Chapa 2mm",
        quantityUsed: 2,
        orderIds: [selectedOrderId],
        performanceMetrics: {
          avgUsageTime: 15,
          successRate: 98,
          wastePercentage: 2,
        },
      });
    }, 1000);

    setTimeout(() => {
      orderDebugger.addStep("Corte de material", {
        machine: "Cortadora Láser A1",
      });
      orderDebugger.addIssue(
        "Material con leve imperfección detectada",
        "warning"
      );
    }, 3000);

    setTimeout(() => {
      orderDebugger.addStep("Soldadura", { weldType: "MIG" });
    }, 5000);

    setTimeout(() => {
      orderDebugger.addStep("Control de calidad", {
        inspector: "María García",
      });
      orderDebugger.complete();
    }, 7000);
  };

  const handleRequestDebug = () => {
    requestOrderDebug(selectedOrderId);
  };

  const handleGetOverallStats = () => {
    const stats = ProductionDebugger.getOverallStats();
    console.table(stats);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botón flotante para mostrar/ocultar panel */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 bg-orange-600 hover:bg-orange-700"
        size="sm"
      >
        🛠️ DevTools Industrial
      </Button>

      {/* Panel principal */}
      {isVisible && (
        <Card className="w-96 max-h-96 overflow-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🏭 Panel de Control Industrial
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado del Dashboard */}
            <div>
              <h4 className="font-semibold mb-2">
                📊 Dashboard en Tiempo Real
              </h4>
              {dashboardData ? (
                <div className="text-sm space-y-1">
                  <div>Operarios Activos: {dashboardData.operariosActivos}</div>
                  <div>
                    Órdenes Pendientes: {dashboardData.ordenesPendientes}
                  </div>
                  <div>Eficiencia: {dashboardData.eficiencia}%</div>
                  <Progress
                    value={dashboardData.eficiencia}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Esperando datos...</div>
              )}
            </div>

            {/* Notificaciones Activas */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">
                  🔔 Notificaciones ({notifications.length})
                </h4>
                <Button
                  onClick={clearNotifications}
                  size="sm"
                  variant="outline"
                >
                  Limpiar
                </Button>
              </div>
              <div className="max-h-20 overflow-auto">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className="text-xs mb-1 p-1 bg-gray-100 rounded"
                  >
                    <Badge variant="outline" className="mr-1">
                      {notification.type}
                    </Badge>
                    {notification.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Herramientas de Debug */}
            <div>
              <h4 className="font-semibold mb-2">🐛 Herramientas de Debug</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleLogMetrics} size="sm" variant="outline">
                  Log Métricas
                </Button>
                <Button
                  onClick={handleTrackComponent}
                  size="sm"
                  variant="outline"
                >
                  Track Componente
                </Button>
                <Button
                  onClick={handleInventoryAlert}
                  size="sm"
                  variant="outline"
                >
                  Alert Inventario
                </Button>
                <Button
                  onClick={handleGetOverallStats}
                  size="sm"
                  variant="outline"
                >
                  Stats Generales
                </Button>
              </div>
            </div>

            {/* Debug de Órdenes */}
            <div>
              <h4 className="font-semibold mb-2">📋 Debug de Órdenes</h4>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="number"
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  placeholder="ID"
                />
                <Button
                  onClick={handleStartOrderTrace}
                  size="sm"
                  variant="outline"
                >
                  Trace Completo
                </Button>
              </div>
              <Button
                onClick={handleRequestDebug}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Request Debug WebSocket
              </Button>
            </div>

            {/* Colaboración en Tiempo Real */}
            {orderUpdates.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">👥 Colaboración Activa</h4>
                <div className="text-xs space-y-1">
                  {orderUpdates.slice(0, 2).map((update, index) => (
                    <div key={index} className="p-1 bg-blue-50 rounded">
                      {update.user} editó orden #{update.orderId}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info del WebSocket */}
            <div className="text-xs text-gray-500 border-t pt-2">
              WebSocket:{" "}
              {isConnected
                ? `🟢 ${getClientWebSocketUrl()}`
                : "🔴 Desconectado"}
              <br />
              Notificaciones: {notifications.length} activas
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
