"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  FileSpreadsheet,
  Mail,
  Download,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";

type ReportType = "production" | "sales" | "inventory" | "costs";

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>("production");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [emailRecipients, setEmailRecipients] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const reportTypes = [
    {
      value: "production",
      label: "Producción",
      description: "Órdenes completadas y unidades producidas",
      icon: FileText,
    },
    {
      value: "sales",
      label: "Ventas",
      description: "Ingresos, clientes y tickets promedio",
      icon: FileText,
    },
    {
      value: "inventory",
      label: "Inventario",
      description: "Estado actual y items bajo stock",
      icon: FileText,
    },
    {
      value: "costs",
      label: "Costos",
      description: "Compras y gastos del periodo",
      icon: FileText,
    },
  ];

  const periods = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM 'de' yyyy", { locale: es }),
    };
  });

  const handleDownloadPDF = async () => {
    setIsGenerating(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/reports/pdf?type=${selectedType}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al generar reporte");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${selectedType}_${selectedPeriod}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte generado",
        description: "El reporte PDF se ha descargado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsGenerating(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/reports/excel?type=${selectedType}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al generar reporte");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${selectedType}_${selectedPeriod}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte generado",
        description: "El reporte Excel se ha descargado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) {
      toast({
        title: "Error",
        description: "Ingrese al menos un email destinatario",
        variant: "destructive",
      });
      return;
    }

    const recipients = emailRecipients
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (recipients.length === 0) {
      toast({
        title: "Error",
        description: "Formato de emails inválido",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reports/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedType,
          recipients,
          period: selectedPeriod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al enviar reporte");
      }

      toast({
        title: "Reporte enviado",
        description: `El reporte se ha enviado a ${recipients.length} destinatario(s)`,
      });

      setEmailRecipients("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedReport = reportTypes.find((r) => r.value === selectedType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
        <p className="text-muted-foreground">
          Genera y exporta reportes en PDF o Excel
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
          <CardDescription>
            Selecciona el tipo de reporte y el periodo a generar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Reporte</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-colors ${
                      selectedType === type.value
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedType(type.value as ReportType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {type.description}
                          </p>
                        </div>
                      </div>
                      {selectedType === type.value && (
                        <Badge className="mt-2" variant="default">
                          Seleccionado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <Label htmlFor="period">Periodo</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="period" className="w-full md:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {period.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Preview */}
          {selectedReport && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Reporte a Generar</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.label} -{" "}
                    {periods.find((p) => p.value === selectedPeriod)?.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Descargar Reporte</CardTitle>
          <CardDescription>
            Exporta el reporte en el formato que prefieras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex-1"
              variant="default"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isGenerating ? "Generando..." : "Descargar PDF"}
            </Button>
            <Button
              onClick={handleDownloadExcel}
              disabled={isGenerating}
              className="flex-1"
              variant="outline"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isGenerating ? "Generando..." : "Descargar Excel"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <p>PDF incluye gráficos y formato profesional</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <p>Excel incluye datos brutos y fórmulas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar por Email</CardTitle>
          <CardDescription>
            Envía el reporte automáticamente a los destinatarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipients">
              Destinatarios (separados por coma)
            </Label>
            <Textarea
              id="recipients"
              placeholder="ejemplo@empresa.com, otro@empresa.com"
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              El email incluirá el reporte en formato PDF y Excel adjunto
            </p>
          </div>

          <Button
            onClick={handleSendEmail}
            disabled={isSending || !emailRecipients.trim()}
            className="w-full sm:w-auto"
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSending ? "Enviando..." : "Enviar Reporte"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
