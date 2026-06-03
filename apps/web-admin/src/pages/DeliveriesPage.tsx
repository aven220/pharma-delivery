import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deliveriesApi, assignmentsApi, intermunicipalRoutesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/textarea';
import { DELIVERY_STATUS_LABELS, PRIORITY_LABELS } from '@/constants/labels';
import type { DeliveryDTO } from '@pharma/types';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_ROUTE: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-600 font-bold',
  HIGH: 'text-orange-600',
  MEDIUM: 'text-gray-600',
  LOW: 'text-gray-400',
};

interface FilterOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function DeliveriesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [courierId, setCourierId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [assignedById, setAssignedById] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const showDeliveredFilters = status === 'DELIVERED';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['deliveries', search, status, courierId, driverId, assignedById, municipalityId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await deliveriesApi.list({
        search,
        status: status || undefined,
        courierId: courierId || undefined,
        driverId: driverId || undefined,
        assignedById: assignedById || undefined,
        municipalityId: municipalityId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 50,
      });
      return res.data;
    },
  });

  const { data: couriers } = useQuery({
    queryKey: ['deliveries-filter-couriers'],
    queryFn: async () => (await assignmentsApi.listCouriers()).data.data as FilterOption[],
    enabled: showDeliveredFilters,
  });

  const { data: drivers } = useQuery({
    queryKey: ['deliveries-filter-drivers'],
    queryFn: async () => (await intermunicipalRoutesApi.listDrivers()).data.data as FilterOption[],
    enabled: showDeliveredFilters,
  });

  const { data: municipalities } = useQuery({
    queryKey: ['deliveries-filter-municipalities'],
    queryFn: async () =>
      (await intermunicipalRoutesApi.listMunicipalities({ limit: 100 })).data.data as Array<{
        id: string;
        name: string;
      }>,
    enabled: showDeliveredFilters,
  });

  const deliveries = (data?.data || []) as DeliveryDTO[];

  const clearDeliveredFilters = () => {
    setCourierId('');
    setDriverId('');
    setAssignedById('');
    setMunicipalityId('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Entregas</h2>
        <Button onClick={() => refetch()}>Actualizar</Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Buscar por nombre, cédula, número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            if (e.target.value !== 'DELIVERED') clearDeliveredFilters();
          }}
          className="rounded-md border px-3 py-2"
        >
          <option value="">Todos los estados</option>
          {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {showDeliveredFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros de entregas realizadas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Domiciliario</Label>
              <Select value={courierId} onChange={(e) => setCourierId(e.target.value)} className="mt-1">
                <option value="">Todos</option>
                {(couriers || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Conductor de ruta</Label>
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mt-1">
                <option value="">Todos</option>
                {(drivers || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Municipio</Label>
              <Select value={municipalityId} onChange={(e) => setMunicipalityId(e.target.value)} className="mt-1">
                <option value="">Todos</option>
                {(municipalities || []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Usuario asignador (ID)</Label>
              <Input
                className="mt-1"
                placeholder="ID del usuario que asignó"
                value={assignedById}
                onChange={(e) => setAssignedById(e.target.value)}
              />
            </div>
            <div>
              <Label>Entregadas desde</Label>
              <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Entregadas hasta</Label>
              <Input type="date" className="mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearDeliveredFilters}>Limpiar filtros</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <Link to={`/deliveries/${d.id}`} className="hover:text-primary">
                      {d.deliveryNumber}
                    </Link>
                  </CardTitle>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${statusColors[d.status] || 'bg-gray-100'}`}>
                      {DELIVERY_STATUS_LABELS[d.status] || d.status}
                    </span>
                    <span className={`text-xs ${priorityColors[d.priority]}`}>
                      {PRIORITY_LABELS[d.priority] || d.priority}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <p className="font-medium">{d.patient.firstName} {d.patient.lastName}</p>
                    <p className="text-sm text-muted-foreground">CC: {d.patient.documentId}</p>
                    <p className="text-sm">{d.patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm">{d.patient.address}</p>
                    {d.scheduledDate && (
                      <p className="text-sm text-muted-foreground">
                        {new Date(d.scheduledDate).toLocaleDateString()} {d.scheduledTime}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{d.items.length} medicamento(s)</p>
                    {d.items.map((item) => (
                      <p key={item.id} className="text-sm text-muted-foreground">
                        {item.medication.name} x{item.quantity}
                      </p>
                    ))}
                    {d.assignment && (
                      <p className="mt-1 text-sm">
                        Domiciliario: {d.assignment.courier.firstName} {d.assignment.courier.lastName}
                      </p>
                    )}
                    {(d.evidenceCount ?? 0) > 0 && (
                      <p className="mt-1 text-sm text-primary">
                        {d.evidenceCount} foto(s) de evidencia
                      </p>
                    )}
                    <Link to={`/deliveries/${d.id}`} className="mt-2 inline-block text-sm text-primary hover:underline">
                      Ver detalle y fotos →
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {deliveries.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay entregas con los filtros seleccionados.</p>
          )}
        </div>
      )}
    </div>
  );
}
