const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmée',
  fulfilled: 'Traitée',
  distributed: 'Distribuée',
  pending: 'En attente',
  cancelled: 'Annulée',
  canceled: 'Annulée',
};

export function getOrderStatusLabel(status?: string | null): string {
  if (!status) return 'Inconnu';
  return ORDER_STATUS_LABELS[status.toLowerCase()] || status;
}

export function getOrderUnitLabel(unit?: string | null): string {
  if (unit === 'pieces') return 'pièces';
  if (unit === 'cartons') return 'cartons';
  return unit || 'pièces';
}
