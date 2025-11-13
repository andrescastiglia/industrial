/**
 * Hook para hacer peticiones HTTP autenticadas
 */

import { useCallback } from "react";

interface ApiError {
  message: string;
  statusCode?: number;
}

export function useApi() {
  const getAuthToken = useCallback(() => {
    // Intentar obtener el token de localStorage
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("accessToken") || localStorage.getItem("token")
      );
    }
    return null;
  }, []);

  const request = useCallback(
    async <T>(url: string, options: RequestInit = {}): Promise<T> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Copiar headers existentes
      if (options.headers) {
        const existingHeaders = new Headers(options.headers);
        existingHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      }

      // Agregar token de autenticación si existe
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Si no está autenticado, redirigir al login
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.clear();
            window.location.href = "/login";
          }
          throw new Error("No autorizado");
        }

        // Si hay error, lanzar excepción
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: ApiError = {
            message:
              errorData.error || errorData.message || "Error en la petición",
            statusCode: response.status,
          };
          throw error;
        }

        // Parsear respuesta JSON
        const data = await response.json();
        return data.data || data; // Algunos endpoints envuelven en {data: ...}
      } catch (error: any) {
        // Re-lanzar el error para que el componente lo maneje
        throw error;
      }
    },
    [getAuthToken]
  );

  const get = useCallback(
    <T>(url: string, options?: RequestInit): Promise<T> => {
      return request<T>(url, { ...options, method: "GET" });
    },
    [request]
  );

  const post = useCallback(
    <T>(url: string, data?: any, options?: RequestInit): Promise<T> => {
      return request<T>(url, {
        ...options,
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [request]
  );

  const put = useCallback(
    <T>(url: string, data?: any, options?: RequestInit): Promise<T> => {
      return request<T>(url, {
        ...options,
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    [request]
  );

  const del = useCallback(
    <T>(url: string, options?: RequestInit): Promise<T> => {
      return request<T>(url, { ...options, method: "DELETE" });
    },
    [request]
  );

  return {
    get,
    post,
    put,
    delete: del,
    request,
  };
}
