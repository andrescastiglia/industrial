import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { authenticateApiRequest } from "@/lib/api-auth";
import { pool } from "@/lib/database";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/change-password
 * Permite a un usuario autenticado cambiar su contraseña
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // 2. Validar inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // 3. Validar que las contraseñas nuevas coincidan
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Las contraseñas nuevas no coinciden" },
        { status: 400 }
      );
    }

    // 4. Validar longitud mínima de la nueva contraseña
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // 5. Validar que la nueva contraseña sea diferente a la actual
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser diferente a la actual" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // 6. Obtener el hash de la contraseña actual del usuario
      const userQuery = `
        SELECT password_hash 
        FROM usuarios 
        WHERE user_id = $1 AND is_active = true
      `;
      const userResult = await client.query(userQuery, [auth.user.userId]);

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      const currentHash = userResult.rows[0].password_hash;

      // 7. Verificar que la contraseña actual sea correcta
      const isValidPassword = await verifyPassword(
        currentPassword,
        currentHash
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "La contraseña actual es incorrecta" },
          { status: 401 }
        );
      }

      // 8. Hashear la nueva contraseña
      const newHash = await hashPassword(newPassword);

      // 9. Actualizar la contraseña en la base de datos
      const updateQuery = `
        UPDATE usuarios 
        SET 
          password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
      await client.query(updateQuery, [newHash, auth.user.userId]);

      return NextResponse.json(
        {
          message: "Contraseña actualizada exitosamente",
          success: true,
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error during password change:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
