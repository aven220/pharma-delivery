import type { DeliveryDTO } from '@pharma/types';

interface RouteDeliveryItem {
  id: string;
  stopOrder: number;
  delivery: {
    id: string;
    deliveryNumber: string;
    status: DeliveryDTO['status'];
    priority?: DeliveryDTO['priority'];
    patient: {
      id: string;
      documentId: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      address: string;
    };
    items: Array<{
      id?: string;
      quantity: number;
      lotNumber?: string | null;
      medication: { id?: string; code?: string; name: string };
    }>;
  };
}

export function mapRouteDeliveriesToDto(
  items: RouteDeliveryItem[]
): DeliveryDTO[] {
  return items.map((item) => {
    const d = item.delivery;
    return {
      id: d.id,
      deliveryNumber: d.deliveryNumber,
      status: d.status,
      priority: d.priority ?? 'MEDIUM',
      scheduledDate: null,
      scheduledTime: null,
      patient: {
        id: d.patient.id,
        documentId: d.patient.documentId,
        firstName: d.patient.firstName,
        lastName: d.patient.lastName,
        phone: d.patient.phone ?? null,
        address: d.patient.address,
      },
      items: d.items.map((row, index) => ({
        id: row.id ?? `${d.id}-item-${index}`,
        quantity: row.quantity,
        lotNumber: row.lotNumber ?? null,
        medication: {
          id: row.medication.id ?? row.medication.code ?? `med-${index}`,
          code: row.medication.code ?? '',
          name: row.medication.name,
        },
      })),
      assignment: {
        id: item.id,
        status: 'IN_PROGRESS',
        routeOrder: item.stopOrder,
        courier: { id: '', firstName: '', lastName: '' },
      },
    };
  });
}
