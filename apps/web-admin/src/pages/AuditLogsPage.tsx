import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/api-error';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  user: { email: string; firstName: string; lastName: string } | null;
}

export function AuditLogsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await auditApi.list({ limit: 100 });
      return res.data as { data: AuditRow[]; meta: { total: number } };
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de acciones del sistema · {data?.meta.total ?? 0} eventos
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {isError && (
        <p className="text-sm text-red-500">
          {getApiErrorMessage(error, 'No se pudo cargar la auditoría.')}
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Usuario</th>
                <th className="p-3 font-medium">Acción</th>
                <th className="p-3 font-medium">Entidad</th>
                <th className="p-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString('es-CO')}
                  </td>
                  <td className="p-3">
                    {row.user
                      ? `${row.user.firstName} ${row.user.lastName} (${row.user.email})`
                      : '—'}
                  </td>
                  <td className="p-3">{row.action}</td>
                  <td className="p-3">
                    {row.entity}
                    {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ''}
                  </td>
                  <td className="p-3">{row.ipAddress ?? '—'}</td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Sin registros de auditoría
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
