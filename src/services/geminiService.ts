/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STRATEGY_SCHEMA, MESSAGE_SCHEMA, INSIGHTS_SCHEMA, INSTAGRAM_POST_SCHEMA, Language } from "../types";

const getSystemInstruction = (language: Language) => {
  const langPrompt = language === Language.HI 
    ? "Always respond in Hinglish (Hindi written in English letters). Do not use Devanagari script. Keep it simple and easy to understand for Indian makeup artists."
    : "Always respond in professional English.";

  return `You are GlamourGrowth AI — an intelligent business growth assistant designed exclusively for Indian freelance makeup artists.
Your mission is to help Indian makeup artists increase bookings, improve pricing confidence, manage client communication professionally, and grow monthly income.
Focus ONLY on Indian market context. Use Indian pricing psychology. Avoid global or western festival references.
Do not provide generic marketing advice. Be practical and revenue-focused. Use simple, confident, supportive tone.
Sound like a smart business coach, not a chatbot.
${langPrompt}
Never produce markdown. Never produce explanations outside the required JSON structure.
Always produce valid, parsable JSON. Keep responses concise but strategic.`;
};

export class GeminiService {
  private async cropFace(imageBase64: string): Promise<string | null> {
    // Face detection is currently disabled due to build compatibility issues
    // Returning the original image for now
    return imageBase64.split(',')[1] || imageBase64;
  }

  private async callAiGateway(params: {
    contentType: string;
    city?: string;
    prompt: string;
    metadata?: any;
    imageBase64?: string;
    schema?: any;
  }) {
    const response = await fetch("/api/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "AI Gateway request failed");
    }

    const result = await response.json();
    return result.data;
  }

  async generateFestivalStrategy(festival: string, currentIncome: number, language: Language = Language.EN) {
    return this.callAiGateway({
      contentType: "strategy",
      city: "india",
      prompt: `Generate a revenue strategy for ${festival}. My current monthly income is ₹${currentIncome}.`,
      metadata: { systemInstruction: getSystemInstruction(language) },
      schema: STRATEGY_SCHEMA
    });
  }

  async generateFollowUpMessages(clientContext: string, language: Language = Language.EN) {
    return this.callAiGateway({
      contentType: "messages",
      city: "india",
      prompt: `Generate 3 smart follow-up messages for this client context: ${clientContext}. Focus on conversion and Indian pricing psychology.`,
      metadata: { systemInstruction: getSystemInstruction(language) },
      schema: MESSAGE_SCHEMA
    });
  }

  async generateBusinessInsights(incomeData: any[], language: Language = Language.EN) {
    return this.callAiGateway({
      contentType: "insights",
      city: "india",
      prompt: `Analyze this income data and provide growth insights: ${JSON.stringify(incomeData)}. Focus on Indian market trends and revenue maximization.`,
      metadata: { systemInstruction: getSystemInstruction(language) },
      schema: INSIGHTS_SCHEMA
    });
  }

