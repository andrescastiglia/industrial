import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole, JWTPayload } from "@/lib/auth";
import { setUserContext, clearUserContext } from "@/lib/otel-logger";

export interface User {
  id: number;
  email: string;
  role: UserRole;
}

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook para manejar autenticación en componentes client-side
 * Proporciona usuario actual, funciones de logout, y refresh de tokens
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar usuario del localStorage al montar el componente
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Establecer contexto (solo producción)
        setUserContext({
          id: parsedUser.id,
          email: parsedUser.email,
          role: parsedUser.role,
        });
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const logout = async () => {
    try {
      // Llamar al endpoint de logout
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Limpiar tokens y usuario
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      // Limpiar contexto
      clearUserContext();
      // Redirigir a login
      router.push("/login");
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (!refreshTokenValue) {
        throw new Error("No refresh token available");
      }

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      localStorage.setItem("accessToken", data.accessToken);
      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      await logout();
      return false;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        return {
          success: false,
          error: "No estás autenticado. Por favor inicia sesión.",
        };
      }

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Error al cambiar la contraseña",
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error changing password:", error);
      return {
        success: false,
        error: "Error de conexión. Por favor intenta de nuevo.",
      };
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
    refreshToken,
    changePassword,
  };
}

/**
 * Obtener el token de acceso actual
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

/**
 * Obtener headers con autenticación para fetch
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Hacer una llamada autenticada al API
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
