
'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, TrendingUp, ShoppingCart, Archive, Layers, Calendar as CalendarIcon, User, ArrowRight, TrendingDown, AlertCircle, FileSpreadsheet, Edit } from "lucide-react";
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
import { startOfWeek, format, addDays, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, getQuarter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useUsers } from '../settings/users-context';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, orderBy, query } from 'firebase/firestore';
import type { Notification } from '@/lib/types';

type ReportDirectDistribution = {
  id: string;
  date: any;
  data: {
    userId?: string;
    recipientName?: string | null;
    reason?: string;
    comment?: string | null;
    items: { diaperId: string; quantity: number; unit?: 'pieces' | 'cartons' }[];
  };
};

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export default function ReportsPage() {
  const { firestore, user } = useFirebase();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { wards, isLoading: isWardsLoading } = useWards();
  const { users, isLoading: isUsersLoading, currentUserProfile } = useUsers();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = React.useState("stats");

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'notifications'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: notifications, isLoading: isNotificationsLoading } = useCollection<Notification>(notificationsQuery);

  const directDistributionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'directDistributions'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: directDistributionDocs, isLoading: isDirectDistributionsLoading } = useCollection<{
    date?: any;
    createdAt?: any;
    userId?: string;
    recipientName?: string | null;
    reason?: string;
    comment?: string | null;
    items?: { diaperId: string; quantity: number; unit?: 'pieces' | 'cartons' }[];
  }>(directDistributionsQuery);

  const isLoading = isOrdersLoading || isItemsLoading || isWardsLoading || isUsersLoading || isNotificationsLoading || isDirectDistributionsLoading;

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

  const allDirectDistributions = React.useMemo<ReportDirectDistribution[]>(() => {
    const durableDistributions = (directDistributionDocs || []).map(distribution => ({
      id: distribution.id,
      date: distribution.date || distribution.createdAt,
      data: {
        userId: distribution.userId,
        recipientName: distribution.recipientName,
        reason: distribution.reason,
        comment: distribution.comment,
        items: distribution.items || [],
      },
    }));

    const signatures = new Set(durableDistributions.map(distribution => [
      distribution.data.userId || '',
      distribution.data.recipientName || '',
      distribution.data.comment || distribution.data.reason || '',
      JSON.stringify(distribution.data.items || []),
    ].join('|')));

    const legacyDistributions = (notifications || []).filter(notif => {
      return notif.type === 'info' &&
        Array.isArray(notif.data?.items) &&
        typeof notif.data?.reason === 'string';
    });

    return [
      ...durableDistributions,
      ...legacyDistributions.filter(distribution => {
        const signature = [
          distribution.data?.userId || '',
          distribution.data?.recipientName || '',
          distribution.data?.comment || distribution.data?.reason || '',
          JSON.stringify(distribution.data?.items || []),
        ].join('|');
        return !signatures.has(signature);
      }),
    ];
  }, [directDistributionDocs, notifications]);

  const directDistributions = React.useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const endDate = date.to ? addDays(date.to, 1) : addDays(fromDate, 1);

    return allDirectDistributions.filter(distribution => {
      const distributionDate = toDate(distribution.date);
      return distributionDate && distributionDate >= fromDate && distributionDate < endDate;
    });
  }, [allDirectDistributions, date]);


  const statsData = React.useMemo(() => {
    if (isLoading) return { consumption: [], wardDistribution: [], consumptionOverTime: [], totalOrders: 0, totalDirectDistributions: 0, totalPieces: 0, mostOrderedItem: '', avgConsumption: 0, totalMissing: 0, mostMissingItem: '' };

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

    directDistributions.forEach(distribution => {
      const distributionDate = toDate(distribution.date);
      if (!distributionDate) return;
      const weekStart = startOfWeek(distributionDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      let distributionTotalPieces = 0;

      if (!consumptionOverTime[weekKey]) {
        consumptionOverTime[weekKey] = { total: 0, orderCount: 0 };
      }

      distribution.data.items.forEach((item: { diaperId: string; quantity: number; unit?: 'pieces' | 'cartons' }) => {
        const diaper = diapers.find(d => d.id === item.diaperId);
        if (diaper) {
          const totalPieces = item.unit === 'cartons' ? item.quantity * diaper.piecesPerCarton : item.quantity;
          consumption[diaper.name] = (consumption[diaper.name] || 0) + totalPieces;
          consumptionOverTime[weekKey].total += totalPieces;
          distributionTotalPieces += totalPieces;
        }
      });

      wardDistribution['Sorties directes'] = (wardDistribution['Sorties directes'] || 0) + distributionTotalPieces;
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

    const mostMissingItemData = Object.entries(adjustmentStats).sort((a, b) => b[1] - a[1]);
    const mostMissingItem = mostMissingItemData.length > 0 ? `${mostMissingItemData[0][0]} (-${mostMissingItemData[0][1]})` : 'N/A';

    const consumptionData = Object.entries(consumption).map(([name, value]) => ({ name, total: value })).sort((a, b) => b.total - a.total);
    const wardDistributionData = Object.entries(wardDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const consumptionOverTimeData = Object.entries(consumptionOverTime).map(([date, data]) => ({ date, total: data.total })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalOrders = filteredOrders.length;
    const totalDirectDistributions = directDistributions.length;
    const totalPieces = consumptionData.reduce((sum, item) => sum + item.total, 0);
    const mostOrderedItem = consumptionData.length > 0 ? consumptionData[0].name : 'N/A';
    const uniqueWeeks = Object.keys(consumptionOverTime).length;
    const avgConsumption = uniqueWeeks > 0 ? Math.round(totalPieces / uniqueWeeks) : 0;

    return { consumption: consumptionData, wardDistribution: wardDistributionData, consumptionOverTime: consumptionOverTimeData, totalOrders, totalDirectDistributions, totalPieces, mostOrderedItem, avgConsumption, totalMissing, mostMissingItem };
  }, [filteredOrders, directDistributions, diapers, wards, isLoading, detailedAdjustments]);

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
      ["Distributions directes", statsData.totalDirectDistributions.toLocaleString('fr-FR')],
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

  const setPresetPeriod = (preset: 'month' | 'quarter' | 'year') => {
    const now = new Date();
    if (preset === 'month') {
      setDate({ from: startOfMonth(now), to: endOfMonth(now) });
    } else if (preset === 'quarter') {
      setDate({ from: startOfQuarter(now), to: endOfQuarter(now) });
    } else {
      setDate({ from: startOfYear(now), to: endOfYear(now) });
    }
  };

  const handleExportQuarterlyPDF = async () => {
    const now = new Date();
    const quarterStart = startOfQuarter(now);
    const quarterEnd = endOfQuarter(now);
    const q = getQuarter(now);
    const year = now.getFullYear();
    const quarterLabel = `Q${q} ${year}`;

    const ordersInQuarter = (orders ?? []).filter(order => {
      const orderDate = new Date(order.date);
      return orderDate >= quarterStart && orderDate <= quarterEnd;
    });

    const directDistributionsInQuarter = allDirectDistributions.filter(distribution => {
      const distributionDate = toDate(distribution.date);
      return distributionDate &&
        distributionDate >= quarterStart &&
        distributionDate <= quarterEnd;
    });

    const adjustmentsInQuarter = (notifications ?? []).filter(notif =>
      notif.type === 'info' &&
      notif.title === 'Ajustement manuel du stock' &&
      notif.date.toDate() >= quarterStart &&
      notif.date.toDate() <= quarterEnd
    );

    const consumption: { [key: string]: number } = {};
    const wardDistribution: { [key: string]: number } = {};
    let totalPieces = 0;
    ordersInQuarter.forEach(order => {
      order.wardOrders.forEach(wo => {
        const ward = wards.find(w => w.id === wo.wardId);
        let wardTotalPieces = 0;
        wo.items.forEach(item => {
          const diaper = diapers.find(d => d.id === item.diaperId);
          if (diaper) {
            const piecesPerCarton = (diaper as { piecesPerCarton?: number }).piecesPerCarton ?? 1;
            const p = item.unit === 'cartons' ? item.quantity * piecesPerCarton : item.quantity;
            consumption[diaper.name] = (consumption[diaper.name] || 0) + p;
            wardTotalPieces += p;
            totalPieces += p;
          }
        });
        if (ward) wardDistribution[ward.name] = (wardDistribution[ward.name] || 0) + wardTotalPieces;
      });
    });

    directDistributionsInQuarter.forEach(distribution => {
      let distributionTotalPieces = 0;
      distribution.data.items.forEach((item: { diaperId: string; quantity: number; unit?: 'pieces' | 'cartons' }) => {
        const diaper = diapers.find(d => d.id === item.diaperId);
        if (diaper) {
          const p = item.unit === 'cartons' ? item.quantity * diaper.piecesPerCarton : item.quantity;
          consumption[diaper.name] = (consumption[diaper.name] || 0) + p;
          distributionTotalPieces += p;
          totalPieces += p;
        }
      });
      wardDistribution['Sorties directes'] = (wardDistribution['Sorties directes'] || 0) + distributionTotalPieces;
    });

    const consumptionSorted = Object.entries(consumption).map(([name, value]) => ({ name, total: value })).sort((a, b) => b.total - a.total);
    const mostOrderedItem = consumptionSorted.length > 0 ? consumptionSorted[0].name : 'N/A';
    const weeksInQuarter = 13;
    const avgConsumption = Math.round(totalPieces / weeksInQuarter);

    let totalMissing = 0;
    const adjustmentStats: { [key: string]: number } = {};
    adjustmentsInQuarter.forEach(adj => {
      const diff = (adj.data?.newQuantity ?? 0) - (adj.data?.oldQuantity ?? 0);
      if (diff < 0) {
        totalMissing += Math.abs(diff);
        const itemName = diapers.find(d => d.id === adj.data?.diaperId)?.name ?? 'Inconnu';
        adjustmentStats[itemName] = (adjustmentStats[itemName] || 0) + Math.abs(diff);
      }
    });
    const mostMissingEntry = Object.entries(adjustmentStats).sort((a, b) => b[1] - a[1])[0];
    const mostMissingItem = mostMissingEntry ? `${mostMissingEntry[0]} (-${mostMissingEntry[1]})` : 'N/A';

    const doc = new jsPDF();
    let y = 22;

    doc.setFontSize(20);
    doc.text(`Rapport Trimestriel Lista - ${quarterLabel}`, 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le ${format(now, 'dd MMMM yyyy', { locale: fr })}`, 14, y);
    y += 6;
    doc.text(`Période : du ${format(quarterStart, 'dd/MM/yyyy', { locale: fr })} au ${format(quarterEnd, 'dd/MM/yyyy', { locale: fr })}`, 14, y);
    y += 14;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Résumé statistique', 14, y);
    y += 6;

    const summaryRows = [
      ['Distributions directes', directDistributionsInQuarter.length.toString()],
      ['Nombre de commandes', ordersInQuarter.length.toString()],
      ['Total pièces distribuées', totalPieces.toLocaleString('fr-FR')],
      ['Consommation moyenne / semaine', `${avgConsumption.toLocaleString('fr-FR')} pièces`],
      ['Article le plus commandé', mostOrderedItem],
      ['Pièces manquantes (ajustements)', totalMissing.toLocaleString('fr-FR')],
      ['Article le plus manquant', mostMissingItem],
    ];
    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur']],
      body: summaryRows,
      theme: 'striped',
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    if (consumptionSorted.length > 0) {
      if (y + 40 > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text('Top 10 articles consommés', 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Article', 'Pièces']],
        body: consumptionSorted.slice(0, 10).map(c => [c.name, c.total.toLocaleString('fr-FR')]),
        theme: 'striped',
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    const detailedAdj = adjustmentsInQuarter.map(adj => {
      const item = diapers.find(d => d.id === adj.data?.diaperId);
      const user = users.find(u => u.id === adj.data?.userId);
      const oldQ = adj.data?.oldQuantity ?? 0;
      const newQ = adj.data?.newQuantity ?? 0;
      const diff = newQ - oldQ;
      return [
        format(adj.date.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr }),
        item?.name ?? 'Inconnu',
        user?.displayName ?? 'Inconnu',
        oldQ.toString(),
        newQ.toString(),
        diff > 0 ? `+${diff}` : diff.toString(),
      ];
    });
    if (detailedAdj.length > 0) {
      if (y + 30 > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text('Ajustements manuels du stock', 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Article', 'Utilisateur', 'Avant', 'Après', 'Écart']],
        body: detailedAdj,
        theme: 'striped',
      });
    }

    doc.save(`rapport_trimestriel_lista_${quarterLabel.replace(' ', '_')}.pdf`);
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

    directDistributions.forEach(distribution => {
      const creator = users.find(u => u.id === distribution.data?.userId);
      distribution.data.items.forEach((item: { diaperId: string; quantity: number; unit?: 'pieces' | 'cartons' }) => {
        const diaper = diapers.find(d => d.id === item.diaperId);
        const totalPieces = item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity;
        const row = [
          format(distribution.date.toDate(), 'dd/MM/yyyy'),
          distribution.data?.recipientName || 'Sortie directe',
          diaper?.name || 'Inconnu',
          item.quantity,
          item.unit || 'pieces',
          totalPieces,
          'sortie directe',
          creator?.displayName || 'Inconnu'
        ];
        csvContent += row.join(";") + "\r\n";
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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nombre de commandes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalOrders.toLocaleString('fr-FR')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sorties directes</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalDirectDistributions.toLocaleString('fr-FR')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total pièces</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalPieces.toLocaleString('fr-FR')}</div>
            </CardContent>
          </Card>
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
              <CardTitle className="text-sm font-medium">Article le + commandé</CardTitle>
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
          <div ref={chartRefs.consumption} className="lg:col-span-2"><ConsumptionChart data={statsData.consumption} /></div>
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
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Premium Header avec Glassmorphisme */}
      <div className="space-y-3 relative">
        {/* Gradient background blobs */}
        <div className="absolute -top-8 -left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-4 right-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center relative">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-lg">
              <FileSpreadsheet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-violet-500 to-secondary bg-clip-text text-transparent animate-gradient">
                  Rapports et Analyses
                </span>
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Générez des rapports et visualisez les statistiques de consommation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Export Section - Premium */}
      <Card className="border-0 glass-strong shadow-modern-lg">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Période :</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetPeriod('month')}
              className={cn(
                "border-2",
                date?.from?.getTime() === startOfMonth(new Date()).getTime() && "border-primary bg-primary/10"
              )}
            >
              Ce mois
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetPeriod('quarter')}
              className={cn(
                "border-2",
                date?.from?.getTime() === startOfQuarter(new Date()).getTime() && "border-primary bg-primary/10"
              )}
            >
              Ce trimestre
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetPeriod('year')}
              className={cn(
                "border-2",
                date?.from?.getTime() === startOfYear(new Date()).getTime() && "border-primary bg-primary/10"
              )}
            >
              Cette année
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal border-2",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "dd/MM/y", { locale: fr })} - {format(date.to, "dd/MM/y", { locale: fr })}
                      </>
                    ) : (
                      format(date.from, "dd/MM/y", { locale: fr })
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
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleExportQuarterlyPDF}
              disabled={isLoading}
              variant="secondary"
              className="w-full sm:w-auto border-2 border-primary/50 hover:bg-primary/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Rapport trimestriel PDF
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isLoading}
              className="w-full sm:w-auto hover-lift shadow-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter PDF (avec graphiques)
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={isLoading}
              variant="outline"
              className="w-full sm:w-auto border-2 hover:border-primary"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exporter CSV (Excel)
            </Button>
          </div>
        </CardContent>
      </Card>

      {(isMobile ?? true) ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Statistiques
            </h2>
            {renderStats()}
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              Ajustements Manuels
            </h2>
            {renderAdjustments()}
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass backdrop-blur-sm">
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="stats">{renderStats()}</TabsContent>
          <TabsContent value="adjustments">{renderAdjustments()}</TabsContent>
        </Tabs>
      )}

    </div>
  );
}
