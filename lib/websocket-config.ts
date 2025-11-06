/**
 * Configuración centralizada para WebSocket
 * Evita hardcodear puertos y hosts en múltiples lugares
 */

export interface WebSocketConfig {
  host: string;
  port: number;
  protocol: "ws" | "wss";
  url: string;
}

/**
 * Obtiene la configuración de WebSocket basada en el entorno
 */
export function getWebSocketConfig(): WebSocketConfig {
  // Siempre usar puerto 3300 sin SSL
  const host =
    typeof window !== "undefined"
      ? window.location.hostname
      : process.env.HOST || process.env.HOSTNAME || "localhost";
  const port = 3300;
  const protocol = "ws"; // Siempre ws, sin SSL

  return {
    host,
    port,
    protocol,
    url: `${protocol}://${host}:${port}`,
  };
}

/**
 * Obtiene la URL de WebSocket para el cliente
 */
export function getClientWebSocketUrl(): string {
  // Siempre usar puerto 3300 sin SSL
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  return `ws://${host}:3300`;
}

/**
 * Obtiene la configuración para DevTools
 */
export function getDevToolsConfig() {
  const host =
    typeof window !== "undefined"
      ? window.location.hostname
      : process.env.HOST || process.env.HOSTNAME || "localhost";
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    webSocketDebuggerUrl: isDevelopment ? `ws://${host}:3300` : "",
    devtoolsFrontendUrl: isDevelopment
      ? `chrome-devtools://devtools/bundled/inspector.html?ws=${host}:9229&experiments=true`
      : "",
    displayUrl: `ws://${host}:3300`,
  };
}
