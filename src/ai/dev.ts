'use server';
/**
 * @fileOverview This file imports all the Genkit flows that are used in the application.
 *
 * This is the entry point for the Genkit development server.
 */
import {config} from 'dotenv';
config();

import '@/ai/flows/intelligent-consumption-forecasting.ts';
import '@/ai/flows/anomaly-detection-and-alerting.ts';
