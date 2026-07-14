
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
import { getOrderStatusLabel, getOrderUnitLabel } from '@/lib/order-status';
import { isStockAdjustmentNotification } from '@/lib/stock-adjustments';

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

function formatPdfNumber(value: number): string {
  return Math.round(value).toString();
}

function sanitizePdfText(value: unknown): string {
  return String(value ?? '-')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[→⇒]/g, ' vers ')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .trim() || '-';
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

  const stockAdjustmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'stockAdjustments'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: stockAdjustmentDocs, isLoading: isStockAdjustmentsLoading } = useCollection<{
    date?: any;
    createdAt?: any;
    diaperId?: string;
    itemName?: string;
    oldQuantity?: number;
    newQuantity?: number;
    difference?: number;
    userId?: string;
    userName?: string;
    description?: string;
  }>(stockAdjustmentsQuery);

  const isLoading = isOrdersLoading || isItemsLoading || isWardsLoading || isUsersLoading || isNotificationsLoading || isDirectDistributionsLoading || isStockAdjustmentsLoading;

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

  const allAdjustmentRecords = React.useMemo(() => {
    const durableAdjustments = (stockAdjustmentDocs || []).map(adjustment => ({
      id: adjustment.id,
      date: adjustment.date || adjustment.createdAt,
      description: adjustment.description,
      data: {
        diaperId: adjustment.diaperId,
        itemName: adjustment.itemName,
        oldQuantity: adjustment.oldQuantity,
        newQuantity: adjustment.newQuantity,
        userId: adjustment.userId,
        userName: adjustment.userName,
      },
    }));

    const signatures = new Set(durableAdjustments.map(adjustment => [
      adjustment.data.diaperId || '',
      adjustment.data.userId || '',
      adjustment.data.oldQuantity ?? '',
      adjustment.data.newQuantity ?? '',
      toDate(adjustment.date)?.getTime() || '',
    ].join('|')));

    const legacyAdjustments = (notifications || []).filter(isStockAdjustmentNotification);

    return [
      ...durableAdjustments,
      ...legacyAdjustments.filter(adjustment => !signatures.has([
        adjustment.data?.diaperId || '',
        adjustment.data?.userId || '',
        adjustment.data?.oldQuantity ?? '',
        adjustment.data?.newQuantity ?? '',
        toDate(adjustment.date)?.getTime() || '',
      ].join('|'))),
    ];
  }, [notifications, stockAdjustmentDocs]);

  const adjustments = React.useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDate = date.to ? addDays(date.to, 1) : addDays(new Date(), 1);
    return allAdjustmentRecords.filter(adjustment => {
      const adjustmentDate = toDate(adjustment.date);
      return adjustmentDate !== null && adjustmentDate >= fromDate && adjustmentDate < toDate;
    });
  }, [allAdjustmentRecords, date]);

  const detailedAdjustments = React.useMemo(() => {
    if (!adjustments || !diapers || !users) return [];
    return adjustments.map(adj => {
      const item = diapers.find(d => d.id === adj.data?.diaperId);
      const user = users.find(u => u.id === adj.data?.userId);
      const oldQuantity = Number(adj.data?.oldQuantity ?? 0);
      const newQuantity = Number(adj.data?.newQuantity ?? 0);
      const difference = newQuantity - oldQuantity;
      return {
        ...adj,
        itemName: item?.name || adj.data?.itemName || 'Article inconnu',
        userName: user?.displayName || adj.data?.userName || 'Utilisateur inconnu',
        oldQuantity,
        newQuantity,
        difference,
        detail: adj.description || (difference > 0 ? 'Augmentation du stock' : difference < 0 ? 'Diminution du stock' : 'Stock inchangé'),
      };
    }).sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));
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
    const mostMissingItem = mostMissingItemData.length > 0 ? `${mostMissingItemData[0][0]} (-${mostMissingItemData[0][1]})` : 'Aucune donnée';

    const consumptionData = Object.entries(consumption).map(([name, value]) => ({ name, total: value })).sort((a, b) => b.total - a.total);
    const wardDistributionData = Object.entries(wardDistribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const consumptionOverTimeData = Object.entries(consumptionOverTime).map(([date, data]) => ({ date, total: data.total })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalOrders = filteredOrders.length;
    const totalDirectDistributions = directDistributions.length;
    const totalPieces = consumptionData.reduce((sum, item) => sum + item.total, 0);
    const mostOrderedItem = consumptionData.length > 0 ? consumptionData[0].name : 'Aucune donnée';
    const uniqueWeeks = Object.keys(consumptionOverTime).length;
    const avgConsumption = uniqueWeeks > 0 ? Math.round(totalPieces / uniqueWeeks) : 0;

    return { consumption: consumptionData, wardDistribution: wardDistributionData, consumptionOverTime: consumptionOverTimeData, totalOrders, totalDirectDistributions, totalPieces, mostOrderedItem, avgConsumption, totalMissing, mostMissingItem };
  }, [filteredOrders, directDistributions, diapers, wards, isLoading, detailedAdjustments]);

  const handleExportPDF = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const primary: [number, number, number] = [14, 165, 233];
    const ink: [number, number, number] = [24, 31, 42];
    let y = 18;

    const ensureSpace = (height: number) => {
      if (y + height > pageHeight - 15) {
        doc.addPage();
        y = 16;
      }
    };

    const addSection = (title: string, subtitle?: string) => {
      ensureSpace(subtitle ? 18 : 12);
      doc.setTextColor(...ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(sanitizePdfText(title), margin, y);
      doc.setDrawColor(...primary);
      doc.setLineWidth(0.7);
      doc.line(margin, y + 2.5, margin + 28, y + 2.5);
      y += 7;
      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 108, 120);
        doc.text(sanitizePdfText(subtitle), margin, y);
        y += 6;
      }
    };

    const addTable = (head: string[], body: (string | number)[][], widths?: Record<number, number>) => {
      autoTable(doc, {
        startY: y,
        head: [head.map(sanitizePdfText)],
        body: body.map(row => row.map(sanitizePdfText)),
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 6.8, cellPadding: 1.4, overflow: 'linebreak', textColor: ink, valign: 'top' },
        headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold', lineColor: primary },
        alternateRowStyles: { fillColor: [245, 248, 250] },
        columnStyles: Object.fromEntries(
          Object.entries(widths || {}).map(([column, width]) => [column, { cellWidth: width }])
        ),
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    };

    const addBarChart = (
      title: string,
      values: { name: string; value: number }[],
      color: [number, number, number]
    ) => {
      const data = values.slice(0, 10);
      const chartHeight = 16 + data.length * 6.5;
      ensureSpace(chartHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...ink);
      doc.text(title, margin, y);
      y += 6;
      if (data.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110);
        doc.text('Aucune donnée disponible pour cette période.', margin, y);
        y += 8;
        return;
      }
      const max = Math.max(...data.map(item => item.value), 1);
      const labelWidth = 48;
      const barWidth = contentWidth - labelWidth - 21;
      data.forEach(item => {
        const cleanName = sanitizePdfText(item.name);
        const label = cleanName.length > 27 ? `${cleanName.slice(0, 26)}...` : cleanName;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(55, 65, 81);
        doc.text(label, margin, y + 3.2);
        doc.setFillColor(232, 237, 241);
        doc.roundedRect(margin + labelWidth, y, barWidth, 4.2, 1, 1, 'F');
        doc.setFillColor(...color);
        doc.roundedRect(margin + labelWidth, y, Math.max(1, (item.value / max) * barWidth), 4.2, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ink);
        doc.text(formatPdfNumber(item.value), pageWidth - margin, y + 3.2, { align: 'right' });
        y += 6.5;
      });
      y += 4;
    };

    const addLineChart = (values: { date: string; total: number }[]) => {
      ensureSpace(69);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...ink);
      doc.text('Évolution hebdomadaire', margin, y);
      y += 7;
      if (values.length < 2) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Pas assez de données pour afficher une évolution.', margin, y);
        y += 10;
        return;
      }
      const chartX = margin + 10;
      const chartY = y;
      const chartW = contentWidth - 14;
      const chartH = 45;
      const max = Math.max(...values.map(item => item.total), 1);
      doc.setDrawColor(210, 216, 224);
      doc.setLineWidth(0.25);
      for (let grid = 0; grid <= 4; grid += 1) {
        const gridY = chartY + (grid / 4) * chartH;
        doc.line(chartX, gridY, chartX + chartW, gridY);
        doc.setFontSize(6.5);
        doc.setTextColor(110);
        doc.text(formatPdfNumber(max * (1 - grid / 4)), chartX - 2, gridY + 1.5, { align: 'right' });
      }
      doc.setDrawColor(...primary);
      doc.setFillColor(...primary);
      doc.setLineWidth(0.8);
      values.forEach((item, index) => {
        const x = chartX + (index / (values.length - 1)) * chartW;
        const pointY = chartY + chartH - (item.total / max) * chartH;
        if (index > 0) {
          const previous = values[index - 1];
          const previousX = chartX + ((index - 1) / (values.length - 1)) * chartW;
          const previousY = chartY + chartH - (previous.total / max) * chartH;
          doc.line(previousX, previousY, x, pointY);
        }
        doc.circle(x, pointY, 0.9, 'F');
        const labelStep = Math.max(1, Math.ceil(values.length / 8));
        if (index % labelStep === 0 || index === values.length - 1) {
          doc.setFontSize(6.2);
          doc.setTextColor(90);
          doc.text(format(parseISO(item.date), 'dd/MM'), x, chartY + chartH + 4, { align: 'center' });
        }
      });
      y = chartY + chartH + 10;
    };

    doc.setFillColor(...ink);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("Rapport détaillé d'activité", margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Lista - Gestion logistique', margin, 23);
    doc.setTextColor(205, 214, 224);
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 16, { align: 'right' });
    const periodStart = date?.from ? format(date.from, 'dd/MM/yyyy') : 'début';
    const periodEnd = date?.to ? format(date.to, 'dd/MM/yyyy') : periodStart;
    doc.text(`Période du ${periodStart} au ${periodEnd}`, pageWidth - margin, 23, { align: 'right' });
    y = 45;

    const directArticleTotals = new Map<string, number>();
    const userActivityTotals = new Map<string, number>();
    directDistributions.forEach(distribution => {
      const operationUser = users.find(reportUser => reportUser.id === distribution.data.userId);
      let operationTotal = 0;
      distribution.data.items.forEach(item => {
        const diaper = diapers.find(candidate => candidate.id === item.diaperId);
        const pieces = item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity;
        const itemName = diaper?.name || 'Article inconnu';
        directArticleTotals.set(itemName, (directArticleTotals.get(itemName) || 0) + pieces);
        operationTotal += pieces;
      });
      const userName = operationUser?.displayName || 'Utilisateur inconnu';
      userActivityTotals.set(userName, (userActivityTotals.get(userName) || 0) + operationTotal);
    });
    filteredOrders.forEach(order => {
      const orderUser = users.find(reportUser => reportUser.id === order.userId);
      const userName = orderUser?.displayName || 'Utilisateur inconnu';
      const orderTotal = order.wardOrders.reduce((wardTotal, wardOrder) => (
        wardTotal + wardOrder.items.reduce((itemTotal, item) => {
          const diaper = diapers.find(candidate => candidate.id === item.diaperId);
          return itemTotal + (item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity);
        }, 0)
      ), 0);
      userActivityTotals.set(userName, (userActivityTotals.get(userName) || 0) + orderTotal);
    });
    const directArticleChartData = [...directArticleTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const userActivityChartData = [...userActivityTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    addSection('Synthèse exécutive', 'Les chiffres incluent les commandes et les distributions directes de la période.');
    const metrics = [
      ['Commandes', formatPdfNumber(statsData.totalOrders)],
      ['Sorties directes', formatPdfNumber(statsData.totalDirectDistributions)],
      ['Pièces sorties', formatPdfNumber(statsData.totalPieces)],
      ['Moyenne / semaine', formatPdfNumber(statsData.avgConsumption)],
      ['Article principal', statsData.mostOrderedItem],
      ['Pièces manquantes', formatPdfNumber(statsData.totalMissing)],
    ];
    metrics.forEach((metric, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const cardWidth = (contentWidth - 8) / 3;
      const x = margin + column * (cardWidth + 4);
      const cardY = y + row * 21;
      doc.setFillColor(245, 248, 250);
      doc.setDrawColor(221, 227, 233);
      doc.roundedRect(x, cardY, cardWidth, 17, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 108, 120);
      doc.text(metric[0], x + 3, cardY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(metric[1].length > 18 ? 8.5 : 12);
      doc.setTextColor(...ink);
      doc.text(metric[1].slice(0, 32), x + 3, cardY + 12.5);
    });
    y += 48;

    addSection('Graphiques d’analyse');
    addLineChart(statsData.consumptionOverTime);
    addBarChart('Top 10 des articles sortis (pièces)', statsData.consumption.map(item => ({ name: item.name, value: item.total })), primary);
    addBarChart('Répartition par étage et sorties directes', statsData.wardDistribution, [16, 185, 129]);
    addBarChart('Articles remis en distribution directe', directArticleChartData, [234, 88, 12]);
    addBarChart('Volume traité par utilisateur', userActivityChartData, [99, 102, 241]);

    addSection('Détail par article', 'Classement, part du total et moyenne hebdomadaire.');
    const weeks = Math.max(statsData.consumptionOverTime.length, 1);
    addTable(
      ['Rang', 'Article', 'Pièces', 'Part', 'Moy./semaine'],
      statsData.consumption.map((item, index) => [
        index + 1,
        item.name,
        formatPdfNumber(item.total),
        statsData.totalPieces ? `${((item.total / statsData.totalPieces) * 100).toFixed(1)} %` : '0 %',
        formatPdfNumber(item.total / weeks),
      ]),
      { 0: 12, 1: 76, 2: 28, 3: 24, 4: 34 }
    );

    addSection('Détail par étage');
    addTable(
      ['Étage / origine', 'Pièces', 'Part du total'],
      statsData.wardDistribution.map(item => [
        item.name,
        formatPdfNumber(item.value),
        statsData.totalPieces ? `${((item.value / statsData.totalPieces) * 100).toFixed(1)} %` : '0 %',
      ]),
      { 0: 96, 1: 39, 2: 39 }
    );

    addSection('Évolution par semaine');
    addTable(
      ['Semaine du', 'Pièces', 'Variation'],
      statsData.consumptionOverTime.map((item, index, values) => {
        const previous = index > 0 ? values[index - 1].total : 0;
        const variation = previous ? ((item.total - previous) / previous) * 100 : 0;
        return [format(parseISO(item.date), 'dd/MM/yyyy'), formatPdfNumber(item.total), index ? `${variation >= 0 ? '+' : ''}${variation.toFixed(1)} %` : '-'];
      }),
      { 0: 70, 1: 50, 2: 50 }
    );

    addSection('Sorties directes détaillées', `${directDistributions.length} opération(s) sur la période.`);
    addTable(
      ['Date et heure', 'Personne', 'Utilisateur', 'Motif / commentaire', 'Articles', 'Total'],
      [...directDistributions].sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0)).map(distribution => {
        const distributionDate = toDate(distribution.date);
        const operationUser = users.find(reportUser => reportUser.id === distribution.data.userId);
        const articleDetails = distribution.data.items.map(item => {
          const diaper = diapers.find(candidate => candidate.id === item.diaperId);
          const pieces = item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity;
          return `${diaper?.name || 'Article inconnu'}: ${pieces}`;
        });
        const total = distribution.data.items.reduce((sum, item) => {
          const diaper = diapers.find(candidate => candidate.id === item.diaperId);
          return sum + (item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity);
        }, 0);
        return [
          distributionDate ? format(distributionDate, 'dd/MM/yyyy HH:mm') : '-',
          distribution.data.recipientName || 'Non précisée',
          operationUser?.displayName || 'Utilisateur inconnu',
          distribution.data.comment || distribution.data.reason || '-',
          articleDetails.join('\n'),
          formatPdfNumber(total),
        ];
      }),
      { 0: 26, 1: 23, 2: 23, 3: 36, 4: 50, 5: 16 }
    );

    addSection('Commandes détaillées', `${filteredOrders.length} commande(s) sur la période.`);
    addTable(
      ['Date', 'Étage(s)', 'Utilisateur', 'Statut', 'Articles / quantités', 'Total', 'Commentaire'],
      [...filteredOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => {
        const orderUser = users.find(reportUser => reportUser.id === order.userId);
        const wardNames = order.wardOrders.map(wardOrder => wards.find(ward => ward.id === wardOrder.wardId)?.name || 'Étage inconnu');
        const articleLines: string[] = [];
        let total = 0;
        order.wardOrders.forEach(wardOrder => wardOrder.items.forEach(item => {
          const diaper = diapers.find(candidate => candidate.id === item.diaperId);
          const pieces = item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity;
          total += pieces;
          articleLines.push(`${diaper?.name || 'Article inconnu'}: ${pieces}`);
        }));
        return [
          new Date(order.date).toLocaleDateString('fr-FR'),
          wardNames.join(', '),
          orderUser?.displayName || 'Utilisateur inconnu',
          getOrderStatusLabel(order.status),
          articleLines.join('\n'),
          formatPdfNumber(total),
          order.comment || '-',
        ];
      }),
      { 0: 18, 1: 25, 2: 23, 3: 18, 4: 46, 5: 14, 6: 30 }
    );

    addSection('Ajustements manuels', `${detailedAdjustments.length} ajustement(s), dont ${formatPdfNumber(statsData.totalMissing)} pièce(s) manquante(s).`);
    addTable(
      ['Date et heure', 'Article', 'Effectué par', 'Avant', 'Après', 'Écart', 'Détail'],
      detailedAdjustments.map(adjustment => [
        toDate(adjustment.date) ? format(toDate(adjustment.date)!, 'dd/MM/yyyy HH:mm') : '-',
        adjustment.itemName,
        adjustment.userName,
        formatPdfNumber(adjustment.oldQuantity),
        formatPdfNumber(adjustment.newQuantity),
        `${adjustment.difference > 0 ? '+' : ''}${formatPdfNumber(adjustment.difference)}`,
        adjustment.detail,
      ]),
      { 0: 29, 1: 34, 2: 28, 3: 15, 4: 15, 5: 15, 6: 38 }
    );

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(220, 225, 230);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(110);
      doc.text(`Lista - Rapport du ${periodStart} au ${periodEnd}`, margin, pageHeight - 6);
      doc.text(`Page ${page} / ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    doc.setProperties({
      title: `Rapport Lista ${periodStart} - ${periodEnd}`,
      subject: 'Commandes, distributions directes, consommation et ajustements',
      author: currentUserProfile?.displayName || 'Lista',
      creator: 'Lista',
    });
    doc.save(`rapport_lista_${periodStart.replaceAll('/', '-')}_${periodEnd.replaceAll('/', '-')}.pdf`);
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
    const quarterLabel = `T${q} ${year}`;

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

    const adjustmentsInQuarter = allAdjustmentRecords.filter(adjustment => {
      const adjustmentDate = toDate(adjustment.date);
      return adjustmentDate !== null &&
        adjustmentDate >= quarterStart &&
        adjustmentDate <= quarterEnd;
    });

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
    const mostOrderedItem = consumptionSorted.length > 0 ? consumptionSorted[0].name : 'Aucune donnée';
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
    const mostMissingItem = mostMissingEntry ? `${mostMissingEntry[0]} (-${mostMissingEntry[1]})` : 'Aucune donnée';

    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
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
      ['Total pièces distribuées', formatPdfNumber(totalPieces)],
      ['Consommation moyenne / semaine', `${formatPdfNumber(avgConsumption)} pièces`],
      ['Article le plus commandé', mostOrderedItem],
      ['Pièces manquantes (ajustements)', formatPdfNumber(totalMissing)],
      ['Article le plus manquant', mostMissingItem],
    ];
    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur']],
      body: summaryRows.map(row => row.map(sanitizePdfText)),
      theme: 'striped',
      styles: { overflow: 'linebreak', valign: 'top' },
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
        body: consumptionSorted.slice(0, 10).map(c => [sanitizePdfText(c.name), formatPdfNumber(c.total)]),
        theme: 'striped',
        styles: { overflow: 'linebreak', valign: 'top' },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    const detailedAdj = adjustmentsInQuarter.map(adj => {
      const item = diapers.find(d => d.id === adj.data?.diaperId);
      const user = users.find(u => u.id === adj.data?.userId);
      const oldQ = adj.data?.oldQuantity ?? 0;
      const newQ = adj.data?.newQuantity ?? 0;
      const diff = newQ - oldQ;
      const adjustmentDate = toDate(adj.date);
      return [
        adjustmentDate ? format(adjustmentDate, 'dd/MM/yyyy HH:mm', { locale: fr }) : '-',
        item?.name ?? adj.data?.itemName ?? 'Inconnu',
        user?.displayName ?? adj.data?.userName ?? 'Utilisateur inconnu',
        formatPdfNumber(oldQ),
        formatPdfNumber(newQ),
        diff > 0 ? `+${formatPdfNumber(diff)}` : formatPdfNumber(diff),
        adj.description || '-',
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
        head: [['Date', 'Article', 'Effectué par', 'Avant', 'Après', 'Écart', 'Détail']],
        body: detailedAdj.map(row => row.map(sanitizePdfText)),
        theme: 'striped',
        styles: { fontSize: 7, overflow: 'linebreak', valign: 'top' },
        columnStyles: {
          0: { cellWidth: 27 },
          1: { cellWidth: 34 },
          2: { cellWidth: 28 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 15 },
          6: { cellWidth: 40 },
        },
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
            getOrderUnitLabel(item.unit),
            totalPieces,
            getOrderStatusLabel(order.status),
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
          getOrderUnitLabel(item.unit),
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
                  <TableHead>Effectué par</TableHead>
                  <TableHead className="text-center">Avant</TableHead>
                  <TableHead className="text-center">Après</TableHead>
                  <TableHead className="text-center">Écart</TableHead>
                  <TableHead>Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedAdjustments.map(adj => (
                  <TableRow key={adj.id}>
                    <TableCell className="whitespace-nowrap">{toDate(adj.date)?.toLocaleString('fr-FR') || '-'}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{adj.itemName}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{adj.userName}</TableCell>
                    <TableCell className="text-center">{adj.oldQuantity}</TableCell>
                    <TableCell className="text-center">{adj.newQuantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={adj.difference > 0 ? 'success' : 'destructive'}>
                        {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-64 whitespace-normal text-sm text-muted-foreground">{adj.detail}</TableCell>
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
