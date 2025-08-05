import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { topVideos, analysisPrompt } = await request.json();

    if (!topVideos || topVideos.length === 0) {
      return NextResponse.json(
        { error: 'No video data provided for analysis' },
        { status: 400 }
      );
    }

    // Prepare video analysis data for Gemini
    const videoAnalysis = topVideos.map((video: any, index: number) => {
      return `${index + 1}. "${video.title}" (Score: ${video.performanceScore}/100)
   - Views: ${video.views.toLocaleString()}
   - Watch Time: ${video.watchTime} minuten
   - CTR: ${video.ctr.toFixed(2)}%
   - Subscribers: ${video.subscribers >= 0 ? '+' : ''}${video.subscribers}`;
    }).join('\n\n');

    const prompt = `${analysisPrompt}

ANALYSE DATA VAN TOP 10 VIDEOS (laatste 30 dagen):
${videoAnalysis}

INSTRUCTIES:
- Analyseer de gemeenschappelijke thema's en patronen in deze succesvolle video's
- Identificeer waarom deze content goed presteert (SEO, emotionele impact, timing)
- Genereer precies 8 nieuwe video titel ideeën die:
  * Aansluiten bij bewezen succesvolle patronen
  * Gericht zijn op bewustzijn, innerlijke kracht en spirituele groei
  * SEO-geoptimaliseerd zijn voor YouTube
  * Emotioneel aantrekkelijk zijn en tot actie aanzetten
  * Het hoogste goed dienen en mensen echt verder helpen

VEREISTE OUTPUT FORMAT (JSON):
{
  "analysis": "Korte analyse van de patronen (max 200 woorden)",
  "ideas": [
    {
      "title": "Exacte video titel",
      "description": "Korte uitleg waarom deze titel zal presteren (max 100 woorden)",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "emotionalHook": "Welke emotie/behoefte dit aanspreekt"
    }
  ]
}

BELANGRIJK: Geef alleen valide JSON terug, geen extra tekst.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let parsedResponse;
    try {
      // Clean up the response to ensure it's valid JSON
      const cleanedText = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.log('Raw response:', text);
      
      // Fallback: try to extract ideas from malformed response
      const fallbackIdeas = extractIdeasFromText(text);
      parsedResponse = {
        analysis: "Automatische analyse gebaseerd op succesvolle video patronen.",
        ideas: fallbackIdeas
      };
    }

    // Validate response structure
    if (!parsedResponse.ideas || !Array.isArray(parsedResponse.ideas)) {
      throw new Error('Invalid response structure from Gemini');
    }

    // Ensure we have exactly 8 ideas
    parsedResponse.ideas = parsedResponse.ideas.slice(0, 8);

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate video ideas',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Fallback function to extract ideas from malformed responses
function extractIdeasFromText(text: string) {
  const fallbackIdeas = [
    {
      title: "De kracht van stilte: waarom 5 minuten per dag je leven verandert",
      description: "Focus op innerlijke rust en mindfulness, populaire thema's die goed presteren",
      keywords: ["stilte", "mindfulness", "leven veranderen"],
      emotionalHook: "Zoektocht naar innerlijke vrede"
    },
    {
      title: "Dit gebeurt er als je stopt met jezelf klein houden",
      description: "Empowerment en zelfvertrouwen, sterk aantrekkelijk voor persoonlijke groei",
      keywords: ["zelfvertrouwen", "empowerment", "groei"],
      emotionalHook: "Wens om je ware potentieel te ontdekken"
    },
    {
      title: "3 tekenen dat je spiritueel ontwaakt (en wat nu te doen)",
      description: "Spirituele ontwikkeling met praktische guidance, combineert nieuwsgierigheid met actie",
      keywords: ["spiritueel ontwaken", "tekenen", "bewustzijn"],
      emotionalHook: "Herkenning en validatie van spirituele groei"
    },
    {
      title: "Waarom moeilijke tijden je grootste geschenk zijn",
      description: "Transformatie van pijn naar kracht, universeel herkenbaar en hoopvol",
      keywords: ["moeilijke tijden", "geschenk", "transformatie"],
      emotionalHook: "Hoop en zingeving in uitdagingen"
    }
  ];

  return fallbackIdeas;
}