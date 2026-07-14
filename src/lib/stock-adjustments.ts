export function isStockAdjustmentNotification(notification: { title?: string; data?: any }): boolean {
  const title = String(notification.title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return title.includes('ajustement manuel du stock') &&
    Number.isFinite(Number(notification.data?.oldQuantity)) &&
    Number.isFinite(Number(notification.data?.newQuantity));
}
