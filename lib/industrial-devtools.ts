// Herramientas de debugging y monitoreo para la aplicación industrial

export interface ProductionMetrics {
  completedOrders: number;
  avgTime: number;
  efficiency: number;
  resourceUsage: Record<string, number>;
  activeOrders: number;
  delayedOrders: number;
}

export interface ComponentUsage {
  componentId: number;
  name: string;
  quantityUsed: number;
  orderIds: number[];
  performanceMetrics: {
    avgUsageTime: number;
    successRate: number;
    wastePercentage: number;
  };
}

export interface OrderTraceStep {
  step: string;
  data?: Record<string, unknown>;
  timestamp: number;
  duration?: number;
  status: "pending" | "in_progress" | "completed" | "error";
}

export interface OrderTrace {
  orderId: number;
  steps: OrderTraceStep[];
  startTime: number;
  endTime?: number;
  components: ComponentUsage[];
  issues: Array<{
    issue: string;
    severity: "info" | "warning" | "error";
    timestamp: number;
    resolved?: boolean;
  }>;
  performance: {
    totalDuration: number;
    expectedDuration: number;
    efficiency: number;
  };
}

/**
 * Clase para monitorear métricas de producción
 */
export class IndustrialDevTools {
  private static instance: IndustrialDevTools;
  private metrics: Map<string, number> = new Map();
  private traces: Map<number, OrderTrace> = new Map();

  static getInstance(): IndustrialDevTools {
    if (!IndustrialDevTools.instance) {
      IndustrialDevTools.instance = new IndustrialDevTools();
    }
    return IndustrialDevTools.instance;
  }

  /**
   * Registra métricas de producción en la consola de DevTools
   */
  static logProductionMetrics(metrics: ProductionMetrics): void {
    if (process.env.NODE_ENV === "development") {
      console.group(
        "🏭 Métricas de Producción - " + new Date().toLocaleTimeString()
      );

      // Tabla principal de métricas
      console.table({
        "Órdenes Completadas": metrics.completedOrders,
        "Tiempo Promedio (h)": metrics.avgTime,
        "Eficiencia (%)": metrics.efficiency,
        "Órdenes Activas": metrics.activeOrders,
        "Órdenes Retrasadas": metrics.delayedOrders,
      });

      // Gráfico de eficiencia
      const efficiencyBar = "█".repeat(Math.floor(metrics.efficiency / 5));
      console.log(`📊 Eficiencia: ${efficiencyBar} ${metrics.efficiency}%`);

      // Uso de recursos
      if (Object.keys(metrics.resourceUsage).length > 0) {
        console.group("🔧 Uso de Recursos");
        Object.entries(metrics.resourceUsage).forEach(([resource, usage]) => {
          const usageBar = "▓".repeat(Math.floor(usage / 10));
          console.log(`${resource}: ${usageBar} ${usage}%`);
        });
        console.groupEnd();
      }

      console.groupEnd();
    }
  }

  /**
   * Rastrea el uso de componentes con métricas de performance
   */
  static trackComponentUsage(
    componentId: number,
    name: string,
    quantity: number
  ): ComponentUsage {
    const startMark = `component-${componentId}-start`;
    const endMark = `component-${componentId}-end`;

    if (typeof performance !== "undefined") {
      performance.mark(startMark);

      // Simular medición después del uso
      setTimeout(() => {
        performance.mark(endMark);
        performance.measure(`Component ${name} Usage`, startMark, endMark);

        if (process.env.NODE_ENV === "development") {
          const measures = performance
            .getEntriesByType("measure")
            .filter((entry) => entry.name.includes(name));

          if (measures.length > 0) {
            console.log(
              `⚡ Componente ${name}: ${measures[measures.length - 1].duration.toFixed(2)}ms`
            );
          }
        }
      }, 100);
    }

    return {
      componentId,
      name,
      quantityUsed: quantity,
      orderIds: [],
      performanceMetrics: {
        avgUsageTime: 0,
        successRate: 95,
        wastePercentage: 2.5,
      },
    };
  }

  /**
   * Registra alertas de inventario
   */
  static alertInventory(
    component: string,
    currentStock: number,
    minStock: number
  ): void {
    const severity =
      currentStock <= 0
        ? "error"
        : currentStock <= minStock
          ? "warning"
          : "info";
    const icon =
      severity === "error" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";

    const logFn =
      severity === "error"
        ? console.error
        : severity === "warning"
          ? console.warn
          : console.info;

    logFn(
      `${icon} Inventario ${component}: ${currentStock} unidades (mínimo: ${minStock})`
    );

    if (currentStock <= minStock) {
      console.trace("Stack trace para diagnóstico de inventario bajo");
    }
  }

  /**
   * Monitorea el rendimiento de una orden específica
   */
  static monitorOrderPerformance(
    orderId: number,
    expectedDuration: number
  ): void {
    if (process.env.NODE_ENV === "development") {
      console.time(`⏱️ Orden-${orderId}-Performance`);
      console.log(
        `📋 Iniciando monitoreo de orden #${orderId} (duración esperada: ${expectedDuration}h)`
      );
    }
  }
}

/**
 * Clase para debugging detallado de órdenes de producción
 */
export class ProductionDebugger {
  private static traces: Map<number, OrderTrace> = new Map();

