
'use client';

import * as React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  Archive,
  LayoutGrid,
  Package,
  Settings,
  Truck,
  FileText,
  Building2,
  Home,
  Tags,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useOrders } from '../orders/orders-context';
import { useDeliveries } from '../deliveries/deliveries-context';
import { useItems } from '../settings/items-context';
import { useWards } from '../settings/wards-context';

const mainNavItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Tableau de bord' },
  { href: '/dashboard/orders', icon: Package, label: 'Commandes' },
  { href: '/dashboard/deliveries', icon: Truck, label: 'Livraisons' },
  { href: '/dashboard/items', icon: Tags, label: 'Articles' },
  { href: '/dashboard/stock', icon: Archive, label: 'Stock' },
  { href: '/dashboard/reports', icon: FileText, label: 'Rapports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
];

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  const { orders } = useOrders();
  const { deliveries } = useDeliveries();
  const { items } = useItems();
  const { wards } = useWards();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => unknown) => {
    setOpen(false);
    command();
  };

  const formattedDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');
  
  if (isMobile) return null;

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative h-9 w-full justify-start rounded-md bg-background/50 text-sm font-normal text-muted-foreground shadow-none transition-all hover:bg-accent hover:text-accent-foreground sm:pr-12 md:w-40 lg:w-64'
        )}
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Rechercher...</span>
        <span className="inline-flex lg:hidden">Rechercher...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tapez une commande ou recherchez..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Pages">
            {mainNavItems.map(item => (
              <CommandItem
                key={item.href}
                value={`nav-${item.href}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />

          {orders && orders.length > 0 && (
            <CommandGroup heading="Commandes Récentes">
              {orders.slice(0, 5).map(order => (
                <CommandItem
                  key={order.id}
                  value={`order-${order.id}`}
                  onSelect={() => runCommand(() => router.push(`/dashboard/orders/${order.id}`))}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span>Commande du {formattedDate(order.date)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {deliveries && deliveries.length > 0 && (
            <CommandGroup heading="Livraisons Récentes">
              {deliveries.slice(0, 5).map(delivery => (
                <CommandItem
                  key={delivery.id}
                  value={`delivery-${delivery.id}`}
                  onSelect={() => runCommand(() => router.push(`/dashboard/deliveries/${delivery.id}`))}
                >
                  <Truck className="mr-2 h-4 w-4" />
                   <span>Livraison de {delivery.supplier} - {formattedDate(delivery.date)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
           <CommandSeparator />
           
          <CommandGroup heading="Paramètres">
              {items && items.filter(i => i.isActive).slice(0, 5).map(item => (
                 <CommandItem
                  key={item.id}
                  value={`item-${item.id}`}
                  onSelect={() => runCommand(() => router.push(`/dashboard/items/${item.id}`))}
                >
                   <Tags className="mr-2 h-4 w-4" />
                  <span>Article: {item.name}</span>
                </CommandItem>
              ))}
                {wards && wards.filter(w => w.isActive).slice(0, 5).map(ward => (
                 <CommandItem
                  key={ward.id}
                  value={`ward-${ward.id}`}
                  onSelect={() => runCommand(() => router.push(`/dashboard/settings`))}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Étage: {ward.name}</span>
                </CommandItem>
              ))}
          </CommandGroup>

        </CommandList>
      </CommandDialog>
    </>
  );
}
