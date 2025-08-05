import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { title, description, scriptPrompt } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Video title is required' },
        { status: 400 }
      );
    }

    const prompt = `${scriptPrompt}

VIDEO TITEL: "${title}"
${description ? `CONTEXT: ${description}` : ''}

VEREISTEN:
- Script voor een YouTube Short van 30-60 seconden (max 2 minuten)
- Begin met een onweerstaanbare hook in de eerste 3 seconden
- Emotioneel geladen content die het hart raakt
- Spreektaal, kort en bondig
- Eindigen met: "Wil je meer van dit soort video's zien? Like, deel het en abonneer op mijn YouTube kanaal."
- ALLEEN de tekst, geen formatting, titels of instructies

THEMA'S OM UIT TE PUTTEN:
- Innerlijke kracht en veerkracht
- Spirituele groei en bewustzijn  
- Overwinnen van angsten en beperkingen
- Zelfliefde en acceptatie
- Doorzetten en discipline
- Transformatie van pijn naar wijsheid
- De kracht van stilte en reflectie

Schrijf het script alsof je het publiek persoonlijk toespreekt — rauw, eerlijk, kwetsbaar, krachtig.

SCRIPT:`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const script = response.text().trim();

    // Clean up the script (remove any unwanted formatting)
    const cleanedScript = script
      .replace(/^\*\*.*?\*\*\s*/gm, '') // Remove bold formatting
      .replace(/^Script:\s*/i, '') // Remove "Script:" prefix
      .replace(/^SCRIPT:\s*/i, '') // Remove "SCRIPT:" prefix
      .replace(/\n{3,}/g, '\n\n') // Limit multiple newlines to max 2
      .trim();

    // Validate script length (approximately 250-400 words for 30-60 seconds)
    const wordCount = cleanedScript.split(/\s+/).length;
    
    if (wordCount < 50) {
      throw new Error('Generated script is too short');
    }
    
    if (wordCount > 500) {
      console.warn(`Script is quite long (${wordCount} words), might exceed 2 minutes`);
    }

    // Ensure the script ends with the required call-to-action
    const requiredEnding = "Wil je meer van dit soort video's zien? Like, deel het en abonneer op mijn YouTube kanaal.";
    let finalScript = cleanedScript;
    
    if (!cleanedScript.toLowerCase().includes("like, deel het en abonneer")) {
      finalScript = cleanedScript + "\n\n" + requiredEnding;
    }

    return NextResponse.json({
      script: finalScript,
      wordCount: finalScript.split(/\s+/).length,
      estimatedDuration: Math.ceil(finalScript.split(/\s+/).length / 3) + " seconds" // Rough estimate: 3 words per second
    });

  } catch (error) {
    console.error('Gemini script generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate script',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'Script generation API is running',
    timestamp: new Date().toISOString()
  });
}