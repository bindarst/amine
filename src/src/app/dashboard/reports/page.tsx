
'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, TrendingUp, ShoppingCart, Archive, Layers, Calendar as CalendarIcon, User, ArrowRight, TrendingDown, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrders } from "../orders/orders-context";
import { useItems } from "../settings/items-context";
import { useWards } from '../settings/wards-context';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConsumptionChart from './components/consumption-chart';
import WardDistributionChart from './components/ward-distribution-chart';
import { useIsMobile } from '@/hooks/use-is-mobile';
import ConsumptionOverTimeChart from './components/consumption-over-time-chart';
import { startOfWeek, format, addDays, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useUsers } from '../settings/users-context';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '../notifications-context';
import { useSearchParams } from 'next/navigation';

export default function ReportsPage() {
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { wards, isLoading: isWardsLoading } = useWards();
  const { users, isLoading: isUsersLoading, currentUserProfile } = useUsers();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = React.useState("stats");

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const { notifications, isLoading: isNotificationsLoading } = useNotifications();
  
  const isLoading = isOrdersLoading || isItemsLoading || isWardsLoading || isUsersLoading || isNotificationsLoading;

  const chartRefs = {
    consumptionOverTime: React.useRef(null),
    wardDistribution: React.useRef(null),
    consumption: React.useRef(null),
  };
  
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    if (!date?.from) return orders;
    
    const fromDate = date.from;
    const toDate = date.to ? addDays(date.to, 1) : addDays(fromDate, 1); 

    return orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= fromDate && orderDate < toDate;
    });
  }, [orders, date]);
  
  const adjustments = React.useMemo(() => {
    if (!notifications) return [];
    if (!date?.from) return [];

    const fromDate = date.from;
    const toDate = date.to ? addDays(date.to, 1) : addDays(new Date(), 1);

    return notifications.filter(notif => 
        notif.type === 'info' &&
        notif.title === 'Ajustement manuel du stock' &&
        notif.date.toDate() >= fromDate &&
        notif.date.toDate() < toDate
    );
  }, [notifications, date]);

  const detailedAdjustments = React.useMemo(() => {
    if (!adjustments || !diapers || !users) return [];
    return adjustments.map(adj => {
      const item = diapers.find(d => d.id === adj.data.diaperId);
      const user = users.find(u => u.id === adj.data.userId);
      const difference = adj.data.newQuantity - adj.data.oldQuantity;
      return {
        ...adj,
        itemName: item?.name || 'Article inconnu',
        userName: user?.displayName || 'Utilisateur inconnu',
        difference: difference,
      };
    }).sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
  }, [adjustments, diapers, users]);


  const statsData = React.useMemo(() => {
    if (isLoading) return { consumption: [], wardDistribution: [], consumptionOverTime: [], totalOrders: 0, totalPieces: 0, mostOrderedItem: '', avgConsumption: 0, totalMissing: 0, mostMissingItem: '' };

    const consumption: { [key: string]: number } = {};
    const wardDistribution: { [key: string]: number } = {};
    const consumptionOverTime: { [key: string]: { total: number, orderCount: number } } = {};

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.date);
      const weekStart = startOfWeek(orderDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!consumptionOverTime[weekKey]) {
        consumptionOverTime[weekKey] = { total: 0, orderCount: 0 };
      }
      consumptionOverTime[weekKey].orderCount += 1;

      order.wardOrders.forEach(wo => {
        const ward = wards.find(w => w.id === wo.wardId);
        let wardTotalPieces = 0;

        wo.items.forEach(item => {
          const diaper = diapers.find(d => d.id === item.diaperId);
          if (diaper) {
            const totalPieces = item.unit === 'cartons' ? item.quantity * diaper.piecesPerCarton : item.quantity;
            consumption[diaper.name] = (consumption[diaper.name] || 0) + totalPieces;
            wardTotalPieces += totalPieces;
            consumptionOverTime[weekKey].total += totalPieces;
          }
        });
        
        if (ward) {
            wardDistribution[ward.name] = (wardDistribution[ward.name] || 0) + wardTotalPieces;
        }
      });
    });

    const adjustmentStats: { [key: string]: number } = {};
    let totalMissing = 0;
    detailedAdjustments.forEach(adj => {
      if (adj.difference < 0) {
        const loss = Math.abs(adj.difference);
        totalMissing += loss;
        adjustmentStats[adj.itemName] = (adjustmentStats[adj.itemName] || 0) + loss;
      }
    });
    
    const mostMissingItemData = Object.entries(adjustmentStats).sort((a,b) => b[1] - a[1]);
    const mostMissingItem = mostMissingItemData.length > 0 ? `${mostMissingItemData[0][0]} (-${mostMissingItemData[0][1]})` : 'N/A';

    const consumptionData = Object.entries(consumption).map(([name, value]) => ({ name, total: value })).sort((a,b) => b.total - a.total);
    const wardDistributionData = Object.entries(wardDistribution).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const consumptionOverTimeData = Object.entries(consumptionOverTime).map(([date, data]) => ({ date, total: data.total })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const totalOrders = filteredOrders.length;
    const totalPieces = consumptionData.reduce((sum, item) => sum + item.total, 0);
    const mostOrderedItem = consumptionData.length > 0 ? consumptionData[0].name : 'N/A';
    const uniqueWeeks = Object.keys(consumptionOverTime).length;
    const avgConsumption = uniqueWeeks > 0 ? Math.round(totalPieces / uniqueWeeks) : 0;

    return { consumption: consumptionData, wardDistribution: wardDistributionData, consumptionOverTime: consumptionOverTimeData, totalOrders, totalPieces, mostOrderedItem, avgConsumption, totalMissing, mostMissingItem };
  }, [filteredOrders, diapers, wards, isLoading, detailedAdjustments]);

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    let yPosition = 22;

    doc.setFontSize(18);
    doc.text("Rapport d'Analyse des Commandes", 14, yPosition);
    yPosition += 6;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, yPosition);
    yPosition += 6;
    if (date?.from) {
      doc.text(
        `Période: du ${format(date.from, 'dd/MM/yyyy')} au ${date.to ? format(date.to, 'dd/MM/yyyy') : format(date.from, 'dd/MM/yyyy')}`,
        14, yPosition
      );
    }
    yPosition += 16;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Résumé Statistique", 14, yPosition);
    yPosition += 5;

    const summaryData = [
        ["Consommation Moy./Semaine", `${statsData.avgConsumption.toLocaleString('fr-FR')} pièces`],
        ["Article le Plus Populaire", statsData.mostOrderedItem],
        ["Total des Articles Manquants", statsData.totalMissing.toLocaleString('fr-FR')],
        ["Top Article Manquant", statsData.mostMissingItem],
    ];

    autoTable(doc, {
        startY: yPosition,
        head: [['Indicateur', 'Valeur']],
        body: summaryData,
        theme: 'striped',
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Add charts
    const chartElements = [
        { el: chartRefs.consumptionOverTime.current, title: "Consommation au Fil du Temps" },
        { el: chartRefs.wardDistribution.current, title: "Répartition par Étage" },
        { el: chartRefs.consumption.current, title: "Top 10 Articles Consommés" }
    ];

    for (const chart of chartElements) {
        if (chart.el) {
            if (yPosition + 100 > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.setFontSize(14);
            doc.text(chart.title, 14, yPosition);
            yPosition += 10;
            
            const canvas = await html2canvas(chart.el, { useCORS: true, backgroundColor: null, scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth() - 28;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            doc.addImage(imgData, 'PNG', 14, yPosition, pdfWidth, pdfHeight);
            yPosition += pdfHeight + 15;
        }
    }

     // Add Adjustments Table
    if (detailedAdjustments.length > 0) {
        if (yPosition + 50 > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            yPosition = 20;
        }
        doc.setFontSize(16);
        doc.text("Historique des Ajustements Manuels", 14, yPosition);
        yPosition += 10;
        autoTable(doc, {
            startY: yPosition,
            head: [['Date', 'Article', 'Utilisateur', 'Avant', 'Après', 'Écart']],
            body: detailedAdjustments.map(adj => [
            new Date(adj.date.toDate()).toLocaleString('fr-FR'),
            adj.itemName,
            adj.userName,
            adj.data.oldQuantity.toString(),
            adj.data.newQuantity.toString(),
            adj.difference > 0 ? `+${adj.difference}` : adj.difference.toString(),
            ]),
        });
    }

    doc.save('rapport_analyses_commandes.pdf');
  };
  
    const handleExportCSV = () => {
    if (!filteredOrders.length) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = ["Date Commande", "Etage/Cantou", "Article", "Quantite", "Unite", "Total en Pieces", "Statut", "Cree par"];
    csvContent += headers.join(";") + "\r\n";

    filteredOrders.forEach(order => {
        const creator = users.find(u => u.id === order.userId);
        order.wardOrders.forEach(wo => {
            const ward = wards.find(w => w.id === wo.wardId);
            wo.items.forEach(item => {
                const diaper = diapers.find(d => d.id === item.diaperId);
                const totalPieces = item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity;

                const row = [
                    format(parseISO(order.date), 'dd/MM/yyyy'),
                    ward?.name || 'Inconnu',
                    diaper?.name || 'Inconnu',
                    item.quantity,
                    item.unit,
                    totalPieces,
                    order.status,
                    creator?.displayName || 'Inconnu'
                ];
                csvContent += row.join(";") + "\r\n";
            });
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_commandes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const TABS = [
    { value: 'stats', label: 'Statistiques' },
    { value: 'adjustments', label: 'Ajustements Manuels' },
  ];

  if (currentUserProfile?.role !== 'Admin' && currentUserProfile?.role !== 'Soignant' && currentUserProfile?.role !== 'Agent Logistique') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Accès non autorisé</CardTitle>
                <CardDescription>
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const renderStats = () => (
    isLoading ? (
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conso. Moy./Semaine</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsData.avgConsumption.toLocaleString('fr-FR')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Article Populaire</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{statsData.mostOrderedItem}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Card className="border-destructive/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-destructive">Articles Manquants</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{statsData.totalMissing.toLocaleString('fr-FR')}</div>
                        <p className="text-xs text-muted-foreground">Pièces déclarées manquantes.</p>
                    </CardContent>
                </Card>
                  <Card className="border-destructive/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-destructive">Top Article Manquant</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate text-destructive">{statsData.mostMissingItem}</div>
                        <p className="text-xs text-muted-foreground">Article le plus ajusté à la baisse.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <div ref={chartRefs.consumptionOverTime}><ConsumptionOverTimeChart data={statsData.consumptionOverTime} /></div>
                <div ref={chartRefs.wardDistribution}><WardDistributionChart data={statsData.wardDistribution} /></div>
                <div ref={chartRefs.consumption} className="lg:col-span-2"><ConsumptionChart data={statsData.consumption}/></div>
            </div>
          </div>
      )
  );

  const renderAdjustments = () => (
    <Card>
        <CardHeader>
          <CardTitle>Ajustements Manuels du Stock</CardTitle>
          <CardDescription>Suivi des modifications manuelles effectuées sur le stock (écarts d'inventaire, pertes, etc.).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="text-center">Avant</TableHead>
                    <TableHead className="text-center">Après</TableHead>
                    <TableHead className="text-center">Écart</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedAdjustments.map(adj => (
                    <TableRow key={adj.id}>
                      <TableCell className="whitespace-nowrap">{new Date(adj.date.toDate()).toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{adj.itemName}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{adj.userName}</TableCell>
                      <TableCell className="text-center">{adj.data.oldQuantity}</TableCell>
                      <TableCell className="text-center">{adj.data.newQuantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={adj.difference > 0 ? 'success' : 'destructive'}>
                            {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Rapports et Analyses</h1>
          <p className="text-muted-foreground">
            Générez des rapports et visualisez les statistiques de consommation.
          </p>
        </div>
      </div>
      
       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd/MM/y")} - {format(date.to, "dd/MM/y")}
                    </>
                  ) : (
                    format(date.from, "dd/MM/y")
                  )
                ) : (
                  <span>Choisir une date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleExportPDF} disabled={isLoading} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
           <Button onClick={handleExportCSV} disabled={isLoading} variant="outline" className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exporter CSV (Excel)
          </Button>
        </div>

      {(isMobile ?? true) ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Statistiques</h2>
            {renderStats()}
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Ajustements Manuels</h2>
            {renderAdjustments()}
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                {TABS.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="stats">{renderStats()}</TabsContent>
            <TabsContent value="adjustments">{renderAdjustments()}</TabsContent>
        </Tabs>
      )}

    </div>
  );
}

    
