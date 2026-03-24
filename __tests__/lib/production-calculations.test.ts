jest.mock("@/lib/database", () => ({
  pool: {
    connect: jest.fn(),
  },
}));

import { pool } from "@/lib/database";
import { calculateMaterialConsumption } from "@/lib/production-calculations";

describe("production-calculations.ts", () => {
  const mockQuery = jest.fn();
  const mockRelease = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  it("calculates material consumption from Componentes_Producto", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          materia_prima_id: 2,
          nombre: "Perfil Blanco",
          cantidad_necesaria: "1.5",
        },
        {
          materia_prima_id: 3,
          nombre: "Vidrio",
          cantidad_necesaria: "2",
        },
      ],
    });

    const result = await calculateMaterialConsumption(10, 4);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("FROM Componentes_Producto cp"),
      [10]
    );
    expect(result).toEqual([
      {
        materia_prima_id: 2,
        nombre: "Perfil Blanco",
        cantidad_necesaria_por_unidad: 1.5,
        cantidad_total: 6,
        cantidad_orden: 4,
      },
      {
        materia_prima_id: 3,
        nombre: "Vidrio",
        cantidad_necesaria_por_unidad: 2,
        cantidad_total: 8,
        cantidad_orden: 4,
      },
    ]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("releases the db client even when the query fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db failed"));

    await expect(calculateMaterialConsumption(99, 1)).rejects.toThrow(
      "db failed"
    );
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
