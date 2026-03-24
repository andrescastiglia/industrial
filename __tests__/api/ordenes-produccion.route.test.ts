jest.mock("@/lib/database", () => ({
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock("@/lib/api-auth", () => ({
  authenticateApiRequest: jest.fn(),
  checkApiPermission: jest.fn(),
  logApiOperation: jest.fn(),
}));

jest.mock("@/lib/production-calculations", () => ({
  calculateMaterialConsumption: jest.fn(),
}));

import { pool } from "@/lib/database";
import { authenticateApiRequest, checkApiPermission } from "@/lib/api-auth";
import { calculateMaterialConsumption } from "@/lib/production-calculations";
import { GET, POST } from "@/app/api/ordenes-produccion/route";

describe("/api/ordenes-produccion route", () => {
  const mockQuery = jest.fn();
  const mockRelease = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (pool.connect as jest.Mock).mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
    (authenticateApiRequest as jest.Mock).mockReturnValue({
      user: {
        userId: 1,
        email: "admin@test.com",
        role: "admin",
      },
    });
    (checkApiPermission as jest.Mock).mockReturnValue(null);
  });

  it("normalizes GET responses using canonical production states", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          orden_produccion_id: 9,
          orden_venta_id: 4,
          producto_id: 12,
          cantidad_a_producir: 5,
          fecha_creacion: "2026-03-01T00:00:00.000Z",
          fecha_inicio: null,
          fecha_fin_estimada: "2026-03-10T00:00:00.000Z",
          fecha_fin_real: null,
          estado: "Planificada",
          consumos: [
            {
              consumo_id: 1,
              orden_produccion_id: 9,
              materia_prima_id: 30,
              cantidad_requerida: "10.5",
              cantidad_usada: "5",
              merma_calculada: "0.3",
              fecha_registro: "2026-03-01T00:00:00.000Z",
            },
          ],
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/ordenes-produccion") as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        estado: "pendiente",
        consumos: [
          expect.objectContaining({
            cantidad_requerida: 10.5,
            cantidad_usada: 5,
            merma_calculada: 0.3,
          }),
        ],
      }),
    ]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("creates the order and inserts calculated material consumption", async () => {
    (calculateMaterialConsumption as jest.Mock).mockResolvedValueOnce([
      {
        materia_prima_id: 30,
        nombre: "Perfil Blanco",
        cantidad_necesaria_por_unidad: 2,
        cantidad_total: 10,
        cantidad_orden: 5,
      },
    ]);

    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            orden_produccion_id: 9,
            orden_venta_id: 4,
            producto_id: 12,
            cantidad_a_producir: 5,
            fecha_creacion: new Date("2026-03-01"),
            fecha_inicio: null,
            fecha_fin_estimada: new Date("2026-03-10"),
            fecha_fin_real: null,
            estado: "pendiente",
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({}); // COMMIT

    const response = await POST(
      new Request("http://localhost/api/ordenes-produccion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orden_venta_id: 4,
          producto_id: 12,
          cantidad_a_producir: 5,
          fecha_creacion: "2026-03-01T00:00:00.000Z",
          fecha_fin_estimada: "2026-03-10T00:00:00.000Z",
          estado: "Planificada",
        }),
      }) as any
    );

    const body = await response.json();
    const insertConsumoParams = mockQuery.mock.calls[2][1];

    expect(response.status).toBe(201);
    expect(insertConsumoParams[2]).toBe(10);
    expect(body).toEqual(
      expect.objectContaining({
        estado: "pendiente",
        mensaje: expect.stringContaining("consumos calculados"),
      })
    );
    expect(body.consumos).toHaveLength(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("returns a business error when the product has no configured components", async () => {
    (calculateMaterialConsumption as jest.Mock).mockResolvedValueOnce([]);

    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            orden_produccion_id: 9,
            orden_venta_id: null,
            producto_id: 12,
            cantidad_a_producir: 5,
            fecha_creacion: new Date("2026-03-01"),
            fecha_inicio: null,
            fecha_fin_estimada: null,
            fecha_fin_real: null,
            estado: "pendiente",
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const response = await POST(
      new Request("http://localhost/api/ordenes-produccion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          producto_id: 12,
          cantidad_a_producir: 5,
          fecha_creacion: "2026-03-01T00:00:00.000Z",
          estado: "pendiente",
        }),
      }) as any
    );

    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.message).toContain("no tiene componentes");
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
