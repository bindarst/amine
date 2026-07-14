'use client';

import * as React from 'react';
import type { ConsumptionForecastingOutput } from '@/ai/flows/intelligent-consumption-forecasting';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ForecastingChartProps {
  data: ConsumptionForecastingOutput['forecastedConsumption'];
}

export default function ForecastingChart({ data }: ForecastingChartProps) {
    const formattedData = data.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
    }));

  return (
    <Card>
        <CardHeader>
            <CardTitle>Prévisions sur 7 jours</CardTitle>
            <CardDescription>Quantité de langes prédite pour la consommation quotidienne.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Quantité', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}/>
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                        <Legend wrapperStyle={{fontSize: "14px"}}/>
                        <Bar dataKey="quantity" name="Consommation Prédite" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
    </Card>
  );
}
