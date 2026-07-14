'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, CalendarClock, Download, FileText, Loader2, PackageSearch, Search, Send, UserRound } from 'lucide-react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { DeliveryItem, Diaper, Notification, UserProfile } from '@/lib/types';
import { useItems } from '@/app/dashboard/settings/items-context';
import { useUsers } from '@/app/dashboard/settings/users-context';
import { useWards } from '@/app/dashboard/settings/wards-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DirectDistribution = {
  id: string;
  date: Date | null;
  userId?: string;
  recipientName?: string;
  reason: string;
  items: DeliveryItem[];
  description: string;
};

type DirectDistributionDoc = {
  date?: any;
  createdAt?: any;
  userId?: string;
  recipientName?: string | null;
  reason?: string;
  comment?: string | null;
  items?: DeliveryItem[];
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

function formatDate(value: Date | null) {
  if (!value) return 'Date inconnue';
  return value.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(value: Date | null) {
  if (!value) return '--:--';
  return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getItemName(items: Diaper[], diaperId: string) {
  return items.find((item) => item.id === diaperId)?.name || 'Article inconnu';
}

function getUserName(users: (UserProfile & { id: string })[], userId?: string) {
  if (!userId) return 'Utilisateur inconnu';
  const user = users.find((candidate) => candidate.id === userId);
  return user?.displayName || user?.email || 'Utilisateur inconnu';
}

function getTotalPieces(items: DeliveryItem[]) {
  return items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

function csvEscape(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function DirectDistributionHistoryPage() {
  const searchParams = useSearchParams();
  const { firestore, user } = useFirebase();
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { users, isLoading: isUsersLoading } = useUsers();
  const { wards, isLoading: isWardsLoading } = useWards();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const selectedNotificationId = searchParams.get('notificationId');

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'notifications'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: notifications, isLoading: isNotificationsLoading } = useCollection<Notification>(notificationsQuery);

  const directDistributionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'directDistributions'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: directDistributionDocs, isLoading: isDirectDistributionsLoading } = useCollection<DirectDistributionDoc>(directDistributionsQuery);

  const distributions = React.useMemo<DirectDistribution[]>(() => {
    const wardNames = new Set(wards.map((ward) => normalizeText(ward.name)));
    const isWardLikeReason = (reason: string) => {
      const normalizedReason = normalizeText(reason);
      return wardNames.has(normalizedReason) || normalizedReason.includes('etage') || normalizedReason.includes('etg');
    };

    const durableDistributions = (directDistributionDocs || []).map((distribution) => ({
      id: distribution.id,
      date: toDate(distribution.date || distribution.createdAt),
      userId: distribution.userId,
      recipientName: distribution.recipientName || undefined,
      reason: distribution.comment || distribution.reason || '',
      items: distribution.items || [],
      description: distribution.reason || '',
    }));

    const signatures = new Set(durableDistributions.map((distribution) => [
      distribution.userId || '',
      distribution.recipientName || '',
      distribution.reason || '',
      JSON.stringify(distribution.items || []),
    ].join('|')));

    const legacyDistributions = (notifications || [])
      .filter((notification) => {
        const data = notification.data || {};
        if (notification.type !== 'info' || !Array.isArray(data.items) || typeof data.reason !== 'string') {
          return false;
        }

        if (data.directDistributionKind === 'external-person') {
          return true;
        }

        return !isWardLikeReason(data.reason);
      })
      .map((notification) => ({
        id: notification.id,
        date: toDate(notification.date),
        userId: notification.data?.userId,
        recipientName: notification.data?.recipientName || undefined,
        reason: notification.data?.comment || notification.data?.reason || '',
        items: notification.data?.items || [],
        description: notification.description || '',
      }));

    return [
      ...durableDistributions,
      ...legacyDistributions.filter((distribution) => {
        const signature = [
          distribution.userId || '',
          distribution.recipientName || '',
          distribution.reason || '',
          JSON.stringify(distribution.items || []),
        ].join('|');
        return !signatures.has(signature);
      }),
    ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [directDistributionDocs, notifications, wards]);

  const filteredDistributions = React.useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return distributions.filter((distribution) => {
      if (selectedNotificationId && distribution.id !== selectedNotificationId) return false;
      if (distribution.date && start && distribution.date < start) return false;
      if (distribution.date && end && distribution.date > end) return false;
      if (!queryText) return true;

      const userName = getUserName(users, distribution.userId);
      const itemNames = distribution.items.map((item) => getItemName(diapers, item.diaperId)).join(' ');
      return [
        distribution.recipientName || '',
        distribution.reason,
        distribution.description,
        userName,
        itemNames,
        formatDate(distribution.date),
        formatTime(distribution.date),
      ].join(' ').toLowerCase().includes(queryText);
    });
  }, [diapers, distributions, endDate, searchTerm, selectedNotificationId, startDate, users]);

  const stats = React.useMemo(() => {
    const totalPieces = filteredDistributions.reduce((sum, distribution) => sum + getTotalPieces(distribution.items), 0);
    const uniqueItems = new Set(filteredDistributions.flatMap((distribution) => distribution.items.map((item) => item.diaperId))).size;
    return { sorties: filteredDistributions.length, pieces: totalPieces, articles: uniqueItems };
  }, [filteredDistributions]);

  const handleExportCsv = () => {
    const rows = [
      ['Date', 'Heure', 'Personne', 'Utilisateur', 'Commentaire', 'Article', 'Quantite pieces'],
      ...filteredDistributions.flatMap((distribution) => {
        const userName = getUserName(users, distribution.userId);
        return distribution.items.map((item) => [
          formatDate(distribution.date),
          formatTime(distribution.date),
          distribution.recipientName || '',
          userName,
          distribution.reason,
          getItemName(diapers, item.diaperId),
          item.quantity,
        ]);
      }),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sorties-directes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isLoading = isNotificationsLoading || isDirectDistributionsLoading || isItemsLoading || isUsersLoading || isWardsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="pl-0 text-muted-foreground">
            <Link href="/dashboard/stock">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au stock
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-400 to-primary shadow-lg">
              <Send className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-sky-500 via-primary to-violet-500 bg-clip-text text-transparent">
                  Sorties directes
                </span>
              </h1>
              <p className="text-muted-foreground">
                Uniquement les langes donnes directement a une personne, sans commande d'etage.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleExportCsv} disabled={filteredDistributions.length === 0} className="md:mt-10">
          <Download className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-strong border-0 shadow-modern">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sorties retrouvees</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.sorties.toLocaleString('fr-FR')}</CardContent>
        </Card>
        <Card className="glass-strong border-0 shadow-modern">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pieces sorties</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.pieces.toLocaleString('fr-FR')}</CardContent>
        </Card>
        <Card className="glass-strong border-0 shadow-modern">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Articles concernes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.articles.toLocaleString('fr-FR')}</CardContent>
        </Card>
      </div>

      <Card className="border-0 glass-strong shadow-modern-lg">
        <CardHeader className="gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              Recherche des sorties
            </CardTitle>
            <CardDescription>
              Choisissez une periode, puis recherchez par personne, commentaire, utilisateur, article, date ou heure.
            </CardDescription>
          </div>
          {selectedNotificationId && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">Affichage de la sortie directe ouverte depuis la notification.</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/stock/direct-distribution/history">Voir toutes les sorties</Link>
              </Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1">
              <label htmlFor="start-date" className="text-sm font-medium text-muted-foreground">Du</label>
              <Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="end-date" className="text-sm font-medium text-muted-foreground">Au</label>
              <Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); }} className="w-full">
                Toute periode
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ex: Malika, don, Tena, 12/07/2026..."
              className="pl-10 bg-background/80"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-background/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Personne</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Articles pris</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistributions.map((distribution) => (
                  <TableRow key={distribution.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        {formatDate(distribution.date)}
                      </span>
                    </TableCell>
                    <TableCell>{formatTime(distribution.date)}</TableCell>
                    <TableCell className="font-medium">{distribution.recipientName || 'Non precisee'}</TableCell>
                    <TableCell className="min-w-[220px]">
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{distribution.reason || 'Sans commentaire'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[260px]">
                      <div className="flex flex-wrap gap-2">
                        {distribution.items.map((item) => (
                          <Badge key={`${distribution.id}-${item.diaperId}`} variant="secondary" className="whitespace-nowrap">
                            {getItemName(diapers, item.diaperId)} : {Number(item.quantity || 0).toLocaleString('fr-FR')} pieces
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        {getUserName(users, distribution.userId)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {getTotalPieces(distribution.items).toLocaleString('fr-FR')} pieces
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDistributions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Aucune sortie directe trouvee.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
