'use server';
/**
 * @fileOverview Detects anomalies in diaper consumption using Z-score analysis and generates alerts.
 *
 * - detectConsumptionAnomaly - Detects anomalies in diaper consumption data.
 * - DetectConsumptionAnomalyInput - The input type for the detectConsumptionAnomaly function.
 * - DetectConsumptionAnomalyOutput - The return type for the detectConsumptionAnomaly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectConsumptionAnomalyInputSchema = z.object({
  itemId: z.string().describe('The ID of the diaper item.'),
  wardId: z.string().describe('The ID of the ward.'),
  consumptionData: z
    .array(z.number())
    .describe(
      'An array of daily diaper consumption quantities over a period (e.g., 30 days).'
    ),
  zScoreThreshold: z
    .number()
    .default(2.5)
    .describe(
      'The Z-score threshold above which an anomaly is flagged. Default is 2.5.'
    ),
});
export type DetectConsumptionAnomalyInput = z.infer<
  typeof DetectConsumptionAnomalyInputSchema
>;

const DetectConsumptionAnomalyOutputSchema = z.object({
  isAnomaly: z.boolean().describe('Whether an anomaly is detected.'),
  zScore: z.number().describe('The calculated Z-score for the latest consumption.'),
  meanConsumption: z
    .number()
    .describe('The average daily consumption over the period.'),
  stdDeviation: z
    .number()
    .describe('The standard deviation of daily consumption over the period.'),
  alertMessage: z.string().describe('A message describing the anomaly, if any.'),
});

export type DetectConsumptionAnomalyOutput = z.infer<
  typeof DetectConsumptionAnomalyOutputSchema
>;

export async function detectConsumptionAnomaly(
  input: DetectConsumptionAnomalyInput
): Promise<DetectConsumptionAnomalyOutput> {
  return detectConsumptionAnomalyFlow(input);
}

const detectConsumptionAnomalyFlow = ai.defineFlow(
  {
    name: 'detectConsumptionAnomalyFlow',
    inputSchema: DetectConsumptionAnomalyInputSchema,
    outputSchema: DetectConsumptionAnomalyOutputSchema,
  },
  async input => {
    // Calculate mean and standard deviation
    const n = input.consumptionData.length;
    if (n < 2) {
      return {
        isAnomaly: false,
        zScore: 0,
        meanConsumption: n > 0 ? input.consumptionData[0] : 0,
        stdDeviation: 0,
        alertMessage: 'Not enough data to calculate anomaly.',
      };
    }
    const sum = input.consumptionData.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const squaredDifferences = input.consumptionData.map(x => (x - mean) ** 2);
    const sumOfSquaredDifferences = squaredDifferences.reduce((a, b) => a + b, 0);
    const stdDeviation = Math.sqrt(sumOfSquaredDifferences / (n - 1));

    // Calculate Z-score for the latest consumption
    const latestConsumption = input.consumptionData[n - 1];
    const zScore = stdDeviation > 0 ? (latestConsumption - mean) / stdDeviation : 0;

    const isAnomaly = Math.abs(zScore) > input.zScoreThreshold;

    let alertMessage = 'Normal diaper consumption detected.';
    if (isAnomaly) {
      if (zScore > input.zScoreThreshold) {
        alertMessage = `High consumption anomaly detected in ward ${input.wardId} for item ${input.itemId}. Z-score: ${zScore.toFixed(2)}.`;
      } else {
        alertMessage = `Low consumption anomaly detected in ward ${input.wardId} for item ${input.itemId}. Z-score: ${zScore.toFixed(2)}.`;
      }
    }

    const output: DetectConsumptionAnomalyOutput = {
      isAnomaly: isAnomaly,
      zScore: zScore,
      meanConsumption: mean,
      stdDeviation: stdDeviation,
      alertMessage: alertMessage,
    };

    return output;
  }
);
