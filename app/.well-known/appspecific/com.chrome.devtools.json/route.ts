import { NextResponse } from "next/server";
import { getDevToolsConfig } from "../../../../lib/websocket-config";

export async function GET() {
  const config = getDevToolsConfig();

  return NextResponse.json({
    version: "1.0",
    name: "Sistema de Gestión Industrial - Maese",
    url: "https://maese.com.ar",
    description: "Sistema integral para la gestión de procesos industriales",
    webSocketDebuggerUrl: config.webSocketDebuggerUrl,
    devtoolsFrontendUrl: config.devtoolsFrontendUrl,
    faviconUrl: "/favicon.ico",
    type: "page",
    // Metadatos específicos de tu aplicación
    industrialFeatures: {
      realTimeUpdates: process.env.NODE_ENV === "development",
      productionMonitoring: true,
      inventoryTracking: true,
      orderFlowDebugging: process.env.NODE_ENV === "development",
      websocketConfig: {
        url: config.displayUrl,
      },
    },
  });
}