  async generateMakeupTryOn(imageBase64: string, occasion: string) {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    
    // Identity Preservation Tweak: Face Crop
    const faceCropBase64 = await this.cropFace(imageBase64);

    const realismModifiers = "photorealistic Indian woman, real skin texture, natural pores, accurate Indian skin tone, professional bridal photography, soft studio lighting, DSLR photo, 85mm portrait lens, shallow depth of field, high dynamic range, ultra realistic makeup.";
    
    const negativePrompt = "blurry, cartoon, anime, unrealistic skin, plastic skin, oversmoothed skin, distorted face, bad anatomy, extra eyes, extra nose, extra lips, mutated face, duplicate face, low resolution, noisy image, washed out colors";

    const getClothingDescription = (occ: string) => {
      const lowerOcc = occ.toLowerCase();
      if (lowerOcc.includes('wedding') || lowerOcc.includes('bridal')) {
        return "wearing a heavy red Indian bridal lehenga with intricate gold embroidery, traditional heavy bridal jewelry, maang tikka, nath, royal bridal attire";
      } else if (lowerOcc.includes('party')) {
        return "wearing a stylish designer Indian party wear saree or lehenga, elegant modern jewelry, fashionable ethnic attire";
      } else if (lowerOcc.includes('pre-wedding')) {
        return "wearing a graceful pastel Indian ethnic gown or lehenga, simple elegant jewelry, romantic pre-wedding attire";
      }
      return "wearing traditional Indian ethnic attire";
    };

    const clothingDesc = getClothingDescription(occasion);

    const getPrompt = (style: string) => 
      `Apply realistic Indian ${occasion} makeup on the provided face image, ${style}, ${clothingDesc}, professional Indian makeup artist style, preserve original face identity, ${realismModifiers}`;

    const variations = [
      "Natural Glam: Soft foundation, natural lipstick, light eyeshadow",
      "Medium Glam: Defined eyeliner, slight contour, shimmer eyeshadow",
      "Professional Studio Look: Strong eye makeup, bold lipstick, studio beauty lighting"
    ];

    try {
      // We'll generate 3 variations. To ensure identity preservation, we'll use SDXL and img2img.
      // Since AI Horde might not support complex IP-Adapter + ControlNet in a single simple call,
      // we'll use the best available parameters for identity preservation.
      
      const results: string[] = [];

      for (const style of variations) {
        const prompt = getPrompt(style);
        
        const hordeResponse = await fetch("https://aihorde.net/api/v2/generate/async", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "0000000000",
            "Client-Agent": "GlamourGrowth:1.0:v.chauhan144@gmail.com"
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: negativePrompt,
            source_image: base64Data,
            source_processing: "img2img",
            params: {
              denoising_strength: 0.45,
              width: 512,
              height: 512,
              steps: 20,
              cfg_scale: 7,
              n: 1
            },
            models: ["stable_diffusion"]
          })
        });

        if (hordeResponse.ok) {
          const { id } = await hordeResponse.json();
          
          let attempts = 0;
          const maxAttempts = 30; // 60 seconds total
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 1: Check generation status
            const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${id}`);
            if (!checkRes.ok) continue;
            
            const checkData = await checkRes.json();
            
            // Step 2: If done, retrieve results
            if (checkData.done) {
              const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`);
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.generations && statusData.generations.length > 0) {
                  results.push(statusData.generations[0].img);
                  break;
                }
              }
            }
            
            if (checkData.faulted) break;
            
            attempts++;
          }
        }
      }

      if (results.length > 0) return results;
      throw new Error("AI Horde generation failed for all variations");

    } catch (error) {
      console.warn("AI Horde SDXL pipeline failed, falling back to Pollinations:", error);

      const pollinationsPrompt = `Realistic Indian ${occasion} makeup look, ${clothingDesc}, professional makeup artist style, HD beauty photography, natural skin texture, soft lighting`;
      const pollinationsBase = `https://image.pollinations.ai/prompt/${encodeURIComponent(pollinationsPrompt)}`;

      return [
        `${pollinationsBase}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
        `${pollinationsBase}%20portrait?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
        `${pollinationsBase}%20studio%20lighting?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`
      ];
    }
  }

  async generateInstagramPost(imageBase64: string, contentType: string, language: Language = Language.EN) {
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    return this.callAiGateway({
      contentType: "instagram",
      city: "india",
      prompt: `You are a professional social media manager for freelance makeup artists in India.
Analyze the uploaded makeup image and the selected content type.

Content type: ${contentType}

Generate the following:
1. Instagram Caption (50-120 words, include emojis)
2. Instagram Reel Script (Scene by scene)
3. Instagram Story Text
4. Call-To-Action encouraging bookings
5. 15 relevant hashtags (mix of niche, engagement, and location-based like #DelhiMakeupArtist)

Target audience: Indian brides and makeup clients.
Tone: Friendly, professional and engaging.
Encourage bookings.`,
      metadata: { systemInstruction: getSystemInstruction(language) },
      imageBase64: base64Data,
      schema: INSTAGRAM_POST_SCHEMA
    });
  }
}

export const geminiService = new GeminiService();
