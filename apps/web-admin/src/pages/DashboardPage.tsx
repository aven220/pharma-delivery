import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { dashboardApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '@pharma/types';
import { Package, Truck, CheckCircle, XCircle, Phone, Users, Headphones } from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionBlock({
  title,
  subtitle,
  accentClass,
  children,
}: {
  title: string;
  subtitle: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border p-5 ${accentClass}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
    </section>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await dashboardApi.getStats();
      return res.data.data as DashboardStats;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div>Cargando dashboard...</div>;

  const stats = data!;
  const op = stats.operational;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Panel operativo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen separado por gestión de llamadas (operadores) y paquetería (domiciliarios).
        </p>
      </div>

      {op && (
        <>
          <SectionBlock
            title="Centro de llamadas"
            subtitle="Entregas pendientes de contacto, confirmación telefónica y bajas por gestión."
            accentClass="border-amber-200 bg-amber-50/40"
          >
            <StatCard title="Pendientes llamada" value={op.pendingCall} icon={Phone} color="bg-amber-500" />
            <StatCard title="Llamadas realizadas" value={op.callCompleted} icon={Headphones} color="bg-yellow-600" />
            <StatCard title="Confirmados (llamada)" value={op.confirmed} icon={CheckCircle} color="bg-emerald-600" />
            <StatCard title="Dados de baja" value={op.deactivated} icon={Users} color="bg-gray-500" />
            <StatCard title="Entregas pend. llamada" value={op.pendingPatients} icon={Phone} color="bg-orange-500" />
          </SectionBlock>

          <SectionBlock
            title="Paquetería y domiciliarios"
            subtitle="Entregas ya confirmadas en campo: asignación, ruta y cierre."
            accentClass="border-blue-200 bg-blue-50/40"
          >
            <StatCard title="Asignados" value={op.assigned} icon={Package} color="bg-blue-500" />
            <StatCard title="En ruta" value={op.inRoute} icon={Truck} color="bg-indigo-500" />
            <StatCard title="Entregados" value={op.delivered} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Fallidos" value={op.failed} icon={XCircle} color="bg-red-500" />
            <StatCard title="Incidencias hoy" value={op.incidents} icon={XCircle} color="bg-orange-600" />
          </SectionBlock>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Domiciliarios activos" value={stats.activeCouriers} icon={Truck} color="bg-purple-500" />
        <StatCard title="Llamadas hoy" value={stats.callsToday} icon={Phone} color="bg-amber-500" />
        <StatCard title="Efectividad llamadas" value={`${stats.callEffectiveness}%`} icon={Headphones} color="bg-indigo-500" />
        <StatCard title="Entregados (total)" value={stats.delivered} icon={CheckCircle} color="bg-green-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entregas diarias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="delivered" fill="#22c55e" name="Entregados" />
                <Bar dataKey="failed" fill="#ef4444" name="Fallidos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.weeklyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-amber-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-amber-600" />
              Rendimiento operadores (llamadas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.operatorPerformance.map((opPerf) => (
                <div key={opPerf.operatorId} className="flex items-center justify-between rounded-md border p-3">
                  <span>{opPerf.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {opPerf.answered}/{opPerf.totalCalls} ({opPerf.effectiveness}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Rendimiento domiciliarios (paquetería)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.courierPerformance.map((c) => (
                <div key={c.courierId} className="flex items-center justify-between rounded-md border p-3">
                  <span>{c.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {c.completed}/{c.totalDeliveries} ({c.completionRate}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
