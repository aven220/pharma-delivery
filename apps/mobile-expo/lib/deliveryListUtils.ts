import type { DeliveryDTO } from '@pharma/types';

/** Entregas cerradas en campo: van al final de la lista. */
export const COMPLETED_DELIVERY_STATUSES = [
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'NOT_DELIVERED',
  'FAILED',
  'CANCELLED',
  'RETURNED',
] as const;

export function isDeliveryCompleted(status: string): boolean {
  return COMPLETED_DELIVERY_STATUSES.includes(
    status as (typeof COMPLETED_DELIVERY_STATUSES)[number]
  );
}

export function sortDeliveryDtos(items: DeliveryDTO[]): DeliveryDTO[] {
  return [...items].sort((a, b) => {
    const aDone = isDeliveryCompleted(a.status) ? 1 : 0;
    const bDone = isDeliveryCompleted(b.status) ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (a.assignment?.routeOrder ?? 9999) - (b.assignment?.routeOrder ?? 9999);
  });
}

export function filterDeliveryDtos(items: DeliveryDTO[], search: string): DeliveryDTO[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((d) =>
    matchesDeliverySearch(q, {
      deliveryNumber: d.deliveryNumber,
      documentId: d.patient.documentId,
      firstName: d.patient.firstName,
      lastName: d.patient.lastName,
      address: d.patient.address,
      phone: d.patient.phone ?? undefined,
    })
  );
}

export function sortRouteDeliveryItems<
  T extends { stopOrder: number; delivery: { status: string } },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDone = isDeliveryCompleted(a.delivery.status) ? 1 : 0;
    const bDone = isDeliveryCompleted(b.delivery.status) ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.stopOrder - b.stopOrder;
  });
}

export function filterRouteDeliveryItems<
  T extends {
    stopOrder: number;
    delivery: {
      deliveryNumber: string;
      status: string;
      patient: {
        firstName: string;
        lastName: string;
        documentId: string;
        address: string;
        phone?: string | null;
      };
    };
  },
>(items: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    matchesDeliverySearch(q, {
      deliveryNumber: item.delivery.deliveryNumber,
      documentId: item.delivery.patient.documentId,
      firstName: item.delivery.patient.firstName,
      lastName: item.delivery.patient.lastName,
      address: item.delivery.patient.address,
      phone: item.delivery.patient.phone ?? undefined,
    })
  );
}

function matchesDeliverySearch(
  query: string,
  fields: {
    deliveryNumber?: string;
    documentId?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    phone?: string;
  }
): boolean {
  const haystack = [
    fields.deliveryNumber,
    fields.documentId,
    fields.firstName,
    fields.lastName,
    fields.address,
    fields.phone,
    `${fields.firstName ?? ''} ${fields.lastName ?? ''}`.trim(),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function filterByText<T>(
  items: T[],
  search: string,
  getSearchableText: (item: T) => string
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => getSearchableText(item).toLowerCase().includes(q));
}
