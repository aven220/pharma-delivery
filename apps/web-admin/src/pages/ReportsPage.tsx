import { useMemo, useState } from 'react';
import { reportsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/textarea';
import { Download } from 'lucide-react';
import { DELIVERY_STATUS_LABELS } from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

type ReportDef = {
  type: string;
  label: string;
  description: string;
  group: string;
  dateField?: string;
  supportsStatus?: boolean;
};

const REPORTS: ReportDef[] = [
  {
    type: 'patients-active',
    label: 'Pacientes activos',
    description: 'Pacientes con entregas vigentes en el sistema.',
    group: 'Pacientes',
  },
  {
    type: 'patients-pending-calls',
    label: 'Pacientes pendientes de llamada',
    description: 'Pacientes con entregas en cola de llamadas o reagendadas.',
    group: 'Pacientes',
  },
  {
    type: 'deliveries-pending-calls',
    label: 'Entregas pendientes de llamada',
    description: 'Base pendiente: PENDING_CALL, reagendadas y en gestión telefónica.',
    group: 'Entregas',
    dateField: 'fecha creación',
    supportsStatus: true,
  },
  {
    type: 'deliveries-confirmed',
    label: 'Entregas confirmadas',
    description: 'Confirmadas para entrega, listas para asignación o ruta.',
    group: 'Entregas',
    dateField: 'fecha actualización',
  },
  {
    type: 'deliveries-in-field',
    label: 'Entregas en campo',
    description: 'Asignadas o en ruta con domiciliario/conductor.',
    group: 'Entregas',
    dateField: 'fecha actualización',
  },
  {
    type: 'deliveries-completed',
    label: 'Entregas completadas',
    description: 'Marcadas como entregadas con evidencia.',
    group: 'Entregas',
    dateField: 'fecha entrega',
  },
  {
    type: 'deliveries-partial',
    label: 'Entregas parciales',
    description: 'Entregado parcial en campo.',
    group: 'Entregas',
    dateField: 'fecha entrega',
  },
  {
    type: 'deliveries-not-delivered',
    label: 'Entregas no entregadas / fallidas',
    description: 'No entregadas o fallidas en campo.',
    group: 'Entregas',
    dateField: 'fecha fallo',
  },
  {
    type: 'deliveries-for-recall',
    label: 'Entregas para re-llamar',
    description: 'Parciales y no entregadas disponibles para nueva gestión.',
    group: 'Entregas',
    dateField: 'fecha actualización',
  },
  {
    type: 'deliveries-general',
    label: 'Entregas — detalle general',
    description: 'Listado completo con paciente, medicamentos, ruta y domiciliario.',
    group: 'Entregas',
    dateField: 'fecha creación',
    supportsStatus: true,
  },
  {
    type: 'deliveries-by-status',
    label: 'Entregas — resumen por estado',
    description: 'Conteo agrupado por estado de entrega.',
    group: 'Entregas',
    dateField: 'fecha creación',
  },
  {
    type: 'deliveries-with-items',
    label: 'Entregas con medicamentos',
    description: 'Una fila por medicamento: CUM, cantidad, lote y estado de entrega.',
    group: 'Entregas',
    dateField: 'fecha creación',
    supportsStatus: true,
  },
  {
    type: 'calls-assignments',
    label: 'Asignaciones de llamadas',
    description: 'Cola operativa de llamadas por operador y entrega.',
    group: 'Llamadas',
    dateField: 'fecha asignación',
  },
  {
    type: 'calls-pending',
    label: 'Llamadas pendientes',
    description: 'Asignaciones sin completar (pendientes, no contestó, en gestión).',
    group: 'Llamadas',
    dateField: 'fecha asignación',
  },
  {
    type: 'calls-completed',
    label: 'Llamadas completadas',
    description: 'Gestiones telefónicas finalizadas con resultado.',
    group: 'Llamadas',
    dateField: 'fecha completada',
  },
  {
    type: 'calls-history',
    label: 'Historial de llamadas',
    description: 'Registro detallado de cada llamada realizada.',
    group: 'Llamadas',
    dateField: 'fecha llamada',
  },
  {
    type: 'calls-by-operator',
    label: 'Llamadas por operador',
    description: 'Resumen de resultados de gestión por operador.',
    group: 'Llamadas',
    dateField: 'fecha completada',
  },
  {
    type: 'intermunicipal-routes',
    label: 'Rutas intermunicipales',
    description: 'Resumen de rutas con totales entregados, parciales y pendientes.',
    group: 'Rutas intermunicipales',
    dateField: 'fecha ruta',
  },
  {
    type: 'intermunicipal-route-deliveries',
    label: 'Entregas por ruta intermunicipal',
    description: 'Detalle de paquetes por ruta, orden de parada y conductor.',
    group: 'Rutas intermunicipales',
    dateField: 'fecha ruta',
  },
  {
    type: 'courier-routes-daily',
    label: 'Rutas diarias de domiciliario',
    description: 'Rutas diarias con paradas, completadas y pendientes.',
    group: 'Domiciliarios',
    dateField: 'fecha ruta',
  },
  {
    type: 'assignments-general',
    label: 'Asignaciones generales',
    description: 'Todas las asignaciones a domiciliarios y rutas.',
    group: 'Domiciliarios',
    dateField: 'fecha asignación',
  },
  {
    type: 'couriers-deliveries',
    label: 'Entregas por domiciliario',
    description: 'Entregas asignadas con estado final en campo.',
    group: 'Domiciliarios',
    dateField: 'fecha asignación',
  },
  {
    type: 'couriers-incidents',
    label: 'Incidencias de domiciliarios',
    description: 'Incidencias reportadas desde la app móvil.',
    group: 'Domiciliarios',
    dateField: 'fecha incidencia',
  },
  {
    type: 'couriers-effectiveness',
    label: 'Efectividad de domiciliarios',
    description: 'Entregadas, parciales, no entregadas, incidencias y tasas.',
    group: 'Domiciliarios',
    dateField: 'fecha asignación',
  },
  {
    type: 'incidents-general',
    label: 'Incidencias generales',
    description: 'Todas las incidencias con ubicación y resolución.',
    group: 'Operación',
    dateField: 'fecha incidencia',
  },
  {
    type: 'delivery-status-log',
    label: 'Historial de estados de entrega',
    description: 'Auditoría de cambios de estado por usuario.',
    group: 'Operación',
    dateField: 'fecha cambio',
    supportsStatus: true,
  },
  {
    type: 'excel-imports',
    label: 'Importaciones Excel',
    description: 'Historial de cargas masivas de base pendiente.',
    group: 'Catálogo e importaciones',
    dateField: 'fecha carga',
  },
  {
    type: 'medications-catalog',
    label: 'Catálogo de medicamentos',
    description: 'Maestro de medicamentos (CUM, laboratorio, presentación).',
    group: 'Catálogo e importaciones',
  },
];

async function downloadReport(
  type: string,
  format: 'xlsx' | 'csv' | 'pdf',
  params: { dateFrom?: string; dateTo?: string; status?: string }
) {
  const res = await reportsApi.download(type, { format, ...params });
  const blob = new Blob([res.data], {
    type:
      format === 'csv'
        ? 'text/csv'
        : format === 'pdf'
          ? 'text/html'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}.${format === 'pdf' ? 'html' : format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const groups = useMemo(() => [...new Set(REPORTS.map((r) => r.group))], []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return REPORTS;
    return REPORTS.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q)
    );
  }, [search]);

  const handleDownload = async (type: string, format: 'xlsx' | 'csv' | 'pdf') => {
    setLoading(`${type}-${format}`);
    try {
      await downloadReport(type, format, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter || undefined,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo generar el reporte'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Reportes administrativos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exportaciones actualizadas con entregas, llamadas, rutas intermunicipales, domiciliarios e importaciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <Label>Estado entrega (opcional)</Label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(DELIVERY_STATUS_LABELS).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Buscar reporte</Label>
            <Input
              placeholder="Nombre o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {groups.map((group) => {
        const items = filteredReports.filter((r) => r.group === group);
        if (items.length === 0) return null;
        return (
          <Card key={group}>
            <CardHeader>
              <CardTitle>{group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((report) => (
                <div
                  key={report.type}
                  className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{report.label}</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    {report.dateField ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Filtro de fecha sobre: {report.dateField}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading === `${report.type}-xlsx`}
                      onClick={() => handleDownload(report.type, 'xlsx')}
                    >
                      <Download className="mr-1 h-4 w-4" /> Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading === `${report.type}-csv`}
                      onClick={() => handleDownload(report.type, 'csv')}
                    >
                      <Download className="mr-1 h-4 w-4" /> CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading === `${report.type}-pdf`}
                      onClick={() => handleDownload(report.type, 'pdf')}
                    >
                      <Download className="mr-1 h-4 w-4" /> HTML
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {filteredReports.length === 0 ? (
        <p className="text-center text-muted-foreground">No hay reportes que coincidan con la búsqueda.</p>
      ) : null}
    </div>
  );
}
