
'use client';

import * as React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConsumptionChartProps {
    data: { name: string; total: number }[];
}

export default function ConsumptionChart({ data }: ConsumptionChartProps) {
    const chartData = data.slice(0, 10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top 10 des Articles les Plus Consommés</CardTitle>
                <CardDescription>Total des pièces commandées pour chaque type d'article.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#888888" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                interval={0} 
                                angle={-30} 
                                textAnchor="end" 
                                height={60} 
                                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                            />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'hsla(var(--accent) / 0.2)'}}
                                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} pièces`, "Total"]}
                                contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="total" name="Total Pièces" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
