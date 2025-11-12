# Guía de Testing

Documentación completa del sistema de testing automatizado del proyecto industrial.

## 📋 Tabla de Contenidos

- [Configuración](#configuración)
- [Ejecutar Tests](#ejecutar-tests)
- [Escribir Tests](#escribir-tests)
- [Cobertura](#cobertura)
- [CI/CD](#cicd)
- [Mejores Prácticas](#mejores-prácticas)

---

## ⚙️ Configuración

### Stack de Testing

- **Jest** v29.x - Framework de testing
- **@testing-library/react** - Testing de componentes React
- **@testing-library/jest-dom** - Matchers personalizados para DOM
- **ts-jest** - Soporte para TypeScript
- **jsdom** - Ambiente de testing para DOM

### Archivos de Configuración

#### `jest.config.js`

Configuración principal de Jest con integración de Next.js:

```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

#### `jest.setup.js`

Setup global con mocks y configuración de ambiente:

```javascript
import "@testing-library/jest-dom";

// Mocks de Next.js
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mocks de Winston logger
jest.mock("./lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));
```

---

## 🚀 Ejecutar Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests
npm test

# Modo watch (desarrollo)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage

# Para CI/CD (optimizado)
npm run test:ci
```

### Ejecutar Tests Específicos

```bash
# Por archivo
npm test error-handler

# Por describe block
npm test -- -t "ValidationError"

# Tests que contienen palabra clave
npm test -- -t "should validate"
```

### Modo Interactivo

```bash
npm run test:watch

# Opciones en watch mode:
# › Press f to run only failed tests
# › Press o to only run tests related to changed files
# › Press p to filter by a filename regex pattern
# › Press t to filter by a test name regex pattern
# › Press q to quit watch mode
# › Press Enter to trigger a test run
```

---

## ✍️ Escribir Tests

### Estructura de Archivos

```
__tests__/
├── lib/
│   ├── error-handler.test.ts
│   ├── validations.test.ts
│   └── business-logic.test.ts
├── api/
│   └── clientes.test.ts
└── components/
    └── Header.test.tsx
```

### Template Básico

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import { tuFuncion } from "@/lib/tu-archivo";

describe("Descripción del módulo", () => {
  beforeEach(() => {
    // Setup antes de cada test
    jest.clearAllMocks();
  });

  describe("tuFuncion", () => {
    it("should hacer algo específico", () => {
      // Arrange: Preparar datos
      const input = "test";

      // Act: Ejecutar función
      const result = tuFuncion(input);

      // Assert: Verificar resultado
      expect(result).toBe("expected");
    });

    it("should manejar casos edge", () => {
      expect(() => tuFuncion(null)).toThrow();
    });
  });
});
```

### Tests de Error Handler

Ejemplo de testing de clases personalizadas:

```typescript
import { NotFoundError, ERROR_CODES } from "@/lib/error-handler";

describe("NotFoundError", () => {
  it("should create with resource name", () => {
    const error = new NotFoundError("Cliente");

    expect(error.message).toBe("Cliente no encontrado");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ERROR_CODES.RES_001);
    expect(error.isOperational).toBe(true);
  });
});
```

### Tests de Validación (Zod)

```typescript
import { emailSchema } from "@/lib/validations/common";

describe("emailSchema", () => {
  it("should validate correct email", () => {
    const result = emailSchema.safeParse("test@example.com");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });

  it("should reject invalid email", () => {
    const result = emailSchema.safeParse("invalid");

    expect(result.success).toBe(false);
  });

  it("should normalize to lowercase", () => {
    const result = emailSchema.safeParse("TEST@EXAMPLE.COM");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });
});
```

### Tests con Mocks

```typescript
const mockQuery = jest.fn();

jest.mock("@/lib/database", () => ({
  pool: {
    query: mockQuery,
  },
}));

describe("Database operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should query database", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: "Test" }],
    });

    const result = await getClientes();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SELECT"),
      expect.any(Array)
    );
    expect(result).toHaveLength(1);
  });
});
```

### Tests Asíncronos

```typescript
describe("Async functions", () => {
  it("should handle async/await", async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  it("should handle promises", () => {
    return fetchData().then((result) => {
      expect(result).toBeDefined();
    });
  });

  it("should handle errors", async () => {
    await expect(fetchInvalidData()).rejects.toThrow("Error message");
  });
});
```

---

## 📊 Cobertura

### Métricas de Cobertura

El proyecto tiene configurado un **umbral mínimo del 60%** en todas las métricas:

- **Statements**: Líneas de código ejecutadas
- **Branches**: Ramas de condicionales (if/else) ejecutadas
- **Functions**: Funciones/métodos invocados
- **Lines**: Líneas totales ejecutadas

### Generar Reporte

```bash
npm run test:coverage
```

Esto genera:

1. **Reporte en consola**: Tabla con porcentajes
2. **Reporte HTML**: `coverage/lcov-report/index.html`
3. **Reporte LCOV**: `coverage/lcov.info`

### Ver Reporte HTML

```bash
# Abrir en navegador
open coverage/lcov-report/index.html
```

### Estado Actual (Ejemplo)

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   78.16 |    69.41 |   80.95 |   80.72 |
 lib                |   78.16 |    69.41 |   80.95 |   80.72 |
  error-handler.ts  |   78.16 |    69.41 |   80.95 |   80.72 | 396-448
  validations.ts    |   59.67 |        0 |       0 |   65.78 | 98-223
--------------------|---------|----------|---------|---------|-------------------
```

### Mejorar Cobertura

**Áreas prioritarias** (según reporte actual):

1. ✅ **Error Handler**: 78% (BUENA)
2. ⚠️ **Validations**: 60% (MÍNIMA)
3. ❌ **API Routes**: 0% (PENDIENTE)
4. ❌ **Components**: 0% (PENDIENTE)

**Estrategia**:

```typescript
// Prioridad 1: Cubrir branches no testeadas
if (condition) {
  // ✅ Caso true testeado
} else {
  // ❌ Caso false SIN test - AGREGAR
}

// Prioridad 2: Funciones no llamadas
export function helperNoTesteada() {
  // ❌ Función nunca invocada - AGREGAR TESTS
}

// Prioridad 3: Error paths
try {
  await operation();
} catch (error) {
  // ❌ Catch block sin test - SIMULAR ERROR
}
```

---

## 🔄 CI/CD

### GitHub Actions Workflow

Configurado en `.github/workflows/test.yml`:

```yaml
name: Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --ci --coverage
      - uses: codecov/codecov-action@v3
```

### Comportamiento

1. **Trigger**: Push a `main`/`develop` o Pull Request
2. **Matrix**: Corre tests en Node 18.x y 20.x
3. **Steps**:
   - Checkout código
   - Setup Node.js
   - Instalar dependencias (`npm ci`)
   - Ejecutar tests con cobertura
   - Subir reporte a Codecov
   - Comentar en PR con métricas

### Pull Request Checks

Cada PR muestra:

```markdown
## 📊 Reporte de Cobertura de Tests

| Métrica    | Cobertura | Estado |
| ---------- | --------- | ------ |
| Statements | 78.16%    | ✅     |
| Branches   | 69.41%    | ✅     |
| Functions  | 80.95%    | ✅     |
| Lines      | 80.72%    | ✅     |

✅ Cobertura aceptable (≥60%)
```

### Integración con Codecov

1. **Crear cuenta**: https://codecov.io
2. **Conectar repo**: Autorizar GitHub
3. **Obtener token**: Settings → Token
4. **Agregar secret**: Repo → Settings → Secrets → `CODECOV_TOKEN`

---

## 🎯 Mejores Prácticas

### 1. Nomenclatura de Tests

```typescript
// ✅ BUENO: Describe claramente qué hace
it("should create cliente with valid data", () => {});
it("should throw ValidationError for invalid email", () => {});
it("should filter out components without materia prima", () => {});

// ❌ MALO: Vago o confuso
it("works", () => {});
it("test1", () => {});
it("cliente", () => {});
```

### 2. AAA Pattern

```typescript
it("should calculate total", () => {
  // Arrange: Preparar todo lo necesario
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 3 },
  ];

  // Act: Ejecutar la función
  const total = calculateTotal(items);

  // Assert: Verificar resultado
  expect(total).toBe(350);
});
```

### 3. Tests Independientes

```typescript
// ✅ BUENO: Cada test es independiente
describe("Calculator", () => {
  it("should add numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("should subtract numbers", () => {
    expect(subtract(5, 3)).toBe(2);
  });
});

// ❌ MALO: Tests dependen uno del otro
let result;
it("should add", () => {
  result = add(2, 3);
  expect(result).toBe(5);
});
it("should use previous result", () => {
  expect(multiply(result, 2)).toBe(10); // Depende del anterior
});
```

### 4. Mocking Mínimo

```typescript
// ✅ BUENO: Mock solo lo necesario
jest.mock("@/lib/database", () => ({
  pool: { query: jest.fn() },
}));

// ❌ MALO: Mock de todo el módulo innecesariamente
jest.mock("@/lib/database");
jest.mock("@/lib/logger");
jest.mock("@/lib/utils");
```

### 5. Tests de Casos Edge

```typescript
describe("divide", () => {
  it("should divide positive numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("should handle zero dividend", () => {
    expect(divide(0, 5)).toBe(0);
  });

  it("should throw on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });

  it("should handle negative numbers", () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it("should handle decimals", () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

### 6. Mensajes Descriptivos

```typescript
// ✅ BUENO: Mensaje claro del error
expect(result.errors).toHaveLength(0);
expect(user.rol).toBe("admin");
expect(price).toBeGreaterThan(0);

// ✅ MEJOR: Con mensaje custom
expect(result.errors).toHaveLength(0, "No debe haber errores de validación");
expect(user.rol).toBe("admin", "Usuario debe tener rol de admin");
```

### 7. DRY en Tests

```typescript
// ✅ BUENO: Reusar setup
describe("Cliente validation", () => {
  const validCliente = {
    nombre: "ACME Corp",
    direccion: "Calle 123",
    telefono: "3001234567",
    email: "test@acme.com",
  };

  it("should validate complete data", () => {
    const result = validate(validCliente);
    expect(result.success).toBe(true);
  });

  it("should reject without nombre", () => {
    const { nombre, ...incomplete } = validCliente;
    const result = validate(incomplete);
    expect(result.success).toBe(false);
  });
});
```

### 8. Setup y Teardown

```typescript
describe("Database operations", () => {
  let connection;

  beforeAll(async () => {
    // Setup único para todos los tests
    connection = await createConnection();
  });

  beforeEach(() => {
    // Setup antes de cada test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup después de cada test
    await clearTable();
  });

  afterAll(async () => {
    // Cleanup final
    await connection.close();
  });

  it("should insert record", async () => {
    // Test code
  });
});
```

---

## 📚 Recursos

### Documentación

- [Jest](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Next.js Testing](https://nextjs.org/docs/testing)

### Matchers Útiles

```typescript
// Igualdad
expect(value).toBe(expected);
expect(obj).toEqual(expected);
expect(obj).toStrictEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Números
expect(num).toBeGreaterThan(3);
expect(num).toBeGreaterThanOrEqual(3.5);
expect(num).toBeLessThan(5);
expect(num).toBeCloseTo(0.3);

// Strings
expect(str).toMatch(/pattern/);
expect(str).toContain("substring");

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);

// Objetos
expect(obj).toHaveProperty("key");
expect(obj).toMatchObject({ key: "value" });

// Funciones
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(() => fn()).toThrow();
```

---

## ✅ Checklist de Testing

### Antes de hacer commit

- [ ] Todos los tests pasan (`npm test`)
- [ ] Cobertura ≥ 60% (`npm run test:coverage`)
- [ ] Sin errores de linting (`npm run lint`)
- [ ] Tests nuevos para features nuevas
- [ ] Tests actualizados para cambios

### Antes de merge PR

- [ ] CI/CD pasa en todas las versiones de Node
- [ ] Reporte de cobertura comentado en PR
- [ ] Code review aprobado
- [ ] Conflictos resueltos
- [ ] Tests de integración pasan

---

## 📈 Métricas del Proyecto

### Estado Actual

- **Tests totales**: 112
- **Suites**: 2
- **Cobertura promedio**: ~70%
- **Archivos testeados**: 2 (error-handler, validations)

### Objetivos

- [ ] ≥ 150 tests
- [ ] ≥ 5 suites
- [ ] ≥ 80% cobertura global
- [ ] Tests para todas las API routes
- [ ] Tests para componentes principales

---

**Última actualización**: 2025-01-15  
**Versión**: 1.0.0
