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

import { pool } from "@/lib/database";
import { authenticateApiRequest, checkApiPermission } from "@/lib/api-auth";
import { GET, POST } from "@/app/api/compras/route";

describe("/api/compras route", () => {
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

  it("normalizes GET responses using canonical purchase states and numeric fields", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          compra_id: 11,
          proveedor_id: 5,
          fecha_pedido: "2026-03-01T00:00:00.000Z",
          fecha_recepcion_estimada: "2026-03-10T00:00:00.000Z",
          fecha_recepcion_real: null,
          estado: "Recibida",
          total_compra: "980.50",
          cotizacion_ref: "COT-001",
          proveedor_nombre: "Proveedor Demo",
          detalles: [
            {
              detalle_compra_id: 1,
              compra_id: 11,
              materia_prima_id: 9,
              cantidad_pedida: "12.5",
              cantidad_recibida: "10",
              unidad_medida: "m",
            },
          ],
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/compras?estado=recibida") as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        estado: "recibida",
        total_compra: 980.5,
        detalles: [
          expect.objectContaining({
            cantidad_pedida: 12.5,
            cantidad_recibida: 10,
          }),
        ],
      }),
    ]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("creates a purchase and returns normalized details", async () => {
    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            compra_id: 11,
            proveedor_id: 5,
            fecha_pedido: new Date("2026-03-01"),
            fecha_recepcion_estimada: new Date("2026-03-10"),
            fecha_recepcion_real: null,
            estado: "pendiente",
            total_compra: "980.5",
            cotizacion_ref: "COT-001",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            detalle_compra_id: 1,
            compra_id: 11,
            materia_prima_id: 9,
            cantidad_pedida: "12.5",
            cantidad_recibida: "0",
            unidad_medida: "m",
          },
        ],
      })
      .mockResolvedValueOnce({}); // COMMIT

    const response = await POST(
      new Request("http://localhost/api/compras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proveedor_id: 5,
          fecha_pedido: "2026-03-01",
          fecha_recepcion_estimada: "2026-03-10",
          estado: "Pendiente",
          total_compra: 980.5,
          cotizacion_ref: "COT-001",
          detalles: [
            {
              materia_prima_id: 9,
              cantidad_pedida: 12.5,
              cantidad_recibida: 0,
              unidad_medida: "m",
            },
          ],
        }),
      }) as any
    );

    const body = await response.json();
    const insertCompraParams = mockQuery.mock.calls[1][1];

    expect(response.status).toBe(201);
    expect(insertCompraParams[4]).toBe("pendiente");
    expect(body).toEqual(
      expect.objectContaining({
        estado: "pendiente",
        total_compra: 980.5,
      })
    );
    expect(body.detalles).toHaveLength(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
