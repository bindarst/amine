import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { image, knownCodes } = await request.json();

        if (!image) {
            return NextResponse.json(
                { error: 'Image is required' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not configured in environment variables');
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured. Please add it to your .env.local file.' },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const knownCodesText = knownCodes
            .map((item: { code: string; name: string }) => `${item.code}: ${item.name}`)
            .join('\n');

        const prompt = `Tu es un assistant expert en reconnaissance de documents de livraison (Bon d'expédition/livraison).

Analyse cette image et extrais les données.
STRUCTURE DU DOCUMENT:
- Le CODE ARTICLE est situé tout à GAUCHE de la ligne (ex: 5160050280, 5410200250...). C'est généralement un nombre long.
- La QUANTITÉ LIVRÉE (nombre de cartons) est située tout à DROITE de la ligne.
- Cherche la colonne "Quant. livr" ou similaire à droite.
- La quantité est souvent suivie de "CAR", "CT" ou "CS" (ex: "6,00 CAR", "45,00 CAR").
- ATTENTION: Ne confonds PAS avec "Quant. command." ou "Quant. déjà livrée" qui sont au milieu. Prends bien la dernière valeur à droite.

RÈGLES D'EXTRACTION:
- Pour chaque ligne contenant un code article et une quantité, extrais ces deux valeurs.
- Ignore les lignes de description ou les sous-totaux qui n'ont pas de code article à gauche.
- Les quantités peuvent être des nombres à virgule (ex: 6,00), convertis-les en entiers (ex: 6).

Voici les codes articles connus dans le système (pour t'aider à identifier les codes valides, mais le document peut en contenir d'autres):
${knownCodesText}

FORMAT DE RÉPONSE ATTENDU (JSON UNIQUEMENT):
{"items": [{"code": "5160050280", "cartons": 6, "confidence": 0.95}, ...]}

IMPORTANT:
- Retourne UNIQUEMENT le JSON brut.
- La "confidence" (0-1) doit être élevée si tu as bien trouvé le code à gauche et la quantité à droite sur la même ligne.`;

        // Detect MIME type from base64 data
        let mimeType = 'image/jpeg'; // default
        const base64Header = image.substring(0, 50);
        if (base64Header.startsWith('/9j/')) {
            mimeType = 'image/jpeg';
        } else if (base64Header.startsWith('iVBORw0KGgo')) {
            mimeType = 'image/png';
        } else if (base64Header.startsWith('UklGR')) {
            mimeType = 'image/webp';
        }

        const result = await model.generateContent([
            {
                inlineData: {
                    data: image,
                    mimeType: mimeType,
                },
            },
            prompt,
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up the response to extract JSON
        let jsonText = text.trim();

        // Remove markdown code blocks if present
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        // Parse the JSON
        const extracted = JSON.parse(jsonText);

        return NextResponse.json(extracted);
    } catch (error) {
        console.error('❌ Error in scan-delivery API:', error);
        // Log more details if available
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return NextResponse.json(
            { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
