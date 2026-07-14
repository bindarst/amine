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
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const knownCodesText = knownCodes
            .map((item: { code: string; name: string }) => `${item.code}: ${item.name}`)
            .join('\n');

        const prompt = `Tu es un assistant expert en reconnaissance de documents de livraison.

Analyse cette image d'un bon de livraison et extrais UNIQUEMENT les informations suivantes pour chaque ligne:
- Le code article (numérique)
- La quantité de cartons

Voici les codes articles connus dans le système:
${knownCodesText}

IMPORTANT:
- Retourne UNIQUEMENT un JSON valide, sans texte avant ou après
- Format exact: {"items": [{"code": "123", "cartons": 5, "confidence": 0.95}, ...]}
- La "confidence" est un nombre entre 0 et 1 indiquant ton niveau de certitude
- Ignore les lignes qui ne contiennent pas de code article et de quantité
- Si un code n'est pas dans la liste connue, inclus-le quand même mais avec une confidence plus basse
- Les codes doivent être des nombres (string)
- Les quantités doivent être des entiers

Exemple de réponse:
{"items": [{"code": "12345", "cartons": 10, "confidence": 0.98}, {"code": "67890", "cartons": 5, "confidence": 0.85}]}`;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: image,
                    mimeType: 'image/jpeg',
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
        console.error('Error in scan-delivery API:', error);
        return NextResponse.json(
            { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
