export interface RevIDCreateVideoRequest {
  webhook: string;
  creationParams: {
    mediaType: "movingImage";
    inputText: string;
    flowType: "text-to-video";
    slug: "create-tiktok-video";
    slugNew: "ai-tiktok-video-generator";
    isCopiedFrom: boolean;
    hasToGenerateVoice: boolean;
    hasToTranscript: boolean;
    hasToSearchMedia: boolean;
    hasAvatar: boolean;
    hasWebsiteRecorder: boolean;
    hasTextSmallAtBottom: boolean;
    ratio: "9 / 16";
    selectedAudio: string;
    selectedVoice: string;
    selectedAvatarType: string;
    websiteToRecord: string;
    hasToGenerateCover: boolean;
    nbGenerations: number;
    disableCaptions: boolean;
    mediaMultiplier: "medium";
    characters: string[];
    imageGenerationModel: "ultra";
    videoGenerationModel: "base";
    hasEnhancedGeneration: boolean;
    hasEnhancedGenerationPro: boolean;
    captionPresetName: "Wrap 1";
    captionPositionName: "bottom";
    sourceType: "contentScraping";
    selectedStoryStyle: {
      value: "custom";
      label: "General";
    };
    durationSeconds: number;
    generationPreset: "PIXAR";
    hasToGenerateMusic: boolean;
    isOptimizedForChinese: boolean;
    generationUserPrompt: string;
    enableNsfwFilter: boolean;
    addStickers: boolean;
    typeMovingImageAnim: "dynamic";
    hasToGenerateSoundEffects: boolean;
    selectedCharacters: string[];
    lang: string;
    voiceSpeed: number;
    disableAudio: boolean;
    disableVoice: boolean;
    inputMedias: any[];
    hasToGenerateVideos: boolean;
    audioUrl: string;
    watermark: null;
    estimatedCreditsToConsume: number;
  };
}

export interface RevIDResponse {
  success: boolean;
  jobId: string;
  status: string;
  estimatedTime?: number;
  creditsUsed?: number;
}

export class RevIDClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.revid.ai';
  }

  async createVideo(script: string, webhookUrl: string): Promise<RevIDResponse> {
    const formattedScript = this.formatScriptForRevID(script);

    const requestPayload: RevIDCreateVideoRequest = {
      webhook: webhookUrl,
      creationParams: {
        mediaType: "movingImage",
        inputText: "",
        flowType: "text-to-video",
        slug: "create-tiktok-video",
        slugNew: "ai-tiktok-video-generator",
        isCopiedFrom: false,
        hasToGenerateVoice: true,
        hasToTranscript: false,
        hasToSearchMedia: true,
        hasAvatar: false,
        hasWebsiteRecorder: false,
        hasTextSmallAtBottom: false,
        ratio: "9 / 16",
        selectedAudio: "iky1ZYcS4AfCoof9TRhn",
        selectedVoice: "cjVigY5qzO86Huf0OWal",
        selectedAvatarType: "",
        websiteToRecord: "",
        hasToGenerateCover: false,
        nbGenerations: 1,
        disableCaptions: false,
        mediaMultiplier: "medium",
        characters: [],
        imageGenerationModel: "ultra",
        videoGenerationModel: "base",
        hasEnhancedGeneration: true,
        hasEnhancedGenerationPro: true,
        captionPresetName: "Wrap 1",
        captionPositionName: "bottom",
        sourceType: "contentScraping",
        selectedStoryStyle: {
          value: "custom",
          label: "General"
        },
        durationSeconds: 40,
        generationPreset: "PIXAR",
        hasToGenerateMusic: false,
        isOptimizedForChinese: false,
        generationUserPrompt: formattedScript,
        enableNsfwFilter: true,
        addStickers: false,
        typeMovingImageAnim: "dynamic",
        hasToGenerateSoundEffects: false,
        selectedCharacters: [
          "ff58b7fa-e0ea-4f50-a9d8-6f5cf0616815"
        ],
        lang: "",
        voiceSpeed: 1,
        disableAudio: false,
        disableVoice: false,
        inputMedias: [],
        hasToGenerateVideos: true,
        audioUrl: "https://cdn.revid.ai/generated_music/Usk2DH6C9.mp3",
        watermark: null,
        estimatedCreditsToConsume: 10
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RevID API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        jobId: data.jobId || data.id,
        status: data.status || 'processing',
        estimatedTime: data.estimatedTime,
        creditsUsed: data.creditsUsed || 10,
      };

    } catch (error) {
      console.error('RevID API call failed:', error);
      throw new Error(`Failed to create video with RevID: ${error.message}`);
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`RevID status check failed: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('RevID status check failed:', error);
      throw error;
    }
  }

  private formatScriptForRevID(script: string): string {
    // Split script into sentences and add media hints and breaks
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let formattedScript = "";
    const mediaHints = [
      "[close-up of person speaking emotionally]",
      "[motivational scene with sunrise]", 
      "[person overcoming challenge]",
      "[inspiring nature scene]",
      "[person achieving success]",
      "[calm meditation scene]",
      "[powerful transformation moment]",
      "[spiritual awakening visual]",
      "[inner strength visualization]",
      "[peaceful mindfulness scene]"
    ];
    
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed) {
        // Add media hint for visual variety
        const hint = mediaHints[index % mediaHints.length];
        formattedScript += `${hint} ${trimmed}.\n`;
        
        // Add pause between sentences for dramatic effect
        if (index < sentences.length - 1) {
          formattedScript += `<break time="0.5s" />\n`;
        }
      }
    });
    
    return formattedScript;
  }
}

// Export singleton instance
export const revIDClient = new RevIDClient(process.env.REVID_API_KEY!);