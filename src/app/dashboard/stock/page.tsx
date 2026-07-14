
'use client';
import * as React from 'react';
import Link from 'next/link';
import StockClient from './components/stock-client';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2, Lightbulb, Send, Archive, Calendar, History } from 'lucide-react';
import { useOrders } from '../orders/orders-context';
import { useItems } from '../settings/items-context';
import { useStock } from './stock-context';
import { calculateConsumptionForecast, type ConsumptionForecastingOutput, suggestSupplierOrder, type SuggestSupplierOrderInput, type SuggestSupplierOrderOutput } from '@/ai/flows/intelligent-consumption-forecasting';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { useWards } from '../settings/wards-context';

function StockPageContent() {
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { stock: currentStock, isLoading: isStockLoading } = useStock();
  const { wards, isLoading: isWardsLoading } = useWards();
  const { toast } = useToast();

  const [isForecasting, setIsForecasting] = React.useState(false);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [forecastingResult, setForecastingResult] = React.useState<ConsumptionForecastingOutput | null>(null);
  const [suggestionResult, setSuggestionResult] = React.useState<SuggestSupplierOrderOutput | null>(null);
  const [forecastWeeks, setForecastWeeks] = React.useState(2);

  const activeItems = React.useMemo(() => diapers.filter(i => i.isActive), [diapers]);
  const activeWards = React.useMemo(() => wards.filter(w => w.isActive), [wards]);

  const handleRunForecast = async () => {
    if (!selectedItemId) {
      toast({
        title: "Aucun article sélectionné",
        description: "Veuillez choisir un article pour lancer la prévision.",
        variant: "destructive"
      });
      return;
    }

    setIsForecasting(true);
    setForecastingResult(null);

    try {
      // 1. Aggregate consumption by date
      const dailyConsumptionMap = new Map<string, number>();
      orders.forEach(order => {
        if (order.status !== 'distributed') return;

        const orderDate = format(parseISO(order.date), 'yyyy-MM-dd');
        order.wardOrders.forEach(wo => {
          wo.items.forEach(item => {
            if (item.diaperId === selectedItemId) {
              const diaper = diapers.find(d => d.id === item.diaperId);
              if (diaper) {
                const quantityInPieces = item.unit === 'cartons'
                  ? item.quantity * (diaper.piecesPerCarton || 1)
                  : item.quantity;

                dailyConsumptionMap.set(
                  orderDate,
                  (dailyConsumptionMap.get(orderDate) || 0) + quantityInPieces
                );
              }
            }
          });
        });
      });

      if (dailyConsumptionMap.size < 3) {
        toast({
          title: "Données insuffisantes",
          description: "Il faut au moins 3 jours de consommation enregistrés pour cet article pour générer une prévision fiable.",
          variant: "destructive"
        });
        setIsForecasting(false);
        return;
      }

      // 2. Create a continuous time series
      const sortedDates = Array.from(dailyConsumptionMap.keys()).sort();
      const firstDate = parseISO(sortedDates[0]);
      const lastDate = parseISO(sortedDates[sortedDates.length - 1]);

      const dateInterval = eachDayOfInterval({ start: firstDate, end: lastDate });

      const historicalData = dateInterval.map(date => {
        const dateString = format(date, 'yyyy-MM-dd');
        return {
          date: dateString,
          quantity: dailyConsumptionMap.get(dateString) || 0 // Fill missing days with 0
        };
      });

      const result = await calculateConsumptionForecast({
        historicalData: historicalData,
        alpha: 0.4,
        horizon: 7
      });
      setForecastingResult(result);

    } catch (error) {
      console.error("Forecasting error:", error);
      toast({
        title: "Erreur de prévision",
        description: "Une erreur est survenue lors du calcul des prévisions.",
        variant: "destructive",
      });
    } finally {
      setIsForecasting(false);
    }
  };

  const handleSuggestion = async () => {
    setIsSuggesting(true);
    setSuggestionResult(null);

    try {
      const totalWeeklyParLevels: Record<string, number> = {};

      // Calculate total weekly need for each item based on par levels of active wards
      activeWards.forEach(ward => {
        if (ward.parLevels) {
          for (const diaperId in ward.parLevels) {
            if (Object.prototype.hasOwnProperty.call(ward.parLevels, diaperId)) {
              totalWeeklyParLevels[diaperId] = (totalWeeklyParLevels[diaperId] || 0) + ward.parLevels[diaperId];
            }
          }
        }
      });

      const plainActiveItems = activeItems.map(item => ({
        id: item.id,
        name: item.name,
        piecesPerCarton: item.piecesPerCarton,
        defaultUnit: item.defaultUnit,
      }));

      const input: SuggestSupplierOrderInput = {
        currentStock: currentStock.map(s => ({ diaperId: s.diaperId, quantity: s.quantity })),
        totalWeeklyParLevels,
        activeItems: plainActiveItems,
        forecastWeeks: forecastWeeks,
      };

      const suggestion = await suggestSupplierOrder(input);
      setSuggestionResult(suggestion);

      toast({
        title: "Suggestion de commande générée",
        description: "Le calcul a été effectué avec succès.",
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur de suggestion",
        description: "Le calcul n'a pas pu être effectué.",
        variant: 'destructive'
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const isLoading = isOrdersLoading || isItemsLoading || isStockLoading || isWardsLoading;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Premium Header avec Glassmorphisme */}
      <div className="space-y-3 relative">
        {/* Gradient background blobs */}
        <div className="absolute -top-8 -left-8 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-4 right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="flex justify-between items-start gap-4 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-400 to-primary shadow-lg">
              <Archive className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-violet-500 via-primary to-secondary bg-clip-text text-transparent animate-gradient">
                  Stock
                </span>
              </h1>
              <p className="text-base text-muted-foreground">
                Consultez les niveaux de stock et prévoyez les besoins futurs.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/dashboard/stock/direct-distribution/history">
              <Button variant="outline" className="hover-lift shadow-lg hover:shadow-xl transition-all duration-300">
                <History className="mr-2 h-4 w-4" />
                Sorties directes
              </Button>
            </Link>
            <Link href="/dashboard/stock/direct-distribution">
              <Button className="hover-lift shadow-lg hover:shadow-xl transition-all duration-300">
                <Send className="mr-2 h-4 w-4" />
                Distribution Directe
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <StockClient />

      {/* Commande Fournisseur Intelligente - Premium Card */}
      <Card className="border-0 glass-strong shadow-modern-lg hover-lift transition-all duration-300 overflow-hidden relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-primary/5 opacity-50" />

        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 border border-violet-500/30">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">💡 Commande Fournisseur Intelligente</CardTitle>
              <CardDescription className="mt-1">
                L'application analyse les besoins hebdomadaires des étages et le stock actuel pour suggérer une liste d'articles à commander.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="horizon-weeks" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Couvrir les besoins pour (semaines)
              </Label>
              <Input
                id="horizon-weeks"
                type="number"
                value={forecastWeeks}
                onChange={(e) => setForecastWeeks(parseInt(e.target.value) || 0)}
                min="1"
                className="bg-background/80 backdrop-blur-sm border-2 focus:border-primary transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={handleSuggestion}
                disabled={isSuggesting || isLoading}
                className="w-full md:w-auto hover-lift shadow-lg"
              >
                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Suggérer une commande
              </Button>
            </div>
          </div>

          {isSuggesting && (
            <div className="flex flex-col justify-center items-center h-48 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Calcul en cours...</p>
            </div>
          )}

          {suggestionResult && (
            <Alert className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <Lightbulb className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg font-bold">📊 Liste de Commande Suggérée</AlertTitle>
              <AlertDescription className="text-base">
                Voici les quantités que l'application vous recommande de commander pour couvrir vos besoins pour les <strong>{forecastWeeks}</strong> prochaines semaines.
              </AlertDescription>
              <div className="mt-4 border-2 rounded-xl overflow-hidden glass backdrop-blur-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">Article</TableHead>
                      <TableHead className="text-right font-bold">Quantité (cartons)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestionResult.suggestedPurchaseItems.map(item => {
                      const diaper = diapers.find(d => d.id === item.diaperId);
                      if (!diaper) return null;
                      return (
                        <TableRow key={item.diaperId} className="hover:bg-primary/5 transition-colors">
                          <TableCell className="font-medium">{diaper.name}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {item.quantityToOrderInCartons.toLocaleString('fr-FR')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {suggestionResult.suggestedPurchaseItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          ✅ Aucun réapprovisionnement nécessaire pour la période sélectionnée.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Prévisions de Consommation - Premium Card */}
      <Card className="border-0 glass-strong shadow-modern-lg hover-lift transition-all duration-300 overflow-hidden relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-50" />

        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/30">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">📈 Prévisions de Consommation par Article</CardTitle>
              <CardDescription className="mt-1">
                Utilisez un algorithme pour prédire la consommation future d'un article sur les 7 prochains jours en vous basant sur l'historique des commandes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 relative">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Select onValueChange={setSelectedItemId} value={selectedItemId || ''}>
              <SelectTrigger className="w-full sm:w-[280px] bg-background/80 backdrop-blur-sm border-2 focus:border-primary">
                <SelectValue placeholder="Sélectionnez un article..." />
              </SelectTrigger>
              <SelectContent>
                {diapers.filter(d => d.isActive).map(diaper => (
                  <SelectItem key={diaper.id} value={diaper.id}>
                    {diaper.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleRunForecast}
              disabled={isForecasting || !selectedItemId || isLoading}
              className="w-full sm:w-auto hover-lift shadow-lg"
            >
              {isForecasting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              Lancer la prévision
            </Button>
          </div>

          {isForecasting && (
            <div className="flex flex-col justify-center items-center h-48 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Analyse en cours...</p>
            </div>
          )}

          {forecastingResult && (
            <Card className="max-w-xs border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Prévision hebdomadaire
                </CardTitle>
                <Calculator className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  {forecastingResult.weeklyForecast.toLocaleString('fr-FR')} pièces
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  📊 Estimation pour les 7 prochains jours.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StockPage() {
  return <StockPageContent />
}
