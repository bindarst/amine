
'use server';
/**
 * @fileOverview This file implements the Consumption Forecasting flow.
 *
 * The flow uses historical diaper usage data and an EMA algorithm to predict future consumption.
 * It includes:
 *   - calculateConsumptionForecast: The main function to trigger the forecasting process.
 *   - ConsumptionForecastingInput: The input type for the function, defining the required historical data.
 *   - ConsumptionForecastingOutput: The output type, providing the predicted consumption.
 *   - suggestOrder: A flow to suggest a complete internal distribution order.
 *   - suggestSupplierOrder: A flow to suggest a supplier purchase order.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the consumption forecasting flow.
const ConsumptionForecastingInputSchema = z.object({
  historicalData: z.array(
    z.object({
      date: z.string().describe('The date of the consumption record.'),
      quantity: z
        .number()
        .describe('The quantity of diapers consumed on that date.'),
    })
  ).describe(
    'Historical data of diaper consumption, including date and quantity.'
  ),
  alpha: z
    .number()
    .default(0.4)
    .describe('The smoothing factor for the EMA algorithm (0 to 1).'),
  horizon: z
    .number()
    .default(7)
    .describe('The number of days into the future to forecast.'),
});
export type ConsumptionForecastingInput = z.infer<
  typeof ConsumptionForecastingInputSchema
>;

// Output schema for the consumption forecasting flow.
const ConsumptionForecastingOutputSchema = z.object({
  weeklyForecast: z.number().describe('Predicted diaper consumption for the next week (horizon).'),
});
export type ConsumptionForecastingOutput = z.infer<
  typeof ConsumptionForecastingOutputSchema
>;

// Main function to trigger the consumption forecasting flow.
export async function calculateConsumptionForecast(
  input: ConsumptionForecastingInput
): Promise<ConsumptionForecastingOutput> {
  return consumptionForecastingFlow(input);
}


// Genkit flow definition for consumption forecasting.
const consumptionForecastingFlow = ai.defineFlow(
  {
    name: 'consumptionForecastingFlow',
    inputSchema: ConsumptionForecastingInputSchema,
    outputSchema: ConsumptionForecastingOutputSchema,
  },
  async (input) => {
    const { historicalData, alpha, horizon } = input;
    const sortedData = historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const quantities = sortedData.map(d => d.quantity);

    if (quantities.length === 0) {
      return { weeklyForecast: 0 };
    }
    
    let ema = quantities[0];
    for (let i = 1; i < quantities.length; i++) {
        ema = alpha * quantities[i] + (1 - alpha) * ema;
    }

    const weeklyForecast = Math.round(ema * horizon);

    return { weeklyForecast };
  }
);


// New flow for suggesting a supplier purchase order
const SuggestSupplierOrderInputSchema = z.object({
  currentStock: z.array(z.object({
    diaperId: z.string(),
    quantity: z.number(),
  })).describe("Current stock levels for all items."),
  totalWeeklyParLevels: z.record(z.string(), z.number()).describe("A map of item IDs to their total required weekly par level across all wards."),
  activeItems: z.array(z.any()).describe("List of active items to consider for the order."),
  forecastWeeks: z.number().default(2).describe("Number of weeks of consumption to cover with the order."),
});
export type SuggestSupplierOrderInput = z.infer<typeof SuggestSupplierOrderInputSchema>;

const SuggestSupplierOrderOutputSchema = z.object({
  suggestedPurchaseItems: z.array(z.object({
    diaperId: z.string(),
    quantityToOrderInCartons: z.number().describe("The suggested quantity to order in cartons."),
  })).describe("A list of items and quantities to order from the supplier."),
});
export type SuggestSupplierOrderOutput = z.infer<typeof SuggestSupplierOrderOutputSchema>;

export async function suggestSupplierOrder(input: SuggestSupplierOrderInput): Promise<SuggestSupplierOrderOutput> {
  return suggestSupplierOrderFlow(input);
}


const suggestSupplierOrderFlow = ai.defineFlow(
  {
    name: 'suggestSupplierOrderFlow',
    inputSchema: SuggestSupplierOrderInputSchema,
    outputSchema: SuggestSupplierOrderOutputSchema,
  },
  async (input) => {
      const suggestedPurchaseItems: { diaperId: string, quantityToOrderInCartons: number }[] = [];
      const { currentStock, totalWeeklyParLevels, activeItems, forecastWeeks } = input;
      
      for (const item of activeItems) {
          const weeklyParLevelFromSettings = totalWeeklyParLevels[item.id] || 0;
          
          if (weeklyParLevelFromSettings === 0) {
              continue; 
          }
          
          // Convert the weekly par level from its defined unit ('cartons' or 'pieces') into a total weekly need in pieces.
          const weeklyNeedInPieces = item.defaultUnit === 'cartons'
            ? weeklyParLevelFromSettings * (item.piecesPerCarton || 1)
            : weeklyParLevelFromSettings;
            
          const currentItemStockInPieces = currentStock.find(s => s.diaperId === item.id)?.quantity || 0;

          // Calculate the total need in pieces for the entire forecast period.
          const totalNeedForPeriodInPieces = weeklyNeedInPieces * forecastWeeks;

          // Calculate the total deficit in pieces for the period.
          const deficitInPieces = totalNeedForPeriodInPieces - currentItemStockInPieces;

          // If there is a deficit, suggest an order.
          if (deficitInPieces > 0) {
              if (item.piecesPerCarton > 0) {
                  // Convert the deficit in pieces to the number of cartons needed, rounding up to the nearest whole carton.
                  const quantityToOrderInCartons = Math.ceil(deficitInPieces / item.piecesPerCarton);

                  if (quantityToOrderInCartons > 0) {
                      suggestedPurchaseItems.push({
                          diaperId: item.id,
                          quantityToOrderInCartons: quantityToOrderInCartons,
                      });
                  }
              }
          }
      }

      return { suggestedPurchaseItems };
  }
);
