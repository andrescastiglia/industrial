"use client";

import { useState, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validación client-side
      if (!email || !password) {
        setError("Email y contraseña son requeridos");
        setLoading(false);
        return;
      }

      if (!email.includes("@")) {
        setError("Email inválido");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        setLoading(false);
        return;
      }

      // Llamar al API de login
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error en el login");
        setLoading(false);
        return;
      }

      // Guardar tokens en localStorage
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Forzar navegación completa para que el middleware lea la cookie httpOnly
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError("Error conectando con el servidor");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">
            Sistema Industrial
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300"
              >
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          {/* Demo credentials - solo para desarrollo */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                🔧 Credenciales Demo
              </p>
              <div className="space-y-1 text-xs text-slate-400">
                <p>
                  <strong>Admin:</strong> admin@ejemplo.com / admin123
                </p>
                <p>
                  <strong>Gerente:</strong> gerente@ejemplo.com / gerente123
                </p>
                <p>
                  <strong>Operario:</strong> operario@ejemplo.com / operario123
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
