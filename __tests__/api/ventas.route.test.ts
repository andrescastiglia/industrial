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
import { GET, POST } from "@/app/api/ventas/route";

describe("/api/ventas route", () => {
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

  it("normalizes GET responses using canonical sales states and numeric totals", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          orden_venta_id: 15,
          cliente_id: 3,
          fecha_pedido: "2026-03-01T00:00:00.000Z",
          fecha_entrega_estimada: "2026-03-15T00:00:00.000Z",
          fecha_entrega_real: null,
          estado: "Entregada",
          total_venta: "450.50",
          cliente_nombre: "Cliente Demo",
          cliente_contacto: "Ana",
          detalle: [
            {
              detalle_orden_venta_id: 1,
              orden_venta_id: 15,
              producto_id: 9,
              cantidad: 2,
              precio_unitario_venta: "225.25",
            },
          ],
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/ventas?estado=entregada") as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        estado: "entregada",
        total_venta: 450.5,
        detalle: [
          expect.objectContaining({
            precio_unitario_venta: 225.25,
          }),
        ],
      }),
    ]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("calculates total_venta from detalles on POST", async () => {
    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            orden_venta_id: 21,
            cliente_id: 3,
            fecha_pedido: new Date("2026-03-02"),
            fecha_entrega_estimada: new Date("2026-03-18"),
            fecha_entrega_real: null,
            estado: "confirmada",
            total_venta: "250",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            detalle_orden_venta_id: 10,
            orden_venta_id: 21,
            producto_id: 7,
            cantidad: 2,
            precio_unitario_venta: "50",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            detalle_orden_venta_id: 11,
            orden_venta_id: 21,
            producto_id: 8,
            cantidad: 3,
            precio_unitario_venta: "50",
          },
        ],
      })
      .mockResolvedValueOnce({}); // COMMIT

    const response = await POST(
      new Request("http://localhost/api/ventas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cliente_id: 3,
          fecha_pedido: "2026-03-02",
          fecha_entrega_estimada: "2026-03-18",
          estado: "Confirmada",
          detalles: [
            {
              producto_id: 7,
              cantidad: 2,
              precio_unitario_venta: 50,
            },
            {
              producto_id: 8,
              cantidad: 3,
              precio_unitario_venta: 50,
            },
          ],
        }),
      }) as any
    );

    const body = await response.json();
    const insertVentaParams = mockQuery.mock.calls[1][1];

    expect(response.status).toBe(201);
    expect(insertVentaParams[5]).toBe(250);
    expect(body).toEqual(
      expect.objectContaining({
        estado: "confirmada",
        total_venta: 250,
      })
    );
    expect(body.detalle).toHaveLength(2);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
