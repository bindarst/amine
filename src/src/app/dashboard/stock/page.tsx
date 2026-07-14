
'use client';
import * as React from 'react';
import Link from 'next/link';
import StockClient from './components/stock-client';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2, Lightbulb, Send } from 'lucide-react';
import { useOrders } from '../orders/orders-context';
import { useItems } from '../settings/items-context';
import { useStock } from './stock-context';
import { calculateConsumptionForecast, type ConsumptionForecastingOutput, suggestSupplierOrder, type SuggestSupplierOrderInput, type SuggestSupplierOrderOutput } from '@/ai/flows/intelligent-consumption-forecasting';
import { useToast } from '@/hooks/use-toast';
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
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Stock</h1>
                <p className="text-muted-foreground">
                    Consultez les niveaux de stock et prévoyez les besoins futurs.
                </p>
            </div>
            <Link href="/dashboard/stock/direct-distribution">
                <Button className="hover-lift">
                    <Send className="mr-2 h-4 w-4" />
                    Distribution Directe
                </Button>
            </Link>
        </div>

        <StockClient />
        
        <Card className="hover-lift border-l-4 border-l-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Commande Fournisseur Intelligente
            </CardTitle>
            <CardDescription>
                L'application analyse les besoins hebdomadaires des étages et le stock actuel pour suggérer une liste d'articles à commander.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                      <Label htmlFor="horizon-weeks">Couvrir les besoins pour (semaines)</Label>
                      <Input
                          id="horizon-weeks"
                          type="number"
                          value={forecastWeeks}
                          onChange={(e) => setForecastWeeks(parseInt(e.target.value) || 0)}
                          min="1"
                          className="bg-background"
                      />
                  </div>
                  <div className="md:col-span-2">
                      <Button onClick={handleSuggestion} disabled={isSuggesting || isLoading} className="w-full md:w-auto">
                          {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Lightbulb className="mr-2 h-4 w-4"/>}
                          Suggérer une commande
                      </Button>
                  </div>
              </div>

              {isSuggesting && (
                  <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-12 w-12 animate-spin text-primary"/>
                  </div>
              )}
              
              {suggestionResult && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Liste de Commande Suggérée</AlertTitle>
                  <AlertDescription>
                    Voici les quantités que l'application vous recommande de commander pour couvrir vos besoins pour les **{forecastWeeks}** prochaines semaines.
                  </AlertDescription>
                  <div className="mt-4 border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Article</TableHead>
                          <TableHead className="text-right">Quantité (cartons)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestionResult.suggestedPurchaseItems.map(item => {
                          const diaper = diapers.find(d => d.id === item.diaperId);
                          if (!diaper) return null;
                          return (
                            <TableRow key={item.diaperId}>
                              <TableCell>{diaper.name}</TableCell>
                              <TableCell className="text-right font-medium">{item.quantityToOrderInCartons.toLocaleString('fr-FR')}</TableCell>
                            </TableRow>
                          )
                        })}
                         {suggestionResult.suggestedPurchaseItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">
                                    Aucun réapprovisionnement nécessaire pour la période sélectionnée.
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

        <Card className="hover-lift border-l-4 border-l-primary/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Prévisions de Consommation par Article
                </CardTitle>
                <CardDescription>
                    Utilisez un algorithme pour prédire la consommation future d'un article sur les 7 prochains jours en vous basant sur l'historique des commandes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <Select onValueChange={setSelectedItemId} value={selectedItemId || ''}>
                        <SelectTrigger className="w-full sm:w-[280px]">
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
                    <Button onClick={handleRunForecast} disabled={isForecasting || !selectedItemId || isLoading} className="w-full sm:w-auto">
                        {isForecasting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Calculator className="mr-2 h-4 w-4"/>}
                        Lancer la prévision
                    </Button>
                </div>
                 {isForecasting && (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
                    </div>
                )}
                {forecastingResult && (
                    <Card className="max-w-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Prévision hebdomadaire
                            </CardTitle>
                             <Calculator className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {forecastingResult.weeklyForecast.toLocaleString('fr-FR')} pièces
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Estimation pour les 7 prochains jours.
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
