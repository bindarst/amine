
import * as React from 'react';
import { ItemsProvider } from '@/app/dashboard/settings/items-context';
import { UsersProvider } from '@/app/dashboard/settings/users-context';
import { WardsProvider } from '@/app/dashboard/settings/wards-context';
import { SuppliersProvider } from '@/app/dashboard/settings/suppliers-context';
import { StockProvider } from '@/app/dashboard/stock/stock-context';
import { OrdersProvider } from '@/app/dashboard/orders/orders-context';
import { DeliveriesProvider } from '@/app/dashboard/deliveries/deliveries-context';
import MainLayout from './components/main-layout';
import { NotificationsProvider } from './notifications-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UsersProvider>
      <WardsProvider>
        <ItemsProvider>
          <SuppliersProvider>
            <StockProvider>
              <DeliveriesProvider>
                <OrdersProvider>
                  <NotificationsProvider>
                    <MainLayout>{children}</MainLayout>
                  </NotificationsProvider>
                </OrdersProvider>
              </DeliveriesProvider>
            </StockProvider>
          </SuppliersProvider>
        </ItemsProvider>
      </WardsProvider>
    </UsersProvider>
  );
}
