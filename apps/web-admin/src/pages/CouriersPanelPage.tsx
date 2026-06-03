import { useQuery } from '@tanstack/react-query';
import { couriersApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Truck, AlertTriangle, Wifi } from 'lucide-react';

interface CourierPanelItem {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  zone: string | null;
  activeDeliveries: number;
  completedDeliveries: number;
  incidents: number;
  effectiveness: number;
  isAvailable: boolean;
  lastConnectedAt: string | null;
  lastGpsAt: string | null;
  currentLat: number | null;
  currentLng: number | null;
}

export function CouriersPanelPage() {
  const { data: couriers, isLoading } = useQuery({
    queryKey: ['couriers-panel'],
    queryFn: async () => {
      const res = await couriersApi.panel();
      return res.data.data as CourierPanelItem[];
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div>Cargando panel...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Panel de control domiciliarios</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(couriers || []).map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>{c.firstName} {c.lastName}</span>
                <span className={`text-xs font-normal ${c.isAvailable ? 'text-green-600' : 'text-orange-600'}`}>
                  {c.isAvailable ? 'Disponible' : 'Ocupado'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Doc: {c.documentId || '—'} · Zona: {c.zone || '—'}</p>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-muted p-2 text-center">
                  <Truck className="mx-auto h-4 w-4" />
                  <div className="font-bold">{c.activeDeliveries}</div>
                  <div className="text-xs text-muted-foreground">Activas</div>
                </div>
                <div className="rounded-md bg-muted p-2 text-center">
                  <div className="font-bold">{c.completedDeliveries}</div>
                  <div className="text-xs text-muted-foreground">Completadas</div>
                </div>
                <div className="rounded-md bg-muted p-2 text-center">
                  <AlertTriangle className="mx-auto h-4 w-4" />
                  <div className="font-bold">{c.incidents}</div>
                  <div className="text-xs text-muted-foreground">Incidencias</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Efectividad:</span>
                <span>{c.effectiveness}%</span>
              </div>

              <div className="space-y-1 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Última conexión: {c.lastConnectedAt ? new Date(c.lastConnectedAt).toLocaleString('es-CO') : '—'}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  GPS: {c.lastGpsAt ? new Date(c.lastGpsAt).toLocaleString('es-CO') : '—'}
                  {c.currentLat && c.currentLng && (
                    <span className="ml-1">({c.currentLat.toFixed(4)}, {c.currentLng.toFixed(4)})</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