  /**
   * Inicia el rastreo completo de una orden de producción
   */
  static traceOrderFlow(
    orderId: number,
    expectedDuration: number = 8
  ): {
    // eslint-disable-next-line no-unused-vars
    addStep: (step: string, data?: Record<string, unknown>) => void;
    // eslint-disable-next-line no-unused-vars
    addIssue: (issue: string, severity: "info" | "warning" | "error") => void;
    // eslint-disable-next-line no-unused-vars
    addComponent: (component: ComponentUsage) => void;
    complete: () => OrderTrace;
    getTrace: () => OrderTrace | undefined;
  } {
    const trace: OrderTrace = {
      orderId,
      steps: [],
      startTime: Date.now(),
      components: [],
      issues: [],
      performance: {
        totalDuration: 0,
        expectedDuration: expectedDuration * 3600000, // Convertir horas a ms
        efficiency: 0,
      },
    };

    this.traces.set(orderId, trace);

    if (process.env.NODE_ENV === "development") {
      console.group(
        `📋 Trace de Orden #${orderId} - ${new Date().toLocaleTimeString()}`
      );
      console.time(`Order-${orderId}-Total-Duration`);
      console.log(`🎯 Duración esperada: ${expectedDuration}h`);
    }

    return {
      addStep: (step: string, data?: Record<string, unknown>) => {
        const stepData: OrderTraceStep = {
          step,
          data,
          timestamp: Date.now(),
          status: "in_progress",
        };

        trace.steps.push(stepData);

        if (process.env.NODE_ENV === "development") {
          console.log(`✅ ${step}`, data || "");
          console.time(`Step-${step}-Duration`);
        }
      },

      addIssue: (issue: string, severity: "info" | "warning" | "error") => {
        const issueData = {
          issue,
          severity,
          timestamp: Date.now(),
          resolved: false,
        };

        trace.issues.push(issueData);

        if (process.env.NODE_ENV === "development") {
          const icon =
            severity === "error" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";
          const logFn =
            severity === "error"
              ? console.error
              : severity === "warning"
                ? console.warn
                : console.info;
          logFn(`${icon} ${issue}`);

          if (severity === "error") {
            console.trace("Stack trace para diagnóstico del error");
          }
        }
      },

      addComponent: (component: ComponentUsage) => {
        trace.components.push(component);

        if (process.env.NODE_ENV === "development") {
          console.log(
            `🔧 Componente usado: ${component.name} (${component.quantityUsed} unidades)`
          );
        }
      },

      complete: () => {
        trace.endTime = Date.now();
        trace.performance.totalDuration = trace.endTime - trace.startTime;
        trace.performance.efficiency = Math.round(
          (trace.performance.expectedDuration /
            trace.performance.totalDuration) *
            100
        );

        // Marcar último paso como completado
        if (trace.steps.length > 0) {
          trace.steps[trace.steps.length - 1].status = "completed";
        }

        if (process.env.NODE_ENV === "development") {
          console.timeEnd(`Order-${orderId}-Total-Duration`);

          // Resumen final
          console.group("📊 Resumen de la Orden");
          console.table({
            "Orden ID": orderId,
            "Pasos completados": trace.steps.length,
            "Componentes usados": trace.components.length,
            "Problemas encontrados": trace.issues.length,
            Eficiencia: `${trace.performance.efficiency}%`,
            "Duración real (min)": Math.round(
              trace.performance.totalDuration / 60000
            ),
            "Duración esperada (min)": Math.round(
              trace.performance.expectedDuration / 60000
            ),
          });

          if (trace.issues.length > 0) {
            console.group("⚠️ Problemas Detectados");
            trace.issues.forEach((issue) => {
              const logFn =
                issue.severity === "error"
                  ? console.error
                  : issue.severity === "warning"
                    ? console.warn
                    : console.info;
              logFn(`${issue.severity.toUpperCase()}: ${issue.issue}`);
            });
            console.groupEnd();
          }

          console.groupEnd();
          console.groupEnd();
        }

        return trace;
      },

      getTrace: () => this.traces.get(orderId),
    };
  }

  /**
   * Obtiene todas las trazas activas
   */
  static getActiveTraces(): OrderTrace[] {
    return Array.from(this.traces.values()).filter((trace) => !trace.endTime);
  }

  /**
   * Obtiene estadísticas de todas las órdenes rastreadas
   */
  static getOverallStats(): {
    totalOrders: number;
    avgEfficiency: number;
    mostCommonIssues: string[];
    avgDuration: number;
  } {
    const traces = Array.from(this.traces.values());
    const completedTraces = traces.filter((t) => t.endTime);

    if (completedTraces.length === 0) {
      return {
        totalOrders: 0,
        avgEfficiency: 0,
        mostCommonIssues: [],
        avgDuration: 0,
      };
    }

    const avgEfficiency =
      completedTraces.reduce((sum, t) => sum + t.performance.efficiency, 0) /
      completedTraces.length;
    const avgDuration =
      completedTraces.reduce((sum, t) => sum + t.performance.totalDuration, 0) /
      completedTraces.length;

    // Contar problemas más comunes
    const issueCount: Record<string, number> = {};
    completedTraces.forEach((trace) => {
      trace.issues.forEach((issue) => {
        issueCount[issue.issue] = (issueCount[issue.issue] || 0) + 1;
      });
    });

    const mostCommonIssues = Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      totalOrders: traces.length,
      avgEfficiency: Math.round(avgEfficiency),
      mostCommonIssues,
      avgDuration: Math.round(avgDuration / 60000), // Convertir a minutos
    };
  }
}
