import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { title, script } = await request.json();

    if (!title || !script) {
      return NextResponse.json(
        { error: 'Title and script are required' },
        { status: 400 }
      );
    }

    const prompt = `Jij bent een expert op het gebied van SEO en het YouTube-algoritme, gespecialiseerd in het optimaliseren van videotitels, -omschrijvingen en tags.

ORIGINELE TITEL: "${title}"
SCRIPT INHOUD: "${script}"

TAAK: Optimaliseer deze content voor maximale YouTube performance:

1. GEOPTIMALISEERDE TITELS (geef 3 varianten):
   - Behoud de emotionele impact
   - Voeg relevante zoekwoorden toe
   - Maak ze aantrekkelijker voor clicks
   - Max 60 karakters voor optimale weergave

2. VIDEOBESCHRIJVING (min 150 woorden):
   - Vat de kernboodschap samen
   - Gebruik relevante zoekwoorden natuurlijk
   - Voeg call-to-action toe
   - Gebruik hashtags strategisch
   - Voeg tijdstempels toe indien relevant

3. TAGS (max 500 karakters):
   - Mix van brede en specifieke zoekwoorden
   - Nederlandse en enkele Engelse tags
   - Focus op spiritualiteit, motivatie, persoonlijke groei
   - Gebruik komma's als scheiding

VEREISTE OUTPUT FORMAT (JSON):
{
  "optimizedTitles": [
    "Titel optie 1",
    "Titel optie 2", 
    "Titel optie 3"
  ],
  "description": "Complete videobeschrijving met SEO optimalisatie",
  "tags": ["tag1", "tag2", "tag3", ...],
  "hashtags": ["#hash1", "#hash2", "#hash3"],
  "seoScore": "Geschatte SEO score (1-100)",
  "keyOptimizations": ["Uitleg van belangrijkste optimalisaties"]
}

FOCUS GEBIEDEN:
- Spirituele ontwikkeling
- Persoonlijke groei  
- Mindfulness & bewustzijn
- Motivatie & inspiratie
- Innerlijke kracht
- Levenslessen
- Transformatie

Geef alleen valide JSON terug.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let parsedResponse;
    try {
      const cleanedText = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('SEO JSON parsing error:', parseError);
      console.log('Raw response:', text);
      
      // Fallback SEO content
      parsedResponse = generateFallbackSEO(title, script);
    }

    // Validate and ensure required fields
    if (!parsedResponse.optimizedTitles || !Array.isArray(parsedResponse.optimizedTitles)) {
      parsedResponse.optimizedTitles = [title, title + " | Motivatie", title + " | Spirituele Groei"];
    }

    if (!parsedResponse.description) {
      parsedResponse.description = generateFallbackDescription(title, script);
    }

    if (!parsedResponse.tags || !Array.isArray(parsedResponse.tags)) {
      parsedResponse.tags = generateFallbackTags(title);
    }

    // Ensure tags don't exceed 500 characters total
    const tagsString = parsedResponse.tags.join(', ');
    if (tagsString.length > 500) {
      // Trim tags to fit within limit
      let trimmedTags = [];
      let currentLength = 0;
      for (const tag of parsedResponse.tags) {
        if (currentLength + tag.length + 2 <= 500) { // +2 for ", "
          trimmedTags.push(tag);
          currentLength += tag.length + 2;
        } else {
          break;
        }
      }
      parsedResponse.tags = trimmedTags;
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Gemini SEO generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate SEO content',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function generateFallbackSEO(title: string, script: string) {
  return {
    optimizedTitles: [
      title,
      title + " | Persoonlijke Groei",
      title + " | Spirituele Ontwikkeling"
    ],
    description: generateFallbackDescription(title, script),
    tags: generateFallbackTags(title),
    hashtags: ["#motivatie", "#spiritualiteit", "#persoonlijkegroei", "#bewustzijn"],
    seoScore: "75",
    keyOptimizations: [
      "Emotionele titel behouden",
      "Relevante zoekwoorden toegevoegd",
      "Call-to-action geïncludeerd"
    ]
  };
}

function generateFallbackDescription(title: string, script: string) {
  const firstSentence = script.split('.')[0] + '.';
  
  return `${firstSentence}

In deze inspirerende video ontdek je krachtige inzichten over persoonlijke groei en spirituele ontwikkeling. Deze boodschap helpt je om je innerlijke kracht te vinden en je bewustzijn te vergroten.

🌟 Wat je leert:
• Praktische wijsheid voor het dagelijks leven
• Hoe je uitdagingen kunt transformeren naar groei
• Manieren om je innerlijke kracht te ontwikkelen

💝 Deze content is gemaakt om je te inspireren en te helpen groeien. Als het je raakt, deel het dan met anderen die er ook baat bij kunnen hebben.

🔔 Abonneer je op het kanaal voor meer inspirerende content over persoonlijke ontwikkeling, spiritualiteit en bewustzijn.

#motivatie #spiritualiteit #persoonlijkegroei #bewustzijn #inspiratie`;
}

function generateFallbackTags(title: string) {
  const baseTags = [
    "motivatie", "inspiratie", "persoonlijke groei", "spiritualiteit", 
    "bewustzijn", "innerlijke kracht", "mindfulness", "transformatie",
    "levenslessen", "zelfontikkeling", "spirituele groei", "wijsheid",
    "meditation", "spiritual growth", "personal development", "mindset",
    "nederlands", "dutch", "motivational", "inspirational"
  ];
  
  // Add title-specific tags
  const titleWords = title.toLowerCase().split(' ').filter(word => word.length > 3);
  const combinedTags = [...baseTags, ...titleWords].slice(0, 25); // Limit to 25 tags
  
  return combinedTags;
}