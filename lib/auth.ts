"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Simulación de autenticación - en producción usar una base de datos real
  if (email === "admin@empresa.com" && password === "admin123") {
    const cookieStore = await cookies()
    cookieStore.set("auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    })
    redirect("/dashboard")
  } else {
    return { error: "Credenciales inválidas" }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("auth")
  redirect("/login")
}

export async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.has("auth")
}
