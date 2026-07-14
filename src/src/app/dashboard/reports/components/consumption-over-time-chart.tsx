'use client';

import * as React from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface ConsumptionOverTimeChartProps {
    data: { date: string; total: number }[];
}

export default function ConsumptionOverTimeChart({ data }: ConsumptionOverTimeChartProps) {
    const formattedData = data.map(item => ({
        ...item,
        date: `S${format(new Date(item.date), 'ww')}` // Format as 'S' + week number
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Consommation au Fil du Temps</CardTitle>
                <CardDescription>Évolution du nombre total de pièces commandées par semaine.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                 formatter={(value: number) => [`${value.toLocaleString('fr-FR')} pièces`, "Total"]}
                                contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Line type="monotone" dataKey="total" name="Pièces Commandées" stroke="hsl(var(--primary))" strokeWidth={2} dot={{r: 4, fill: "hsl(var(--primary))"}} activeDot={{ r: 6 }}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
